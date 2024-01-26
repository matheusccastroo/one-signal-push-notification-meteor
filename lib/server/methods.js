Meteor.methods({
  'oneSignal#setPlayerId'({ playerId }) {
    check(playerId, String);

    if (this.isSimulation) {
      return;
    }

    const userId = this.userId;
    if (!userId) {
      throw new Meteor.Error(403, 'You need to be logged in');
    }

    return Meteor.users.updateAsync(userId, {
      $addToSet: { playerIds: playerId },
    });
  },
  'oneSignal#unsetPlayerId'({ playerId }) {
    check(playerId, String);

    if (this.isSimulation) {
      return;
    }

    return Meteor.users.updateAsync(
      { playerIds: [playerId] },
      { $pull: { playerIds: { $in: [playerId] } } },
      { multi: true }
    );
  },
  'oneSignal#setNotificationAsRead'({ notificationId, userId }) {
    check(notificationId, String);
    check(userId, String);

    if (this.isSimulation) {
      return;
    }

    const contextUserId = this.userId;
    if (userId !== contextUserId) {
      import { throwPushError } from '../common/helpers';

      throwPushError(
        'user-mismatch',
        'User parameter is not the same as the context user'
      );
    }

    import { OneSignalPushNotificationMeteorMetricsCollection } from '../common/collection';

    const nowTimestamp = new Date();
    return OneSignalPushNotificationMeteorMetricsCollection.updateAsync(
      { notificationId, userId, read: false },
      {
        $set: {
          notificationId,
          userId,
          readAt: nowTimestamp,
          updatedAt: nowTimestamp,
          read: true,
        },
      }
    );
  },
});
