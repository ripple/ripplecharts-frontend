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


.controller( 'LandingCtrl', function LandingCtrl( $scope, $rootScope, $location ) {
  var totalAccounts = 0;
  var feed = new TransactionFeed({id : 'liveFeed'});
  var api  = new ApiHandler(API);
  
  remote.on('transaction_all', feed.handleTransaction); //display transaction feed
  remote.on('transaction_all', handleNewAccount); //add to new accounts total
  
  remote.on("connect", function(){
    getTotalAccounts();  //we want to retreive this number every time we reconnect
  });
  
  if (remote._connected) getTotalAccounts();
  
   
//get "fixed" multimarket charts for the most important markets  
  var markets = new MultiMarket ({
    url            : API,  
    id             : "topMarkets",
    fixed          : true,
    clickable      : true,
    updateInterval : 60 //1 minute
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
      
//show the helper text the first time we visit the page               
  if (!store.get("returning")) setTimeout(function(){
    d3.select("#helpButton").node().click();
  }, 100);
  
     
  $scope.$on("$destroy", function(){
    markets.list([]);
    
    if (!store.get("returning") &&
      $scope.showHelp) setTimeout(function(){
        d3.select("#helpButton").node().click();
      }, 50);
      
    store.set("returning", true);
    clearInterval(topInterval);
  });

  
//get num accounts
  function getTotalAccounts () {
    api.getTotalAccounts(null, function(total){
      totalAccounts = total;
      $scope.totalAccounts = commas(totalAccounts);
      $scope.$apply();
      
    }, function(error){
      console.log(error);
      $scope.totalAccounts = " ";
      $scope.$apply();
    });    
  }
  
//look for new accounts from the websocket feed  
  function handleNewAccount (tx) {
    var meta = tx.meta;
    if (meta.TransactionResult !== "tesSUCCESS") return;
    
    meta.AffectedNodes.forEach( function( affNode ) {
      
      if (affNode.CreatedNode && 
          affNode.CreatedNode.LedgerEntryType === "AccountRoot" ) {

          $scope.totalAccounts = commas(++totalAccounts);
          $scope.$apply();
      }
    });    
  } 
   
//get trade volume of top markets  
  function getVolumes() {
    
    api.getVolume24Hours(function(data){
      var volume = data.total;
      $scope.volume24Hours = volume ? "$"+commas(volume,2) : " ";
      $scope.$apply(); 
               
    }, function(error){
      console.log(error);
      $scope.volume24Hours = " "; //must be a space so that the loader hides
      $scope.$apply();
    });
    
    api.getTopMarkets(function(data){
      var volume = data.total;
      
      $scope.tradeVolume = volume ? "$"+commas(volume,2) : " ";
      $scope.$apply();
      
    }, function(error){
      console.log(error);
      $scope.tradeVolume = " "; //must be a space so that the loader hides
      $scope.$apply();
    });
  }
 
  
  
  getVolumes();
  var topInterval = setInterval (getVolumes, 300000);
});

