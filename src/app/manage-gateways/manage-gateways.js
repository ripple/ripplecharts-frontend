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

   

    $('#btnSave').click(function() {

    var val = $('#txtName').val();
      //if the manual gateway entered is 34 characters and begins with an r or begins with a '~' then add it
      if ( ( val.length == 34 && val.charAt(0) === "r" ) || val.charAt(0) === "~" ) {
        addCheckbox($('#txtName').val());
        $('.description').html('');
      } else {
      //otherwise print a warning
        $('.description').html('Please enter a valid Ripple Address or name');
      }
      //clear placeholder
      $('.manual').val("");
    });

    function addCheckbox( name ) {

    var container = $('#gatewayList');
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

   if ($state.params.base && $state.params.trade) {
    
    var base = $state.params.base.split(":");
    base = {currency:base[0],issuer:base[1] ? base[1]:""};
    var trade = $state.params.trade.split(":");
    trade = {currency:trade[0],issuer:trade[1] ? trade[1]:""};   

    store.set('base',  base);
    store.set('trade', trade);
    store.session.set('base',  base);
    store.session.set('trade', trade);  
    $location.path("/markets").replace(); //to remove the data from the URL
    return;
  }

//load settings from session, local storage, options, or defaults  
  $scope.base  = store.session.get('base') || store.get('base') || 
    Options.base || {currency:"XRP", issuer:""};
  
  $scope.trade = store.session.get('trade') || store.get('trade') || 
    Options.trade || {currency:"USD", issuer:"rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B"};
  
  $scope.chartType = store.session.get('chartType') || store.get('chartType') || 
    Options.chartType || "line";
  
  $scope.interval  = store.session.get('interval') || store.get('interval') || 
    Options.interval  || "15m";

  $scope.range  = store.session.get('range') || store.get('range') || 
    Options.range  || {name: "1d", start: moment.utc().subtract(1, 'd')._d, end: moment.utc()._d };  

  function loadDropdowns(selection) {
    selection.html("");

    var selectionId;
    if (selection.attr("id") === "quote") selectionId = "trade";
    else selectionId = "base";
    var currencies     = gateways.getCurrencies();
    var currencySelect = selection.append("div").attr("class", "currency").attr("id", selectionId+"_currency");
    //var gatewaySelect  = selection.append("select").attr("class","gateway").attr("id", selectionId+"_gateway");

    //format currnecies for dropdowns
    for (var i=0; i<currencies.length; i++) {
      currencies[i] = {
        text     : ripple.Currency.from_json(currencies[i].currency).to_human().substring(0,3), 
        value    : i, 
        currency : currencies[i].currency,
        imageSrc : currencies[i].icon
      };
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

      for (var i=0; i<issuers.length; i++){
        issuer = issuers[i];
        issuer.text = issuer.name;
        if (selected != "XRP") 
          issuer.imageSrc = issuer.assets['logo.svg'];
        issuer.value = i;

        if ($scope[selectionId].issuer === issuer.account) issuer.selected = true;
        else issuer.selected = false;

        if (issuers[i].imageSrc !== undefined) {

          var gatewayList = d3.select('#gateway_curr_list');

          gatewayList.append("input").attr("type", "checkbox");
          gatewayList.append("img")
            .attr("class", "gateway_symb")
            .attr("src", issuers[i].icon)

        } else {

          var irbaGatewayList = d3.select('#irba_gateway_curr_list');

          irbaGatewayList.append("input").attr("type", "checkbox");
          irbaGatewayList.append("text").text(issuers[i].name);
          irbaGatewayList.append("p");
        }
          
      }

    }

  }

  var loaded = false;
  var dropdownA = d3.select("#base");
  loadDropdowns(dropdownA);
 
  
});