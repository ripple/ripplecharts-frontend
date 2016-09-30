/* eslint {no-unused-vars: 0} */
/* global StackedChart */
'use strict';

function TransactionStats(options) {
  var self = this;
  var colorFunction;

  if (options.id) {
    self.div = d3.select('#' + options.id).attr('class', 'chartWrap');
  } else {
    self.div = d3.select('body').append('div').attr('class', 'chartWrap');
  }

  if (options.metric === 'result') {
    colorFunction = (function() {
      var color = d3.scale.linear()
      .domain([0, 10])
      .interpolate(d3.interpolateHcl)
      .range([d3.rgb('#660000'), d3.rgb('#884400')]);

      var domain = [];

      function c(d) {
        if (d === 'tesSUCCESS') {
          return 'green';
        }

        return color(domain.indexOf(d));
      }

      c.domain = function(d) {
        if (d) {
          domain = d;
          return this;
        }

        return domain;
      };

      return c;
    })();
  }

  // create new line chart
  var chart = new StackedChart({
    div: self.div,
    title: '# of Transactions',
    resize: true,
    color: colorFunction
  });

  var start = moment.utc().subtract(999, 'week');
  var url = API + '/stats/' +
    options.metric + '?limit=1000&interval=week' +
    '&start=' + start.format('YYYY-MM-DDTHH:mm:ss');

  chart.loading = true;
  chart.fadeOut();

  d3.json(url, function(err, resp) {

    if (err) {
      console.log(err);
    }

    var data = {};
    var types = [];
    resp.stats.forEach(function(d) {
      for (var key in d) {
        types[key] = true;
      }
    });

    delete types.date;

    resp.stats.forEach(function(d) {
      var date = moment(d.date);

      for (var key in types) {
        if (!data[key]) {
          data[key] = [];
        }

        data[key].push({
          date: date,
          y: d[key] || 0
        });
      }
    });

    chart.loading = false;
    chart.redraw(data);
  });

}
