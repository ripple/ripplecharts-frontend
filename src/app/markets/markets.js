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
/*
  //load live listener
  var liveFeed = new OffersExercisedListener ({
    base  : {currency: "XRP"},
    trade : {currency: "USD", issuer: "rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B"},
    timeIncrement : "second",
    timeMultiple  : 5
  }, function(data){
    console.log(data);
  });
  
  console.log(liveFeed);
*/

  //load chart   
  var loaded = false,  
    trade    = {currency:"USD", issuer:"rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B"},
    base     = {currency:"XRP", issuer:""},
    dropdownB = ripple.currencyDropdown().selected(trade)
      .on("change", function(d) {
        if (loaded) {
          priceChart.load(base, trade = d, d3.select("#interval .selected").datum());
          book.getMarket(base, trade);
        }}),
    dropdownA = ripple.currencyDropdown().selected(base)
      .on("change", function(d) {
        if (loaded) {
          priceChart.load(base = d, trade, d3.select("#interval .selected").datum());
          book.getMarket(base, trade); 
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
  });
  
  var intervalA = d3.select("#interval").selectAll("a")
    .data([
      {name: "10m", interval:"second", offset: function(d) { return d3.time.minute.offset(d, -10); }},
      {name: "1h",  interval:"minute", offset: function(d) { return d3.time.hour.offset(d, -1); }},
      {name: "12h", interval:"minute", offset: function(d) { return d3.time.hour.offset(d, -12); }},
      {name: "24h", interval:"hour", offset: function(d) { return d3.time.day.offset(d, -1); }},
      {name: "3d",  interval:"hour", offset: function(d) { return d3.time.day.offset(d, -3); }},
      {name: "1m",  interval:"day", offset: function(d) { return d3.time.month.offset(d, -1); }},
      {name: "3m",  interval:"day", offset: function(d) { return d3.time.month.offset(d, -3); }},
      {name: "6m",  interval:"day", offset: function(d) { return d3.time.month.offset(d, -6); }},
      {name: "1y",  interval:"day", offset: function(d) { return d3.time.year.offset(d, -1); }},
      {name: "max", interval:"day", offset: function(d) { return d3.time.year.offset(d, -10); }}])
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
  d3.select("#interval a:nth-child(5)")[0][0].click();

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
  
  $scope.$on("$destroy", function(){
    //destroy the listener when leaving 
  });
});
