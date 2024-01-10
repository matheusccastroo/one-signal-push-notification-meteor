import Cookies from 'js-cookie';

export const COOKIES = {
  ONE_SIGNAL_PLAYER_ID: 'ONE_SIGNAL_PLAYER_ID',
};

export const getCookie = key => {
  if (!key) {
    throw new Error('Invalid parameters for getting cookie value');
  }

  return Cookies.get(key);
};

export const setCookie = (key, value) => {
  if (!key || !value) {
    throw new Error('Invalid parameters for setting cookie');
  }

  Cookies.set(key, value, { expires: Meteor.isDevelopment ? null : 365 });
};
