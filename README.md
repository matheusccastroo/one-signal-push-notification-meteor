## Meteor One-Signal integration

Meteor package to enable push notifications with `One-Signal`.

### Installation
````
meteor add matheusccastro:one-signal-push-notification
````

### Requirements

* Make sure you created your `One-Signal` account and have it set up.
* Add the following variables in your `Meteor.settings` file: 
  * `ONESIGNAL_APP_ID` in `Meteor.settings.public`
  * `ONESIGNAL_REST_KEY` in `Meteor.settings` (i.e. top level settings on server)

### Usage

To send push notifications, simply call (on the server):
```
import { OneSignalPushNotification } from 'meteor/matheusccastro:one-signal-push-notification';

await OneSignalPushNotification.sendPushNotification({ title, message, userIds, additionalData, url });
```
To make the notification redirect to some part of your app or to an external page, pass the `url` property to the `additionalData` object or as a named parameter to the function.

#

To enable redirects from push notifications inside your app, do the following (on the client - outside of startup calls):
```
import { OneSignalPushNotification } from 'meteor/matheusccastro:one-signal-push-notification';

OneSignalPushNotification.setInternalLinkHandler((url) => { ... })
```
This will register your callback on the `one-signal` plugin, and it will be called when the received push notification
tries to redirect the user to the page you sent (i.e. `additionalData.url` exists).
Normally in this handler you would make your router redirect the user to the page.

### Logging
By default, logging will be enabled when `Meteor.isDevelopment` is true. If you want to change that, call (outside of startup calls):
```
import { OneSignalPushNotification } from 'meteor/matheusccastro:one-signal-push-notification';

OneSignalPushNotification.enableLog();
OneSignalPushNotification.disableLog();
```

### Important
This package stores the `playerIds` from `one-signal` in the user document. You may need to adapt your publications to account
for this new field.

Also, this package does not store the notifications sent, it simply sends it. If you want to show a history, you can consult the `one-signal` dashboard.