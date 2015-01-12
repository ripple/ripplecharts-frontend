var TickerWidget = function (options) {
   var self = this;

  self.el         = d3.select("#prices").attr("class", "prices");
  self.apiHandler = new ApiHandler(options.url);
  self.options    = options;

  loader = d3.select("body").append("img")
    .attr("class", "loader")
    .attr("src", "assets/images/rippleThrobber.png")

  //Not from QS
  if (options.markets){
    self.markets = options.markets;
    addMarkets(self.markets, function(){
    });
  }
  //--

  this.load = function(params){
    if (!params) params = {};
    if (!params.markets) params.markets = default_markets;
    self.markets = params.markets;
    addMarkets(self.markets);
  }

  this.loadFromQS = function(){
    var params = getParams();

    if (!params.markets) params.markets = default_markets;
    self.markets = params.markets;
    addMarkets(self.markets);
  }

  return this;
}

var Ticker = function(base, counter, markets, callback){
  var self = this;

  self.div        = markets.el.insert("div").attr("class","ticker");
  self.markets    = markets;
  self.price      = 0.0;

  req = self.markets.apiHandler.exchangeRates({
    base          : base,
    counter       : counter,
    last          : true
  }, function(err, data){
    
    var gateways = ripple.currencyDropdown();
    base.name = gateways.getName(base.issuer);
    counter.name = gateways.getName(counter.issuer);

    self.price = data[0].last;
    console.log("Initial:", self.price);

    self.div.on("click", function(d){
      var path = "markets/"+base.currency+
        (base.issuer ? ":"+base.issuer : "")+
        "/"+counter.currency+
        (counter.issuer ? ":"+counter.issuer : "");
      window.location.href = "http://www.ripplecharts.com/#/" + path;
    });

    if (base.name !== "")
      self.div.append("div")
        .attr("class", "bgateway priceWrapper")
        .text(base.name);
      self.div.attr("id", base.name);

    if (counter.name !== "")
      self.div.append("div")
        .attr("class", "cgateway priceWrapper")
        .text(counter.name);
      self.div.attr("id", counter.name);

    self.div.append("div")
      .attr("class", "price priceWrapper")
      .text(parseFloat(self.price).toFixed(6));

    self.div.append("div")
      .attr("class", "bcurr priceWrapper")
      .text(base.currency);

    self.div.append("div")
      .attr("class", "ccurr priceWrapper")
      .text(counter.currency);

    self.div.append("div")
      .attr("class", "prev pricestatus priceunch")

    callback();
  });

  setLiveFeed(base, counter);

  //enable the live feed via ripple-lib
  function setLiveFeed (base, counter) {
    console.log("Starting with:", base.currency, counter.currency);
    var point = {
        startTime     : moment.utc(),
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
      base    : base,
      counter : counter,
      timeIncrement    : "minute",
      timeMultiple     : 15,
      incompleteApiRow : point
    }
    
    liveFeed = new OffersExercisedListener (viewOptions, liveUpdate);
  }

  //add new data from the live feed to the chart  
  function liveUpdate (data) {
    var prev = self.price;
    var direction;

    if (data.close !== 0) self.price = data.close;
    if (prev < self.price) direction = "up";
    else if (prev > self.price) direction = "down";
    else direction = "unch";
    
    console.log(base.currency, counter.currency, "price:", self.price, "prev", prev, direction);

    self.div.select(".price")
      .text(parseFloat(self.price).toFixed(6));

    if (direction === "up") self.div.select(".prev").attr("class", "prev pricestatus priceup");
    else if (direction === "down") self.div.select(".prev").attr("class", "prev pricestatus pricedown");
    //else self.div.select(".prev").attr("class", "prev pricestatus priceunch");

  }
}

function addTicker(base, counter, callback){
  new Ticker(base, counter, self, callback);
};

function getParams () {
  var params = {};
  var query  = window.location.search.substring(1);
  var vars   = query ? query.split("&") : [];
  
  for (var i = 0; i < vars.length; i++) {
    var pair  = vars[i].split('=');
    var key   = decodeURIComponent(pair[0]);
    var value = decodeURIComponent(pair[1]);
    
    try {
      params[key] = JSON.parse(value);
    } catch (e) { //invalid json
      params[key] = value;
    } 
  } 
  console.log(params);
  return params;   
}

function addMarkets(markets){
  //add markets async and once done, remove loader
  var count = 0;
  for (var i=0; i<markets.length; i++){
    var market = markets[i];
    console.log(i, market);
    addTicker(market.base, market.counter, function(){
      console.log(markets.length, count);
      count += 1;
      if (count === markets.length) {
        console.log('done');
        d3.selectAll(".loader").remove();
        d3.selectAll(".ticker").style("opacity", 1);
        
        $("#prices").smoothDivScroll({
            autoScrollingDirection: "endlessLoopRight",
            autoScrollingStep: 1,
            autoScrollingInterval: 15,
            hotSpotScrolling: false 
          });

        $("#prices").smoothDivScroll("startAutoScrolling");

        $("#prices").bind("mouseover", function(){
          $("#prices").smoothDivScroll("stopAutoScrolling");
        });
        
        // Mouse out
        $("#prices").bind("mouseout", function(){
          $("#prices").smoothDivScroll("startAutoScrolling");
        });


      }
    });
  }
}

var default_markets = [
  {
    base: {"currency":"XRP"},
    counter: {"currency":"USD","issuer":"rMwjYedjc7qqtKYVLiAccJSmCwih4LnE2q"}
  }
];

