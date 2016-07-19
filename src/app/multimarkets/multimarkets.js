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
    data:{ pageTitle: 'Multi Markets' },
    resolve : {
      gateInit : function (gateways) {
        return gateways.promise;
      }
    }
  });
})

.controller( 'MultimarketsCtrl', function MultimarketsCtrl($scope, $state, $location, gateways) {

  $scope.markets  = store.session.get('multimarkets') ||
    store.get('multimarkets');

  if (!$scope.markets || !$scope.markets.length) {
    $scope.markets = 15;  //load top 15
  }

  var markets = new MultiMarket ({
    url            : API,
    id             : "multimarkets",
    updateInterval : 60, //5 minutes
    clickable      : true,
    gateways       : gateways,
    fixed          : false
  });


  markets.list($scope.markets);
  markets.on('updateList', function(data){
    store.set('multimarkets', data);
    store.session.set('multimarkets', data);
  });

  markets.on('chartClick', function(chart){
    $state.transitionTo('markets.pair', {
      base: chart.base.currency +
        (chart.base.issuer ? ":"+chart.base.issuer : ""),
      counter: chart.counter.currency +
      (chart.counter.issuer ? ":"+chart.counter.issuer : ""),
      interval: '5m',
      range: '1d',
      type: store.get('chartType') || 'line'
    });
  });

  $scope.$on("$destroy", function(){
    markets.list([]);
  });

//reload data when coming back online
  $scope.$watch('online', function(online) {
    if (online) {
      markets.reload();
    }
  });
});

