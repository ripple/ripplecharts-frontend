angular.module( 'ripplecharts.multimarkets', [
  'ui.state',
  'ui.bootstrap'
])

.config(function config( $stateProvider ) {
  $stateProvider.state( 'multimarkets', {
    url: '/multimarkets',
    views: {
      "main": {
        controller: 'MultimarketsCtrl',
        templateUrl: 'multimarkets/multimarkets.tpl.html'
      }
    },
    data:{ pageTitle: 'Multi Markets' }
  });
})

.controller( 'MultimarketsCtrl', function MultimarketsCtrl( $scope, $location ) {
  $scope.markets  = store.session.get('multimarkets') || 
    store.get('multimarkets') || 
    Options.multimarkets || [
    {
      base  : {currency:"XRP"},
      trade : {currency:"USD",issuer:"rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B"}},
    {
      base  : {currency:"XRP"},
      trade : {currency:"CNY",issuer:"rnuF96W4SZoCJmbHYBFoJZpR8eCaxNvekK"}},
    {
      base  : {currency:"BTC",issuer:"rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B"},
      trade : {currency:"XRP"}}
    ];
    
    
  var markets = new MultiMarket ({
    url            : API+"/offersExercised",  
    id             : "multimarkets",
    updateInterval : 300, //5 minutes
    clickable      : true
  });
  
  
  markets.list($scope.markets);
  markets.on('updateList', function(data){
    store.set('multimarkets', data);
    store.session.set('multimarkets', data);
  });
  
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
  
})

;
