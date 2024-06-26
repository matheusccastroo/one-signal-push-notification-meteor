Package.describe({
  name: 'matheusccastro:one-signal-push-notification',
  version: '2.2.0',
  summary: 'Easily send push notifications using one-signal and Meteor',
  git: 'https://github.com/matheusccastroo/one-signal-push-notification-meteor',
  documentation: 'README.md',
});

Npm.depends({
  'js-cookie': '3.0.5',
});

Cordova.depends({
  'onesignal-cordova-plugin': '3.3.2',
  'cordova-plugin-inappbrowser': '5.0.0',
});

Package.onUse(function (api) {
  api.versionsFrom('2.8.0');
  api.use(['modules', 'ecmascript', 'mongo', 'check']);
  api.use(['fetch', 'random', 'ddp-server', 'webapp'], 'server');
  api.use(['accounts-base', 'ddp-client'], 'client');

  api.mainModule('lib/server/index.js', 'server', { lazy: true });
  api.mainModule('lib/client/index.js', 'client', { lazy: true });
});
