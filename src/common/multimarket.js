var MiniChart = function(base, counter, markets) {
  var self      = this,
    header, details, range, showHigh, showLow, change, volume,
    wrap, svg, svgEnter, pointer, gEnter, 
    flipping, flip, 
    status, horizontal, lastPrice, loader, isLoading,
    dropdownA, dropdownB, dropdowns, loaded;
  
  self.lineData = [];
  self.div      = markets.el.insert("div",".add").attr("class","chart");
  self.markets  = markets;
  self.index    = markets.charts.push(self)-1;  
  
  var xScale    = d3.time.scale(),
    priceScale  = d3.scale.linear(),
    volumeScale = d3.scale.linear(),
    xAxis       = d3.svg.axis().scale(xScale).ticks(6),
    priceAxis   = d3.svg.axis().scale(priceScale).orient("right");  
  
  var margin = {top: 0, right: 40, bottom: 20, left: 0};
  var width  = parseInt(self.div.style('width'), 10) - margin.left - margin.right;
  var height = width/1.5>200 ? width/1.5 : 200;

  if (markets.options.fixed) {
    header = self.div.append("div").attr("class","chartHeader");
  } else {
    self.div.append("div")
      .attr("class","closeButton")
      .html("x")
      .on("click", function(){
        d3.event.stopPropagation();
        self.remove(true);
    });
  }
  
  
  loaded = false;
  
  details  = self.div.append("table").attr("class", "chartDetails").append("tr");
  wrap     = self.div.append("div");
             
  loader = self.div.append("img")
    .attr("class", "loader")
    .attr("src", "assets/images/rippleThrobber.png");
    
    
  dropdownA = ripple.currencyDropdown().selected(base);
  dropdownA.on("change", function(d) {
      self.base = d;
      if (!flipping && loaded) self.load();
      });
         
  dropdownB = ripple.currencyDropdown().selected(counter);
  dropdownB.on("change", function(d) {
      self.counter = d;
      if (loaded) self.load();
    });
    
  dropdowns = self.div.append("div").attr("class", "dropdowns");
  dropdowns.append("div").attr("class","base").call(dropdownA);
  dropdowns.append("div").attr("class","counter").call(dropdownB);
  
  if (markets.options.fixed) {
    dropdowns.style("display","none");
    header.html("<small>"+self.div.select(".base .gateway").node().value+
      "</small>"+self.base.currency+"/"+self.counter.currency+"<small>"+
      self.div.select(".counter .gateway").node().value+"</small>");
  } 
  
  status = self.div.append("h4").attr("class", "status");  
   
  if (markets.options.clickable) { 
    dropdowns.on("click", function(){
      d3.event.stopPropagation();
    });
    self.div.classed("clickable", true).on("click", function(){
      markets.chartClickHandler(self);
    });
  }

  loaded = true;
  drawChart();
  load();
  addResizeListener(window, resizeChart); 


//show status to the user, or remove it    
  function setStatus (string) {
    status.html(string); 
    if (string && !isLoading) {
      loader.transition().style("opacity",0);  
      details.selectAll("td").transition().style("opacity",0);
      gEnter.transition().style("opacity",0);
      pointer.transition().attr('transform',"translate("+(width+margin.left)+", "+height+")").style({fill:"#aaa"});
    }
  } 

  this.load = load; //make it externally available
  
//load the chart data from the API       
  function load (update) {
    markets.updateListHandler();
    if (!self.base || !self.counter ||
      (self.base.currency == self.counter.currency &&
      self.counter.currency == "XRP")) return setStatus("Select a currency pair."); 

    if (!update) {
      setStatus("");
      loader.transition().style("opacity",1);
      isLoading = true;  
    }
    
    /*
    if (typeof mixpanel !== undefined) mixpanel.track("Multimarket", {
      "Base Currency"    : self.base.currency,
      "Base Issuer"      : self.base.issuer || "",
      "Counter Currency" : self.counter.currency,
      "Counter Issuer"   : self.counter.issuer || ""
    });
    */
    if (self.request) self.request.abort();
    self.request = self.markets.apiHandler.offersExercised({
      startTime     : new Date(),
      endTime       : d3.time.day.offset(new Date(), -1),
      timeIncrement : "hour",
      timeMultiple  : 1,
      descending    : false,
      base          : self.base,
      counter       : self.counter

    }, function(data){
      
      self.lineData = data;
      isLoading     = false;
      drawData(true);
      
    }, function (error){
      
      console.log(error);
      isLoading = false;
      setStatus(error.text ? error.text : "Unable to load data" );
    });  
  }  
 
  
//draw the chart, not including data     
  function drawChart() {            
    details.html("");
    wrap.html("");
    
    svg = wrap.append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom);  
    
    range    = details.append("td").attr("class","range");
    showHigh = details.select(".range").append("div").attr("class","high");
    showLow  = details.select(".range").append("div").attr("class","low");
    change   = details.append("td").attr("class","change"); 
    volume   = details.append("td").attr("class","volume"); 
    
    pointer = svg.append("path")
      .attr("class","pointer")
      .attr("d", "M 0 0 L 7 -7 L 40 -7 L 40 7 L 7 7 L 0 0")
      .attr("transform","translate("+(width+margin.left)+","+(height+margin.top)+")");
  
    svg.append("rect").attr("width", width+margin.left+margin.right)
      .attr("class","timeBackground")
      .attr("height", margin.bottom)
      .attr("transform", "translate(0,"+(height+margin.top)+")");  
      
    gEnter = svg.append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    //gEnter.append("rect").attr("class", "background").attr("width", width).attr("height", height);
                   
    gEnter.append("g").attr("class","grid");
    gEnter.append("path").attr("class", "line");
    
    gEnter.append("g").attr("class", "x axis");  
    gEnter.append("g").attr("class", "price axis").attr("transform", "translate("+width+", 0)")
  
    flipping = false;
    flip = svg.append("g").attr("class","flip")
      .attr("width", margin.right)   
      .attr("height", margin.bottom)  
      .attr("transform", "translate("+(width+margin.left)+","+(height+margin.top)+")")
      .on("click", function(){
        d3.event.stopPropagation();
        flipping = true;
        dropdownA.selected(self.counter);
        dropdownB.selected(self.base);
        dropdowns.selectAll("select").remove();
        dropdowns.append("div").attr("class","base").call(dropdownA);
        dropdowns.append("div").attr("class","counter").call(dropdownB);  
        flipping = false;
        
        if (markets.options.fixed) {
          header.html("<small>"+self.div.select(".base .gateway").node().value+
            "</small>"+self.base.currency+"/"+self.counter.currency+"<small>"+
            self.div.select(".counter .gateway").node().value+"</small>");
        }        
      });
    
    flip.append("rect").attr({width:margin.right,height:margin.bottom});
    flip.append("text").text("Flip").attr({"text-anchor":"middle",y:margin.bottom*4/5,x:margin.right/2});
   
    
    horizontal = gEnter.append("line")
      .attr("class", "horizontal")
      .attr({x1:0,x2:width})
      .attr("transform","translate(0,"+height+")"); 
    lastPrice = gEnter.append("text")
      .attr("class","lastPrice")
      .style("text-anchor","middle")
      .attr("x", (width+margin.left)/2);
    
    //if (isLoading) loader.transition().duration(10).style("opacity",1);
  }
  

//Draw the data on the chart
  function drawData(update) {
        
    if (!isLoading) {
      loader.transition().style("opacity",0);
    
      //if there is no data, hide the old chart and details
      if (!self.lineData.length) return setStatus("No Data");  
      else setStatus("");
    }
    
    var area = d3.svg.area()
        .x(function(d) { return xScale(d.startTime); })
        .y0(height)
        .y1(function(d) { return priceScale(d.close); }),  

      line = d3.svg.line()
        .x(function(d) { return xScale(d.startTime); })
        .y(function(d) { return priceScale(d.close); }),
      
      open = self.lineData[0].close,
      high = d3.max(self.lineData, function (d){return d.high}),  
      low  = d3.min(self.lineData, function (d){return d.low}),
      last = self.lineData[self.lineData.length-1].close,
      vol  = d3.sum(self.lineData, function (d){return d.baseVolume}),
      pct  = (((last-open)/open)*100).toFixed(2),     
      pathStyle, horizontalStyle, pointerStyle, changeStyle; 
      
      
    if (Math.abs(pct)<0.5) { //unchanged (less than .5%)
      pathStyle = {fill:"rgba(160,160,160,.6)",stroke:"#888"}; 
      horizontalStyle = {stroke:"#777"};
      pointerStyle = {fill:"#aaa"};
      changeStyle  = {color:"#777"};
      
    } else if (last < open) {  //down
      pathStyle = {fill:"#c55",stroke:"#a00"}; 
      horizontalStyle = {stroke:"#d22"};
      pointerStyle = {fill:"#c33"};
      changeStyle  = {color:"#c33"};
      
    } else { //up
      pathStyle = {fill:"#8c7",stroke:"#483"}; 
      horizontalStyle = {stroke:"#0a0"};
      pointerStyle = {fill:"#2a2"};
      changeStyle  = {color:"#2a2"};
    }
    
    //console.log(open, high, low, last);          
    
    svg.datum(self.lineData).transition().style("opacity",1);
    
    // Update the x-scale.
    xScale
      .domain(d3.extent(self.lineData, function(d) { return d.startTime; }))
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
    if (update) gEnter.select(".line").datum(self.lineData)
      .transition()
      .duration(300)
      .attr("d", area)
      .style(pathStyle);  
    
    else gEnter.select(".line").datum(self.lineData)
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
    
    if (update) {
      horizontal.transition().duration(600).attr("transform","translate(0, "+priceScale(last)+")").style(horizontalStyle);
      pointer.transition().duration(600).attr("transform","translate("+(width+margin.left)+", "+priceScale(last)+")").style(pointerStyle);
      lastPrice.transition().duration(600).attr("transform","translate(0, "+lastY+")").text(amountToHuman(last));
    } else {
      horizontal.attr("transform","translate(0, "+priceScale(last)+")").style(horizontalStyle);
      pointer.attr("transform","translate("+(width+margin.left)+", "+priceScale(last)+")").style(pointerStyle);
      lastPrice.attr("transform","translate(0, "+lastY+")").text(amountToHuman(last));
    }
    
    vol = amountToHuman(vol, {min_precision:0, max_sig_digits:7});
    showHigh.html("<label>H:</label> "+amountToHuman(high));
    showLow.html("<label>L:</label> "+amountToHuman(low));
    change.html((pct>0 ? "+":"")+amountToHuman(pct)+"%").style(changeStyle);
    volume.html("<label>Vol:</label>"+vol+"<small>"+self.base.currency+"</small>");  
    
    //show the chart and details
    details.selectAll("td").style("opacity",1);
    gEnter.transition().style("opacity",1);
  }
 

//resize the chart whenever the window is resized  
  function resizeChart() {
    old    = width;
    width  = parseInt(self.div.style('width'), 10) - margin.left - margin.right;
    height = width/1.5>200 ? width/1.5 : 200;
    
    if (old != width) {
      drawChart(); 
      drawData();
    }
  }
  
  
//properly remove the chart by removing the resize listener  
  this.remove = function (update) {
    removeResizeListener(window, resizeChart);
    self.div.remove();
    markets.charts[self.index] = {};
    if (update) markets.updateListHandler();
  } 
     

//present amount in human readable format  
  function amountToHuman (d, opts) {
    if (!opts) opts = {
          precision      : 6,
          min_precision  : 2,
          max_sig_digits : 7
      }
    return ripple.Amount.from_human(d).to_human(opts);     
  }
}




//container object for the complete list of charts
var MultiMarket = function (options) {
  var self = this;
  var add, interval;
  
  self.charts     = [];  
  self.el         = d3.select("#"+options.id).attr("class","multiMarket");
  self.apiHandler = new ApiHandler(options.url);
  self.options    = options;
  
  if (!options.fixed) {
    add = self.el.append("div")
      .attr("class","add")
      .text("+")
      .on("click", function(d) {
        self.addChart();
      }); 
      
    resizeButton();  
    addResizeListener(window, resizeButton);   
  }

//resize the "add chart" button to keep the same dimensions as the charts
  function resizeButton() {
    width   = parseInt(add.style('width'), 10)-40; //subtract chart margin
    height  = width/1.5>200 ? width/1.5 : 200;
    height += 83; //add height of details, dropdowns, borders
    add.style({height: height+"px", "line-height":height+"px"});
  }
  
  if (options.updateInterval && 
      typeof options.updateInterval === 'number') {
    
    interval = setInterval(function(){
      for (var i=0; i<self.charts.length; i++) {
        self.charts[i].load(true);
      }      
    }, options.updateInterval*1000);      
  }
      
//new chart from list initialization or add chart button click         
  this.addChart = function (base, counter) {
    new MiniChart(base, counter, self); 
  }
  
//remove chart from list initialization or remove button click  
  this.removeChart = function (index) {
    if (options.fixed) return;
    self.charts[index].remove(true);
  }
 
 
//function run whenever the list of charts changes to return
//the complete list, if a callback is provided
  this.updateListHandler = function () {
    if (self.updateListCallback) {
      var data = [];
      for (var i=0; i<self.charts.length; i++) {
        if (!self.charts[i].base) continue;
        else if (self.charts[i].base.currency=='XRP' &&
          self.charts[i].counter.currency=='XRP') continue;
        data.push({
          base    : self.charts[i].base,
          counter : self.charts[i].counter
        });
      }
      self.updateListCallback(data);
    }
  }
  
//function to return the chart on click if 
//a callback function is provided 
  this.chartClickHandler = function (chart) {
    if (self.chartClickCallback) self.chartClickCallback(chart);
  }
  

//initialize charts with a list of currency pairs,
//or remove them all with an empty array  
  this.list = function (charts) {
    for (var i=0; i<self.charts.length; i++) {
      self.charts[i].remove(false);
    }
    
    if (!charts.length && !options.fixed) 
      removeResizeListener(window, resizeButton);
    
    if (!charts.length && interval)
      clearInterval(interval);
      
    for (var j=0; j<charts.length; j++) {
      self.addChart(charts[j].base, charts[j].counter);
    }
  }
 
//function for initializing callbacks  
  this.on = function(type, callback) {
    if      (type=='updateList') self.updateListCallback = callback;
    else if (type=='chartClick') self.chartClickCallback = callback;
  }
}
