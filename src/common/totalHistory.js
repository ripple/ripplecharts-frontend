/* eslint
  no-use-before-define: 1,
  no-unused-vars: ["warn", { "args": "after-used" }],
  prefer-spread:1,
  no-loop-func: 0
*/
/* globals StackedChart */
'use strict'

function getIEVersion() {
  var sAgent = window.navigator.userAgent
  var Idx = sAgent.indexOf('MSIE')

  // If IE, return version number.
  if (Idx > 0) {
    return parseInt(sAgent.substring(Idx + 5, sAgent.indexOf('.', Idx)), 10)

  // If IE 11 then look for Updated user agent string.
  } else if (navigator.userAgent.match(/Trident\/7\./)) {
    return 11
  }

  return 0 // It is not IE
}

/**
 * TotalHistory
 */

function TotalHistory(options) {

  var self = this
  var gateways = options.gateways
  var api = new ApiHandler(options.url)
  var el = d3.select('#' + options.id)
  var color = d3.scale.category10()
  var customFrom
  var customTo

  var issuers = {
    USD: 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B',
    BTC: 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B',
    CNY: 'rKiCet8SdvWxPXnAgYarFUXMh1zCPz432Y',
    EUR: 'rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq',
    JPY: 'r94s8px6kSw1uZ1MV98dhSRTvc6VMPoPcN',
    XRP: ''
  }

  var filters = []
  var cache
  var crumbs = d3.select('#breadcrumb .crumbs')
  var currencySelect = d3.select('#currency select')
  var ranges = d3.selectAll('#ranges a')
  var intervals = d3.selectAll('#intervals a')
  var download = d3.select('#csv')

  var formatNumber = d3.format(',.0f')
  var range = '1m'
  var interval = 'day'
  var currency = 'USD'
  var issuer = issuers[currency]
  var legend
  var chart

  function toCSV(data) {
    var str = ''
    var line = ['Date']

    line.push.apply(line, Object.keys(data))
    str += line.join(',') + '\r\n'
    var key = line[1]

    var byDate = {}

    for (key in data) {
      data[key].forEach(function(d) {
        var date = moment(d.date).utc().format('YYYY-MM-DD')
        if (!byDate[date]) {
          byDate[date] = [date]
        }

        byDate[date].push(d.y)
      })
    }


    for (key in byDate) {
      str += byDate[key].join(',') + '\r\n'
    }

    return str
  }

  function changeInterval(newInterval) {
    var a = d3.select(this)

    if (!newInterval && a.classed('no-click')) {
      return
    }

    interval = newInterval ?
      newInterval : a.text()

    intervals.classed('clicked', function() {
      return d3.select(this).text() === interval
    })
    self.load()
  }

  function changeRange() {
    range = d3.select(this).text()
    intervals.classed('no-click', false)
    ranges.classed('clicked', function() {
      return d3.select(this).text() === range
    })


    if (range === 'custom') {
      d3.selectAll('#ranges .calendar')
        .style('display', function() {
          return d3.select(this).style('display') === 'none' ?
            'inline-block' : 'none'
        })

      return

    } else if (range === 'max') {
      intervals.classed('no-click', function() {
        return d3.select(this).text() === 'day'
      })

      if (interval === 'day') {
        changeInterval('week')
        return
      }

    } else if (range === '1m') {
      intervals.classed('no-click', function() {
        return d3.select(this).text() === 'month'
      })

      if (interval === 'month') {
        changeInterval('day')
        return
      }
    }

    self.load()
  }

  function changeCurrency() {
    currency = d3.select(this).node().value
    issuer = issuers[currency]
    self.load()
  }

  function formatValue(d) {
    return (currency === 'USD' ? '$' : '') + formatNumber(d)
  }

  function formatLabel(d) {
    var parts = d.split('.')

    if (parts.length === 4) {
      var bi = gateways.getName(parts[1]) || parts[1]
      var ci = gateways.getName(parts[3]) || parts[3]
      return parts[0] + ' <span>' + bi + '</span> / ' +
             parts[2] + ' <span> ' + ci + '</span>'
    } else if (parts.length === 2) {
      var i = gateways.getName(parts[1]) || parts[1]
      return parts[0] + ' <span>' + i + '</span>'
    }

    return d
  }

  function loadCustomRange() {
    var start = moment(customFrom.val())
    var end = moment(customTo.val())
    var diff = end.diff(start, 'days')
    var noclick

    if (diff < 90) {
      noclick = 'month'
    } else if (diff > 365) {
      noclick = 'day'
    }

    intervals.classed('no-click', function() {
      return d3.select(this).text() === noclick
    })

    if (noclick === interval &&
      interval === 'month') {
      changeInterval('day')

    } else if (noclick === interval &&
      interval === 'day') {
      changeInterval('week')

    } else {
      self.load()
    }
  }

  function cacheResult(data) {
    chart.loading = false

    cache = {
      original: data,
      byDate: {}
    }

    data[0].forEach(function(d) {
      var date = moment(d.start_time).format()
      if (!cache.byDate[date]) {
        cache.byDate[date] = {
          date: date
        }
      }

      cache.byDate[date]['Exchange Volume'] = d
    })

    data[1].forEach(function(d) {
      var date = moment(d.start_time).format()
      if (!cache.byDate[date]) {
        cache.byDate[date] = {
          date: date
        }
      }

      cache.byDate[date]['Payment Volume'] = d
    })
  }


  function filterByIssuer() {
    var data = {}
    var keys = {}
    var list
    var source
    var date
    var key

    for (date in cache.byDate) {
      source = cache.byDate[date]['Payment Volume']

      if (!source) {
        continue
      }

      source.components.forEach(function(c) {

        if (c.currency !== filters[1]) {
          return
        }

        key = c.currency + '.' + (c.issuer || '')
        keys[key] = {
          label: key,
          currency: c.currency,
          issuer: c.issuer
        }
      })
    }

    for (date in cache.byDate) {
      list = {}

      source = cache.byDate[date]['Payment Volume']

      if (!source) {
        continue
      }

      source.components.forEach(function(c) {
        key = c.currency + '.' + (c.issuer || '')

        list[key] = c.converted_amount
      })

      for (key in keys) {
        if (!data[key]) {
          data[key] = []
        }

        data[key].push({
          date: moment(date),
          y: list[key] || 0
        })
      }
    }

    return {
      sets: data,
      keys: keys
    }
  }


  function filterByMarket() {
    var data = {}
    var keys = {}
    var list
    var source
    var date
    var key

    for (date in cache.byDate) {
      source = cache.byDate[date]['Exchange Volume']

      if (!source) {
        continue
      }

      source.components.forEach(function(c) {

        if (c.base.currency !== filters[1] &&
            c.counter.currency !== filters[1]) {
          return
        }

        var base = c.base.currency + '.' + (c.base.issuer || '')
        var counter = c.counter.currency + '.' + (c.counter.issuer || '')
        keys[base + '.' + counter] = {
          label: base + '.' + counter,
          base: c.base,
          counter: c.counter
        }
      })
    }

    for (date in cache.byDate) {
      list = {}

      source = cache.byDate[date]['Exchange Volume']
      source.components.forEach(function(c) {
        var base = c.base.currency + '.' + (c.base.issuer || '')
        var counter = c.counter.currency + '.' + (c.counter.issuer || '')

        list[base + '.' + counter] = c.converted_amount
      })

      for (key in keys) {
        if (!data[key]) {
          data[key] = []
        }

        data[key].push({
          date: moment(date),
          y: list[key] || 0
        })
      }
    }

    return {
      sets: data,
      keys: keys
    }
  }

  function filterByCurrency() {
    var data = {}
    var keys = {}
    var list
    var source
    var date
    var key


    for (date in cache.byDate) {
      source = cache.byDate[date][filters[0]]


      if (!source) {
        continue
      }

      source.components.forEach(function(c) {
        if (c.base) {
          keys[c.base.currency] = {
            label: c.base.currency
          }
        }

        if (c.counter) {
          keys[c.counter.currency] = {
            label: c.counter.currency
          }
        }

        if (c.currency) {
          keys[c.currency] = {
            label: c.currency
          }
        }
      })
    }

    for (date in cache.byDate) {
      list = {}

      source = cache.byDate[date][filters[0]]

      if (!source) {
        continue
      }

      source.components.forEach(function(c) {

        if (c.base) {
          if (!list[c.base.currency]) {
            list[c.base.currency] = 0
          }

          if (!list[c.counter.currency]) {
            list[c.counter.currency] = 0
          }

          list[c.base.currency] += c.converted_amount
          list[c.counter.currency] += c.converted_amount

        // handle payments
        } else {
          list[c.currency] = c.converted_amount
        }
      })

      for (key in keys) {
        if (!data[key]) {
          data[key] = []
        }

        data[key].push({
          date: moment(date),
          y: list[key] || 0
        })
      }
    }

    return {
      sets: data,
      keys: keys
    }
  }

  function graphData() {
    var data = {}
    var date
    var key

    if (!filters.length) {
      data = {
        'Exchange Volume': [],
        'Payment Volume': []
      }

      for (date in cache.byDate) {
        data['Exchange Volume'].push({
          date: moment(date),
          y: cache.byDate[date]['Exchange Volume'] ?
            cache.byDate[date]['Exchange Volume'].total : 0
        })
      }

      for (date in cache.byDate) {
        data['Payment Volume'].push({
          date: moment(date),
          y: cache.byDate[date]['Payment Volume'] ?
            cache.byDate[date]['Payment Volume'].total : 0
        })
      }

      data = {
        sets: data,
        keys: {
          'Exchange Volume': {
            label: 'Exchange Volume'
          },
          'Payment Volume': {
            label: 'Payment Volume'
          }
        }
      }

    } else if (filters[1] && filters[0] === 'Exchange Volume') {
      data = filterByMarket()

    } else if (filters[1] && filters[0] === 'Payment Volume') {
      data = filterByIssuer()
    } else {
      data = filterByCurrency()
    }


    for (key in data.sets) {
      data.sets[key].sort(function(a, b) {
        return a.date.diff(b.date)
      })
    }

    cache.current = data
    chart.redraw(data.sets)
    return data
  }

  function drawLegend(data) {
    var keys = []

    for (var key in data.keys) {
      keys.push(data.keys[key])
    }

    var labels = legend.selectAll('.label')
      .data(keys, function(d) {
        return d.label
      })

    var labelEnter = labels.enter()
      .append('div')
      .attr('class', 'label')
      .classed('market', Boolean(keys[0].base))
      .classed('no-click', filters.length > 1)
      .style('color', function(d) {
        return color(d.label)
      })
      .on('click', applyFilter)

    labelEnter.append('div')
      .attr('class', 'title')
      .html(function(d) {
        if (d.currency) {
          var name = gateways.getName(d.issuer) || ''
          return (name ? name + ' ' : '') + d.currency
        } else if (d.base) {
          var baseIssuer = gateways.getName(d.base.issuer) || ''
          var counterIssuer = gateways.getName(d.counter.issuer) || ''
          var base = d.base.currency +
              '<small>' + (baseIssuer || d.base.issuer || '') + '</small>'
          var counter = d.counter.currency +
              '<small>' + (counterIssuer || d.counter.issuer || '') + '</small>'

          return '<b>' + base + '</b><b>/</b><b>' + counter + '</b>'
        }

        return d.label
      })

    labelEnter.append('div')
      .attr('class', 'subtitle')
      .html(function(d) {
        return d.issuer || ''
      })


    labels.exit().remove()
  }

  /**
   * showCrumbs
   */

  function showCrumbs() {
    var list = ['Total Volume']
    list.push.apply(list, filters)

    var crumb = crumbs.selectAll('li.crumb')
      .data(list, function(d) {
        return d
      })

    crumb.enter().append('li')
      .attr('class', 'crumb')
      .text(function(d) {
        return d
      }).on('click', function(d, i) {
        var data

        if (i > 1) {
          return
        }

        filters = filters.splice(0, i)

        showCrumbs()
        data = graphData()
        drawLegend(data)
      })

    crumb.exit().remove()
  }

  /**
   * applyFilter
   */

  function applyFilter(d) {
    if (filters.length > 1) {
      return
    }

    filters.push(d.label)
    showCrumbs()
    var data = graphData()
    drawLegend(data)
  }

  chart = new StackedChart({
    div: el.append('div').attr('class', 'chart'),
    title: 'Total Volume',
    resize: options.resize,
    formatValue: formatValue,
    formatLabel: formatLabel,
    dateFormat: 'MMM D, YYYY [(UTC)]',
    color: color
  })

  legend = el.append('div')
    .attr('class', 'legend')

  currencySelect.on('change', changeCurrency)
  currencySelect.property('value', currency)

  ranges.classed('clicked', function() {
    return d3.select(this).text() === range
  }).on('click', changeRange)

  intervals.classed('clicked', function() {
    return d3.select(this).text() === interval
  }).on('click', changeInterval)

  intervals.classed('no-click', function() {
    return d3.select(this).text() === 'month'
  })

  $('#datepicker_from').val(moment().subtract(1, 'month')
    .subtract(1, 'day').format('MM/DD/YYYY'))
  $('#datepicker_to').val(moment().format('MM/DD/YYYY'))

  customTo = $('#datepicker_to').datepicker({
    maxDate: '+0d',
    minDate: '',
    onSelect: loadCustomRange
  })

  customFrom = $('#datepicker_from').datepicker({
    maxDate: '-2d',
    onSelect: loadCustomRange
  })

  download
  .style('visibility', getIEVersion() ? 'hidden' : '')
  .on('click', function() {
    var csv = toCSV(cache.current.sets)
    var name = crumbs.select('li:last-child').text()

    if (Modernizr.prefixed('requestFileSystem', window)) {
      var blob = new Blob([csv], {'type': 'application/octet-stream'})
      this.href = window.URL.createObjectURL(blob)

    } else {
      this.href = 'data:text/csvcharset=utf-8,' + escape(csv)
    }

    this.download = name + '_' + interval + '_historical.csv'
    this.target = '_blank'
    return true
  })

  /**
   * load
   */

  self.load = function() {
    filters = []
    chart.loading = true
    chart.fadeOut()
    showCrumbs()

    function loadData(metric) {
      return new Promise(function(resolve, reject) {

        var end = moment.utc()
        var start

        if (range === 'max') {
          start = moment.utc('2013-01-01')
        } else if (range === 'custom') {
          start = moment.utc(customFrom.val())
          end = moment.utc(customTo.val())
        } else if (range[1] === 'y') {
          start = moment.utc().subtract(1, 'years')
        } else {
          start = moment.utc().subtract(range[0], 'months')
        }

        api[metric]({
          currency: currency,
          issuer: issuer,
          start: start,
          end: end,
          interval: interval
        }, function(err, data) {

          if (err) {
            reject(err)

          } else {
            resolve(data.rows)
          }
        })
      })
    }

    Promise.all([
      loadData('getExchangeVolume'),
      loadData('getPaymentVolume')
    ])
    .then(cacheResult)
    .then(graphData)
    .then(drawLegend)
    .catch(function(e) {
      console.log(e)
      console.trace()
      chart.loading = false
    })
  }
}
