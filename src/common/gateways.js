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

    //add or update gateways based
    //on data from api
    for (currency in defaultGateways) {

      //unknown currency,
      //add it as a default
      if (!custom[currency]) {
        custom[currency] = {
          custom  : false,
          issuers : { }
        };

      //must be a default
      //currency
      } else {
        custom[currency].custom = false;
      }

      //update gateways with the new data
      for (var i in defaultGateways[currency]) {
        gateway = defaultGateways[currency][i];

        //if its already here,
        //use the current include
        if (custom[currency].issuers[gateway.account]) {
          gateway.include = custom[currency].issuers[gateway.account].include;

        //otherwise, include it if featured
        } else {
          gateway.include = defaultGateways[currency][i].featured;
        }

        normalized     = gateway.name.toLowerCase().replace(/\W/g, '');
        gateway.irba   = gateway.assets.length ? true : false;
        gateway.assets = handleAssets(gateway.assets, normalized);

        if (gateway.name === 'Ripple Exchange Tokyo') {
          gateway.name = "Ripple Exch Tokyo";
        }

        custom[currency].issuers[gateway.account] = gateway;
      }
    }


    function sortIssuers (data) {
      var issuers = Object.keys(data.issuers)
        .map(function (issuer) {
          return data.issuers[issuer]
        });

      // sort by IRBA, featured
      issuers.sort(function (a, b) {
        var first  = (a.irba ? '0' : '1') + (a.featured ? '0' : '1') + a.name;
        var second = (b.irba ? '0' : '1') + (b.featured ? '0' : '1') + b.name;
        return (first >= second ? 1 : -1);
      });

      data.issuers = {};
      issuers.forEach(function(issuer) {
        data.issuers[issuer.account] = issuer;
      });
    }

    for (currency in custom) {
      sortIssuers(custom[currency]);


      // ensure that non-default
      // currencies are marked as custom
      if (!defaultGateways[currency]) {
        custom[currency].custom = true;
      }
    }

    // save
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

  var getCurrencies = function (all) {

    var currencies = [];
    var include;

    //add currencies from custom list
    for (var currency in custom) {
      if (currency === '0158415500000000C1F76FF6ECB0BAC600000000') {
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
      else if (all) currencies.push({
        currency : currency,
        icon     : API + '/currencies/'+ currency +'.svg',
        include  : false,
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

    issuers.sort(function(a,b) {
      if (a.featured && b.featured) return 0;
      else if (a.featured) return -1;
      else if (b.featured) return 1;
      else return 0;
    });

    return issuers;
  };

  /**
   * updateCurrency
   * add/remove/include/exclude
   */

  var updateCurrency = function (options) {
    var currency = options.currency.toUpperCase();
    var featured;
    var issuer;

    //include currency, include featured
    //if there are any, otherwise include all
    if (options.include && custom[currency]) {
      featured = hasFeatured(custom[currency].issuers);

      for (issuer in custom[currency].issuers) {
        if (featured && !custom[currency].issuers[issuer].featured) {
          continue;
        }

        custom[currency].issuers[issuer].include = true;
      }

    //exclude currency, exclude all issuers
    } else if (options.exclude && custom[currency]) {
      for (issuer in custom[currency].issuers) {
        custom[currency].issuers[issuer].include = false;
      }

    //add custom
    } else if (options.add && !custom[currency]) {
      custom[currency] = {
        custom  : true,
        issuers : { }
      };

    //remove custom
    } else if (options.remove && custom[currency] && custom[currency].custom) {
      delete custom[currency];

    } else return;

    //save
    store.session.set('userGateways', custom);
    store.set('userGateways', custom);

    //check for featured gateway
    function hasFeatured(issuers) {
      for (var i in issuers) {
        if (issuers[i].featured) return true;
      }

      return false;
    }
  };

  /**
   * updateIssuer
   * add/remove/include/exclude
   */

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

    //save
    store.session.set('userGateways', custom);
    store.set('userGateways', custom);
  };

  var getName = function(currency, issuer) {
    if (currency !== 'XRP' &&
        custom[currency] &&
        custom[currency].issuers &&
        custom[currency].issuers[issuer]) {
      return custom[currency].issuers[issuer].name || '';
    } else {
      return '';
    }
  };

  return {
    promise        : promise,
    getCurrencies  : getCurrencies,
    getIssuers     : getIssuers,
    updateCurrency : updateCurrency,
    updateIssuer   : updateIssuer,
    getName        : getName
  }
});
