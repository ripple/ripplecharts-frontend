var TotalHistory = function (options) {
	var self        = this;
	var apiHandler  = new ApiHandler(options.url);
	var request, basisRequest, ts, cp, filter, last;
	var c = ripple.currencyDropdown();
	var to_export = {};
	var ctx = $("#canvas").get(0).getContext("2d");

	var svgContainer = d3.select(".chart_wrapper").append("svg").attr("id", "canvas2"),
		line = svgContainer.append("line").attr("stroke-width", 0).attr("stroke", "rgba(200,200,200,0.7)"),
		line2 = svgContainer.append("line").attr("stroke-width", 0).attr("stroke", "rgba(200,200,200,0.7)"),
		circle = svgContainer.append("circle").attr("r", 0).attr("fill", "rgba(200,200,200,0.7)"),
		xborder = svgContainer.append("line").attr("x1",0).attr("y1",9).attr("x2", "100%").attr("y2",9)
											.attr("stroke-width", 0).attr("stroke", "rgba(177,177,177,0.3)"),
		yborder = svgContainer.append("line").attr("x1","100%").attr("y1",9).attr("x2", "100%")
											.attr("y2","100%").attr("stroke-width", 0).attr("stroke", "rgba(177,177,177,0.3)");

	var chart_options = {
		responsive: true,
		scaleLineColor: "rgba(177,177,177,0.3)",
		scaleShowGridLines : false,
		pointDot : false,
		animationSteps: 20,
		bezierCurve : true,
		bezierCurveTension : 0.1,
		showTooltips: false,
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
		"rgba(31, 119, 180,0.8)",
		"rgba(255, 127, 14,0.8)",
		"rgba(174, 199, 232,0.8)",
		"rgba(255, 187, 120,0.8)",
		"rgba(214, 39, 40,0.8)",
		//"rgba(152, 223, 138,0.8)",
		//"rgba(255, 152, 150,0.8)",
		"rgba(44, 160, 44,0.8)",

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
		$(".loading").show();
		$("#tooltip").hide();
		//preprocessed data
		var pp_data = {};
		pp_data.Traded = {};
		pp_data.Sent = {};

		//Currencies and pairs objects
		pp_data.Traded.currencies = {};
		pp_data.Traded.pairs = {};
		pp_data.Sent.currencies = {};
		pp_data.Sent.pairs = {};

		interval = diff(inc, start, end);
		issuer = currencies[currency];

		//Totals
		pp_data.Traded.total = Array.apply(null, new Array(interval+1)).map(Number.prototype.valueOf,0);
		pp_data.Sent.total = Array.apply(null, new Array(interval+1)).map(Number.prototype.valueOf,0);

		//Api call for data
		basisRequest = apiHandler.historicalMetrics('topMarkets', currency, issuer, start, end, inc ,function(err, data) {
			//Err
			if (err) {console.log("Error:", err);}
			else{
				console.log(data);
				pp_data.Traded = process_data('topMarkets', pp_data.Traded, data);
				draw(pp_data);
			}
		});

		basisRequest = apiHandler.historicalMetrics('totalValueSent', currency, issuer, start, end, inc ,function(err, data) {
			//Err
			if (err) {console.log("Error:", err);}
			else{
				console.log(data);
				pp_data.Sent = process_data('totalValueSent', pp_data.Sent, data);
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
			year = splitDate[0].slice(-2)
			object.dateData.push(splitDate[1]+"-"+splitDate[2]+"-"+year);

			object.total[i] += value.total;
			/// BUFFER
			//object.total[interval] = object.total[interval-1]

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
						object.currencies[counter_curr] = Array.apply(null, new Array(interval+1)).map(Number.prototype.valueOf,0);
					}
					object.currencies[counter_curr][i] += component.convertedAmount;
					//// BUFFER
					//object.currencies[counter_curr][interval] = object.currencies[counter_curr][interval-1];
				}

				if (!(issuers.hasOwnProperty(issuer))){
					var user;
					user = c.getName(issuer);
					issuers[issuer] = user;
				}
				key = key + '-' + issuers[issuer];

				if(!(object.currencies.hasOwnProperty(base_curr))){
					object.currencies[base_curr] = Array.apply(null, new Array(interval+1)).map(Number.prototype.valueOf,0);
				}
				if(!(object.pairs.hasOwnProperty(key))){
					object.pairs[key] = Array.apply(null, new Array(interval+1)).map(Number.prototype.valueOf,0);
				}
				object.currencies[base_curr][i] += component.convertedAmount;
				object.pairs[key][i] += component.convertedAmount;

				//// BUFFER
				//object.pairs[key][interval] = object.pairs[key][interval-1];
				//object.currencies[base_curr][interval] = object.currencies[base_curr][interval-1];
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
			}
		}
		return Math.ceil(difference);
	}

	function draw(data){
		//Initial draw
		//Only draw if both Traded and Sent data is preSent
		if (data.Sent.done === true && data.Traded.done === true){
			console.log("Data:", data);
			labels = data.Sent.dateData;
			if (labels.length < 1){
				labels = data.Traded.dateData;
			}
			data.totals = {};
			data.totals.Traded = data.Traded.total;
			data.totals.Sent = data.Sent.total;
			delete data.Sent.total;
			delete data.Traded.total;
			var lcd = chartify(data.totals, labels, "", "");
			to_export = lcd;
			window.myLine = new Chart(ctx).Line(lcd, chart_options);

			var xorigin = myLine.scale.xScalePaddingLeft;
			var yorigin = myLine.scale.height - 23.68773530263539;
			yborder.attr("y2", yorigin);
			xborder.attr("x1", xorigin);

			var legend = myLine.generateLegend();
			$('#lineLegend').html(legend);
			var last = $('.crumb').last()[0];
			if ($(last).attr('id') !== "total"){
				go_to(last, data, labels);
			}
			else{
				xborder.attr("stroke-width", 1);
				yborder.attr("stroke-width", 1);
			}
			$(".loading").hide();
		}

		//On click of label, go one level down and make breadcrumb
		$('#lineLegend').off('click', '.label').on('click', '.label',  function(e) {
			if ($(".legend > div").length > 1){
				e.preventDefault();
				var label_color = $(this).css('color');
				var id = $(this).attr('id');
				var filter = "";
				var text = id.split("-");
				if (id === "Sent" || id === "Traded"){
					ts = id;
					cp = 'currencies';
					new_lcd = chartify(data[id].currencies, labels, filter, "");
				}
				else{
					cp = 'pairs';
					filter = id;
					new_lcd = chartify(data[ts].pairs, labels, filter, label_color);
				}
				if (text[3]) text = text[3];
				else if(text[2]) text = text[2]
				else text = text[0]
				//Add breadcrumb with data needed to reach that point again
				$('.crumbs').append('<li> > </li>');
				$('.crumbs').append('<li class="crumb" id="'+id+'">'+text+'</li>');
				$('#'+id).data({ts: ts, cp: cp, filter: filter, color: label_color});
				update_chart(myLine, new_lcd);
			}
		});

		//Get back to point indicated by breadcrumb
		$('#breadcrumb').off('click', '.crumb').on('click', '.crumb', function(e){
			e.preventDefault();
			if (!$(this).is(".crumb:last")){
				go_to(this, data, labels);
			}
		});

	}

	function go_to(breadcrumb, data, lables){
		id = $(breadcrumb).attr('id');
		var new_lcd;
		$(breadcrumb).nextAll('li').remove();
		if ( id === 'totals'){
			new_lcd = chartify(data.totals, labels, "", "");
		}
		else{
			var bc_data = $(breadcrumb).data();
			ts = bc_data.ts;
			cp = bc_data.cp;
			filter = bc_data.filter;
			color = bc_data.color;
			new_lcd = chartify(data[ts][cp], labels, filter, color);
		}
		update_chart(myLine, new_lcd);
	}

	function chartify(data, labels, filter, color){
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
		//If last level, keep color the same.
		if (lineChartData.datasets.length == 1){
			lineChartData.datasets[0].fillColor = color;
		}
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
		borders_off();
		chart.destroy();
		$(".loading").show();
		$("#tooltip").hide();
		to_export = lcd;
		window.myLine = new Chart(ctx).Line(lcd, chart_options);
		var legend = myLine.generateLegend();
		$('#lineLegend').html(legend);
		$(".loading").hide();
		xborder.attr("stroke-width", 1);
		yborder.attr("stroke-width", 1);
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
			borders_off();
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
			borders_off();
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
		if (difference>2 && difference<60){
			borders_off();
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

	function toCSV(labels, data){
		var str ='';
		var line = '';
		for (var i=0; i<labels.length; i++){
			line += ',';
			line += labels[i];
		}
		str += line + '\r\n';
		
		for (var key in data){
			line = data[key].label;
			for (var j=0; j<labels.length; j++){
				if (line !== '') line += ',';
				line += Math.ceil(data[key].data[j]);
			}
			str += line + '\r\n';
		}
		return str;
	}

	document.getElementById('csv').onclick = function(){
		labels = to_export.labels;
		data = to_export.datasets;
		var csv = toCSV(labels, data);
		if (!!Modernizr.prefixed('requestFileSystem', window)) {
				var blob  = new Blob([csv], {'type':'application/octet-stream'});
				this.href = window.URL.createObjectURL(blob);     
		} else {
			this.href = "data:text/csv;charset=utf-8," + escape(csv);
		}
		this.download = $('.crumbs li:last-child').text()+"_"+inc+"_historical.csv";  
		this.target   = "_blank";
		return true;
	};

	$('#canvas').mousemove(function(evt){
		var scroll = $(window).scrollTop();
		var rect = this.getBoundingClientRect();
		var activeBars = myLine.getPointsAtEvent(evt),
				c_point = {},
				text = "";
		c_point = {
				x: evt.clientX - rect.left,
				y: evt.clientY - rect.top
		}
		closest = closest_point(activeBars, c_point);
		if(activeBars.length !== 0){
			line.attr("stroke-width", 1);
			line2.attr("stroke-width", 1);
			circle.attr("r", 4);
			var xorigin = myLine.scale.xScalePaddingLeft;
			var yorigin = myLine.scale.height - 23.68773530263539;
			line.transition().duration(20).attr("x1", xorigin).attr("y1", closest.y).attr("x2", closest.x).attr("y2", closest.y);
			line2.transition().duration(20).attr("x1", closest.x).attr("y1", 9).attr("x2", closest.x).attr("y2", yorigin);
			circle.transition().duration(20).attr("cx", closest.x).attr("cy", closest.y);
			$('#tooltip .iss').text("");
			var title;
			label_color = $('#lineLegend [id="'+closest.label+'"]').css('color');
			csplit = closest.label.split("-")
			if (csplit[3]){ 
				title = csplit[3]+" "+csplit[0]+"-"+csplit[2];
				$('#tooltip .iss').text(csplit[1]).css('color',label_color);
			}
			else if (csplit[2]){
				title = csplit[2]+" "+csplit[0];
				$('#tooltip .iss').text(csplit[1]).css('color',label_color);
			}
			else title=csplit[0];
			$('#tooltip').show();
			$('#tooltip').css({'top':closest.y+rect.top+scroll-100,'left':closest.x+rect.left-110});
			$('#tooltip .title').text(title).css('color',label_color);
			$('#tooltip .date').text(moment(closest.date + " 12:00 am (UTC)").format("MMM D YYYY hh:mm a (UTC)"));
			$('#tooltip .value').text(parseFloat((closest.value).toFixed(2)).toLocaleString("en")+" "+curr);
		}
	});
	

	function closest_point(point_array, c_point){
		var closest = {};
		closest.d = 100000;
		for (var i=0; i<point_array.length; i++){
			point = point_array[i];
			candidate = {
				x: point.x,
				y: point.y
			}
			d = distance(candidate, c_point);
			if (d < closest.d){
				closest.d = d;
				closest.label = point.datasetLabel;
				closest.x = candidate.x;
				closest.y = candidate.y;
				closest.value = point.value;
				closest.date = point.label;
				closest.color = point.fillColor;
			}
		}
		return closest;
	}

	function distance( point1, point2 ){
		var ys = 0;
		ys = point2.y - point1.y;
		return Math.abs(ys);
	}

	function borders_off(){
		xborder.attr("stroke-width", 0);
		yborder.attr("stroke-width", 0);
		line.attr("stroke-width", 0);
		line2.attr("stroke-width", 0);
		circle.attr("r", 0);
	}

}