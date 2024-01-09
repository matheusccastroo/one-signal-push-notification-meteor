import { callMethod, log, logError, throwPushError } from './helpers';
import { Random } from 'meteor/random';

const COLLECTION_NAME = 'OneSignalPushNotificationMeteorMetrics';
class OneSignalPushNotificationMeteorMetrics extends Mongo.Collection {
  constructor(collectionName = COLLECTION_NAME, options = {}) {
    const collection = super(collectionName, options);

    collection.attachSchema({
      userId: String,
      notificationId: String,
      createdAt: Date,
      updatedAt: {
        type: Date,
        optional: true,
      },
      read: Boolean,
    });
  }

  async _addMetricsForNotification({ userIds, notificationId }) {
    if (!Meteor.isServer) {
      throwPushError(
        'arch-error',
        'You can only track notifications from the server'
      );
    }

    check(userIds, [Object]);
    check(notificationId, String);

    if (!userIds.length) {
      return logError(
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
      return logError('No metrics to add');
    }

    await this.rawCollection().bulkWriteOperation(bulkWriteOperations, {
      ordered: false,
    });
  }

  async _setNotificationAsReadByUser({
    notificationId,
    userId,
    retryCount = 0,
    shouldLog,
  }) {
    if (!Meteor.isClient) {
      throwPushError(
        'arch-error',
        'You can only set notifications as read from the client'
      );
    }

    check(notificationId, String);
    check(userId, String);
    check(shouldLog, Match.Maybe(Boolean));

    try {
      if (shouldLog) {
        log(`Setting notification ${notificationId} as read`);
      }

      await callMethod('oneSignal#setNotificationAsRead', {
        notificationId,
        userId,
      });
    } catch (e) {
      logError(e);

      // Try up to 3 times
      if (retryCount < 3) {
        return Meteor.defer(() =>
          this._setNotificationAsReadByUser({
            notificationId,
            userId,
            retryCount: retryCount + 1,
            shouldLog,
          })
        );
      }

      // OK, we are losing this metric. Log on the client console.
      this.logError(
        `Unable to record metric for notification ${notificationId} at ${new Date()}`
      );
    }
  }
}

export const OneSignalPushNotificationMeteorMetricsCollection =
  new OneSignalPushNotificationMeteorMetrics();
