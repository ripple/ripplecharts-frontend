angular.module( 'ripplecharts.markets', [
  'ui.state',
  'ui.bootstrap'
])

.config(function config( $stateProvider ) {
  $stateProvider.state( 'markets', {
    url: '/markets',
    views: {
      "main": {
        controller: 'MarketsCtrl',
        templateUrl: 'markets/markets.tpl.html'
      }
    },
    data:{ pageTitle: 'Markets' }
  });
})

.controller( 'MarketsCtrl', function MarketsCtrl( $scope ) {
  
//load settings from session, local storage, options, or defaults  
  $scope.base  = store.session.get('base') || store.get('base') || 
    Options.base || {currency:"XRP", issuer:""};
  
  $scope.trade = store.session.get('trade') || store.get('trade') || 
    Options.trade || {currency:"USD", issuer:"rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B"};
  
  $scope.chartType = store.session.get('chartType') || store.get('chartType') || 
    Options.chartType || "line";
  
  $scope.interval  = store.session.get('interval') || store.get('interval') || 
    Options.interval  || "1h";

//set up the currency pair dropdowns
  var loaded  = false, 
    dropdownB = ripple.currencyDropdown().selected($scope.trade)
      .on("change", function(d) {
        if (loaded) {
          $scope.trade = d;
          loadPair();
        }}),
    dropdownA = ripple.currencyDropdown().selected($scope.base)
      .on("change", function(d) {
        if (loaded) {
          $scope.base = d;
          loadPair();
        }});

  d3.select("#base").call(dropdownA);
  d3.select("#quote").call(dropdownB);
  d3.select("#flip").on("click", function(){ //probably better way to do this
    dropdownA.selected($scope.trade);
    dropdownB.selected($scope.base);
    d3.select("#base").selectAll("select").remove();
    d3.select("#quote").selectAll("select").remove();
    loaded = false;
    d3.select("#base").call(dropdownA);
    d3.select("#quote").call(dropdownB);
    loaded = true;
    
    swap         = $scope.trade;
    $scope.trade = $scope.base;
    $scope.base  = swap;
    loadPair();
  });
  
  
//set up the interval selector  
  var list = d3.select("#interval").attr("class","selectList")
  list.append("label").html("Interval:");
  var interval = list.selectAll("a")
    .data([
      {name: "5s",  interval:"second", multiple:5,  offset: function(d) { return d3.time.hour.offset(d, -1); }},
      {name: "1m",  interval:"minute", multiple:1,  offset: function(d) { return d3.time.hour.offset(d, -2); }},
      {name: "5m",  interval:"minute", multiple:5,  offset: function(d) { return d3.time.hour.offset(d, -12); }},
      {name: "15m", interval:"minute", multiple:15, offset: function(d) { return d3.time.day.offset(d, -2); }},
      {name: "1h",  interval:"hour",   multiple:1,  offset: function(d) { return d3.time.day.offset(d, -5); }},
      {name: "4h",  interval:"hour",   multiple:4,  offset: function(d) { return d3.time.day.offset(d, -20); }},
      {name: "1d",  interval:"day",    multiple:1,  offset: function(d) { return d3.time.day.offset(d, -120); }},
      {name: "3d",  interval:"day",    multiple:3,  offset: function(d) { return d3.time.year.offset(d, -1); }}
      //{name: "1w",  interval:"week",   multiple:1,  offset: function(d) { return d3.time.year.offset(d, -3); }}
      ])
    .enter().append("a")
    .attr("href", "#")
    .classed("selected", function(d) { return d.name === $scope.interval })
    .text(function(d) { return d.name; })
    .on("click", function(d) {
      d3.event.preventDefault();
      var that = this;
      store.set("interval", d.name);
      store.session.set("interval", d.name);
      
      interval.classed("selected", function() { return this === that; });
      priceChart.load($scope.base, $scope.trade, d);
    });
    
//set up the chart type selector    
  var chartType = d3.select("#chartType").attr("class","selectList").selectAll("a")
    .data(["line", "candlestick"])
    .enter().append("a")
    .attr("href", "#")
    .classed("selected", function(d) { return d === $scope.chartType; })
    .text(function(d) { return d })   
    .on("click", function(d) {
      d3.event.preventDefault();
      var that = this;
      store.set("chartType", d);
      store.session.set("chartType", d);
      
      chartType.classed("selected", function() { return this === that; });
      chartType.selected = d;
      priceChart.setType(d);
    });

//set up the price chart
  var priceChart = new PriceChart ({
    id     : "#priceChart",
    url    : API,  
    type   : $scope.chartType,
    resize : true
  });   

  loaded = true;
//the code below should not be needed as it should load via the 'online' indicator
//d3.select("#interval .selected")[0][0].click(); //to load the first chart


//new connection needed for now because of a bug in ripple-lib 
//when unsubscribing from an orderbook.
  var orderBookRemote = new ripple.Remote(Options.ripple);
  orderBookRemote.connect();
     
//set up the order book      
  book = new OrderBook ({
    chartID : "bookChart",
    tableID : "bookTables",
    remote  : orderBookRemote,
    resize  : true
  });
  
  book.resetChart();
  book.getMarket($scope.base, $scope.trade); 

//set up trades feed  
  tradeFeed = new TradeFeed({
    id     : "tradeFeed",
    url    : API   
  });
  
  tradeFeed.loadPair ($scope.base, $scope.trade);


//single function to reload all feeds when something changes
  function loadPair() {
    
    var interval = d3.select("#interval .selected").datum();
    
    store.set('base',  $scope.base);
    store.set('trade', $scope.trade);
    
    store.session.set('base',  $scope.base);
    store.session.set('trade', $scope.trade);
        
    priceChart.load($scope.base, $scope.trade, interval);
    book.getMarket($scope.base, $scope.trade); 
    tradeFeed.loadPair ($scope.base, $scope.trade);   
    mixpanel.track("Price Chart", {
      "Base Currency"  : $scope.base.currency,
      "Base Issuer"    : $scope.base.issuer || "",
      "Trade Currency" : $scope.trade.currency,
      "Trade Issuer"   : $scope.trade.issuer || "",
      "Interval"       : interval.name,
      "Chart Type"     : priceChart.type
    }); 
  }


//stop the listeners when leaving page  
  $scope.$on("$destroy", function(){
    priceChart.suspend();
    book.suspend();
    tradeFeed.suspend();
  });
  

//reload data when coming back online  
  $scope.$watch('online', function(online) { 
    if (online) {
      remote.connect();  
      orderBookRemote.connect();
      setTimeout(function(){ //put this in to prevent getting "unable to load data"
        loadPair(); 
      }, 100);
         
    
    } else {
      remote.disconnect();  
      orderBookRemote.disconnect();      
    }
  });
});
