import { logError } from '../common/helpers';

export const callMethod = (...args) =>
  new Promise((r, rj) =>
    Meteor.call(...args, (error, result) => (error ? rj(error) : r(result)))
  );

const isInternalLink = to => {
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
