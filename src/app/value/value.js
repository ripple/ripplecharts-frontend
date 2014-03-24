angular.module( 'ripplecharts.value', [
  'ui.state',
  'ui.bootstrap'
])

.config(function config( $stateProvider ) {
  $stateProvider.state( 'value', {
    url: '/value',
    views: {
      "main": {
        controller: 'ValueCtrl',
        templateUrl: 'value/value.tpl.html'
      }
    },
    data:{ pageTitle: 'Network Value' }
  });
})

.controller( 'ValueCtrl', function ValueCtrl( $scope ) {

//CapitalizationChart(); //old version
  var cap = new CapChart ({
    id       : "#valueChart",
    url      : API,  
    resize   : true
  });

//stop the listeners when leaving page  
  $scope.$on("$destroy", function(){
    cap.suspend();
  });    
});
