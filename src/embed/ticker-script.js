gateways = JSON0;

var TickerWidget = function (options) {
  var self = this;

  self.el         = d3.select("#prices").attr("class", "prices");
  self.apiHandler = new ApiHandler(options.url);
  self.options    = options;
  self.markets    = options.markets;

  for (var i=0; i<self.markets.length; i++){
    var market = self.markets[i];
    console.log(i, market);
    addTicker(market.base, market.counter);
  }

}

var Ticker = function(base, counter, markets){
  var self = this;
  
  self.div        = markets.el.insert("div").attr("class","ticker");
  self.markets    = markets;
  self.price      = 0.0;

  req = self.markets.apiHandler.exchangeRates({
    base          : base,
    counter       : counter,
    last          : true
  }, function(err, data){
    self.price = data[0].last;
    console.log("Initial:", self.price);

  var test = ripple.currencyDropdown();
  var base_gateway = test.getName(counter.issuer);
  console.log("bgateway", counter.issuer, base_gateway);
    
/*    self.div.append("div")
      .attr("class", "gateway")
      .text();*/

    self.div.append("div")
      .attr("class", "price element")
      .text(parseFloat(self.price).toFixed(6));

    self.div.append("div")
      .attr("class", "bcurr element")
      .text(base.currency);

    self.div.append("div")
      .attr("class", "ccurr element")
      .text(counter.currency);

    self.div.append("div")
      .attr("class", "prev priceunch")

    self.div.on("click", function(){
      console.log("clicked");
      var path = "/markets/"+base.currency+
      (base.issuer ? ":"+base.issuer : "")+
      "/"+counter.currency+
      (counter.issuer ? ":"+counter.issuer : "");
      $location.path(path);
      $scope.$apply()
    });
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

    if (direction === "up") self.div.select(".prev").attr("class", "prev priceup");
    else if (direction === "down") self.div.select(".prev").attr("class", "prev pricedown");
    else self.div.select(".prev").attr("class", "prev priceunch");

  }
}

function addTicker(base, counter, name){
  new Ticker(base, counter, self);
};

