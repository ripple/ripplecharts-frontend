/* eslint no-unused-vars: [1, {"args": "after-used"}], no-empty: 0 */
'use strict'

angular.module('versionsGraph', [])
.directive('versionsGraph', [function() {
  function link($scope, $el) {

    var div = d3.select($el[0])
    var svg = div.append('svg')
    var tooltip = div.append('div').attr('class', 'tooltip')

    var margin = {
      top: 30,
      right: 0,
      bottom: 70,
      left: 40
    }

    var width
    var height

    var x = d3.scale.ordinal()
    var y = d3.scale.linear()
    var uptime = d3.scale.linear()

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom')

    var percentAxis = d3.svg.axis()
        .scale(y)
        .orient('left')
        .ticks(10, '%')

    /*
    var uptimeLine = d3.svg.line()
    .interpolate('monotone')
    .x(function(d) {
      return x(d.version) + x.rangeBand()/2
    })
    .y(function(d) {
      return uptime(d.uptime)
    })
    */

    var g = svg.append('g')
    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')

    g.append('g')
    .attr('class', 'axis x-axis')

    g.append('g')
    .attr('class', 'axis percent-axis')
    .append('text')
    .attr('class', 'axis-title')
    .attr('transform', 'rotate(-90)')
    .attr('y', 6)
    .attr('dy', '0.71em')
    .attr('text-anchor', 'end')
    .text('% of Total Nodes')
    .style('display', 'none')

    g.append('path')
    .attr('class', 'uptime')

    g.append('path')
    .attr('class', 'inbound')

    g.append('path')
    .attr('class', 'outbound')

    tooltip.append('h5')
    .attr('class', 'version')

    tooltip.append('div')
    .attr('class', 'count')

    tooltip.append('div')
    .attr('class', 'connections')

    tooltip.append('div')
    .attr('class', 'uptime')

    var versionToColor = $scope.color || function() {}

    function hideTooltip() {
      tooltip.transition()
      .duration(100)
      .style('opacity', 0)

      g.selectAll('.bar')
      .classed('highlight', false)
    }

    function showTooltip() {

      if (!$scope.versions) {
        hideTooltip()
        return
      }

      var pos = d3.mouse(this)
      var range = x.range()
      var bandWidth = x.rangeBand()
      var duration
      var i
      var d

      for (i = 0; pos[0] > (range[i] + bandWidth + margin.left); i++) {}

      d = $scope.versions[i]

      if (!d) {
        hideTooltip()
        return
      }

      g.selectAll('.bar')
      .classed('highlight', function(data, index) {
        return i === index
      })

      duration = moment.duration(d.uptime, 's').humanize()

      tooltip.transition()
      .duration(200)
      .style('opacity', 1)

      tooltip.select('.version').html(d.version)
      tooltip.select('.count').html('<label># Instances: </label>' + d.count)
      tooltip.select('.connections').html('<label>Avg # Connections: </label>' +
                                          (d.in + d.out).toFixed(1))
      tooltip.select('.uptime').html('<label>Avg Uptime: </label>' + duration)
    }

    function drawData(update) {
      if (!$scope.versions) {
        return
      }

      var data = $scope.versions

      var bars = g.selectAll('.bar').data(data, function(d) {
        return d.version
      })

      x.domain(data.map(function(d) {
        return d.version
      }))

      y.domain([
        0,
        d3.max(data, function(d) {
          return d.pct
        }) * 1.1
      ])

      uptime.domain([
        0,
        d3.max(data, function(d) {
          return d.uptime
        }) * 1.1
      ])

      /*
      g.select('path.uptime')
      .datum(data)
      .attr('d', function(d) {
        return uptimeLine(d)
      })
      */

      bars.enter().append('rect')
      .attr('class', 'bar')
      .attr('rx', 1)
      .attr('ry', 1)
      .attr('y', height)
      .attr('height', 0)

      bars.exit().remove()

      bars
      .attr('width', x.rangeBand())
      .style('fill', function(d) {
        return versionToColor(d.version)
      }).style('stroke', function(d) {
        return versionToColor(d.version)
      }).attr('x', function(d) {
        return x(d.version)
      })

      if (update) {
        bars.transition()
        .delay(500)
        .duration(1000)
        .attr('y', function(d) {
          return y(d.pct)
        })
        .attr('height', function(d) {
          return height - y(d.pct)
        })

      } else {
        bars.attr('y', function(d) {
          return y(d.pct)
        })
        .attr('height', function(d) {
          return height - y(d.pct)
        })
      }

      g.select('.percent-axis')
      .call(percentAxis)

      g.select('.x-axis')
      .call(xAxis)
      .selectAll('text')
      .style('text-anchor', 'end')
      .attr('dx', '-.4em')
      .attr('transform', 'rotate(-45)')

      g.select('.axis-title').style('display', 'block')
    }

    function resizeChart() {
      var old = width

      width = $el[0].getBoundingClientRect().width
      height = $el[0].getBoundingClientRect().height

      width -= margin.left + margin.right
      height -= margin.top + margin.bottom

      if (old !== width) {
        svg.style('height', (height + margin.top + margin.bottom) + 'px')
        svg.style('width', (width + margin.top + margin.bottom) + 'px')
        g.select('.x-axis').attr('transform', 'translate(0,' + height + ')')

        y.range([height, 0])
        uptime.range([height, 0])
        x.rangeRoundBands([0, width], .15)

        drawData()
      }
    }

    svg
    .on('mousemove', showTooltip)
    .on('mouseout', hideTooltip)

    addResizeListener($el[0], resizeChart)
    resizeChart()

    $scope.$watch('versions', drawData, true)
    $scope.$watch('stable', drawData)
  }

  return {
    link: link,
    restrict: 'EA'
  }
}])
