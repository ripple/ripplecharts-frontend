/* eslint no-unused-vars: [1, {"args": "after-used"}] */
'use strict'

// HACK to disable transitions
// when the doc is not in view
function flushD3Transitions() {
  var now = Date.now
  Date.now = function() {
    return Infinity
  }

  d3.timer.flush()
  Date.now = now
}

var D3transition = d3.selection.prototype.transition
d3.selection.prototype.transition = function() {
  if (document.hidden) {
    setImmediate(flushD3Transitions)
  }

  return D3transition.apply(this, arguments)
}

// TODO: change landing.js and elsewhere
// to use local version
function commas(number, precision) {
  if (number === 0) {
    return 0
  } else if (!number) {
    return null
  }

  var parts = number.toString().split('.')

  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')

  if (precision && parts[1]) {
    parts[1] = parts[1].substring(0, precision)
    while (precision > parts[1].length) {
      parts[1] += '0'
    }

  } else if (precision === 0) {
    return parts[0]
  }

  return parts.join('.')
}

// load stuff
angular.element(document).ready(function() {
  var api
  var banner
  var wrap
  var maintenance
  var bannerPads
  var started = false

  // connect to the ripple network
  // with global remote variable
  remote = new ripple.RippleAPI(Options.ripple)

  function checkStatus() {
    api.getMaintenanceStatus(function(err, resp) {
      var mode = 'maintenance'
      var title = 'This site is under maintenance.'
      var html = ''
      var style = ''
      var height

      if (err) {
        console.log(err)
        if (err.status === 0) {
          title = 'Unable to connect to the data service.'
        } else {
          title = err.message || err.text
          html += err.status
        }

      } else {
        mode = resp && resp.mode ? resp.mode : 'normal'
        html = resp && resp.html ? resp.html : ''
        style = resp && resp.style ? resp.style : ''
      }

      // start the app
      if (!started && mode !== 'maintenance') {
        angular.bootstrap(document, ['ripplecharts'])
        started = true
      }

      // show maintenance
      if (mode === 'maintenance') {
        maintenance.select('.title')
        .html(title)

        maintenance.select('.subtitle')
        .html(html)

        maintenance
        .style('display', 'block')
        .transition()
        .duration(1000)
        .style('opacity', 1)

      // hide maintenance
      } else {
        maintenance
        .transition()
        .duration(1000)
        .style('opacity', 0)
        .each('end', function() {
          maintenance.style('display', 'none')
        })
      }

      // show banner
      if (mode === 'banner') {
        height = banner.style('height')

        banner.html(html)
        .style(style)

        wrap.style('height', height)
        .transition()
        .delay(2000)
        .duration(1000)
        .style('height', banner.style('height'))

        banner
        .transition()
        .delay(2000)
        .duration(1000)
        .style('opacity', 1)

        bannerPads
        .transition()
        .delay(2000)
        .duration(1000)
        .style('height', banner.style('height'))

      // hide banner
      } else {
        wrap.transition()
        .duration(1000)
        .style('height', '0px')

        bannerPads.transition()
        .duration(1000)
        .style('height', '0px')

        banner.transition()
        .duration(1000)
        .style('opacity', 0)
        .each('end', function() {
          banner.html('')
        })
      }
    })
  }

  setTimeout(function() {
    api = new ApiHandler(API)
    wrap = d3.select('.banner-wrap')
    banner = wrap.select('.banner')
    maintenance = d3.select('#maintenance')
    bannerPads = d3.selectAll('.banner-pad')
    checkStatus()
  })

  setInterval(checkStatus, 60 * 1000)


  angular.module('ripplecharts', [
    'templates-app',
    'templates-common',
    'ripplecharts.landing',
    'ripplecharts.markets',
    'ripplecharts.manage-currencies',
    'ripplecharts.manage-gateways',
    'ripplecharts.multimarkets',
    'ripplecharts.activeAccounts',
    'ripplecharts.trade-volume',
    'ripplecharts.graph',
    'ripplecharts.accounts',
    'ripplecharts.transactions',
    'ripplecharts.value',
    'ripplecharts.history',
    'ripplecharts.metrics',
    'ripplecharts.topology',
    'ripplecharts.validators',
    'ripplecharts.validator',
    'ripplecharts.xrp-markets',
    'ui.state',
    'ui.route',
    'snap',
    'gateways',
    'rippleName',
    'matrixFactory',
    'chordDiagram',
    'donut',
    'statusCheck',
    'txsplain',
    'txfeed',
    'jsonFormatter',
    'versionsGraph'
  ])
  .config(function myAppConfig($urlRouterProvider) {
    $urlRouterProvider.otherwise('/')
  })
  .run(function($window, $rootScope) {
    if (typeof navigator.onLine !== 'undefined') {
      $rootScope.online = navigator.onLine
      $window.addEventListener('offline', function() {
        $rootScope.$apply(function() {
          $rootScope.online = false
        })
      }, false)
      $window.addEventListener('online', function() {
        $rootScope.$apply(function() {
          $rootScope.online = true
        })
      }, false)
    }
  })
  .controller('AppCtrl', function AppCtrl($scope, gateways) {

    var last

    function checkLast() {
      if (last && moment().diff(last) > 6000) {
        $scope.connectionStatus = 'disconnected'
        last = null
      }
    }

    function handleLedger(d) {
      if (d) {
        $scope.connectionStatus = 'connected'
        $scope.ledgerLabel = 'Ledger #'
        $scope.ledgerIndex = d.ledgerVersion
        $scope.totalXRP = parseFloat(d.totalDrops) / 1000000.0
        $scope.$apply()
      }
    }

    $scope.theme = store.get('theme') || Options.theme || 'dark'
    $scope.$watch('theme', function() {
      store.set('theme', $scope.theme)
    })

    $scope.$watch('online', function(online) {
      if (online) {
        checkStatus()
        remote.connect()
      }
    })

    $scope.toggleTheme = function() {
      if ($scope.theme === 'dark') {
        $scope.theme = 'light'
      } else {
        $scope.theme = 'dark'
      }
    }

    $scope.snapOptions = {
      disable: 'right',
      maxPosition: 267
    }

    // disable touch drag for desktop devices
    if (!Modernizr.touch) {
      $scope.snapOptions.touchToDrag = false
    }

    $scope.$on('$stateChangeSuccess', function(event, toState) {
      if (ga) {
        ga('send', 'pageview', toState.name)
      }

      if (angular.isDefined(toState.data.pageTitle)) {
        $scope.pageTitle = toState.data.pageTitle + ' | XRP Charts'

      } else {
        $scope.pageTitle = 'XRP Charts'
      }
    })

    remote.connect()
    .then(function() {
      $scope.connectionStatus = 'connected'
      $scope.$apply()
    })
    .catch(function(e) {
      console.log(e)
      if (e.name === 'DisconnectedError') {
        console.log('attempting reconnect')
        remote.connect()
      }
    })

    $scope.ledgerLabel = 'connecting...'
    $scope.ledgerIndex = ''
    $scope.connectionStatus = 'disconnected'

    // get ledger number and total coins
    remote.on('ledger', function(d) {
      last = moment()

      remote.getLedger({
        ledgerVersion: d.ledgerVersion
      })
      .then(handleLedger)
      .catch(function(e) {
        console.log(e)
        if (e.name === 'DisconnectedError') {
          console.log('attempting reconnect')
          remote.connect()
        }
      })
    })

    remote.on('error', function(e) {
      console.log(e)
      remote.connect()
    })

    setInterval(checkLast, 2000)

    // remove loader after gateways resolves
    gateways.promise.then(function() {
      var loading = d3.select('#loading')
      loading.transition()
      .duration(600)
      .style('opacity', 0)
      .each('end', function() {
        loading.style('display', 'none')
      })
    })

    // reconnect when coming back online
    $scope.$watch('online', function(online) {
      if (online) {
        remote.connect()
      }
    })
  })
})
