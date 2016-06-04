
angular.element(document).ready(function() {
  angular.module( 'ripplecharts', [
    'templates-app',
    'templates-common',
    'ripplecharts.landing',
    'ripplecharts.markets',
    'ripplecharts.graph',
    'ui.state',
    'ui.route',
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

  .controller( 'AppCtrl', function AppCtrl ($scope, $location) {
    $scope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams){
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

    remote.on('error', function(e) {
      console.log(e);
    });

    // reconnect when coming back online
    $scope.$watch('online', function(online) {
      if (online) {
        remote.connect()
      }
    });
  });

  angular.bootstrap(document, ['ripplecharts']);
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
