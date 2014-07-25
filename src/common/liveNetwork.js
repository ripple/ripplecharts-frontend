liveNetwork = function() {




// Display / Setup

var DRIFTING_TIME_SECONDS = 180;
function crossBrowserCSS(basic) {
	return basic+
		"; -webkit-"+basic+
		"; -moz-"+basic+
    "; -o-"+basic+
		";";
}
function setDriftingTime(seconds) {
	var css = document.createElement("style");
	css.type = "text/css";
	css.innerHTML = ".drifting { "+
		crossBrowserCSS("animation-name:drift")+
		crossBrowserCSS("animation-duration:"+seconds+"s")+
		crossBrowserCSS("animation-timing-function:linear");
	document.head.appendChild(css);
}
setDriftingTime(DRIFTING_TIME_SECONDS);

// Clear drifting objects on zoom
// Also, zoom the map
var dpr = window.devicePixelRatio;
window.onresize = function() {
	var newDpr = window.devicePixelRatio;
	if (dpr !== newDpr) {
		dpr = newDpr;
		d3.selectAll(".drifting").remove();
	}
  resizeMap();
}
function resizeMap() {
  var scaleFactor = 1;
  if ($("#zooming").css("display") === "block") {
    scaleFactor = $("#worldandriver").width() / $("#world").width();
  }
  var css = "scale("+scaleFactor+")";
  $("#world").height(425*scaleFactor).css({
    "transform": css,
    "-webkit-transform": css,
    "-moz-transform": css
  });
}
$(resizeMap);

// Clear drifting objects on loss of focus 
var windowHasFocus = true;
var then = new Date();
setInterval(function(){
	var now = new Date();
	var elapsed = now - then;
	then = now;
	if (elapsed > 800) {
		windowHasFocus = false;
		metaQueue.clear();
		d3.selectAll(".drifting").remove();
	} else {
		windowHasFocus = true;
	}
}, 400);


// URLs
// Ledgers, transactions, validation events:
var RIPPLED_PROXY_URL = "http://ec2-54-91-140-120.compute-1.amazonaws.com";
// Historical transaction/ledger statistics:
var RIPPLECHARTS_API_URL = "http://api.ripplecharts.com/api";
// Client performance metrics:
var MIXPANEL_PROXY_URL = RIPPLED_PROXY_URL+"/mixpanel";
// They happen to be on the same server, but this may change


// d3 modules

// World Map
var EARTH_GEOGRAPHY = topojson.object(topology, topology.objects.countries).geometries;
var SERVER_CIRCLE_ATTRIBUTES = {r: 4, opacity: 1, "stroke-width":3};
var worldMap = new WorldMap(
	d3.select("#world"), //mapContainer
	d3.select("#locationdetails"), //detailContainer
	960, 420, //width, height
	EARTH_GEOGRAPHY, //geography
	SERVER_CIRCLE_ATTRIBUTES, //circleAttributes
	RIPPLED_PROXY_URL+"/ip/" //dataSourceUrl
);


// Bar chart:  depicting positive or negative variation from a certain midpoint
function Barchart(container, baseline, deviance, height, barWidth) {
	var UP_COLOR = "#655";
	var DOWN_COLOR = "#565";
	var barchart = {
		xOffset: 0,
		translation: 0,
		svg: container.append("svg").attr({width:"80%", height:height})
	};
	barchart.bars = barchart.svg.append("g");
	barchart.svg.append("line").attr({
		x1:0,x2:1000,
		y1:height/2,y2:height/2,
		stroke:"#666"
	});
	var width = $(barchart.svg[0]).width();
	barchart.addPoint = function(value) {
		var scaledValue = (value-baseline)/deviance * height / 2;
		var color = scaledValue<0 ? DOWN_COLOR : scaledValue>0 ? UP_COLOR : "#666";
		var x = this.xOffset+barWidth/2;
		this.xOffset += barWidth;
		if (this.xOffset > width) {
			this.translation -= barWidth;
			this.bars.attr("transform","translate("+this.translation+",0)");
			this.bars.select("line").remove();
		}
		this.bars.append("line").attr({
			x1: x, x2: x,
			y1: height/2, y2: height/2-scaledValue,
			stroke: color, "stroke-width":barWidth-1
		});
	}
	return barchart;
}
var barchart; // Will be initialized once average ledger close time is found


// Timeline river
var OTHER_LABEL = "other";
var RIVER_KEY = [
	["Payment",    "#8f8"],
	["OfferCreate","#88f"],
	["OfferCancel","#f88"],
	["TrustSet",   "#f8f"],
	[OTHER_LABEL,  "#ff8"]
];
var riverLabels = RIVER_KEY.map(function(x){return x[0]});
var XRP_SCALAR = 1000000*100; // i.e. 100 XRP is equivalent to 
	// 1 of any other currency unit.
var KEY_RADIUS = 15;

function drawDottedCircle(container, radius, cx, cy, coloring, cssClass) {
	var attributes = {
		class:cssClass, r:radius, opacity:0.5,
		fill:coloring,  cx:cx,    cy:cy
	};
	var c1 = container.append("circle").attr(attributes);
	attributes.r = 1;
	attributes.opacity = 1;
	var c2 = container.append("circle").attr(attributes);
	return [c1, c2];
}

// Create the key
for (var i=0; i<RIVER_KEY.length; i++) {
	var keyItem = RIVER_KEY[i];
	var label = keyItem[0];
	var color = keyItem[1];
	var ss = d3.select("#riverkey").append("span");
	var svg = ss.append("svg").attr({
		style: "vertical-align:middle",
		height: KEY_RADIUS*2,
		width:  KEY_RADIUS*2
	});
	drawDottedCircle(svg, KEY_RADIUS, KEY_RADIUS, KEY_RADIUS, color);
	ss.append("span").attr("class","keylabel").text(label);
	ss.append("br");

}

// Create the river itself
function River(container) {
	var r = {};
	var LABEL_STAGGER = 15;
	var LANE_WIDTH = 30;
  
  var isActive = true;
	
	function disappearOnCompletion(jElement) {
		jElement.bind("animationend webkitAnimationEnd oAnimationEnd MSAnimationEnd", function(){ $(this).remove(); });
	}
  
  r.deactivate = function() {
    isActive = false;
  }
  
	r.addCircle = function(laneNumber, color, radius) {
    if (isActive) {
      var cy = (LANE_WIDTH/2) + (LANE_WIDTH+2) * (laneNumber+1);
      var tt = d3.select("#river");
      var xPosition = $(container[0]).width()
      var circles = drawDottedCircle(tt, radius, xPosition, cy, color, "drifting");
      disappearOnCompletion($(circles[0][0]));
      disappearOnCompletion($(circles[1][0]));
    }
	};
	
	var lastInsertedLineAt, textY = LABEL_STAGGER;
	r.addLine = function(labelText, hash){//color) {
    if (isActive) {
      var color = colorFromHash(hash);
      var le = container.append("g").attr("class","drifting");
      var now = new Date();
      if (now - lastInsertedLineAt < 1000 ) {
        textY += LABEL_STAGGER;
      } else {
        lastInsertedLineAt = now;
        textY = LABEL_STAGGER;
      }
      var xPosition = $(container[0]).width();
      le.append("text").attr({
        x:xPosition+2,
        y:textY,
        fill:color,
        "font-size":"10pt",
        "class":"ledgernumber",
        hash:hash
      }).text(labelText);
      le.append("line").attr({
        x1:xPosition,
        x2:xPosition,
        y1:0,
        y2:400,
        stroke:"#888"
      });
      disappearOnCompletion($(le[0]));
    }
	};
	
	return r;
}
var river = new River(d3.select("#river"));




// Queueing and displaying events

function isLedger(item) {
	return item.type === "ledgerClosed";
}

function isTransaction(item) {
	return item.type === "transaction";
}

function displayItem(item, duration) {
  $(".loader").hide();
	switch(item.type) {
		case "transaction":
			displayTransaction(item.transaction);
			break;
		case "ledgerClosed":
			displayLedger(item, duration);
			break;
		case "flashEvent":
			displayFlash(item);
			break;
		default:
			console.log("Unknown event type:", item.type, item);
	}
}

function displayTransaction(tx) {
	var index = riverLabels.indexOf(tx.TransactionType);
	if (index < 0) {
		index = riverLabels.length-1;
	}
	river.addCircle(index,RIVER_KEY[index][1],computeSize(tx));
}
function computeSize(tx){
	switch (tx.TransactionType) {
		case "Payment":
			return 20+Math.log(1+Math.abs(extractValue(tx.Amount)));
		case "OfferCreate":
			var tg = extractValue(tx.TakerGets);
			var tp = extractValue(tx.TakerPays);
			return size = 10+Math.log(1+Math.max(tg,tp));
		case "OfferCancel":
			return KEY_RADIUS;
		case "TrustSet":
			return 10+Math.log(1+extractValue(tx.LimitAmount));
		default:
			return KEY_RADIUS;
	}
}
function extractValue(amount) {
	return amount.value || parseInt(amount,10)/XRP_SCALAR;
}

function displayLedger(ledger, duration) {
	if (duration && barchart) {
		$("#lastcloseinterval").text((duration/1000).toFixed(3));
		barchart.addPoint(duration);
	}
	//var color = colorFromHash(ledger.ledger_hash); //This might be confusing?
	river.addLine(commas(ledger.ledger_index), ledger.ledger_hash);
}
function commas(number) {
	var parts = number.toString().split(".");
	parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
	return parts.join(".");
}

function displayFlash(flash) {
	worldMap.flashCircle(flash.address, flash.hash, colorFromHash);
}
function colorFromHash(hash) {
	var red =   parseInt(hash.substring(0,2),16);
	var green = parseInt(hash.substring(2,4),16);
	var blue =  parseInt(hash.substring(4,6),16);
  
  var scale, result;
  if ($("body").hasClass("dark")) {
    scale = Math.max(red,green,blue)/255;
    var scaledHex = function(x) {
      var s = Math.round(x/scale).toString(16)
      return s.length===1 ? "0"+s : s;
    }
    result = "#"+scaledHex(red)+scaledHex(green)+scaledHex(blue);
  } else {
    var cyan = 255-red, magenta = 255-green, yellow = 255-blue;
    scale = Math.max(cyan,magenta,yellow)/255;
    var inverseScaledHex = function(x) {
      var s = (255 - Math.round(x/scale)).toString(16);
      return s.length===1 ? "0"+s : s;
    }
    result = "#"+inverseScaledHex(cyan)+inverseScaledHex(magenta)+inverseScaledHex(yellow);
  }
  //console.log("COLOR!", result);
	return result;
}

var metaQueue = new MetaQueue(isLedger, isTransaction, displayItem);


//Using the network monitor server:
var socket = io(RIPPLED_PROXY_URL);
socket.on('transaction', function(x){
	metaQueue.enqueue(x);
});
socket.on('ledger_closed', function(x){
	var lastEnqueuedLedger = metaQueue.getLastEnqueuedEnder();
	if (!lastEnqueuedLedger || x.ledger_index > lastEnqueuedLedger.ledger_index) {
		if (!x.type) {
			x.type = "ledgerClosed";
		}
		metaQueue.enqueue(x);
	}
});
socket.on('peer_ledger', function(x){
	x = JSON.parse(x);
	worldMap.addIpAddress(x.ip);
	metaQueue.enqueue({
		type: "flashEvent",
		address: x.ip,
		hash: x.ledger_hash
	})
});


// Querying ripplecharts
function entrySum(entry) {
	var sum = 0;
	for (var key in entry) {
		if (entry.hasOwnProperty(key) && key !== "time") {
			sum += entry[key];
		}
	}
	return sum;
}
function removeLastEntry(array) {
	// since the last entry is for the incomplete period in progress
	return array.slice(0,array.length-1);
}
function getRippleChartsData() {
	var now = new Date();
	var yesterday = new Date(now - 86400000 - 2000);
	
	var nowString = now.toUTCString();
	var yesterdayString = yesterday.toUTCString()
	
	// Number of transactions in the last 24 hours
	$.post(RIPPLECHARTS_API_URL+"/transaction_stats", {
		startTime     : yesterdayString,
		endTime       : nowString,
		timeIncrement : "hour",
		format        : "json"
	}, function(response){
		var results = removeLastEntry(response.results);
		var total = results.map(entrySum).reduce(function(a,b){return a+b});
		$("#lastdaytransactions").text(commas(total));
	});
	
	// Number of ledgers in the last 24 hours
	$.post(RIPPLECHARTS_API_URL+"/ledgers_closed", {
		startTime     : yesterdayString,
		endTime       : nowString,
		timeIncrement : "hour",
		format        : "json"
	}, function(response){
		var total = response.results.slice(0,24).map(function(x){return x.count}).reduce(function(a,b){return a+b});
		var average = 86400/total;
		$("#averagecloseinterval").text(average.toFixed(3));
    if (!barchart) {
      barchart = new Barchart(d3.select("#barchart"),
        average*1000,	//baseline
        800,			//deviance
        50,				//height
        4				//barWidth
      );
    }
	});
}

var rippleChartsDataGetter = setInterval(getRippleChartsData, 60*1000); //Every 60 seconds
getRippleChartsData();

// Get peer data from Rippled proxy
function getPeerInfo() {
	$.get(RIPPLED_PROXY_URL + "/info", function(result){
		var data = JSON.parse(result);
		$("#numberofpeers").text(data.length);
		var latestVersion = "";
		var prefix = "Ripple-";
		if (data.length) {
			latestVersion = prefix + data
				.filter(function(x){return x.rippled_version})
				.map(function(x){return x.rippled_version.slice(prefix.length)})
				.reduce(function(a,b){return semver.gt(a,b) ? a : b});
		}
		$("#rippledversion").text(latestVersion);
	});
}
getPeerInfo();

// Get stats from Mixpanel proxy
function getPathfindStats() {
	$.get(MIXPANEL_PROXY_URL, function(result){
		var data = JSON.parse(result);	
		var averageSpeed = data.pathfind_average_time;
		var percentSuccessful = data.pathfind_successes / data.pathfind_count * 100;
		var transactionTime = data.transaction_average_time;
		$("#pathfindingspeed").text(averageSpeed.toFixed(3));
		$("#successfulpathfindpercent").text(percentSuccessful.toFixed(1));
		$("#transactiontime").text(transactionTime.toFixed(3));
		drawPercentagePie(d3.select("#successpie"), [
			[100 - percentSuccessful+0.001, "#a63"],
			[percentSuccessful-0.001,       "#684"]
		]);
	});
}
var pathfindStatsGetter = setInterval(getPathfindStats, 30*60*1000); //Every 30 minutes
getPathfindStats();

function drawPercentagePie(container, data) {
  container.selectAll("path, circle").remove();
	var je = $(container[0]);
	var diameter = Math.min(je.width(), je.height());
	var radius = diameter / 2;
	var center = [radius, radius];
	function string(coords) {
		return " "+coords[0]+","+coords[1]+" ";
	}
	function rotateClockwise(point, turns) {
		var x = point[0] - radius;
		var y = point[1] - radius;
		var TAU = 2*Math.PI;
		var angle = turns * TAU;
		var sine = Math.sin(angle);
		var cosine = Math.cos(angle);
		var x2 = x*cosine - y*sine;
		var y2 = x*sine + y*cosine;
		return [x2+radius, y2+radius];
	}
	var pointA = [radius,0], pointB;
	function drawSector(turns, color) {
		pointB = rotateClockwise(pointA, turns);
		container.append("path").attr("d",
			"M"+string(center)+
			"L"+string(pointA)+
			"A 25,25 0,"+(turns>0.5?"1":"0")+",1"+
			string(pointB)+"Z"
		).style({stroke:"none",fill:color});
		pointA = pointB;
	}
	for (var i=0; i<data.length; i++) {
		var entry = data[i];
		drawSector(entry[0]/100, entry[1]);
	}
	container.append("circle").attr({
		cx: radius,
		cy: radius,
		r: radius / 3,
    "class": "hole"
	}).style({
    stroke: "none",
    fill: ($("body").hasClass("dark") ? "black" : "white")
  });
}





// External interface
return {
  changeTheme: function() {
    function refreshColor(selection, attributeName) {
      return selection.attr(attributeName, function(){
        var hash = $(this).attr("hash");
        if (hash) {
          return colorFromHash($(this).attr("hash"));
        } else {
          return "none";
        }
      });
    }
    refreshColor(d3.selectAll(".servercircle,.serverlink"), "stroke");
    refreshColor(d3.selectAll(".ledgernumber"), "fill");
    d3.selectAll(".hole").style("fill", $("body").hasClass("dark") ? "black" : "white");
  },
  
  stop: function() {
    socket.io.disconnect();
    river.deactivate();
    metaQueue.clear();
    clearInterval(pathfindStatsGetter);
    clearInterval(rippleChartsDataGetter);
    d3.selectAll(".drifting").remove();
  },
  
  start: function() {
    socket.io.connect();
  }
};





};