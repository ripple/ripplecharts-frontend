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
      console.log("sg",store.session.get('customCurrencies'));
      console.log("g",store.get('customCurrencies'));

      var currencies = [];
      var excludedCurrencies =  store.get('excludedCurrencies') || store.session.get('excludedCurrencies') || [];
      var customCurrencies   =  store.get('customCurrencies') || store.session.get('customCurrencies') || [];
      var include = true;

      if (excludedCurrencies.indexOf("XRP") !== -1) include = false;
      else include = true;

      currencies.push({
        currency : "XRP",
        icon     : API + '/currencies/xrp.svg',
        custom   : false,
        include  : include
      });

      for (var currency in userGateways) {
        for (var i=0; i<userGateways[currency].length; i++) {
          if (userGateways[currency][i].selected === true) {
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

      for (var j=0; j < customCurrencies.length; j++) {
        if (customCurrencies[j].indexOf(customCurrencies[j]) !== -1) include = false;
        else include = true;
        currencies.push({
          currency : customCurrencies[j],
          custom   : true,
          include  : include
        });
      }

      return currencies;
    };

    var getIssuers = function (currency, options) {
      var issuers = [ ];
      var normalized;
      var assets;

      if (!options) options = { };

      if (!userGateways[currency]) {
        return issuers;
      }

      for (var i in userGateways[currency]) {
        if (options.all || userGateways[currency][i].selected === true) {
          normalized = userGateways[currency][i].name.toLowerCase().replace(/\W/g, '');
          assets = handleAssets(userGateways[currency][i].assets, normalized);

          issuers.push({
            name     : userGateways[currency][i].name,
            account  : userGateways[currency][i].account,
            icon     : API + '/gateways/' + normalized + '/assets/logo.svg',
            assets   : assets,
            featured : userGateways[currency][i].featured,
            selected : userGateways[currency][i].selected
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
    };

    return {
      promise       : promise,
      getCurrencies : getCurrencies,
      getIssuers    : getIssuers
    }
});
