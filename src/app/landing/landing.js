/* global MultiMarket, ValueSummary */
'use strict';

angular.module('ripplecharts.landing', [
  'ui.state'
])
.config(function config($stateProvider) {
  $stateProvider.state('landing', {
    url: '/',
    views: {
      'main': {
        controller: 'LandingCtrl',
        templateUrl: 'landing/landing.tpl.html'
      }
    },
    data: {},
    resolve: {
      gateInit: function(gateways) {
        return gateways.promise;
      }
    }
  });
})
.controller('LandingCtrl', function LandingCtrl($scope, $state, gateways) {

  var api = new ApiHandler(API);
  var donut = new ValueSummary({
    id: 'metricDetail',
    gateways: gateways
  });

  var exchangeRates = {};
  var valueCurrencies = {
    USD: 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B',  // bitstamp
    EUR: 'rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq', // gatehub
    JPY: 'r94s8px6kSw1uZ1MV98dhSRTvc6VMPoPcN', // tokoyo jpy
    CNY: 'rKiCet8SdvWxPXnAgYarFUXMh1zCPz432Y', // ripplefox
    XRP: ''
  };

  var totalAccounts;
  var paymentVolumeXRP;
  var tradeVolumeXRP;
  var valueInterval;

  var formatNumber = d3.format(',g');

  // present amount in human readable format
  function commas(d, precision) {
    return formatNumber(Number(d.toFixed(precision || 0)));
  }


  // get num accounts
  function getTotalAccounts() {
    api.getTotalAccounts(null, function(err, total) {
      if (err) {
        console.log(err);
      }

      if (total) {
        totalAccounts = total; // save for new account updates;
      }

      $scope.totalAccounts = total ? commas(total) : ' ';
      $scope.$apply();
    });
  }

  // look for new accounts from the websocket feed
  function handleNewAccount(tx) {
    var meta = tx.meta;
    if (meta.TransactionResult !== 'tesSUCCESS') {
      return;
    }

    meta.AffectedNodes.forEach(function(affNode) {
      if (affNode.CreatedNode &&
          affNode.CreatedNode.LedgerEntryType === 'AccountRoot') {
        $scope.totalAccounts = totalAccounts ? commas(++totalAccounts) : ' ';
        $scope.$apply();
      }
    });
  }

  // display the selected metric on the page, if its ready
  function showValue(metric) {
    var ex = {
      rate: $scope.valueRate,
      currency: $scope.valueCurrency
    };
    var sign;
    var value;
    var precision;

    if (typeof $scope.valueRate === 'undefined') {
      return;
    }

    if (metric === 'paymentVolume') {
      if (typeof paymentVolumeXRP === 'undefined') {
        return;
      }

      if (metric === $scope.metricDetail) {
        donut.load(paymentVolumeXRP, ex);
      }

      value = paymentVolumeXRP.total / $scope.valueRate;
      precision = 2;

    } else if (metric === 'tradeVolume') {
      if (typeof tradeVolumeXRP === 'undefined') {
        return;
      }

      if (metric === $scope.metricDetail) {
        donut.load(tradeVolumeXRP, ex);
      }

      value = tradeVolumeXRP.total / $scope.valueRate;
      precision = 2;

    } else if (metric === 'xrpCapitalization') {
      if (!$scope.totalXRP) {
        return;
      }

      value = $scope.totalXRP / $scope.valueRate;
      precision = 0;
    }

    switch ($scope.valueCurrency) {
      case 'USD': sign = '$'; break;
      case 'JPY': sign = '¥'; break;
      case 'CNY': sign = '¥'; break;
      case 'EUR': sign = '€'; break;
      case 'XRP': sign = ''; break;
      default: sign = '';
    }

    $scope[metric] = value ? sign + commas(value, precision) : ' ';
    $scope.$apply();
  }

  // get the exchange rate from the API
  function getExchangeRate(c, callback) {
    api.exchangeRate({
      base: {
        currency: c.currency,
        issuer: c.issuer
      },
      counter: {
        currency: 'XRP'
      }
    }, function(err, rate) {
      if (err) {
        callback(err);
        return;
      }

      // cache for future reference
      exchangeRates[c.currency + '.' + c.issuer] = rate;

      callback(null, rate);
    });
  }

  // set the value rate for the selected
  // currency, retreiving it from the
  // API if its not cached or
  // if we are updating the cache
  function setValueRate(currency, useCached, callback) {
    var issuer = valueCurrencies[currency];

    if (currency === 'XRP') {
      $scope.valueRate = 1;
      $scope.valueRateDisplay = '';
      callback();
      return;
    }

    // check for cached
    if (useCached && exchangeRates[currency + '.' + issuer]) {
      $scope.valueRate = exchangeRates[currency + '.' + issuer];
      $scope.valueRateDisplay = commas(1 / $scope.valueRate, 4) +
        ' XRP/' + currency;
      callback();
      return;
    }


    getExchangeRate({
      currency: currency,
      issuer: issuer
    }, function(err) {
      if (err) {
        console.log(err);
        $scope.valueRate = 0;
        callback(err);
        return;
      }

      $scope.valueRate = exchangeRates[currency + '.' + issuer] || 0;
      if ($scope.valueRate) {
        $scope.valueRateDisplay = commas(1 / $scope.valueRate, 4) +
          ' XRP/' + currency;
      }
      callback();
    });
  }

  // get values for the various metrics
  function getValues() {

    setValueRate($scope.valueCurrency, false, function() {
      showValue('paymentVolume');
      showValue('tradeVolume');
      showValue('xrpCapitalization');
    });

    api.getPaymentVolume({}, function(err, resp) {
      var data;
      if (err || !resp || !resp.rows) {
        console.log(err);
        data = {total: 0};

      } else {
        data = resp.rows[0];
      }

      paymentVolumeXRP = data;
      showValue('paymentVolume');
    });

    api.getExchangeVolume({}, function(err, resp) {
      var data;
      if (err || !resp || !resp.rows) {
        console.log(err);
        data = {total: 0};
      } else {
        data = resp.rows[0];
      }

      tradeVolumeXRP = data;
      showValue('tradeVolume');
    });
  }

  $scope.valueCurrency = 'USD';
  $scope.metricDetail = 'tradeVolume';
  $scope.metricDetailTitle = 'Trade Volume (last 24 hours)';

  // dropdown to change currency for metrics
  var valueSelect = d3.select('#valueCurrency')
    .on('change', function() {
      var currency = this.value;
      setValueRate(currency, true, function() {
        $scope.valueCurrency = currency;
        showValue('paymentVolume');
        showValue('tradeVolume');
        showValue('xrpCapitalization');
      });
    });

  valueSelect.selectAll('option')
  .data(d3.keys(valueCurrencies))
  .enter().append('option')
  .html(function(d) {
    return d;
  })
  .attr('selected', function(d) {
    return d === $scope.valueCurrency.currency;
  });

  // add to new accounts total
  remote.on('transaction_all', handleNewAccount);

  remote.on('connect', function() {
    getTotalAccounts();
  });

  getTotalAccounts();

  // get 'fixed' multimarket charts for
  // the most important markets
  var markets = new MultiMarket({
    url: API,
    id: 'topMarkets',
    fixed: true,
    clickable: true,
    updateInterval: 60,
    gateways: gateways
  });

  markets.list(9);

  markets.on('chartClick', function(chart) {
    $state.transitionTo('markets.pair', {
      base: chart.base.currency +
        (chart.base.issuer ? ':' + chart.base.issuer : ''),
      counter: chart.counter.currency +
      (chart.counter.issuer ? ':' + chart.counter.issuer : ''),
      interval: '5m',
      range: '1d',
      type: store.get('chartType') || 'line'
    });
  });


  // show the helper text the first time we visit the page
  if (!store.get('returning')) {
    setTimeout(function() {
      d3.select('#helpButton_new').node().click();
    }, 100);
  }

  $scope.$watch('totalCoins', function() {
    setTimeout(function() {
      showValue('xrpCapitalization');
    });
  });

  $scope.$watch('metricDetail', function() {

    var ex = {
      rate: $scope.valueRate,
      currency: $scope.valueCurrency
    };

    if ($scope.metricDetail === 'paymentVolume') {
      $scope.metricDetailTitle = 'Payment Volume (last 24 hours)';
      donut.load(paymentVolumeXRP, ex);

    } else if ($scope.metricDetail === 'tradeVolume') {
      $scope.metricDetailTitle = 'Trade Volume (last 24 hours)';
      donut.load(tradeVolumeXRP, ex);
    }
  });

  // stuff to do when leaving the page
  $scope.$on('$destroy', function() {
    markets.list([]);

    if (!store.get('returning') &&
      $scope.showHelp) {
      setTimeout(function() {
        d3.select('#helpButton_new').node().click();
      }, 50);
    }

    store.set('returning', true);
    clearInterval(valueInterval);
  });

  // reload data when coming back online
  $scope.$watch('online', function(online) {
    if (online) {
      markets.reload();
    }
  });

  // get value metrics at load time and every 5 minutes
  getValues();
  valueInterval = setInterval(getValues, 300000);
});

