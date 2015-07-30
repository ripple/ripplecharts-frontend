angular.module( 'ripplecharts.trade-volume', [
  'ui.state'
])

.config(function config( $stateProvider ) {
  $stateProvider.state( 'tradeVolume', {
    url: '/trade-volume',
    views: {
      "main": {
        controller: 'TradeVolumeCtrl',
        templateUrl: 'trade-volume/trade-volume.tpl.html'
      }
    },
    data:{ }
  });
})

.controller( 'TradeVolumeCtrl', function TradeVolumeCtrl( $scope, $location, $interval) {

  var api = new ApiHandler(API);

  //source radio
  $scope.source = {
    type: 'live'
  };

  //historical dates
  $('#datepicker').datepicker({
    maxDate: '-1d',
    minDate: new Date(2013, 1, 31),
    dateFormat: "yy-mm-dd",
    onSelect: function(date) {
      $scope.$apply(function() {
        if ($scope.source.type === 'history') {
          $scope.loadTopMarkets(date);
        } else {
          $scope.source.type = 'history';
        }
      });
    }
  }).datepicker('setDate', new Date());

  //reload when source changes
  $scope.$watch('source.type', function() {
    var date;

    if ($scope.source.type === 'history') {
      date = moment($('#datepicker').datepicker('getDate')).format('YYYY-MM-DD');
    }

    $scope.loadTopMarkets(date);
  });

  //load the data
  $scope.loadTopMarkets = function (date) {
    api.exchangeRates({
      time: date,
      pairs:[
        {
          counter : {currency : 'USD', issuer : 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B'},
          base    : {currency:'XRP'}
        },
        {
          counter : {currency : 'JPY', issuer : 'r94s8px6kSw1uZ1MV98dhSRTvc6VMPoPcN'},
          base    : {currency:'XRP'}
        },
        {
          counter : {currency : 'CNY', issuer : 'rKiCet8SdvWxPXnAgYarFUXMh1zCPz432Y'},
          base    : {currency:'XRP'}
        },
        {
          counter : {currency : 'BTC', issuer : 'rMwjYedjc7qqtKYVLiAccJSmCwih4LnE2q'},
          base    : {currency:'XRP'}
        },
        {
          counter : {currency : 'EUR', issuer : 'rMwjYedjc7qqtKYVLiAccJSmCwih4LnE2q'},
          base    : {currency:'XRP'}
        }
      ]

    }, function(err, data) {
      var rates = [];
      if (data) {
        data.forEach(function(d) {
          if (d.rate) {
            rates.push({
              currency: d.counter.currency,
              issuer: d.counter.issuer,
              rate: d.rate
            });
          }
        });

        $scope.setNormalizationRates(rates);
      }
    });

    d3.json(API + '/topMarkets')
    .header("Content-Type", "application/json")
    .post(JSON.stringify({
      startTime: date,
      interval: 'day'
    }), function(err, resp) {
      var data = [];
      resp.components.forEach(function(c) {
        if (!c.convertedAmount) {
          return;
        }

        data.push({
          volume: c.convertedAmount,
          amount: c.amount,
          count: c.count,
          base_rate: c.rate,
          base_currency: c.base.currency,
          base_issuer: c.base.issuer,
          counter_currency: c.counter.currency,
          counter_issuer: c.counter.issuer,
          base: c.base.currency + (c.base.issuer ? '.' + c.base.issuer : ''),
          counter: c.counter.currency + (c.counter.issuer ? '.' + c.counter.issuer : '')
        });
      });

      $scope.chordData = data;
      $scope.update();
    });
  }

  //if live, reload every 5 minutes
  $interval(function() {
    if ($scope.source.type === 'live') {
      $scope.loadTopMarkets();
    }

  }, 300 * 1000);
});
