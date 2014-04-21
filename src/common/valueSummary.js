var ValueSummary = function (options) {
  var self = this,
    outer  = options.id ? 
      d3.select("#"+options.id).attr("class","valueSummary") :
      d3.select("body").append("div").attr("class","valueSummary");
  
  var inner = outer.append("div").attr("class","inner");

  
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

  var color = d3.scale.ordinal()
    .range(["#3399FF", "#5DAEF8", "#86C3FA", "#ADD6FB", "#D6EBFD"]);

  var arc = d3.svg.arc()
      .outerRadius(radius)
      .innerRadius(radius*0.4);

  var pie = d3.layout.pie()
      .sort(null)
      .startAngle(1.1*Math.PI)
      .endAngle(3.1*Math.PI)
      .value(function(d) { return d.value; });
      
//  var enterAntiClockwise = {
//    startAngle : Math.PI * 2,
//    endAngle   : Math.PI * 2
//  };
    


  function tweenPie(b) {
    console.log(b);
    var i = d3.interpolate({startAngle: 1.1*Math.PI, endAngle: 1.1*Math.PI}, b);
    return function(t) { 
      return arc(i(t));
    };
  }
  
  var data = [ 
    {name: "one", value: Math.floor((Math.random()*100)+1)},
    {name: "two", value:  Math.floor((Math.random()*100)+1)},
    {name: "three", value:  Math.floor((Math.random()*100)+1)} ];

         
  var p = pie(data);     
  //console.log(pie(data));
  var path = chart.selectAll("path");     
  var z;
  
  var interval;
  
  this.load = function (z) {
    
    data = [ 
      {name: "one", value: Math.floor((Math.random()*100)+1)},
      {name: "two", value:  Math.floor((Math.random()*100)+1)},
      {name: "three", value:  Math.floor((Math.random()*100)+1)},
      {name: "four", value:  Math.floor((Math.random()*100)+1)},
      {name: "five", value:  Math.floor((Math.random()*100)+1)}, 
      {name: "six", value:  Math.floor((Math.random()*100)+1)}];
            
    
    //console.log(pie(data));
    p = pie(data, function(d, i){return i});
    console.log(p);
    path = path.data(pie(data));
    var pathEnter = path.enter().append("path");
    
    var pathUpdate = chart.selectAll("path")
      .transition().duration(750).attrTween("d", tweenPie)
      .attr("id", function(d, i){return "arc_"+i})
      .style("fill", function(d, i) { return color(i); });
    
    path.exit().remove();
       
      //.each(function(d) { this._current = d; }); // store the initial angles

    
/*
    var g = chart.selectAll(".arc")
      .data(pie(data))
      .enter().append("g")
      .attr("class", "arc");
  
    g.append("path")
      .attr("fill", function(d, i) { return color(i); })
      .transition()
      .duration(2000)
      .attrTween("d", tweenPie);
 */   
    if (!interval) interval = setInterval(self.load, 3000);
  }
}
