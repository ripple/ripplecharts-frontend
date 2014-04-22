angular.module( 'ripplecharts.marketmakers', [
  'ui.state',
  'ui.bootstrap'
])

.config(function config( $stateProvider ) {
  $stateProvider.state( 'marketmakers', {
    url: '/marketmakers',
    views: {
      "main": {
        controller: 'MarketmakersCtrl',
        templateUrl: 'marketmakers/marketmakers.tpl.html'
      }
    },
    data:{ pageTitle: 'Market Makers' }
  });
})

.controller( 'MarketmakersCtrl', function MarketmakersCtrl( $scope ) {

  var base    = {"currency": "USD", "issuer" : "rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B"};
  var counter = {"currency": "XRP"};
  var period  = "24h";
  var metric  = "count";
   
  var map = new MarketMakerMap({
    url    : API,
    id     : 'marketMakerMap',
    period : period,
    metric : metric,
    resize : true
  });

//set up the currency pair dropdowns
  var loaded  = false, 
    dropdownB = ripple.currencyDropdown().selected(counter)
      .on("change", function(d) {
        if (loaded) {
          counter = d;
          loadPair();
        }}),
    dropdownA = ripple.currencyDropdown().selected(base)
      .on("change", function(d) {
        if (loaded) {
          base = d;
          loadPair();
        }});

  d3.select("#base").call(dropdownA);
  d3.select("#counter").call(dropdownB);
  d3.select("#flip").on("click", function(){ //probably better way to do this
    dropdownA.selected(counter);
    dropdownB.selected(base);
    d3.select("#base").selectAll("select").remove();
    d3.select("#counter").selectAll("select").remove();
    loaded = false;
    d3.select("#base").call(dropdownA);
    d3.select("#counter").call(dropdownB);
    loaded = true;
    
    swap    = counter;
    counter = base;
    base    = swap;
    loadPair();
  });

  loaded = true;
  loadPair();
  function loadPair() {
    console.log(base, counter);
    map.load(base, counter);
  }
  
  $scope.$on("$destroy", function(){
    
  });
});
