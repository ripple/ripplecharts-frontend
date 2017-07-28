'use strict'

angular.module('ripplecharts.xrp-markets', [
  'ui.state',
  'ui.bootstrap'
])

.config(function($stateProvider) {
  $stateProvider.state('xrp-markets', {
    url: '/xrp-markets',
    views: {
      main: {
        controller: 'XrpMarketsCtrl',
        templateUrl: 'xrp-markets/xrp-markets.tpl.html'
      }
    },
    data: {
      pageTitle: 'XRP Markets'
    },
    resolve: {
      gateInit: function(gateways) {
        return gateways.promise
      }
    }
  })
})
.controller('XrpMarketsCtrl', function($scope, gateways) {
  var api = new ApiHandler(API)
  var exchangeRates = {}
  var refreshInterval
  var markets = {}

  var scale = d3.scale.log()
    .range([.5, 1]).clamp(true)

  var valueCurrencies = {
    USD: 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B',  // bitstamp
    EUR: 'rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq', // gatehub
    JPY: 'r94s8px6kSw1uZ1MV98dhSRTvc6VMPoPcN', // tokoyo jpy
    CNY: 'rKiCet8SdvWxPXnAgYarFUXMh1zCPz432Y', // ripplefox
    XRP: ''
  }

  /**
   * getExchangeRate
   */

  function getExchangeRate(c, callback) {
    api.exchangeRate({
      base: {
        currency: 'XRP'
      },
      counter: {
        currency: c.currency,
        issuer: c.issuer
      },
      period: c.period
    }, function(err, rate) {
      if (err) {
        callback(err)
        return
      }

      var key = c.currency + '.' + c.issuer

      if (!exchangeRates[key]) {
        exchangeRates[key] = {}
      }

      // cache for future reference
      exchangeRates[key][c.period] = Number(rate)
      callback(null, exchangeRates[key][c.period])
    })
  }


  /**
   * setValueRate
   */

  function setValueRate(currency, callback) {
    var issuer = valueCurrencies[currency]
    var key = currency + '.' + issuer
    function apply() {
      if (exchangeRates[key] &&
          exchangeRates[key][$scope.selectedPeriod]) {
        $scope.valueRate = exchangeRates[key][$scope.selectedPeriod]
        $scope.valueRate = $scope.valueRate.toPrecision(4)
      }
      callback()
    }

    if (currency === 'XRP') {
      $scope.valueRate = 1
      callback()
      return

    // check for cached
    } else if (exchangeRates[key] &&
               exchangeRates[key][$scope.selectedPeriod]) {
      apply()
      return
    }

    $scope.total = undefined
    $scope.markets.forEach(function(m) {
      m.total_converted = undefined
    })

    getExchangeRate({
      currency: currency,
      issuer: issuer,
      period: $scope.selectedPeriod
    }, function(err) {

      if (err) {
        console.log(err)
        callback(err)
        return
      }

      apply()
      $scope.$apply()
    })
  }

  /**
   * updateTotals
   */

  function updateTotals(apply) {
    var key

    $scope.totalXRP = 0

    for (key in markets) {
      markets[key].total_converted =
        markets[key].total * $scope.valueRate
      $scope.totalXRP += markets[key].total
    }

    $scope.markets = []

    for (key in markets) {
      markets[key].key = key
      markets[key].pct =
        markets[key].total / $scope.totalXRP * 100
      $scope.markets.push(markets[key])
    }

    scale.domain(d3.extent($scope.markets, function(m) {
      return m.pct
    }))

    $scope.markets.forEach(function(m) {
      m.scale = scale(m.pct)
    })

    $scope.markets.sort(function(a, b) {
      return b.pct - a.pct
    })

    $scope.total = $scope.totalXRP * $scope.valueRate
    if (apply) {
      $scope.$apply()
    }
  }

  /**
   * getVolumes
   */

  function getVolumes() {

    api.getExchangeVolume({
      period: $scope.selectedPeriod
    }, function(err, resp) {
      var total = 0
      var count = 0
      var components = []

      if (err || !resp || !resp.rows || !resp.rows.length) {
        console.log(err)

      } else {
        resp.rows[0].components.forEach(function(component) {
          if (component.base.currency === 'XRP' ||
              component.counter.currency === 'XRP') {
            var c = component.base.currency === 'XRP' ?
                component.counter : component.base
            var sub = gateways.getName(c.issuer, c.currency)
                || c.issuer

            total += component.converted_amount
            count += component.count
            components.push({
              key: 'XRP/' + c.currency,
              value: component.converted_amount,
              amount: component.converted_amount,
              sub: sub,
              counter_currency: c.currency,
              count: component.count
            })
          }
        })

        markets['XRP Ledger'] = {
          total: total,
          count: count,
          components: components
        }

        updateTotals(true)
      }
    })

    // get external exchanges
    api.getExternalMarkets({
      period: $scope.selectedPeriod
    }, function(err, resp) {
      var list = {}

      if (err || !resp) {
        console.log(err)

      } else {

        // remove existing markets except RCL
        markets = {
          'XRP Ledger': markets['XRP Ledger']
        }

        resp.components.forEach(function(c) {
          var amount = Number(c.base_volume)
          var key = capitalize(c.source)

          if (amount) {

            if (!markets[key]) {
              markets[key] = {
                total: 0,
                count: 0,
                components: []
              }
            }

            markets[key].total += amount
            markets[key].count += c.count || 0

            markets[key].components.push({
              key: 'XRP/' + c.counter_currency,
              value: amount,
              amount: amount,
              counter_currency: c.counter_currency,
              count: c.count
            })
          }
        })

        updateTotals(true)
      }
    })
  }

  /**
   * Capitalize
   */

  function capitalize(d) {
    return d.charAt(0).toUpperCase() + d.slice(1);
  }

  $scope.marketNames = {
    rcl: 'XRP Ledger'
  }

  $scope.currencies = Object.keys(valueCurrencies)
  $scope.markets = []

  $scope.periods = [
    {name: '1 hour', period: 'hour'},
    {name: '24 hours', period: 'day'},
    {name: '3 days', period: '3day'},
    {name: '7 days', period: '7day'},
    {name: '30 days', period: '30day'}
  ]

  $scope.selectedPeriod = 'day'
  $scope.selectedCurrency = 'USD'

  $scope.changePeriod = function(period) {
    $scope.selectedPeriod = period
    setValueRate($scope.selectedCurrency, function() {
      getVolumes()
    })
  }

  $scope.$on('$destroy', function() {
    clearInterval(refreshInterval)
  })

  $scope.$watch('selectedCurrency', function(d) {
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

    setValueRate(d, updateTotals)
  })

  getVolumes()
  refreshInterval = setInterval(getVolumes, 10 * 60 * 1000)
})

