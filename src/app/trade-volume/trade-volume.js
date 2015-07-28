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
    data:{ },
    resolve : {
      gateInit : function (gateways) {
        return gateways.promise;
      }
    }
  });
})

.controller( 'TradeVolumeCtrl', function TradeVolumeCtrl( $scope, $location, rippleName ) {

  var api = new ApiHandler(API);

/*
  $scope.$watch(function () {
    return $location.path();
  }, function (value) {
    var account = $location.path().substr(1);
    console.log(account);
    if (account && account.length < 21) {
      rippleName(account, function(address) {
        loadWallet(address);
      });
    } else if (account) {
      loadWallet(account);
    } else {
      loadTopMarkets();
    }
  });
*/

  //loadWallet('rBRXcf7BYs2CN7GfAAXjLQPEh7d46BP9RE');
  loadTopMarkets();

  api.exchangeRates({
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
        rates.push({
          currency: d.counter.currency,
          issuer: d.counter.issuer,
          rate: d.rate
        });
      });

      $scope.setNormalizationRates(rates, 'USD');
    }
  });

  function loadTopMarkets() {
    var url = 'https://api.ripplecharts.com/api/topMarkets';
    d3.json(url)
    .post({}, function(err, resp) {
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

  function loadWallet(account) {
    var url = 'http://52.6.25.253:7111/v2/accounts/'+account+'/exchanges?limit=1000&descending=true';
    d3.json(url, function (err, resp) {

      var agg = {};
      var data = [];

      resp.exchanges.forEach(function(ex) {

        if (ex.base_currency === 'XRP') {
          ex = {
            base_amount: ex.counter_amount,
            counter_amount: ex.base_amount,
            base_currency: ex.counter_currency,
            counter_currency: ex.base_currency,
            base_issuer: ex.counter_issuer
          }
        }

        var base = ex.base_currency + (ex.base_issuer ? '.' + ex.base_issuer : '');
        var counter = ex.counter_currency + (ex.counter_issuer ? '.' + ex.counter_issuer : '');
        var key = base + '.' + counter;

        if (!agg[key]) {
          agg[key] = {
            volume: 0,
            amount: 0,
            count: 0,
            base_rate: 0,
            base_amount: 0,
            counter_amount: 0,
            base: base,
            counter: counter,
            base_currency: ex.base_currency,
            base_issuer: ex.base_issuer,
            counter_currency: ex.counter_currency,
            counter_issuer: ex.counter_issuer
          };
        }

        agg[key].base_amount += Number(ex.base_amount);
        agg[key].counter_amount += Number(ex.counter_amount);
        agg[key].count++;
      });


      normalize(agg, draw);
    });

    function normalize(data, done) {
      var count = 0;
      var d;
      var base;
      var counter;

      for (var key in data) {
        d = data[key];

        if (d.base_currency !== 'XRP' && d.counter_currency !== 'XRP') {
          count++;
          normalizeAmount(d, function(amount) {
            count--;

            if (!count) {
              done(data);
            }
          });

        } else if (d.base_currency !== 'XRP') {
          d.volume = d.counter_amount
          d.amount = d.base_amount;
          d.base_rate = d.base_amount / d.counter_amount;
        } else {
          d.volume = d.base_amount;
          d.amount = d.counter_amount;
          d.base_rate = d.counter_amount / d.base_amount;
        }
      }


      if (!count) done(data);
    }

    function normalizeAmount(data, callback) {
      var url = 'http://52.6.25.253:7111/v2/normalize';
      url += '?amount='+data.base_amount+'&currency='+data.base_currency+'&issuer='+data.base_issuer;
      d3.json(url, function (err, resp) {
        data.amount = data.base_amount;
        data.volume = resp && resp.converted ? resp.converted : 0;
        data.base_rate = resp && resp.rate ? resp.rate : 0;
        callback();
      });
    }

    function draw(agg) {
      var data = [];

      for (var key in agg) {
        data.push(agg[key]);
      }

      console.log(data);
      $scope.chordData = data;
      $scope.update();
    }
  }
});
