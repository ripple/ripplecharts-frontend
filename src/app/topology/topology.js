/* globals Topology, TopologyMap */
'use strict'

angular.module('ripplecharts.topology', [
  'ui.state',
  'ui.bootstrap'
])

.config(function config($stateProvider) {
  $stateProvider.state('topology', {
    url: '/topology',
    views: {
      main: {
        controller: 'TopologyCtrl',
        templateUrl: 'topology/topology.tpl.html'
      }
    },
    data: {
      pageTitle: 'Rippled Topology Network'
    }
  })
})

.controller('TopologyCtrl', function TopologyCtrl($scope, $http) {
  $scope.loading = true
  $scope.status = 'Loading...'
  $scope.weight = store.get('weight-mode') || 'connections'

  var t = new Topology($http)
  var m = new TopologyMap($http)

  function versionToColor(d) {
    var version = d.replace('rippled-', '')
    var comp

    if (!$scope.stable || !$scope.semverCompare) {
      return 'grey'
    }

    comp = $scope.semverCompare(version, $scope.stable)

    if (comp === -1) {
      return '#c11'

    } else if (comp === 1) {
      return '#36c'

    } else {
      return '#3a3'
    }
  }

  function updateVersionColors() {
    if ($scope.nodes) {
      $scope.nodes.forEach(function(d) {
        d.new.version_color = versionToColor(d.new.version)
      })
    }

    t.color(versionToColor)
    m.color(versionToColor)
  }

  function updateVersionGraph(nodes) {
    var versions = {}
    var data = []
    var version

    nodes.forEach(function(d) {
      version = d.version.replace('rippled-', '')

      if (!versions[version]) {
        data.push(versions[version] = {
          version: version,
          count: 0,
          uptime: 0,
          in: 0,
          out: 0
        })
      }

      versions[version].count++
      versions[version].uptime += d.uptime
      versions[version].in += d.inbound_count || 0
      versions[version].out += d.outbound_count || 0
    })

    for (version in versions) {
      versions[version].uptime /= versions[version].count
      versions[version].in /= versions[version].count
      versions[version].out /= versions[version].count
      versions[version].pct = versions[version].count / nodes.length
    }

    data.sort(function(a, b) {
      return $scope.semverCompare(a.version, b.version)
    })

    $scope.versions = data
  }

  $scope.semverCompare = function(a, b) {
    var p1 = a.split('-')
    var p2 = b.split('-')
    var pa = p1[0].split('.')
    var pb = p2[0].split('.')
    var na
    var nb

    for (var i = 0; i < 3; i++) {
      na = Number(pa[i])
      nb = Number(pb[i])
      if (na > nb) {
        return 1
      } else if (nb > na) {
        return -1
      } else if (!isNaN(na) && isNaN(nb)) {
        return 1
      } else if (isNaN(na) && !isNaN(nb)) {
        return -1
      }
    }

    if (p1[1] && p2[1]) {
      na = /b/.test(p1[1])
      nb = /b/.test(p2[1])

      if (na && !nb) {
        return -1
      } else if (nb && !na) {
        return 1
      }

      na = /rc/.test(p1[1])
      nb = /rc/.test(p2[1])

      if (na && !nb) {
        return -1
      } else if (nb && !na) {
        return 1
      }

      na = Number(p1[1].replace(/[^0-9-]+/, ''), 10)
      nb = Number(p2[1].replace(/[^0-9-]+/, ''), 10)

      if (na > nb) {
        return 1
      } else if (nb > na) {
        return -1
      } else if (!isNaN(na) && isNaN(nb)) {
        return 1
      } else if (isNaN(na) && !isNaN(nb)) {
        return -1
      }
    }

    if (p1.length > p2.length) {
      return 1
    } else if (p2.length > p1.length) {
      return -1
    }

    return 0
  }

  function fetchAndShowTable(draw) {
    t.fetch().then(function(data) {

      $scope.loading = false
      $scope.status = ''

      if (draw) {
        t.produce({
          element: '.topology-graph'
        })
      }

      if (data.node_count > 0) {
        data.nodes = t.formatUptimes(data.nodes)
        data.nodes = t.sortByUptime(data.nodes)

        var sp = t.mergeOldAndNew(data.nodes, $scope.nodes)
        $scope.nodes = sp
        updateVersionColors()
        updateVersionGraph(data.nodes)

        $scope.date = moment(data.date).format('llll')
        $scope.$apply()

        t.animateChange([
          'inbound_connections',
          'outbound_connections',
          'uptime_formatted'
        ])
        t.update(data)
        t.weight(store.get('weight-mode'))
        t.color(versionToColor)

      } else {
        console.log('no nodes')
      }

    }).catch(function(e) {
      console.log(e)
      console.log(e.stack)
      $scope.loading = false
      $scope.status = e.toString()
    })
  }

  function fetchAndShowMap(draw) {
    m.fetch().then(function(data) {

      if (draw) {
        m.draw({
          element: '.topology-map'
        })
      }

      m.populate(data.nodes)
      m.weight(store.get('weight-mode'))
      m.color(versionToColor)

    }).catch(function(e) {
      console.log(e)
      console.log(e.stack)
      $scope.loading = false
      $scope.status = e.message || e.toString()
    })
  }

  // update table every 30 seconds
  var interval = setInterval(function() {
    if (document.hidden) {
      return
    }

    fetchAndShowTable()
    fetchAndShowMap()
  }, 30000)

  fetchAndShowTable(true)
  fetchAndShowMap(true)

  $scope.color = versionToColor

  // click to toggle between charts
  $('.switch-input').click(function() {
    $('.first').fadeOut(500, function() {
      if ($(this).hasClass('topology-graph')) {
        // persist the selection
        store.set('topology-mode', 'map')
        $('.topology-map').addClass('first').fadeIn(500)
      } else {
        // persist the selection
        store.set('topology-mode', 'graph')
        $('.topology-graph').addClass('first').fadeIn(500)
      }

      $(this).removeClass('first')
    })
  })

  $http
  .get(API + '/network/rippled_versions')
  .then(function(d) {
    d.data.rows.forEach(function(row) {
      if (row.repo === 'stable') {
        $scope.stable = row.version
        updateVersionColors()
      }
    })
  })

  // change the weight of the nodes when the user toggles the radio buttons
  $scope.$watch('weight', function(d) {
    store.set('weight-mode', d)
    t.weight(d)
    m.weight(d)
  })

  // stop the listeners when leaving page
  $scope.$on('$destroy', function() {
    clearInterval(interval)
  })

  // load options (topology and weight mode) from last session
  // change from default if map was previously selected
  if (store.get('topology-mode') === 'map') {
    $('.topology-map').addClass('first')
    $('.switch-input').prop('checked', true)
  } else {
    $('.topology-graph').addClass('first')
  }
})
