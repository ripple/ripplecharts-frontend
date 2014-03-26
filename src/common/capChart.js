function CapChart(options) {
  var self       = this,
    apiHandler   = new ApiHandler(options.url);
    
  var div        = d3.select(options.id).attr("class", "capChart");
  var controls   = div.append("div").attr("class","controls");
  var dropdowns  = controls.append("div").attr("class","dropdownBox");
  var chart      = div.append("div").attr("class","chart");
  var legend     = div.append("div").attr("class","legend");
  
  var DATEFORMAT = "MMM D YYYY h:mm a (z)";
  //var DATEFORMAT = null;
  
  if (!options.margin) options.margin = {top: 5, right: 60, bottom: 20, left: 60};
  if (!options.width)  options.width  = parseInt(div.style('width'), 10) - options.margin.left - options.margin.right;
  if (!options.height) options.height = options.width/2.25>400 ? options.width/2.25 :400;
  
  self.currency = options.currency || "USD";
  self.format   = options.format   || "stacked";
  self.dataType = options.dataType || "Capitalization";
  self.range    = options.range    || "max";
  self.onchange = options.onchange || null;
  
//add data type dropdown
  dropdowns.append("div").attr("class","dropdowns dataType").append("select").selectAll("option")
    .data(['Capitalization', 'Transaction Volume', 'Trade Volume'])
    .enter().append("option")
    .html(function(d){return d})
    .attr("selected", function(d) {if (d == self.dataType) return true});
    
  dropdowns.select(".dataType select").on('change',function(){
    self.dataType = this.value;
    if (self.dataType=='Transaction Volume') {
      dropdowns.select(".currency").insert("option", ":first-child").attr("class", "XRP").text("XRP");  
    } else {
      dropdowns.select(".currency .XRP").remove();
    }
    
    if (self.currency=='XRP') self.currency = dropdowns.select(".currency").node().value;

    var d = controls.select(".interval .selected").datum();
    loadData(d);
  });
 
 
//add currency dropdown    
  var currencyList = ['BTC','USD','CNY','EUR','GBP','JPY','ILS','LTC'];
  if (self.dataType=='Transaction Volume') currencyList.unshift("XRP");
  var currencyDropdown = ripple.currencyDropdown(currencyList).selected({currency:self.currency})
    .on("change", function(currency) {
      self.currency = currency;
      var range = controls.select(".interval .selected").datum();
      loadData(range);
  });  
  
  dropdowns.append("div").attr("class","dropdowns").call(currencyDropdown);


//add chart type select  
  var type = controls.append("div").attr("class", "chartType selectList").selectAll("a")
    .data(["line","stacked"])
    .enter().append("a")
    .attr("href", "#")
    .classed("selected", function(d) { return d === self.format})
    .text(function(d) { return d })
    .on("click", function(d){
      d3.event.preventDefault();
      var that = this;
      type.classed("selected", function() { return this === that; });
      self.format = d;
      drawData();
      
      var range = controls.select(".interval .selected").datum();
      if (self.onchange) self.onchange({
        dataType : self.dataType,
        currency : self.currency,
        format   : self.format,
        range    : range.name      
      });      
    });

  
//add interval select  
  var list = controls.append("div").attr("class","interval selectList");
  list.append("label").html("Range:");
  var interval = list.selectAll("a")
    .data([
      {name: "week",   interval:"hour",  offset: function(d) { return d3.time.day.offset(d, -7); }},
      {name: "month",  interval:"day",   offset: function(d) { return d3.time.month.offset(d, -1); }},
      {name: "quarter",interval:"day",   offset: function(d) { return d3.time.month.offset(d, -3); }},
      {name: "year",   interval:"day",   offset: function(d) { return d3.time.year.offset(d, -1); }},
      {name: "max",    interval:"month", offset: function(d) { return d3.time.year.offset(d, -3); }}
    ])
    .enter().append("a")
    .attr("href", "#")
    .classed("selected", function(d) { return d.name === self.range})
    .text(function(d) { return d.name; })
    .on("click", function(range){
      d3.event.preventDefault();
      var that = this;
      interval.classed("selected", function() { return this === that; });
      if (range.name == "custom") {
        //$('#range').slideToggle();    
      } else {
        loadData(range);
      }
    });
  
  var xScale = d3.time.scale(),
      yScale = d3.scale.linear(),
      color  = d3.scale.category20(),
      xAxis  = d3.svg.axis().scale(xScale).orient("bottom"),
      yAxis  = d3.svg.axis().scale(yScale).orient("right").tickFormat(d3.format("s"));
      
  var area = d3.svg.area()
    .x(function(d) { return xScale(d.date); })
    .y0(function(d) { return yScale(d.y0); })
    .y1(function(d) { return yScale(d.y0 + d.y); });
    
  var stack = d3.layout.stack().values(function(d) { return d.values; });  
  
  var svg, g, timeAxis, amountAxis, amountLabel, borders, sections, lines,
    tracer, tooltip, loader, isLoading;
  
  var capDataCache   = {};
  var sendDataCache  = {};
  var tradeDataCache = {};

  if (options.resize && typeof addResizeListener === 'function') {
    addResizeListener(window, resizeChart);
  }
  
  this.suspend = function () {
    if (options.resize && typeof removeResizeListener === 'function')
      removeResizeListener(window, resizeChart);   
  }
     
  function resizeChart () {
    old = options.width;
    w = parseInt(div.style('width'), 10);
    options.width  = w-options.margin.left - options.margin.right;
    options.height = options.width/2.25>400 ? options.width/2.25 : 400;
    
    if (old != options.width) {
      drawChart(); 
      drawData();  
    } 
  }
   
   
//load the current chart data from the API    
  function loadData (range) {
    
    if (typeof mixpanel !== undefined) mixpanel.track("Value Chart", {
      "Data Type"  : self.dataType,
      "Currency"   : self.currency,
      "Format"     : self.format,
      "Range"      : range.name
    });
    
    if (self.onchange) self.onchange({
      dataType : self.dataType,
      currency : self.currency,
      format   : self.format,
      range    : range.name      
    });
    
    self.range = range.name;
    isLoading  = true;
    loader.transition().style("opacity",1);
    tracer.transition().duration(50).style("opacity",0); 
    tooltip.transition().duration(50).style("opacity",0);    
     
    if (self.dataType=="Capitalization") {
      loadCapitalizationData(range);
    } else if (self.dataType==="Transaction Volume") {
      loadSendData(range);
    } else {
      loadTradeData(range);
    }
  } 
  
  
  function loadSendData(range) {
    if (sendDataCache[self.currency] &&
        sendDataCache[self.currency][self.range]) {
          
      isLoading = false;
      drawData();
      drawLegend();
      return;  
    } 

    var issuers = self.currency=="XRP" ? [""] : currencyDropdown.getIssuers(self.currency);    
    for (var i=0; i<issuers.length; i++) {
      loadSendDataHelper(range, {currency:self.currency, issuer:issuers[i]}, issuers.length);
    }       
  }
  
  function loadSendDataHelper(range, c, count) {
    var end = moment.utc();

    apiHandler.valueSent({
      startTime     : range.offset(end),
      endTime       : end,
      timeIncrement : range.interval,
      currency      : c.currency,
      issuer        : c.issuer
      
    }, function(data){  
      if (!sendDataCache[c.currency]) 
        sendDataCache[c.currency] = {};
      if (!sendDataCache[c.currency][range.name])
        sendDataCache[c.currency][range.name] = {raw:[]};
      
      
      var results = data.results;
      results.shift(); //remove the first;
      
      sendDataCache[c.currency][range.name]['raw'].push({
        address : c.issuer,
        name    : currencyDropdown.getName(c.issuer),
        results : results.map(function(d){return[moment(d[0]).unix()*1000,d[1], d[2]]})});
            
      prepareStackedData(c.currency, range); 
      prepareLegend(c.currency, range);
      
      if (self.dataType=="Transaction Volume" &&
        self.currency==c.currency &&
        self.range==range.name) {
      
        if (sendDataCache[c.currency][range.name]['raw'].length == count) isLoading = false;
        drawData(); //may have been changed after loading started
        drawLegend();
      }
            
    }, function (error){
      console.log(error);

    });     
      
  }
  
//load trade data from offers exercised API for each issuer  
  function loadTradeData(range) {
    if (tradeDataCache[self.currency] &&
        tradeDataCache[self.currency][self.range]) {
          
      isLoading = false;
      drawData();
      drawLegend();
      return;  
    } 

    var issuers = currencyDropdown.getIssuers(self.currency);    
    for (var i=0; i<issuers.length; i++) {
      loadTradeHelper(range, {currency:self.currency, issuer:issuers[i]}, issuers.length);
    }    
  }
  
  function loadTradeHelper (range, base, count) {
    var end = moment.utc();
    
    apiHandler.offersExercised({
      startTime     : range.offset(end),
      endTime       : end,
      timeIncrement : range.interval,
      descending    : false,
      base          : base,
      trade         : {currency:"XRP"}
      
    }, function(data){  
      if (!tradeDataCache[base.currency]) 
        tradeDataCache[base.currency] = {};
      if (!tradeDataCache[base.currency][range.name])
        tradeDataCache[base.currency][range.name] = {raw:[]};
      
        
      tradeDataCache[base.currency][range.name]['raw'].push({
        address : base.issuer,
        name    : currencyDropdown.getName(base.issuer),
        results : data.map(function(d){return[d.time.unix()*1000,d.volume]})});
      
      prepareStackedData(base.currency, range); 
      prepareLegend(base.currency, range);
      
      if ((self.dataType=="Trade Volume" || self.dataType=="# of Trades") &&
        self.currency==base.currency &&
        self.range==range.name) {
      
        if (tradeDataCache[base.currency][range.name]['raw'].length == count) isLoading = false;
        drawData(); //may have been changed after loading started
        drawLegend();
      }
    }, function (error){
      console.log(error);
      //setStatus(error.text ? error.text : "Unable to load data");
    });       
  }
  

//load capitalization data from issuerCapitalization API  
  function loadCapitalizationData(range) { 
    var currency = self.currency;
    
    if (capDataCache[currency] &&
        capDataCache[currency][range.name]) {
          
      isLoading = false;
      drawData();
      drawLegend();
      return;  
    } 
    
    var end     = moment.utc();
    var issuers = currencyDropdown.getIssuers(currency);    
    var pairs   = issuers.map(function(d){
      return {
        currency : currency,
        issuer   : d
      }
    });

/* 
//code below is used for gatewayCapitalization, wont be necessary
//when issuerCapitalization is functioning    
    var currencies = [currency];
    var gateways   = issuers.map(function(d){
      return d;
    });
    
    //console.log(currencies);
    //console.log(gateways); 
    //console.log(pairs);
*/    
    apiHandler.issuerCapitalization({
      //currencies : currencies,
      //gateways   : gateways,
      timeIncrement : range.interval,
      pairs     : pairs,
      startTime  : range.offset(end),
      endTime    : end
      
    }, function(data){
      
      if (!capDataCache[self.currency]) capDataCache[self.currency] = {};
      capDataCache[self.currency][self.range] = {raw : data};
      
      prepareStackedData(currency, range);
      prepareLegend(currency, range);
      
      //prepareLineData();
      
      if (self.dataType=="Capitalization" &&
        self.currency==currency &&
        self.range==range.name) {
        
        isLoading = false;
        drawData(); //may have been changed after loading started
        drawLegend();
      }
      
    }, function (error){
      console.log(error);
      //setStatus(error.text ? error.text : "Unable to load data");
    });    
  }
  
  function sortTime(a,b){return a[0]-b[0]}

/*  
  function prepareLineData() {
    var raw = capDataCache[self.currency][self.range].raw;
    var totals = {}, series;
    if (raw.length<2) return;
      
    for (var i=0; i<raw.length; i++) {
      series = raw[i];
      series.results.sort(sortTime);//necessary?

      for (var j=0; j<series.results.length; j++) {
        var timestamp = series.results[j][0];
        totals[timestamp]  = (totals[timestamp] || 0) + series.results[j][1];
      }
    }
  
    var t = [];
    for (var key in totals) {
      t.push([parseInt(key,10),totals[key]]);
    }
    
    
    capDataCache[self.currency][self.range].totals ={
      name    : "Total",
      address : "",
      results : t
    };  
  }
  
*/
  
  function prepareStackedData(currency, range) {

    var timestamps = [];
    var stacked = [];
    var raw;
    
    if (self.dataType=='Capitalization') {
      raw = capDataCache[currency][range.name].raw;
    
    } else if (self.dataType=="Transaction Volume") {
      raw = sendDataCache[currency][range.name].raw;
        
    } else {
      raw = tradeDataCache[currency][range.name].raw;
    }

//  get all timestamps and set up data for the stacked chart    
    for (var i=0; i<raw.length; i++) {
      series = raw[i];

      stacked[i] = {
        name    : series.name,
        address : series.address || series.issuer,
        data    : {}
      };
      
      for (var j=0; j<series.results.length; j++) {
        var timestamp = series.results[j][0];
        stacked[i].data[timestamp] = series.results[j][1];
        timestamps.push(series.results[j][0]);
      }
    }

    timestamps.sort(function(a,b){return a-b});
    
//  add last amount for empty timestamps    
    for (k=0; k<stacked.length; k++) {
      var data = stacked[k].data;
      var last = 0;
     
      stacked[k].values = [];
      for (var m=0; m<timestamps.length; m++) {
        stacked[k].values.push({
          date : moment(parseInt(timestamps[m], 10)).utc(),
          y    : data[timestamps[m]] || last
        });
        
        last = data[timestamps[m]] || last;
      } 
    }  
    
    if (self.dataType=='Capitalization') {
      capDataCache[currency][range.name].stacked = stacked; 
      
    } else if (self.dataType=="Transaction Volume") {
      sendDataCache[currency][range.name].stacked = stacked;
        
    } else {
      tradeDataCache[currency][range.name].stacked = stacked; 
    }
  }
  
  
  function prepareLegend(currency, range) {
    var raw, legend;
    
    if (self.dataType=='Capitalization') {
      raw = capDataCache[currency][range.name].raw;  
    
    } else if (self.dataType=="Transaction Volume") {
      raw = sendDataCache[currency][range.name].raw;
          
    } else {
      raw = tradeDataCache[currency][range.name].raw;
    }
    
    legend = raw.map(function(d){
      var amount; 
      var address = d.address || d.issuer;
      if (d.values) amount = d.values.length ? commas(d.values[d.values.length-1].y,2) : 0;   
      else amount = d.results.length ? commas(d.results[d.results.length-1][1],2) : 0;
      return {
        name    : currencyDropdown.getName(address) || d.name,
        address : address,
        amount  : amount,
        hide    : false
      }
    });
    
    if (self.dataType=='Capitalization') {
      capDataCache[currency][range.name].legend = legend;
      
    } else if (self.dataType=="Transaction Volume") {
      sendDataCache[currency][range.name].legend = legend;
          
    } else {
      tradeDataCache[currency][range.name].legend = legend;
    }
  }
  
  function drawChart() {
    chart.html("");
    svg = chart.append("svg").attr({
        width  : options.width + options.margin.left + options.margin.right, 
        height : options.height + options.margin.top + options.margin.bottom})
      //.on("mousemove", movingInSky);
    g = svg.append("g").attr("transform", "translate(" + options.margin.left + "," + options.margin.top + ")");
    
    g.append("rect").attr("class", "background")
      .attr("width", options.width)
      .attr("height", options.height)
      .on("mousemove", movingInSky);
         
    timeAxis   = svg.append("g").attr("class", "x axis")
      .attr("transform", "translate("+options.margin.left+","+(options.height+options.margin.top)+")");
      
    amountAxis = svg.append("g").attr("class", "y axis")
      .attr("transform", "translate("+(options.width+options.margin.left)+","+options.margin.top+")");
    
    amountLabel = amountAxis.append("text").attr("class", "title")
      .attr("transform", "rotate(-90)").attr("y",-5)
      .attr("x",-options.height*0.85);
       
    xScale.range([0, options.width])
    yScale.range([options.height, 0]);
    
    tracer = svg.append("g").attr("class", "tracer");
    tracer.append("line").attr("class","vertical");
    tracer.append("line").attr("class","horizontal");
    tracer.append("circle").attr("class","top").attr("r", 4);
    tracer.append("circle").attr("class","bottom").attr("r",4);
          
    tooltip = chart.append("div").attr("class", "tooltip");
    loader  = chart.append("img")
      .attr("class", "loader")
      .attr("src", "assets/images/rippleThrobber.png");
      
    if (isLoading) loader.style("opacity", 1);   
  }
  
  function drawData() {
    var data, legend;
    
    if (!isLoading) loader.transition().style("opacity",0);
    if (self.format=="stacked") {
      svg.selectAll('.line').remove();
      

      if (self.dataType=='Capitalization') {
        data   = capDataCache[self.currency][self.range].stacked;
        legend = capDataCache[self.currency][self.range].legend;
      } else if (self.dataType=='Transaction Volume') {
        data   = sendDataCache[self.currency][self.range].stacked;
        legend = sendDataCache[self.currency][self.range].legend;       
      } else if (self.dataType=='Trade Volume') {  
        data   = tradeDataCache[self.currency][self.range].stacked;
        legend = tradeDataCache[self.currency][self.range].legend;
      } 
          
      color.domain(legend.map(function(d){return d.address}));   
      data = filterByLegend(data, legend); 
      if (data.length) { 
        sections = stack(data);

        xScale.domain(d3.extent(data[0].values, function(d){return d.date}));
        yScale.domain([0, d3.sum(data, function(d){
          return d3.max(d.values, function(v){return v.y});
        })]);
      
        var section = g.selectAll("g.section").data(sections);
        section.enter().append("g")
          .attr("class","section")
          .style("display",function(d) {return d.hide ? "none" : "inherit"});
        section.exit().remove();
    
        var path = section.selectAll("path").data(function(d){return[d]});
        path.enter().append("path")
          .on("mousemove", movingInGround);
        path.transition()
          .attr({class: "area", d: function(d) { return area(d.values); } });
          
        path.style("fill", function(d) { return color(d.address); });
        path.exit().remove();
      
      } else {

        tracer.transition().duration(50).style("opacity",0); 
        tooltip.transition().duration(50).style("opacity",0);         
        xScale.domain([0,0]);
        yScale.domain([0,0]);
        g.selectAll("g.section").data([]).exit().remove();
      } 
      
    } else {
      svg.selectAll('.section').remove();
      if (self.dataType=='Capitalization') {
        lines  = capDataCache[self.currency][self.range].raw;
        legend = capDataCache[self.currency][self.range].legend;
      } else if (self.dataType=='Transaction Volume')   {
        lines  = sendDataCache[self.currency][self.range].raw;
        legend = sendDataCache[self.currency][self.range].legend;  
      } else if (self.dataType=='Trade Volume')   {
        lines  = tradeDataCache[self.currency][self.range].raw;
        legend = tradeDataCache[self.currency][self.range].legend;
      }
       
      
      color.domain(legend.map(function(d){return d.address})); 
      lines = filterByLegend(lines, legend);
      
      xScale.domain(getExtents("x", lines));
      yScale.domain(getExtents("y", lines));

      var line = g.selectAll("g.line").data(lines, function(d){return d.address || d.issuer});
      line.enter().append("g").attr("class","line");
      line.exit().remove();
      
      var p = line.selectAll("path").data(function(d){return[d]});
      p.enter().append("path")
        .on("mouseover", movingOnLine);
        
      p.transition().attr("d", function(d) {
         var l = d3.svg.line()
          .x(function(d) { return xScale(d[0]); })
          .y(function(d) { return yScale(d[1]); }); 
          return l(d.results);
      }).style("stroke", function(d) { return color(d.address || d.issuer); });
        
      p.exit().remove();
    }
    
    var ticks = options.width/60-(options.width/60)%2;

    timeAxis.transition().call(xAxis.ticks(ticks).scale(xScale));
    amountAxis.transition().call(yAxis.scale(yScale));
    amountLabel.text(self.currency);
 
  } 
  
  function drawLegend() {
    var data;
    if (self.dataType=='Capitalization') 
      data = capDataCache[self.currency][self.range].legend;    
    else if (self.dataType=='Transaction Volume')   
      data = sendDataCache[self.currency][self.range].legend;   
    else if (self.dataType=='Trade Volume')   
      data = tradeDataCache[self.currency][self.range].legend;      
    
    legend.style("display", self.currency == 'XRP' ? "none" : "block");     
    var items = legend.selectAll(".item").data(data);
    var enter = items.enter().append("div").attr("class","item");

    enter.append("h5").attr("class","gateway");
    enter.append("div").attr("class","issuer");
    enter.append("div").attr("class","amount");
    enter.on('click', function(data){
      data.hide = !data.hide;
      //drawChart();
      drawData();
      drawLegend();
      d3.select(this).transition().style("opacity", data.hide ? 0.3 : 1);
    });

    items.style("color", function(d){return color(d.address)})
      .style("opacity", function(d){return d.hide ? 0.3 : 1});
    items.select(".gateway").html(function(d){return d.name});
    items.select(".issuer").html(function(d){return d.address});
    if (self.dataType=='Capitalization') 
      items.select(".amount").html(function(d){return d.amount + " <small>"+self.currency+"</small"});
    else items.select(".amount").html("");
    
    items.exit().remove();  
  }
  
  function movingInSky() {
    var top, date, i, j, cx, cy, position, zoom = div.style("zoom") || 1;

    if (self.format=="stacked") {
      if (!sections || !sections.length) return;
      
      top  = sections[sections.length-1].values;
      date = xScale.invert(d3.mouse(this)[0]/zoom);
      i    = d3.bisect(top.map(function(d){return d.date}), date);
   

      if (!top || !top[i]) return;
      
      if (date<(top[i].date+top[i-1].date)/2) i--;
      cy = yScale(top[i].y+top[i].y0)+options.margin.top;
      cx = xScale(top[i].date)+options.margin.left;

//    determine position of tooltip      
      position = getTooltipPosition(cx, cy);
      date     = top[i].date.utc().format(DATEFORMAT);
      amt      = commas(top[i].y+top[i].y0, 2);  
      
      handleTooltip("Total", null, date, amt, position);
      handleTracer(cx, cy);
        
    } else {
      if (!lines) return;
      date = xScale.invert(d3.mouse(this)[0]/zoom);
      amt  = yScale.invert(d3.mouse(this)[1]/zoom);

      rows = lines.map(function(d,i){ 
        j = d3.bisectLeft(d.results.map(function(d){return d[0]}), date);
        return [i,j,d.results[j]?d.results[j][1]:0]});
      
      rows.sort(function(a,b){return a[2]-b[2]});
      for (i=0;i<rows.length;i++) {if (rows[i][2]>amt) break;}
      if (i==rows.length) i--;
      
      line = lines[rows[i][0]];
      j    = rows[i][1];

      
      cy = yScale(line.results[j][1])+options.margin.top;
      cx = xScale(line.results[j][0])+options.margin.left;

//    determine position of tooltip      
      position = getTooltipPosition(cx, cy);
      date     = moment(line.results[j][0]).utc().format(DATEFORMAT);
      amt      = commas(line.results[j][1], 2);  
      var name = currencyDropdown.getName(line.address || line.issuer) || line.name;
      
      handleTooltip(name, line.address || line.issuer, date, amt, position);
      handleTracer(cx, cy);
    }
  }


  function movingInGround(section) {
    var tx, ty;
    var zoom = div.style("zoom") || 1;
    var date = xScale.invert(d3.mouse(this)[0]/zoom);
    var i    = d3.bisect(section.values.map(function(d){return d.date}), date);
    
    if (date<(section.values[i].date+section.values[i-1].date)/2) i--;
    var cy  = yScale(section.values[i].y+section.values[i].y0)+options.margin.top;
    var cx  = xScale(section.values[i].date)+options.margin.left;
    var c2y = yScale(section.values[i].y0)+options.margin.top;
 
    
    
//  determine position of tooltip      
    var position = getTooltipPosition(cx, cy);
    var name     = currencyDropdown.getName(section.address);
    var amount   = commas(section.values[i].y, 2);
    date = section.values[i].date.format(DATEFORMAT);
        
    handleTooltip(name, section.address, date, amount, position);
    handleTracer(cx, cy, c2y);
    
  }
  
  function movingOnLine(line) {
    var tx, ty;
    var zoom = div.style("zoom") || 1;
    var date = xScale.invert(d3.mouse(this)[0]/zoom);
    var i    = d3.bisect(line.results.map(function(d){return d[0]}), date);
 
    if (i && date<(line.results[i][0]+line.results[i-1][0])/2) i--;
    var cy  = yScale(line.results[i][1])+options.margin.top;
    var cx  = xScale(line.results[i][0])+options.margin.left;
 
    
    
//  determine position of tooltip      
    var position = getTooltipPosition(cx, cy);
    var name     = currencyDropdown.getName(line.address);
    var amount   = commas(line.results[i][1], 2);
    date = moment(line.results[i][0]).utc().format(DATEFORMAT);
        
    handleTooltip(name, line.address, date, amount, position);
    handleTracer(cx, cy);
        
  }


  function handleTracer (cx, cy, c2y) {
    var dur = 50;
    tracer.select(".top").transition().duration(dur).attr({cx: cx, cy: cy});
    
    if (c2y) {
      tracer.select(".vertical").transition().duration(dur).attr({x1:cx, x2:cx, y1:cy, y2:c2y});
      tracer.select(".horizontal").transition().duration(dur).style("opacity",0);
      tracer.select(".bottom").transition().duration(dur).attr({cx: cx, cy: c2y}).style("opacity",1);
    } else {
      tracer.select(".vertical").transition().duration(dur).attr({x1:cx, x2:cx, y1:options.margin.top, y2:options.height+options.margin.top});
      tracer.select(".horizontal").transition().duration(dur).attr({x1:cx, x2:options.width+options.margin.left, y1:cy, y2:cy}).style("opacity",1);
      tracer.select(".bottom").transition().duration(dur).style("opacity",0);      
    }  
    
    tracer.select(".top").transition().duration(dur).attr({cx: cx, cy: cy});
    tracer.transition().duration(dur).style("opacity",1);  
  }
  
  
  function handleTooltip(title, address, date, amount, position) {
    
    tooltip.html("");
    tooltip.append("h5").html(title).style("color", address ? color(address) : "inherit");
    if (address) tooltip.append("div").html(address)
        .style("color", color(address))
        .attr("class", "address"); 
    tooltip.append("div").html(date).attr("class", "date"); 
    tooltip.append("div").html(amount+" "+self.currency).attr("class", "amount"); 
    tooltip.transition().duration(100).style("left", position[0] + "px")     
      .style("top", position[1] + "px") 
      .style("opacity",1);    
  }
 
 
//filter data to remove hidden items
  function filterByLegend (data, legend) {
    
    var filtered = [];
    for (var i=0; i<legend.length; i++) {
      if (legend[i].hide) continue;
      filtered.push(data[i]);
    }
    
    return filtered;  
  }
  
  
  function getTooltipPosition(cx,cy) {
    var tx, ty;
    if (cx+120>options.width+options.margin.right) tx = cx-260;
    else if (cx-120<options.margin.left) tx = cx+20;
    else tx = cx-120;
    
    if (cy-120<options.margin.top) ty = cy+120;
    else ty = cy-120;
    return [tx,ty];
  }
  
  
  function commas (number, precision) {
    var parts = number.toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    if (precision && parts[1]) parts[1] = parts[1].substring(0,precision);
    return parts.join(".");
  }
  
  function getExtents(axis, data) {
    
    var max, min, rows = data.map(function(d){
        return d3.extent(d.results, function(d){ return axis=="x" ? d[0]:d[1]; });
    });
    
    min = d3.min(rows, function(d){return d[0]});
    max = d3.max(rows, function(d){return d[1]});
    if (axis=="y") max *= 1.1; 
    return [min, max];
  }

  drawChart();
  var range = controls.select(".interval .selected").datum();
  loadData(range);  
}