
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

var base  = params.base  ? params.base  : {currency:"XRP", issuer:""};
var trade = params.trade ? params.trade : {currency:"USD", issuer:"rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B"}; 
var type  = params.type  ? params.type  : "line";
var theme = params.theme ? params.theme : "light"; 
var range = {};

range.end      = params.end      ? moment.utc(params.end)   : moment.utc(); 
range.start    = params.start    ? moment.utc(params.start) : defaultStart(range.end, params.interval);

if (params.multiple) range.multiple = params.multiple;
if (params.interval) range.interval = params.interval;
else {
  
  var days = Math.abs(range.start.diff(range.end, "days"));
  if (days>365) {
    range.interval = "months";
    range.multiple = 1;
        
  } else if (days>120) {
    range.interval = "days";
    range.multiple = 3;
      
  } else if (days>30) {
    range.interval = "days";
    range.multiple = 1;   
     
  } else if (days>5) {
    range.interval = "hours";
    range.multiple = 4;   
     
  }  else if (days>3) {
    range.interval = "hours";
    range.multiple = 1;  
      
  } else {
    var hours = Math.abs(range.start.diff(range.end, "hours"));
    if (hours>12) {
      range.interval = "minutes";
      range.multiple = 15;  
    
    } else if (hours>2) {
      range.interval = "minutes";
      range.multiple = 5;  
            
    } else {
      range.interval = "minutes";
      range.multiple = 1;  
    }
  }  
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

