var TotalHistory = function (options) {

	var self        = this;
	var apiHandler  = new ApiHandler(options.url);
	var request, basisRequest;

	//Initial parameters
	var interval = 15;
	var inc = 'day';
	var metric = "topMarkets";
	//var metric = "totalValueSent";

	//Initial draw
	getData(draw, inc, interval, metric, 5);

	//Hard coded colors
	var colors = [
		"rgba(86,152,196,0.8)",
		"rgba(226,121,163,0.8)",
		"rgba(68,124,105,0.8)",
		"rgba(116,196,147,0.8)",
		"rgba(142,140,109,0.8)",
		"rgba(228,191,128,0.8)",
		"rgba(233,215,142,0.8)",
		"rgba(226,151,93,0.8)",
		"rgba(241,150,112,0.8)",
		"rgba(225,101,82,0.8)",
		"rgba(201,74,83,0.8)",
		"rgba(190,81,104,0.8)",
		"rgba(163,73,116,0.8)",
		"rgba(153,55,103,0.8)",
		"rgba(101,56,125,0.8)",
		"rgba(78,36,114,0.8)",
		"rgba(145,99,182,0.8)",
		"rgba(224,89,139,0.8)",
		"rgba(124,159,176,0.8)",
		"rgba(154,191,136,0.8)",
		"rgba(81,87,74,0.8)"
	];

	//Get chart data
	function getData(callback, inc, interval, metric) {
		combos = {};

		//data points
		var dataSet1 = []; //first graph y-axis line points
		var dateData1 = []; //first graph x-axis line points

		//chart data
		var lineChartData = {
			labels : dateData1,
			datasets : []
		};

		//Define start and end dates
		var end = moment().subtract(interval, inc).format('YYYY-MM-DD');
		var start = moment().format("YYYY-MM-DD");

		combos.total = Array.apply(null, new Array(interval)).map(Number.prototype.valueOf,0);

		//Api call for data
		basisRequest = apiHandler.historicalMetrics(metric, start, end, inc ,function(err, data) {
			//Err
			if (err) {console.log(err);}
			else{
				
				var resultsArray = data;
				
				//Loop through each increment
				jQuery.each(resultsArray, function(i, value) {
	
					var key;
					var startTime = value.startTime.split('T');
					var startTimeSplit = startTime[0];
					dateData1.push(startTimeSplit);

					//Loop through each component in each increment
					jQuery.each (value.components, function(j, component) {

						//Depending on which data, parse accordingly
						if (metric === "totalValueSent"){
							key = component.currency + '-' + component.issuer;
						}
						else if (metric === "topMarkets"){
							key = component.base.currency + '-' + component.base.issuer;
						} 
						//Check if currency-issuer combo exists
						//If it does add converted ammount to 'i'th entry
						if(combos.hasOwnProperty(key)){
							combos[key][i] += component.convertedAmount;
						}
						//If it doesnt, initialize array of size n and initial values of 0
						//Add converted ammount to 'i'th array
						else{
							combos[key] = Array.apply(null, new Array(interval)).map(Number.prototype.valueOf,0);
							combos[key][i] += component.convertedAmount;
						}
						//Add converted amount to total
						combos.total[i] += component.convertedAmount;
					
					});
			
				});

				console.log(combos);
				var cc = 0;
				//Create an object to be passed ot chart.js
				jQuery.each(combos, function( key, value ) {
					entry = {};
					entry.label = key;
					entry.fillColor = colors[cc];
					entry.strokeColor = "rgba(220,220,220,.5)";
					entry.pointColor = "rgba(220,220,220,1)";
					entry.pointStrokeColor = "#fff";
					entry.pointHighlightFill = "#fff";
					entry.pointHighlightStroke = "#fff";
					entry.data = value;
					lineChartData.datasets.push(entry);
					cc += 1;
					jQuery('.loader_wrapper').remove();
				});

				callback(lineChartData);
			}
		});
	}


	//Set chart settings
	function draw(chartData) {
		var ctx = jQuery("#canvas").get(0).getContext("2d");
		//Set size of canvas. FIX.
		ctx.canvas.width  = window.innerWidth - 200;
	  	ctx.canvas.height = window.innerHeight -200;
		
		var options = {
			responsive: true,
			scaleShowGridLines : false,
			pointDotRadius : 1,
			animationSteps: 100,
			multiTooltipTemplate: "<%= datasetLabel %> - <%= value %>",
			tooltipFillColor: "rgba(0,0,0,1.0)",
			tooltipFontSize: 18,
			tooltipYPadding: 20,
			tooltipXPadding: 20,
			showTooltips: false	
		}; 

		var myLine = new Chart(ctx).Line(chartData, options);

		console.log(myLine);
		myLine.update();

		//add a legend
		//var legend = myLine.generateLegend();
		//$('#lineLegend').html(legend);

	}

	//Restrict to integers
	jQuery('.submit').keyup(function () { 
    	this.value = this.value.replace(/[^0-9\.]/g,'');
	});

	//Switch interval to days
	$('.interval').on('click', '.days',  function(e) {
		e.preventDefault();
		if (inc === 'month'){
			jQuery('.days').css("fontWeight", "bold");
			jQuery('.days').css("border-bottom", "3px solid");
			jQuery('.days').css("color", "#3369a8");
			jQuery('.months').css("fontWeight", "normal");
			jQuery('.months').css("border-bottom", "0px solid");
			jQuery('.months').css("color", "black");
			inc = 'day';
		}
	});

	//Switch interval to months
	$('.interval').on('click', '.months',  function(e) {
		e.preventDefault();
		if (inc === 'day'){
			jQuery('.days').css("fontWeight", "normal");
			jQuery('.days').css("border-bottom", "0px solid");
			jQuery('.days').css("color", "black");
			jQuery('.months').css("fontWeight", "bold");
			jQuery('.months').css("border-bottom", "3px solid");
			jQuery('.months').css("color", "#3369a8");
			inc = 'month';
		}
	});

	//Reload
	$('.interval').on('click', '.go',  function(e) {
		e.preventDefault();
		val = jQuery('.submit').val()
		interval = parseInt(val, 10);
		getData(draw, inc, interval, metric);
	});

	
}