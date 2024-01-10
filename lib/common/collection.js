import { Mongo } from 'meteor/mongo';

/**
 * new SimpleSchema({
 *     userId: String,
 *     notificationId: String,
 *     readAt: Date,
 *     createdAt: Date,
 *     updatedAt: Date,
 *     read: Boolean,
 *   })
 */

export const OneSignalPushNotificationMeteorMetricsCollection =
  new Mongo.Collection('OneSignalPushNotificationMeteorMetrics');
