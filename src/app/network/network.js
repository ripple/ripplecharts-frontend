angular.module( 'ripplecharts.network', [
  'ui.state',
  'ui.bootstrap'
])

.config(function config( $stateProvider ) {
  $stateProvider.state( 'network', {
    url: '/network',
    views: {
      "main": {
        controller: 'NetworkCtrl',
        templateUrl: 'network/network.tpl.html'
      }
    },
    data:{ pageTitle: 'Live Network' }
  });
})

.controller( 'NetworkCtrl', function NetworkCtrl( $scope, $state, $location ) {
  var network = new liveNetwork();
  $scope.$parent.$watch("theme", function() {
    network.changeTheme();
  });
  
  $scope.$on("$destroy", function(){
    console.log("DESTROYING");
    network.suspend();
  });
  console.log("CREATING!");
  //network.start();
  /*$scope.$on("$new", function() {
    console.log("CREATING!");
  });*/
  
  //stop the listeners when leaving page  
  /*$scope.$on("$destroy", function(){ 
    network.suspend();
  });*/
});