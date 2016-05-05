
angular.element(document).ready(function() {
  angular.module( 'ripplecharts', [
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
    'ui.state',
    'ui.route',
    'snap',
    'gateways',
    'rippleName',
    'matrixFactory',
    'chordDiagram',
    'statusCheck',
    'txsplain',
    'txfeed',
    'jsonFormatter'
  ])

  .config( function myAppConfig ( $stateProvider, $urlRouterProvider ) {
    $urlRouterProvider.otherwise('/');
  })

  .run(function($window, $rootScope) {
    if (typeof navigator.onLine != 'undefined') {
      $rootScope.online = navigator.onLine;
      $window.addEventListener("offline", function () {
        $rootScope.$apply(function() {
          $rootScope.online = false;
        });
      }, false);
      $window.addEventListener("online", function () {
        $rootScope.$apply(function() {
          $rootScope.online = true;
        });
      }, false);
    }
  })

  .controller( 'AppCtrl', function AppCtrl ( $scope, $location, gateways ) {

    $scope.theme = store.get('theme') || Options.theme || 'dark';
    $scope.$watch('theme', function(){store.set('theme', $scope.theme)});

    $scope.toggleTheme = function(){
      if ($scope.theme == 'dark') $scope.theme = 'light';
      else $scope.theme = 'dark';
    };

    $scope.snapOptions = {
      disable: 'right',
      maxPosition: 267
    }

    //disable touch drag for desktop devices
    if (!Modernizr.touch) $scope.snapOptions.touchToDrag = false;


    $scope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams){
      mixpanel.track("Page", {"Page Name":toState.name, "Theme":$scope.theme});
      if (ga) ga('send', 'pageview', toState.name);

      if ( angular.isDefined( toState.data.pageTitle ) )
           $scope.pageTitle = toState.data.pageTitle + ' | Ripple Charts' ;
      else $scope.pageTitle = "Ripple Charts"

    });

  //connect to the ripple network;
    remote = new ripple.RippleAPI(Options.ripple);
    remote.connect()
    .then(function() {
      $scope.connectionStatus = "connected";
      $scope.$apply();
    })
    .catch(function(e) {
      console.log(e.stack);
    });

    $scope.ledgerLabel = "connecting...";
    $scope.ledgerIndex = "";
    $scope.connectionStatus = "disconnected";

    var last;

  //get ledger number and total coins
    remote.on('ledger', function(d) {
      last = moment();

      remote.getLedger({
        ledgerVersion: d.ledgerVersion
      }).then(handleLedger)
      .catch(function(e) {
        console.log(e.stack);
      });
    });

    remote.on('error', function(e) {
      console.log(e);
    });

    setInterval(checkLast, 2000);

    function checkLast() {
      if (last && moment().diff(last) > 6000) {
        $scope.connectionStatus = "disconnected";
        last = null;
      }
    }

    function handleLedger(d) {
      if (d) {
        var drops = d.totalDrops;
        var totalXRP = [
          commas(Number(drops.slice(0, -6))),
          drops.slice(-6, -4)
        ].join(".");

        $scope.connectionStatus = "connected";
        $scope.ledgerLabel = "Ledger #";
        $scope.ledgerIndex = commas(d.ledgerVersion);
        $scope.totalCoins = totalXRP;
        $scope.totalXRP = parseFloat(drops)/ 1000000.0;
        $scope.$apply();
      }
    }

    // remove loader after gateways resolves
    gateways.promise.then(function(){
      var loading = d3.select('#loading');
      loading.transition()
      .duration(600)
      .style('opacity', 0)
      .each('end', function() {
        loading.style('display', 'none');
      });
    });

    // reconnect when coming back online
    $scope.$watch('online', function(online) {
      if (online) {
        remote.connect()
      }
    });
  });

  var api;
  var banner;
  var wrap;
  var maintenance;
  var bannerPads;
  var started = false;

  setTimeout(function() {
    api = new ApiHandler(API);
    wrap = d3.select('.banner-wrap');
    banner = wrap.select('.banner');
    maintenance = d3.select('#maintenance');
    bannerPads = d3.selectAll('.banner-pad');
    checkStatus();
  });

  setInterval(checkStatus, 2 * 60 * 1000);

  function checkStatus() {
    d = api.getMaintenanceStatus(function(err, resp) {
      var mode;
      var html;
      var style;
      var height;

      if (err) {
        console.log(err);
        mode = 'maintenance';
        html = err.message;
        style = '';

      } else {
        mode = resp && resp.mode ? resp.mode : 'normal';
        html = resp && resp.html ? resp.html : '';
        style = resp && resp.style ? resp.style : '';
      }

      // start the app
      if (!started && mode !== 'maintenance') {
        angular.bootstrap(document, ['ripplecharts']);
        started = true;
      }

      // show maintenance
      if (mode === 'maintenance') {
        maintenance.select('.message')
        .html(html);

        maintenance
        .style('display','block')
        .transition()
        .duration(1000)
        .style('opacity', 1);

      // hide maintenance
      } else {
        maintenance
        .transition()
        .duration(1000)
        .style('opacity', 0)
        .each('end', function() {
          maintenance.style('display','none');
        });
      }

      // show banner
      if (mode === 'banner') {
        height = banner.style('height');

        banner.html(html)
        .style(style)

        wrap.style('height', height)
        .transition()
        .delay(2000)
        .duration(1000)
        .style('height', banner.style('height'));

        banner
        .transition()
        .delay(2000)
        .duration(1000)
        .style('opacity', 1);

        bannerPads
        .transition()
        .delay(2000)
        .duration(1000)
        .style('height', banner.style('height'));

      // hide banner
      } else {
        wrap.transition()
        .duration(1000)
        .style('height', '0px');

        bannerPads.transition()
        .duration(1000)
        .style('height', '0px');

        banner.transition()
        .duration(1000)
        .style('opacity', 0)
        .each('end', function() {
          banner.html('');
        });
      }
    });
  }
});

function commas (number, precision) {
  if (number===0) return 0;
  if (!number) return null;
  var parts = number.toString().split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  if (precision && parts[1]) {
    parts[1] = parts[1].substring(0,precision);
    while(precision>parts[1].length) parts[1] += '0';
  }
  else if (precision===0) return parts[0];
  return parts.join(".");
}
