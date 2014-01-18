function CapitalizationChart() {


// Hard-coded constants
var GATEWAY_NAMES = { // Gateways we're going to look at
  rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B:  "Bitstamp",
  razqQKzJRdB4UxFPWf5NEpEG3WMkmwgcXA: "RippleChina",
  rnuF96W4SZoCJmbHYBFoJZpR8eCaxNvekK: "RippleCN",
  rNPRNzBB92BVpAhhZr4iXDTveCgV5Pofm9: "RippleIsrael",
  rMwjYedjc7qqtKYVLiAccJSmCwih4LnE2q: "SnapSwap",
  rLEsXccBGNR3UPuPu2hUXPjziKC3qKSBun: "The Rock",
  rPDXxSZcuVL3ZWoyU82bcde3zwvmShkRyF: "WisePass",
  rfYv1TXnwgDDK4WQNbFALykYuEBnrR4pDX: "Div. Rippler",
  rGwUWgN5BEg3QGNY3RX2HfYowjUTZdid3E: "TTBit",
  r3ADD8kXSUKHd6zTCKfnKT3zV9EZHjzp1S: "Ripple Union",
  rkH1aQbL2ajA7HUsx8VQRuL3VaEByHELm:  "Ripple Money",
  rJHygWcTLVpSXkowott6kzgZU6viQSVYM1: "Justcoin",
  rM8199qFwspxiWNZRChZdZbGN5WrCepVP1: "XRP China",
  ra9eZxMbJrUcgV8ui7aPc161FgrqWScQxV: "Peercover"
};
var CURRENCIES_LIST = ["USD","CNY","EUR","BTC","LTC","NMC"]; // Currencies we're going to look at
var GATEWAY_NAME_ABBREVIATIONS = {
  "Dividend Rippler": "Div. Rippler",
  "The Rock Trading": "The Rock"
};
var CURRENCIES = { // Currencies you can measure value in
  "BTC":["Bitstamp", "Dividend Rippler", "Justcoin", "RippleCN", "Peercover", "RippleIsrael", "The Rock Trading", "XRP China"],
  "USD":["Bitstamp", "SnapSwap", "Peercover", "The Rock Trading"],
  "CNY":["RippleCN", "RippleChina", "XRP China"],
  "EUR":["Bitstamp", "The Rock Trading"]
};



// Derived setup
var GATEWAYS_LIST = [];
for (var g in GATEWAY_NAMES) {
  GATEWAYS_LIST.push(g);
}

for (var cur in CURRENCIES) {
  $("#currencySelector").append('<option value="'+cur+'">'+cur+'</option>');
}


// State variables
var waiting = true;
var isBlank = true;
var measureCurrency = "XRP";
var measureIssuer;
var distinction = "issuer";
var monthsPast = 0;
var preparedDataCache = {};
var fullData;
var sections;
var xAxisElement, yAxisElement;
var preparedData;
var currentXrpRates = {};


// Sizing parameters
var tooltipWidth = 150, tooltipHeight = 35, tooltipOffset=10;
var margin = {top: 20, right: 120, bottom: 30, left: 50},
    width = 960 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;
var yAxisMargin = 1.2;



// UI functions
function changeDistinction(that) {
  if (!$(that).hasClass("selected") && !waiting) {
    $(".distinctor").removeClass("selected");
    $(that).addClass("selected");
    //clearAddons();
    distinction = $(that).attr("id") === "currencyDistinctor" ? "currency" : "issuer"
    chartData(distinguishData(preparedData, distinction, measureCurrency, measureIssuer));
  }
}

function changeRange(that) {
  if (!$(that).hasClass("selected") && !waiting) {
    $(".ranger").removeClass("selected");
    $(that).addClass("selected");
    waiting = true;
    $("#throbber").show();
    monthsPast = parseInt($(that).attr("value"),10);
    requestData(monthsPast);
  }
}

function changeCurrency(that) {
  var cur = $(that).val();
  measureCurrency = cur;
  if (cur === "XRP") {
    $("#gatewaySelector").addClass("invisible");
  } else {
    var currentGateway = $("#gatewaySelector").val();
    $("#gatewaySelector").empty();
    for (var i=0; i<CURRENCIES[cur].length; i++) {
      var gateway = CURRENCIES[cur][i];
      $("#gatewaySelector").append('<option value="'+gateway+'"'+(currentGateway === gateway ? ' selected="selected"' : '')+'>'+gateway+'</option>');
    }
    $("#gatewaySelector").removeClass("invisible");  
  }
  changeGateway($("#gatewaySelector").get());
}

function changeGateway(that) {
  var gw = $(that).val();
  for (var address in GATEWAY_NAMES) {
    var abbreviatedName = GATEWAY_NAMES[address];
    if (abbreviatedName === (GATEWAY_NAME_ABBREVIATIONS[gw] || gw)) {
      measureIssuer = address;
      break;
    }
  }
  chartData(distinguishData(preparedData, distinction, measureCurrency, measureIssuer));
}

// Assignment of UI functions to UI elements
$(".distinctor").on("click", function(){changeDistinction(this)});
$(".ranger").on("click", function(){changeRange(this)});
$("#currencySelector").on("change", function(){changeCurrency(this)});
$("#gatewaySelector").on("change", function(){changeGateway(this)});

$("#controls").css({"margin-left":margin.left, width:width});




// Helper functions
function setClass() {
  for (var i=1; i<arguments.length; i++) {
    var arg = arguments[i];
    arg.attr("class",arguments[0]);
  }
}

function expandSection(sectionName) {
  if (typeof sectionName !== "undefined"){
    console.log("Expanding section:", sectionName);
  }
}

function sumExceptDate(entry) {
  var sum = 0;
  for (var name in entry) {
    if (name !== "date") {
      sum += Number(entry[name]);
    }
  }
  return sum;
}

function twoDigits(number) {
  var n = "" + number;
  if (n.length === 1) {
    n = "0" + n;
  }
  return n;
}

function roundNumber(number) {
  return Math.round(number).toLocaleString("en");
}

function renderDate(date) {
  var output = date.getUTCFullYear() + "-" + twoDigits(date.getUTCMonth()+1) + "-" + twoDigits(date.getUTCDate()) + " " +
    twoDigits(date.getUTCHours()) + ":" + twoDigits(date.getUTCMinutes());// + ":" + twoDigits(date.getUTCSeconds());
  return output;
}

function darkenColor(hexColor) {
  var red = Math.round((parseInt(hexColor.slice(1,3),16)/2)).toString(16);
  var green = Math.round((parseInt(hexColor.slice(3,5),16)/2)).toString(16);
  var blue = Math.round((parseInt(hexColor.slice(5,7),16)/2)).toString(16);
  red.length === 1 && (red = "0"+red);
  green.length === 1 && (green = "0"+green);
  blue.length === 1 && (blue = "0"+blue);
  return "#"+red+green+blue;
}

function summitAtX(x, data, needYBottom) {
  var date = xScale.invert(x), previousEntry, nextEntry, summitValue, datePoint;
  for (var i=0; i<data.length; i++) {
    if (data[i].date > date){
      nextEntry = data[i];
      previousEntry = data[i-1] || nextEntry;
      summitValue = needYBottom ? Number(nextEntry.y) : sumExceptDate(fullData[i]);
      datePoint = nextEntry.date;
      break;
    }
  }
  var previousX = xScale(previousEntry.date), nextX = xScale(nextEntry.date);
  var progress = (x - previousX)/(nextX - previousX), regress = 1-progress;
  var yTop = yScale(progress*(nextEntry.y+nextEntry.y0) + regress*(previousEntry.y+previousEntry.y0));
  var yBottom = needYBottom ? yScale(progress*nextEntry.y0 + regress*previousEntry.y0) : void(0);
  return {yTop:yTop, yBottom:yBottom, value:summitValue, date:datePoint};
}

function movingInSky() {
  if (!isBlank) {
    var mouseThis = d3.mouse(this);
    var x = mouseThis[0] - margin.left;
    var y = mouseThis[1] - margin.top;
    if (x < width && x > 0 && y > 0 && y < height) {
      var summit = summitAtX(x, sections[sections.length-1].values, false);
      var yTop = summit.yTop;
      verticalTracer.attr({x1:x, x2:x, y1:0, y2:height, class:"tracerout"});
      horizontalTracer.attr({x1:x, y1:yTop, y2:yTop});
      topTracer.attr({cx: x, cy:yTop});
      $("#tooltip").css({left: x+margin.left-tooltipWidth/2, top: yTop+margin.top-tooltipHeight-tooltipOffset});
      setClass("visible", horizontalTracer, topTracer, $("#tooltip"));
      $("#sectionName").text("TOTAL");
      $("#tracedValue").text(roundNumber(summit.value));
      $("#tracedDate").text(renderDate(summit.date));
    } else {
      setClass("invisible", verticalTracer, horizontalTracer, topTracer, $("#tooltip"));
    }
    setClass("invisible", bottomTracer);
  }
}

function movingInGround(d) {
  if (!isBlank) {
    var x = d3.mouse(this)[0];
    var date = xScale.invert(x);
    var summit = summitAtX(x, d.values, true);
    var yBottom = summit.yBottom,
        yTop = summit.yTop;
    
    if (isNaN(x) || isNaN(yTop) || isNaN(yBottom)) {} else {
      $("#sectionName").text(GATEWAY_NAMES[d.name] || d.name);
      $("#tracedValue").text(roundNumber(summit.value));
      $("#tracedDate").text(renderDate(summit.date));
      verticalTracer.attr({x1: x, x2: x, y1: yTop, y2: yBottom, class: "tracerin "+d.name});
      topTracer.attr({cx:x, cy:yTop});
      bottomTracer.attr({cx:x, cy:yBottom});
      $("#tooltip").css({left: x+margin.left-tooltipWidth/2, top: yTop+margin.top-tooltipHeight-tooltipOffset});
      setClass("visible", topTracer, bottomTracer, $("#tooltip"));
      setClass("invisible", horizontalTracer);
    }
    d3.event.stopPropagation();
  }
}

function abbreviatedName(d) {
  return GATEWAY_NAMES[d.name] || (d.name.length > 3 ? d.name.slice(0,7)+"…" : d.name);
}

function singletonArray(d) {
  return [d];
}

function clearAddons() {
  xAxisElement.remove();
  yAxisElement.remove();
  verticalTracer.node().parentNode.remove();
  horizontalTracer.node().parentNode.remove();
  topTracer.node().parentNode.remove();
  bottomTracer.node().parentNode.remove();
}



// Chart setup
var xScale = d3.time.scale().range([0, width]),
    //yScale = d3.scale.pow().exponent(0.5).range([height, 0]); // linear()
    yScale = d3.scale.linear().range([height, 0]);
var color = d3.scale.category20();
var xAxis = d3.svg.axis().scale(xScale).orient("bottom"),
    yAxis = d3.svg.axis().scale(yScale).orient("right").tickFormat(d3.format("s"));
var area = d3.svg.area()
  .x(function(d) { return xScale(d.date); })
  .y0(function(d) { return yScale(d.y0); })
  .y1(function(d) { return yScale(d.y0 + d.y); });
var stack = d3.layout.stack().values(function(d) { return d.values; });
var svg = d3.select("#container")
  .append("svg").attr({width: width + margin.left + margin.right, height: height + margin.top + margin.bottom}).on("mousemove", movingInSky)
  .append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");
var verticalTracer, horizontalTracer, topTracer, bottomTracer, tooltip;
var lineAttributes = {stroke: "black", "stroke-width": 0.5};
var borderAttributes = { stroke: "#888", "stroke-width":0.5};
var borders = svg.append("g");
borders.append("line").attr(borderAttributes).attr("x2",width);
borders.append("line").attr(borderAttributes).attr("y2",height);
borders.append("line").attr(borderAttributes).attr({y1:height, x2:width, y2:height});
borders.append("line").attr(borderAttributes).attr({x1:width,  x2:width, y2:height});
$("#tooltip").css({width: tooltipWidth, height: tooltipHeight});
$("#throbber").css({left:(margin.left+width)/2, top:height/2});

function chartData(formattedData) {
  if (!isBlank) {
    clearAddons();
  }
  fullData = [];
  for (var i=1; i<formattedData.length; i++) {
    var row = formattedData[i];
    var obj = {};
    for (var j=0; j<row.length; j++) {  //Assume all rows are the same length
      obj[formattedData[0][j]] = row[j];
    }
    fullData.push(obj);
  }
  
  color.domain(d3.keys(fullData[0]).filter(function(key) { return key !== "date"; }));
  fullData.forEach(function(d) {
    d.date = new Date(d.date);//new Date((d.date+946684800)*1000);
  });

  console.log(fullData);
  
  sections = stack(color.domain().map(function(name) {
    return {
      name: name,
      values: fullData.map(function(d) {
        return {date: d.date, y: Number(d[name])};
      })
    };
  }));
  
  xScale.domain(d3.extent(fullData, function(d) { return d.date; }));
  yScale.domain([0, yAxisMargin*d3.extent(fullData, sumExceptDate)[1]]);
  
  var section = svg.selectAll("g.section").data(sections);
  section.enter().append("g").attr("class","section");
  section.exit().remove();
  
  var path = section.selectAll("path").data(singletonArray);
  path.enter().append("path");
  path.transition().attr({class: "area", d: function(d) { return area(d.values); } })
    .style("fill", function(d) { return color(d.name); });
  path.on("mousemove", movingInGround).on("click", function(d){
      expandSection(d.name);
    }
  );
  path.exit().remove();
  
  var text = section.selectAll("text").data(function(d){return [{name: d.name, value: d.values[d.values.length - 1]}];});
  text.enter().append("text");
  text.attr({x: -6, dy: ".35em", fill:function(d){return darkenColor(color(d.name))}, transform: "translate("+(width+40)+"," + height + ")"})
  .transition().attr("transform", function(d) {
    var yTranslation = yScale(d.value.y0 + d.value.y / 2);
    var elevation = height-yScale(d.value.y);
    if (elevation < 8) {
      yTranslation = 9001;
    }
    //console.log("SCALE:", d.name, elevation);
    return "translate("+(width+50)+"," + yTranslation + ")";
  });
  var label = text.data(singletonArray);
  label.style({"font-weight":"bold", "font-size":"9pt"})
  .text(abbreviatedName)
  .on("mouseover", function(d){
    $(this).text(d.name);
  })
  .on("mouseout", function(d){
    $(this).text(abbreviatedName(d));
  });

  xAxisElement = svg.append("g").attr({class: "x axis", transform: "translate(0,"+ height+")"}).call(xAxis);
  yAxisElement = svg.append("g").attr({class: "y axis", transform: "translate("+width+",0)"})  .call(yAxis);
  verticalTracer = svg.append("g").attr("class", "tracerout").append("line").attr(lineAttributes)
  .on("mousemove", function(){d3.event.stopPropagation()}).on("click", function(){
    expandSection(this.classList[1]);
  });
  horizontalTracer = svg.append("g").append("line").attr(lineAttributes).attr("x2",width);
  topTracer        = svg.append("g").append("circle").attr(lineAttributes).attr("r",4).attr("fill","none");
  bottomTracer     = svg.append("g").append("circle").attr(lineAttributes).attr("r",4).attr("fill","none");
  setClass("invisible", verticalTracer, horizontalTracer, topTracer, bottomTracer);
  $("#throbber").hide();
  waiting = false;
  isBlank = false;
  $("#currencySelector").attr("disabled",null);
}


// Data processing functions
function prepareData(response) {
  var heading = [];
  var timeSeries = {};
  var seriesIndex = -1;
  var timestamp;
  
  for (var i=0; i<response.length; i++) {
    var dataSet = response[i];
    if (dataSet.results.length) {
      heading.push({currency:dataSet.currency, issuer:dataSet.address});
      seriesIndex++;
    }
    for (var j=0; j<dataSet.results.length; j++) {
      var result = dataSet.results[j];
      timestamp = result[0];
      if (!timeSeries[timestamp]) {
        timeSeries[timestamp] = [];
      }
      timeSeries[timestamp][seriesIndex] = Math.max(0,result[1]);
    }
  }
  
  var sortedTimes = [];
  for (var t in timeSeries) {
    sortedTimes.push(t);
  }
  
  sortedTimes.sort(function(a,b){return a-b});
  var fullSeries = [];
  for (var k=0; k<sortedTimes.length; k++) {
    timestamp = sortedTimes[k];
    var entry = timeSeries[timestamp];
    var previousEntry = fullSeries[fullSeries.length-1];
    var newEntry = [];
    for (var l=0; l<heading.length; l++) {
      newEntry.push(entry[l] || (previousEntry ? previousEntry[l+1] : 0));
    }
    newEntry.unshift(parseInt(timestamp, 10));
    fullSeries.push(newEntry);
  }
  heading.unshift("date");
  return {heading:heading, series:fullSeries};
}

function distinguishData(preparedData, distinction, currency, issuer) {
  currency = currency || "XRP";
  var oldHeading = preparedData.heading;
  var oldSeries = preparedData.series;
  var newHeading = [];
  var key;
  
  for (var x=1; x<oldHeading.length; x++) {
    var header = oldHeading[x][distinction];
    if (newHeading.indexOf(header) === -1) {
      newHeading.push(header);
    }
  }
  var newSeries = [];
  for (var i=0; i<oldSeries.length; i++) {
    var entry = oldSeries[i];
    var sums = {};
    for (var j=1; j<entry.length; j++) {
      key = oldHeading[j][distinction];
      var rateKey = oldHeading[j].currency + ":" + oldHeading[j].issuer;
      var rate = currentXrpRates[rateKey] || 0;
      if (currency !== "XRP") {
        var conversionKey = currency + ":" + issuer;
        var conversion = currentXrpRates[conversionKey];
        if (conversion) {
          rate /= conversion;
        } else {
          console.log("ERROR: No exchange rate found; defaulting to XRP");
        }
      }
      var point = entry[j] * rate; //Apply exchange rate here
      if (!sums[key]) {
        sums[key] = 0;
      }
      sums[key] += point;
    }
    var newEntry = [];
    for (var k=0; k<newHeading.length; k++) {
      key = newHeading[k];
      newEntry.push(sums[key]);
    }
    newEntry.unshift(entry[0]);
    newSeries.push(newEntry); 
  }
  
  var le = newSeries[newSeries.length-1];
  var lastEntry = [];
  for (var l=1; l<le.length; l++) {
    lastEntry.push(le[l]);
  }
  var zipped = [];
  for (var m=0; m<lastEntry.length; m++) {
    zipped.push([lastEntry[m], newHeading[m]]);
  }
  zipped.sort(function(a,b){return a[0]-b[0];})
  var sortedHeading = [];
  for (var n=0; n<zipped.length; n++) {
    sortedHeading.push(zipped[n][1]);
  }
  var sortedSeries = [];
  for (var o=0; o<newSeries.length; o++) {
    var e = newSeries[o];
    var ts = e.shift();
    var ee = [];
    for (var p=0; p<sortedHeading.length; p++) {
      var h = sortedHeading[p];
      ee.push(e[newHeading.indexOf(h)]);
    }
    ee.unshift(ts);
    sortedSeries.push(ee);
  }
  sortedHeading.unshift("date");
  sortedSeries.unshift(sortedHeading);
  return sortedSeries;
}

var numberOfCurrenciesAsked = CURRENCIES_LIST.length;
for (var i=0; i<CURRENCIES_LIST.length; i++) {
  cur = CURRENCIES_LIST[i];
  $.post("http://ct.ripple.com:5993/api/exchangeRates",{currencies: [cur,'XRP'], gateways: GATEWAYS_LIST}, recordRate);
}
var numberOfCurrenciesAnswered = 0;

function recordRate(response) {
  numberOfCurrenciesAnswered++;
  for (var i=0; i<response.length; i++) {
    var exchange = response[i];
    if (exchange.base.currency === "XRP") {
      var key = exchange.trade.currency + ":" + exchange.trade.issuer;
      currentXrpRates[key] = 1/exchange.rate; //I.e. how many XRP is this worth?
    }
  }
}

function requestData(monthsPast) {
  if (preparedDataCache[monthsPast]) {
    preparedData = preparedDataCache[monthsPast];
    chartData(distinguishData(preparedData, distinction, measureCurrency, measureIssuer));
  } else {
  
    var startTime;
    if (monthsPast) {
      var date = new Date();
      date.setUTCMonth(date.getUTCMonth()-monthsPast);
      startTime = date.getUTCFullYear() + "-" + (date.getUTCMonth()+1) + "-" + date.getUTCDate();
    }
    
    var increment = {0:"months", 12:"weeks", 6:"weeks", 2:"days", 1:"hours"}[monthsPast];
    $.post("http://ct.ripple.com:5993/api/gatewayCapitalization",
    {currencies: CURRENCIES_LIST, gateways: GATEWAYS_LIST, timeIncrement: increment, startTime: startTime},
    function(response) {
      preparedData = prepareData(response);
      //console.log(response, preparedData, distinguishData(preparedData, "issuer", measureCurrency, measureIssuer));
      preparedDataCache[monthsPast] = preparedData;
      if (numberOfCurrenciesAnswered < numberOfCurrenciesAsked) {
        var waitingInterval = setInterval(function(){
          console.log("Waiting for exchange rates:", numberOfCurrenciesAnswered, "out of", numberOfCurrenciesAsked);
            if (numberOfCurrenciesAnswered >= numberOfCurrenciesAsked) {
              clearInterval(waitingInterval);
              chartData(distinguishData(preparedData, "issuer", measureCurrency, measureIssuer));
            }
        },1000);
      } else {
        chartData(distinguishData(preparedData, "issuer", measureCurrency, measureIssuer));
      }
    });
  }
}
requestData(0);

}