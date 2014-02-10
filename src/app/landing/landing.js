angular.module( 'ripplecharts.landing', [
  'ui.state'
])

.config(function config( $stateProvider ) {
  $stateProvider.state( 'landing', {
    url: '/',
    views: {
      "main": {
        controller: 'LandingCtrl',
        templateUrl: 'landing/landing.tpl.html'
      }
    },
    data:{ }
  });
})


.controller( 'LandingCtrl', function LandingCtrl( $scope, $location ) {
  var feed = new TransactionFeed({id : 'liveFeed'});
  remote.on('transaction_all', feed.handleTransaction);
 
//get "fixed" multimarket charts for the most important markets  
  var markets = new MultiMarket ({
    url            : API+"/offersExercised",  
    id             : "topMarkets",
    fixed          : true,
    clickable      : true,
    updateInterval : 300 //5 minutes
  });
  
  markets.list([
    {
      base  : {currency:"XRP"},
      trade : {currency:"USD",issuer:"rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B"}},
    {
      base  : {currency:"XRP"},
      trade : {currency:"CNY",issuer:"rnuF96W4SZoCJmbHYBFoJZpR8eCaxNvekK"}},
    {
      base  : {currency:"BTC",issuer:"rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B"},
      trade : {currency:"XRP"}}
    ]);

  markets.on('chartClick', function(chart){
    var path = "/markets/"+chart.base.currency+
      (chart.base.issuer ? ":"+chart.base.issuer : "")+
      "/"+chart.trade.currency+
      (chart.trade.issuer ? ":"+chart.trade.issuer : "");
    $location.path(path);
    $scope.$apply();  
  });
      
  $scope.$on("$destroy", function(){
    markets.list([]);
  });

  
//get num accounts
  api = new ApiHandler(API);
  api.getTotalAccounts(null, function(total){
    $scope.totalAccounts = commas(total);
    $scope.$apply();
  });
  
//get trade volume of top markets  
  api.getTopMarkets(function(data){
    var volume = 0;
    for (var i=0; i<data.length; i++) {
      volume += data[i][3];
    }
    
    $scope.tradeVolume = "$"+commas(volume,2);
    $scope.$apply();
  });
  
});

