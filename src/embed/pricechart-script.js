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
 *  trade    : e.g "{currency:'BTC',issuer:'rXaiz....'}"
 *  start    : e.g "January 2, 2014 1:15pm"   - moment.js readable date/time
 *  end      : e.g "Feb 12, 2014"             - moment.js readable date/time
 *  interval : "second","minute","hour","day","week","month"
 *  multiple : e.g 1,5  - integer applied to interval, such as 5 minutes, 4 hours, etc.
 * 
 */

var PriceChartWidget = function (options) {
  var self = this, div, el, theme;
  
  if (!options) options = {};
  
  if (!options.customCSS && typeof CSS != 'undefined') {
    var style = document.createElement("style");
    style.innerHTML = CSS;
    document.getElementsByTagName("head")[0].appendChild(style);
  }

  
  //need to create a div here so that we can apply the theme, if necessary
  if (options.id) {
    div        = d3.select("#"+options.id);
    console.log(div);
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
    height : options.height
  }); 
  
  
  this.load = function (params) {
    if (!params) params = {};
    
    var range = {
      start    : params.start,
      end      : params.end,
      interval : params.interval,
      multiple : params.multiple,
      offset   : params.offset    
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
    priceChart.load(params.base, params.trade, range);      
  }
  
  
  this.loadFromQS = function () {
    
    var params = getParams();
    
    if (!params.base)  params.base  = {currency:"XRP", issuer:""};
    if (!params.trade) params.trade = {currency:"USD", issuer:"rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B"}; 
    if (!params.type)  params.type  = "line";
    if (!params.theme) params.theme = "light"; 
    
    
    params.end   = params.end   ? moment.utc(params.end)   : moment.utc(); 
    params.start = params.start ? moment.utc(params.start) : defaultStart(params.end, params.interval);
    
    if (!params.interval) {
      
      var days = Math.abs(params.start.diff(params.end, "days"));
      if (days>365) {
        params.interval = "months";
        params.multiple = 1;
            
      } else if (days>120) {
        params.interval = "days";
        params.multiple = 3;
          
      } else if (days>30) {
        params.interval = "days";
        params.multiple = 1;   
         
      } else if (days>5) {
        params.interval = "hours";
        params.multiple = 4;   
         
      }  else if (days>3) {
        params.interval = "hours";
        params.multiple = 1;  
          
      } else {
        var hours = Math.abs(params.start.diff(params.end, "hours"));
        if (hours>12) {
          params.interval = "minutes";
          params.multiple = 15;  
        
        } else if (hours>2) {
          params.interval = "minutes";
          params.multiple = 5;  
                
        } else {
          params.interval = "minutes";
          params.multiple = 1;  
        }
      }
      
      //got everything, now load the chart
      self.load(params);   
    }
    
    function defaultStart(start, interval) {
      if (!interval) interval = null;
      if      (interval=="minutes") return moment.utc(d3.time.day.offset(start, -2));  
      else if (interval=="hours")   return moment.utc(d3.time.day.offset(start, -5)); 
      else if (interval=="days")    return moment.utc(d3.time.day.offset(start, -90)); 
      else if (interval=="weeks")   return moment.utc(d3.time.year.offset(start, -2)); 
      else if (interval=="months")  return moment.utc(d3.time.year.offset(start, -100)); 
      else if (interval=="years")   return moment.utc(d3.time.year.offset(start, -100)); 
      else return moment.utc(d3.time.day.offset(start, -2));
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
  
  return this;
}



