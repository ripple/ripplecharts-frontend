angular.module('gateways', [])
.factory('gateways', function($http) {
    var original     = null;
    var userGateways = store.get('gateways');

    var promise = $http.get(API + '/gateways').success(function (data) {
      original = data;

      if (!userGateways) {
        userGateways = original;
        for (var currency in userGateways) {
          for (var i in userGateways[currency]) {
            if (userGateways[currency][i].featured) {
              userGateways[currency][i].selected = true;
            }
          }
        }
      }
    });

    var getCurrencies = function () {

      var currencies = [];
      var excludedCurrencies =  store.get('excludedCurrencies') || store.session.get('excludedCurrencies') || [];
      var customCurrencies   =  store.get('customCurrencies') || store.session.get('customCurrencies') || [];
      var include = true;

/*      if (excludedCurrencies.indexOf("XRP") !== -1) include = false;
      else include = true;*/

      for (var currency in userGateways) {
        for (var i=0; i<userGateways[currency].length; i++) {
          //temporarily removing XAU.5
          if (userGateways[currency][i].selected === true && currency !== '0158415500000000C1F76FF6ECB0BAC600000000') {
            if (excludedCurrencies.indexOf(currency) !== -1) include = false;
            else include = true;
            currencies.push({
              currency : currency,
              icon     : API + '/currencies/'+ currency +'.svg',
              custom   : false,
              include  : include
            });
            break;
          }
        }
      } 

      currencies.sort(function(a, b){
        if(a.currency < b.currency) return -1;
        if(a.currency > b.currency) return 1;
        return 0;
      });

      currencies.unshift({
        currency : "XRP",
        icon     : API + '/currencies/xrp.svg',
        custom   : false,
        include  : true
      });

      for (var j=0; j < customCurrencies.length; j++) {
        if (excludedCurrencies.indexOf(customCurrencies[j]) !== -1) include = false;
        else include = true;
        currencies.push({
          currency : customCurrencies[j],
          custom   : true,
          include  : include,
          icon     : API + '/currencies/default.svg'
        });
      }

      return currencies;
    };

    var getIssuers = function (currency, options) {
      var issuers = [ ];
      var normalized;
      var assets;
      var name;

      var excludedGateways =  store.get('excludedGateways') || store.session.get('excludedGateways') || {};
      var customGateways   =  store.get('customGateways') || store.session.get('customGateways') || {};

      if (!options) options = { };

      for (var i in userGateways[currency]) {
        if (options.all || userGateways[currency][i].selected === true) {
          normalized = userGateways[currency][i].name.toLowerCase().replace(/\W/g, '');
          assets = handleAssets(userGateways[currency][i].assets, normalized);

          if (getIndex(excludedGateways, currency, userGateways[currency][i].account) !== -1) include = false;
          else include = true;

          issuers.push({
            name      : userGateways[currency][i].name,
            account   : userGateways[currency][i].account,
            icon      : API + '/gateways/' + normalized + '/assets/logo.svg',
            assets    : assets,
            featured  : userGateways[currency][i].featured,
            selected  : userGateways[currency][i].selected,
            custom    : false,
            include   : include,
            startDate : userGateways[currency][i].startDate
          });
        }
      }

      if (currency in customGateways) {
        for (var j=0; j < customGateways[currency].length; j++) {
          if (getIndex(excludedGateways, currency, customGateways[currency][j].issuer) !== -1) include = false;
          else include = true;
          if (customGateways[currency][j].name) name = customGateways[currency][j].name;
          else name = customGateways[j].issuer;
          issuers.push({
            name     : name,
            account  : customGateways[currency][j].issuer,
            featured : false,
            selected : false,
            custom   : true,
            include  : include 
          });
        }
      }

      return issuers;

      //add API endpoint to asset filenames
      function handleAssets(assets, normalized) {
        var obj = { };

        if (!assets) assets = [ ];

        assets.forEach(function(a) {
          obj[a] = API + '/gateways/' + normalized + '/assets/' + a;
        });

        return obj;
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

    };

    return {
      promise       : promise,
      getCurrencies : getCurrencies,
      getIssuers    : getIssuers
    }
});
