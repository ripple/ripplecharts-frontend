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

  //load chart   
  var loaded = false,  
    trade    = {currency:"XRP", issuer:""},
    base     = {currency:"BTC", issuer:"rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B"},
    dropdownB = ripple.currencyDropdown().selected(trade)
      .on("change", function(d) {
        if (loaded) {
          priceChart.load(base, trade = d, d3.select("#interval .selected").datum());
          book.getMarket(base, trade);
          transFeed.loadPair (base, trade);
        }}),
    dropdownA = ripple.currencyDropdown().selected(base)
      .on("change", function(d) {
        if (loaded) {
          priceChart.load(base = d, trade, d3.select("#interval .selected").datum());
          book.getMarket(base, trade); 
          transFeed.loadPair (base, trade);
        }});

  d3.select("#base").call(dropdownA);
  d3.select("#quote").call(dropdownB);
  d3.select("#flip").on("click", function(){ //probably better way to do this
    dropdownA.selected(trade);
    dropdownB.selected(base);
    d3.select("#base").selectAll("select").remove();
    d3.select("#quote").selectAll("select").remove();
    loaded = false;
    d3.select("#base").call(dropdownA);
    d3.select("#quote").call(dropdownB);
    loaded = true;
    swap   = trade;
    trade  = base;
    base   = swap;
    priceChart.load(base, trade, d3.select("#interval .selected").datum());
    book.getMarket(base, trade);
    transFeed.loadPair (base, trade);
  });
  
  var intervalA = d3.select("#interval").selectAll("a")
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
    .classed("selected", function(_, i) { return !i; })
    .text(function(d) { return d.name; })
    .on("click", function(d) {
      d3.event.preventDefault();
      var that = this;
      intervalA.classed("selected", function() { return this === that; });
      priceChart.load(base, trade, d);
    });
    
  var chartType = d3.select("#chartType").selectAll("a")
    .data(["line", "candlestick"])
    .enter().append("a")
    .attr("href", "#")
    .classed("selected", function(_, i) { return !i; })
    .text(function(d) { return d })   
    .on("click", function(d) {
      d3.event.preventDefault();
      var that = this;
      chartType.classed("selected", function() { return this === that; });
      chartType.selected = d;
      priceChart.setType(d);
    });

  chartType.selected = "line";

  var priceChart = new PriceChart ({
    id     : "#priceChart",
    url    : API,  
    type   : chartType.selected
  });   

  loaded = true;
  d3.select("#interval a:nth-child(1)")[0][0].click();

  var remote = new ripple.Remote(Options.ripple);
    
  book = new OrderBook ({
    chartID : "bookChart",
    tableID : "bookTables",
    remote  : remote
  });
  
  book.resetChart();
  
  remote.connect();
  remote.on('connect', function(){
    book.getMarket(base, trade);
  }); 
  
  transFeed = new TransactionFeed({
    id     : "tradeFeed",
    url    : API   
  });
  
  transFeed.loadPair (base, trade);
  
  
  $scope.$on("$destroy", function(){
    console.log("destroy");
    priceChart.suspend();
    book.suspend();
    transFeed.suspend();
    //stop the listener when leaving 
  });
});
