function CapChart(options) {
  var self = this,
    apiHandler = new ApiHandler(options.url);
    
  var div = d3.select(options.id).attr("class","capitalizationChart");
    
  if (!options.margin) options.margin = {top: 2, right: 60, bottom: 20, left: 60};
  if (!options.width)  options.width  = parseInt(div.style('width'), 10) - options.margin.left - options.margin.right;
  if (!options.height) options.height = options.width/2>400 ? options.width/2 : 400;
  
  self.currency = options.currency;
  
  var currencyDropdown = ripple.currencyDropdown(true).selected({currency:options.currency})
    .on("change", function(currency) {
      self.currency = currency;
      loadData();
  });

  var controls = div.append("div").attr("class","controls");
  controls.call(currencyDropdown);
  
  var xScale = d3.time.scale().range([0, width]),
      yScale = d3.scale.linear().range([height, 0]),
      color  = d3.scale.category20(),
      xAxis  = d3.svg.axis().scale(xScale).orient("bottom"),
      yAxis  = d3.svg.axis().scale(yScale).orient("right").tickFormat(d3.format("s"));
      
  var area = d3.svg.area()
    .x(function(d) { return xScale(d.date); })
    .y0(function(d) { return yScale(d.y0); })
    .y1(function(d) { return yScale(d.y0 + d.y); });
    
  var stack = d3.layout.stack().values(function(d) { return d.values; });  
  
  var svg, borders, 
    verticalTracer, horizontalTracer, topTracer, bottomTracer, 
    tooltip, loader;
  
  loadData(options.currency);
  
  function loadData () {
    
  }
  
  function drawChart() {
    div.html("");
    svg = div.append("svg").attr({width: width + margin.left + margin.right, height: height + margin.top + margin.bottom})
      .on("mousemove", movingInSky)
      .append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");
      
    var lineAttributes = {stroke: "black", "stroke-width": 0.5};
    var borderAttributes = { stroke: "#888", "stroke-width":0.5};
    
    borders = svg.append("g");
    borders.append("line").attr(borderAttributes).attr("x2",width);
    borders.append("line").attr(borderAttributes).attr("y2",height);
    borders.append("line").attr(borderAttributes).attr({y1:height, x2:width, y2:height});
    borders.append("line").attr(borderAttributes).attr({x1:width,  x2:width, y2:height});  
    
    tooltip = div.append("div").attr("class", "tooltip");
    loader  = div.append("img")
      .attr("class", "loader")
      .attr("src", "assets/images/throbber5.gif")
      .style("opacity", 0);   
  }
  
  function drawData() {
    
  } 
   
}