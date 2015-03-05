angular.module( 'ripplecharts.manage-currencies', [
  'ui.state',
  'ui.bootstrap'
])

.config(function config( $stateProvider ) {
  $stateProvider.state( 'manage-currencies', {
    url: '/manage-currencies',
    views: {
      "main": {
        controller: 'ManageCurrenciesCtrl',
        templateUrl: 'manage-currencies/manage-currencies.tpl.html'
      }
    },
    data:{ pageTitle: 'Manage Currencies' },
    resolve : {
      gateInit : function (gateways) {
        return gateways.promise;
      }
    }
  });
})

.controller( 'ManageCurrenciesCtrl', function ManageCurrenciesCtrl( $scope, gateways) {

  var currencies = gateways.getCurrencies();

  for (var i=0; i<currencies.length; i++) {
    //console.log(currencies[i]);
    $('#curr_list').append('<input type="checkbox">' + '<img class="curr_symb" src=' + currencies[i].icon + '>' + currencies[i].currency +'</input>');
  }
  
  
});