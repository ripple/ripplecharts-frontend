angular.module('txfeed', [])
.directive('txfeed', ['$timeout', '$sce', '$compile', function($timeout, $sce, $compile) {
  var numberFormat = d3.format(',');
  var currencyOrder = ['XAU', 'XAG', 'BTC', 'LTC', 'XRP', 'EUR', 'USD', 'GBP', 'AUD', 'NZD', 'USD', 'CAD', 'CHF', 'JPY', 'CNY'];

  return {
    restrict: 'AE',
    template: '<tx ng-repeat="tx in transactions" ng-class="tx.type" ' +
      'ng-click="loadTx(tx.hash)">' +
      '<span class="icon"></span>' +
      '<div class="type">{{tx.type}}</div>' +
      '<div class="account">{{tx.account}}</div>' +
      '<div class="summary" ng-bind-html="tx.summary"></div>' +
      '<div class="result" title="{{tx.result}}" ' +
      'ng-class="{success: tx.result === \'tesSUCCESS\'}">' +
      '{{tx.result === \'tesSUCCESS\' ? \'✓\' : \'x\'}}</div>' +
      '</tx>',
    link: function(scope, element, attr) {
      scope.transactions = [];
      var timer;

      scope.loadTx = function(hash) {
        scope.tx_hash = hash;
      };


      if (remote.isConnected()) {
        subscribe();
      } else {
        remote.connect()
        .then(subscribe)
        .catch(function(e) {
          console.log(e);
        });
      }

      function subscribe() {
        remote.connection.request({
          command: 'subscribe',
          streams: ['transactions']
        })
        .catch(function(e) {
          console.log(e);
        });

        remote.connection.on('transaction', handleTransaction);
      }

      function handleTransaction(tx) {
        var type = tx.transaction.TransactionType;
        var summary;
        var account;

        if (type === 'OfferCreate') {
          var c1 = tx.transaction.TakerPays.currency || 'XRP';
          var c2 = tx.transaction.TakerGets.currency || 'XRP';
          var direction = 'buy';
          var invert = currencyOrder.indexOf(c2) < currencyOrder.indexOf(c1);
          var rate = toDecimal(tx.transaction.TakerGets) / toDecimal(tx.transaction.TakerPays);
          var amount;
          var pair;

          if (invert) {
            rate = 1/rate;
            pair = c2 + '/' + c1;
            amount = tx.transaction.TakerPays;
            direction = 'sell';

          } else {
            pair = c1 + '/' + c2;
            amount = tx.transaction.TakerGets;
          }

          summary = direction +
            ' ' + displayAmount(tx.transaction.TakerGets) +
            ' @ <b>' + numberFormat(rate.toPrecision(5)) + '</b> ' + pair;
        } else if (type === 'OfferCancel') {
          summary = 'Offer <b>' + tx.transaction.OfferSequence + '</b> cancelled';
        } else if (type === 'Payment') {
          summary = displayAmount(tx.transaction.Amount) + ' sent to ' +
            '<account>' + tx.transaction.Destination + '</account>';
        } else if (type === 'TrustSet') {
          summary = '<account>' + tx.transaction.LimitAmount.issuer + '</account> up to ' +
            displayAmount(tx.transaction.LimitAmount);
        }

        scope.transactions.unshift({
          type: type,
          summary: $sce.trustAsHtml(summary),
          account: tx.transaction.Account,
          result: tx.meta.TransactionResult,
          hash: tx.transaction.hash
        });

        $timeout.cancel(timer);
        timer = $timeout(function() {
          scope.transactions = scope.transactions.slice(0,50);
        }, 250);
      }

      function toDecimal(amount) {
        if (typeof amount === 'string') {
          return Number(amount) / 1000000;
        } else {
          return Number(amount.value);
        }
      }

      function displayAmount(amount) {
        if (typeof amount === 'string') {
          return '<b>' + numberFormat(Number(amount) / 1000000) +
            '</b> XRP';
        } else {
          return '<b>' + numberFormat(Number(amount.value).toPrecision(8)) +
            '</b> ' + amount.currency;
        }
      }

      scope.$on('$destroy', function() {
        console.log("destroy");
        remote.connection.removeListener('transaction', handleTransaction);
      });
    }
  }
}]);
