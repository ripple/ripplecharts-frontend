'use strict';

/**
 * This file/module contains all configuration for the build process.
 */

module.exports = {
  name: 'ticker', // must be unique to embeds
  files: {

    html: 'src/embed/ticker.html',
    loader: 'src/assets/images/rippleThrobber.png',

    common: [
      'vendor/jquery/jquery.js',
      'vendor/moment/moment.js',
      'vendor/lodash/lodash.js',
      'vendor/d3/d3.js',
      'deps/ripple.js'
    ],

    icons: [
      'src/assets/icons/arrow_down.png',
      'src/assets/icons/arrow_up.png'
    ],

    json: [
      {name: 'gateways', path: 'src/assets/gateways.json'}
    ],

    js: [
      'vendor/smooth-div-scroll/js/jquery-ui-1.10.3.custom.min.js',
      'vendor/smooth-div-scroll/js/jquery.smoothdivscroll-1.3-min.js',
      'vendor/smooth-div-scroll/js/jquery.mousewheel.min.js',
      'src/common/apiHandler.js',
      'src/embed/ticker-script.js',
      'src/common/dropdowns.js',
      'deps/offersExercisedListener.js'
    ],

    less: [
      'src/embed/ticker.less'
    ]
  }
};

