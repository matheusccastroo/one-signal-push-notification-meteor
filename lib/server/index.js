import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';
import { throwPushError, OneSignalSenderBase } from '../common/helpers';
import { OneSignalPushNotificationMeteorMetricsCollection } from '../common/collection';

class OneSignalSenderServer extends OneSignalSenderBase {
  restKey;

  static ONE_SIGNAL_API_URL = 'https://onesignal.com/api/v1/notifications';

  constructor() {
    super();

    const { ONESIGNAL_REST_KEY } = Meteor.settings;

    if (Meteor.isServer && !ONESIGNAL_REST_KEY) {
      throwPushError('missing-information', 'Missing ONESIGNAL_REST_KEY');
    }

    this.restKey = ONESIGNAL_REST_KEY;
  }

  init() {
    if (!Meteor.isServer) {
      throwPushError(
        'arch-error',
        'Trying to initiate server code outside of server'
      );
    }

    import './indexes';
    import './methods';
  }

  async _addMetricsForNotification({ userIds, notificationId }) {
    if (!Meteor.isServer) {
      throwPushError(
        'arch-error',
        'You can only track notifications from the server'
      );
    }

    check(userIds, [String]);
    check(notificationId, String);

    if (!userIds.length) {
      return this._logError(
        `Missing userIds to track notification ${notificationId}`
      );
    }

    const nowTimestamp = new Date();
    const bulkWriteOperations = userIds.filter(Boolean).map(userId => ({
      insertOne: {
        document: {
          _id: Random.id(),
          userId,
          notificationId,
          read: false,
          createdAt: nowTimestamp,
        },
      },
    }));

    if (!bulkWriteOperations) {
      return this._logError('No metrics to add');
    }

    await OneSignalPushNotificationMeteorMetricsCollection.rawCollection().bulkWrite(
      bulkWriteOperations,
      {
        ordered: false,
      }
    );
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

    const response = await fetch(OneSignalSenderServer.ONE_SIGNAL_API_URL, {
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

    await this._addMetricsForNotification({
      notificationId,
      userIds,
    });

    return notificationId;
  }
}

export { OneSignalPushNotificationMeteorMetricsCollection } from '../common/collection';
export const OneSignalPushNotification = new OneSignalSenderServer();
Meteor.startup(() => {
  OneSignalPushNotification.init();
});
