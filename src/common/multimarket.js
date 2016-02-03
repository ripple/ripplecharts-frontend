var MiniChart = function(base, counter, markets, gateways) {

  var self = this,
    header, details, range, showHigh, showLow, change, volume,
    wrap, svg, bg, svgEnter, pointer, gEnter,
    flipping, flip, swap,
    status, horizontal, lastPrice, loader, isLoading,
    dropdownA, dropdownB, dropdowns, loaded, liveFeed;

  self.lineData = [];
  self.div      = markets.el.insert("div",".add").attr("class","chart");
  self.markets  = markets;
  self.index    = markets.charts.push(self)-1;
  self.base     = base;
  self.counter  = counter;

  var xScale    = d3.time.scale(),
    priceScale  = d3.scale.linear(),
    volumeScale = d3.scale.linear(),
    xAxis       = d3.svg.axis().scale(xScale).ticks(6),
    priceAxis   = d3.svg.axis().scale(priceScale).orient("right").tickSize(2, 0, 0);

  var margin = {top: 0, right: 40, bottom: 20, left: 0};
  var width  = parseInt(self.div.style('width'), 10) - margin.left - margin.right;
  var height = width/2>150 ? width/2 : 150;

  var baseCurrency    = base    ? base.currency : "XRP";
  var counterCurrency = counter ? counter.currency : "XRP";

  if (markets.options.fixed) {
    header = self.div.append("div").attr("class","chartHeader");
  } else {
    self.div.append("div")
      .attr("class","closeButton")
      .html("x")
      .on("click", function(){
        d3.event.stopPropagation();
        if (liveFeed) liveFeed.stopListener();
        self.remove(true);
    });
  }

  loaded = false;

  details  = self.div.append('div').attr("class", "chartDetails");
  wrap     = self.div.append("div");

  loader = self.div.append("img")
    .attr("class", "loader")
    .attr("src", "assets/images/rippleThrobber.png");

  dropdownA = ripple.currencyDropdown(gateways, true, markets.options.fixed).selected(self.base);
  dropdownA.on("change", function(d) {
      self.base = d;
      if (!flipping && loaded) self.load();
      });

  dropdownB = ripple.currencyDropdown(gateways, true, markets.options.fixed).selected(self.counter);
  dropdownB.on("change", function(d) {
      self.counter = d;
      if (loaded) self.load();
    });

  dropdowns = self.div.append("div");
  dropdowns.append("div").attr("class","base dropdowns").attr("id", "base"+self.index).call(dropdownA);
  dropdowns.append("div").attr("class","counter dropdowns").attr("id", "quote"+self.index).call(dropdownB);

  if (markets.options.fixed) {
    dropdowns.style("display","none");
    header.html("<small>"+gateways.getName(self.base.currency, self.base.issuer)+
      "</small>"+baseCurrency+"/"+counterCurrency+"<small>"+
      gateways.getName(self.counter.currency, self.counter.issuer)+"</small>");
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
  addResizeListener(self.div.node(), resizeChart);

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
    if (isLoading) {
      return;
    }

    baseCurrency   = self.base.currency;
    counterCounter = self.counter.currency;
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
    var start = moment.utc();

    start.startOf('minute')
      .subtract(start.minutes() % 15, 'minutes')
      .subtract(1, 'day');

    if (self.request) self.request.abort();
    self.request = self.markets.apiHandler.offersExercised({
      startTime     : start.format(),
      endTime       : moment.utc().endOf('day').format(),
      timeIncrement : "minute",
      timeMultiple  : 15,
      descending    : false,
      base          : self.base,
      counter       : self.counter

    }, function(data){
      if (liveFeed) liveFeed.stopListener();
      setLiveFeed();
      self.lineData  = data;
      isLoading      = false;
      drawData(true);

    }, function (error){

      console.log(error);
      isLoading = false;
      setStatus(error.text ? error.text : "Unable to load data" );
    });
  }

  function getAlignedCandle(time) {
    var aligned;

    time = moment(time).utc();
    time.subtract(time.milliseconds(), "milliseconds");

    aligned = time.subtract({
      seconds : time.seconds(),
      minutes : time.minutes()%15
    });

    return aligned;
  }

  //enable the live feed via ripple-lib
  function setLiveFeed () {
    var point = {
        startTime     : getAlignedCandle(),
        baseVolume    : 0.0,
        counterVolume : 0.0,
        count         : 0,
        open          : 0.0,
        high          : 0.0,
        low           : 0.0,
        close         : 0.0,
        vwap          : 0.0,
        openTime      : null,
        closeTime     : null
      };

    var viewOptions = {
      base    : self.base,
      counter : self.counter,
      timeIncrement    : "minute",
      timeMultiple     : 15,
      incompleteApiRow : point
    }

    liveFeed = new OffersExercisedListener (viewOptions, liveUpdate);
  }


//suspend the live feed
  this.suspend = function () {
    if (liveFeed) liveFeed.stopListener();
  }


//add new data from the live feed to the chart
  function liveUpdate (data, finishedInterval) {

    var lineData  = self.lineData;
    var first     = lineData.length ? lineData[0] : null;
    var last      = lineData.length ? lineData[lineData.length-1] : null;
    var point     = data;
    var prev      = last ? last.close : point.close;
    var end       = moment.utc(point.startTime).add(15, 'minutes');
    var direction;

    point.startTime = moment.utc(point.startTime);
    point.live      = true;
    var bottom = moment.utc().subtract(1, 'days').unix();

    //remove the first point if it is before the start range
    if (bottom > first.startTime.unix()){
      lineData.shift();
    }

    //dont append an empty candle,
    //but do redraw the data
    if (point.close === 0) {
      drawData();
      return;

    //the close exceeds the interval, reload the chart
    } else if (moment.utc(point.closeTime).unix() > end.unix()) {
      load(true);
      return;
    }

    //replace the last point
    if (last && last.startTime.unix() === point.startTime.unix()) {
      lineData[lineData.length-1] = point;

    } else {
      lineData.push(point); //append the point
    }

    if (prev < point.close) {
      direction = 'up';
    } else if (prev > point.close) {
      direction = 'down';
    } else {
      direction = 'unch';
    }

    //redraw the chart
    if (lineData.length) {
      drawData(finishedInterval ? false : true, direction);
    }
  }

//draw the chart, not including data
  function drawChart() {
    details.html("");
    wrap.html("");

    svg = wrap.append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom);

    change   = details.append('div').attr("class","change");
    range    = details.append('div').attr("class","range");
    showHigh = details.select(".range").append('span').attr("class","high");
    showLow  = details.select(".range").append('span').attr("class","low");
    volume   = details.append('div').attr("class","volume");

    bg = svg.append('rect')
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .style({opacity:0});

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
      .on("click", function() {
        d3.event.stopPropagation();
        flipping = true;

        dropdownA.selected(self.counter);
        dropdownB.selected(self.base);
        dropdowns.selectAll("div").remove();
        dropdowns.append("div").attr("class","base dropdowns").attr("id", "base"+self.index).call(dropdownA);
        dropdowns.append("div").attr("class","counter dropdowns").attr("id", "quote"+self.index).call(dropdownB);

        self.load();

        flipping = false;

        if (markets.options.fixed) {
          header.html("<small>"+gateways.getName(self.base.currency, self.base.issuer)+
            "</small>"+self.base.currency+"/"+self.counter.currency+"<small>"+
            gateways.getName(self.counter.currency, self.counter.issuer)+"</small>");
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
  function drawData(update, direction) {

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
      pct  = Number((((last-open)/open)*100).toFixed(2)),
      pathStyle, horizontalStyle, pointerStyle, changeStyle, flash;


    if (Math.abs(pct)<0.5) { //unchanged (less than .5%)
      pathStyle = {fill:"rgba(160,160,160,0.45)",stroke:"#888"};
      horizontalStyle = {stroke:"#777", 'stroke-width':1.5};
      pointerStyle = {fill:"#aaa"};
      changeStyle  = {color:"#777"};

    } else if (last < open) {  //down
      pathStyle = {fill:"rgba(205,85,85,0.5)",stroke:"#a22"};
      horizontalStyle = {stroke:"#d22", 'stroke-width':1.5};
      pointerStyle = {fill:"#c33"};
      changeStyle  = {color:"#c33"};

    } else { //up
      pathStyle = {fill:"rgba(145,205,115,0.4)",stroke:"#483"};
      horizontalStyle = {stroke:"#0a0", 'stroke-width':1.5};
      pointerStyle = {fill:"#2a2"};
      changeStyle  = {color:"#2a2"};
    }

    //console.log(open, high, low, last);
    //self.lineData.forEach(function(d){
    //  console.log(d.startTime.format());
    //});

    svg.datum(self.lineData).transition().style("opacity",1);

    var start = getAlignedCandle(moment().subtract(1,'day'));
    if (start.unix()<self.lineData[0].startTime.unix()) {
      start = self.lineData[0].startTime;
    }
    // Update the x-scale.
    xScale
      .domain([start, getAlignedCandle()])
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

    var showLast = amountToHuman(last, 5);

    if (update) {
      if (direction === 'up') {
        flash = '#393';
      } else if (direction === 'down') {
        flash = '#a22';
      } else {
        flash = '#888';
      }

      horizontal.style({stroke : flash, 'stroke-width' : 4})
        .transition().duration(600)
        .attr("transform","translate(0, "+priceScale(last)+")")
        .style(horizontalStyle);
      pointer.style({fill : flash})
        .transition().duration(600)
        .attr("transform","translate("+(width+margin.left)+", "+priceScale(last)+")")
        .style(pointerStyle);
      lastPrice.transition().duration(600)
        .attr("transform","translate(0, "+lastY+")")
        .text(showLast);
      bg.style({fill:flash, opacity:0.3})
        .transition().duration(1000)
        .style({opacity:0});
    } else {
      horizontal.style(horizontalStyle)
        .attr("transform","translate(0, "+priceScale(last)+")");
      pointer.style(pointerStyle)
        .attr("transform","translate("+(width+margin.left)+", "+priceScale(last)+")");
      lastPrice.text(showLast)
        .attr("transform","translate(0, "+lastY+")");
    }

    vol = amountToHuman(vol);
    showHigh.html("<label>H:</label> "+amountToHuman(high, 5));
    showLow.html("<label>L:</label> "+amountToHuman(low, 5));
    change.html((pct>0 ? "+":"")+amountToHuman(pct)+"%").style(changeStyle);
    volume.html("<label>V:</label> "+vol+"<small>"+baseCurrency+"</small>");

    //show the chart and details
    details.selectAll("td").style("opacity",1);
    gEnter.transition().style("opacity",1);
  }


//resize the chart whenever the window is resized
  function resizeChart() {
    old    = width;
    width  = parseInt(self.div.style('width'), 10) - margin.left - margin.right;
    height = width/2>150 ? width/2 : 150

    if (!width) return;

    if (old != width) {
      drawChart();
      drawData();
    }
  }


//properly remove the chart by removing the resize listener
  this.remove = function (update) {
    self.div.remove();
    markets.charts[self.index] = {};
    if (update) markets.updateListHandler();
  }


//present amount in human readable format
  function amountToHuman (d, precision) {
    return commas(Number(d.toPrecision(precision || 7)));
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
        self.addChart({currency: 'XRP'}, {currency: 'XRP'});
      });

    resizeButton();
    addResizeListener(self.el.node(), resizeButton);
  }

//resize the "add chart" button to keep the same dimensions as the charts
  function resizeButton() {
    width   = parseInt(add.style('width'), 10)-40; //subtract chart margin
    height  = width/2>150 ? width/2 : 150
    height += 88; //add height of details, dropdowns, borders
    add.style({height: height+"px", "line-height":height+"px"});
  }

//new chart from list initialization or add chart button click
  this.addChart = function (base, counter) {
    new MiniChart(base, counter, self, options.gateways);
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
      self.charts[i].suspend();
      self.charts[i].remove(false);
    }

    if (!charts.length && interval)
      clearInterval(interval);

    for (var j=0; j<charts.length; j++) {
      self.addChart(charts[j].base, charts[j].counter);
    }
  }

  this.reload = function () {
    for (var i=0; i<self.charts.length; i++){
      if (self.charts[i].load) self.charts[i].load();
    }
  }

//function for initializing callbacks
  this.on = function(type, callback) {
    if      (type=='updateList') self.updateListCallback = callback;
    else if (type=='chartClick') self.chartClickCallback = callback;
  }
}
