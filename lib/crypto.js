const crypto = require('node:crypto');

const c = {
  encrypt: (text) => {
    return crypto
      .createHash('sha256')
      .update(text)
      .digest('hex');
  },
  compare: (enc, text) => {
    if (enc == c.encrypt(text)) {
      return true;
    }

    return false;
  },
};

module.exports = c;
