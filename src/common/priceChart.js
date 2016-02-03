
if (typeof LOADER_PNG == 'undefined')
      LOADER_PNG = "assets/images/rippleThrobber.png";
else  LOADER_PNG = "data:image/png;base64," + LOADER_PNG;

PriceChart = function (options) {
  var self        = this;
  var xScale      = d3.time.scale();
  var priceScale  = d3.scale.linear();
  var volumeScale = d3.scale.linear();
  var xAxis       = d3.svg.axis().scale(xScale);
  var volumeAxis  = d3.svg.axis().scale(volumeScale).orient("left").tickFormat(d3.format("s"));
  var priceAxis   = d3.svg.axis().scale(priceScale).orient("right");
  var apiHandler  = new ApiHandler(options.url);
  var liveFeed;
  var isLoading = true;

//this can be a function that will return whenever the state changes,
//such as when we start loading historical data, or stop
  self.onStateChange = null;

  var wrap, div, h, w, staticHeight,
    svg, svgEnter, gEnter, gradient,
    hover, horizontal, focus,
    status, details, loader,
    base, counter, lineData = [],
    startTime, endTime, type,
    chartInterval, intervalSeconds,
    multiple, lastCandle;

  type = options.type ? options.type : "line";  //default to line
  wrap = options.id ? d3.select("#"+options.id) : d3.select("body").append("div");
  h    = parseInt(wrap.style('height'), 10) || 0;
  w    = parseInt(wrap.style('width'), 10) || 0;
  div  = wrap.append("div").attr("class","priceChart");
  wrap.classed("priceChartWrap");

  if (!options.margin)  options.margin = {top: 2, right: 60, bottom: 20, left: 60};
  if (!options.width)   options.width  = w - options.margin.left - options.margin.right;
  if (options.height)   options.height - options.margin.top - options.margin.bottom;
  else if (h)           options.height = h - options.margin.top - options.margin.bottom;
  else                  options.height = window.innerHeight - options.margin.top  - options.margin.bottom;

  if (options.height < 150) options.height = 150;

  if (options.width<0) options.width  = 0; //if the div is less than the margin, we will get errors

  drawChart(); //have to do this here so that the details div is drawn

  if (options.resize) {
    addResizeListener(wrap.node(), resizeChart);
  } else {
    var padding = parseInt(details.style('padding-left'), 10)+parseInt(details.style('padding-right'), 10);
    details.style("width", (options.width-padding)+"px").style("right","auto");
    div.style("width",  (options.width+options.margin.left+options.margin.right)+"px");
    div.style("height", ((options.height || staticHeight)+options.margin.top+options.margin.bottom)+"px");
  }


//draw the chart at the beginning and whenever it is resized (if resizable)
  function drawChart() {
    div.html("");
    svg = div.selectAll("svg").data([0])
    svgEnter = svg.enter().append("svg")
      .attr("width", options.width + options.margin.left + options.margin.right)
      .attr("height", options.height + options.margin.top + options.margin.bottom);

    svg.append("defs").append("clipPath").attr("id", "clip").append("rect");
    svg.select("rect").attr("width", options.width).attr("height", options.height);

    gEnter = svg.append("g")
      .attr("transform", "translate(" + options.margin.left + "," + options.margin.top + ")");

    gEnter.append("rect")
      .attr("class", "background")
      .attr("width", options.width)
      .attr("height", options.height);

    gEnter.append("g").attr("class", "x axis");

    gEnter.append("g").attr("class", "volume axis")
      .append("text").text("Volume")
      .attr("class", "title")
      .attr("transform", "rotate(-90)")
      .attr("y",15).attr("x",-110);

    gEnter.append("g").attr("class", "price axis")
      .attr("transform", "translate("+options.width+", 0)")
      .append("text").text("Price")
        .attr("class", "title")
        .attr("transform", "rotate(-90)")
        .attr("y",-10).attr("x",-100);

    gEnter.append("path").attr("class", "line");

    gEnter.append("g")
      .attr("class", "volumeBars")
      .attr("clip-path", "url(#clip)");

    gEnter.append("g")
      .attr("class", "candlesticks")
      .attr("clip-path", "url(#clip)");

//  gradient for volume bars
    gradient = svg.append("svg:defs")
      .append("svg:linearGradient")
      .attr("id", "gradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "0%")
      .attr("y2", "100%")
      .attr("spreadMethod", "pad");

    gradient.append("svg:stop")
      .attr("offset", "0%")
      .attr("stop-color", "#ccc")
      .attr("stop-opacity", 0.5);

    gradient.append("svg:stop")
      .attr("offset", "100%")
      .attr("stop-color", "#ddd")
      .attr("stop-opacity", 0.5);

    hover       = gEnter.append("line").attr("class", "hover").attr("y2", options.height);
    horizontal  = gEnter.append("line").attr("class", "hover");
    focus       = gEnter.append("circle").attr("class", "focus dark").attr("r",3);
    status      = div.append("h4").attr("class", "status");

    details = div.append("div")
      .attr("class", "chartDetails")
      .style("left", options.margin.left+"px")
      .style("right", options.margin.right+"px")
      .style("top", (options.margin.top-1)+"px")
      .style("opacity", 0);

    loader = div.append("img")
      .attr("class", "loader")
      .attr("src", LOADER_PNG)
      .style("opacity", 0);

    if (isLoading) {
      svg.style("opacity", 0.5);
      loader.style("opacity", 1);
    }
  }

//function called whenever the window is resized (if resizable)
   function resizeChart () {
    var oldWidth  = options.width;
    var oldHeight = options.height;

    var w = parseInt(wrap.style('width'), 10);
    var h = parseInt(wrap.style('height'), 10);

    if (!w || !h) return;

    options.width  = w-options.margin.left - options.margin.right;
    options.height = h-options.margin.top - options.margin.bottom;
    //if (!staticHeight) options.height = options.width/2>400 ? options.width/2 : 400;
    if (options.height < 150) options.height = 150;

    if (oldWidth  != options.width ||
        oldHeight != options.height) {

      svg.attr("width", options.width + options.margin.left + options.margin.right)
      .attr("height", options.height + options.margin.top + options.margin.bottom);

      svg.select("rect").attr("width", options.width).attr("height", options.height);

      svg.select('rect.background')
      .attr("width", options.width)
      .attr("height", options.height);

      if (base && counter) {
        drawData(true);
      }
    }
  }

  this.resizeChart = function () {
    resizeChart();
  }


//fade to throber when loading historical data
  this.fadeOut = function () {
    div.selectAll("svg").transition().duration(100).style("opacity", 0.5);
    svg.on("mousemove", null).on("touchmove", null);
    details.style("opacity", 0);
    status.style("opacity", 0);
    div.selectAll(".hover").style("opacity", 0);
    div.selectAll(".focus").style("opacity", 0);
    loader.transition().duration(100).style("opacity",1);
  }


//set to line or candlestick
  this.setType = function (newType) {
    type = newType;
    if (lineData.length) drawData(); //dont draw unless its been loaded
  };


//function for getting the raw data for csv output or whatever
  this.getRawData = function() {
    return lineData;
  }


//load historical from API
  this.load = function (b, c, d) {

    if (!b) return setStatus("Base currency is required.");
    if (!c) return setStatus("Counter currency is required.");
    if (!d || !d.interval) return setStatus("Interval is required.");

    chartInterval = d.interval.slice(0,2);

    if      (chartInterval=="se") intervalSeconds = 1;
    else if (chartInterval=="mi") intervalSeconds = 60;
    else if (chartInterval=="ho") intervalSeconds = 60*60;
    else if (chartInterval=="da") intervalSeconds = 60*60*24;
    else if (chartInterval=="we") intervalSeconds = 60*60*24*7;
    else if (chartInterval=="mo") intervalSeconds = 60*60*24*30.5; //approx
    else return setStatus("Invalid Interval");

    if (self.onStateChange) self.onStateChange("loading");

    self.fadeOut();
    base      = b;
    counter   = c;
    multiple  = d.multiple || 1;
    lineData  = [];
    isLoading = true;

    intervalSeconds *= multiple;
    lastCandle       = getAlignedCandle(d.end ? moment.utc(d.end) : null);
    endTime          = moment.utc(lastCandle).add(intervalSeconds, 'seconds');
    startTime        = d.start ? getAlignedCandle(moment.utc(d.start)) : moment.utc(d.offset(endTime));

    if (liveFeed) liveFeed.stopListener();
    if (options.live && d.live) setLiveFeed();

    if (self.request) self.request.abort();
    self.request = apiHandler.offersExercised({
      startTime     : startTime.format(),
      endTime       : endTime.format(),
      timeIncrement : d.interval,
      timeMultiple  : d.multiple,
      descending    : false,
      base          : base,
      counter       : counter
    }, function(data){

      //if we've got live data reported already, we need to merge
      //the first live data with the last historic candle
      if (lineData.length && data.length) {

        var first  = lineData.shift();
        var candle = data[data.length-1];
        var volume = candle.baseVolume + first.baseVolume;

        //candle.open will be from historic
        if (candle.high>first.high) candle.high = first.high;
        if (candle.low<first.low)   candle.low  = first.low;
        candle.vwap       = (candle.vwap*candle.baseVolume+first.vwap*first.baseVolume)/volume;
        candle.baseVolume = volume;
        candle.close      = first.close;
        candle.closeTime  = first.closeTime;
        data[data.length-1] = candle;
      }

      //merge the last candle with the updater candle - if
      //its not the same time interval it will be discarded
      if (options.live && d.live) {
        liveFeed.resetStored(data[data.length-1], true);
      }

      lineData  = data.concat(lineData);
      isLoading = false;
      if (self.onStateChange) self.onStateChange("loaded");
      drawData();

    }, function (error){
      if (self.onStateChange) self.onStateChange("error");
      isLoading = false;
      console.log(error);
      setStatus(error.text ? error.text : "Unable to load data");
    });
  }


//report status to the user, or hide it
  function setStatus (string) {
    status.html(string).style("opacity",1);
    if (string) loader.transition().duration(10).style("opacity",0);
  }


//enable the live feed via ripple-lib
  function setLiveFeed () {
    var candle = {
        startTime     : moment.utc(lastCandle),
        baseVolume    : 0.0,
        counterVolume : 0.0,
        count         : 0,
        open          : 0.0,
        high          : 0.0,
        low           : 0.0,
        close         : 0.0,
        vwap          : 0.0,
        openTime      : Infinity,
        closeTime     : 0
      };

    var interval;
    if      (chartInterval=='se') interval = "second";
    else if (chartInterval=='mi') interval = "minute";
    else if (chartInterval=='ho') interval = "hour";
    else if (chartInterval=='da') interval = "day";
    else if (chartInterval=='we') interval = "week";
    else if (chartInterval=='mo') interval = "month";
    else if (chartInterval=='ye') interval = "year";
    else interval = chartInterval;

    var viewOptions = {
      base    : base,
      counter : counter,
      timeIncrement    : interval,
      timeMultiple     : multiple,
      incompleteApiRow : candle
    }

    if (liveFeed) liveFeed.updateViewOpts(viewOptions);
    else liveFeed = new OffersExercisedListener (viewOptions, liveUpdate);
  }


//suspend the live feed
  this.suspend = function () {
    if (liveFeed) liveFeed.stopListener();
    //if (options.resize && typeof removeResizeListener === 'function')
    //  removeResizeListener(wrap.node(), resizeChart);
  }


//add new data from the live feed to the chart
  function liveUpdate (data) {
    var first   = lineData.length ? lineData[0] : null;
    var last    = lineData.length ? lineData[lineData.length-1] : null;
    var candle  = data;

    candle.startTime = moment.utc(candle.startTime);
    candle.live      = true;

    //console.log(candle);
    //console.log(last.startTime.format(), candle.startTime.format());

    if (last && last.startTime.unix()===candle.startTime.unix()) {
      //console.log("update");

      lineData[lineData.length-1] = candle;
    } else {
      //console.log("append");

      //new candle, only add it if something happened
      if (candle.baseVolume) {
        lineData.push(candle); //append the candle
      }

      //adjust the range
      startTime.add(intervalSeconds,"seconds");
      endTime.add(intervalSeconds,"seconds");

      //remove the first candle if it is before the start range
      if (first && first.startTime.unix()<startTime.unix()) lineData.shift();
    }

    //redraw the chart
    if (lineData.length) drawData();
  }

  function drawData (update) {
    if (!isLoading && (!lineData || !lineData.length)) {
      setStatus("No Data for this Period");
    } else setStatus("");

    var duration = update ? 0 : 250;

    //aiming for around 100-200 here
    var num         = (moment(endTime).unix() - moment(startTime).unix())/intervalSeconds;
    var candleWidth = options.width/(num*1.5);

    if      (candleWidth<3) candleWidth = 1;
    else if (candleWidth<4) candleWidth = 2;

    var baseCurrency = base.currency;
    var counterCurrency = counter.currency;

    gEnter.select(".axis.price").select("text").text("Price ("+counterCurrency+")");
    gEnter.select(".axis.volume").select("text").text("Volume ("+baseCurrency+")");

    svg.datum(lineData, function(d){return d.startTime;})
      .on("mousemove", showDetails)
      .on("touchmove", showDetails)
      .on("touchstart", showDetails)
      .on("touchend", showDetails);

    // Update the x-scale.
    xScale
      .domain([startTime, moment.utc(endTime).add(num/35*intervalSeconds, 'seconds')])
      .range([0, options.width]);

    // Update the volume scale.
    volumeScale
      .domain([0, d3.max(lineData, function (d) {return d.baseVolume})*2])
      .range([options.height, 0]);

    if (type == 'line') {
      gEnter.select(".line").style("opacity",1);
      gEnter.select(".candlesticks").style("opacity",0);

      //update the price scale
      priceScale
        .domain([
          d3.min(lineData, function(d) { return Math.min(d.close) })*0.975,
          d3.max(lineData, function(d) { return Math.max(d.close) })*1.025])
        .range([options.height - 20, 0]);

    } else {
      gEnter.select(".line").style("opacity",0);
      gEnter.select(".candlesticks").style("opacity",1);

      priceScale
        .domain([
          d3.min(lineData, function(d) { return Math.min(d.open, d.close, d.high, d.low) })*0.975,
          d3.max(lineData, function(d) { return Math.max(d.open, d.close, d.high, d.low) })*1.025])
        .range([options.height - 20, 0]);

    }


    var line = d3.svg.line()
      .x(function(d) { return xScale(d.startTime); })
      .y(function(d) { return priceScale(d.close); });

    //add the price line
    gEnter.select(".line")
      .datum(lineData, function(d){return d.startTime;})
      .transition().duration(duration)
      .attr("d", line);


    // add the candlesticks.
    var candle = gEnter.select(".candlesticks").selectAll("g")
      .data(lineData, function(d){
        return d.startTime;
      });

     /*
         * Candlestick rules:
         * previous.close < current.close = up/green
         * previous.close > current.close = down/red
         * current.close<current.open = filled
         * current.close>current.open = hollow
     */

    var candleEnter = candle.enter().append("g")
      .attr("transform", function(d) { return "translate(" + xScale(d.startTime) + ")"; });
    candleEnter.append("line").attr("class","extent");
    candleEnter.append("line").attr("class", "high");
    candleEnter.append("line").attr("class", "low");
    candleEnter.append("rect");

    var candleUpdate = candle.classed("up", function(d, i) {
      if (i>0) {
        var prev = lineData[i-1];
        return prev.close<=d.close;
      }

      return d.open <= d.close; //just for the first, accurate most of the time
      }).classed("filled", function (d){
         return d.close<=d.open;
      })
      .transition().duration(duration)
      .attr("transform", function(d) { return "translate(" + xScale(d.startTime) + ")"; });

    candleUpdate.select(".extent")
      .attr("y1", function(d) { return priceScale(d.low); })
      .attr("y2", function(d) { return priceScale(d.high); });
    candleUpdate.select("rect")
      .attr("x", -candleWidth / 2)
      .attr("width", candleWidth)
      .attr("y", function(d) { return priceScale(Math.max(d.open, d.close)); })
      .attr("height", function(d) { return Math.abs(priceScale(d.open) - priceScale(d.close))+0.5; });
    candleUpdate.select(".high")
      .attr("x1", -candleWidth / 4)
      .attr("x2", candleWidth / 4)
      .attr("y1", function(d) { return priceScale(d.high)})
      .attr("y2", function(d) { return priceScale(d.high)});
    candleUpdate.select(".low")
      .attr("x1", -candleWidth / 4)
      .attr("x2", candleWidth / 4)
      .attr("y1", function(d) { return priceScale(d.low)})
      .attr("y2", function(d) { return priceScale(d.low)});
    d3.transition(candle.exit())
      .attr("transform", function(d) { return "translate(" + xScale(d.startTime) + ")"; })
      .style("opacity", 1e-6).remove();


    //add the volume bars
    var bars = gEnter.select(".volumeBars").selectAll("rect").data(lineData, function(d){return d.startTime;});
    bars.enter().append("rect");

    bars.data(lineData, function(d){return d.startTime;})
      .transition().duration(duration)
      .attr("x", function(d){return xScale(d.startTime)-candleWidth/3})
      .attr("y", function(d){return volumeScale(d.baseVolume)})
      .attr("width", candleWidth/1.2)
      .attr("height", function(d){return options.height - volumeScale(d.baseVolume)})
      .style("fill", "url(#gradient)")

    bars.exit().remove();

    // Update the x-axis.
    gEnter.select(".x.axis")
      .attr("transform", "translate(0," + volumeScale.range()[0] + ")")
      .transition().duration(duration)
      .call(xAxis);

    // Update the y-axis.
    gEnter.select(".price.axis")
      .attr("transform", "translate(" + xScale.range()[1] + ", 0)")
      .transition().duration(duration)
      .call(priceAxis);

    // Update the left axis.
    gEnter.select(".volume.axis")
      .transition().duration(duration)
      .call(volumeAxis);

    //hide the loader, show the chart
    if (!isLoading) {
      svg.transition().duration(duration).style("opacity", 1);
      loader.transition().duration(duration).style("opacity", 0);
    }
  }


//show the details of the candle on mouseover, touch
  function showDetails() {
    var z = wrap.style("zoom") || 1,
      x   = d3.mouse(this)[0]/z,
      tx  = Math.max(0, Math.min(options.width+options.margin.left, x)),
      i   = d3.bisect(lineData.map(function(d) { return d.startTime }), xScale.invert(tx-options.margin.left)),
      d   = lineData[i],
      o, h, l, c, v;

    if (d) {
      if (rippleAmount) {
        o = rippleAmount(d.open, counter.currency);
        h = rippleAmount(d.high,  counter.currency);
        l = rippleAmount(d.low,   counter.currency);
        c = rippleAmount(d.close, counter.currency);
        a = rippleAmount(d.vwap,  counter.currency);
        v = rippleAmount(d.baseVolume, base.currency);

      } else {
        o = d.open.toFixed(4);
        h = d.high.toFixed(4);
        l = d.low.toFixed(4);
        c = d.close.toFixed(4);
        c = d.vwap.toFixed(4);
        v = d.baseVolume.toFixed(2);
      }

      var baseCurrency = base.currency;
      var details = div.select('.chartDetails');
      details.html("<span class='date'>"+ parseDate(d.startTime.local(), chartInterval) +
        "</span><span><small>O:</small><b>" + o  + "</b></span>" +
        "<span class='high'><small>H:</small><b>" + h + "</b></span>" +
        "<span class='low'><small>L:</small><b>" + l + "</b></span>" +
        "<span><small>C:</small><b>" + c  + "</b></span>" +
        "<span class='vwap'><small>VWAP:</small><b>" + a + "</b></span>" +
        "<span class='volume'><small>Vol:</small><b>" + v + " " + baseCurrency + "</b></span>")
        .style("opacity",1);

      hover.transition().duration(50).attr("transform", "translate(" + xScale(d.startTime) + ")");
      focus.transition().duration(50).attr("transform", "translate(" + xScale(d.startTime) + "," + priceScale(d.close) + ")");
      horizontal.transition().duration(50)
        .attr("x1", xScale(d.startTime))
        .attr("x2", options.width)
        .attr("y1", priceScale(d.close))
        .attr("y2", priceScale(d.close));

      hover.style("opacity",1);
      horizontal.style("opacity",1);
      focus.style("opacity",1);
    }
  }

  //apply rules to get the start times to line up nicely
  function getAlignedCandle(time) {
    var aligned;

    if (!time) time = moment().utc();
    time.subtract(time.milliseconds(), 'milliseconds');

    if (chartInterval=='se') {
      aligned = time.subtract(time.seconds()%multiple, 'seconds');

    } else if (chartInterval=='mi') {
      aligned = time.subtract({
        seconds : time.seconds(),
        minutes : time.minutes()%multiple
      });

    } else if (chartInterval=='ho') {
      aligned = time.subtract({
        seconds : time.seconds(),
        minutes : time.minutes(),
        hours   : time.hours()%multiple
      });

    } else if (chartInterval=='da') {
      var days;
      var diff;

      if (multiple === 1) {
        days = 0;

      } else {
        diff = time.diff(moment.utc([2013,0,1]), 'hours')/24;
        if (diff<0) days = multiple - (0 - Math.floor(diff))%multiple;
        else days = Math.floor(diff)%multiple;
      }

      aligned = time.subtract({
        seconds : time.seconds(),
        minutes : time.minutes(),
        hours   : time.hours(),
        days    : days
      });

    } else if (chartInterval=='we') {
      aligned = time.subtract({
        seconds : time.seconds(),
        minutes : time.minutes(),
        hours   : time.hours(),
        days    : time.day(),
        weeks   : time.isoWeek()%multiple
      });

    } else if (chartInterval=='mo') {
      aligned = time.subtract({
        seconds : time.seconds(),
        minutes : time.minutes(),
        hours   : time.hours(),
        days    : time.date()-1,
        months  : time.months()%multiple
      });
    }

    return aligned;
  }


//display the date in a nice format
  function parseDate (date, increment) {


    if      (increment == "mi") return date.format('MMMM D')    + " &middot " + date.format("hh:mm A")+" "+tz(date);
    else if (increment == "ho") return date.format('MMMM D')    + " &middot " + date.format("hh:mm A")+" "+tz(date);
    else if (increment == "da") return date.utc().format('MMMM D')    + " <small>("+date.utc().format("hh:mm A")+" UTC)</small>";
    else if (increment == "mo") return date.utc().format('MMMM YYYY') + "<small>UTC</small>";
    else if (increment == "ye") return date.utc().format('YYYY');
    else return date.format('MMMM D') + " &middot " + date.format("hh:mm:ss A")+" "+tz(date);
  }

  function tz (dateInput) {
    var dateObject = dateInput.toDate() || new Date(),
      dateString = dateObject + "",
      tzAbbr = (
        // Works for the majority of modern browsers
        dateString.match(/\(([^\)]+)\)$/) ||
        // IE outputs date strings in a different format:
        dateString.match(/([A-Z]+) [\d]{4}$/)
      );

    if (tzAbbr) {
      // Old Firefox uses the long timezone name (e.g., "Central
      // Daylight Time" instead of "CDT")
      tzAbbr = tzAbbr[1].match(/[A-Z]/g).join("");
    }

    //return GMT offset if all else fails
    if (!tzAbbr && /(GMT\W*\d{4})/.test(dateString)) {
      return RegExp.$1;
    }

    return tzAbbr;
  }

  //format an amount if ripple-lib is present
  function rippleAmount (amount, currency, sig_digits) {
    if (typeof ripple === 'undefined' || !ripple.Amount) {
      return amount;
    }

    if (!sig_digits) {
      sig_digits = 6;
    }

    return ripple.Amount.from_human(amount + " " + currency).to_human({max_sig_digits:6});
  }
}
