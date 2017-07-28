/* eslint no-unused-vars: 0 */
'use strict'

function ValueSummary(options) {

  var commas = d3.format(',.2f')
  var outer = options.id ?
    d3.select('#' + options.id).attr('class', 'valueSummary') :
    d3.select('body').append('div').attr('class', 'valueSummary')

  var title = outer.append('h5')
  var inner = outer.append('div').attr('class', 'inner')
  var width = parseInt(outer.style('width'), 10)
  var height = (parseInt(outer.style('height'), 10) || width) - 40
  var radius = (Math.min(width, height)) / 2

  var margin = {
    top: radius / 10,
    bottom: radius / 10,
    left: radius / 10,
    right: radius / 10
  }

  inner.style({
    width: (radius * 2) + 'px',
    height: (radius * 2) + 'px'
  })

  radius -= margin.top

  var chart = inner.append('svg')
    .attr('width', radius * 2.3)
    .attr('height', radius * 2.3)
    .append('g')
    .attr('transform', 'translate(' +
          (radius + margin.left) + ',' +
          (radius + margin.top) + ')')

  var currencyOrder = [
    'XAU', 'XAG', 'BTC',
    'LTC', 'XRP', 'EUR',
    'USD', 'GBP', 'AUD',
    'NZD', 'USD', 'CAD',
    'CHF', 'JPY', 'CNY'
  ]

  var sourceLabels = {
    rcl: 'Ripple Network'
  }

  var currencyColors = {
    'XRP': '#346aa9',
    'USD': [20, 150, 30],
    'USDT': [20, 150, 30],
    'BTC': [240, 150, 50],
    'EUR': [220, 210, 50],
    'CNY': [180, 30, 35],
    'JPY': [140, 80, 170],
    'CAD': [130, 100, 190],
    'other': [100, 150, 200]
  }

  var blues = [
    '#2a98D0',
    '#1A3964',
    '#98c8eb',
    '#3A69c4',
    '#205097',
    '#3665B0',
    '#2A4994'
  ]

  var arc = d3.svg.arc()
  var labelArc = d3.svg.arc()

  var path = chart.selectAll('path')
  var label = inner.selectAll('label')
  var tooltip = outer.append('div').attr('class', 'tooltip')
  var transitioning = false
  var gateways = options.gateways
  var exchange
  var total

  /**
   * Capitalize
   */

  function capitalize(d) {
    return d.charAt(0).toUpperCase() + d.slice(1);
  }

  /**
   * color
   */

  function color(currency, rank) {
    var c
    var r
    var rgb

    if (currency && currency === 'XRP') {
      return currencyColors.XRP

    } else if (!currency) {
      return rank ?
        blues[((rank || 0) % 6) + 1] : blues[0]
    }

    c = currencyColors[currency] ||
      currencyColors.other
    r = rank ? rank - 1 : 0

    rgb = {
      r: Math.floor(c[0] - c[0] * (r % 3 * 0.1)),
      g: Math.floor(c[1] - c[1] * (r % 3 * 0.15)),
      b: Math.floor(c[2] - c[2] * (r % 3 * 0.2))
    }

    return 'rgb(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ')'
  }

  // make externally accessible
  this.currencyColor = color

  /**
   * prepareTradeVolume
   */

  function prepareTradeVolume(z) {
    var data = []

    z.components.forEach(function(d, i) {
      data.push({
        key: sourceLabels[d.source] || capitalize(d.source),
        sub: d.base_currency ?
          d.base_currency + '/' + d.counter_currency : undefined,
        value: Number(d.base_volume),
        color: color(null, i),
        row: d
      })
    })

    return data
  }

  /**
   * prepareData
   */

  function prepareData(z) {
    var data = []

    z.components.forEach(function(d, i) {
      data.push({
        key: d.key,
        sub: d.sub,
        value: d.value,
        color: d.color,
        row: d
      })
    })

    data.sort(function(a, b) {
      return b.key.localeCompare(a.key)
    })

    return data
  }

  /**
   * prepareRCLTradeVolume
   */

  function prepareRCLTradeVolume(z) {
    var data = []
    var keys = {}

    z.components.forEach(function(d) {
      var row = {
        value: Number(d.converted_amount),
        row: d
      }

      var co1 = currencyOrder.indexOf(d.base.currency)
      var co2 = currencyOrder.indexOf(d.counter.currency)

      row.sort = d.base.currency
      row.sub = gateways.getName(d.base.issuer, d.base.currency) ||
        d.base.issuer
      row.key = co2 < co1 ?
        d.counter.currency + '/' + d.base.currency :
        d.base.currency + '/' + d.counter.currency

      if (co2 < co1) {
        row.link = '#/markets/' +
          d.counter.currency +
          (d.counter.issuer ?
           ':' + d.counter.issuer : '') + '/' +
          d.base.currency +
          (d.base.issuer ?
           ':' + d.base.issuer : '')
      } else {
        row.link = '#/markets/' +
          d.base.currency +
          (d.base.issuer ?
           ':' + d.base.issuer : '') + '/' +
          d.counter.currency +
          (d.counter.issuer ?
           ':' + d.counter.issuer : '')
      }

      data.push(row)
    })

    data.sort(function(a, b) {
      var first = a.row.base.currency
      var second = b.row.base.currency
      return second.localeCompare(first)
    })

    data.forEach(function(d) {
      var key = d.row.base.currency
      if (keys[key]) {
        keys[key]++
      } else {
        keys[key] = 1
      }

      d.rank = keys[key]
      d.color = color(key, d.rank)
    })

    return data
  }

  /**
   * prepareRCLPaymentVolume
   */

  function prepareRCLPaymentVolume(z) {
    var data = []
    var keys = {}
    z.components.forEach(function(d) {
      data.push({
        key: d.currency,
        sub: gateways.getName(d.issuer, d.currency) || d.issuer,
        value: Number(d.converted_amount),
        color: color(d.currency),
        row: d
      })
    })

    data.sort(function(a, b) {
      return b.key.localeCompare(a.key)
    })

    data.forEach(function(d) {
      if (keys[d.key]) {
        keys[d.key]++
      } else {
        keys[d.key] = 1
      }

      d.rank = keys[d.key]
      d.color = color(d.key, d.rank)
    })

    return data
  }

  function resizePaths(d) {
    if (!transitioning) {
      path.each(function(p) {
        var scale = p && p === d ? 1.05 : 1
        d3.select(this)
        .transition()
        .attr('transform', 'scale(' + scale + ')')
      })
    }
  }

  /**
   * showTooltip
   */

  function showTooltip(d, init) {

    if (!init) {
      path.classed('fade', function(row) {
        return row !== d
      })

      label.classed('fade', function(row) {
        return row !== d
      })
    }

    var currency = d.data.row.base ?
        d.data.row.base.currency : d.data.row.currency || 'XRP'
    var amount = d.data.row.amount || d.value

    tooltip.html('')

    var head = tooltip.append('div')
      .attr('class', 'title')
      .html(d.data.key)

    if (d.data.sub) {
      head.append('small')
      .html(d.data.sub)
      .style('color', d.data.color)
    }

    if (d.value) {
      tooltip.append('div')
        .attr('class', 'value')
        .html('<label>Value:</label> ' +
              commas(d.value / exchange.rate, 2)
              + ' <small>' + exchange.currency + '</small>')
    }

    if (amount &&
        currency &&
        exchange.currency !== currency) {
      tooltip.append('div')
        .attr('class', 'amount')
        .html('<label>Amount:</label> '
              + commas(amount, 2) +
              ' <small>' + currency + '</small>')
    }

    if (d.data.row.count) {
      tooltip.append('div')
        .attr('class', 'count')
        .html('<label>Count:</label> ' + d.data.row.count)
    }
  }

  /**
   * arcTween
   */

  function arcTween(b) {
    var c = this._current
    if (!c) {
      if (chart.select('path:nth-last-child(2)')[0][0]) {
        c = chart.select('path:nth-last-child(2)')[0][0]._current
      }

      if (c) {
        c.startAngle = c.endAngle
      }
    }

    if (!c) {
      c = {
        startAngle: 1.1 * Math.PI,
        endAngle: 1.1 * Math.PI
      }
    }

    var i = d3.interpolate(c, b)
    this._current = i(0)
    return function(t) {
      return arc(i(t))
    }
  }

  /**
   * load
   */

  this.load = function(z, ex, scale) {
    var data
    var center

    title.html(z.label)
    total = z.total || 0

    if (z.link) {
      title.append('a')
        .attr('href', z.link)
        .html('See Details >')
    }

    if (!z.components) {
      return
    }

    switch (z.key) {
      case 'totalTradeVolume':
        data = prepareTradeVolume(z)
        break
      case 'tradeVolumeRCL':
        data = prepareRCLTradeVolume(z)
        break
      case 'paymentVolumeRCL':
        data = prepareRCLPaymentVolume(z)
        break
      default:
        data = prepareData(z)
    }

    if (!data.length) {
      tooltip.html('')
      path.data([]).exit().remove()
      inner.selectAll('label').data([]).exit().remove()
      return
    }

    arc = d3.svg.arc()
      .outerRadius(radius * 0.9 * (scale || 1))
      .innerRadius(radius * 0.6 * (scale || 1))

    labelArc = d3.svg.arc()
    .outerRadius((radius + 20) * (scale || 1))
    .innerRadius(radius * (scale || 1))

    chart.attr('transform', 'translate(' +
      (radius + margin.left) + ',' +
      (radius * (scale || 1) + margin.top) + ')')

    // indicate we are in the midst of transition
    transitioning = true
    exchange = ex

    data.forEach(function(d) {
      d.percent = total ? d.value / total * 100 : 0.00
    })

    var pie = d3.layout.pie()
      .sort(null)
      .startAngle(1.1 * Math.PI)
      .endAngle(3.1 * Math.PI)
      .value(function(d) {
        return d.value
      })

    // add arcs
    path = path.data(pie(data))
    path.enter().append('path')
    .on('mouseover', function(d) {
      showTooltip(d)
      resizePaths(d)
    })
    .on('mouseout', function() {
      path.classed('fade', false)
      label.classed('fade', false)
      resizePaths()
    })
    .on('click', function(d) {
      if (d.data.link) {
        window.location.hash = d.data.link
      }
    })

    path.classed('clickable', function(d) {
      return Boolean(d.data.link)
    })
    .style('fill', function(d) {
      return d.data.color
    })
    .style('stroke', function(d) {
      return d.data.color
    })
    .style('stroke-width', '.35px')
    .transition().duration(750)
    .attrTween('d', arcTween)
    .attr('id', function(d, i) {
      return 'arc_' + i
    })
    .each('end', function() {
      transitioning = false
    })

    path.exit()
    .transition().duration(400)
    .style('opacity', 0)
    .each('end', function() {
      d3.select(this).remove()
    })

    // add labels
    label = label.data(path.data())

    label.enter().append('label')
    .on('mouseover', function(d) {
      showTooltip(d)
      resizePaths(d)
    })
    .on('mouseout', function() {
      path.classed('fade', false)
      label.classed('fade', false)
      resizePaths()
    })

    label.html(function(d) {
      return d.data.key +
        '<b>' + commas(d.data.percent, 0) + '%</b>'
    })
    .classed('hidden', function(d) {
      return d.data.percent < 4
    })
    .style('margin-top', function() {
      var h = parseInt(d3.select(this).style('height'), 10)
      return h ? ((0 - h) / 2) + 'px' : 0
    })
    .style('margin-left', function() {
      var w = parseInt(d3.select(this).style('width'), 10)
      return w ? ((0 - w) / 2) + 'px' : 0
    })
    .transition().duration(500)
    .style('top', function(d) {
      var y = radius * (scale || 1) + margin.top
      return (labelArc.centroid(d)[1] + y) + 'px'
    })
    .style('left', function(d) {
      var x = radius + margin.left
      return (labelArc.centroid(d)[0] + x) + 'px'
    })

    label.exit().remove()

    // show data for the largest item
    var current
    path.data().forEach(function(d) {
      if (!current || current.value < d.value) {
        current = d
      }
    })

    if (current) {
      showTooltip(current, true)
    } else {
      tooltip.html('')
    }
  }
}
