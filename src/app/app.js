
angular.element(document).ready(function() {
  angular.module( 'ripplecharts', [
    'templates-app',
    'templates-common',
    'ripplecharts.landing',
    'ripplecharts.markets',
    'ripplecharts.multimarkets',
    'ripplecharts.graph',
    'ripplecharts.accounts',
    'ripplecharts.capitalization',
    'ui.state',
    'ui.route',
    'snap'
  ])
  
  .config( function myAppConfig ( $stateProvider, $urlRouterProvider ) {
    $urlRouterProvider.otherwise( '/' );
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
  
  .controller( 'AppCtrl', function AppCtrl ( $scope, $location ) {
    $scope.theme = store.get('theme') || Options.theme;
    $scope.$watch('theme', function(){store.set('theme', $scope.theme)});
    
    $scope.snapOptions = {
      disable: 'right',
      maxPosition: 267
    }
    
    //disable touch drag for desktop devices
    if (!Modernizr.touch) $scope.snapOptions.touchToDrag = false;
    
        
    $scope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams){
      if ( angular.isDefined( toState.data.pageTitle ) ) {
        $scope.pageTitle = toState.data.pageTitle + ' | Ripple Charts' ;
      }
    });
  });
  
  //load gateways file before starting the app
  d3.json("assets/gateways.json", function(error, data) {
    gateways = data;

    //connect to the ripple network;
    remote = new ripple.Remote(Options.ripple);
    remote.connect();

    angular.bootstrap(document, ['ripplecharts']);
    //setTimeout(function(){console.log(remote); remote.disconnect()}, 10000);
    //setTimeout(function(){remote.connect()}, 15000);
  });
});
