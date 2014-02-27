var OrderBook = function (options) {
  var self    = this, asks, bids, isLoading;
  self.offers;
  
  var r      = options.remote; 
  var chart  = d3.select("#"+options.chartID).attr('class','orderbookChart'),
    svg, depth, gEnter, 
    xAxis, leftAxis, rightAxis,
    xTitle, leftTitle, rightTitle,
    hover, focus, centerline, path, midpoint,
    status, details, loader;
    
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
    options.base  = base;
    options.trade = trade;
    lineData      = [];
    self.offers   = {};

    bookTables.transition().style("opacity", 0.5);
    fadeChart();
    isLoading = true;
    
    if (asks) {
      asks.removeListener('model', handleAskModel);
      r.request_unsubscribe()
        .books([asks.to_json()])
        .request();
    }
    if (bids) {
      bids.removeListener('model', handleBidModel); 
      r.request_unsubscribe()
        .books([bids.to_json()])
        .request();
      }  
     
    r._books = {};
    r._events.prepare_subscribe = [];
    
    asks = r.book(options.base.currency, options.base.issuer, options.trade.currency, options.trade.issuer)
    bids = r.book(options.trade.currency, options.trade.issuer, options.base.currency, options.base.issuer);         
    
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
    var max_rows = options.max_rows || 100,
      rowCount   = 0,
      offers     = [];
    
    for (var i=0; i<data.length; i++) {
      var d = data[i];
 
      // prefer taker_pays_funded & taker_gets_funded
      if (d.hasOwnProperty('taker_gets_funded')) {
        d.TakerGets = d.taker_gets_funded;
        d.TakerPays = d.taker_pays_funded;
      }

      d.TakerGets = ripple.Amount.from_json(d.TakerGets);
      d.TakerPays = ripple.Amount.from_json(d.TakerPays);

      d.price = ripple.Amount.from_quality(d.BookDirectory, "1", "1");

      if (action !== "asks") d.price = ripple.Amount.from_json("1/1/1").divide(d.price);
      
      // Adjust for drops: The result would be a million times too large.
      if (d[action === "asks" ? "TakerPays" : "TakerGets"].is_native())
        d.price  = d.price.divide(ripple.Amount.from_json("1000000"));

      // Adjust for drops: The result would be a million times too small.
      if (d[action === "asks" ? "TakerGets" : "TakerPays"].is_native())
        d.price  = d.price.multiply(ripple.Amount.from_json("1000000"));
          
      if (rowCount++ > max_rows) break;

      offers.push(d);              
    }
    
    var type = action === "asks" ? "TakerGets" : "TakerPays";
    var sum;
    
    offers.forEach(function(offer,index) {
      if (sum) sum = offer.sum = sum.add(offer[type]);
      else sum = offer.sum = offer[type];
      
      offer.showSum   = parseFloat(valueFilter(offer.sum));
      offer.showPrice = parseFloat(valueFilter(offer.price));
      
      var showValue = action === 'bids' ? 'TakerPays' : 'TakerGets';
      offer['show' + showValue] = parseFloat(valueFilter(offer[showValue]));
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
    
    xTitle.text("Price ("+options.trade.currency+")");
    leftTitle.text(options.base.currency);
    rightTitle.text(options.base.currency);
    
    centerline.transition().attr("transform", "translate("+center+",0)").style("opacity",1);
    path.style("opacity",1);
    depth.transition().style("opacity",1); 
    loader.transition().style("opacity",0);   
   
  }

//show details on mouseover  
  function mousemove () {
    var tx = Math.max(0, Math.min(options.width+options.margin.left, d3.mouse(this)[0])),
        i = d3.bisect(lineData.map(function(d) { return d.showPrice; }), xScale.invert(tx-options.margin.left));
        d = lineData[i];
        
        //prevent 0 sum numbers at best bid/ask from displaying
        if (d && !d.showSum) d = d.showPrice<midpoint ? lineData[i-1] : lineData[i+1]; 

    if (d) {
      var quantity = d.showTakerPays ? d.showTakerPays : d.showTakerGets;
      hover.attr("transform", "translate(" + xScale(d.showPrice) + ")").style("opacity",1);
      focus.attr("transform", "translate(" + xScale(d.showPrice) + "," + yScale(d.showSum) + ")").style("opacity",1); 
      details.html("<span>Quantity:<b>" + quantity + 
        "</b></span><span>Total<b>" +d.showSum + " " + options.base.currency + "</b></span>" + 
        "<span> @ <b>" + d.showPrice + " " + options.trade.currency + "</b></span>")
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
      if (!d) return "&nbsp";
      value = ripple.Amount.from_human(d).to_human({
          precision      : 5,
          min_precision  : 5,
          max_sig_digits : 7
      }); 
      
      var parts = value.split(".");
      var decimalPart = parts[1] ?  parts[1].replace(/0(0+)$/, '0<span class="insig">$1</span>') : null;
      value = decimalPart && decimalPart.length > 0 ? parts[0] + "." + decimalPart : parts[0];
      return value;        
    }
    
    bidsHead.select(".headerRow th:nth-child(1) span").html(options.base.currency);
    bidsHead.select(".headerRow th:nth-child(2) span").html(options.base.currency);
    bidsHead.select(".headerRow th:nth-child(3) span").html(options.trade.currency);
    
    asksHead.select(".headerRow th:nth-child(1) span").html(options.trade.currency);
    asksHead.select(".headerRow th:nth-child(2) span").html(options.base.currency);
    asksHead.select(".headerRow th:nth-child(3) span").html(options.base.currency);
    
    var length   = 20; 
    var row      = bidsBody.selectAll("tr").data(pad(self.offers.bids.slice(0,length),length));
    var rowEnter = row.enter().append("tr");
    
    rowEnter.append("td").attr("class","sum");
    rowEnter.append("td").attr("class","size");
    rowEnter.append("td").attr("class","price");
    row.exit().remove();
    
    row.select(".sum").html(function(offer){return filter(offer.showSum)});
    row.select(".size").html(function(offer){return filter(offer.showTakerPays)});
    row.select(".price").html(function(offer){return filter(offer.showPrice)});
    
    row      = asksBody.selectAll("tr").data(pad(self.offers.asks.slice(0,length),length));
    rowEnter = row.enter().append("tr");
    
    rowEnter.append("td").attr("class","price");
    rowEnter.append("td").attr("class","size");
    rowEnter.append("td").attr("class","sum");
    row.exit().remove();
    
    row.select(".sum").html(function(offer){return filter(offer.showSum)});
    row.select(".size").html(function(offer){return filter(offer.showTakerGets)});
    row.select(".price").html(function(offer){return filter(offer.showPrice)}); 
    
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
  
  function valueFilter (price, opts) {
    return ripple.Amount.from_json(price).to_human(
      opts ? opts : {
        precision      : 8,
        min_precision  : 0,
        max_sig_digits : 8,
        group_sep      : false
    });  
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
        bid : self.offers.bids[0] ? ripple.Amount.from_human(self.offers.bids[0].showPrice).to_human(opts) : "0.0",
        ask : self.offers.asks[0] ? ripple.Amount.from_human(self.offers.asks[0].showPrice).to_human(opts) : "0.0"
      });
    }  
  }
}
