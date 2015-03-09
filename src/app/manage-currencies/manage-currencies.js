angular.module( 'ripplecharts.manage-currencies', [
  'ui.state',
  'ui.bootstrap'
])

.config(function config( $stateProvider ) {
  $stateProvider.state( 'manage-currency', {
    url: '/manage-currency',
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

    $('#btnSave').click(function() {
      //if the manual currency entered is 3 characters then add it
      if($('#txtName').val().length === 3 ) {
        addCheckbox($('#txtName').val());
        $('.description').html('');
      } else {
      //otherwise print a warning
        $('.description').html('Please enter a valid currency code');
      }
      //clear placeholder
      $('.manual').val("");
    });

    function addCheckbox( name ) {

      var container = $('#currencyList');
      var inputs = container.find('input');
      var id = inputs.length+1;
      var wrapper = $('<div class="inputWrapper">').appendTo(container);

      $('<input />', { type: 'checkbox', id: 'currency-'+id, value: name }).appendTo(wrapper);
      $('<label />', { 'for': 'currency-'+id, text: name }).appendTo(wrapper);
      $('<a class="removeBtn">remove</a></div><br/>').appendTo(wrapper);
      
      $('.removeBtn').each(function() {
        $(this).click(function() {
          $(this).parent().fadeOut();
        });
      });

    }


  var currencies = gateways.getCurrencies();

  for (var i=0; i<currencies.length; i++) {
    //console.log(currencies[i]);
    if (i > 8) {
      $('#curr_list .second_column').append('<input type="checkbox"><img class="curr_symb" src=' + currencies[i].icon + '>' + currencies[i].currency + '<br/>');
    } else {
      $('#curr_list .first_column').append('<input type="checkbox"><img class="curr_symb" src=' + currencies[i].icon + '>' + currencies[i].currency + '<br/>');
    }
  }
  
});