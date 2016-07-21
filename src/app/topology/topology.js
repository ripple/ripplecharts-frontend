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
  $scope.loading = true;
  $scope.status = "Loading...";


  var t = new Topology($http);
  var nodes, locations;

  function fetchAndShowTable(loadGraph) {
    t.fetch().then(function(data) {
      $scope.loading = false;
      $scope.status = '';

      if(data.node_count > 0) {
        data.nodes = t.formatUptimes(data.nodes);
        data.nodes = t.sortByUptime(data.nodes);
        data.nodes.forEach(function(node) {
          node.version_color = t.versionToColor(node.version);
        });
        var sp = t.mergeOldAndNew(data.nodes, $scope.nodes);
        $scope.nodes = sp;
        $scope.$apply();
        t.animateChange(['inbound_connections', 'outbound_connections', 'uptime_formatted']);

        if (loadGraph) {
          t.produce(data, {
            element: ".topology-graph"
          });
          // change from default if uptime was previously selected
          if(store.get('weight-mode') == "uptime") {
            $('input:radio[value="uptime"]').prop('checked', true);
            t.weight("uptime");
          }
        }
        else {
          t.update(data);
        }

      } else {
        console.log('no nodes');
      }

    }).catch(function(e) {
      console.log(e);
      $scope.loading = false;
      $scope.status = e.toString();
    });
  }
  fetchAndShowTable(true);


  var m = new TopologyMap($http, t);

  // API endpoint: https://data-staging.ripple.com/v2/network/topology/nodes?verbose=true
  function fetchAndShowMap() {

    // draw the map next to the node chart
    m.draw({
      element: ".topology-map"
    });
    m.fetch().then(function(data){
      if(data.count > 0)
        m.populate(data.nodes);
      // change from default if uptime was previously selected
      if(store.get('weight-mode') == "uptime") {
        m.weight("uptime");
      }
    }).catch(function(e) {
      console.log(e);
      $scope.loading = false;
      $scope.status = e.toString();
    });
  }
  fetchAndShowMap();

  // update table every 30 seconds
  var interval = setInterval(function() {
    fetchAndShowTable();
  }, 30000);


  // click to toggle between charts
  $('.switch-input').click(function(event) {
    $('.first').fadeOut(500, function() {
      if($(this).hasClass('topology-graph')) {
        // persist the selection
        store.set('topology-mode', 'map');
        $('.topology-map').addClass('first').fadeIn(500);
      }
      else {
        // persist the selection
        store.set('topology-mode', 'graph');
        $('.topology-graph').addClass('first').fadeIn(500);
      }
      $(this).removeClass('first');
    });
  });


  // change the weight of the nodes when the user toggles the radio buttons
  $('.weight-toggle').children().on('change', function(event) {
    store.set('weight-mode', this.value);
    t.weight(this.value);
    m.weight(this.value);
  })

  // stop the listeners when leaving page
  $scope.$on('$destroy', function(){
    clearInterval(interval);
  });

  // load options (topology and weight mode) from last session
  // change from default if map was previously selected
  if(store.get('topology-mode') == "map") {
    $('.topology-map').addClass('first');
    $('.switch-input').prop('checked', true);
  }
  else
      $('.topology-graph').addClass('first');


});



