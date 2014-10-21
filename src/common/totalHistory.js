var TotalHistory = function (options) {
	var self        = this;
	var apiHandler  = new ApiHandler(options.url);
	var request, basisRequest, ts, cp, filter;

	var ctx = $("#canvas").get(0).getContext("2d");
	var chart_options = {
		responsive: true,
		scaleShowGridLines : false,
		pointDotRadius : 1,
		animationSteps: 1,
		bezierCurve : true,
		legendTemplate :'<div class="legend">'
							+'<% for (var i=0; i<datasets.length; i++) { %>'
								+'<div class="label" id="<%= datasets[i].label %>" style="color:<%=datasets[i].fillColor%>">'
									+'<div class="gateway">'
										+'<%= datasets[i].label.split("-")[0] %>'
										+ '<% if (datasets[i].label.split("-")[2]) { %> - <%= datasets[i].label.split("-")[2] %><% } %>'
									+'</div>'
									+'<div class="issuer">'
										+ '<% if (datasets[i].label.split("-")[1]) { %><%= datasets[i].label.split("-")[1] %><% } %>'
									+'</div>'
								+'</div>'
							+'<% } %>'
						+'</div>'	
	};

	var colors = [
		"rgba(226,121,163,0.8)",
		"rgba(86,152,196,0.8)",
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

	//Initial parameters
	var inc = 'day';
	var end = moment().subtract(16, inc).format('YYYY-MM-DD');
	var min = moment().subtract(14, inc).format("MM/DD/YYYY");
	var start = moment().format("YYYY-MM-DD");
	$('#datepicker_to').val(moment(start).format("MM/DD/YYYY"));
	$('#datepicker_from').val(moment(end).format("MM/DD/YYYY"));

	//Initial draw
	getData(inc, start, end);

	function getData(inc, start, end) {
		//preprocessed data
		var pp_data = {};
		pp_data.traded = {};
		pp_data.sent = {};

		//Currencies and pairs objects
		pp_data.traded.currencies = {};
		pp_data.traded.pairs = {};
		pp_data.sent.currencies = {};
		pp_data.sent.pairs = {};

		interval = diff(inc, start, end);

		//Totals
		pp_data.traded.total = Array.apply(null, new Array(interval)).map(Number.prototype.valueOf,0);
		pp_data.sent.total = Array.apply(null, new Array(interval)).map(Number.prototype.valueOf,0);

		//Api call for data
		basisRequest = apiHandler.historicalMetrics('topMarkets', start, end, inc ,function(err, data) {
			//Err
			if (err) {console.log("Error:", err);}
			else{
				pp_data.traded = process_data('topMarkets', pp_data.traded, data);
				draw(pp_data);
			}
		});

		basisRequest = apiHandler.historicalMetrics('totalValueSent', start, end, inc ,function(err, data) {
			//Err
			if (err) {console.log("Error:", err);}
			else{
				pp_data.sent = process_data('totalValueSent', pp_data.sent, data);
				draw(pp_data);
			}
		});
	}

	function process_data(metric, object, data){
		object.done = false;
		console.log(">", interval);
		//data points
		object.dateData = []; //first graph x-axis line points
		var resultsArray = data;

		$.each(resultsArray, function(i, value) {
			var startTime = value.startTime.split('T')[0];
			object.dateData.push(startTime);
			object.total[i] += value.total;
			console.log(value);

			//Loop through each component in each increment
			$.each (value.components, function(j, component) {
				var base_curr, issuer, key;

				if (metric === "totalValueSent"){
					base_curr = component.currency;
					issuer = component.issuer;
					if (issuer !== undefined){
						key = base_curr + '-' + issuer;
					}
					else{
						key = base_curr;
					}
				}
				else if (metric === "topMarkets"){
					base_curr = component.base.currency;
					issuer = component.base.issuer;
					var counter_curr = component.counter.currency;
					key = base_curr + '-' + issuer + '-' + counter_curr;

					if(!(object.currencies.hasOwnProperty(counter_curr))){
						object.currencies[counter_curr] = Array.apply(null, new Array(interval)).map(Number.prototype.valueOf,0);
					}
					object.currencies[counter_curr][i] += component.convertedAmount;
				}

				if(!(object.currencies.hasOwnProperty(base_curr))){
					object.currencies[base_curr] = Array.apply(null, new Array(interval)).map(Number.prototype.valueOf,0);
				}
				if(!(object.pairs.hasOwnProperty(key))){
					object.pairs[key] = Array.apply(null, new Array(interval)).map(Number.prototype.valueOf,0);
				}
				object.currencies[base_curr][i] += component.convertedAmount;
				object.pairs[key][i] += component.convertedAmount;
			});
	
		});
		object.done = true;
		return object;
	}

	function diff(inc, start, end){
		var date1, date2, sow1, sow2;
		date1 = moment(start);
		date2 = moment(end);
		difference = date1.diff(date2, inc, true);
		if (inc === "week"){
			sow1 = moment(start).startOf('week');
			sow2 = moment(end).startOf('week');
			sow1 = moment(sow1._d).format("MM/DD/YYYY");
			sow2 = moment(sow2._d).format("MM/DD/YYYY");
			date1 = moment(date1).format("MM/DD/YYYY");
			date2 = moment(date2).format("MM/DD/YYYY");
			if(sow1 !== date1 && sow2 !== date2){
				difference += 1;
				console.log("adding");
			}
		}
		return Math.ceil(difference);
	}

	function draw(data){
		//Initial draw
		//Only draw if both traded and sent data is present
		if (data.sent.done === true && data.traded.done === true){
			console.log("Data:", data);
			labels = data.sent.dateData;
			data.totals = {};
			data.totals.traded = data.traded.total;
			data.totals.sent = data.sent.total;
			delete data.sent.total;
			delete data.traded.total;
			var lcd = chartify(data.totals, labels, "");
			window.myLine = new Chart(ctx).Line(lcd, chart_options);
			var legend = myLine.generateLegend();
			$('#lineLegend').html(legend);
			var last = $('.crumb').last()[0];
			if ($(last).attr('id') !== "total"){
				go_to(last, data, labels);
			}
		}

		//On click of label, go one level down and make breadcrumb
		$('#lineLegend').off('click', '.label').on('click', '.label',  function(e) {
			if ($(".legend > div").length > 1){
				e.preventDefault();
				var id = $(this).attr('id');
				var filter = "";
				if (id === "sent" || id === "traded"){
					ts = id;
					cp = 'currencies';
					new_lcd = chartify(data[id].currencies, labels, filter);
				}
				else{
					cp = 'pairs';
					filter = id;
					new_lcd = chartify(data[ts].pairs, labels, filter);
				}
				//Add breadcrumb with data needed to reach that point again
				$('.crumbs').append('<li class="crumb" id="'+id+'">'+id+'</li>');
				$('#'+id).data({ts: ts, cp: cp, filter: filter});
				update_chart(myLine, new_lcd);
			}
		});

		//Get back to point indicated by breadcrumb
		$('#breadcrumb').off('click', '.crumb').on('click', '.crumb', function(e){
			e.preventDefault();
			go_to(this, data, labels);
		});
	}

	function go_to(breadcrumb, data, lables){
		id = $(breadcrumb).attr('id');
		var new_lcd;
		$(breadcrumb).nextAll('li').remove();
		if ( id === 'totals'){
			new_lcd = chartify(data.totals, labels, "");
		}
		else{
			var bc_data = $(breadcrumb).data();
			ts = bc_data.ts;
			cp = bc_data.cp;
			filter = bc_data.filter;
			new_lcd = chartify(data[ts][cp], labels, filter);
		}
		update_chart(myLine, new_lcd);
	}

	function chartify(data, labels, filter){
		var cc = 0;
		var lineChartData = {
			labels : labels,
			datasets : []
		};
		//Create an object to be passed ot chart.js
		$.each(data, function( key, value ) {
			if (key.indexOf(filter) >= 0){
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
			}
		});
		lineChartData.datasets.sort(compare); 
		return lineChartData;
	}
	
	function pick_increment(diff){
		var inc;
		switch (true){
			case diff > 0 && diff <= 40:
				inc = 'day';
				break;
			case diff > 40 && diff <= 280:
				inc = 'week';
				break;
			case diff > 280:
				inc = 'month';
				break;
			default:
				inc = 'day';
				break;
		}
		$('.int').removeClass('clicked');
		$('#'+inc).addClass('clicked');
		return inc;
	}

	function update_chart(chart, lcd){
		chart.destroy();
		window.myLine = new Chart(ctx).Line(lcd, chart_options);
		var legend = myLine.generateLegend();
		$('#lineLegend').html(legend);
	}	

	//Compare sum of arrays
	function compare(a,b){
		var total_a = 0;
		var total_b = 0;
		$.each(a.data,function() {
			total_a += this;
		});
		$.each(b.data,function() {
			total_b += this;
		});
		if(total_a < total_b)
			return 1;
		if(total_a > total_b)
			return -1;
		return 0;
	}

	$( "#datepicker_to" ).datepicker({
		maxDate: "+0d",
		minDate: min,
		onSelect: function(dateText) {
			var limit;
			limit = moment(dateText).subtract(2, 'd');
			f_limit = moment(limit).format("MM/DD/YYYY");
			start = moment(dateText).format("YYYY-MM-DD");
			$( "#datepicker_from" ).datepicker( "option", "maxDate", f_limit );
			difference = diff('day', start, end)
			inc = pick_increment(difference);
			myLine.destroy();
			getData(inc, start, end);
		}
	});

	$( "#datepicker_from" ).datepicker({
		maxDate: "-2d",
		onSelect: function(dateText) {
			var limit;
			limit = moment(dateText).add(2, 'd');
			f_limit = moment(limit).format("MM/DD/YYYY");
			end = moment(dateText).format("YYYY-MM-DD");
			$( "#datepicker_to" ).datepicker( "option", "minDate", f_limit );
			difference = diff('day', start, end)
			inc = pick_increment(difference);
			myLine.destroy();
			getData(inc, start, end);
		}
	});
	
	$('.interval').on('click', '.int',  function(e) {
		e.preventDefault();
		var id = $(this).attr('id');
		difference = diff(id, start, end);
		console.log(id, difference);
		if (difference>2 && difference<60){
			$('.int').removeClass('clicked');
			$('#'+id).addClass('clicked');
			inc = id;
			myLine.destroy();
			getData(inc, start, end);
		}
	});
}