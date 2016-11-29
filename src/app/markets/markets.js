'use strict'

function MarketsCtrl($scope, $state, $location, gateways) {

  /**
   * getStartDate
   */

  function getStartDate() {
    var gatewayList
    var minDate = new Date()
    var candidate
    var changed = false
    var base = $scope.base
    var counter = $scope.counter

    if (base.issuer) {
      gatewayList = gateways.getIssuers(base.currency)
      gatewayList.forEach(function(gateway) {
        if (base.issuer === gateway.account && gateway.start_date) {
          candidate = new Date(gateway.start_date)
          if (candidate < minDate) {
            minDate = candidate
            changed = true
          }
        }
      })
    }

    if (counter.issuer) {
      gatewayList = gateways.getIssuers(counter.currency)
      gatewayList.forEach(function(gateway) {
        if (counter.issuer === gateway.account && gateway.start_date) {
          candidate = new Date(gateway.start_date)
          if (candidate < minDate) {
            minDate = candidate
            changed = true
          }
        }
      })
    }

    return changed ? minDate : new Date('2013-1-1')
  }

  var intervalList = [
    {name: '5m', interval: 'minute', multiple: 5},
    {name: '15m', interval: 'minute', multiple: 15},
    {name: '30m', interval: 'minute', multiple: 30},
    {name: '1h', interval: 'hour', multiple: 1},
    {name: '2h', interval: 'hour', multiple: 2},
    {name: '4h', interval: 'hour', multiple: 4},
    {name: '1d', interval: 'day', multiple: 1},
    {name: '3d', interval: 'day', multiple: 3},
    {name: '7d', interval: 'day', multiple: 7},
    {name: '1M', interval: 'month', multiple: 1}
  ]

  var rangeList = [
    {
      name: '12h',
      interval: '5m',
      offset: function(d) {
        return d3.time.hour.offset(d, -12)
      }
    },
    {
      name: '1d',
      interval: '15m',
      offset: function(d) {
        return d3.time.day.offset(d, -1)
      }
    },
    {
      name: '3d',
      interval: '30m',
      offset: function(d) {
        return d3.time.day.offset(d, -3)
      }
    },
    {
      name: '1w',
      interval: '1h',
      offset: function(d) {
        return d3.time.day.offset(d, -7)
      }
    },
    {
      name: '2w',
      interval: '2h',
      offset: function(d) {
        return d3.time.day.offset(d, -14)
      }
    },
    {
      name: '1m',
      interval: '4h',
      offset: function(d) {
        return d3.time.month.offset(d, -1)
      }
    },
    {
      name: '3m',
      interval: '1d',
      offset: function(d) {
        return d3.time.month.offset(d, -3)
      }
    },
    {
      name: '6m',
      interval: '1d',
      offset: function(d) {
        return d3.time.month.offset(d, -6)
      }
    },
    {
      name: '1y',
      interval: '3d',
      offset: function(d) {
        return d3.time.year.offset(d, -1)
      }
    },
    {
      name: 'max',
      interval: '3d',
      offset: getStartDate
    },
    {
      name: 'custom',
      offset: getStartDate
    }
  ]

  var dateFormat = 'YYYY-MM-DD'
  var updateMode = ''
  var dropdownA
  var dropdownB
  var toCSV

  // set up the price chart
  var priceChart = new PriceChart({
    id: 'priceChart',
    url: API,
    type: $scope.chartType,
    live: true,
    resize: true
  })

  var book = new OrderBook({
    chartID: 'bookChart',
    tableID: 'bookTables',
    remote: remote,
    resize: true,
    emit: function(type, data) {
      if (type === 'spread') {
        document.title = data.bid + '/' +
          data.ask + ' ' +
          $scope.base.currency + '/' +
          $scope.counter.currency
      }
    }
  })

  // set up trades feed
  var tradeFeed = new TradeFeed({
    id: 'tradeFeed',
    url: API
  })

  /**
   * updateScopeAndStore
   */

  function updateScopeAndStore(key, value, ignore) {
    if (value === undefined) {
      delete $scope[key]
      store.remove(key)
      store.session.remove(key)

    } else {
      $scope[key] = value
      store.set(key, value)
      store.session.set(key, value)
    }

    if (!ignore && !$scope.$$phase) {
      $scope.$apply()
    }
  }

  /**
   * getInterval
   */

  function getInterval(name) {
    for (var i = 0; i < intervalList.length; i++) {
      if (intervalList[i].name === (name || $scope.interval)) {
        return intervalList[i]
      }
    }

    return undefined
  }

  /**
   * getRange
   */

  function getRange(name) {
    for (var i = 0; i < rangeList.length; i++) {
      if (rangeList[i].name === (name || $scope.range)) {
        return rangeList[i]
      }
    }

    return undefined
  }

  /**
   * handleTransition
   * refresh url with updated params
   */

  function handleTransition(mode) {
    updateMode = mode

    if ($scope.base && $scope.counter) {
      $state.transitionTo('markets.pair', {
        base: $scope.base.currency +
          ($scope.base.issuer ? ':' + $scope.base.issuer : ''),
        counter: $scope.counter.currency +
          ($scope.counter.issuer ? ':' + $scope.counter.issuer : ''),
        interval: $scope.interval,
        range: $scope.range,
        type: $scope.chartType,
        start: $scope.range === 'custom' ? $scope.start : undefined,
        end: $scope.range === 'custom' ? $scope.end : undefined
      })

    } else {
      $state.transitionTo('markets')
    }
  }

  /**
   * loadDropdowns
   */

  function loadDropdowns() {
    dropdownA = ripple.currencyDropdown(gateways)
    .selected($scope.base)
    .on('change', function(d) {
      updateScopeAndStore('base', d)
    })

    dropdownB = ripple.currencyDropdown(gateways)
    .selected($scope.counter)
    .on('change', function(d) {
      updateScopeAndStore('counter', d)
    })

    d3.select('#base').call(dropdownA)
    d3.select('#counter').call(dropdownB)
  }

  /**
   * utcDate
   */

  function utcDate(str, offset) {
    var date = moment.utc(str || undefined, dateFormat)
    var d

    if (offset) {
      date.add(offset, 'day')
    }

    d = new Date(date)
    d.setMinutes(d.getMinutes() + d.getTimezoneOffset())
    return d
  }

  /**
   * isDisabledInterval
   */

  function isDisabledInterval(i, r) {
    var start
    var end
    var diff
    var num

    var interval = i || getInterval()
    var range = r && typeof r === 'object' ? r : getRange()

    if (range.name === 'custom') {
      start = moment.utc($scope.start)
      end = moment.utc($scope.end)
    } else {
      end = moment.utc()
      start = range.offset(end)
    }

    diff = Math.abs(moment.utc(start).diff(end)) / 1000

    switch (interval.name) {
      case '5m':
        num = diff / (300)
        break
      case '15m':
        num = diff / (900)
        break
      case '30m':
        num = diff / (1800)
        break
      case '1h':
        num = diff / (3600)
        break
      case '2h':
        num = diff / (7200)
        break
      case '4h':
        num = diff / (14400)
        break
      case '1d':
        num = diff / (86400)
        break
      case '3d':
        num = diff / (259200)
        break
      case '7d':
        num = diff / (604800)
        break
      case '1M':
        num = diff >= 31500000 ? 100 : 0
        break
      default:
        return true
    }

    return num <= 25 || num >= 366
  }

  /**
   * getCustomInterval
   */

  function getCustomInterval() {
    var diff = moment.utc($scope.end)
    .diff(moment.utc($scope.start), 'minutes') / 144
    var interval

    if (diff < 5) {
      interval = '5m'
    } else if (diff < 15) {
      interval = '15m'
    } else if (diff < 30) {
      interval = '30m'
    } else if (diff < 60) {
      interval = '1h'
    } else if (diff < 60 * 2) {
      interval = '2h'
    } else if (diff < 60 * 4) {
      interval = '4h'
    } else if (diff < 60 * 24) {
      interval = '1d'
    } else if (diff < 60 * 24 * 3) {
      interval = '3d'
    } else if (diff < 60 * 24 * 7) {
      interval = '7d'
    } else {
      interval = '1M'
    }

    return interval
  }

  /**
   * updateMaxRange
   */

  function updateMaxRange() {
    var start = getStartDate()
    var end

    $('#start').datepicker('option', 'minDate', utcDate(start.toISOString()))
    $('#start').datepicker('option', 'maxDate', utcDate($('#end').val(), -1))
    $('#end').datepicker('option', 'minDate', utcDate($('#start').val(), 1))
    $('#end').datepicker('option', 'maxDate', utcDate(undefined, 1))

    // start or end may now differ
    // and therefore need updating
    if ($scope.end) {
      end = moment.utc($('#end').val()).format(dateFormat)
      updateScopeAndStore('end', end)
    }

    if ($scope.start) {
      start = moment.utc($('#start').val()).format(dateFormat)
      updateScopeAndStore('start', start)
    }
  }

  /**
   * updateChart
   * update chart options
   */

  function updateChart() {
    var interval = getInterval()
    var range = getRange()

    var options = {
      interval: interval.interval,
      multiple: interval.multiple,
      offset: range.offset
    }

    if ($scope.range === 'custom') {
      options.live = false
      options.start = $scope.start
      options.end = $scope.end

    } else {
      options.live = true
    }

    priceChart.load($scope.base, $scope.counter, options)
    priceChart.setType($scope.chartType)
  }

  /**
   * loadPair
   * load/change currency pair
   */

  function loadPair() {
    updateChart()
    book.getMarket($scope.base, $scope.counter)
    tradeFeed.loadPair($scope.base, $scope.counter)
  }

  /**
   * downloadCSV
   */

  function downloadCSV() {
    if (toCSV.attr('disabled')) {
      return
    }

    var interval = getInterval()
    var range = getRange()

    var csvURL = API + '/exchanges/' + $scope.base.currency +
        ($scope.base.issuer ? '+' + $scope.base.issuer : '') +
        '/' + $scope.counter.currency +
        ($scope.counter.issuer ? '+' + $scope.counter.issuer : '') +
        '?limit=1000&format=csv' +
        '&interval=' + interval.multiple + interval.interval

    if (range.name === 'custom') {
      csvURL += '&start=' + $scope.start
      csvURL += '&end=' + $scope.end
    } else {
      csvURL += '&start=' + moment.utc().format()
      csvURL += '&end=' + moment.utc(range.offset(moment())).format()
    }

    d3.select(this).attr('href', csvURL)
  }

  toCSV = d3.select('#toCSV')
  .on('click', downloadCSV)

  // set up flip button
  d3.select('#flip').on('click', function() {
    var swap = $scope.counter
    updateScopeAndStore('counter', $scope.base, true)
    updateScopeAndStore('base', swap)
    loadDropdowns()
  })

  // set up the range selector
  var ranges = d3.select('#range').selectAll('span')
  .data(rangeList)
  .enter().append('span')
  .text(function(d) {
    return d.name
  })
  .on('click', function(d) {
    var start
    var end

    ranges.classed('selected', function(s) {
      return d === s
    })

    if (d.name === 'custom') {
      $('#start').show()
      $('#end').show()
      start = moment.utc($('#start').val()).format(dateFormat)
      end = moment.utc($('#end').val()).format(dateFormat)
      updateScopeAndStore('start', start, true)
      updateScopeAndStore('end', end, true)
      updateScopeAndStore('interval', getCustomInterval(), true)

    } else {
      $('#start').hide()
      $('#end').hide()
      if (isDisabledInterval(null, null, d)) {
        updateScopeAndStore('interval', d.interval, true)
      }
    }

    updateScopeAndStore('range', d.name)
  })

  // add custom date range
  var dates = d3.select('#range')
  .append('div')
  .attr('id', 'dates')

  dates.append('input')
  .attr('type', 'text')
  .attr('id', 'start')
  .attr('class', 'datepicker')
  .property('maxLength', 10)
  .style('display', 'none')

  dates.append('input')
  .attr('type', 'text')
  .attr('id', 'end')
  .attr('class', 'datepicker')
  .property('maxLength', 10)
  .style('display', 'none')


  $('#end').datepicker({
    dateFormat: 'yy-mm-dd',
    onSelect: function(dateText) {
      var start = moment.utc($scope.start || undefined, dateFormat)
      var end = moment.utc(dateText || undefined, dateFormat)

      updateScopeAndStore('start', start.format(dateFormat), true)
      updateScopeAndStore('end', end.format(dateFormat), true)
      updateScopeAndStore('range', 'custom')
      updateMaxRange()
    }
  })

  $('#start').datepicker({
    dateFormat: 'yy-mm-dd',
    onSelect: function(dateText) {
      var start = moment.utc(dateText || undefined, dateFormat)
      var end = moment.utc($scope.end || undefined, dateFormat)

      updateScopeAndStore('start', start.format(dateFormat), true)
      updateScopeAndStore('end', end.format(dateFormat), true)
      updateScopeAndStore('range', 'custom')
      updateMaxRange()
    }
  })

  // set up the interval selector
  var intervals = d3.select('#interval')
  .selectAll('span')
  .data(intervalList)
  .enter().append('span')
  .text(function(d) {
    return d.name
  })
  .on('click', function(d) {
    if (!isDisabledInterval(d)) {
      updateScopeAndStore('interval', d.name)
    }
  })

  // set up the chart type selector
  var chartType = d3.select('#chartType')
  .attr('class', 'selectList')
  .selectAll('span')
  .data(['line', 'candlestick'])
  .enter().append('span')
  .attr('class', function(d) {
    return d + 'Graphic'
  })
  .attr('title', function(d) {
    return d + ' mode'
  })
  .text(function(d) {
    return d
  })
  .on('click', function(d) {
    updateScopeAndStore('chartType', d)
  })

    /**
   * setParams
   * set params from url, storage, or defaults
   */

  function setParams() {
    if ($state.params.base && $state.params.counter) {
      $scope.base = $state.params.base.split(/[+|\.|:]/)
      $scope.base = {
        currency: $scope.base[0],
        issuer: $scope.base[1] ? $scope.base[1] : ''
      }

      $scope.counter = $state.params.counter.split(/[+|\.|:]/)
      $scope.counter = {
        currency: $scope.counter[0],
        issuer: $scope.counter[1] ? $scope.counter[1] : ''
      }

    } else {
      $scope.base = store.session.get('base') ||
        store.get('base') ||
        Options.base ||
        {currency: 'XRP'}

      $scope.counter = store.session.get('counter') ||
        store.get('counter') ||
        Options.counter ||
        {currency: 'USD', issuer: 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B'}
    }

    if ($scope.base.currency === 'XRP' &&
        $scope.counter.currency === 'XRP') {
      $scope.counter = Options.counter ||
        {currency: 'USD', issuer: 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B'}
    }

    $scope.range = $state.params.range ||
      store.session.get('range') ||
      store.get('range') ||
      Options.range ||
      '3d'


    $scope.chartType = $state.params.type ||
      store.session.get('chartType') ||
      store.get('chartType') ||
      Options.chartType ||
      'line'

    $scope.interval = $state.params.interval ||
      store.session.get('interval') ||
      store.get('interval') ||
      Options.interval ||
      '30m'

    $scope.start = $state.params.start ||
      store.session.get('start') ||
      store.get('start')

    $scope.end = $state.params.end ||
      store.session.get('end') ||
      store.get('end')

    $('#end')
    .datepicker('setDate',
                $scope.end ? utcDate($scope.end) : utcDate(undefined, 1))
    .css('display', $scope.range === 'custom' ? 'inline-block' : 'none')
    .blur()

    $('#start')
    .datepicker('setDate', utcDate($scope.start))
    .css('display', $scope.range === 'custom' ? 'inline-block' : 'none')
    .blur()

    // validate range
    if (!getRange()) {
      updateScopeAndStore('range', '1d')
    }

    // validate interval
    if (!getInterval()) {
      updateScopeAndStore('interval', '5m')
    }

    // validate start time
    if ($scope.start &&
      !moment.utc($scope.start, dateFormat).isValid()) {
      updateScopeAndStore('range', '1d')
      updateScopeAndStore('start', undefined)
    }

    // validate end time
    if ($scope.end &&
      !moment.utc($scope.end, dateFormat).isValid()) {
      updateScopeAndStore('range', '1d')
      updateScopeAndStore('end', undefined)
    }

    // validate chart type
    if ($scope.chartType !== 'line' &&
       $scope.chartType !== 'candlestick') {
      updateScopeAndStore('chartType', 'candlestick')
    }

    // check if current interval is valid
    // with the given range
    if (isDisabledInterval()) {
      var range = getRange()
      var interval = range.name === 'custom' ?
        getCustomInterval() : range.interval

      updateScopeAndStore('interval', interval)
    }

    chartType.classed('selected', function(d) {
      return d === $scope.chartType
    })

    intervals
    .classed('disabled', isDisabledInterval)
    .classed('selected', function(d) {
      return d.name === $scope.interval
    })

    ranges.classed('selected', function(d) {
      return d.name === $scope.range
    })

    // change chart type only
    if (updateMode === 'type') {
      priceChart.setType($scope.chartType)

    // change chart parameters
    } else if (updateMode === 'chart') {
      updateChart()

    // update pair and chart
    } else {
      updateMaxRange()
      loadPair()
    }

    // load dropdowns
    if (!dropdownA) {
      loadDropdowns()
    }

    updateMode = '' // reset
  }

  $scope.$watch(function() {
    return $location.url()
  }, setParams)

  $scope.$watch('theme', function() {
    loadDropdowns()
  })

  $scope.$watchCollection('base', handleTransition.bind(undefined, 'pair'))
  $scope.$watchCollection('counter', handleTransition.bind(undefined, 'pair'))
  $scope.$watch('interval', handleTransition.bind(undefined, 'chart'))
  $scope.$watch('range', handleTransition.bind(undefined, 'chart'))
  $scope.$watch('start', handleTransition.bind(undefined, 'chart'))
  $scope.$watch('end', handleTransition.bind(undefined, 'chart'))
  $scope.$watch('chartType', handleTransition.bind(undefined, 'type'))

  priceChart.onStateChange = function(state) {
    if (state === 'loaded') {
      toCSV.style('opacity', 1).attr('disabled', null)
    } else {
      toCSV.style('opacity', 0.3).attr('disabled', true)
    }
  }

  // reload data when coming back online
  $scope.$watch('online', function(online) {
    if (online) {
      loadPair()
    }
  })

  // stop the listeners when leaving page
  $scope.$on('$destroy', function() {
    priceChart.suspend()
    book.suspend()
    tradeFeed.suspend()
  })
}

angular.module('ripplecharts.markets', [
  'ui.state',
  'ui.bootstrap',
  'ui.route'
])
.config(function config($stateProvider) {
  $stateProvider
  .state('markets', {
    url: '/markets',
    views: {
      main: {
        controller: 'MarketsCtrl',
        templateUrl: 'markets/markets.tpl.html'
      }
    },
    data: {
      pageTitle: 'Live Chart'
    },
    resolve: {
      gateInit: function(gateways) {
        return gateways.promise
      }
    }
  }).state('markets.pair', {
    url: '/:base/:counter?interval&range&type&start&end',
    data: {
      pageTitle: 'Live Chart'
    }
  })
})
.controller('MarketsCtrl', MarketsCtrl)
