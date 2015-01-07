/**
 * This file/module contains all configuration for the build process.
 */
module.exports = {
  name: "ticker", //must be unique to embeds
  files: {

    html: "src/embed/ticker.html",
    loader: 'src/assets/images/rippleThrobber.png',
    
    js: [  
      'vendor/moment/moment.js',
      'vendor/d3/d3.js',
      'vendor/ripple/ripple.js',
      'vendor/jquery/jquery.js',
      'deps/onResize.js',
      'src/common/apiHandler.js',
      'src/embed/ticker-script.js',
      'deps/offersExercisedListener.js' 
      ],
    
    less: [
      'src/embed/ticker.less', 
    ]
  }
};

