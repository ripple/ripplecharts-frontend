var TransactionStats = function (options) {
  var self = this;

  if (options.id) {
    self.div = d3.select('#'+options.id).attr('class','chartWrap');
  } else {
    self.div = d3.select('body').append('div').attr('class','chartWrap');
  }


//create new line chart
  var chart = new StackedChart({
    div: self.div,
    title: '# of Transactions',
    resize: true
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
