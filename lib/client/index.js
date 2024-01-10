import { Meteor } from 'meteor/meteor';
import { throwPushError, OneSignalSenderBase } from '../common/helpers';
import { callMethod } from './helpers';

class OneSignalSenderClient extends OneSignalSenderBase {
  internalLinkHandler;

  constructor() {
    super();

    this.internalLinkHandler = null;
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

  async _setNotificationAsReadByUser({
    notificationId,
    userId,
    retryCount = 0,
  }) {
    if (!Meteor.isCordova) {
      throwPushError(
        'arch-error',
        'You can only set notifications as read from cordova'
      );
    }

    check(notificationId, String);
    check(userId, String);

    try {
      this._log(`Setting notification ${notificationId} as read`);

      await callMethod('oneSignal#setNotificationAsRead', {
        notificationId,
        userId,
      });
    } catch (e) {
      this._logError(e);

      // Try up to 3 times
      if (retryCount < 2) {
        return Meteor.defer(() =>
          this._setNotificationAsReadByUser({
            notificationId,
            userId,
            retryCount: retryCount + 1,
          })
        );
      }

      // OK, we are losing this metric. Log on the client console.
      this.logError(
        `Unable to record metric for notification ${notificationId} at ${new Date()}`
      );
    }
  }

  init() {
    if (!Meteor.isCordova) {
      return this._logError('Not on cordova, nothing to do.');
    }

    return document.addEventListener(
      'deviceready',
      () => this._initClient(),
      false
    );
  }

  _initClient() {
    import { Accounts } from 'meteor/accounts-base';
    import { COOKIES, getCookie } from './cookie-helpers';
    import { callMethod } from './helpers';

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
        notification: { additionalData: { url, notificationId } = {} } = {},
      }) => {
        this._log(`RECEIVED NEW NOTIFICATION WITH URL ${url}`);

        if (notificationId) {
          await this._setNotificationAsReadByUser({
            notificationId,
            userId: Meteor.userId(),
          });
        }

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
}

export { OneSignalPushNotificationMeteorMetricsCollection } from '../common/collection';
export const OneSignalPushNotification = new OneSignalSenderClient();
Meteor.startup(() => {
  OneSignalPushNotification.init();
});
