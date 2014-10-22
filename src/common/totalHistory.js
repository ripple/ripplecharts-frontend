var TotalHistory = function (options) {
	var self        = this;
	var apiHandler  = new ApiHandler(options.url);
	var request, basisRequest, ts, cp, filter;
	var c = ripple.currencyDropdown();

	var ctx = $("#canvas").get(0).getContext("2d");
	var chart_options = {
		responsive: true,
		scaleShowGridLines : false,
		pointDotRadius : 1,
		animationSteps: 20,
		bezierCurve : true,
		bezierCurveTension : 0.15,
		scaleLabel: '<% if (value>=1000000) {%>'
									+'<%=value/1000000%>m'
								+'<% } else if (value>=1000){%>' 
									+'<%=value/1000%>k'
								+'<% } else if(value == 0){%>'
									+''
								+'<% } else {%>'
									+ '<%=value%>'
								+'<%}%>',
		//tooltipTemplate: "<%if (label){%><%=label%>: <%}%>Hey<%= value %>",
		//multiTooltipTemplate: "Hello <%= value %>",
		legendTemplate :'<div class="legend">'
							+'<% for (var i=0; i<datasets.length; i++) { %>'
								+'<div class="label" id="<%= datasets[i].label %>" style="color:<%=datasets[i].fillColor%>">'
									+'<div class="gateway">'
										+ '<% if (datasets[i].label.split("-").length == 1) { %>'
											+ '<%= datasets[i].label.split("-")[0] %> '
										+ '<% } else if (datasets[i].label.split("-")[3]){ %>'
											+'<div class="gw">'
												+'<%= datasets[i].label.split("-")[3]%> '
											+'</div>'
											+'<div class="pair">'
												+ '<%= datasets[i].label.split("-")[0] %> - <%= datasets[i].label.split("-")[2] %>'
											+'</div>'
										+ '<% } else { %>'
										+ '<%= datasets[i].label.split("-")[2]%> <%= datasets[i].label.split("-")[0] %>'
										+ '<% } %>'
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
	var issuers = {};

	var currencies = {
		"USD":"rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B",
		"BTC":"rMwjYedjc7qqtKYVLiAccJSmCwih4LnE2q",
		"CNY":"razqQKzJRdB4UxFPWf5NEpEG3WMkmwgcXA",
		"EUR":"rMwjYedjc7qqtKYVLiAccJSmCwih4LnE2q",
		"JPY":"rMAz5ZnK73nyNUL4foAvaxdreczCkG3vA6",
		"XRP":""
	};

	//Initial parameters
	var inc = 'day';
	var end = moment().subtract(16, inc).format('YYYY-MM-DD');
	var min = moment().subtract(14, inc).format("MM/DD/YYYY");
	var start = moment().format("YYYY-MM-DD");
	var curr = "USD";
	$('#datepicker_to').val(moment(start).format("MM/DD/YYYY"));
	$('#datepicker_from').val(moment(end).format("MM/DD/YYYY"));

	//Initial draw
	getData(inc, start, end, curr);

	function getData(inc, start, end, currency) {
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
		issuer = currencies[currency];

		//Totals
		pp_data.traded.total = Array.apply(null, new Array(interval)).map(Number.prototype.valueOf,0);
		pp_data.sent.total = Array.apply(null, new Array(interval)).map(Number.prototype.valueOf,0);

		//Api call for data
		basisRequest = apiHandler.historicalMetrics('topMarkets', currency, issuer, start, end, inc ,function(err, data) {
			//Err
			if (err) {console.log("Error:", err);}
			else{
				pp_data.traded = process_data('topMarkets', pp_data.traded, data);
				draw(pp_data);
			}
		});

		basisRequest = apiHandler.historicalMetrics('totalValueSent', currency, issuer, start, end, inc ,function(err, data) {
			//Err
			if (err) {console.log("Error:", err);}
			else{
				pp_data.sent = process_data('totalValueSent', pp_data.sent, data);
				draw(pp_data);
			}
		});
	}

	function process_data(metric, object, data){
		console.log("preprocessing...");
		object.done = false;
		//data points
		object.dateData = []; //first graph x-axis line points
		var resultsArray = data;
		var splitDate, last_year;

		$.each(resultsArray, function(i, value) {
			var startTime = value.startTime.split('T')[0];
			splitDate = startTime.split("-");
			if (splitDate[0] !== last_year){
				object.dateData.push(startTime);
				last_year = splitDate[0];
			}
			else{
				object.dateData.push(splitDate[1]+"-"+splitDate[2]);
			}
			object.total[i] += value.total;

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

				///
				if (!(issuers.hasOwnProperty(issuer))){
					var user;
					user = c.getName(issuer);
					issuers[issuer] = user;
				}
				key = key + '-' + issuers[issuer];
				///

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
				var text = id.split("-");
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
				if (text[3]){
					text = text[3];
				}
				else if(text[2]){
					text = text[2]
				}
				else{
					text = text[0]
				}
				//Capitalize Send and Trade differently <<<<<<
				text = text.charAt(0).toUpperCase() + text.substring(1);
				//Add breadcrumb with data needed to reach that point again
				console.log(id);
				$('.crumbs').append('<li> > </li>');
				$('.crumbs').append('<li class="crumb" id="'+id+'">'+text+'</li>');
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
			getData(inc, start, end, curr);
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
			getData(inc, start, end, curr);
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
			getData(inc, start, end, curr);
		}
	});

	$('select').on('change', function() {
		curr = $(this).val();
		myLine.destroy();
		getData(inc, start, end, curr);
	});

	function get_user(issuer, user){
		console.log('making call');
		var url = "https://id.ripple.com/v1/user/"+issuer;
		$.ajax({
			url: url,
			dataType: 'json',
			async: false,
			data: user,
			success: function(data) {
				user = data.username;
			}
		});
		return user;
	}
}