/* globals ValueSummary */

'use strict'

angular.module('donut', [])
.directive('donut', [
  function() {
    var count = 0

    function link(scope, elem) {

      var el = d3.select(elem[0])
      var donut
      count++

      el.append('div')
      .attr('id', 'metricDetail' + count)
      .attr('class', 'donut')

      donut = new ValueSummary({
        id: 'metricDetail' + count
      })

      scope.$watch('data', function(data) {
        var keys = {}

        data.components.forEach(function(d) {
          var key = d.counter_currency
          if (keys[key]) {
            keys[key]++
          } else {
            keys[key] = 1
          }

          d.rank = keys[key]
          d.color = donut.currencyColor(key, d.rank)
          d.currency = 'XRP'
        })

        donut.load(data, {
          rate: 1 / scope.rate,
          currency: scope.currency
        }, data.scale)
      }, true)
    }

    return {
      link: link,
      scope: {
        data: '=',
        rate: '=',
        currency: '='
      },
      restrict: 'EA'
    }
  }
])
