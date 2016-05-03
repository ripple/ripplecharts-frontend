angular.module( 'ripplecharts.topology', [
  'ui.state',
  'ui.bootstrap'
])

.config(function config( $stateProvider ) {
  $stateProvider.state( 'topology', {
    url: '/topology',
    views: {
      "main": {
        controller: 'TopologyCtrl',
        templateUrl: 'topology/topology.tpl.html'
      }
    },
    data:{ pageTitle: 'Rippled Topology Network' },
    resolve : {
      gateInit : function (gateways) {
        return gateways.promise;
      }
    }
  });
})

.controller('TopologyCtrl', function TopologyCtrl($scope, $http, gateways) {
  $scope.loadingTopology = true;
  $scope.topologyLoaded = false;
  $scope.status = "Loading..."
  var t = new Topology($http);

  function fetchAndShowTable() {
    t.fetch().then(function(data) {
      if(data.node_count > 0) {
        data.nodes = t.formatUptimes(data.nodes);
        data.nodes = t.sortByUptime(data.nodes);
        var sp = t.mergeOldAndNew(data.nodes, $scope.nodes);
        $scope.nodes = sp;
        $scope.$apply();
        t.animateChange(['inbound_connections', 'outbound_connections', 'uptime_formatted']);
        $scope.loadingTopology = false;
        $scope.topologyLoaded= true;
      }
    });
  }
  fetchAndShowTable();

  // update table every 60 seconds
  setInterval(function() {
    fetchAndShowTable();
  }, 60000);

  function fetchAndShowGraph() {
    t.fetch().then(function(data) {
      t.produce(data, ".topology-graph", 600, 1000, -250, 300, 0.5);
      $scope.$apply();
    });
  }
  fetchAndShowGraph();
});

