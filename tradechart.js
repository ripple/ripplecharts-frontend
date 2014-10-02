//dynamic timestamps using moment.js
var pastDate = moment().subtract(21, 'days').format('YYYY-MM-DD');
var currDate = moment().format("YYYY-MM-DD");


//data points
var dataSet1 = []; //first graph y-axis line points
var dateData1 = []; //first graph x-axis line points

var xrp_usd = [];
var btc = [];
var cny = [];
var jpy = [];
var totalCurr = [];


//chart data
var lineChartData = {
	labels : dateData1,
	datasets : [
		{
			label: "XRP Trade Volume",
			fillColor : "rgba(97,106,124,0.8)",
			strokeColor : "rgba(220,220,220,.5)",
			pointColor : "rgba(220,220,220,1)",
			pointStrokeColor : "#fff",
			pointHighlightFill : "#fff",
			pointHighlightStroke : "rgba(220,220,220,1)",
			data: xrp_usd
		},
		{
			label: "BTC Trade Volume",
			fillColor : "rgba(52,106,169,0.8)",
			strokeColor : "rgba(220,220,220,.5)",
			pointColor : "rgba(220,220,220,1)",
			pointStrokeColor : "#fff",
			pointHighlightFill : "#fff",
			pointHighlightStroke : "rgba(220,220,220,1)",
			data: btc
		},
		{
			label: "CNY Trade Volume",
			fillColor : "rgba(9,106,124,0.8)",
			strokeColor : "rgba(220,220,220,.5)",
			pointColor : "rgba(220,220,220,1)",
			pointStrokeColor : "#fff",
			pointHighlightFill : "#fff",
			pointHighlightStroke : "rgba(220,220,220,1)",
			data: cny
		},
		{
			label: "JPY Trade Volume",
			fillColor : "rgba(147,230,145,0.4)",
			strokeColor : "rgba(220,220,220,.5)",
			pointColor : "rgba(220,220,220,1)",
			pointStrokeColor : "#fff",
			pointHighlightFill : "#fff",
			pointHighlightStroke : "rgba(220,220,220,1)",
			data: jpy
		},
		// {
// 			label: "Total Trade Volume",
// 			fillColor : "rgba(12,161,114,0.1)",
// 			strokeColor : "rgba(220,220,220,.5)",
// 			pointColor : "rgba(220,220,220,1)",
// 			pointStrokeColor : "#fff",
// 			pointHighlightFill : "#fff",
// 			pointHighlightStroke : "rgba(220,220,220,1)",
// 			data: totalCurr
// 		}
	]

};


//chart data
function getData(callback) { 
	jQuery.ajax({
	type: "POST",
	url: 'https://api.ripplecharts.com/api/historicalMetrics',
	data:{
	exchange : {"currency": "USD", "issuer" : "rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B"}, 
	startTime : currDate,
	endTime   : pastDate,
	timeIncrement : "day",
	metric : "topMarkets"

	},
	success: function(data) {
	
		var resultsArray = data;
	
		console.log(data);
	
		jQuery.each(resultsArray, function(i, value) {
		
				var startTime = value.startTime.split('T');
				var startTimeSplit = startTime[0];
				//console.log(startTimeSplit);
				dateData1.push(startTimeSplit);	
			
				var usdTotal = 0;
				var btcTotal = 0;
				var cnyTotal = 0;
				var jpyTotal = 0;
				var totalTotal = 0;
	
			jQuery.each (value.components, function(i, component) {
		
				var key = component.base.currency + '-' + component.counter.currency; 
			
				if (key === 'USD-XRP' ) {usdTotal += component.convertedAmount};
				if (key === 'BTC-XRP' ) {btcTotal += component.convertedAmount};
				if (key === 'CNY-XRP' ) {cnyTotal += component.convertedAmount};
				if (key === 'JPY-XRP' ) {jpyTotal += component.convertedAmount};
				totalTotal += component.convertedAmount;
			
			});
			
				xrp_usd.push(usdTotal);	
				btc.push(btcTotal);
				cny.push(cnyTotal);
				jpy.push(jpyTotal);
				totalCurr.push(totalTotal);
				jQuery('#lineLegend').css("display","block");
				jQuery('.xrp_label').css("display","block");
				jQuery('.loader_wrapper').remove();
	
		});
						
				callback(lineChartData);
	},
	dataType: 'json'
	});
}


//chart settings
function draw(chartData) {
	var ctx = document.getElementById("canvas").getContext("2d");
	
	window.myLine = new Chart(ctx).Line(chartData, {
		responsive: true,
		scaleShowGridLines : false,
		pointDotRadius : 1,
		animationSteps: 100,
		multiTooltipTemplate: "<%= datasetLabel %> - <%= value %>",
		tooltipFillColor: "rgba(0,0,0,1.0)",
		tooltipFontSize: 18,
		tooltipYPadding: 20,
		tooltipXPadding: 20,
		showTooltips: false,
		legendTemplate : '<ul>'
					  +'<% for (var i=0; i<datasets.length; i++) { %>'
						+'<li>'
						+'<span style=\"background-color:<%=datasets[i].fillColor%>\">'
						+'<% if (datasets[i].label) { %><%= datasets[i].label %><% } %></span>'
					  +'</li>'
					+'<% } %>'
				  +'</ul>'	
		
	});
	
	//add a legend
	 var legend = myLine.generateLegend();
	 $('#lineLegend').html(legend);
}

window.onload = function(){
	getData(draw);
}


//trader boxes data
jQuery.fn.digits = function(){ 
    return this.each(function(){ 
        jQuery(this).text( jQuery(this).text().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,") ); 
    })
}

jQuery.ajax({
  type: "POST",
  url: 'https://api.ripplecharts.com/api/total_network_value',
  data:{
    exchange  : {
        currency  : "USD",         
        issuer    : "rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B"
    }
},
  success: function(data) {
  		jQuery('#total_value').html('$' + parseInt(data.total)).digits();
  		//console.log(data);
  },
  dataType: 'json'
});

jQuery.ajax({
  type: "POST",
  url: 'https://api.ripplecharts.com/api/top_markets',
  data:{
    exchange  : {
        currency  : "USD",         
        issuer    : "rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B"
    }
},
  success: function(data) {
  		jQuery('#trade_volume').html('$' + parseInt(data.total)).digits();
  		//console.log(data);
  },
  dataType: 'json'
});

jQuery.ajax({
  type: "POST",
  url: 'https://api.ripplecharts.com/api/total_value_sent',
  data:{
    exchange  : {
        currency  : "USD",         
        issuer    : "rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B"
    }
},
  success: function(data) {
  		jQuery('#transaction_volume').html('$' + parseInt(data.total)).digits();
  		//console.log(data);
  },
  dataType: 'json'
});


//trade box descriptions
jQuery('.trader_box_wrapper').hover(function() {
    jQuery(this).find('.trader_description').slideDown(250);
    jQuery(this).css("background-color","rgba(229,229,229,0.2)");
    jQuery(this).find('.trader_box').css("color","#ccc");
    jQuery(this).find('.trader_box_title').css("color","#f9f9f9");
},

function() {
    jQuery(this).find('.trader_description').slideUp(150);
    jQuery(this).css("background-color","rgba(229,229,229,1.0)");
    jQuery(this).find('.trader_box').css("color","#000");
    jQuery(this).find('.trader_box_title').css("color","#999");
});