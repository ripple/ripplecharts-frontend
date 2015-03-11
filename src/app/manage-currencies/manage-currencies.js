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
  var currencyWrapper, name;
  var currencies = gateways.getCurrencies();
  var curr_col1  = d3.select('#curr_list .first_column');
  var curr_col2  = d3.select('#curr_list .second_column');
  var other_col  = d3.select('#other_curr_list .other_currencies');

  console.log(currencies);

  $scope.excludedCurrencies = store.get('excludedCurrencies') || store.session.get('excludedCurrencies') || [];
  $scope.customCurrencies   = store.get('customCurrencies') || store.session.get('customCurrencies') || [];

  //Add standard currency boxes
  currencies.forEach(function(currency, i){

    if (!currency.custom  && i < 9) {
      currencyWrapper = curr_col1.append('div').attr('class', 'currency strd');
    } else if (!currency.custom && i > 8){
      currencyWrapper = curr_col2.append('div').attr('class', 'currency strd');
    } else if (currency.custom) {
      currencyWrapper = other_col.append('div').attr('class', 'currency custom');
    }
    //add other

    currencyWrapper.append('input').attr('type', 'checkbox').property('checked', currency.include);
    if (currency.icon)
      currencyWrapper.append('img').attr('class', 'curr_symb').attr('src', currency.icon);
    currencyWrapper.append('text').text(currency.currency);
    if (currency.custom)
      currencyWrapper.append('a').attr('class', 'removeBtn').text('remove')
        .on('click', function() {
          var index = $scope.customCurrencies.indexOf(currency.currency);
          d3.select(this.parentNode).remove();
          $scope.customCurrencies.splice(index, 1);
          store.session.set('customCurrencies', $scope.customCurrencies);
          store.set('customCurrencies', $scope.customCurrencies);
        });
  });

  var strd = d3.selectAll('.currency').on('change', function(d){
    var self             = d3.select(this);
    var selectedCurrency = self.select('text').text();
    var input            = self.select('input');
    var status           = input.property('checked');
    var index = $scope.excludedCurrencies.indexOf(selectedCurrency);
    if (!status) {
      if (index === -1) $scope.excludedCurrencies.push(selectedCurrency);
    }
    else $scope.excludedCurrencies.splice(index, 1);
    store.set('excludedCurrencies', $scope.excludedCurrencies);
    store.session.set('excludedCurrencies', $scope.excludedCurrencies); 

  });

  //Add custom currencies
  var addButton = d3.select('#btnAdd').on('click', function() {
    var addBox  = d3.select('#txtName');
    var newCurr = addBox.property('value');
    var description = d3.select('.description');
    if (newCurr.length === 3) {
      addCheckbox(newCurr);
      description.html('');
    }
    else {
      description.html('Please enter a valid currency code.')
    }
    addBox.property('value', '');
  });

  //Save custom currencies
  var saveButton = d3.select('#btnSave').on('click', function() {
    var entries = d3.selectAll('.inputWrapper');
    entries.each(function(){
      var self  = d3.select(this);
      var name  = self.select('label').text();
      var index = $scope.customCurrencies.indexOf(name);
      if (index === -1) {
        $scope.customCurrencies.push(name);
        store.session.set('customCurrencies', $scope.customCurrencies);
        store.set('customCurrencies', $scope.customCurrencies);
        currencyWrapper = other_col.append('div');
        currencyWrapper.append('input').attr('type', 'checkbox').property('checked', true);
        //add condition for checkbox
        currencyWrapper.append('text').text(name);
        currencyWrapper.append('a').attr('class', 'removeBtn').text('remove')
          .on('click', function(){
            index = $scope.customCurrencies.indexOf(name);
            d3.select(this.parentNode).remove();
            $scope.customCurrencies.splice(index, 1);
            store.session.set('customCurrencies', $scope.customCurrencies);
            store.set('customCurrencies', $scope.customCurrencies);
          });
      } 
    });
    entries.remove();
  });

  //Add checkbox
  function addCheckbox ( name ) {
    var container    = d3.select('#currencyList');
    var inputWrapper = container.append('div').attr('class', 'inputWrapper');

    inputWrapper.append('label').text(name);
    inputWrapper.append('a').attr('class', 'removeBtn').text('remove').on('click', function(){
      inputWrapper.remove();
    });
  }
  
});