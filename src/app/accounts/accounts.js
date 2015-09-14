angular.module( 'ripplecharts.accounts', [
  'ui.state',
  'ui.bootstrap'
])

.config(function config( $stateProvider ) {
  $stateProvider.state( 'accounts', {
    url: '/accounts',
    views: {
      "main": {
        controller: 'AccountsCtrl',
        templateUrl: 'accounts/accounts.tpl.html'
      }
    },
    data:{ pageTitle: 'Accounts' }
  });
})

.controller( 'AccountsCtrl', function AccountsCtrl( $scope ) {

  var timeFormat = d3.time.format("%Y-%m-%d");

  accounts = new TotalAccounts({
    url    : API,
    id     : 'totalAccounts',
    resize : true
  });

  //create tx count chart
  var txCountChart = new LineChart({
    id: 'tx-count',
    rightTitle: "# of TX",
    resize: true,
    tooltip: function (d, increment) {
      return "<div><span>Date:</span>"+ d.x.format('YYYY-MM-DD') + '</div>' +
        '<div><span># of Transactions:</span>' + d.y + '</div>';
      }
  });

  txCountChart.loading = true;
  txCountChart.fadeOut();
  d3.json('http://data.ripple.com/v2/stats/metric/transaction_count?limit=1000', function(err, resp) {
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
        '<div><span># ledgers:</span>' + d.y.toFixed(2) + '</div>';
      }
  });

  ledgerCountChart.loading = true;
  ledgerCountChart.fadeOut();
  d3.json('http://data.ripple.com/v2/stats/metric/ledger_count?limit=1000', function(err, resp) {
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
        '<div><span>Ledger Interval:</span>' + d.y.toFixed(2) + '</div>';
      }
  });

  ledgerIntervalChart.loading = true;
  ledgerIntervalChart.fadeOut();
  d3.json('http://data.ripple.com/v2/stats/metric/ledger_interval?limit=1000', function(err, resp) {
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
    rightTitle: "# of Ledgers",
    resize: true,
    tooltip: function (d, increment) {
      return "<div><span>Date:</span>"+ d.x.format('YYYY-MM-DD') + '</div>' +
        '<div><span># Payments:</span>' + d.y + '</div>';
      }
  });

  paymentCountChart.loading = true;
  paymentCountChart.fadeOut();
  d3.json('http://data.ripple.com/v2/stats/metric/payments_count?limit=1000', function(err, resp) {
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
    rightTitle: "# of Ledgers",
    resize: true,
    tooltip: function (d, increment) {
      return "<div><span>Date:</span>"+ d.x.format('YYYY-MM-DD') + '</div>' +
        '<div><span># Exchanges:</span>' + d.y + '</div>';
      }
  });

  exchangeCountChart.loading = true;
  exchangeCountChart.fadeOut();
  d3.json('http://data.ripple.com/v2/stats/metric/exchanges_count?limit=1000', function(err, resp) {
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
    accounts.suspend();  //remove the resize listener
  });
});
