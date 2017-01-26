angular.module( 'ripplecharts.graph', [
  'ui.state',
  'ui.bootstrap',
  'rippleName'
])

.config(function config( $stateProvider ) {
  $stateProvider.state( 'graph-id', {
    url: '/graph/:id',
    views: {
      "main": {
        controller: 'GraphCtrl',
        templateUrl: 'graph/graph.tpl.html'
      }
    },
    data:{ pageTitle: 'Account Explorer' }
  })
  .state( 'graph', {
    url: '/graph',
    views: {
      "main": {
        controller: 'GraphCtrl',
        templateUrl: 'graph/graph.tpl.html'
      }
    },
    data:{ pageTitle: 'Account Explorer' }
  });
})

.controller( 'GraphCtrl', function GraphCtrl( $scope, $state, $location, rippleName) {
  if ($state.params.id) {
    store.session.set('graphID', $state.params.id);
    //$location.path("/graph").replace();
  }

  var graph = new networkGraph(rippleName);
  //stop the listeners when leaving page
  $scope.$on("$destroy", function(){
    graph.suspend();
  });
});
