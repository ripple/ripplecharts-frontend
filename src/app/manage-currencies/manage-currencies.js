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
  var currencies = gateways.getCurrencies('all');
  var curr_col1  = d3.select('#curr_list .first_column');
  var curr_col2  = d3.select('#curr_list .second_column');
  var other_col  = d3.select('#currencyList');

  //load settings from session, local storage, options, or defaults
  $scope.base  = store.session.get('base') || store.get('base') ||
    Options.base || {currency:"XRP", issuer:""};

  $scope.trade = store.session.get('trade') || store.get('trade') ||
    Options.trade || {currency:"USD", issuer:"rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B"};

  //Add standard currency boxes
  currencies.forEach(function(currency, i) {

    var checkbox;
    var self;

    if (!currency.custom  && i <= currencies.length/2) {
      currencyWrapper = curr_col1.append('div').attr('class', 'currency strd');
    } else if (!currency.custom){
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
          removeCustom(d3.select(this.parentNode), currency.currency);
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
    var newCurr     = addBox.property('value').toUpperCase();
    var description = d3.select('.description');

    for (var i=0; i<currencies.length; i++) {
      if (currencies[i].currency === newCurr) {
        description.html('Currency already added.');
        return;
      }
    }

    if (newCurr.length !== 3) {
      description.html('Please enter a valid currency code.');
    } else {
      addCheckbox(newCurr);
      description.html('');
      flashSaved();
      currencies = gateways.getCurrencies(true);
    }

    addBox.property('value', '');
  }

  function changeStatus(self, currency) {
    var checked = !!d3.select(self).property('checked');

    gateways.updateCurrency({
      exclude  : !checked,
      include  : checked,
      currency : currency
    });

    if (!checked) {
      checkLocal(currency, 'base');
      checkLocal(currency, 'trade');
    }
    flashSaved();
  }

  //Add checkbox
  function addCheckbox (currency) {
    var container    = d3.select('#currencyList');
    var inputWrapper = container.append('div').attr('class', 'inputWrapper');
    gateways.updateCurrency({
      add      : true,
      currency : currency
    });

    inputWrapper.append('input')
    .attr('type', 'checkbox')
    .property('checked', true)
    .on('change', function() {
      changeStatus(this, currency);
    });

    inputWrapper.append('label').text(currency);
    inputWrapper.append('a')
    .attr('class', 'removeBtn').text('remove')
    .on('click', function() {
      removeCustom(inputWrapper, currency);
      checkLocal(currency, 'base');
      checkLocal(currency, 'trade');
    });
    flashSaved();

  }

  function removeCustom(selection, currency) {
    selection.transition()
      .duration(300)
      .style('opacity', 0)
      .each('end', function(){
        d3.select(this).remove();
      });

    gateways.updateCurrency({
      remove   : true,
      currency : currency
    });
    flashSaved();
    currencies = gateways.getCurrencies(true);
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
