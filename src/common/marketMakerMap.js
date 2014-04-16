var MarketMakerMap = function (options){
  var self     = this,
    apiHandler = new ApiHandler(options.url);
  
  var base, counter, accounts, treemap;
  var div    = d3.select("#"+options.id).attr("class", "traderMap");
  var metric = options.metric || "volume";
  var period = options.period || "24h";
  var color  = d3.scale.pow().exponent(0.35).range(['#ccc', "#039"]); 
  
  var metricSelect = div.append("div").attr("class","metricSelect")
    .selectAll("span").data(["volume","count"])
    .enter().append("span")
    .text(function(d){return d})
    .classed("selected", function(d) { return d === metric })
    .on("click", function(d){
      var that = this;
      metricSelect.classed("selected", function() { return this === that; });
      metric = d;
      if (1) {
        drawData();
      } else {
        color.domain(d3.extent(accounts.children, function(d){return metric=="volume" ? d[1] : d[3]}));
        map.datum(accounts).selectAll(".node").data(treemap.nodes)
          .transition().duration(500)
          .style("background", colorFunction)
          .call(position);
      }
        
      drawTable();
    });  
  
  var periodSelect = div.append("div").attr("class","periodSelect")
    .selectAll("span").data(["24h","3d","7d","30d"])
    .enter().append("span")
    .text(function(d){return d})
    .classed("selected", function(d) { return d === period })
    .on("click", function(d){
      var that = this;
      periodSelect.classed("selected", function() { return this === that; });
      self.load(null, null, d);
    });
    
  var wrap   = div.append("div").attr("class","wrap");
  var width  = options.width  ? options.width  : parseInt(wrap.style('width'), 10);
  var height = options.height ? options.height : parseInt(wrap.style('height'), 10);
  
  if (!height) height = options.width/2>400 ? options.width/2 : 400;

  var map = wrap.append("div")
    .attr("class","map")
    .style("position", "relative")
    .style("width", width + "px")
    .style("height", height + "px"); 
      
  var table = wrap.append("div").attr("class","accountsTable");
    table.append("div").attr("class","accountsHeader");
    table.select(".accountsHeader").append("div").html("Address");
    table.select(".accountsHeader").append("div").html("Volume");
    table.select(".accountsHeader").append("div").html("% of Volume");
    table.select(".accountsHeader").append("div").html("# of Trades");
    table.select(".accountsHeader").append("div").html("% of Trades");
    table.select(".accountsHeader").append("div").html("Buy/Sell");
    
  var tooltip = wrap.append("div").attr("class", "tooltip");
    tooltip.append("div").attr("class", "name");
    tooltip.append("div").attr("class", "address");
    tooltip.append("div").attr("class","volume");
    tooltip.append("div").attr("class","count");
        
  if (options.resize && typeof addResizeListener === 'function') {
    addResizeListener(window, resizeMap);
  } 
  
  //function called whenever the window is resized (if resizable)    
  function resizeMap () {
    old    = width;
    width  = parseInt(wrap.style('width'), 10);
    height = options.height ? options.height : parseInt(wrap.style('height'), 10);
    if (!height) height = options.width/2>400 ? options.width/2 : 400;
    
    if (old != width) { 
      map.style("width", width + "px").style("height", height + "px");
      if (treemap) {
        treemap.size([width, height]); 
        map.datum(accounts).selectAll(".node").data(treemap.nodes).call(position);
      }  
    } 
  }
  
  this.load = function (b, c, p, m) {
    if (b) base    = b;
    if (c) counter = c;
    if (p) period  = p;
    if (m) metric  = m;
    
    console.log(period);
    
    apiHandler.marketMakers({
      base      : base,
      counter   : counter,
      period    : period,
      transactions : true
    
    }, function(error, data){
      if (error) return console.log(error);
      //console.log(data);
      data.shift(); //remove header row
      
      accounts = {
        name       : base.currency+"."+base.issuer,
        volume     : 0.0,
        count      : 0,
        children   : data
      }
      
      data.forEach(function(d){
        accounts.volume += d[1];
        accounts.count  += d[3];
      });
      
      map.html("");
      drawData();
      drawTable();
    });
  }
  
  function drawData (resize) {    
    
    treemap = d3.layout.treemap()
      .size([width, height])
      .sticky(true)
      .value(function(d) { return metric=="volume" ? d[1] : d[3]; });
    
    if (!accounts.count) return;
    color.domain(d3.extent(accounts.children, function(d){return metric=="volume" ? d[1] : d[3]}));
    var node = map.datum(accounts).selectAll(".node").data(treemap.nodes);
    
    var nodeEnter = node.enter().append("div")
          .attr("id", function(d){ return d[0] ? "node_"+d[0] : null})
          .attr("class", "node")
          .on('mouseover', function(d){
            showTooltip(d);
          }).on('mouseout', function(d){
            hideTooltip(d);
          });
    
    node.transition().duration(500)
      .style("background", colorFunction)
      .call(position);
      
    node.exit().remove();
  }  
 
  function drawTable () {
    var row = table.selectAll(".account").data(accounts.children);
     
    var rowEnter = row.enter()
      .append("div")
      .attr("class", "account")
     
    rowEnter.append("div").attr("class","address");
    rowEnter.append("div").attr("class","volume");
    rowEnter.append("div").attr("class","volumePCT");
    rowEnter.append("div").attr("class","count");
    rowEnter.append("div").attr("class","countPCT");  
    rowEnter.append("div").attr("class","buySell"); 
    
    row.select(".address").html(function(d){return d[0]});
    row.select(".volume").html(function(d){return commas(d[1],4)+" <small>"+base.currency+"</small>"});
    row.select(".volumePCT").html(function(d){return commas(100*d[1]/accounts.volume,2)+"%"});
    row.select(".count").html(function(d){return d[3]});
    row.select(".countPCT").html(function(d){return commas(100*d[3]/accounts.count,2)+"%"});
    row.select(".buySell").html(function(d){return commas(100*d[4]/d[1],0)+"/"+commas(100*d[7]/d[1],0);})
      .classed("buy",  function(d){return (d[4]-d[7])/d[1]>0.04})  //overall buyer
      .classed("sell", function(d){return (d[7]-d[4])/d[1]>0.04}); //overall seller 
      
    row.exit().remove();    
  }
  
  function showTooltip (d) {
    if (!d[0]) return hideTooltip(d);
    var volume, count;
    d3.select("#"+d[0])
      .classed("selected",true)
      .transition().style("opacity", 1);
      
    tooltip.select(".address").html(d[0]);
    
    volume   = commas(d[1],4)+" "+base.currency+" ("+commas(100*d[1]/accounts.volume,2)+"%)";
    count    = d[3]+" ("+100*commas(d[3]/accounts.count,2)+"%)";

    tooltip.select(".volume").html("<label>Total Volume:</label>"+volume);   
    tooltip.select(".count").html("<label># of transactions:</label>"+count); 
    tooltip.transition()
      .style("opacity",1)
      .style("left", (d.x+40)+"px")
      .style("top", (d.y+40)+"px");   
  }
  
  function hideTooltip (d) {
    d3.select("#"+d[0])
      .classed("selected",false)
      .transition().style("opacity","");
      
    tooltip.transition().style("opacity",0);       
  }
  
  function position() {
    this.style("left", function(d) { return d.x + "px"; })
      .style("top", function(d) { return d.y + "px"; })
      .style("width", function(d) { return Math.max(0, d.dx - 1) + "px"; })
      .style("height", function(d) { return Math.max(0, d.dy - 1) + "px"; });
  }
  
  function colorFunction (d) { 
    if(!d[0]) return null;
    if      (metric=="volume") return color(d[1]);
    else if (metric=="count") return color(d[3]);
    return null;
  }  
}