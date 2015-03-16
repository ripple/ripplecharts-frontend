angular.module( 'ripplecharts.manage-gateways', [
  'ui.state',
  'ui.bootstrap'
])

.config(function config( $stateProvider ) {
  $stateProvider.state( 'manage-gateway', {
    url: '/manage-gateway',
    views: {
      "main": {
        controller: 'ManageGatewaysCtrl',
        templateUrl: 'manage-gateways/manage-gateways.tpl.html'
      }
    },
    data:{ pageTitle: 'Manage Gateways' },
    resolve : {
      gateInit : function (gateways) {
        return gateways.promise;
      }
    }
  });
})

.controller( 'ManageGatewaysCtrl', function ManageGatewaysCtrl( $scope, $state, $location, gateways ) {

  //load settings from session, local storage, options, or defaults  
  $scope.base  = store.session.get('base') || store.get('base') || 
    Options.base || {currency:"XRP", issuer:""};
  
  $scope.trade = store.session.get('trade') || store.get('trade') || 
    Options.trade || {currency:"USD", issuer:"rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B"};

  $scope.customGateways = store.session.get('customGateways') || 
    store.get('customGateways') || [];

  $scope.excludedGateways = store.get('excludedGateways') || 
    store.session.get('excludedGateways') || [];

  $scope.excludedCurrencies = store.get('excludedCurrencies') || 
    store.session.get('excludedCurrencies') || [];

  var query = Object.keys($location.search())[0];

  if (query === 'trade' || query === 'quote') query = 'quote';
  else if (query !== 'base') query = 'base';

  var dropdownA = d3.select('#dropdown').append('div')
    .attr('id', query).attr('class', 'dropdown');

  var associatedCurrency;
  var loaded = false;
  loadDropdowns(dropdownA);

  var addButton = d3.select('#btnAdd').on('click', function(){
    var addBox  = d3.select('#txtName');
    var newGateway = addBox.property('value');
    var description = d3.select('.description');
    var response;
    d3.xhr('https://id.ripple.com/v1/user/'+newGateway, function(err, res){
      if (err) description.html('Could not load custom gateway.');
      else {
        response = JSON.parse(res.response);
        if (response.exists){
          addCheckbox(associatedCurrency, response.address, response.username);
          description.html('');
        }
        else {
          description.html('Please enter a valid Ripple Address.');
        }
      }
    });
    addBox.property('value', '');
  });

  function addCheckbox(currency, iss, name) {

    var container     = d3.select('#custom_gateway_list');
    var inputWrapper  = container.append('div').attr('class', 'inputWrapper');
    var customGateway = {currency: currency, issuer: iss, name: name};
    var index = getIndex($scope.customGateways, currency, iss);

    if (index === -1) {
      $scope.customGateways.push(customGateway);
      store.session.set('customGateways', $scope.customGateways);
      store.set('customGateways', $scope.customGateways);
      inputWrapper.append('input').attr('type', 'checkbox').property('checked', true)
        .on('change', function(){
          var status = d3.select(this).property('checked');
          var index  = getIndex($scope.excludedGateways, currency, iss);
          if (!status) {
            if (index === -1) $scope.excludedGateways.push({currency: currency, issuer: iss, name: name});
          }
          else $scope.excludedGateways.splice(index, 1);
          store.set('excludedGateways', $scope.excludedGateways);
          store.session.set('excludedGateways', $scope.excludedGateways);
          if (!status) {
            checkLocal(currency, iss, 'base');
            checkLocal(currency, iss, 'trade');
          }
        });
      inputWrapper.append('label').text(iss);
      inputWrapper.append('a').attr('class', 'removeBtn').text('remove').on('click', function(){
        inputWrapper.remove();
        index = getIndex($scope.customGateways, currency, iss);
        d3.select(this.parentNode).remove();
        $scope.customGateways.splice(index, 1);
        store.session.set('customGateways', $scope.customGateways);
        store.set('customGateways', $scope.customGateways);
        //ADD remove from excluded
      });
    } 
  }

  function checkLocal(currency, iss, select) {
    var gateway;
    console.log("Checking local:", currency, iss);
    console.log("Against:", $scope[select].currency, $scope[select].issuer);
    console.log("Results:", $scope[select].currency === currency, $scope[select].issuer === iss);
    if ($scope[select].currency === currency && $scope[select].issuer === iss){
      console.log("same!", select);
      var list = gateways.getIssuers(currency);
      console.log("list", list);
      for(var i=0; i<list.length; i++) {
        gateway = list[i];
        if (gateway.include) {
          console.log("gateway", gateway);
          $scope[select] = {currency: currency, issuer: gateway.account};
          store.set(select, $scope[select]);
          store.session.set(select, $scope[select]);
          return;
        }
      }
      $scope.excludedCurrencies.push(currency);
      store.set('excludedCurrencies', $scope.excludedCurrencies);
      store.session.set('excludedCurrencies', $scope.excludedCurrencies);
      $scope[select] = {currency: 'XRP'};
      store.set(select, $scope[select]);
      store.session.set(select, $scope[select]);
    }
  }

  function getIndex(array, currency, iss) {
    var index = -1;
    var gateway;
    for (var i=0; i< array.length; i++) {
      gateway = array[i];
      if (gateway.currency === currency && gateway.issuer === iss) {
        index = i;
        break;
      }
    }
    return index;
  }

  function loadDropdowns(selection) {
    selection.html("");

    var selectionId;
    if (selection.attr("id") === "quote") selectionId = "trade";
    else selectionId = "base";
    var currencies     = gateways.getCurrencies();
    var currencySelect = selection.append("div").attr("class", "currency").attr("id", selectionId+"_currency");
    associatedCurrency = $scope[selectionId].currency;

    //format currnecies for dropdowns
    for (var i=0; i<currencies.length; i++) {
      if (currencies[i].currency === "XRP") {
        //don't populate XRP in currency dropdown
      } else {
        currencies[i] = {
          text     : ripple.Currency.from_json(currencies[i].currency).to_human().substring(0,3), 
          value    : i, 
          currency : currencies[i].currency,
          imageSrc : currencies[i].icon
        };
      }
      if ($scope[selectionId].currency === currencies[i].currency) currencies[i].selected = true;
    }

    $("#"+selectionId+"_currency").ddslick({
      data: currencies,
      imagePosition: "left",
      width: "120px",
      onSelected: function (data) {
        changeCurrency(data.selectedData.currency);
      }
    });


    function changeCurrency(selected){
      $('#gateway_curr_list').html('');
      $('#irba_gateway_curr_list').html('');
      var issuers = gateways.getIssuers(selected);
      var issuer;
      associatedCurrency = selected;

      //Add custom gateways
      var container     = d3.select('#custom_gateway_list');
      container.html('');

      issuers.forEach(function(issuer, i) {
        var issuerList, checkbox, inputWrapper;
        issuer.text = issuer.name;

        if (selected != "XRP" && !issuer.custom) {
          issuer.imageSrc = issuer.assets['logo.svg'];
        }
        if ($scope[selectionId].issuer === issuer.account) issuer.selected = true;
        else issuer.selected = false;
        issuer.value = i;

        if (!issuer.custom && issuer.imageSrc) {
          issuerList = d3.select('#gateway_curr_list');
          checkbox   = issuerList;
        } else if (!issuer.custom && !issuer.imageSrc) {
          issuerList = d3.select('#irba_gateway_curr_list');
          checkbox   = issuerList;
        }
        else if (issuer.custom) {
          issuerList = d3.select('#custom_gateway_list');
          inputWrapper = issuerList.append('div').attr('class', 'inputWrapper');
          checkbox = inputWrapper;
        }

        checkbox.append('input').attr('type', 'checkbox').property('checked', issuer.include)
          .on('change', function(){
            var status = d3.select(this).property('checked');
            var index  = getIndex($scope.excludedGateways, selected, issuer.account);
            if (!status) {
              if (index === -1) $scope.excludedGateways.push({currency: selected, issuer: issuer.account});
            }
            else $scope.excludedGateways.splice(index, 1);
            store.set('excludedGateways', $scope.excludedGateways);
            store.session.set('excludedGateways', $scope.excludedGateways);
            if (!status) {
              checkLocal(selected, issuer.account, 'base');
              checkLocal(selected, issuer.account, 'trade');
            }
          });
        if (issuer.imageSrc) {
          issuerList.append("img")
            .attr("class", "gateway_symb")
            .attr("src", issuers[i].icon)
        } else if (!issuer.custom) {
          issuerList.append("text").text(issuers[i].name);
          issuerList.append("p");
        } else if (issuer.custom) {
          inputWrapper.append('text').text(issuers[i].account);
          inputWrapper.append('a').attr('class', 'removeBtn').text('remove').on('click', function(){
            inputWrapper.remove();
            index = getIndex($scope.customGateways, selected, issuer.account);
            d3.select(this.parentNode).remove();
            $scope.customGateways.splice(index, 1);
            store.session.set('customGateways', $scope.customGateways);
            store.set('customGateways', $scope.customGateways);
            //ADD remove from excluded
          });
        }
          
      });

    }
  }
 
});