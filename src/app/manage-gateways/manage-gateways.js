angular.module( 'ripplecharts.manage-gateways', [
  'ui.state',
  'ui.bootstrap'
])

.config(function config( $stateProvider ) {
  $stateProvider.state( 'manage-gateways', {
    url: '/manage-gateways',
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
        var gatewaySelect  = selection.append("select").attr("class","gateway").attr("id", selectionId+"_gateway");

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
          $("#"+selectionId+"_gateway").ddslick("destroy");
          var issuers;
          var issuer;

          if (selected === "XRP") issuers = [{}];

          else issuers = gateways.getIssuers(selected);

          for (var i=0; i<issuers.length; i++){
            issuer = issuers[i];
            issuer.text = issuer.name;
            issuer.imageSrc = issuer.icon;
            issuer.value = i;

            if ($scope[selectionId].issuer === issuer.account) issuer.selected = true;
            else issuer.selected = false;

          }

          $("#"+selectionId+"_gateway").ddslick({
            data: issuers,
            imagePosition: "left",
            onSelected: function (data) {
                if (loaded) changeGateway(selected, data.selectedData.account, selectionId);
            }
          });

          if (selected === "XRP") 
            d3.select("#"+selectionId+"_gateway").classed("disabledDropdown", true);
        }

        function changeGateway(currency, issuer, selectionId){
          if (issuer)
            $scope[selectionId] = {currency: currency, issuer: issuer};
          else 
            $scope[selectionId] = {currency: "XRP"};
          if ($scope.range.name === "max") updateMaxrange();
          loadPair();
        }
      }

      var loaded = false;
      var dropdownA = d3.select("#base");
      var dropdownB = d3.select("#quote");
      loadDropdowns(dropdownA);
      //loadDropdowns(dropdownB);
  
});