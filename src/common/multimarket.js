var MiniChart = function(base, trade, markets) {
  var self      = this;
  self.lineData = [];
  self.div      = markets.el.insert("div",".add").attr("class","chart");
  self.markets  = markets;
  self.index    = markets.charts.push(self)-1;  
  
  var xScale    = d3.time.scale(),
    priceScale  = d3.scale.linear(),
    volumeScale = d3.scale.linear(),
    xAxis       = d3.svg.axis().scale(xScale).ticks(6),
    priceAxis   = d3.svg.axis().scale(priceScale).orient("right");  
  
  var margin = {top: 0, right: 40, bottom: 20, left: 0},
    height   = 230,
    width    = 280;
    
  var details  = self.div.append("table").attr("class", "chartDetails").append("tr");
  var range    = details.append("td").attr("class","range");
  var showHigh = details.select(".range").append("div").attr("class","high");
  var showLow  = details.select(".range").append("div").attr("class","low");
  var change   = details.append("td").attr("class","change"); 
  var volume   = details.append("td").attr("class","volume"); 
              
  var svg      = self.div.selectAll("svg").data([0])
  var svgEnter = svg.enter().append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);     
  
  var pointer = svg.append("path")
    .attr("class","pointer")
    .attr("d", "M 0 0 L 7 -7 L 40 -7 L 40 7 L 7 7 L 0 0")
    .attr("transform","translate("+(width+margin.left)+","+(height+margin.top)+")");

  svg.append("rect").attr("width", width+margin.left+margin.right)
    .attr("class","timeBackground")
    .attr("height", margin.bottom)
    .attr("transform", "translate(0,"+(height+margin.top)+")");  
    
  var gEnter = svg.append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
  //gEnter.append("rect").attr("class", "background").attr("width", width).attr("height", height);
                 
  gEnter.append("g").attr("class","grid");
  gEnter.append("path").attr("class", "line");
  
  gEnter.append("g").attr("class", "x axis");  
  gEnter.append("g").attr("class", "price axis").attr("transform", "translate("+width+", 0)")

  var flip = svg.append("g").attr("class","flip")
    .attr("width", margin.right)   
    .attr("height", margin.bottom)  
    .attr("transform", "translate("+(width+margin.left)+","+(height+margin.top)+")")
    .on("click", function(){
      dropdownA.selected(self.trade);
      dropdownB.selected(self.base);
      dropdowns.selectAll("select").remove();
      dropdowns.append("div").attr("class","base").call(dropdownA);
      dropdowns.append("div").attr("class","trade").call(dropdownB);  
    });
  
  flip.append("rect").attr({width:margin.right,height:margin.bottom});
  flip.append("text").text("Flip").attr({"text-anchor":"middle",y:margin.bottom*4/5,x:margin.right/2});
  
  var status     = self.div.append("h4").attr("class", "status");  
  var horizontal = gEnter.append("line")
    .attr("class", "horizontal")
    .attr({x1:0,x2:width})
    .attr("transform","translate(0,"+height+")"); 
  var lastPrice = gEnter.append("text")
    .attr("class","lastPrice")
    .style("text-anchor","middle")
    .attr("x", (width+margin.left)/2);
    
  var loader = self.div.append("img")
    .attr("class", "loader")
    .attr("src", "assets/images/throbber5.gif")
    .style("opacity", 0); 

  if (!markets.options.fixed) {
    var closeButton = self.div.append("div")
      .attr("class","closeButton")
      .html("x")
      .on("click", function(){
        self.remove();
      });
  }
    
  this.setStatus = function (string) {
    status.html(string); 
    if (string) {
      loader.transition().style("opacity",0);  
      details.selectAll("td").transition().style("opacity",0);
      gEnter.transition().style("opacity",0);
      pointer.transition().attr('transform',"translate("+(width+margin.left)+", "+height+")").style({fill:"#aaa"});
    }
  } 
  
  this.remove = function () {
    self.div.remove();
    markets.charts[self.index] = {};
  } 
          
  this.load  = function () {
    
    if (!self.base || !self.trade ||
      (self.base.currency == self.trade.currency &&
      self.trade.currency == "XRP")) return self.setStatus("Select a currency pair."); 

    self.setStatus("");
    loader.transition().style("opacity",1);
    
    if (self.request) self.request.abort();
    self.request = self.markets.apiHandler.offersExercised({
      startTime     : new Date(),
      endTime       : d3.time.day.offset(new Date(), -2),
      timeIncrement : "hour",
      descending    : true,
      "trade[currency]" : self.trade.currency,
      "trade[issuer]"   : self.trade.issuer ? self.trade.issuer : "",
      "base[currency]"  : self.base.currency,
      "base[issuer]"    : self.base.issuer  ? self.base.issuer : ""

    }, function(data){
      self.lineData = data;
      self.draw();
      
    }, function (error){
      console.log(error);
      self.setStatus(error.text);
    });  
  }  
  
  function amountToHuman (d, opts) {
    if (!opts) opts = {
          precision      : 6,
          min_precision  : 2,
          max_sig_digits : 7
      }
    return ripple.Amount.from_human(d).to_human(opts);     
  }
  
  this.draw = function () {

    
    //if there is no data, hide the old chart and details
    if (!self.lineData.length) return self.setStatus("No Data");  
    else self.setStatus("");
    loader.transition().style("opacity",0);
    
    var area = d3.svg.area()
        .x(function(d) { return xScale(d.time); })
        .y0(height)
        .y1(function(d) { return priceScale(d.close); }),  

      line = d3.svg.line()
        .x(function(d) { return xScale(d.time); })
        .y(function(d) { return priceScale(d.close); }),
      
      open = self.lineData[0].close,
      high = d3.max(self.lineData, function (d){return d.high}),  
      low  = d3.min(self.lineData, function (d){return d.low}),
      last = self.lineData[self.lineData.length-1].close,
      vol  = d3.sum(self.lineData, function (d){return d.volume}),
      pct  = (((last-open)/open)*100).toFixed(2),     
      pathStyle, horizontalStyle, pointerStyle, changeStyle; 
      
      
    if (Math.abs(pct)<0.5) { //unchanged (less than .5%)
      pathStyle = {fill:"c5cacf",stroke:"#888"}; 
      horizontalStyle = {stroke:"#777"};
      pointerStyle = {fill:"#aaa"};
      changeStyle  = {color:"#777"};
    } else if (last < open) {  //down
      //pathStyle = {fill:"rgba(250,100,100,.6)",stroke:"#b66"};
      pathStyle = {fill:"#c55",stroke:"#a00"}; 
      horizontalStyle = {stroke:"#d22"};
      pointerStyle = {fill:"#c33"};
      changeStyle  = {color:"#c33"};
    } else { //up
      //pathStyle = {fill:"rgba(140,200,120,.5)",stroke:"#7a5"}; 
      pathStyle = {fill:"#8c7",stroke:"#483"}; 
      horizontalStyle = {stroke:"#0a0"};
      pointerStyle = {fill:"#2a2"};
      changeStyle  = {color:"#2a2"};
    }
    
    //console.log(open, high, low, last);          
    
    svg.datum(self.lineData).transition().style("opacity",1);
    
    // Update the x-scale.
    xScale
      .domain(d3.extent(self.lineData, function(d) { return d.time; }))
      .range([0, width]);
    

    // Update the y-scale.
    priceScale
      .domain([
        d3.min(self.lineData, function(d) { return d.close; })*0.975,
        d3.max(self.lineData, function(d) { return d.close; })*1.025])
      .range([height, 0]).nice();  

   gEnter.select(".grid")         
    .call(d3.svg.axis()
      .scale(priceScale)
      .orient("right")
      .ticks(5)
        .tickSize(width, 0, 0)
        .tickFormat("")
    );
            
    //add the price line
    gEnter.select(".line").datum(self.lineData)
      .transition()
      .duration(300)
      .attr("d", area)
      .style(pathStyle);  
    
    // Update the x-axis.
    gEnter.select(".x.axis").call(xAxis)
      .attr("transform", "translate(0," + priceScale.range()[0] + ")");

    // Update the y-axis.
    gEnter.select(".price.axis").call(priceAxis)
      .attr("transform", "translate(" + xScale.range()[1] + ", 0)");

    var lastY = priceScale(last)-5;
    
    if (lastY<20) lastY += 20; //reposition last price below line if its too high on the graph.
    
    horizontal.transition().duration(600).attr("transform","translate(0, "+priceScale(last)+")").style(horizontalStyle);
    pointer.transition().duration(600).attr("transform","translate("+(width+margin.left)+", "+priceScale(last)+")").style(pointerStyle);
    lastPrice.transition().duration(600).attr("transform","translate(0, "+lastY+")").text(amountToHuman(last));

    vol = amountToHuman(vol, {min_precision:0, max_sig_digits:7});
    showHigh.html("<label>high</label> "+amountToHuman(high));
    showLow.html("<label>low</label> "+amountToHuman(low));
    change.html((pct>0 ? "+":"")+amountToHuman(pct)+"%").style(changeStyle);
    volume.html("<label>Vol:</label>"+vol+"<small>"+self.base.currency+"</small>");  
    
    //show the chart and details
    details.selectAll("td").style("opacity",1);
    gEnter.transition().style("opacity",1);
  }

  var dropdownA = ripple.currencyDropdown().selected(base);
  dropdownA.on("change", function(d) {
      self.base = d;
      self.load();
      });
         
  var dropdownB = ripple.currencyDropdown().selected(trade);
  dropdownB.on("change", function(d) {
      self.trade = d;
      self.load();
    });
    
  var dropdowns = self.div.append("div").attr("class", "dropdowns");
  dropdowns.append("div").attr("class","base").call(dropdownA);
  dropdowns.append("div").attr("class","trade").call(dropdownB);

}

var MultiMarket = function (options) {
  var self = this;
  
  self.charts     = [];  
  self.el         = d3.select("#"+options.id).attr("class","multiMarket");
  self.apiHandler = new ApiHandler(options.url);
  self.options    = options;
  
  if (!options.fixed) {
    self.el.append("div")
      .attr("class","add")
      .text("+")
      .on("click", function(d) {
        self.addChart();
      });    
  }

    
  this.addChart = function (base, trade) {
    new MiniChart(base, trade, self); 
  }
  
  this.removeChart = function (index) {
    if (options.fixed) return;
    self.charts[index].remove();
  }
  
  this.list = function (charts) {
    for (var i=0; i<self.charts.length; i++) {
      self.charts[i].remove();
    }
    
    for (var j=0; j<charts.length; j++) {
      self.addChart(charts[j].base, charts[j].trade);
    }
  }
}

function params(o) {
  var s = [];
  for (var key in o) {
    s.push(key + "=" + encodeURIComponent(o[key]));
  }

    return s.join("&");
}
