var OrderBook = function (options) {
  var self    = this, asks, bids, isLoading;
  self.offers = { };

  var r      = options.remote;
  var wrap   = options.chartID ? d3.select("#"+options.chartID) : d3.select("body").append("div");
  var chart  = wrap.append('div').attr('class','orderbookChart');
  var svg, depth, gEnter,
    xAxis, leftAxis, rightAxis,
    xTitle, leftTitle, rightTitle,
    hover, focus, centerline, path, midpoint,
    status, details, loader,
    baseCurrency, counterCurrency;

  if (!options.margin) options.margin = {top: 2, right: 60, bottom: 20, left: 60};
  if (!options.width)  options.width  = parseInt(wrap.style('width'), 10) - options.margin.left - options.margin.right;
  if (!options.height) options.height = parseInt(wrap.style('height'), 10) - options.margin.top - options.margin.bottom;

  var xScale = d3.scale.linear(),
    yScale   = d3.scale.linear(),
    lineData = [];

  if (options.resize) {
    addResizeListener(wrap.node(), resizeChart);
  }

//set up the order book
  var bookTables = d3.select("#"+options.tableID).attr("class","bookTables");
  var bidsTable = bookTables.append("table").attr("class","bidsTable"),
    bidsHead    = bidsTable.append("thead"),
    bidsBody    = bidsTable.append("tbody");

  // append the top header
  bidsHead.append("tr").selectAll("th")
    .data(["Bids"])
    .enter().append("th")
    .attr("class","type")
    .attr("colspan",9)
    .text(function(d) {return d;});

  //append second header
  bidsHead.append("tr").attr("class","headerRow").selectAll("th")
    .data(["Total","Size","Bid Price"])
    .enter().append("th")
    .attr('colspan', 3)
    .text(function(d) {return d;})
    .append("span");

  var asksTable = bookTables.append("table").attr("class","asksTable"),
    asksHead    = asksTable.append("thead"),
    asksBody    = asksTable.append("tbody");

  // append the top header
  asksHead.append("tr").selectAll("th")
    .data(["Asks"])
    .enter().append("th")
    .attr("class","type")
    .attr("colspan",9)
    .text(function(d) {return d;});

  //append second header
  asksHead.append("tr").attr("class","headerRow").selectAll("th")
    .data(["Ask Price","Size","Total"])
    .enter().append("th")
    .attr('colspan', 3)
    .text(function(d) {return d;})
    .append("span");


  drawChart(); //draw the blank chart


//subscribe to market data for trading pair
  this.getMarket = function (base, trade) {
    options.base    = base;
    options.trade   = trade;
    lineData        = [];
    self.offers     = {};
    baseCurrency    = ripple.Currency.from_json(base.currency).to_human();
    counterCurrency = ripple.Currency.from_json(trade.currency).to_human();

    bookTables.transition().style("opacity", 0.5);
    fadeChart();
    isLoading = true;
    if (!r.connected) r.connect();

    if (asks) {
      asks.removeListener('model', handleAskModel);
      asks.unsubscribe();
    }
    if (bids) {
      bids.removeListener('model', handleBidModel);
      bids.unsubscribe();
    }

    r._books = {};
    r._events.prepare_subscribe = [];

    asks = r.book(options.base.currency, options.base.issuer, options.trade.currency, options.trade.issuer)
    bids = r.book(options.trade.currency, options.trade.issuer, options.base.currency, options.base.issuer);

    asks.offersSync();
    bids.offersSync();

    asks.on('model', handleAskModel);
    bids.on('model', handleBidModel);

    prepareBook();
  }

  function handleAskModel (offers) {
    self.offers.asks = handleBook(offers,'asks');
    drawData();
    redrawBook('asks');
  }

  function handleBidModel (offers) {
    self.offers.bids = handleBook(offers,'bids');
    drawData();
    redrawBook('bids');
  }

//handle data returned from ripple-lib
  function handleBook (data,action) {
    var max_rows = options.max_rows || 100;
    var rowCount = 0;
    var offers   = [];
    var newData  = jQuery.extend(true, [], data);


    newData.forEach(function(d) {
      if (rowCount++ > max_rows) return;

      // rippled has a bug where it shows some unfunded offers
      // We're ignoring them
      if (d.taker_gets_funded === "0" || d.taker_pays_funded === "0") {
        return;
      }

      if (d.TakerGets.value) {
        d.TakerGets.value = d.taker_gets_funded;
      } else {
        d.TakerGets = parseInt(Number(d.taker_gets_funded), 10);
      }

      if (d.TakerPays.value) {
        d.TakerPays.value = d.taker_pays_funded;
      } else {
        d.TakerPays = parseInt(Number(d.taker_pays_funded), 10);
      }

      d.TakerGets = Amount.from_json(d.TakerGets);
      d.TakerPays = Amount.from_json(d.TakerPays);

      if (action === "asks") {
        d.price = Amount.from_quality(d.BookDirectory,
                                      d.TakerPays.currency(),
                                      d.TakerPays.issuer(), {
          base_currency: d.TakerGets.currency(),
          reference_date: new Date()
        });
      } else {

        d.price = Amount.from_quality(d.BookDirectory,
                                      d.TakerGets.currency(),
                                      d.TakerGets.issuer(), {
          inverse: true,
          base_currency: d.TakerPays.currency(),
          reference_date: new Date()
        });
      }

      offers.push(d);
    });

    var type = action === "asks" ? "TakerGets" : "TakerPays";
    var sum;

    offers.forEach(function(offer,index) {
      if (sum) sum = offer.sum = sum.add(offer[type]);
      else sum = offer.sum = offer[type];
      offer.showSum   = valueFilter(offer.sum);
      offer.showPrice = valueFilter(offer.price);

      var showValue = action === 'bids' ? 'TakerPays' : 'TakerGets';
      offer['show' + showValue] = valueFilter(offer[showValue]);
      //console.log(offer.showPrice, offer.showSum, offer['show' + showValue]);
    });

    return offers;
  }


//fade the chart to indicate loading new data
  function fadeChart () {
    depth.transition().style("opacity", 0.5);
    loader.transition().style("opacity", 1);
    details.style("opacity", 0);
    hover.style("opacity", 0);
    focus.style("opacity", 0);
    setStatus("");
  }


//draw the chart not including data
  function drawChart() {
    chart.html("");
    svg   = chart.selectAll("svg").data([0]);
    depth = svg.enter().append("svg")
      .attr("width", options.width + options.margin.left + options.margin.right)
      .attr("height", options.height + options.margin.top + options.margin.bottom)
      .on("mousemove", mousemove);

    gEnter = depth.append("g")
      .attr("transform", "translate(" + options.margin.left + "," + options.margin.top + ")")

    xAxis      = gEnter.append("g").attr("class", "x axis");
    leftAxis   = gEnter.append("g").attr("class", "y axis");
    rightAxis  = gEnter.append("g").attr("class", "y axis");
    xTitle     = xAxis.append("text").attr("class", "title").attr("y",-5).attr("x",5);
    leftTitle  = leftAxis.append("text").attr("class", "title").attr("transform", "rotate(-90)").attr("y",15).attr("x",-options.height*0.85);
    rightTitle = rightAxis.append("text").attr("class", "title").attr("transform", "rotate(-90)").attr("y",-5).attr("x",-options.height*0.85);

    hover      = gEnter.append("line").attr("class", "hover").attr("y2", options.height).style("opacity",0);
    focus      = gEnter.append("circle").attr("class", "focus dark").attr("r",3).style("opacity",0);
    centerline = gEnter.append("line").attr("class", "centerline").attr("y2", options.height).style("opacity",0);
    path       = gEnter.append("path").attr("class","line");
    status     = chart.append("h4").attr("class", "status");

    details   = chart.append("div")
    .attr("class", "chartDetails")
    .style("left",  options.margin.left+"px")
    .style("right", options.margin.right+"px")
    .style("top",   (options.margin.top-1)+"px")
    .style("opacity", 0);

    gEnter.append("rect").attr("class", "background").attr("width", options.width).attr("height", options.height);

    loader = chart.append("img")
      .attr("class", "loader")
      .attr("src", "assets/images/rippleThrobber.png")
      .style("opacity", 0);

    if (isLoading) {
      depth.style("opacity", 0.5);
      loader.style("opacity", 1);
    }
  }


//draw the chart data loaded from ripple-lib
  function drawData (update) {
    if (!self.offers.bids || !self.offers.asks) return; //wait for both to load
    if (!self.offers.bids.length || !self.offers.asks.length) {
      setStatus("No Orders");
      return;
    }

    var duration = update ? 0 : 250;

    var bestBid = self.offers.bids[0].showPrice,
      bestAsk   = self.offers.asks[0].showPrice;

    midpoint = (bestBid+bestAsk)/2;

    //add 0 size at best bid and ask
    lineData = self.offers.bids.slice(0).reverse();
    lineData.push({showPrice:bestBid,showSum:0});
    lineData.push({showPrice:bestAsk,showSum:0});
    lineData = lineData.concat(self.offers.asks);

    if (lineData.length<3) {
      loader.transition().duration(duration).style("opacity",0);
      path.transition().duration(duration).style("opacity",0);
      return;
    }

    setStatus("");
    isLoading = false;

    //get rid of outliers, anything greater than 5 times the best price
    var min = Math.max(d3.min(lineData, function(d) { return d.showPrice; }), bestBid/5),
      max   = Math.min(d3.max(lineData, function(d) { return d.showPrice; }), bestAsk*5);

    for (var i=0; i<lineData.length; i++) {
      if (lineData[i].showPrice<min || lineData[i].showPrice>max) lineData.splice(i--,1);
    }

    xScale.domain(d3.extent(lineData, function(d) { return d.showPrice; })).range([0, options.width]);
    yScale.domain([0, d3.max(lineData, function(d) { return d.showSum; })*1.1]).range([options.height, 0]);

    var center = xScale(midpoint);

    path.datum(lineData)
        .transition().duration(duration)
        .attr("d", d3.svg.line()
          .x(function(d) { return xScale(d.showPrice); })
          .y(function(d) { return yScale(d.showSum); }));


    xAxis.attr("transform", "translate(0," + yScale.range()[0] + ")").call(d3.svg.axis().scale(xScale))
    leftAxis.attr("transform", "translate(" + xScale.range()[0] + ",0)").call(d3.svg.axis().scale(yScale).orient("left").tickFormat(d3.format("s")));
    rightAxis.attr("transform", "translate(" + xScale.range()[1] + ",0)").call(d3.svg.axis().scale(yScale).orient("right").tickFormat(d3.format("s")));

    xTitle.text("Price ("+counterCurrency+")");
    leftTitle.text(baseCurrency);
    rightTitle.text(baseCurrency);

    centerline.transition().duration(duration)
      .attr("transform", "translate("+center+",0)").style("opacity",1);
    path.style("opacity",1);
    depth.transition().duration(duration).style("opacity",1);
    loader.transition().duration(duration).style("opacity",0);

  }

//show details on mouseover
  function mousemove () {
    var z = chart.style("zoom") || 1,
      tx  = Math.max(0, Math.min(options.width+options.margin.left, d3.mouse(this)[0])/z),
      i   = d3.bisect(lineData.map(function(d) { return d.showPrice; }), xScale.invert(tx-options.margin.left));
      d   = lineData[i];

        //prevent 0 sum numbers at best bid/ask from displaying
        if (d && !d.showSum) d = d.showPrice<midpoint ? lineData[i-1] : lineData[i+1];

    if (d) {
      var quantity = d.showTakerPays ? d.showTakerPays : d.showTakerGets;
      hover.attr("transform", "translate(" + xScale(d.showPrice) + ")").style("opacity",1);
      focus.attr("transform", "translate(" + xScale(d.showPrice) + "," + yScale(d.showSum) + ")").style("opacity",1);
      details.html("<span>Quantity:<b> " + quantity +
        "</b></span><span>Total:<b> " +d.showSum + " " + baseCurrency + "</b></span>" +
        "<span> @ <b>" + d.showPrice + " " + counterCurrency + "</b></span>")
        .style("opacity",1);
    }
  }

  function prepareBook () {
    bidsHead.select(".headerRow th:nth-child(1) span").html(baseCurrency);
    bidsHead.select(".headerRow th:nth-child(2) span").html(baseCurrency);
    bidsHead.select(".headerRow th:nth-child(3) span").html(counterCurrency);

    asksHead.select(".headerRow th:nth-child(1) span").html(counterCurrency);
    asksHead.select(".headerRow th:nth-child(2) span").html(baseCurrency);
    asksHead.select(".headerRow th:nth-child(3) span").html(baseCurrency);
  }

  //redraw the order book below the depth chart
  function redrawBook (type) {
    if (!self.offers.bids && !self.offers.asks) return;

    bookTables.transition().style("opacity",1);

    if (type === 'bids') {
      row = bidsBody.selectAll("tr").data(extractData('bids'));
      rowEnter = row.enter().append("tr");

      rowEnter.append('td').attr('class','sum');
      rowEnter.append('td').attr('class','dot');
      rowEnter.append('td').attr('class','sum-decimal');
      rowEnter.append('td').attr('class','size');
      rowEnter.append('td').attr('class','dot');
      rowEnter.append('td').attr('class','size-decimal');
      rowEnter.append('td').attr('class','price');
      rowEnter.append('td').attr('class','dot');
      rowEnter.append('td').attr('class','price-decimal');

    } else {

      row = asksBody.selectAll("tr").data(extractData('asks'));
      rowEnter = row.enter().append("tr");

      rowEnter.append('td').attr('class','price');
      rowEnter.append('td').attr('class','dot');
      rowEnter.append('td').attr('class','price-decimal');
      rowEnter.append('td').attr('class','size');
      rowEnter.append('td').attr('class','dot');
      rowEnter.append('td').attr('class','size-decimal');
      rowEnter.append('td').attr('class','sum');
      rowEnter.append('td').attr('class','dot');
      rowEnter.append('td').attr('class','sum-decimal');
    }

    row.select('.sum').html(function(d){return d[0]});
    row.select('.sum-decimal').html(function(d){return d[1]});
    row.select('.size').html(function(d){return d[2]});
    row.select('.size-decimal').html(function(d){return d[3]});
    row.select('.price').html(function(d){return d[4]});
    row.select('.price-decimal').html(function(d){return d[5]});
    row.selectAll('.dot').data(function (d) {
      return d.length ? [true,true,true] : [false,false,false]})
    .html(function(d) {return d ? '.' : '&nbsp'});
    row.attr("title", function (d){ return d[6]; });
    row.exit().remove();

    emitSpread();
    return;

    function splitValue (d, opts) {

      var parts;
      var decimalPart;
      var length;
      var pad;

      if (!d) return [];
      if (!opts) {
        opts = {
          precision      : 8,
          min_precision  : 4,
          max_sig_digits : 10
        };
      }

      value = d.to_human(opts);
      parts = value.split(".");
      parts[1] = parts[1] ? parts[1].replace(/0(0+)$/, '0<span class="insig">$1</span>') : null;
      return parts;
    }

    function extractData(type) {
      var length = 30;
      var offers = self.offers[type].slice(0,length);
      var data   = [];
      offers.forEach(function(offer) {
        var sum   = splitValue(offer.sum);
        var size  = splitValue(type === 'asks' ? offer.TakerGets : offer.TakerPays);
        var price = splitValue(offer.price);

        data.push([
          sum[0],
          sum[1],
          size[0],
          size[1],
          price[0],
          price[1],
          offer.Account
        ]);
      });

      return pad(data, length);
    }
  }


//suspend the resize listener, if the orderbook is resizable
  this.suspend = function () {
    if (asks) {
      asks.removeListener('model', handleAskModel);
      asks.unsubscribe();
    }

    if (bids) {
      bids.removeListener('model', handleBidModel);
      bids.unsubscribe();
    }
  }


//resize the chart when
  function resizeChart() {
    var oldWidth  = options.width;
    var oldHeight = options.height;
    var w = parseInt(wrap.style('width'), 10);
    var h = parseInt(wrap.style('height'), 10);

    options.width  = w - options.margin.left - options.margin.right;
    options.height = h - options.margin.top - options.margin.bottom;

    if (oldWidth  != options.width ||
        oldHeight != options.height) {

      depth
      .attr("width", options.width + options.margin.left + options.margin.right)
      .attr("height", options.height + options.margin.top + options.margin.bottom);

      depth.select('rect.background')
      .attr("width", options.width)
      .attr("height", options.height);

      drawData(true);
    }
  }

  function setStatus (string) {
    status.html(string).style("opacity",1);
    if (string) {
      loader.transition().style("opacity",0);
      path.transition().style("opacity",0);
      centerline.transition().style("opacity",0);
    }
  }

  function valueFilter (amount, opts) {
    return parseFloat(amount.to_human(
      opts ? opts : {
        precision      : 8,
        min_precision  : 0,
        max_sig_digits : 8,
        group_sep      : false
    }));
  }

  function pad(data, length) {
    length -= data.length;
    if (length<1) return data;

    var newArray = [];
    for (var i=0; i<length; i++) {newArray[i] = [];}
    return data.concat(newArray);
  }

  function emitSpread () {

    if (!self.offers.bids || !self.offers.asks) return;
    if (options.emit) {
      var opts = {
        precision      : 4,
        min_precision  : 4,
        max_sig_digits : 10
      }

      options.emit('spread', {
        bid : self.offers.bids[0] ? self.offers.bids[0].price.to_human(opts) : "0.0",
        ask : self.offers.asks[0] ? self.offers.asks[0].price.to_human(opts) : "0.0"
      });
    }
  }
}
