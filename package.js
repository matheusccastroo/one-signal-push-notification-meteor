Package.describe({
  name: 'matheusccastro:one-signal-push-notification',
  version: '1.0.0',
  summary: 'Easily send push notifications using one-signal and Meteor',
  git: 'https://github.com/matheusccastroo/one-signal-push-notification-meteor',
  documentation: 'README.md',
});

Npm.depends({
  'js-cookie': '3.0.5',
});

Cordova.depends({
  'onesignal-cordova-plugin': '3.1.0',
  'cordova-plugin-inappbrowser': '5.0.0',
});

Package.onUse(function (api) {
  api.versionsFrom('2.13.3');
  api.use('modules');
  api.use('ecmascript');

  api.mainModule('lib/server/index.js', 'server');
  api.mainModule('lib/client/index.js', 'client', { lazy: true });
});
