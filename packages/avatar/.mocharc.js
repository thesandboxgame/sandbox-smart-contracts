'use strict';

module.exports = {
  timeout: 0,
  ...(!process.env.CI ? {} : {invert: true, grep: '@skip-on-ci'}),
};
