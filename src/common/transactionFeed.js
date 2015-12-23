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

      remote.on('transaction_all', function(tx) {
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
      });

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
    }
  }
}]);

/*

var TransactionFeed = function (options) {
  var self = this;
  var transactions = [];
  var max = options.max || 100;

  var txAltText = {
    "send"               : "Sent payment to...",
    "receive"            : "Received payment from...",
    "intermediate"       : "Intermediated payment of...",
    "sendfailed"         : "Failed to send payment to...",
    "receivefailed"      : "Failed to receive payment from...",
    "intermediatefailed" : "Failed to intermediate payment of...",
    "trustout"           : "Sent trust to...",
    "trustinfailed"      : "Failed to receive trust from...",
    "trustoutfailed"     : "Failed to send trust to...",
    "trustin"            : "Received trust from...",
    "offerout"           : "Made offer to give...",
    "offerin"            : "Accepted offer and got...",
    "offeroutfailed"     : "Failed to make offer to give...",
    "offerinfailed"      : "Failed to accept offer and get...",
    "canceloffer"        : "Canceled offer",
    "accountset"         : "Edited account properties"
  };

  self.div = d3.select('#'+options.id).attr('class','transactionFeed');

//process incoming transaction from ripple-lib
  this.handleTransaction = function (data) {
    if (data.engine_result !== 'tesSUCCESS') return;
    addTransaction(data.transaction);

    var rows     = self.div.selectAll('.transaction').data(transactions);
    var rowEnter = rows.enter().append('div').attr('class','transaction');

    rowEnter.append("span").attr("class","time");
    rowEnter.append("span").attr("class","icon");
    rowEnter.append("span").attr("class","details");
    rowEnter.append("div").attr("class", "accounts");

    rows.select('.time').html(function(d){return self.absoluteTime(d.time)});
    rows.select('.icon')
      .attr('class', function(d){return d.type + " icon"})
      .attr('title', function(d){return txAltText[d.type]});

    rows.select('.details').html(function(d){
      var html = self.prepareAmount(d.amount1, d.currency1);
      if (d.amount2) html += "<i>for</i>" + self.prepareAmount(d.amount2, d.currency2);
      return html;
    });

    rows.select(".accounts").html(function(d){
      return self.accountSpan(d.from)+(d.to ? "<i>to</i>"+self.accountSpan(d.to) : "");
    });

  }

  this.accountSpan = function (address) {
    return "<span title='"+address+"'>"+address+"</span>";
  }

  function addTransaction (tx) {
    row = {
      time      : tx.date,
      type      : null,
      from      : tx.Account,
      to        : null,
      amount1   : null,
      currency1 : null,
      amount2   : null,
      currency2 : null,
      id        : tx.hash
    };


    if (tx.TransactionType == "Payment") {
      row.type    = "send";
      row.amount1 = tx.Amount;
      row.to      = tx.Destination;

    } else if (tx.TransactionType == "TrustSet") {
      row.type    = "trustout";
      row.amount1 = tx.LimitAmount;
      row.to      = tx.LimitAmount.issuer;

    } else if (tx.TransactionType == "OfferCreate") {
      row.type    = "offerout";
      row.amount1 = tx.TakerGets;
      row.amount2 = tx.TakerPays;

    } else if (tx.TransactionType == "OfferCancel") {
      row.type    = "canceloffer";

    } else {
      console.log("unhandled", tx.TransactionType);
      return;
    }

    if (row.amount1) {
      if (row.amount1.currency) {
        row.currency1 = row.amount1.currency;
        row.amount1   = row.amount1.value;
      } else {
        row.currency1 = "XRP";
        row.amount1   = row.amount1/1000000;
      }
    }
    if (row.amount2) {
      if (row.amount2.currency) {
        row.currency2 = row.amount2.currency;
        row.amount2   = row.amount2.value;
      } else {
        row.currency2 = "XRP";
        row.amount2   = row.amount2/1000000;
      }
    }

    transactions.unshift(row);
    transactions = transactions.slice(0,max);
  }

  this.prepareAmount = function (amount, currency) {
    var html = "";
    if (amount && currency) html = "<b>"+self.commas(amount)+"</b><small>"+currency+"</small>";
    return html;
  }

  this.absoluteDateOnly = function(secondsSince2000) {
    var d = new Date(0);
    d.setUTCSeconds(secondsSince2000+946684800);
    return d.getDate()+' '+['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]+' '+d.getFullYear()
  }

  this.absoluteTimeOnly = function(secondsSince2000) {
    var d = new Date(0);
    d.setUTCSeconds(secondsSince2000+946684800);
    var hours = d.getHours();
    var minutes = d.getMinutes();
    var seconds = d.getSeconds();
    var ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    minutes = minutes < 10 ? '0'+minutes : minutes;
    return strTime = ''+hours + ':' + minutes + '<small>:' + (seconds<10 ? '0'+seconds : seconds) + ' ' + ampm + "</small>";
  }

  this.absoluteDate = function(secondsSince2000) {
    var d = new Date(0);
    d.setUTCSeconds(secondsSince2000+946684800);
    return '<span class="date" title="'+
      self.absoluteTimeOnly(secondsSince2000)+'">'+
      self.absoluteDateOnly(secondsSince2000)+'</span>';
  }

  this.absoluteTime = function(secondsSince2000) {
    var d = new Date(0);
    d.setUTCSeconds(secondsSince2000+946684800);
    return '<span class="date" title="'+
      self.absoluteDateOnly(secondsSince2000)+'">'+
      self.absoluteTimeOnly(secondsSince2000)+'</span>';
  }

  this.commas = function (number, precision) {
    var parts = number.toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    if (precision && parts[1]) parts[1] = parts[1].substring(0,precision);
    return parts.join(".");
  }
}

*/

