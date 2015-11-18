var TotalHistory = function (options) {

  var request, basisRequest, ts, cp, filter, last, interval,
  to_export = {},
  issuers = {},
  ctx = $("#canvas").get(0).getContext("2d"),
  apiHandler  = new ApiHandler(options.url);
/*
  $('.interval .range').each(function(){
      $(this).width($(this).width() + 4);
  });
  $('.interval .int').each(function(){
      $(this).width($(this).width() + 4);
  });
  $('.interval #custom').each(function(){
      $(this).width($(this).width() + 4);
  });
*/
  //Defining SVG elements on overlayed canvas.
  var svgContainer = d3.select(".chart_wrapper").append("svg").attr("id", "canvas2"),
      line = svgContainer.append("line").attr("stroke-width", 0).attr("class", "line"),
      line2 = svgContainer.append("line").attr("stroke-width", 0).attr("class", "line"),
      circle = svgContainer.append("circle").attr("r", 0).attr("class", "circle");

  //Set chart options
  var chart_options = {
    responsive: true,
    pointHitDetectionRadius : 1,
    scaleFontFamily: "Open Sans Light",
    scaleLineColor: "rgba(100,100,100,.2)",
    scaleShowGridLines: false,
    pointDot : false,
    animationSteps: 20,
    bezierCurve : true,
    bezierCurveTension : 0.1,
    showTooltips: false,
    labelsFilter: function (value, index) {
      var jump = Math.ceil(interval/20);
      return (index) % jump !== 0;
    },
    scaleLabel: scale_template,
    legendTemplate : legend_template
  };

  //Initial parameters
  var inc = 'day',
      start = moment().subtract(1, 'month').subtract(1, 'day').format("MM/DD/YYYY"),
      min = moment().subtract(1, 'month').format("MM/DD/YYYY"),
      end = moment().format("MM/DD/YYYY"),
      curr = "USD";
  $('#datepicker_to').val(end);
  $('#datepicker_from').val(start);
  check_increments('month');
  check_increments('week');

  //Initial draw
  getData(inc, start, end, curr);

  //Get data given start and end dates, currency, and increment (day, week, month)
  function getData(inc, start, end, currency) {
    $(".loading").show();
    $("#tooltip").hide();
    //pre-processed data
    var pp_data = {};
    pp_data['Trade Volume'] = {};
    pp_data['Payment Volume'] = {};

    //Currencies and pairs objects
    pp_data['Trade Volume'].currencies = {};
    pp_data['Trade Volume'].pairs = {};
    pp_data['Payment Volume'].currencies = {};
    pp_data['Payment Volume'].pairs = {};

    interval = diff(inc, start, end);
    issuer = currencies[currency];

    //Totals
    pp_data['Trade Volume'].total = Array.apply(null, new Array(interval+1)).map(Number.prototype.valueOf,0);
    pp_data['Payment Volume'].total = Array.apply(null, new Array(interval+1)).map(Number.prototype.valueOf,0);

    //Api call for topmarkets data
    basisRequest = apiHandler.getExchangeVolume({
      currency: currency,
      issuer: issuer,
      start: start,
      end: end,
      interval: inc
    },function(err, data) {
      //Err
      if (err) {console.log("Error:", err);}
      else{
        pp_data['Trade Volume'] = process_data('topMarkets', pp_data['Trade Volume'], data.rows);
        draw(pp_data);
      }
    });

    //Api call for totalvalue paymentVolume data
    basisRequest = apiHandler.getPaymentVolume({
      currency: currency,
      issuer: issuer,
      start: start,
      end: end,
      interval: inc
    }, function(err, data) {
      //Err
      if (err) {console.log("Error:", err);}
      else{
        pp_data['Payment Volume'] = process_data('totalPaymentVolume', pp_data['Payment Volume'], data.rows);
        draw(pp_data);
      }
    });
  }

  function process_data(metric, object, data){
    object.done = false;
    //x axis array
    object.dateData = []; //first graph x-axis line points
    var splitDate, last_year;

    var resultsArray = data;

    $.each(resultsArray, function(i, value) {
      //Processing dates for x-axis labels

      //var startTime = value.startTime.split('T')[0];
      //splitDate = startTime.split("-");
      //year = splitDate[0].slice(-2)
      object.dateData.push(moment.utc(value.start_time).format('MM-DD-YYYY'));

      //Add to total
      object.total[i] += value.total;
      //Loop through each component in each increment and add to the total of that component
      $.each (value.components, function(j, component) {
        var base_curr, issuer, key;

        if (metric === "totalPaymentVolume"){
          base_curr = component.currency;
          issuer = component.issuer;
          key = base_curr + (issuer ? '-' + issuer : '');
        }
        else if (metric === "topMarkets"){
          base_curr = component.base.currency;
          issuer = component.base.issuer;
          var counter_curr = component.counter.currency;
          key = base_curr + '-' + issuer + '-' + counter_curr;

          if(!(object.currencies.hasOwnProperty(counter_curr))){
            object.currencies[counter_curr] = Array.apply(null, new Array(interval+1)).map(Number.prototype.valueOf,0);
          }
          object.currencies[counter_curr][i] += component.converted_amount;
        }

        if (issuer) {
          if (!(issuers.hasOwnProperty(issuer))){
            var gateway_list = options.gateways.getIssuers(base_curr, true);
            gateway_list.forEach(function(gateway, index) {
              if (gateway.account === issuer) {
                issuers[issuer] = gateway.name;
              }
            });
          }

          key = key + '-' + issuers[issuer];
        }

        if(!(object.currencies.hasOwnProperty(base_curr))){
          object.currencies[base_curr] = Array.apply(null, new Array(interval+1)).map(Number.prototype.valueOf,0);
        }
        if(!(object.pairs.hasOwnProperty(key))){
          object.pairs[key] = Array.apply(null, new Array(interval+1)).map(Number.prototype.valueOf,0);
        }
        object.currencies[base_curr][i] += component.converted_amount;
        object.pairs[key][i] += component.converted_amount;
      });

    });
    object.done = true;
    return object;
  }

  //Find difference between two dates, compensating for how weeks work
  function diff(inc, start, end){
    var date1, date2, sow1, sow2;
    date1 = moment(start);
    date2 = moment(end);
    difference = date2.diff(date1, inc, true);
    if (inc === "week") {
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

  //Draw
  function draw(data){
    //Initial draw
    //Only draw if both Traded and paymentVolume data is preSent
    if (data['Payment Volume'].done === true && data['Trade Volume'].done === true) {
      labels = data['Payment Volume'].dateData;
      if (labels.length < 1) {
        labels = data['Trade Volume'].dateData;
      }
      data.totals = {};
      data.totals['Trade Volume'] = data['Trade Volume'].total;
      data.totals['Payment Volume'] = data['Payment Volume'].total;
      delete data['Payment Volume'].total;
      delete data['Trade Volume'].total;
      var lcd = chartify(data.totals, labels, "", "");
      to_export = lcd;
      window.myLine = new Chart(ctx).Line(lcd, chart_options);

      var legend = myLine.generateLegend();
      $('#lineLegend').html(legend);
      var last = $('.crumb').last()[0];
      if ($(last).data('metric')){
        go_to(last, data, labels);
      }
      $(".loading").hide();
    }

    //On click of label, go one level down and make breadcrumb
    $('#lineLegend').off('click', '.label').on('click', '.label',  function(e) {
      if ($(".legend > div").length > 1){
        e.preventDefault();
        var label_color = $(this).css('color');
        var filter = "";
        var metric = $(this).attr('title');

        if (metric === "Payment Volume" || metric === "Trade Volume"){
          ts = metric;
          cp = 'currencies';
          new_lcd = chartify(data[ts].currencies, labels, filter, "");
        }
        else{
          cp = 'pairs';
          filter = metric;
          new_lcd = chartify(data[ts].pairs, labels, filter, label_color);
        }

        //Add breadcrumb with data needed to reach that point again
        var crumb = $('<li class="crumb" title="'+metric+'">'+metric+'</li>');
        crumb.data({ts: ts, cp: cp, filter: filter, color: label_color});
        $('.crumbs').append('<li> > </li>');
        $('.crumbs').append(crumb);
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
    var title = $(breadcrumb).attr('title');
    var new_lcd;
    $(breadcrumb).nextAll('li').remove();
    if (!title) {
      new_lcd = chartify(data.totals, labels, "", "");
    }
    else{
      var bc_data = $(breadcrumb).data();
      ts = bc_data.ts;
      cp = bc_data.cp;
      filter = bc_data.filter;
      color = bc_data.color;
      console.log(data, bc_data);
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
  }

  function pick_range(id){
    end = moment().format("MM/DD/YYYY");
    switch (true){
      case id === "1m":
        start = moment().subtract(1, 'month').format('MM/DD/YYYY');
        break;
      case id === "3m":
        start = moment().subtract(3, 'month').format('MM/DD/YYYY');
        break;
      case id === "6m":
        start = moment().subtract(6, 'month').format('MM/DD/YYYY');
        break;
      case id === "1y":
        start = moment().subtract(1, 'year').format('MM/DD/YYYY');
        break;
      case id === "max":
        //ADD full date
        start = moment('2013/7/1').format('MM/DD/YYYY');
        break
      default:
        break;
    }
    //ADD set datepicker
    $('#datepicker_to').val(moment(end).format("MM/DD/YYYY"));
    $('#datepicker_from').val(moment(start).format("MM/DD/YYYY"));
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
      limit = moment(dateText).subtract(2, 'day');
      f_limit = moment(limit).format("MM/DD/YYYY");
      end = moment(dateText).format("MM/DD/YYYY");
      $( "#datepicker_from" ).datepicker( "option", "maxDate", f_limit );
      difference = diff('day', start, end)
      pick_increment(difference);
      myLine.destroy();
      getData(inc, start, end, curr);
      check_increments('month');
      check_increments('week');
    }
  });

  $( "#datepicker_from" ).datepicker({
    maxDate: "-2d",
    onSelect: function(dateText) {
      borders_off();
      var limit;
      limit = moment(dateText).add(2, 'day');
      f_limit = moment(limit).format("MM/DD/YYYY");
      start = moment(dateText).format("MM/DD/YYYY");
      $( "#datepicker_to" ).datepicker( "option", "minDate", f_limit );
      difference = diff('day', start, end)
      pick_increment(difference);
      myLine.destroy();
      getData(inc, start, end, curr);
      check_increments('month');
      check_increments('week');
    }
  });

  $('.interval').on('click', '.int',  function(e) {
    e.preventDefault();
    if(!$(this).hasClass('clicked')){
      var id = $(this).attr('id');
      difference = diff(id, start, end);
      if (difference>4){
        borders_off();
        $('.int').removeClass('clicked');
        $(this).addClass('clicked');
        inc = id;
        myLine.destroy();
        getData(inc, start, end, curr);
        check_increments('month');
        check_increments('week');
      }
    }
  });

  //Check which increments are not possible to display
  function check_increments(inc){
    difference = diff(inc, start, end);
    if (difference<5){
      $("#"+inc).addClass('noclick');
    }
    else{
      $("#"+inc).removeClass('noclick');
    }
  }

  //Redraw when interval is changed
  $('.interval').on('click', '.range', function(e){
    e.preventDefault();
    if(!$(this).hasClass('clicked')){
      var id = $(this).attr('id');
      $('.range').removeClass('clicked');
      $(this).addClass('clicked');
      //ADD class to datepicker
      $("#custom").removeClass('clicked');
      $("#datepicker_from").hide();
      $("#datepicker_to").hide();
      pick_range(id);
      difference = diff('day', start, end);
      pick_increment(difference);
      borders_off();
      myLine.destroy();
      getData(inc, start, end, curr);
      check_increments('month');
      check_increments('week');
    }
  });

  //Turn on custom range calendar
  $('.interval').on('click', '#custom', function(e){
    e.preventDefault();
    if(!$(this).hasClass('clicked')){
      $('.range').removeClass('clicked');
      $(this).addClass('clicked');
      $("#datepicker_from").show();
      $("#datepicker_to").show();
    }
  });

  //Redraw when currency is changed
  $('select').on('change', function() {
    curr = $(this).val();
    myLine.destroy();
    borders_off();
    getData(inc, start, end, curr);
  });

  //Get user name given issuer
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

  //Data to CSV format
  function toCSV(labels, data){
    var str ='';
    var line = 'Date';

    for (var key in data){
      line += ",";
      line += data[key].label;
    }
    str += line + '\r\n';
    for (var i=0; i<labels.length; i++){
      line = labels[i];
      for (key in data){
        line += ",";
        line += parseFloat((data[key].data[i]).toFixed(2));
      }
      str += line + '\r\n';
    }
    return str;
  }

  //Download CSV
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

  //Add tooltip on mouse move
  $('#canvas').mousemove(function(evt){
    if($('.loading').css('display') === 'none'){
      var scroll = $(window).scrollTop();
      var rect = this.getBoundingClientRect();
      var activeBars = myLine.getPointsAtEvent(evt),
        text = "",
        c_point = {
          x: evt.clientX - rect.left,
          y: evt.clientY - rect.top
        };

      closest = closest_point(activeBars, c_point);
      if(activeBars.length !== 0){
        line.attr("stroke-width", 1);
        line2.attr("stroke-width", 1);
        circle.attr("r", 4);
        var xorigin = myLine.scale.xScalePaddingLeft;
        var yorigin = myLine.scale.endPoint;
        line.transition().duration(100).attr("x1", xorigin).attr("y1", closest.y).attr("x2", closest.x).attr("y2", closest.y);
        line2.transition().duration(100).attr("x1", closest.x).attr("y1", 9).attr("x2", closest.x).attr("y2", yorigin);
        circle.transition().duration(100).attr("cx", closest.x).attr("cy", closest.y);
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
        var tooltip_y = closest.y+rect.top+scroll-($('#tooltip').height()/2)-75;
        var tooltip_x = closest.x+rect.left-($('#tooltip').width()/2);
        $('#tooltip').animate({'top': tooltip_y,'left': tooltip_x},25);
        $('#tooltip .title').text(title).css('color',label_color);
        $('#tooltip .date').text(moment(closest.date + " 12:00 am (UTC)", "MM/DD/YYYY").format("MMM D YYYY hh:mm a (UTC)"));
        $('#tooltip .value').text(parseFloat((closest.value).toFixed(2)).toLocaleString("en")+" "+curr);
      }
    }
  });

  //Given mouse location, find closest point in point_array
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

  //Vertical distance
  function distance( point1, point2 ){
    var ys = 0;
    ys = point2.y - point1.y;
    return Math.abs(ys);
  }

  //Turn of svg borders during loading
  function borders_off(){
    line.attr("stroke-width", 0);
    line2.attr("stroke-width", 0);
    circle.attr("r", 0);
  }

}
