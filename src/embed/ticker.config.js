/**
 * This file/module contains all configuration for the build process.
 */
module.exports = {
  name: "ticker", //must be unique to embeds
  files: {

    html: "src/embed/ticker.html",
    loader: 'src/assets/images/rippleThrobber.png',

    icons: [
      'src/assets/icons/arrow_down.png',
      'src/assets/icons/arrow_up.png',
      'src/assets/icons/offerout.svg',
    ],
    
    json: [
      'src/assets/gateways.json'
    ],

    js: [  
      'vendor/moment/moment.js',
      'vendor/d3/d3.js',
      'vendor/ripple/ripple.js',
      'vendor/jquery/jquery.js',
      'vendor/simplyscroll/jquery.simplyscroll.js',
      'deps/onResize.js',
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

