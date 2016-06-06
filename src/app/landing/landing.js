angular.module( 'ripplecharts.landing', [
  'ui.state'
])

.config(function config( $stateProvider ) {
  $stateProvider.state( 'landing', {
    url: '/',
    views: {
      main: {
        controller: 'LandingCtrl',
        templateUrl: 'landing/landing.tpl.html'
      }
    },
    data: {}
  });
})

.controller( 'LandingCtrl', function LandingCtrl( $scope, $state, $location ) {

  var api = new ApiHandler(API);

  //get "fixed" multimarket charts for the most important markets
  var markets = new MultiMarket ({
    url            : API,
    id             : 'multimarkets',
    fixed          : true,
    clickable      : true,
    updateInterval : 60, //1 minute
  });

  // load preset list or top 12
  markets.list(marketList && marketList.length ? marketList : 12);

  markets.on('chartClick', function(chart) {
    $state.transitionTo('markets.pair', {
      base: chart.base.currency +
        (chart.base.issuer ? ':' + chart.base.issuer : '') ,
      counter: chart.counter.currency +
        (chart.counter.issuer ? ':' + chart.counter.issuer : ''),
      interval: '5m',
      range: '1d',
      type: 'candlestick'
    });
  });


  //stuff to do when leaving the page
  $scope.$on('$destroy', function() {
    markets.list([]); //this will disable the update listeners for the charts
  });

  // reload data when coming back online
  $scope.$watch('online', function(online) {
    if (online) {
      markets.reload();
    }
  });
});

