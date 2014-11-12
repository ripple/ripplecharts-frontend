var OrderBook = function (options) {
  var self    = this, asks, bids, isLoading;
  self.offers;
  
  var r      = options.remote; 
  var chart  = d3.select("#"+options.chartID).attr('class','orderbookChart'),
    svg, depth, gEnter, 
    xAxis, leftAxis, rightAxis,
    xTitle, leftTitle, rightTitle,
    hover, focus, centerline, path, midpoint,
    status, details, loader,
    baseCurrency, counterCurrency;
    
  if (!options.margin) options.margin = {top: 2, right: 60, bottom: 20, left: 60};
  if (!options.width)  options.width  = parseInt(chart.style('width'), 10) - options.margin.left - options.margin.right;
  if (!options.height) options.height = options.width/4;
      
  var xScale = d3.scale.linear(),
    yScale   = d3.scale.linear(),
    lineData = [];
    
  if (options.resize && typeof addResizeListener === 'function') {
    addResizeListener(window, resizeChart);
  } else {
    var padding = parseInt(details.style('padding-left'), 10)+parseInt(details.style('padding-right'), 10);
    details.style("width", (options.width-padding)+"px").style("right","auto");
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
    baseCurrency    = ripple.Currency.from_json(base.currency).to_human();
    counterCurrency = ripple.Currency.from_json(trade.currency).to_human();
    
    bookTables.transition().style("opacity", 0.5);
    fadeChart();
    isLoading = true;
    if (!r.connected) r.connect();
    
    if (asks) {
      asks.removeListener('model', handleAskModel);
    }
    if (bids) {
      asks.removeListener('model', handleAskModel);
    }  
     
    r._books = {};
    r._events.prepare_subscribe = [];
    
    asks = r.book(options.base.currency, options.base.issuer, options.trade.currency, options.trade.issuer)
    bids = r.book(options.trade.currency, options.trade.issuer, options.base.currency, options.base.issuer); 
    
    asks.offersSync();
    bids.offersSync();
    
    function handleAskModel (offers) {
      self.offers.asks = handleBook(offers,'asks');
      drawData(); 
      redrawBook();     
    }
    
    function handleBidModel (offers) {
      self.offers.bids = handleBook(offers,'bids');
      drawData(); 
      redrawBook();      
    }
    
    asks.on('model', handleAskModel);   
    bids.on('model', handleBidModel); 
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
  function drawData () {
    if (!self.offers.bids || !self.offers.asks) return; //wait for both to load
    if (!self.offers.bids.length || !self.offers.asks.length) {
      setStatus("No Orders");  
      return;
    }

    var bestBid = self.offers.bids[0].showPrice,
      bestAsk   = self.offers.asks[0].showPrice;
      
    midpoint = (bestBid+bestAsk)/2;  
         
    //add 0 size at best bid and ask
    lineData = self.offers.bids.slice(0).reverse();
    lineData.push({showPrice:bestBid,showSum:0});
    lineData.push({showPrice:bestAsk,showSum:0});
    lineData = lineData.concat(self.offers.asks);
   
    if (lineData.length<3) {
      loader.transition().style("opacity",0); 
      path.transition().style("opacity",0);  
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
        .transition()
        .attr("d", d3.svg.line()
          .x(function(d) { return xScale(d.showPrice); })
          .y(function(d) { return yScale(d.showSum); }));
  
    
    xAxis.attr("transform", "translate(0," + yScale.range()[0] + ")").call(d3.svg.axis().scale(xScale))
    leftAxis.attr("transform", "translate(" + xScale.range()[0] + ",0)").call(d3.svg.axis().scale(yScale).orient("left").tickFormat(d3.format("s")));
    rightAxis.attr("transform", "translate(" + xScale.range()[1] + ",0)").call(d3.svg.axis().scale(yScale).orient("right").tickFormat(d3.format("s")));
    
    xTitle.text("Price ("+counterCurrency+")");
    leftTitle.text(baseCurrency);
    rightTitle.text(baseCurrency);
    
    centerline.transition().attr("transform", "translate("+center+",0)").style("opacity",1);
    path.style("opacity",1);
    depth.transition().style("opacity",1); 
    loader.transition().style("opacity",0);   
   
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
 
 
//redraw the order book below the depth chart  
  function redrawBook () {
    // create a row for each object in the data
    if (!self.offers.bids || !self.offers.asks) return;
    if (self.offers.bids.length || self.offers.asks.length)
      bookTables.transition().style("opacity",1);

    
    function filter (d) {
      var opts = {
          precision      : 8,
          min_precision  : 2,
          max_sig_digits : 8
      };
      var parts;
      var decimalPart;
      var length;
      
      if (!d) return "&nbsp";
      
      value = d.to_human(opts); 
      
      parts = value.split(".");
      if (parts[1] && parts[0] === "0") {
        parts[1] = formatDecimal(parts[1], 4);
      } else if (parts[1]) {
        parts[1] = parts[1].slice(0, 4);
      }
      
      decimalPart = parts[1] ?  parts[1].replace(/0(0+)$/, '0<span class="insig">$1</span>') : null;
      value = decimalPart && decimalPart.length > 0 ? parts[0] + "." + decimalPart : parts[0];
      return value;  
      
      
      function formatDecimal (num, digits) {
        var sig = parseInt(num, 10).toString().length;
        if (sig < digits) {
          while (digits > sig++) num += '0';
          return num;
        } 
        
        return num.slice(0, num.length - sig + digits);
      }
    }
    
    bidsHead.select(".headerRow th:nth-child(1) span").html(baseCurrency);
    bidsHead.select(".headerRow th:nth-child(2) span").html(baseCurrency);
    bidsHead.select(".headerRow th:nth-child(3) span").html(counterCurrency);
    
    asksHead.select(".headerRow th:nth-child(1) span").html(counterCurrency);
    asksHead.select(".headerRow th:nth-child(2) span").html(baseCurrency);
    asksHead.select(".headerRow th:nth-child(3) span").html(baseCurrency);
    
    var length   = 20; 
    var row      = bidsBody.selectAll("tr").data(pad(self.offers.bids.slice(0,length),length));
    var rowEnter = row.enter().append("tr");
    
    rowEnter.append("td").attr("class","sum");
    rowEnter.append("td").attr("class","size");
    rowEnter.append("td").attr("class","price");
    row.exit().remove();
    
    row.select(".sum").html(function(offer){return filter(offer.sum)});
    row.select(".size").html(function(offer){return filter(offer.TakerPays)});
    row.select(".price").html(function(offer){return filter(offer.price)});
    row.attr("title", function (d){ return d.Account; });
    
    row      = asksBody.selectAll("tr").data(pad(self.offers.asks.slice(0,length),length));
    rowEnter = row.enter().append("tr");
    
    rowEnter.append("td").attr("class","price");
    rowEnter.append("td").attr("class","size");
    rowEnter.append("td").attr("class","sum");
    row.exit().remove();
    
    row.select(".sum").html(function(offer){return filter(offer.sum)});
    row.select(".size").html(function(offer){return filter(offer.TakerGets)});
    row.select(".price").html(function(offer){return filter(offer.price)}); 
    row.attr("title", function (d){ return d.Account; });
    
    emitSpread();
  }


//suspend the resize listener, if the orderbook is resizable  
  this.suspend = function () {
    if (options.resize && typeof removeResizeListener === 'function')
    removeResizeListener(window, resizeChart);   
  }


//resize the chart when   
  function resizeChart() {
    old = options.width;
    w = parseInt(chart.style('width'), 10);
    options.width  = w-options.margin.left - options.margin.right;
    options.height = options.width/4;
    
    if (old != options.width) {
      drawChart(); 
      drawData();
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
    for (var i=0; i<length; i++) {newArray[i] = {};}
    return data.concat(newArray);
  }
  
  function emitSpread () {
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
