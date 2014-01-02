var gateways;

angular.element(document).ready(function() {
  angular.module( 'ripplecharts', [
    'templates-app',
    'templates-common',
    'ripplecharts.main',
    'ripplecharts.markets',
    'ripplecharts.network',
    'ui.state',
    'ui.route',
    'snap'
  ])
  
  .config( function myAppConfig ( $stateProvider, $urlRouterProvider ) {
    $urlRouterProvider.otherwise( '/' );
  })
  
  .run( function run () {
  })
  
  .controller( 'AppCtrl', function AppCtrl ( $scope, $location ) {
    $scope.theme = 'light';
    $scope.snapOptions = {
      disable: 'right'
    }
    
    $scope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams){
      if ( angular.isDefined( toState.data.pageTitle ) ) {
        $scope.pageTitle = toState.data.pageTitle + ' | Ripple Charts' ;
      }
    });
  });

  //load gateways file before starting the app
  d3.json("assets/gateways.json", function(error, data) {
    
    gateways = data;
    angular.bootstrap(document, ['ripplecharts']);
  });
});


//Global functions
function addResizeEvent(func) {
  var oldResize = window.onresize;
  window.onresize = function () {
    func();
    if (typeof oldResize === 'function') oldResize();
  };
}

