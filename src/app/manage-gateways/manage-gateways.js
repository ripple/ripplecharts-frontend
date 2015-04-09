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
  var addButton, addBox, newGateway, description, response;

  //load settings from session, local storage, options, or defaults
  $scope.base  = store.session.get('base') || store.get('base') ||
    Options.base || {currency:"XRP", issuer:""};

  $scope.trade = store.session.get('trade') || store.get('trade') ||
    Options.trade || {currency:"USD", issuer:"rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B"};

  //Figure out query and load dropdown accordingly
  var query = Object.keys($location.search())[0];
  var associatedCurrency;
  var loaded = false;
  var dropdownA;

  if (query === 'trade')  query = 'trade';
  else                    query = 'base';

  //swap it if XRP is the currency
  //this can happen if base/trade isnt
  //indicated in the URL
  if ($scope[query].currency === 'XRP') {
    query = query === 'trade' ? 'base' : 'trade';
  }

  dropdownA = d3.select('#dropdown').append('div')
    .attr('id', query).attr('class', 'dropdown');
  loadDropdowns(dropdownA);

  //Add custom gateway
  addButton = d3.select('#btnAdd').on('click', function(){
    add();
  });

  $('#txtName').keypress(function(event) {
    if (event.keyCode == 13) {
      add();
    }
  });

  function add(){
    var username;
    addBox  = d3.select('#txtName');
    newGateway = addBox.property('value');
    description = d3.select('.description').html('Loading...');
    d3.xhr('https://id.ripple.com/v1/user/'+newGateway, function(err, res){
      if (!err) {
        response = JSON.parse(res.response);
        if (response.exists) {
          username = response.username;
          addCheckbox(associatedCurrency, newGateway, username);
          description.html('');
        }
      }
      if (!username) {
        if (newGateway.length >= 33 && newGateway.length <= 34 && newGateway[0] === "r"){
          addCheckbox(associatedCurrency, newGateway, "");
          description.html('');
        }
        else {
          description.html('Please enter a valid Ripple Address.');
        } 
      }
    });
    addBox.property('value', '');
  }

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

  //Add custom entry
  function addCheckbox(currency, iss, name) {

    var container     = d3.select('#custom_gateway_list');
    var inputWrapper  = container.append('div').attr('class', 'inputWrapper');

    addCustom(currency, iss, name);
    inputWrapper.append('input').attr('type', 'checkbox').property('checked', true)
      .on('change', function(){
        changeStatus(this, currency, iss, name);
      });

    if (iss !== name && name !== "")
      inputWrapper.append('text').text(name+" ("+iss+")");
    else inputWrapper.append('text').text(iss);

    inputWrapper.append('a').attr('class', 'removeBtn').text('remove').on('click', function(){
      inputWrapper.transition()
        .transition()
        .duration(500)
        .style('opacity', 0)
        .each('end', function(){
          d3.select(this).remove();
        });

      removeCustom(currency, iss);
    });
  }

  function loadDropdowns(selection) {
    selection.html("");

    var selectionId    = selection.attr("id");
    var currencies     = gateways.getCurrencies(true);
    var currencySelect = selection.append("div").attr("class", "currency").attr("id", selectionId+"_currency");
    var picked         = false;
    var i;

    //remove XRP
    currencies.shift();

    //remove currencies without
    //at least one enabled gateway,
    //except custom ones
    i = currencies.length;
    while(i--) {
      if (!currencies[i].include && !currencies[i].custom) {
        delete currencies[i];
        currencies.splice(i,1);
      }
    }

    associatedCurrency = $scope[selectionId].currency;

    //format currnecies for dropdowns
    for (i=0; i<currencies.length; i++) {
      currencies[i] = {
        text     : ripple.Currency.from_json(currencies[i].currency).to_human().substring(0,3),
        value    : i,
        currency : currencies[i].currency,
        imageSrc : currencies[i].icon
      };

      if ($scope[selectionId].currency === currencies[i].currency) {
        picked = currencies[i].currency;
        currencies[i].selected = true;
      }
    }

    if (!picked) currencies[1].selected = true;

    function checkThemeLogo(issuer) {
      if ($scope.theme == 'dark') {
        issuer.imageSrc = issuer.assets['logo.grayscale.svg'];
      } else if ($scope.theme == 'light') {
        issuer.imageSrc = issuer.assets['logo.svg'];
      }
    }

    $scope.$watch('theme', function(){
      changeCurrency($scope[selectionId].currency);
    });

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
      var issuers = gateways.getIssuers(selected, true);
      var issuer;
      associatedCurrency = selected;

      //Add custom gateways
      var container     = d3.select('#custom_gateway_list');
      container.html('');

      issuers.forEach(function(issuer, i) {
        var issuerList, checkbox, inputWrapper;
        issuer.text = issuer.name;

        if (selected != "XRP" && !issuer.custom) {
          //issuer.imageSrc = issuer.assets['logo.svg'];
          checkThemeLogo(issuer);
        }
        if ($scope[selectionId].issuer === issuer.account) issuer.selected = true;
        else issuer.selected = false;
        issuer.value = i;

        if (!issuer.custom && issuer.imageSrc) {
          issuerList = d3.select('#irba_gateway_curr_list');
          inputWrapper = issuerList.append('div').attr('class', 'inputWrapper irba');
          checkbox   = inputWrapper;
        } else if (!issuer.custom && !issuer.imageSrc) {
          issuerList = d3.select('#gateway_curr_list');
          inputWrapper = issuerList.append('div').attr('class', 'inputWrapper');
          checkbox   = inputWrapper;
        }
        else if (issuer.custom) {
          issuerList = d3.select('#custom_gateway_list');
          inputWrapper = issuerList.append('div').attr('class', 'inputWrapper');
          checkbox = inputWrapper;
        }

        checkbox.append('input').attr('type', 'checkbox').property('checked', issuer.include)
          .on('change', function(){
            changeStatus(this, selected, issuer.account, issuer.name);
          });

        if (issuer.imageSrc) {
          inputWrapper.append("img")
            .attr("class", "gateway_symb")
            .attr("src", issuers[i].imageSrc)
        } else if (!issuer.custom) {
          inputWrapper.append("text").text(issuers[i].name);
          inputWrapper.append("p");
        } else if (issuer.custom) {
          if (issuers[i].account !== issuers[i].name)
            inputWrapper.append('text').text(issuers[i].name+" ("+issuers[i].account+")");
          else inputWrapper.append('text').text(issuers[i].account);
          inputWrapper.append('a').attr('class', 'removeBtn').text('remove').on('click', function(){
            inputWrapper.transition()
              .transition()
              .duration(300)
              .style('opacity', 0)
              .each('end', function(){
                d3.select(this).remove();
              });
            removeCustom(selected, issuer.account);
          });
        }

      });

    }
  }

  function changeStatus(checkbox, currency, issuer, name) {
    var checked = d3.select(checkbox).property('checked');

    gateways.updateIssuer({
      currency : currency,
      issuer   : issuer,
      exclude  : !checked,
      include  : checked
    });

    if (!status) {
      checkLocal(currency, issuer, 'base');
      checkLocal(currency, issuer, 'trade');
    }

    flashSaved();
  }

  function addCustom(currency, issuer, name) {
    gateways.updateIssuer({
      currency : currency,
      issuer   : issuer,
      name     : name,
      add      : true
    });
    flashSaved();
  }

  function removeCustom(currency, issuer) {
    gateways.updateIssuer({
      currency : currency,
      issuer   : issuer,
      name     : name,
      remove   : true
    });
    flashSaved();
  }

  function checkLocal(currency, iss, select) {
    var gateway;
    if ($scope[select].currency === currency && $scope[select].issuer === iss){
      var next = false;
      while (next === false) {
        next = pickNextGateway(currency);
        if (next === false) {
          currency = pickNextCurrency(currency).currency;
        }
      }
      $scope[select] = {currency: currency, issuer: next.account};
      store.set(select, $scope[select]);
      store.session.set(select, $scope[select]);
    }
  }

  function pickNextCurrency(currency) {
    var currencyList = gateways.getCurrencies();
    var picked = false;
    var c;
    for (var i=0; i<currencyList.length; i++) {
      c = currencyList[i];
      if (picked && c.include && c.currency !== "XRP") {
        return c;
      }
      if (c.currency === currency) picked = true;
    }
    for (i=1; i<currencyList.length; i++) {
      c = currencyList[i];
      if (picked && c.include && c.currency !== "XRP"){
        return c;
      }
    }
    return currencyList[0];
  }

  function pickNextGateway(currency) {
    if (currency === "XRP") return "";
    var issuerList = gateways.getIssuers(currency);
    var gateway;
    for (var i=0; i<issuerList.length; i++){
      gateway = issuerList[i];
      if (gateway.include) {
        return gateway;
      }
    }
    return false;
  }

  function getIndex(object, currency, iss) {
    var index = -1;
    var gateway;
    if (currency in object) {
      var array = object[currency];
      for (var i=0; i< array.length; i++) {
        gateway = array[i];
        if (gateway.issuer === iss) {
          index = i;
          break;
        }
      }
    }
    return index;
  }

});
