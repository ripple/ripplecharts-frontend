var TotalHistory = function (options) {
  var request, basisRequest, ts, cp, filter, last, interval,
  c = ripple.currencyDropdown(),
  to_export = {},
  issuers = {},
  ctx = $("#canvas").get(0).getContext("2d"),
  apiHandler  = new ApiHandler(options.url);

  $('.interval .range').each(function(){
      $(this).width($(this).width() + 4);
  });
  $('.interval .int').each(function(){
      $(this).width($(this).width() + 4);
  });
  $('.interval #custom').each(function(){
      $(this).width($(this).width() + 4);
  });

  //Defining SVG elements on overlayed canvas.
  var svgContainer = d3.select(".chart_wrapper").append("svg").attr("id", "canvas2"),
      line = svgContainer.append("line").attr("stroke-width", 0).attr("class", "line"),
      line2 = svgContainer.append("line").attr("stroke-width", 0).attr("class", "line"),
      circle = svgContainer.append("circle").attr("r", 0).attr("class", "circle"),
      xborder = svgContainer.append("line").attr("x1",0).attr("y1",9).attr("x2", "100%").attr("y2",9)
                                           .attr("stroke-width", 0).attr("class", "border"),
      yborder = svgContainer.append("line").attr("x1","100%").attr("y1",9).attr("x2", "100%")
                                           .attr("y2","100%").attr("stroke-width", 0).attr("class", "border");

  //Set chart options
  var chart_options = {
    responsive: true,
    pointHitDetectionRadius : 1,
    scaleFontFamily: "Open Sans Light",
    scaleLineColor: "#404040;",
    scaleShowGridLines : false,
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
      end = moment().subtract(1, 'month').subtract(1, 'day').format("MM/DD/YYYY"),
      min = moment().subtract(1, 'month').format("MM/DD/YYYY"),
      start = moment().format("MM/DD/YYYY"),
      curr = "USD";
  $('#datepicker_to').val(moment(start).format("MM/DD/YYYY"));
  $('#datepicker_from').val(moment(end).format("MM/DD/YYYY"));
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

    //Api call for topmarkets data
    basisRequest = apiHandler.historicalMetrics('topMarkets', currency, issuer, start, end, inc ,function(err, data) {
      //Err
      if (err) {console.log("Error:", err);}
      else{
        pp_data.Traded = process_data('topMarkets', pp_data.Traded, data);
        draw(pp_data);
      }
    });

    //Api call for totalvalue sent data
    basisRequest = apiHandler.historicalMetrics('totalValueSent', currency, issuer, start, end, inc ,function(err, data) {
      //Err
      if (err) {console.log("Error:", err);}
      else{
        pp_data.Sent = process_data('totalValueSent', pp_data.Sent, data);
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
      var startTime = value.startTime.split('T')[0];
      splitDate = startTime.split("-");
      year = splitDate[0].slice(-2)
      object.dateData.push(splitDate[1]+"-"+splitDate[2]+"-"+year);

      //Add to total
      object.total[i] += value.total;
      //Loop through each component in each increment and add to the total of that component
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

  //Draw
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
      var yorigin = myLine.scale.endPoint;
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
    start = moment().format("YYYY-MM-DD");
    switch (true){
      case id === "1m":
        end = moment().subtract(1, 'month').format('YYYY-MM-DD');
        break;
      case id === "3m":
        end = moment().subtract(3, 'month').format('YYYY-MM-DD');
        break;
      case id === "6m":
        end = moment().subtract(6, 'month').format('YYYY-MM-DD');
        break;
      case id === "1y":
        end = moment().subtract(1, 'year').format('YYYY-MM-DD');
        break;
      case id === "max":
        //ADD full date
        end = moment('2013/7/1').format('YYYY-MM-DD');
        break
      default:
        break;
    }
    //ADD set datepicker
    $('#datepicker_to').val(moment(start).format("MM/DD/YYYY"));
    $('#datepicker_from').val(moment(end).format("MM/DD/YYYY"));
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

    xorigin = myLine.scale.xScalePaddingLeft;
    yorigin = myLine.scale.endPoint;
    yborder.attr("y2", yorigin);
    xborder.attr("x1", xorigin);
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
      limit = moment(dateText).add(2, 'd');
      f_limit = moment(limit).format("MM/DD/YYYY");
      end = moment(dateText).format("YYYY-MM-DD");
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
        line += Math.ceil(data[key].data[i]);
      }
      str += line + '\r\n';
    }
    return str;
  }

  //Download CSV
  document.getElementById('csv').onclick = function(){
    labels = to_export.labels;
    data = to_export.datasets;
    console.log("csv!", data);
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
    if($('#loading').css('display') === 'none'){
      var scroll = $(window).scrollTop();
      var rect = this.getBoundingClientRect();
      var activeBars = myLine.getPointsAtEvent(evt),
        text = "",
        c_point = {
          x: evt.clientX - rect.left,
          y: evt.clientY - rect.top
        };
      if (activeBars === undefined) console.log("yo");
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
    xborder.attr("stroke-width", 0);
    yborder.attr("stroke-width", 0);
    line.attr("stroke-width", 0);
    line2.attr("stroke-width", 0);
    circle.attr("r", 0);
  }

}