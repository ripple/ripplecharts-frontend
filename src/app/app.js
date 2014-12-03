
angular.element(document).ready(function() {
  angular.module( 'ripplecharts', [
    'templates-app',
    'templates-common',
    'ripplecharts.landing',
    'ripplecharts.markets',
    'ripplecharts.multimarkets',
    'ripplecharts.activeAccounts',
    'ripplecharts.graph',
    'ripplecharts.accounts',
    'ripplecharts.value',
    'ripplecharts.history',
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
      
      if ( angular.isDefined( toState.data.pageTitle ) ) 
           $scope.pageTitle = toState.data.pageTitle + ' | Ripple Charts' ;
      else $scope.pageTitle = "Ripple Charts"
      
    });
    
  //connect to the ripple network;
    remote = new ripple.Remote(Options.ripple);
    remote.connect();  
      
  //get ledger number and total coins  
    remote.on('ledger_closed', function(x){
      
      $scope.ledgerLabel = "Ledger #:";
      $scope.ledgerIndex = commas(parseInt(x.ledger_index,10));
      remote.request_ledger('closed', handleLedger);
      $scope.$apply();
       
    });
  
    function handleLedger(err, obj) {
      if (obj) {
        $scope.ledgerLabel = "Ledger #:";
        $scope.ledgerIndex = commas(parseInt(obj.ledger.ledger_index,10));
        $scope.totalCoins  = commas(parseInt(obj.ledger.total_coins,10)/1000000); 
        $scope.$apply();
      }
    }  
    
    $scope.ledgerLabel = "connecting...";
    
    remote.request_ledger('closed', handleLedger); //get current ledger;     
    remote.on("disconnect", function(){
      $scope.ledgerLabel      = "reconnecting...";
      $scope.ledgerIndex      = "";
      $scope.connectionStatus = "disconnected";
      $scope.$apply();      
    }); 
    
    remote.on("connect", function(){
      $scope.ledgerLabel      = "connected";
      $scope.connectionStatus = "connected";
      $scope.$apply();      
    
      //setTimeout(function(){remote.disconnect()},5000);
      //setTimeout(function(){remote.connect()},10000);
    }); 
    
  });
  
  //load gateways file before starting the app
  d3.json("assets/gateways.json", function(error, data) {
    gateways = data;
    angular.bootstrap(document, ['ripplecharts']);

/*
    api = new ApiHandler("http://localhost:5993/api");
    api.networkValue({
      
    }, function(data){
      console.log(data);
    }, function(data){
      console.log(data);
    });  
*/    
  });
});

function commas (number, precision) {
  if (number===0) return 0;
  if (!number) return null;
  var parts = number.toString().split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  if (precision && parts[1]) parts[1] = parts[1].substring(0,precision);
  else if (precision===0) return parts[0];
  return parts.join(".");
}
