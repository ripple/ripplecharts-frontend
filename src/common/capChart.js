function CapChart(options) {
  var self     = this,
    apiHandler = new ApiHandler(options.url);
    
  var div      = d3.select(options.id).attr("class", "capChart");
  var controls = div.append("div").attr("class","controls");
  var chart    = div.append("div").attr("class","chart");
   
  if (!options.margin) options.margin = {top: 5, right: 60, bottom: 20, left: 60};
  if (!options.width)  options.width  = parseInt(div.style('width'), 10) - options.margin.left - options.margin.right;
  if (!options.height) options.height = options.width/2>500 ? options.width/2 : 500;
  
  self.currency = options.currency;
  
  var isBlank = true;
  var currencyList = ['BTC','USD','CNY','EUR','GBP','JPY','ILS','LTC'];
  var currencyDropdown = ripple.currencyDropdown(currencyList).selected({currency:options.currency})
    .on("change", function(currency) {
      self.currency = currency;
      var d = controls.select(".interval .selected").datum();
      loadData(d);
  });

  controls.append("div").attr("class","currencyDropdowns").call(currencyDropdown);
  var type = controls.append("div").attr("class", "chartType selectList").selectAll("a")
    .data(["line","stacked"])
    .enter().append("a")
    .attr("href", "#")
    .classed("selected", function(d) { return d === (options.type || "line")})
    .text(function(d) { return d })
    .on("click", function(d){
      d3.event.preventDefault();
      var that = this;
      type.classed("selected", function() { return this === that; });
      self.type = d;
      drawData();
    });
  
  var interval = controls.append("div").attr("class","interval selectList").selectAll("a")
    .data([
      //{name: "15m", interval:"minute", multiple:15, offset: function(d) { return d3.time.day.offset(d, -2); }},
      {name: "week",   interval:"hour",  offset: function(d) { return d3.time.day.offset(d, -7); }},
      {name: "month",  interval:"hour",  offset: function(d) { return d3.time.month.offset(d, -1); }},
      {name: "quarter",interval:"day",   offset: function(d) { return d3.time.month.offset(d, -3); }},
      {name: "year",   interval:"day",   offset: function(d) { return d3.time.year.offset(d, -1); }},
      {name: "max",    interval:"month", offset: function(d) { return d3.time.year.offset(d, -3); }}
    ])
  .enter().append("a")
    .attr("href", "#")
    .classed("selected", function(d) { return d.name === (options.range || "max")})
    .text(function(d) { return d.name; })
    .on("click", function(d){
      d3.event.preventDefault();
      var that = this;
      interval.classed("selected", function() { return this === that; });
      if (d.name == "custom") {
        //$('#range').slideToggle();    
      } else {
        console.log(d);
        loadData(d);
      }
    });
  
  var xScale = d3.time.scale().range([0, options.width]),
      yScale = d3.scale.linear().range([options.height, 0]),
      color  = d3.scale.category20(),
      xAxis  = d3.svg.axis().scale(xScale).orient("bottom"),
      yAxis  = d3.svg.axis().scale(yScale).orient("right").tickFormat(d3.format("s"));
      
  var area = d3.svg.area()
    .x(function(d) { return xScale(d.date); })
    .y0(function(d) { return yScale(d.y0); })
    .y1(function(d) { return yScale(d.y0 + d.y); });
    
  var stack = d3.layout.stack().values(function(d) { return d.values; });  
  
  var svg, g, timeAxis, amountAxis, borders, sections,
    tracer, tooltip, loader;
  
  var dataCache  = {};
  var seriesList = {};
  
  function loadData (d) {
    
    self.range = d.name;
    isBlank = true;
    loader.transition().style("opacity",1);
    if (dataCache[self.currency] &&
        dataCache[self.currency][self.range]) {
      drawData();
      return;  
    } 
    
    var end     = moment.utc();
    var issuers = currencyDropdown.getIssuers(self.currency);    
    var pairs = issuers.map(function(d){
      return {
        currency : self.currency,
        issuer   : d
      }
    });
    
    var currencies = [self.currency];
    var gateways   = issuers.map(function(d){
      return d;
    });
    
    console.log(currencies);
    console.log(gateways);
    
    //console.log(pairs);
    
    if (self.request) self.request.abort();
    self.request = apiHandler.issuerCapitalization({
      currencies : currencies,
      gateways   : gateways,
      timeIncrement : d.interval,
      //pairs     : pairs,
      startTime  : d.offset(end),
      endTime    : end
    }, function(response){
      if (!dataCache[self.currency]) dataCache[self.currency] = {};
      dataCache[self.currency][self.range] = {raw : response};
 
      prepareStackedData();
      prepareLineData();
      drawData();
      
    }, function (error){
      console.log(error);
      setStatus(error.text ? error.text : "Unable to load data");
    });    
  }
  
  function prepareLineData() {
    var raw = dataCache[self.currency][self.range].raw;
    var totals = {}, series;
    
    for (var i=0; i<raw.length; i++) {
      series = raw[i];
      
      for (var j=0; j<series.results.length; j++) {
        var timestamp = series.results[j][0];
        totals[timestamp]  = (totals[timestamp] || 0) + series.results[j][1];
      }
    }
  
    var t = [];
    for (var key in totals) {
      t.push([key,totals[key]]);
    }
    
    
    dataCache[self.currency][self.range].totals ={
      name    : "Total",
      address : "",
      results : t
    };  
  }
  

  
  function prepareStackedData() {
    var raw = dataCache[self.currency][self.range].raw;
    var timestamps = [];
    var stacked = [];

//  get all timestamps and set up data for the stacked chart    
    for (var i=0; i<raw.length; i++) {
      series = raw[i];

      stacked[i] = {
        name    : series.name,
        address : series.address,
        data    : {}
      };
      
      for (var j=0; j<series.results.length; j++) {
        var timestamp = series.results[j][0];
        stacked[i].data[timestamp] = series.results[j][1];
        timestamps.push(series.results[j][0]);
      }
    }

    timestamps.sort(function(a,b){return a-b});
//  add 0's for empty timestamps    
    for (k=0; k<stacked.length; k++) {
      var data = stacked[k].data;
      var amount;
      
      stacked[k].values = [];
      for (var m=0; m<timestamps.length; m++) {
        stacked[k].values.push({
          date : moment(parseInt(timestamps[m], 10)),
          y    : data[timestamps[m]] || 0
        });
      } 
    }  
    
    dataCache[self.currency][self.range].stacked = stacked;  
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
        
    //borders.append("line").attr(borderAttributes).attr("x2",options.width);
    //borders.append("line").attr(borderAttributes).attr("y2",options.height);
    //borders.append("line").attr(borderAttributes).attr({y1:options.height, x2:options.width, y2:options.height});
    //borders.append("line").attr(borderAttributes).attr({x1:options.width,  x2:options.width, y2:options.height});  
    
    timeAxis   = g.append("g").attr({class: "x axis", transform: "translate(0,"+ options.height+")"});
    amountAxis = g.append("g").attr({class: "y axis", transform: "translate("+options.width+",0)"});
      
    tracer = svg.append("g").attr("class", "tracer");
    tracer.append("line").attr("class","vertical");
    tracer.append("line").attr("class","horizontal");
    tracer.append("circle").attr("class","top").attr("r", 4);
    tracer.append("circle").attr("class","bottom").attr("r",4);
          
    tooltip = chart.append("div").attr("class", "tooltip");
    loader  = chart.append("img")
      .attr("class", "loader")
      .attr("src", "assets/images/throbber5.gif")
      .style("opacity", 0);   
  }
  
  function drawData() {
    var data;
    
    loader.transition().style("opacity",0);
    
    if (self.type=="stacked") {
      svg.selectAll('.line').remove();
      data     = dataCache[self.currency][self.range].stacked;
      sections = stack(data);
      
      color.domain(data.map(function(d){return d.address}));  
      xScale.domain(d3.extent(data[0].values, function(d){return d.date}));
      yScale.domain([0, d3.sum(data, function(d){
        return d3.max(d.values, function(v){return v.y});
      })]);
    
      var section = g.selectAll("g.section").data(sections);
      section.enter().append("g").attr("class","section");
      section.exit().remove();
  
      var path = section.selectAll("path").data(function(d){return[d]});
      path.enter().append("path").on("mousemove", movingInGround);
      path.transition().attr({class: "area", d: function(d) { return area(d.values); } })
        .style("fill", function(d) { return color(d.address); });

      path.exit().remove();
      
      timeAxis.call(xAxis);
      amountAxis.call(yAxis);
      isBlank = false;
    } else {
      svg.selectAll('.section').remove();
      data = dataCache[self.currency][self.range].raw.slice();  //make a copy
      data.push(dataCache[self.currency][self.range].totals);
      
      console.log(data);
      
      var totals = data[data.length-1].results;
      
      color.domain(data.map(function(d){return d.address})); 
      xScale.domain(d3.extent(totals, function(d){return d[0]}));
      yScale.domain([0, d3.max(totals, function(d){return d[1]})]);

      var line = g.selectAll("g.line").data(data);
      line.enter().append("g").attr("class","line");
      line.exit().remove();
      
      var p = line.selectAll("path").data(function(d){return[d]});
      p.enter().append("path").on("mouseover", movingOnLine);
        
      p.transition().attr("d", function(d) {
         var l = d3.svg.line()
          .x(function(d) { return xScale(d[0]); })
          .y(function(d) { return yScale(d[1]); }); 
          return l(d.results);
      }).style("stroke", function(d) { return color(d.address); })
        
      p.exit().remove();

    }
  } 
  
  function movingInSky() {
    if (!isBlank) {
      var tx, ty;
      var top = sections[sections.length-1].values;
      var date  = xScale.invert(d3.mouse(this)[0]);
      var i   = d3.bisect(top.map(function(d){return d.date}), date);
   
      if (date<(top[i].date+top[i-1].date)/2) i--;
      var cy = yScale(top[i].y+top[i].y0)+options.margin.top;
      var cx = xScale(top[i].date)+options.margin.left;

      
      tracer.select(".vertical").transition().duration(50).attr({x1:cx, x2:cx, y1:options.margin.top, y2:options.height+options.margin.top});
      tracer.select(".horizontal").transition().duration(50).attr({x1:cx, x2:options.width+options.margin.left, y1:cy, y2:cy}).style("opacity",1);
      tracer.select(".top").transition().duration(50).attr({cx: cx, cy: cy});
      tracer.select(".bottom").transition().duration(50).style("opacity",0);
      tracer.transition().duration(50).style("opacity",1);

//    determine position of tooltip      
      var position = getTooltipPosition(cx, cy);
            
      tooltip.html("");
      tooltip.append("h5").html("Total");
      tooltip.append("div")
        .html(top[i].date.format("MMMM D YYYY"))
        .attr("class", "date"); 
      tooltip.append("div")
        .html(commas(top[i].y+top[i].y0, 2))
        .attr("class", "amount"); 
      tooltip.transition().duration(100).style("left", position[0] + "px")     
        .style("top", position[1] + "px") 
        .style("opacity",1);
    }
  }

  function movingInGround(section) {
    if (!isBlank) {
      var tx, ty;
      var date = xScale.invert(d3.mouse(this)[0]);
      var i    = d3.bisect(section.values.map(function(d){return d.date}), date);
   
      if (date<(section.values[i].date+section.values[i-1].date)/2) i--;
      var cy  = yScale(section.values[i].y+section.values[i].y0)+options.margin.top;
      var cx  = xScale(section.values[i].date)+options.margin.left;
      var c2y = yScale(section.values[i].y0)+options.margin.top;
   
      tracer.select(".vertical").transition().duration(50).attr({x1:cx, x2:cx, y1:cy, y2:c2y});
      tracer.select(".horizontal").transition().duration(50).style("opacity",0);
      tracer.select(".top").transition().duration(50).attr({cx: cx, cy: cy});
      tracer.select(".bottom").transition().duration(50).attr({cx: cx, cy: c2y}).style("opacity",1);
      tracer.transition().duration(50).style("opacity",1);
      
//    determine position of tooltip      
      var position = getTooltipPosition(cx, cy);
            
      tooltip.html("");
      tooltip.append("h5").html(currencyDropdown.getName(section.address))
        .style("color", color(section.address));
      tooltip.append("div").html(section.address)
        .style("color", color(section.address))
        .attr("class", "address");  
      tooltip.append("div")
        .attr("class", "date")
        .html(section.values[i].date.format("MMMM D YYYY"));
      tooltip.append("div")
        .attr("class", "amount")
        .html(commas(section.values[i].y, 2));
        
      tooltip.transition().duration(100).style("left", position[0] + "px")     
        .style("top", position[1] + "px") 
        .style("opacity",1);
      
      //d3.event.stopPropagation();
    }
  }
  
  function movingOnLine(d) {
    console.log(d);
  }
  
  function getTooltipPosition(cx,cy) {
    var tx, ty;
    if (cx+120>options.width+options.margin.right) tx = cx-260;
    else if (cx-120<options.margin.left) tx = cx+20;
    else tx = cx-120;
    
    if (cy-80<options.margin.top) ty = cy+80;
    else ty = cy-80;
    return [tx,ty];
  }
  
  function commas (number, precision) {
    var parts = number.toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    if (precision && parts[1]) parts[1] = parts[1].substring(0,precision);
    return parts.join(".");
  }

  
  drawChart();
  controls.select(".interval .selected")[0][0].click();
}