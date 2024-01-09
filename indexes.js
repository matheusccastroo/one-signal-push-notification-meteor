import { OneSignalPushNotificationMeteorMetricsCollection } from './collection';

Meteor.startup(() => {
  OneSignalPushNotificationMeteorMetricsCollection.createIndex(
    { userId: 1, notificationId: 1, read: 1 },
    { name: 'userIdNotificationIdReadIndex' }
  );
});
