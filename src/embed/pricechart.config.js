/**
 * This file/module contains all configuration for the build process.
 */
module.exports = {
  name: "pricechart", //must be unique to embeds
  files: {

    html: "src/embed/pricechart.html",
    loader: 'src/assets/images/rippleThrobber.png',
    
    js: [  
      'vendor/moment/moment.js',
      'vendor/d3/d3.js',
      'deps/ripple-0.7.36.js',
      'src/common/apiHandler.js',
      'src/common/priceChart.js',
      'src/embed/pricechart-script.js' 
      ],
    
    less: [
      'src/less/priceChart.less',
      'src/embed/pricechart.less', 
    ]
  }
};

