var MarketMakerMap = function (options){
  var self     = this,
    apiHandler = new ApiHandler(options.url);
  
  var base, counter, accounts, treemap, isLoading, inTransition;
  var div    = d3.select("#"+options.id).attr("class", "traderMap");
  var metric = options.metric || "volume";
  var period = options.period || "24h";
  var color  = d3.scale.pow().exponent(0.35).range(['#ccc', "#003099"]); 
  
  var metricSelect = div.append("div").attr("class","metricSelect selectList");
  
  metricSelect.append("label").html("Metric:");
  metricSelect.selectAll("a").data(["volume","count"])
    .enter().append("a")
    .text(function(d){return d})
    .classed("selected", function(d) { return d === metric })
    .on("click", function(d){
      var that = this;
      metricSelect.selectAll("a").classed("selected", function() { return this === that; });
      metric = d;
      accounts.children.sort(function(a,b){return metric=="volume" ? b[1]-a[1] : b[3]-a[3]});
      
      if (0) {
        drawData();
      } else {
        inTransition = true;
        color.domain(d3.extent(accounts.children, function(d){return metric=="volume" ? d[1] : d[3]}));
        map.datum(accounts).selectAll(".node").data(treemap.nodes)
          .attr("id", function(d){ return d[0] ? "node_"+d[0] : null})
          .transition().duration(500)
          .style("background", colorFunction)
          .call(position).each("end",function(){ inTransition=false });
      }
        
      drawTable();
    });  
  
  var periodSelect = div.append("div").attr("class","periodSelect selectList");
  
  periodSelect.append("label").html("Period:");
  periodSelect.selectAll("a").data(["24h","3d","7d","30d"])
    .enter().append("a")
    .text(function(d){return d})
    .classed("selected", function(d) { return d === period })
    .on("click", function(d){
      var that = this;
      periodSelect.selectAll("a").classed("selected", function() { return this === that; });
      self.load(null, null, d);
    });
    
  var wrap   = div.append("div").attr("class","wrap");
  var width  = options.width  ? options.width  : parseInt(wrap.style('width'), 10);
  var height = 350;

  var map = wrap.append("div")
    .attr("class","map")
    .style("width", width + "px")
    .style("height", height + "px"); 
  
  var status = wrap.append("div")
    .attr("class","status");
    
  var loader = wrap.append("img")
    .attr("class", "loader")
    .attr("src", "assets/images/rippleThrobber.png");
      
  var table = div.append("div").attr("class","accountsTable");
    table.append("div").attr("class","accountsHeader");
    table.select(".accountsHeader").append("div").html("Address");
    table.select(".accountsHeader").append("div").html("Volume");
    table.select(".accountsHeader").append("div").html("% of Volume");
    table.select(".accountsHeader").append("div").html("# of Trades");
    table.select(".accountsHeader").append("div").html("% of Trades");
    table.select(".accountsHeader").append("div").html("Buy/Sell");
    
  var tooltip = div.append("div").attr("class", "tooltip");
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
    
    isLoading = true;
    loader.transition().style("opacity",1);
    map.transition().style("opacity",0.5);
    
    apiHandler.marketMakers({
      base      : base,
      counter   : counter,
      period    : period,
      transactions : true
    
    }, function(error, data){
      
      isLoading = false;
      
      if (error) return setStatus(error.text ? error.text : "Unable to load data");
      
      data.shift(); //remove header row
      data.sort(function(a,b){return metric=="volume" ? b[1]-a[1] : b[3]-a[3]});
      
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
  
  function drawData () {    
    inTransition = true;
    map.transition().style("opacity",1);
    loader.transition().style("opacity",0);
    if (accounts.count) setStatus("");
    else return setStatus("No offers exercised for this period.");
    
      
    treemap = d3.layout.treemap()
      .size([width, height])
      .value(function(d) { return metric=="volume" ? d[1] : d[3]; });
    
    if (!accounts.count) return;
    color.domain(d3.extent(accounts.children, function(d){return metric=="volume" ? d[1] : d[3]}));
    var node = map.datum(accounts).selectAll(".node").data(treemap.nodes);
    
    var nodeEnter = node.enter().append("div")
          .attr("class", "node")
          .on('mouseover', function(d){
            if (!inTransition) showTooltip(d, d3.select(this));
          }).on('mouseout', function(d){
            if (!inTransition) hideTooltip(d, d3.select(this));
          });
    
    node.attr("id", function(d){ return d[0] ? "node_"+d[0] : null})
      .transition().duration(500)
      .style("background", colorFunction)
      .call(position).each("end",function(){ inTransition=false });
      
    node.exit().remove();
  }  
 
  function drawTable () {
    var row = table.selectAll(".account").data(accounts.children);
     
    var rowEnter = row.enter()
      .append("div")
      .attr("class", "account")
      .on("mouseover", function(d){
        if (!inTransition) d3.select("#node_"+d[0]).classed("selected",true).transition().style("opacity", 1);
        d3.select(this).classed("selected",true);        
      }).on("mouseout", function(d){
        if (!inTransition) d3.select("#node_"+d[0]).classed("selected",true).transition().style("opacity", "");
        d3.select(this).classed("selected",false);        
      });
     
    rowEnter.append("div").attr("class","address");
    rowEnter.append("div").attr("class","volume");
    rowEnter.append("div").attr("class","volumePCT");
    rowEnter.append("div").attr("class","count");
    rowEnter.append("div").attr("class","countPCT");  
    rowEnter.append("div").attr("class","buySell"); 
  
    
    row.attr('id', function(d){return "row_"+d[0]})
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
  
  function showTooltip (d, node) {
    if (!d[0]) return hideTooltip(d);
    var volume, count, top, left;
    
    node.classed("selected",true).transition().style("opacity", 1);
    d3.select("#row_"+d[0]).classed("selected",true);
     
    tooltip.select(".address").html(d[0]);
    
    volume   = "<b>"+commas(d[1],4)+" <small>"+base.currency+"</small></b> ("+commas(100*d[1]/accounts.volume,2)+"%)";
    count    = "<b>"+d[3]+"</b> ("+commas(100*d[3]/accounts.count,2)+"%)";
    left     = d.x+300>width  ? width-300 : d.x+60;
    top      = d.y+160>height ? height-160 : d.y+60;
    if (left<20) left = 20;
    if (top<20)  top  = 20;
    
    tooltip.select(".volume").html("<label>Total Volume:</label>"+volume);   
    tooltip.select(".count").html("<label># of Transactions:</label>"+count); 
    tooltip.transition()
      .style("opacity",1)
      .style("left", left+"px")
      .style("top", top+"px");   
  }
  
  function hideTooltip (d, node) {
    node.classed("selected",true).transition().style("opacity", "");
    
    d3.select("#row_"+d[0]).classed("selected",false); 
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
  
  function setStatus(string) {
    status.html(string)
    if (string) {
      loader.transition().style("opacity",0);
    }
  } 
}


/*
var margin = {top: 20, right: 0, bottom: 0, left: 0},
    width = 960,
    height = 500 - margin.top - margin.bottom,
    formatNumber = d3.format(",d"),
    transitioning;

var x = d3.scale.linear()
    .domain([0, width])
    .range([0, width]);

var y = d3.scale.linear()
    .domain([0, height])
    .range([0, height]);

var treemap = d3.layout.treemap()
    .children(function(d, depth) { return depth ? null : d._children; })
    .sort(function(a, b) { return a.value - b.value; })
    .ratio(height / width * 0.5 * (1 + Math.sqrt(5)))
    .round(false);

var svg = d3.select("#chart").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.bottom + margin.top)
    .style("margin-left", -margin.left + "px")
    .style("margin.right", -margin.right + "px")
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
    .style("shape-rendering", "crispEdges");

var grandparent = svg.append("g")
    .attr("class", "grandparent");

grandparent.append("rect")
    .attr("y", -margin.top)
    .attr("width", width)
    .attr("height", margin.top);

grandparent.append("text")
    .attr("x", 6)
    .attr("y", 6 - margin.top)
    .attr("dy", ".75em");

d3.json("flare.json", function(root) {
  initialize(root);
  accumulate(root);
  layout(root);
  display(root);

  function initialize(root) {
    root.x = root.y = 0;
    root.dx = width;
    root.dy = height;
    root.depth = 0;
  }

  // Aggregate the values for internal nodes. This is normally done by the
  // treemap layout, but not here because of our custom implementation.
  // We also take a snapshot of the original children (_children) to avoid
  // the children being overwritten when when layout is computed.
  function accumulate(d) {
    return (d._children = d.children)
        ? d.value = d.children.reduce(function(p, v) { return p + accumulate(v); }, 0)
        : d.value;
  }

  // Compute the treemap layout recursively such that each group of siblings
  // uses the same size (1×1) rather than the dimensions of the parent cell.
  // This optimizes the layout for the current zoom state. Note that a wrapper
  // object is created for the parent node for each group of siblings so that
  // the parent’s dimensions are not discarded as we recurse. Since each group
  // of sibling was laid out in 1×1, we must rescale to fit using absolute
  // coordinates. This lets us use a viewport to zoom.
  function layout(d) {
    if (d._children) {
      treemap.nodes({_children: d._children});
      d._children.forEach(function(c) {
        c.x = d.x + c.x * d.dx;
        c.y = d.y + c.y * d.dy;
        c.dx *= d.dx;
        c.dy *= d.dy;
        c.parent = d;
        layout(c);
      });
    }
  }

  function display(d) {
    grandparent
        .datum(d.parent)
        .on("click", transition)
      .select("text")
        .text(name(d));

    var g1 = svg.insert("g", ".grandparent")
        .datum(d)
        .attr("class", "depth");

    var g = g1.selectAll("g")
        .data(d._children)
      .enter().append("g");

    g.filter(function(d) { return d._children; })
        .classed("children", true)
        .on("click", transition);

    g.selectAll(".child")
        .data(function(d) { return d._children || [d]; })
      .enter().append("rect")
        .attr("class", "child")
        .call(rect);

    g.append("rect")
        .attr("class", "parent")
        .call(rect)
      .append("title")
        .text(function(d) { return formatNumber(d.value); });

    g.append("text")
        .attr("dy", ".75em")
        .text(function(d) { return d.name; })
        .call(text);

    function transition(d) {
      if (transitioning || !d) return;
      transitioning = true;

      var g2 = display(d),
          t1 = g1.transition().duration(750),
          t2 = g2.transition().duration(750);

      // Update the domain only after entering new elements.
      x.domain([d.x, d.x + d.dx]);
      y.domain([d.y, d.y + d.dy]);

      // Enable anti-aliasing during the transition.
      svg.style("shape-rendering", null);

      // Draw child nodes on top of parent nodes.
      svg.selectAll(".depth").sort(function(a, b) { return a.depth - b.depth; });

      // Fade-in entering text.
      g2.selectAll("text").style("fill-opacity", 0);

      // Transition to the new view.
      t1.selectAll("text").call(text).style("fill-opacity", 0);
      t2.selectAll("text").call(text).style("fill-opacity", 1);
      t1.selectAll("rect").call(rect);
      t2.selectAll("rect").call(rect);

      // Remove the old node when the transition is finished.
      t1.remove().each("end", function() {
        svg.style("shape-rendering", "crispEdges");
        transitioning = false;
      });
    }

    return g;
  }

  function text(text) {
    text.attr("x", function(d) { return x(d.x) + 6; })
        .attr("y", function(d) { return y(d.y) + 6; });
  }

  function rect(rect) {
    rect.attr("x", function(d) { return x(d.x); })
        .attr("y", function(d) { return y(d.y); })
        .attr("width", function(d) { return x(d.x + d.dx) - x(d.x); })
        .attr("height", function(d) { return y(d.y + d.dy) - y(d.y); });
  }

  function name(d) {
    return d.parent
        ? name(d.parent) + "." + d.name
        : d.name;
  }
});

*/