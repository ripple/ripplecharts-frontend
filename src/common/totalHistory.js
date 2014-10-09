var TotalHistory = function (options) {

	var self        = this;
	var apiHandler  = new ApiHandler(options.url);
	var request, basisRequest;

	//Initial parameters
	var inc = 'day';
	var metric = "topMarkets";
	//var metric = "totalValueSent";
	//Define start and end dates
	var end = moment().subtract(15, inc).format('YYYY-MM-DD');
	var start = moment().format("YYYY-MM-DD");


	//Initial draw
	getData(draw, inc, start, end, metric);

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
	function getData(callback, inc, start, end, metric) {
		pairs = {};

		interval = diff(inc, start, end);
		console.log(interval);

		//data points
		var dataSet1 = []; //first graph y-axis line points
		var dateData1 = []; //first graph x-axis line points

		//chart data
		var lineChartData = {
			labels : dateData1,
			datasets : []
		};

		pairs.total = Array.apply(null, new Array(interval)).map(Number.prototype.valueOf,0);

		//Api call for data
		basisRequest = apiHandler.historicalMetrics(metric, start, end, inc ,function(err, data) {
			//Err
			if (err) {console.log(err);}
			else{
				var resultsArray = data;
				//Loop through each increment
				$.each(resultsArray, function(i, value) {
	
					var key;
					var startTime = value.startTime.split('T');
					var startTimeSplit = startTime[0];
					dateData1.push(startTimeSplit);

					//Loop through each component in each increment
					$.each (value.components, function(j, component) {

						//Depending on which data, parse accordingly
						if (metric === "totalValueSent"){
							key = component.currency + '-' + component.issuer;
						}
						else if (metric === "topMarkets"){
							key = component.base.currency + '-' + component.base.issuer;
						} 
						//Check if currency-issuer combo exists
						//If it does add converted ammount to 'i'th entry
						if(pairs.hasOwnProperty(key)){
							pairs[key][i] += component.convertedAmount;
						}
						//If it doesnt, initialize array of size n and initial values of 0
						//Add converted ammount to 'i'th array
						else{
							pairs[key] = Array.apply(null, new Array(interval)).map(Number.prototype.valueOf,0);
							pairs[key][i] += component.convertedAmount;
						}
						//Add converted amount to total
						pairs.total[i] += component.convertedAmount;
					
					});
			
				});
				var cc = 0;
				//Create an object to be passed ot chart.js
				$.each(pairs, function( key, value ) {
					entry = {
						label : key,
						fillColor : colors[cc],
						strokeColor : "rgba(220,220,220,.5)",
						pointColor : "rgba(220,220,220,1)",
						pointStrokeColor : "#fff",
						pointHighlightFill : "#fff",
						pointHighlightStroke : "#fff",
						data : value
					};
					lineChartData.datasets.push(entry);
					cc += 1;
					$('.loader_wrapper').remove();
				});
				callback(lineChartData);
			}
		});
	}


	//Set chart settings
	function draw(chartData) {
		var ctx = $("#canvas").get(0).getContext("2d");
		var options = {
			responsive: true,
			scaleShowGridLines : false,
			pointDotRadius : 1,
			animationSteps: 1,
			legendTemplate : '<ul class="legend">'
							  +'<% for (var i=0; i<datasets.length; i++) { %>'
								+'<span class="label" id="<%= datasets[i].label %>" style=\"background-color:<%=datasets[i].fillColor%>\">'
								+'<% if (datasets[i].label) { %><%= datasets[i].label.substring(0, 3) %><% } %></span>'
							  +'</li></a>'
							+'<% } %>'
						  +'</ul>'	
		};
		//add a legen
		window.myLine = new Chart(ctx).Line(chartData, options);
		var legend = myLine.generateLegend();
		$('#lineLegend').html(legend); 
	}

	$('#lineLegend').on('click', '.label',  function(e) {
		e.preventDefault();
		var id = $(this).attr('id');
		$.each( myLine.datasets, function( index, value ){
			value.fillColor = colors[index];
			if (value.label !== id){
				value.fillColor = "rgba(0,0,0,0)";
			}
		});
		myLine.update();
	});

	//Switch interval to days
	$('.interval').on('click', '.days',  function(e) {
		e.preventDefault();
		if (inc === 'month'){
			$('.days').css("fontWeight", "bold");
			$('.days').css("border-bottom", "3px solid");
			$('.days').css("color", "#3369a8");
			$('.months').css("fontWeight", "normal");
			$('.months').css("border-bottom", "0px solid");
			$('.months').css("color", "black");
			inc = 'day';
			myLine.destroy();
			getData(draw, inc, start, end, metric);
		}
	});

	//Switch interval to months
	$('.interval').on('click', '.months',  function(e) {
		e.preventDefault();
		if (inc === 'day'){
			$('.days').css("fontWeight", "normal");
			$('.days').css("border-bottom", "0px solid");
			$('.days').css("color", "black");
			$('.months').css("fontWeight", "bold");
			$('.months').css("border-bottom", "3px solid");
			$('.months').css("color", "#3369a8");
			inc = 'month';
			myLine.destroy();
			getData(draw, inc, start, end, metric);
		}
	});

	$('.options').on("change", "#chart_type", function(e){
		e.preventDefault();
		myLine.destroy();
		type = $('#chart_type').val();
		metric = type;
		getData(draw, inc, start, end, metric);
	});

	$( "#datepicker_to" ).datepicker({
		maxDate: "+0d",
		setDate: "1/1/2012",
		onSelect: function(dateText) {
			var limit;
			start = moment(dateText).format("YYYY-MM-DD");
			if (inc === "month"){
				limit = moment(dateText);
				limit.subtract(2, 'months');
			}
			else if (inc === "day"){
				limit = moment(dateText);
				limit.add(1, 'd');
			}
			f_limit = moment(limit).format("MM/DD/YYYY");
			console.log('limit', f_limit);
			$( "#datepicker_from" ).datepicker( "option", "maxDate", f_limit );
			myLine.destroy();
			console.log(start);
			getData(draw, inc, start, end, metric);
		}
	});

	$( "#datepicker_from" ).datepicker({
		maxDate: "+0d",
		setDate: "1/1/2012",
		onSelect: function(dateText) {
			var limit;
			end = moment(dateText).format("YYYY-MM-DD");
			if (inc === "month"){
				limit = moment(dateText);
				limit.add(2, 'months');
			}
			else if (inc === "day"){
				limit = moment(dateText);
				limit.add(1, 'd');
			}
			f_limit = moment(limit).format("MM/DD/YYYY");
			console.log('limit', f_limit);
			$( "#datepicker_to" ).datepicker( "option", "minDate", f_limit );
			myLine.destroy();
			console.log(end);
			getData(draw, inc, start, end, metric);
		}
	});

	function diff(inc, start, end){
		var date1 = moment(start);
		var date2 = moment(end);
		if (inc === "day"){
			unit = "days";
		}
		else if (inc === "month"){
			unit = "months";
		}
		difference = date1.diff(date2, unit);
		return difference;
	}
}