angular.module( 'ripplecharts.metrics', [
  'ui.state',
  'ui.bootstrap'
])

.config(function config( $stateProvider ) {
  $stateProvider.state( 'metrics', {
    url: '/metrics',
    views: {
      "main": {
        controller: 'MetricsCtrl',
        templateUrl: 'metrics/metrics.tpl.html'
      }
    },
    data:{ pageTitle: 'Network Metrics' }
  });
})

.controller( 'MetricsCtrl', function MetricsCtrl( $scope ) {

  var timeFormat = 'YYYY-MM-DD';
  var commas = d3.format(',');
  var intervalFormat = d3.format(',.2f');
  var base = API + '/stats/';
  var end = moment.utc();
  var start = moment(end).subtract(1000, 'days');
  var range = '&start=' + start.format(timeFormat) +
      '&end=' + end.format(timeFormat);
  var url;

  //create tx count chart
  var txCountChart = new LineChart({
    id: 'tx-count',
    rightTitle: "# of TX",
    resize: true,
    tooltip: function (d, increment) {
      return "<div><span>Date:</span>"+ d.x.format('YYYY-MM-DD') + '</div>' +
        '<div><span># of Transactions:</span>' + commas(d.y) + '</div>';
      }
  });

  url = base + 'metric/transaction_count?limit=1000' + range;
  txCountChart.loading = true;
  txCountChart.fadeOut();
  d3.json(url, function(err, resp) {
    var lineData = resp.stats.map(function(d) {
      return {
        x: moment.utc(d.date),
        y: d.transaction_count
      }
    });

    txCountChart.loading = false;
    txCountChart.redraw('day', lineData);
  });

  //create ledger count chart
  var ledgerCountChart = new LineChart({
    id: 'ledger-count',
    rightTitle: "# of Ledgers",
    resize: true,
    tooltip: function (d, increment) {
      return "<div><span>Date:</span>"+ d.x.format('YYYY-MM-DD') + '</div>' +
        '<div><span># ledgers:</span>' + commas(d.y) + '</div>';
      }
  });

  url = base + 'metric/ledger_count?limit=1000' + range;
  ledgerCountChart.loading = true;
  ledgerCountChart.fadeOut();
  d3.json(url, function(err, resp) {
    var lineData = resp.stats.map(function(d) {
      return {
        x: moment.utc(d.date),
        y: d.ledger_count
      }
    });

    ledgerCountChart.loading = false;
    ledgerCountChart.redraw('day', lineData);
  });

  //create new line chart
  var ledgerIntervalChart = new LineChart({
    id: 'ledger-interval',
    rightTitle: "Ledger Interval",
    resize: true,
    tooltip: function (d, increment) {
      return "<div><span>Date:</span>"+ d.x.format('YYYY-MM-DD') + '</div>' +
        '<div><span>Ledger Interval:</span>' + intervalFormat(d.y) + 's</div>';
      }
  });

  url = base + 'metric/ledger_interval?limit=1000' + range;
  ledgerIntervalChart.loading = true;
  ledgerIntervalChart.fadeOut();
  d3.json(url, function(err, resp) {
    var lineData = resp.stats.map(function(d) {
      return {
        x: moment.utc(d.date),
        y: d.ledger_interval
      }
    });

    ledgerIntervalChart.loading = false;
    ledgerIntervalChart.redraw('day', lineData);
  });

  //create payment count chart
  var paymentCountChart = new LineChart({
    id: 'payment-count',
    rightTitle: "# of Payments",
    resize: true,
    tooltip: function (d, increment) {
      return "<div><span>Date:</span>"+ d.x.format('YYYY-MM-DD') + '</div>' +
        '<div><span># Payments:</span>' + commas(d.y) + '</div>';
      }
  });

  url = base + 'metric/payments_count?limit=1000' + range;
  paymentCountChart.loading = true;
  paymentCountChart.fadeOut();
  d3.json(url, function(err, resp) {
    var lineData = resp.stats.map(function(d) {
      return {
        x: moment.utc(d.date),
        y: d.payments_count
      }
    });

    paymentCountChart.loading = false;
    paymentCountChart.redraw('day', lineData);
  });

  //create exchange count chart
  var exchangeCountChart = new LineChart({
    id: 'exchange-count',
    rightTitle: "# of Exchanges",
    resize: true,
    tooltip: function (d, increment) {
      return "<div><span>Date:</span>"+ d.x.format('YYYY-MM-DD') + '</div>' +
        '<div><span># Exchanges:</span>' + commas(d.y) + '</div>';
      }
  });

  url = base + 'metric/exchanges_count?limit=1000' + range;
  exchangeCountChart.loading = true;
  exchangeCountChart.fadeOut();
  d3.json(url, function(err, resp) {
    var lineData = resp.stats.map(function(d) {
      return {
        x: moment.utc(d.date),
        y: d.exchanges_count
      }
    });

    exchangeCountChart.loading = false;
    exchangeCountChart.redraw('day', lineData);
  });

  $scope.$on("$destroy", function(){
  });


  //create network fees chart
  var networkFeeChart = new NetworkFees({
    id: 'network-fees',
    resize: true
  });

  //create transactions by type
  var transactionsByType = new TransactionStats({
    id: 'transaction-stats-type',
    metric: 'type',
    resize: true
  });

  //create transactions by type
  var transactionsByResult = new TransactionStats({
    id: 'transaction-stats-result',
    metric: 'result',
    resize: true
  });

  $scope.$on("$destroy", function(){
  });
});
