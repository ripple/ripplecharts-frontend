var TotalHistory = function (options) {

	var self        = this;
	var apiHandler  = new ApiHandler(options.url);
	var request, basisRequest;

	//Initial parameters
	var n = 15;
	var inc = 'day';
	var metric = "topMarkets";
	//var metric = "totalValueSent";

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

	//chart data
	function getData(callback) {
		combos = {};

		//data points
		var dataSet1 = []; //first graph y-axis line points
		var dateData1 = []; //first graph x-axis line points

		//chart data
		var lineChartData = {
			labels : dateData1,
			datasets : []
		};

		var end = moment().subtract(n, inc).format('YYYY-MM-DD');
		var start = moment().format("YYYY-MM-DD");

		combos.total = Array.apply(null, new Array(n)).map(Number.prototype.valueOf,0);

		basisRequest = apiHandler.historicalMetrics(metric, start, end, inc ,function(err, data) {
			if (err) {console.log(err);}
			else{
				var resultsArray = data;
					
				//console.log(resultsArray);

				jQuery.each(resultsArray, function(i, value) {
				
						var startTime = value.startTime.split('T');
						var startTimeSplit = startTime[0];
						dateData1.push(startTimeSplit);	
					
						var key;

					jQuery.each (value.components, function(j, component) {

						if (metric === "totalValueSent"){
							key = component.currency + '-' + component.issuer;
						}
						else if (metric === "topMarkets"){
							key = component.base.currency + '-' + component.base.issuer;
						} 
					
						if(combos.hasOwnProperty(key)){
							combos[key][i] += component.convertedAmount;
						}
						else{
							combos[key] = Array.apply(null, new Array(n)).map(Number.prototype.valueOf,0);
						}

						combos.total[i] += component.convertedAmount;
					
					});
			
				});
				console.log(combos);
				var cc = 0;
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
		console.log("done:", lineChartData);
	}


	//chart settings
	function draw(chartData) {
		var ctx = document.getElementById("canvas").getContext("2d");
		ctx.canvas.width  = window.innerWidth - 200;
	  	ctx.canvas.height = window.innerHeight -200;
		
		window.myLine = new Chart(ctx).Line(chartData, {
				responsive: true,
				scaleShowGridLines : false,
				bezierCurveTension : 0.2,
				pointDotRadius : 1,
				animationSteps: 100,
				multiTooltipTemplate: "<%= datasetLabel %> - <%= value %>",
				tooltipFillColor: "rgba(0,0,0,1.0)",
				tooltipFontSize: 18,
				tooltipYPadding: 20,
				scaleOverride: true,
				scaleSteps: 10,
				scaleStepWidth: 70000,
				scaleStartValue: 0,
				tooltipXPadding: 20,
				showTooltips: false,
				legendTemplate : '<ul class="legend">'
							  +'<% for (var i=0; i<datasets.length; i++) { %>'
								+'<a href="#"><li class="<%= datasets[i].label %>">'
								+'<span style=\"background-color:<%=datasets[i].fillColor%>\">'
								+'<% if (datasets[i].label) { %><%= datasets[i].label %><% } %></span>'
							  +'</li></a>'
							+'<% } %>'
						  +'</ul>'		
		});

		//add a legend
		//var legend = myLine.generateLegend();
		//$('#lineLegend').html(legend);

		console.log(myLine);

	}
	
	getData(draw);

	$('.interval').on('click', '.days',  function(e) {
		e.preventDefault();
		if (inc === 'month'){
			jQuery('.days').css("fontWeight", "bold");
			jQuery('.months').css("fontWeight", "normal");
			inc = 'day';
			console.log(inc);
		}
	});

	$('.interval').on('click', '.months',  function(e) {
		e.preventDefault();
		if (inc === 'day'){
			jQuery('.days').css("fontWeight", "normal");
			jQuery('.months').css("fontWeight", "bold");
			inc = 'month';
			console.log(inc);
		}
	});


	$('.interval').on('click', '.go',  function(e) {
		e.preventDefault();
		val = jQuery('.submit').val()
		n = parseInt(val, 10);
		getData(draw);
	});

	
}