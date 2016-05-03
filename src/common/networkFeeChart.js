var NetworkFees = function (options) {
  var self        = this;
  var request, basisRequest;

  if (options.id) self.div = d3.select('#'+options.id).attr('class','chartWrap');
  else            self.div = d3.select('body').append('div').attr('class','chartWrap');

  var list = self.div.append('div').attr('class','interval selectList');
  self.div.append('div').attr('class','lineChart').attr('id', options.id+'Chart');

  list.append('label').html('Interval:');
  var interval = list.selectAll('span')
  .data(['ledger','hour','day'])
  .enter().append('span')
    .classed('selected', function(d) { return d === 'hour'})
    .text(function(d) { return d })
    .on('click', function(d){
      d3.event.preventDefault();
      var that = this;
      interval.classed('selected', function() { return this === that; });
      selectInterval(d);
    });


//create new line chart
  var chart = new LineChart({
    id: options.id+'Chart',
    leftTitle: 'Total Fees (XRP)',
    rightTitle: 'Average Fee (XRP)',
    resize: true,
    minDomain: 0,
    tooltip: function (d, interval) {

      var html = '<div>'+ parseDate(d.x, interval) +'</div>';

      if (interval === 'ledger') {
        html += '<div><span>Ledger:</span>' + d.data.ledger_index + '</div>';
      }

      html +=  '<div><span>Average Fee:</span>' + d.y + ' <small>XRP</small></div>' +
        '<div><span>Total Fees:</span>' + d.y2 + ' <small>XRP</small></div>';
      return html;
    }});


  function selectInterval(d) {
    var start = moment.utc();
    var multiplier = d === 'ledger' ? 3.5 : 1;
    var interval = d === 'ledger' ? 'second' : d;

    start.subtract(multiplier * 900, interval);
    var url = API +
        '/network/fees?limit=1000&interval=' + d +
        '&start=' + start.format('YYYY-MM-DDTHH:mm:ss');
    chart.loading = true;
    chart.fadeOut();

    d3.json(url, function(err, resp) {
      var rows = resp.rows.filter(function(d) {
        return !!d.avg;
      });

      var lineData = rows.map(function(d) {
        return {
          x: moment(d.date),
          y: d.avg,
          y2: d.total,
          data: d
        }
      });

      chart.loading = false;
      chart.redraw(d, lineData);
    });
  }

  function parseDate (date, interval) {
    if (interval === 'day') return date.format('MMMM D');
    else if (interval === 'hour') return date.format('MMMM D [&middot] hh:mm A');
    else return date.format('MMMM D [&middot] hh:mm:ss A');
  }

  self.div.select('.interval .selected')[0][0].click();
}
