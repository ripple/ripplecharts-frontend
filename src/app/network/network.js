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
    data:{ pageTitle: 'Network' }
  });
})

.controller( 'NetworkCtrl', function AboutCtrl( $scope ) {
  // This is simple a demo for UI Boostrap.
  $scope.dropdownDemoItems = [
    "The first choice!",
    "And another choice for you.",
    "but wait! A third!"
  ];
})

;
