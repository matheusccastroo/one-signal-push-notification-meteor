import { OneSignalPushNotificationMeteorMetricsCollection } from '../common/collection';

Meteor.startup(() => {
  OneSignalPushNotificationMeteorMetricsCollection.createIndex(
    { userId: 1, notificationId: 1, read: 1 },
    { name: 'userIdNotificationIdReadIndex' }
  );
  OneSignalPushNotificationMeteorMetricsCollection.createIndex(
    { userId: 1, notificationId: 1 },
    { name: 'userIdNotificationIdIndex' }
  );
});
