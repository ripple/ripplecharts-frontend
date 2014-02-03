
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

      mixpanel.track("Page", {"Page Name":toState.name, "Theme":$scope.theme});
      
      if ( angular.isDefined( toState.data.pageTitle ) ) {
        $scope.pageTitle = toState.data.pageTitle + ' | Ripple Charts' ;
      }
    });
    
    
  //get ledger number and total coins  
    remote.on('ledger_closed', function(x){
      
      $scope.ledgerLabel = "Ledger #:";
      $scope.ledgerIndex = Number(parseInt(x.ledger_index,10)).toLocaleString();
      remote.request_ledger('closed', handleLedger);
      $scope.$apply();
       
    });
  
    function handleLedger(err, obj) {
      if (obj) {
        $scope.ledgerLabel  = "Ledger #:";
        $scope.ledgerIndex  = Number(parseInt(obj.ledger.ledger_index,10)).toLocaleString();
        $scope.networkValue = Number(parseInt(obj.ledger.total_coins,10)/1000000).toLocaleString(); 
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

    //connect to the ripple network;
    remote = new ripple.Remote(Options.ripple);
    remote.connect();
  
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
