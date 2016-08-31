angular.module( 'ripplecharts.history', [
  'ui.state',
  'ui.bootstrap'
])

.config(function config( $stateProvider ) {
  $stateProvider.state( 'history', {
    url: '/history',
    views: {
      "main": {
        controller: 'HistoryCtrl',
        templateUrl: 'history/history.tpl.html'
      }
    },
    data:{ pageTitle: 'History' },
    resolve : {
          gateInit : function (gateways) {
            return gateways.promise;
        }
      }
  });
})

.controller( 'HistoryCtrl', function HistoryCtrl( $scope, gateways ) {

  var history = new TotalHistory({
    url: API,
    id: 'historical-chart',
    resize: true,
    gateways: gateways
  }).load();
});
