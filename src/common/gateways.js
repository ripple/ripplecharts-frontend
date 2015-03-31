angular.module('gateways', [])
.factory('gateways', function($http) {
  var defaultGateways;
  var custom;

  //load gateways list from API
  var promise = $http.get(API + '/gateways').success(function (data) {
    var normalized;
    var gateway;
    var currency;

    defaultGateways = data;
    custom = store.session.get('userGateways') ||
      store.get('userGateways') || { };

    //add or update gateways
    for (currency in defaultGateways) {
      if (!custom[currency]) {
        custom[currency] = {
          custom  : false,
          issuers : { }
        };
      } else {
        custom[currency].custom = false;
      }

      for (var i in defaultGateways[currency]) {
        gateway = defaultGateways[currency][i];
        if (custom[currency].issuers[gateway.account]) {
          gateway.include = custom[currency].issuers[gateway.account].include;
        } else {
          gateway.include = defaultGateways[currency][i].featured;
        }

        normalized     = gateway.name.toLowerCase().replace(/\W/g, '');
        gateway.assets = handleAssets(gateway.assets, normalized);
        custom[currency].issuers[gateway.account] = gateway;

        //the first time we see this currency, include it
        //only if at least one of the gateways is included
        if (gateway.include && typeof custom[currency].include === 'undefined') {
          custom[currency].include = true;
        }
      }
    }

    //ensure that non-default currencies
    //are marked as custom
    for (currency in custom) {
      if (!defaultGateways[currency]) {
        custom[currency].custom = true;
      }
    }

    store.session.set('userGateways', custom);
    store.set('userGateways', custom);
  });

  //add API endpoint to asset filenames
  function handleAssets(assets, normalized) {
    var obj = { };

    if (!assets) assets = [ ];

    assets.forEach(function(a) {
      obj[a] = API + '/gateways/' + normalized + '/assets/' + a;
    });

    return obj;
  }

  /**
   * getCurrencies
   * get currencies from user defined list
   */

  var getCurrencies = function (mode) {

    var currencies = [];
    var include;

    //add currencies from cusom list
    for (var currency in custom) {
      if (currency === '0158415500000000C1F76FF6ECB0BAC600000000') {
        continue;
      }

      //skip ignored currencies
      if (!custom[currency].include && !mode) {
        continue;
      }

      include = null;

      //find selected currencies
      for (var issuer in custom[currency].issuers) {
        if (custom[currency].issuers[issuer].include) {
          include = {
            currency : currency,
            icon     : API + '/currencies/'+ currency +'.svg',
            include  : true,
            custom   : custom[currency].custom
          };
          break;
        }
      }

      //if none are selected, only add if all = true
      if (include)  currencies.push(include);
      else if (mode === 'all' || (
        mode && custom[currency].include)) currencies.push({
        currency : currency,
        icon     : API + '/currencies/'+ currency +'.svg',
        include  : custom[currency].include,
        custom   : custom[currency].custom
      });
    }

    currencies.sort(function(a, b){
      if(a.currency < b.currency) return -1;
      if(a.currency > b.currency) return 1;
      return 0;
    });

    currencies.unshift({
      currency : "XRP",
      icon     : API + '/currencies/xrp.svg',
      include  : true
    });

    return currencies;
  };

  /**
   * getIssuers
   * get issuers for a given currency
   */

  var getIssuers = function (currency, all) {
    var issuers = [ ];
    var normalized;
    var assets;
    var name;

    if (!custom[currency]) return [ ];

    for (var issuer in custom[currency].issuers) {
      if (all || custom[currency].issuers[issuer].include) {
        issuers.push(custom[currency].issuers[issuer]);
      }
    }

    return issuers;
  };

  var updateCurrency = function (options) {
    var currency = options.currency.toUpperCase();

    //include or exclude
    if (options.exclude || options.include) {
      if (!custom[currency]) return;

      custom[currency].include = options.include ? true : false;

    //add custom
    } else if (options.add && !custom[currency]) {
      custom[currency] = {
        custom  : true,
        issuers : []
      };

    //remove custom
    } else if (options.remove && custom[currency] && custom[currency].custom) {
      delete custom[currency];

    } else return;

    store.session.set('userGateways', custom);
    store.set('userGateways', custom);
  };

  var updateIssuer = function (options) {
    var currency = options.currency.toUpperCase();
    var issuer   = options.issuer;

    if (!custom[currency]) return;
    //include or exclude
    if (options.exclude || options.include) {
      if (!custom[currency].issuers[issuer]) return;
      custom[currency].issuers[issuer].include = options.include ? true : false;

    } else if (options.add && !custom[currency].issuers[issuer]) {
      custom[currency].issuers[issuer] = {
        account : issuer,
        name    : options.name || issuer,
        include : true,
        custom  : true
      };

    } else if (options.remove &&
               custom[currency].issuers[issuer] &&
               custom[currency].issuers[issuer].custom) {
      delete custom[currency].issuers[issuer];
    } else return;

    store.session.set('userGateways', custom);
    store.set('userGateways', custom);
  };


  return {
    promise        : promise,
    getCurrencies  : getCurrencies,
    getIssuers     : getIssuers,
    updateCurrency : updateCurrency,
    updateIssuer   : updateIssuer
  }
});
