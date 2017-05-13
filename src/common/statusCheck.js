/* eslint no-unused-vars: [1, {"args": "after-used"}] */
'use strict'

angular.module('statusCheck', [])
.directive('statusCheck', function($http, $interval) {
  return {
    restrict: 'AE',
    template: '<svg width="20" height="20">' +
      '<circle r=5 cx="10" cy="10"></svg><tooltip></tooltip>',
    link: function(scope, element) {
      var url = API + '/health/importer?verbose=true'
      var marker = element.find('circle')
      var tooltip = element.find('tooltip')

      function checkStatus() {
        $http({
          method: 'get',
          url: url
        })
        .then(function(resp) {
          var date
          var gap
          var digits
          var interval

          if (!resp || !resp.data) {
            marker.attr('class', '')
            tooltip.html('Unable to check status')

          } else if (!resp.data.score) {
            marker.attr('class', 'active')
            tooltip.html('Network data is up to date')

          } else if (resp.data.score === 1) {
            marker.attr('class', 'warning')
            tooltip.html('Verification for imported ledgers' +
                         ' is currently paused')

          } else {
            date = moment()
            gap = resp.data.ledger_gap
            digits = parseFloat(gap)
            interval = gap.replace(/[^a-z]/gi, '')

            switch (interval) {
              case 's':
                interval = 'seconds'
                break
              case 'm':
                interval = 'minutes'
                break
              case 'h':
                interval = 'hours'
                break
              case 'd':
                interval = 'days'
                break
              case 'y':
                interval = 'years'
                break
              default:
                interval = undefined
            }

            date.subtract(digits, interval)
            marker.attr('class', 'inactive')
            tooltip.html('Network data is not up to date. ' +
                         'Last ledger imported at <b>' +
                         date.format('lll') + '</b>')
          }
        },
        function(err) {
          console.log(err)
          marker.attr('class', '')
          tooltip.html('Unable to check status.')
        })
      }

      function mouseEnter() {
        tooltip.css('display', 'block')
      }

      function mouseLeave() {
        tooltip.css('display', 'none')
      }

      tooltip.css('display', 'none').html('checking status')
      marker.on('mouseenter', mouseEnter)
      marker.on('mouseleave', mouseLeave)

      $interval(checkStatus, 30000)
      checkStatus()
    }
  }
})
