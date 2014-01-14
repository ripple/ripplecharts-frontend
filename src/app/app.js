var gateways, remote;

angular.element(document).ready(function() {
  angular.module( 'ripplecharts', [
    'templates-app',
    'templates-common',
    'ripplecharts.landing',
    'ripplecharts.markets',
    'ripplecharts.multimarkets',
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
    
 /*   
    $scope.$on('$viewContentLoaded',  function(route, b){
      setTimeout(function(){
        var active = d3.select(".nav li.active").node();
        var top    = active ? active.getBoundingClientRect().top : null;
        console.log(top);
        if (top) d3.select("#cover").style("top",top+"px").style("display","block");
        else d3.select("#cover").style("display","none");
      },100);    
    });
 */   
  });
  
  //load gateways file before starting the app
  d3.json("assets/gateways.json", function(error, data) {
    
    //connect to the ripple network;
    remote = new ripple.Remote(Options.ripple);
    remote.connect();
    console.log(remote);
    
    gateways = data;
    angular.bootstrap(document, ['ripplecharts']);
  });
});
