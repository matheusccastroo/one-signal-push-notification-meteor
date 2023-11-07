export const log = msg => console.log(`[ONE-SIGNAL-PUSH-NOTIFICATION]: ${msg}`);

export const logWarn = warn =>
  console.log(`[ONE-SIGNAL-PUSH-NOTIFICATION]: ${warn}`);

export const logError = error =>
  console.error(`[ONE-SIGNAL-PUSH-NOTIFICATION]: ${error}`);

export const throwPushError = (error, reason) => {
  throw new Meteor.Error(error, `[ONE-SIGNAL-PUSH-NOTIFICATION]: ${reason}`);
};

export const callMethod = (...args) =>
  new Promise((r, rj) =>
    Meteor.call(...args, (error, result) => (error ? rj(error) : r(result)))
  );

export const isInternalLink = to => {
  if (!to || typeof to !== 'string') return false;
  if (to.includes('mailto:')) return false;
  if (to.includes('://')) return false;

  return true;
};

export const handleCordovaRedirect = (url, handleInternalLinkRedirect) => {
  if (isInternalLink(url)) {
    if (typeof handleInternalLinkRedirect !== 'function') {
      return logError('Missing internal redirect handler');
    }

    return handleInternalLinkRedirect(url);
  }

  if (!Meteor.isCordova) {
    return logError('Not on cordova');
  }

  const options =
    'usewkwebview=yes,hidenavigationbuttons=yes,location=no,hideurlbar=yes,closebuttoncaption=Done,zoom=no,toolbarposition=top';

  cordova.InAppBrowser.open(url, '_system', options);
};
