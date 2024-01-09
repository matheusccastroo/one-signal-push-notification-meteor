import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';
import { callMethod, log, logError, logWarn, throwPushError } from './helpers';
import { OneSignalPushNotificationMeteorMetricsCollection } from './collection';

class OneSignalSender {
  restKey;
  appId;
  shouldLog;
  internalLinkHandler;

  static _instance;
  static ONE_SIGNAL_API_URL = 'https://onesignal.com/api/v1/notifications';

  constructor() {
    if (OneSignalSender._instance) {
      throwPushError(
        'already-instantiated',
        'Not allowed to instantiate again'
      );
    } else {
      OneSignalSender._instance = this;
    }

    const { ONESIGNAL_APP_ID } = Meteor.settings.public;
    const { ONESIGNAL_REST_KEY } = Meteor.settings;

    if (Meteor.isServer && !ONESIGNAL_REST_KEY) {
      throwPushError('missing-information', 'Missing ONESIGNAL_REST_KEY');
    }

    if (!ONESIGNAL_APP_ID) {
      throwPushError('missing-information', 'Missing ONESIGNAL_APP_ID');
    }

    this.restKey = ONESIGNAL_REST_KEY;
    this.appId = ONESIGNAL_APP_ID;
    this.shouldLog = Meteor.isDevelopment;
  }

  enableLog() {
    this.shouldLog = true;
  }

  disableLog() {
    this.shouldLog = false;
  }

  _log(msg) {
    if (this.shouldLog) {
      log(msg);
    }
  }

  _logWarn(warn) {
    if (this.shouldLog) {
      logWarn(warn);
    }
  }

  _logError(error) {
    if (this.shouldLog) {
      logError(error);
    }
  }

  setInternalLinkHandler(internalLinkHandler) {
    if (!Meteor.isCordova) {
      throwPushError(
        'arch-error',
        'You can only set the internal link handler on Cordova'
      );
    }

    if (typeof internalLinkHandler !== 'function') {
      throwPushError(
        'missing-information',
        'Internal link handler is not a function'
      );
    }

    this.internalLinkHandler = internalLinkHandler;
  }

  init() {
    if (Meteor.isCordova) {
      return document.addEventListener(
        'deviceready',
        () => this._initClient(),
        false
      );
    }

    if (Meteor.isServer) {
      return this._initServer();
    }

    return null;
  }

  _initClient() {
    if (!Meteor.isCordova) {
      throwPushError(
        'init-error',
        'You are trying to instantiate the client on the server. This is not allowed'
      );
    }

    import { Accounts } from 'meteor/accounts-base';
    import { COOKIES, getCookie } from './cookie-helpers';

    // 1st - setup login handlers to set/unset playerId.
    Accounts.onLogin(() => {
      const cookiePlayerId = getCookie(COOKIES.ONE_SIGNAL_PLAYER_ID);
      if (!cookiePlayerId) {
        return;
      }

      callMethod('oneSignal#setPlayerId', {
        playerId: cookiePlayerId,
      })
        .then(result => {
          this._log(
            `Result from setting playerId ${cookiePlayerId}: ${result}`
          );
        })
        .catch(this._logError.bind(this));
    });

    Accounts.onLogout(() => {
      const cookiePlayerId = getCookie(COOKIES.ONE_SIGNAL_PLAYER_ID);
      if (!cookiePlayerId) {
        this._logWarn('No cookie player id');
        return;
      }

      callMethod('oneSignal#unsetPlayerId', {
        playerId: cookiePlayerId,
      })
        .then(result => {
          this._log(
            `Result from unsetting playerId ${cookiePlayerId}: ${result}`
          );
        })
        .catch(this._logError.bind(this));
    });

    // 2nd - Now setup the one-signal plugin.
    if (Meteor.isDevelopment || this.shouldLog) {
      window.plugins.OneSignal.setLogLevel(6, 0);
    }

    // Set app ID
    window.plugins.OneSignal.setAppId(this.appId);

    // Handling data from notification (routes etc)
    window.plugins.OneSignal.setNotificationOpenedHandler(
      async ({
        notification: { additionalData: { url } = {}, notificationId } = {},
      }) => {
        this._log(`RECEIVED NEW NOTIFICATION WITH URL ${url}`);

        await OneSignalPushNotificationMeteorMetricsCollection._setNotificationAsReadByUser(
          { notificationId, userId: Meteor.userId(), shouldLog: this.shouldLog }
        );

        if (!url) {
          return;
        }

        import { handleCordovaRedirect } from './helpers';

        Meteor.setTimeout(
          () => handleCordovaRedirect(url, this.internalLinkHandler),
          0
        );
      }
    );

    // Prompt for permission.
    window.plugins.OneSignal.promptForPushNotificationsWithUserResponse(
      accepted => {
        this._logWarn(`User notification state is: ${accepted}`);
      }
    );

    this._setPlayerId();
  }

  _setPlayerId() {
    if (!Meteor.isCordova) {
      throwPushError('arch-error', 'Action only allowed on Cordova');
    }

    import { COOKIES, setCookie } from './cookie-helpers';

    window.plugins.OneSignal.getDeviceState(stateChanges => {
      const playerId = stateChanges.userId;

      if (!playerId) {
        Meteor.defer(() => this._setPlayerId());
        return;
      }

      setCookie(COOKIES.ONE_SIGNAL_PLAYER_ID, playerId);
    });
  }

  _initServer() {
    if (!Meteor.isServer) {
      throwPushError(
        'init-error',
        'You are trying to instantiate the server on the client. This is not allowed'
      );
    }

    import './indexes';
    import './methods';
  }

  async sendPushNotification({
    title,
    message,
    userIds,
    additionalData,
    url,
    notificationId: notificationIdParam,
  }) {
    if (!Meteor.isServer) {
      throwPushError(
        'arch-error',
        'Push sending is only allowed on the server'
      );
    }

    check(title, String);
    check(message, String);
    check(userIds, [String]);
    check(notificationIdParam, Match.Maybe(String));

    if (!userIds.length) {
      throwPushError('missing-information', `Target audience is empty`);
    }

    const playerIds = Meteor.users
      .find({ _id: { $in: userIds } }, { fields: { playerIds: 1 } })
      .fetch()
      .reduce((acc = [], { playerIds = [] }) => [...acc, ...playerIds], []);

    const notificationId = notificationIdParam || Random.id();
    const bodyObject = {
      app_id: this.appId,
      headings: { en: title },
      contents: { en: message },
      include_player_ids: playerIds,
      data: { ...(url ? { url } : {}), ...additionalData, notificationId },
    };

    const bodyAsString = JSON.stringify(bodyObject);
    this._log(`POST request body to onesignal is: ${bodyAsString}`);

    import { fetch } from 'meteor/fetch';

    const response = await fetch(OneSignalSender.ONE_SIGNAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Authorization: `Basic ${this.restKey}`,
      },
      body: bodyAsString,
    });
    const jsonResponse = await response.json();

    this._log(
      `POST response from onesignal is: ${JSON.stringify(
        jsonResponse,
        undefined,
        2
      )}`
    );

    await OneSignalPushNotificationMeteorMetricsCollection._addMetricsForNotification(
      {
        notificationId,
        userIds,
      }
    );

    return notificationId;
  }
}

export const OneSignalPushNotification = new OneSignalSender();
Meteor.startup(() => {
  OneSignalPushNotification.init();
});
