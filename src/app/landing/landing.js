/* global MultiMarket, ValueSummary */
'use strict'

angular.module('ripplecharts.landing', [
  'ui.state'
])
.filter('trust', ['$sce', function($sce) {
  return function(htmlCode) {
    return $sce.trustAsHtml(htmlCode)
  }
}])
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
        return gateways.promise
      }
    }
  })
})
.controller('LandingCtrl', function LandingCtrl($scope, $state, gateways) {

  var api = new ApiHandler(API)
  var donut = new ValueSummary({
    id: 'metricDetail',
    gateways: gateways
  })

  var exchangeRates = {}
  var refreshInterval

  var valueCurrencies = {
    USD: 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B',  // bitstamp
    EUR: 'rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq', // gatehub
    JPY: 'r94s8px6kSw1uZ1MV98dhSRTvc6VMPoPcN', // tokoyo jpy
    CNY: 'rKiCet8SdvWxPXnAgYarFUXMh1zCPz432Y', // ripplefox
    XRP: ''
  }

  $scope.metrics = {
    totalTradeVolume: {
      label: 'Total XRP Trade Volume <small>(All Exchanges)</small>'
    },
    tradeVolumeRCL: {
      label: 'Ripple Network Trade Volume',
      link: '#/trade-volume'
    },
    paymentVolumeRCL: {
      label: 'Ripple Network Payment Volume'
    },
    capitalizationXRP: {
      label: 'XRP Capitalization'
    },
    numAccounts: {
      label: '# of Ripple Accounts'
    }
  }

  for (var key in $scope.metrics) {
    $scope.metrics[key].key = key
  }

  $scope.currencies = Object.keys(valueCurrencies)
  $scope.selectedCurrency = 'USD'


  $scope.showMetricDetails = function(name) {

    if (name) {
      $scope.selectedMetric = $scope.metrics[name]
    }

    donut.load($scope.selectedMetric, {
      rate: 1 / $scope.valueRate,
      currency: $scope.selectedCurrency
    })
  }

  /**
   * getTotalAccounts
   */

  function getTotalAccounts() {
    api.getTotalAccounts(null, function(err, total) {
      if (err) {
        console.log(err)
      }

      $scope.metrics.numAccounts.total = total
      $scope.$apply()
    })
  }

  /**
   * handleNewAccount
   */

  function handleNewAccount(tx) {
    var meta = tx.meta
    if (meta.TransactionResult !== 'tesSUCCESS') {
      return
    }

    meta.AffectedNodes.forEach(function(affNode) {
      if (affNode.CreatedNode &&
          affNode.CreatedNode.LedgerEntryType === 'AccountRoot') {
        $scope.metrics.numAccounts.total++
        $scope.$apply()
      }
    })
  }

  // get the exchange rate from the API
  function getExchangeRate(c, callback) {
    api.exchangeRate({
      base: {
        currency: 'XRP'
      },
      counter: {
        currency: c.currency,
        issuer: c.issuer
      }
    }, function(err, rate) {
      if (err) {
        callback(err)
        return
      }

      // cache for future reference
      exchangeRates[c.currency + '.' + c.issuer] = Number(rate)
      callback(null, rate)
    })
  }

  // set the value rate for the selected
  // currency, retreiving it from the
  // API if its not cached or
  // if we are updating the cache
  function setValueRate(currency, useCached, callback) {
    var issuer = valueCurrencies[currency]
    $scope.valueRate = undefined
    $scope.valueRatePair = ''

    function apply() {
      $scope.valueRate = exchangeRates[currency + '.' + issuer]
      $scope.valueRate = $scope.valueRate.toPrecision(4)
      $scope.valueRatePair = 'XRP/' + currency
      callback()
    }

    if (currency === 'XRP') {
      $scope.valueRate = 1
      $scope.valueRatePair = ''
      callback()
      return

    // check for cached
    } else if (useCached && exchangeRates[currency + '.' + issuer]) {
      apply()
      return
    }

    getExchangeRate({
      currency: currency,
      issuer: issuer
    }, function(err) {
      if (err) {
        console.log(err)
        callback(err)
        $scope.$apply()
        return
      }

      apply()
      $scope.$apply()
    })
  }

  /**
   * setMetricValue
   */

  function setMetricValue(metric, value) {
    if (value) {
      $scope.metrics[metric].total = value
    }

    if ($scope.metrics[metric].total && $scope.valueRate) {
      $scope.metrics[metric].converted =
        $scope.valueRate * $scope.metrics[metric].total
    }
  }

  /**
   * filterXRPVolume
   */

  function filterXRPVolume(components) {
    var total = 0
    var count = 0

    components.forEach(function(c) {
      if (c.base.currency === 'XRP' ||
         c.counter.currency === 'XRP') {
        total += c.converted_amount
        count += c.count
      }
    })

    return {
      source: 'rcl',
      base_volume: total,
      count: count
    }
  }

  /**
   * getMetricValues
   */

  function getMetricValues() {

    // get payments
    api.getPaymentVolume({}, function(err, resp) {
      var total = 0
      var components

      if (err || !resp || !resp.rows || !resp.rows.length) {
        console.log(err)

      } else {
        components = resp.rows[0].components
        total = resp.rows[0].total
      }

      $scope.metrics.paymentVolumeRCL.components = components
      setMetricValue('paymentVolumeRCL', total)
      if ($scope.selectedMetric === $scope.metrics.paymentVolumeRCL) {
        $scope.showMetricDetails()
      }
      $scope.$apply()
    })

    // get RCL exchanges
    api.getExchangeVolume({}, function(err, resp) {
      var total = 0
      var components
      var xrpVolume

      if (err || !resp || !resp.rows || !resp.rows.length) {
        console.log(err)

      } else {
        components = resp.rows[0].components
        total = resp.rows[0].total
      }

      $scope.metrics.tradeVolumeRCL.components = components
      xrpVolume = filterXRPVolume(components)

      // add RCL XRP volume to total metric
      if ($scope.metrics.totalTradeVolume.components &&
          !$scope.metrics.totalTradeVolume.withRCL) {
        $scope.metrics.totalTradeVolume.components.unshift(xrpVolume)
        setMetricValue('totalTradeVolume',
          $scope.metrics.totalTradeVolume.total + xrpVolume.base_volume)
      }

      setMetricValue('tradeVolumeRCL', total)
      if ($scope.selectedMetric === $scope.metrics.tradeVolumeRCL) {
        $scope.showMetricDetails()
      }
      $scope.$apply()
    })

    // get external exchanges
    api.getExternalMarkets({}, function(err, resp) {
      var total = 0
      var components
      var xrpVolume

      if (err || !resp) {
        console.log(err)

      } else {
        components = resp.data.components
        total = Number(resp.data.total)
      }

      $scope.metrics.totalTradeVolume.withRCL = false
      $scope.metrics.totalTradeVolume.components = components


      // add RCL XRP volume
      if ($scope.metrics.tradeVolumeRCL.components) {
        xrpVolume = filterXRPVolume($scope.metrics.tradeVolumeRCL.components)
        $scope.metrics.totalTradeVolume.components.unshift(xrpVolume)
        total += xrpVolume.base_volume
        $scope.metrics.totalTradeVolume.withRCL = true
      }

      setMetricValue('totalTradeVolume', total)
      if ($scope.selectedMetric === $scope.metrics.totalTradeVolume) {
        $scope.showMetricDetails()
      }
      $scope.$apply()
    })
  }

  $scope.$watch('selectedCurrency', function(d) {
    var name

    switch (d) {
      case 'USD':
        $scope.sign = '$'
        break
      case 'JPY':
        $scope.sign = '¥'
        break
      case 'CNY':
        $scope.sign = '¥'
        break
      case 'EUR':
        $scope.sign = '€'
        break
      case 'XRP':
        $scope.sign = ''
        break
      default:
        $scope.sign = ''
    }

    for (name in $scope.metrics) {
      $scope.metrics[name].converted = undefined
    }

    setValueRate(d, true, function() {
      for (name in $scope.metrics) {
        setMetricValue(name)
      }

      $scope.showMetricDetails()
    })
  })

  // add to new accounts total
  remote.on('transaction_all', handleNewAccount)

  remote.on('connect', function() {
    getTotalAccounts()
  })

  getTotalAccounts()

  // get 'fixed' multimarket charts for
  // the most important markets
  var markets = new MultiMarket({
    url: API,
    id: 'topMarkets',
    fixed: true,
    clickable: true,
    updateInterval: 60,
    gateways: gateways
  })

  markets.list(9)

  markets.on('chartClick', function(chart) {
    $state.transitionTo('markets.pair', {
      base: chart.base.currency +
        (chart.base.issuer ? ':' + chart.base.issuer : ''),
      counter: chart.counter.currency +
      (chart.counter.issuer ? ':' + chart.counter.issuer : ''),
      interval: '5m',
      range: '1d',
      type: store.get('chartType') || 'line'
    })
  })


  // show the helper text the first time we visit the page
  if (!store.get('returning')) {
    setTimeout(function() {
      d3.select('#helpButton_new').node().click()
    }, 100)
  }

  $scope.$watch('totalXRP', function(d) {
    setMetricValue('capitalizationXRP', d)
  })

  // stuff to do when leaving the page
  $scope.$on('$destroy', function() {
    markets.list([])

    if (!store.get('returning') &&
      $scope.showHelp) {
      setTimeout(function() {
        d3.select('#helpButton_new').node().click()
      }, 50)
    }

    store.set('returning', true)
    clearInterval(refreshInterval)
  })

  // reload data when coming back online
  $scope.$watch('online', function(online) {
    if (online) {
      markets.reload()
    }
  })

  // get value metrics at load time and every 5 minutes
  getMetricValues()
  refreshInterval = setInterval(getMetricValues, 60 * 5 * 1000)
  $scope.showMetricDetails('totalTradeVolume')
})

