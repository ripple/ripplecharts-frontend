angular.module( 'ripplecharts.graph', [
  'ui.state',
  'ui.bootstrap'
])

.config(function config( $stateProvider ) {
  $stateProvider.state( 'graph', {
    url: '/graph',
    views: {
      "main": {
        controller: 'GraphCtrl',
        templateUrl: 'graph/graph.tpl.html'
      }
    },
    data:{ pageTitle: 'Network Graph' }
  });
})

.controller( 'GraphCtrl', function GraphCtrl( $scope ) {
  networkGraph();
});