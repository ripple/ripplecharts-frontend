angular.module('ripplecharts.graph', [
  'ui.state',
  'ui.bootstrap'
]).config([
  '$stateProvider',
  function config($stateProvider) {
    $stateProvider.state('graph-id', {
      url: '/graph/:id',
      views: {
        'main': {
          controller: 'GraphCtrl',
          templateUrl: 'graph/graph.tpl.html'
        }
      },
      data: { pageTitle: 'Network Graph' }
    }).state('graph', {
      url: '/graph',
      views: {
        'main': {
          controller: 'GraphCtrl',
          templateUrl: 'graph/graph.tpl.html'
        }
      },
      data: { pageTitle: 'Network Graph' }
    });
  }
]).controller('GraphCtrl', [
  '$scope',
  '$state',
  '$location',
  function GraphCtrl($scope, $state, $location) {
    if ($state.params.id) {
      store.session.set('graphID', $state.params.id);
    }
    var graph = new networkGraph();
    $scope.$on('$destroy', function () {
      graph.suspend();
    });
  }
]);