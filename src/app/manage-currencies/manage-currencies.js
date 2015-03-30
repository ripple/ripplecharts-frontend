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
  var other_col  = d3.select('#currencyList');

  //load settings from session, local storage, options, or defaults  
  $scope.base  = store.session.get('base') || store.get('base') || 
    Options.base || {currency:"XRP", issuer:""};
  
  $scope.trade = store.session.get('trade') || store.get('trade') || 
    Options.trade || {currency:"USD", issuer:"rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B"};

  $scope.excludedCurrencies = store.get('excludedCurrencies') || store.session.get('excludedCurrencies') || [];
  $scope.customCurrencies   = store.get('customCurrencies') || store.session.get('customCurrencies') || [];

  $scope.excludedGateways = store.get('excludedGateways') || store.session.get('excludedGateways') || {};
  $scope.customGateways = store.session.get('customGateways') || 
    store.get('customGateways') || {};

  //Add standard currency boxes
  currencies.forEach(function(currency, i) {

    var checkbox;
    var self;

    if (!currency.custom  && i < 9) {
      currencyWrapper = curr_col1.append('div').attr('class', 'currency strd');
    } else if (!currency.custom && i > 8){
      currencyWrapper = curr_col2.append('div').attr('class', 'currency strd');
    } else if (currency.custom) {
      currencyWrapper = other_col.append('div').attr('class', 'currency custom inputWrapper');
    }

    checkbox = currencyWrapper.append('input').attr('type', 'checkbox').property('checked', currency.include)
      .on('change', function() {
        self = this;
        changeStatus(self, currency.currency);
      });

    if (currency.currency === "XRP") checkbox.property('disabled', true);

    if (!currency.custom)
      currencyWrapper.append('img').attr('class', 'curr_symb').attr('src', currency.icon);
    currencyWrapper.append('text').text(currency.currency);
    if (currency.custom)
      currencyWrapper.append('a').attr('class', 'removeBtn').text('remove')
        .on('click', function() {
          removeCustom(currencyWrapper, currency.currency);
          checkLocal(currency.currency, 'base');
          checkLocal(currency.currency, 'trade');
        });
  });

  //Add custom currencies
  var addButton = d3.select('#btnAdd').on('click', function() {
    add();
  });

  var saved = d3.select('.saved');
  function flashSaved() {
    saved.transition()
      .duration(500)
      .style('opacity', 1);
    saved.transition()
      .delay(1500)
      .duration(500)
      .style('opacity', 0);
  }

  $('#txtName').keypress(function(event) {
    if (event.keyCode == 13) {
      add();
    }
  });

  function add() {
    var addBox      = d3.select('#txtName');
    var newCurr     = addBox.property('value');
    var description = d3.select('.description');
    if (newCurr.length === 3) {
      addCheckbox(newCurr);
      description.html('');
      flashSaved();
    }
    else {
      description.html('Please enter a valid currency code.')
    }
    addBox.property('value', '');
  }

  function changeStatus(self, currency) {
    var status = d3.select(self).property('checked');
    var index = $scope.excludedCurrencies.indexOf(currency);
    if (!status) {
      if (index === -1) $scope.excludedCurrencies.push(currency);
    }
    else {
      $scope.excludedCurrencies.splice(index, 1);
      delete $scope.excludedGateways[currency];
      store.set('excludedGateways', $scope.excludedGateways);
      store.session.set('excludedGateways', $scope.excludedGateways);
    }
    store.set('excludedCurrencies', $scope.excludedCurrencies);
    store.session.set('excludedCurrencies', $scope.excludedCurrencies);
    if (!status) {
      checkLocal(currency, 'base');
      checkLocal(currency, 'trade');
    }
    flashSaved();
  }

  //Add checkbox
  function addCheckbox ( name ) {
    var container    = d3.select('#currencyList');
    var inputWrapper = container.append('div').attr('class', 'inputWrapper');
    var index        = $scope.customCurrencies.indexOf(name);
    var index2, self;

    if (index === -1) {
      $scope.customCurrencies.push(name);
      store.session.set('customCurrencies', $scope.customCurrencies);
      store.set('customCurrencies', $scope.customCurrencies);
      inputWrapper.append('input').attr('type', 'checkbox').property('checked', true)
        .on('change', function() {
          self = this;
          changeStatus(self, name);
        });
      inputWrapper.append('label').text(name);
      inputWrapper.append('a').attr('class', 'removeBtn').text('remove')
        .on('click', function() {
          removeCustom(inputWrapper, name);
          checkLocal(name, 'base');
          checkLocal(name, 'trade');
        });
      flashSaved();
    } 
  }

  function removeCustom(selection, currency) {
    selection.transition()
      .duration(300)
      .style('opacity', 0)
      .each('end', function(){
        d3.select(this).remove();
      });
    index = $scope.customCurrencies.indexOf(currency);
    $scope.customCurrencies.splice(index, 1);
    store.session.set('customCurrencies', $scope.customCurrencies);
    store.set('customCurrencies', $scope.customCurrencies);

    index2 = $scope.excludedCurrencies.indexOf(currency);
    $scope.excludedCurrencies.splice(index2, 1);
    store.session.set('excludedCurrencies', $scope.excludedCurrencies);
    store.set('excludedCurrencies', $scope.excludedCurrencies);

    delete $scope.customGateways[currency];
    store.session.set('customGateways', $scope.customGateways);
    store.set('customGateways', $scope.customGateways);
    flashSaved();
  }

  function checkLocal(currency, select) {
    if ($scope[select].currency === currency){
      var clist = gateways.getCurrencies();
      for(var j=0; j<clist.length; j++) {
        if (clist[j].include && clist[j].currency !== "XRP") {
          var list = gateways.getIssuers(clist[j].currency);
          for(var i=0; i<list.length; i++) {
            gateway = list[i];
            if (gateway.include) {
              $scope[select] = {currency: clist[j].currency, issuer: gateway.account};
              store.set(select, $scope[select]);
              store.session.set(select, $scope[select]);
              return;
            }
          }
        }
      }
      $scope[select] = {currency: 'XRP'};
      store.set(select, $scope[select]);
      store.session.set(select, $scope[select]);
    }
  }
  
});