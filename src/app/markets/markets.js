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
    $scope.base      = store.get('base')      || Options.base      || {currency:"BTC", issuer:"rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B"};
    $scope.trade     = store.get('trade')     || Options.trade     || {currency:"XRP", issuer:""};
    $scope.chartType = store.get('chartType') || Options.chartType || "line";
    $scope.interval  = store.get('interval')  || Options.interval  || "1h";

  //load chart   
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
  
  var intervalA = d3.select("#interval").attr("class","selectList").selectAll("a")
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
      intervalA.classed("selected", function() { return this === that; });
      priceChart.load($scope.base, $scope.trade, d);
    });
    
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
      chartType.classed("selected", function() { return this === that; });
      chartType.selected = d;
      priceChart.setType(d);
    });

  var priceChart = new PriceChart ({
    id     : "#priceChart",
    url    : API,  
    type   : $scope.chartType,
    resize : true
  });   

  loaded = true;
  d3.select("#interval .selected")[0][0].click();
  
    
  book = new OrderBook ({
    chartID : "bookChart",
    tableID : "bookTables",
    remote  : remote,
    resize  : true
  });
  
  book.resetChart();
  book.getMarket($scope.base, $scope.trade); 
  
  tradeFeed = new TradeFeed({
    id     : "tradeFeed",
    url    : API   
  });
  
  tradeFeed.loadPair ($scope.base, $scope.trade);
  
  function loadPair() {
    store.set('base',  $scope.base);
    store.set('trade', $scope.trade);
    
    priceChart.load($scope.base, $scope.trade, d3.select("#interval .selected").datum());
    book.getMarket($scope.base, $scope.trade); 
    tradeFeed.loadPair ($scope.base, $scope.trade);    
  }
  
  $scope.$on("$destroy", function(){
    console.log("destroy");
    priceChart.suspend();
    book.suspend();
    tradeFeed.suspend();
    //stop the listener when leaving 
  });
});
