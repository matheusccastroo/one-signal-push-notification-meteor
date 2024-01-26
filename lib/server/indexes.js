import { OneSignalPushNotificationMeteorMetricsCollection } from '../common/collection';

Meteor.startup(async () => {
  await OneSignalPushNotificationMeteorMetricsCollection.createIndexAsync(
    { userId: 1, notificationId: 1, read: 1 },
    { name: 'userIdNotificationIdReadIndex' }
  );

  await OneSignalPushNotificationMeteorMetricsCollection.createIndexAsync(
    { userId: 1, notificationId: 1 },
    { name: 'userIdNotificationIdIndex' }
  );
});
