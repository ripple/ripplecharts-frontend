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
  $scope.weight = store.get('weight-mode') || 'connections';

  var t = new Topology($http);
  var m = new TopologyMap($http, t);
  var nodes, locations;

  $http
  .get(API + '/network/rippled_versions')
  .then(function(d) {
    d.data.rows.forEach(function(row) {
      if (row.repo === 'stable') {
        $scope.stable = row.version;
        updateVersionColors();
      }
    });
  });

  function updateVersionColors() {
    if ($scope.nodes) {
      $scope.nodes.forEach(function(d) {
        d.new.version_color = versionToColor($scope.stable, d.new.version);
      });
    }

    t.color(versionToColor.bind(t, $scope.stable));
    m.color(versionToColor.bind(m, $scope.stable));
  }

  function versionToColor(stable, version) {
    var v = version.split('-');
    var comp = v[1] && stable ? semverCompare(v[1], stable) : '';

    if (!v[1] || !stable) {
      return 'grey';
    }

    if (comp === -1) {
      return '#c11';
    }

    if (comp === 1) {
      return '#66b';
    }

    return '#38b';
  }

  function semverCompare (a, b) {
    var pa = a.split('.');
    var pb = b.split('.');
    for (var i = 0; i < 3; i++) {
        var na = Number(pa[i]);
        var nb = Number(pb[i]);
        if (na > nb) return 1;
        if (nb > na) return -1;
        if (!isNaN(na) && isNaN(nb)) return 1;
        if (isNaN(na) && !isNaN(nb)) return -1;
    }
    return 0;
  }

  function fetchAndShowTable(draw) {
    t.fetch().then(function(data) {
      $scope.loading = false;
      $scope.status = '';

      if (draw) {
        t.produce({
          element: ".topology-graph"
        });
      }

      if(data.node_count > 0) {
        data.nodes = t.formatUptimes(data.nodes);
        data.nodes = t.sortByUptime(data.nodes);

        var sp = t.mergeOldAndNew(data.nodes, $scope.nodes);
        $scope.nodes = sp;
        updateVersionColors();

        $scope.date = moment(data.date).format('llll');
        $scope.$apply();

        t.animateChange(['inbound_connections', 'outbound_connections', 'uptime_formatted']);
        t.update(data)
        t.weight(store.get('weight-mode'));
        t.color(versionToColor.bind(m, $scope.stable));

      } else {
        console.log('no nodes');
      }

    }).catch(function(e) {
      console.log(e);
      console.log(e.stack);
      $scope.loading = false;
      $scope.status = e.toString();
    });
  }

  // API endpoint: https://data-staging.ripple.com/v2/network/topology/nodes?verbose=true
  function fetchAndShowMap(draw) {
    m.fetch().then(function(data) {

      if (draw) {
        m.draw({
          element: ".topology-map"
        });
      }

      m.populate(data.nodes);
      m.weight(store.get('weight-mode'));
      m.color(versionToColor.bind(m, $scope.stable));

    }).catch(function(e) {
      console.log(e);
      console.log(e.stack);
      $scope.loading = false;
      $scope.status = e.toString();
    });
  }

  // update table every 30 seconds
  var interval = setInterval(function() {
    if (document.hidden) {
      return;
    }

    fetchAndShowTable();
    fetchAndShowMap();
  }, 30000);

  fetchAndShowTable(true);
  fetchAndShowMap(true);

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
  $scope.$watch('weight', function(d) {
    store.set('weight-mode', d);
    t.weight(d);
    m.weight(d);
  });

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



