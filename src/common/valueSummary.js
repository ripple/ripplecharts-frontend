var ValueSummary = function (options) {
  var self = this,
    outer  = options.id ? 
      d3.select("#"+options.id).attr("class","valueSummary") :
      d3.select("body").append("div").attr("class","valueSummary");
  
  var inner  = outer.append("div").attr("class","inner");
  
  var width  = parseInt(outer.style("width"),  10),
    height   = parseInt(outer.style("height"), 10) || width;
    radius   = (Math.min(width, height)) / 2;
    margin   = {top:radius/10, bottom:radius/10, left:radius/10, right:radius/10};

    inner.style({width:(radius*2)+"px", height:(radius*2)+"px"});
    radius -= margin.top;
    
  var chart = inner.append('svg')
    .attr("width",  width)
    .attr("height", height)
    .append("g")
    .attr("transform", "translate(" + (radius+margin.left) + "," + (radius+margin.top) + ")");

  var color = d3.scale.category20();
  
  var arc   = d3.svg.arc()
      .outerRadius(radius*0.9)
      .innerRadius(radius*0.4);
          
  var labelArc = d3.svg.arc()
      .outerRadius(radius*1.15)
      .innerRadius(radius);
         
  //function for determining arc angles.
  function arcTween(b) {
    var c = this._current;
    if (!c) {
      c = chart.select("path:nth-last-child(2)")[0][0]._current;
      if (c) c.startAngle = c.endAngle;
    }
    
    if (!c) c = {startAngle: 1.1*Math.PI, endAngle: 1.1*Math.PI}; 
    var i = d3.interpolate(c, b);
    this._current = i(0);
    return function(t) { 
      return arc(i(t));
    };
  }
  
  //arc paths
  var path = chart.selectAll("path");     
  
  
  //load a specific metric
  this.load = function (z, exchange) {
    
    data = z.components;
    
    //check for XRP - it wont be present for trade volume, so add it at 0
    var hasXRP = false;
    data.forEach(function(d){
      if (d.currency=='XRP') hasXRP = true; 
      d.percent = d.convertedAmount/z.total*100;
    });
    if (!hasXRP) data.push({convertedAmount:0.0});     
      
    var pie = d3.layout.pie()
        .sort(null)
        .startAngle(1.1*Math.PI)
        .endAngle(3.1*Math.PI)
        .value(function(d) { return d.convertedAmount; });
      
    //add arcs      
    path = path.data(pie(data));
    path.enter().append("path").on('mousemove',function(d){
      d3.select(this).transition().duration(50).style("opacity",1);
    }).on('mouseout', function(d){
      d3.select(this).transition().duration(50).style("opacity", "");
    });
    
    var pathUpdate = chart.selectAll("path")
      .style("fill", function(d, i) { return color(i); })
      .transition().duration(750).attrTween("d", arcTween)
      .attr("id", function(d, i){return "arc_"+i});
      
    path.exit().remove();
    
    
    //add labels
    label = inner.selectAll("label").data(path.data());
    
    label.enter().append("label");
      
    label.html(function(d){
        if (!d.data.currency && !d.data.base) return "";
        if (d.data.percent<1) return "";
        
        var label = d.data.currency || d.data.base.currency+"/"+d.data.counter.currency;
        return label+"<b>"+commas(d.data.percent,0)+"%</b>";
      })
      .style("margin-top", function(d){
        return ((0 - parseInt(d3.select(this).style("height"), 10))/2)+"px";
      })
      .style("margin-left", function(d){
        return ((0 - parseInt(d3.select(this).style("width"), 10))/2)+"px";
      })
      .transition().duration(500)
      .style("top", function(d){
        return (labelArc.centroid(d)[1]+125)+"px";
      })
      .style("left", function(d){
        return (labelArc.centroid(d)[0]+125)+"px";
      }); 
      
    label.exit().remove();
  }
}
