export const log = msg => console.log(`[ONE-SIGNAL-PUSH-NOTIFICATION]: ${msg}`);

export const logWarn = warn =>
  console.log(`[ONE-SIGNAL-PUSH-NOTIFICATION]: ${warn}`);

export const logError = error =>
  console.error(`[ONE-SIGNAL-PUSH-NOTIFICATION]: ${error}`);

export const throwPushError = (error, reason) => {
  throw new Meteor.Error(error, `[ONE-SIGNAL-PUSH-NOTIFICATION]: ${reason}`);
};

export class OneSignalSenderBase {
  appId;
  shouldLog;

  static _instance;

  constructor() {
    if (OneSignalSenderBase._instance) {
      throwPushError(
        'already-instantiated',
        'Not allowed to instantiate again'
      );
    } else {
      OneSignalSenderBase._instance = this;
    }

    const { ONESIGNAL_APP_ID } = Meteor.settings.public;

    if (!ONESIGNAL_APP_ID) {
      throwPushError('missing-information', 'Missing ONESIGNAL_APP_ID');
    }

    this.appId = ONESIGNAL_APP_ID;
    this.shouldLog = Meteor.isDevelopment;
  }

  enableLog() {
    this.shouldLog = true;
  }

  disableLog() {
    this.shouldLog = false;
  }

  _log(msg) {
    if (this.shouldLog) {
      log(msg);
    }
  }

  _logWarn(warn) {
    if (this.shouldLog) {
      logWarn(warn);
    }
  }

  _logError(error) {
    if (this.shouldLog) {
      logError(error);
    }
  }
}
