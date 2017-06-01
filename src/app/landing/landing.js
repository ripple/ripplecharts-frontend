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
  var rateInterval

  var valueCurrencies = {
    USD: 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B',  // bitstamp
    EUR: 'rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq', // gatehub
    JPY: 'r94s8px6kSw1uZ1MV98dhSRTvc6VMPoPcN', // tokoyo jpy
    CNY: 'rKiCet8SdvWxPXnAgYarFUXMh1zCPz432Y', // ripplefox
    XRP: ''
  }

  $scope.metrics = {
    totalTradeVolume: {
      label: 'Total XRP Trade Volume <small>(All Exchanges)</small>',
      link: '#/xrp-markets'
    },
    tradeVolumeRCL: {
      label: 'XRP Ledger Trade Volume <small>(All Pairs)<small>',
      link: '#/trade-volume'
    },
    paymentVolumeRCL: {
      label: 'XRP Ledger Payment Volume'
    },
    capitalizationXRP: {
      label: 'Market Capitalization',
      live: true
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

    if ($scope.valueRate) {
      donut.load($scope.selectedMetric, {
        rate: 1 / $scope.valueRate.period,
        currency: $scope.selectedCurrency
      })
    }
  }


  /**
   * getExchangeRates
   */

  function getExchangeRates(c, callback) {
    function getRate(live) {
      return new Promise(function(resolve, reject) {
        api.exchangeRate({
          base: {
            currency: 'XRP'
          },
          counter: {
            currency: c.currency,
            issuer: c.issuer
          },
          period: live ? '' : 'day',
          live: live
        },
        function(err, rate) {
          if (err) {
            reject(err)
          } else {
            resolve(rate)
          }
        })
      })
    }

    Promise.all([
      getRate(true),
      getRate()
    ])
    .then(function(rates) {
      exchangeRates[c.currency + '.' + c.issuer] = {
        live: rates[0],
        period: rates[1]
      }

      callback(null, exchangeRates[c.currency + '.' + c.issuer])
    })
    .catch(callback)
  }

  /**
   * setValueRates
   */

  // set the value rate for the selected
  // currency, retreiving it from the
  // API if its not cached or
  // if we are updating the cache
  function setValueRates(currency, useCached, callback) {
    var issuer = valueCurrencies[currency]
    $scope.valueRate = undefined
    $scope.valueRatePair = ''

    function apply() {
      $scope.valueRate = exchangeRates[currency + '.' + issuer]
      $scope.valueRatePair = 'XRP/' + currency
      callback()
    }

    if (currency === 'XRP') {
      $scope.valueRate = {
        live: 1,
        period: 1
      }

      $scope.valueRatePair = ''
      callback()
      return

    // check for cached
    } else if (useCached && exchangeRates[currency + '.' + issuer]) {
      apply()
      return
    }

    getExchangeRates({
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

    if (!$scope.valueRate) {
      return
    }

    var rate = $scope.metrics[metric].live ?
      $scope.valueRate.live : $scope.valueRate.period

    if ($scope.metrics[metric].total && rate) {
      $scope.metrics[metric].converted =
        rate * $scope.metrics[metric].total
    }
  }

  /**
   * refreshRate
   */

  function refreshRate(useCached) {
    setValueRates($scope.selectedCurrency, useCached, function() {
      for (var k in $scope.metrics) {
        setMetricValue(k)
      }

      $scope.showMetricDetails()
    })
  }

  /**
   * getTotalAccounts
   */

  /*
  NOTE: currently unused
  function getTotalAccounts() {
    api.getTotalAccounts(null, function(err, total) {
      if (err) {
        console.log(err)
      }

      $scope.metrics.numAccounts.total = total
      $scope.$apply()
    })
  }
  */

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

        // sort by volume
        $scope.metrics.totalTradeVolume.components.sort(function(a, b) {
          return b.base_volume - a.base_volume
        })
      }

      setMetricValue('tradeVolumeRCL', total)
      if ($scope.selectedMetric !== $scope.metrics.paymentVolumeRCL) {
        $scope.showMetricDetails()
      }
      $scope.$apply()
    })

    // get external exchanges
    api.getExternalMarkets({}, function(err, resp) {
      var total = 0
      var components = {}
      var xrpVolume

      if (err || !resp) {
        console.log(err)
        return
      }

      resp.components.forEach(function(c) {
        var amount = Number(c.base_volume)

        if (!amount) {
          return
        }

        if (!components[c.source]) {
          components[c.source] = {
            source: c.source,
            base_volume: 0,
            count: 0,
            components: []
          }
        }

        components[c.source].base_volume += amount
        components[c.source].count += c.count || 0

        components[c.source].components.push({
          key: 'XRP/' + c.counter_currency,
          value: amount,
          amount: amount,
          counter_currency: c.counter_currency,
          count: c.count
        })
      })

      $scope.metrics.totalTradeVolume.withRCL = false
      $scope.metrics.totalTradeVolume.components = []
      Object.keys(components).map(function(c) {
        $scope.metrics.totalTradeVolume.components.push(components[c])
        total += components[c].base_volume
      })

      // add RCL XRP volume
      if ($scope.metrics.tradeVolumeRCL.components) {
        xrpVolume = filterXRPVolume($scope.metrics.tradeVolumeRCL.components)
        $scope.metrics.totalTradeVolume.components.unshift(xrpVolume)
        total += xrpVolume.base_volume
        $scope.metrics.totalTradeVolume.withRCL = true
      }

      // sort by volume
      $scope.metrics.totalTradeVolume.components.sort(function(a, b) {
        return b.base_volume - a.base_volume
      })

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

    refreshRate(true)
  })

  // add to new accounts total
  remote.on('transaction_all', handleNewAccount)

  remote.on('connect', function() {
    // getTotalAccounts()
  })

  // getTotalAccounts()

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

  $scope.$watch('totalXRP', function(d) {
    setMetricValue('capitalizationXRP', d)
  })

  // stuff to do when leaving the page
  $scope.$on('$destroy', function() {
    markets.list([])

    clearInterval(refreshInterval)
    clearInterval(rateInterval)
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
  rateInterval = setInterval(refreshRate, 15 * 1000)
  $scope.showMetricDetails('totalTradeVolume')
})

