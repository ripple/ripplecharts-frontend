/* Widget for embedding a modifiable chart within any website.  The widget is capable
 * of loading from the query string or from custom parameters.
 *
 *
 * Configuration options:
 *
 *  id        : id of element that will contain the chart. if not specified, the chart will be appended the body
 *  bodyTheme : true/false - setting true will apply the chart theme to the entire document, defaults to false
 *  customCSS : true/false - disables the default styling
 *  apiURL    : custom url for the API backend, defaults to ripplecharts.com API
 *  width     : width of chart
 *  height    : height of chart
 *  margin    : e.g. "{top:50,bottom:50,left:50,right:50}" - axis labels are drawn in the margin
 *
 * Chart options:
 *
 *  theme    : "light", "dark"
 *  type     : "line", "candlestick"
 *  base     : e.g "{currency:'USD',issuer:'rXaiz....'}"
 *  counter  : e.g "{currency:'BTC',issuer:'rXaiz....'}"
 *  start    : e.g "January 2, 2014 1:15pm"   - moment.js readable date/time
 *  end      : e.g "Feb 12, 2014"             - moment.js readable date/time
 *  interval : "second","minute","hour","day","week","month"
 *  multiple : e.g 1,5  - integer applied to interval, such as 5 minutes, 4 hours, etc.
 *
 */

remote = new ripple.RippleAPI({"server":"wss://s1.ripple.com"});

var PriceChartWidget = function (options) {
  var self = this, div, el, theme;

  if (!options) options = {};

  if (!options.customCSS && typeof PRICECHART_CSS != 'undefined') {
    var style = document.createElement("style");
    style.innerHTML = PRICECHART_CSS;
    document.getElementsByTagName("head")[0].appendChild(style);
  }


  //need to create a div here so that we can apply the theme, if necessary
  if (options.id) {
    div        = d3.select("#"+options.id);

  } else {
    options.id = "pc"+Math.random().toString(36).substring(5); //get random ID;
    div        = d3.select("body").append("div").attr("id", options.id);
  }

  el    = options.bodyTheme ? d3.select("body") : div;
  theme = null;


  var priceChart = new PriceChart ({
    url    : options.apiURL || API,
    id     : options.id,
    margin : options.margin,
    width  : options.width,
    height : options.height,
    resize : options.resize || false,
    live   : true
  });


  this.load = function (params) {
    if (!params) params = {};

    var range = {
      start    : params.start,
      end      : params.end,
      interval : params.interval,
      multiple : params.multiple,
      offset   : params.offset,
      live     : params.end ? undefined : params.live
    }

    if (!range.start && !range.offset && range.interval) {
      var i = range.interval.slice(0,2);
      var m = range.multiple || 1;

      if      (i=="se") range.offset = function(m) {return function(d){return d3.time.minute.offset(d, -2*m)}}(m);
      else if (i=="mi") range.offset = function(m) {return function(d){return d3.time.hour.offset(d,   -2*m)}}(m);
      else if (i=="ho") range.offset = function(m) {return function(d){return d3.time.day.offset(d,    -5*m)}}(m);
      else if (i=="da") range.offset = function(m) {return function(d){return d3.time.day.offset(d,    -120*m)}}(m);
      else if (i=="we") range.offset = function(m) {return function(d){return d3.time.year.offset(d,   -2*m)}}(m);
      else if (i=="mo") range.offset = function(m) {return function(d){return d3.time.year.offset(d,   -10)}}(m);
    }

    //remove previous theme, add the new one
    if (theme && params.theme && params.theme != theme) el.classed(theme, false);
    if (params.theme) {
      el.classed(params.theme, true);
      theme = params.theme;
    }

    priceChart.setType(params.type);
    priceChart.load(params.base, params.counter, range);
  }


  this.loadFromQS = function () {
    var params = getParams();

    if (!params.base)     params.base     = {currency:"XRP", issuer:""};
    if (!params.counter)  params.counter  = {currency:"USD", issuer:"rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B"};
    if (!params.type)     params.type     = "line";
    if (!params.theme)    params.theme    = "light";
    if (!params.multiple) params.multiple = 1;

    params.end   = params.end   ? moment.utc(params.end)   : moment.utc();
    params.start = params.start ? moment.utc(params.start) : defaultStart(params.end, params.interval, params.multiple);


    if (!params.interval) {

      var days = Math.abs(params.start.diff(params.end, "days"));
      if (days>365) {
        params.interval = "month";
        params.multiple = 1;

      } else if (days>120) {
        params.interval = "day";
        params.multiple = 3;

      } else if (days>30) {
        params.interval = "day";
        params.multiple = 1;

      } else if (days>5) {
        params.interval = "hour";
        params.multiple = 4;

      }  else if (days>3) {
        params.interval = "hour";
        params.multiple = 1;

      } else {
        var hours = Math.abs(params.start.diff(params.end, "hours"));
        if (hours>12) {
          params.interval = "minute";
          params.multiple = 15;

        } else if (hours>2) {
          params.interval = "minute";
          params.multiple = 5;

        } else {
          params.interval = "minute";
          params.multiple = 1;
        }
      }
    }

    //got everything, now load the chart
    self.load(params);

    function defaultStart(start, interval, multiple) {
      var num = multiple * 200;
      var i   = interval ? interval.slice(0,2) : null;

      if (!i) i = null;

      if      (i === "mi") return moment.utc().subtract(num, 'minutes');
      else if (i === "ho") return moment.utc().subtract(num, 'hours');
      else if (i === "da") return moment.utc().subtract(num, 'days');
      else if (i === "we") return moment.utc().subtract(num, 'weeks');
      else if (i === "mo") return moment.utc().subtract(num, 'months');
      else if (i === "ye") return moment.utc().subtract(num, 'years');
      else return moment.utc().subtract(1, 'days');
    }

    function getParams () {
      var params = {};
      var query  = window.location.search.substring(1);
      var vars   = query ? query.split("&") : [];

      for (var i = 0; i < vars.length; i++) {
        var pair  = vars[i].split('=');
        var key   = decodeURIComponent(pair[0]);
        var value = decodeURIComponent(pair[1]);

        try {
          params[key] = JSON.parse(value);
        } catch (e) { //invalid json
          params[key] = value;
        }
      }

      return params;
    }
  }

  //expose this function if the user wants to force a resize
  this.resize  = priceChart.resizeChart;

  //call this function to suspend the resize listener
  this.suspend = priceChart.suspend();

  return this;
}



