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
    .attr("colspan",3)
    .text(function(d) {return d;});

  //append second header
  bidsHead.append("tr").attr("class","headerRow").selectAll("th")
    .data(["Total","Size","Bid Price"])
    .enter().append("th")
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
    .attr("colspan",3)
    .text(function(d) {return d;});

  //append second header
  asksHead.append("tr").attr("class","headerRow").selectAll("th")
    .data(["Ask Price","Size","Total"])
    .enter().append("th")
    .text(function(d) {return d;})
    .append("span");


  drawChart(); //draw the blank chart


//subscribe to market data for trading pair
  this.getMarket = function (base, trade) {
    options.base    = base;
    options.trade   = trade;
    lineData        = [];
    self.offers     = {};
    baseCurrency    = base.currency;
    counterCurrency = trade.currency;

    bookTables.transition().style("opacity", 0.5);
    fadeChart();
    isLoading = true;
    prepareBook();

    function addListeners() {
      if (asks) {
        asks.removeListener('model', handleAskModel);
      }

      if (bids) {
        bids.removeListener('model', handleBidModel);
      }

      asks = rippleOrderbook.OrderBook.createOrderBook(r, {
        currency_pays: options.trade.currency,
        issuer_pays: options.trade.issuer,
        currency_gets: options.base.currency,
        issuer_gets: options.base.issuer
      });

      bids = rippleOrderbook.OrderBook.createOrderBook(r, {
        currency_pays: options.base.currency,
        issuer_pays: options.base.issuer,
        currency_gets: options.trade.currency,
        issuer_gets: options.trade.issuer
      });

      asks.on('model', handleAskModel);
      bids.on('model', handleBidModel);
    }

    if (r.isConnected()) {
      addListeners();
    } else {
      r.connect()
      .then(addListeners)
      .catch(function(e) {
        console.log(e);
      });
    }
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
  function handleBook (data, action) {
    var max_rows = options.max_rows || 100;
    var rowCount = 0;
    var type = action === "asks" ? "gets" : "pays";
    var offers = [];
    var priceBook = { };
    var sum = 0;
    var offer;
    var price;
    var sig = 4; //significant digits for price
    var exponent;
    var precision;
    var amount;
    var i;

    function decimalAdjust(type, value, exp) {
      // If the exp is undefined or zero...
      if (typeof exp === 'undefined' || +exp === 0) {
        return Math[type](value);
      }
      value = +value;
      exp = +exp;
      // If the value is not a number or the exp is not an integer...
      if (isNaN(value) || !(typeof exp === 'number' && exp % 1 === 0)) {
        return NaN;
      }
      // Shift
      value = value.toString().split('e');
      value = Math[type](+(value[0] + 'e' + (value[1] ? (+value[1] - exp) : -exp)));
      // Shift back
      value = value.toString().split('e');
      return +(value[0] + 'e' + (value[1] ? (+value[1] + exp) : exp));
    }

    function formatAmount(price, opts) {
      if (!opts) opts = {};

      if (opts.ask) {
        price = decimalAdjust('ceil', price, exponent);
        return price.toFixed(exponent < 0 ? (0 - exponent) : 0);
      } else if (opts.bid) {
        price = decimalAdjust('floor', price, exponent);
        return price.toFixed(exponent < 0 ? (0 - exponent) : 0);
      }

      price = price.toFixed(precision);
      if (Number(price) === 0) {
        return '< ' + Math.pow(10, 0 - precision);
      } else {
        return price;
      }
    }

    for(i=0; i<data.length; i++) {
      if (data[i].taker_gets_funded === "0" ||
          data[i].taker_pays_funded === "0") {
        continue;
      }

      offer = {
        account: data[i].Account || 'AUTOBRIDGED',
        price: Number(data[i].quality)
      };

      if (data[i].TakerGets.value) {
        offer.gets = Number(data[i].taker_gets_funded);
      } else {
        offer.gets = Number(data[i].taker_gets_funded) / 1000000.0;
        offer.price *= 1000000.0;
      }

      if (data[i].TakerPays.value) {
        offer.pays = Number(data[i].taker_pays_funded);
      } else {
        offer.pays = Number(data[i].taker_pays_funded) / 1000000.0;
        offer.price /= 1000000.0;
      }

      if (action === 'bids') {
        offer.price = 1 / offer.price;
      }

      // exponent determines the number
      // of decimals in the price
      // precision determines the number
      // of decimals in the size and sum
      // not less than 0 and 4 orders of
      // magintude greater than the price
      if (!exponent) {
        exponent = Math.log(Number(offer.price))/Math.log(10);
        exponent = Math.floor(exponent) - sig + 1;
        precision = exponent > -4 ? exponent + 4 : 0;
      }

      offers.push(offer);
    }

    for (i=0; i<offers.length; i++) {
      if (rowCount >= max_rows) break;

      amount = offers[i][type];
      price = formatAmount(offers[i].price, {
        bid : action === 'bids' ? true : false,
        ask : action === 'asks' ? true : false
      });

      if (!sum) {
        sum = amount;
      } else {
        sum += amount;
      }

      if (!priceBook[price]) {
        priceBook[price] = { };
        priceBook[price].accounts = [];
        priceBook[price].size = amount;
        priceBook[price].price = Number(price);
        priceBook[price].displayPrice = price;

        rowCount++;

      } else {
        priceBook[price].size += amount;
      }

      priceBook[price].sum = sum;
      priceBook[price].accounts.push(offers[i].account);
    }

    var prices = Object.keys(priceBook);
    prices.sort(function(a, b) {
      if (action === 'asks') {
        return Number(a) - Number(b);
      } else {
        return Number(b) - Number(a);
      }
    });

    return prices.map(function(price) {
      priceBook[price].displaySize = formatAmount(priceBook[price].size);
      priceBook[price].displaySum = formatAmount(priceBook[price].sum);
      return priceBook[price];
    });
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
      setStatus('&nbsp');
      return;
    }

    var duration = update ? 0 : 250;
    var bestBid = self.offers.bids[0].price;
    var bestAsk = self.offers.asks[0].price;

    midpoint = (bestBid+bestAsk)/2;

    //add 0 size at best bid and ask
    lineData = self.offers.bids.slice(0).reverse();
    lineData.push({price: bestBid, sum: 0});
    lineData.push({price: bestAsk, sum: 0});
    lineData = lineData.concat(self.offers.asks);

    if (lineData.length<3) {
      loader.transition().duration(duration).style("opacity",0);
      path.transition().duration(duration).style("opacity",0);
      return;
    }

    setStatus('');
    isLoading = false;

    //get rid of outliers, anything greater than 5 times the best price
    var min = Math.max(d3.min(lineData, function(d) { return d.price; }), bestBid/5);
    var max = Math.min(d3.max(lineData, function(d) { return d.price; }), bestAsk*5);

    var i = lineData.length;

    while (i--) {
      if (lineData[i].price < min ||
          lineData[i].price > max) {
        lineData.splice(i, 1);
      }
    }

    xScale.domain(d3.extent(lineData, function(d) {return d.price;})).range([0, options.width]);
    yScale.domain([0, d3.max(lineData, function(d) { return d.sum;})*1.1]).range([options.height, 0]);

    var center = xScale(midpoint);

    path.datum(lineData)
        .transition().duration(duration)
        .attr("d", d3.svg.line()
          .x(function(d) { return xScale(d.price); })
          .y(function(d) { return yScale(d.sum); }));


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
      i   = d3.bisect(lineData.map(function(d) { return d.price; }), xScale.invert(tx-options.margin.left));
      d   = lineData[i];

        //prevent 0 sum numbers at best bid/ask from displaying
        if (d && !d.sum) d = d.price < midpoint ? lineData[i-1] : lineData[i+1];

    if (d) {
      hover.attr("transform", "translate(" + xScale(d.price) + ")")
        .style("opacity", 1);
      focus.attr("transform", "translate(" + xScale(d.price) + "," + yScale(d.sum) + ")")
        .style("opacity", 1);
      details.html("<span>Quantity:<b> " + d.displaySize +
        "</b></span><span>Total:<b> " +d.displaySum + " " + baseCurrency + "</b></span>" +
        "<span> @ <b>" + d.displayPrice + " " + counterCurrency + "</b></span>")
        .style("opacity", 1);
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
      rowEnter.append('td').attr('class','size');
      rowEnter.append('td').attr('class','price');

    } else {

      row = asksBody.selectAll("tr").data(extractData('asks'));
      rowEnter = row.enter().append("tr");

      rowEnter.append('td').attr('class','price');
      rowEnter.append('td').attr('class','size');
      rowEnter.append('td').attr('class','sum');
    }

    row.select('.sum').html(function(d){return formatAmount(d.displaySum)});
    row.select('.size').html(function(d){return formatAmount(d.displaySize)});
    row.select('.price').html(function(d){return formatAmount(d.displayPrice)});
    row.attr('title', function(d){return d.accounts ? d.accounts.join('\n') : null});
    row.exit().remove();

    emitSpread();
    return;

    function formatAmount (amount) {
      if (!amount) {
        return '&nbsp';
      } else if (amount.indexOf('<') !== -1) {
        return amount;
      }

      parts = amount.split(".");
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");

      if (parts[1]) {
        parts[1] = parts[1].replace(/0(0+)$/, '0<span class="insig">$1</span>');
        parts[1] = '<span class="decimal">.' + parts[1] + '</span>';
      }

      return parts[1] ? parts[0] + parts[1] : parts[0];
    }

    function extractData(type) {
      var length = 30;
      var offers = self.offers[type].slice(0,length);

      return pad(offers, length);
    }
  }


//suspend the resize listener, if the orderbook is resizable
  this.suspend = function () {
    if (asks) {
      asks.removeListener('model', handleAskModel);
    }

    if (bids) {
      bids.removeListener('model', handleBidModel);
    }
  }


//resize the chart when
  function resizeChart() {
    var oldWidth  = options.width;
    var oldHeight = options.height;
    var w = parseInt(wrap.style('width'), 10);
    var h = parseInt(wrap.style('height'), 10);

    if (!w || !h) return;

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

  function pad(data, length) {
    length -= data.length;
    if (length<1) return data;

    var newArray = [];
    for (var i=0; i<length; i++) {newArray[i] = [];}
    return data.concat(newArray);
  }

  function emitSpread () {
    if (!self.offers.bids || !self.offers.asks) return;
    options.emit('spread', {
      bid : self.offers.bids[0] ? self.offers.bids[0].displayPrice : "0.0",
      ask : self.offers.asks[0] ? self.offers.asks[0].displayPrice : "0.0"
    });
  }
}
