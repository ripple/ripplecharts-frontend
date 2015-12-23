angular.module('txsplain', [])
.directive('txsplain', ['$http', 'rippleName', function($http, rippleName) {
  var commas = d3.format(',');
  var currencyOrder = ['XAU', 'XAG', 'BTC', 'LTC', 'XRP', 'EUR', 'USD', 'GBP', 'AUD', 'NZD', 'USD', 'CAD', 'CHF', 'JPY', 'CNY'];

var hexMatch = new RegExp('^(0x)?[0-9A-Fa-f]+$');
var base64Match = new RegExp('^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{4})([=]{1,2})?$');

  var txFlags = {
    all: {
      0x80000000: 'tfFullyCanonicalSig'
    },
    Payment: {
      0x00010000: 'tfNoDirectRipple',
      0x00020000: 'tfPartialPayment',
      0x00040000: 'tfLimitQuality'
    },
    AccountSet: {
      0x00010000: 'tfRequireDestTag',
      0x00020000: 'tfOptionalDestTag',
      0x00040000: 'tfRequireAuth',
      0x00080000: 'tfOptionalAuth',
      0x00100000: 'tfDisallowXRP',
      0x00200000: 'tfAllowXRP'
    },
    OfferCreate: {
      0x00010000: 'tfPassive',
      0x00020000: 'tfImmediateOrCancel',
      0x00040000: 'tfFillOrKill',
      0x00080000: 'tfSell'
    },
    TrustSet: {
      0x00010000: 'tfSetAuth',
      0x00020000: 'tfSetNoRipple',
      0x00040000: 'tfClearNoRipple',
      0x00100000: 'tfSetFreeze',
      0x00200000: 'tfClearFreeze'
    },
    OfferCancel: {},
    SetRegularKey: {},
    SetFee: {}
  };

  var PATHSTEP_RIPPLING = 0x01;
  var PATHSTEP_REDEEMING = 0x02;
  var PATHSTEP_ORDERBOOK = 0x10;
  var PATHSTEP_ISSUER = 0x20;
  var RIPPLE_EPOCH = 946684800;


  return {
    restrict: 'AE',
    template: '<div class="contents">' +
      '<div class="status"></div>' +
      '<div class="control">' +
      '<span ng-click="mode = \'explain\'" ng-class="{selected: mode === \'explain\'}">Description</span>' +
      '<span ng-click="mode = \'raw\'" ng-class="{selected: mode === \'raw\'}">Raw</span>' +
      '</div>' +
      '<div class="sub explain-view"></div>' +
      '<div class="sub raw-view">' +
      '<json-formatter json="tx_json" open="3"></json-formatter>' +
      '</div>' +
      '</div>',
    link: function(scope, element, attr) {

      var div = d3.select(element[0]);
      var status = div.select('.status');
      var explainView = div.select('.explain-view');
      var rawView = div.select('.raw-view');

      scope.tx_json = null;
      scope.mode = 'explain';

      scope.$watch('mode', setMode);

      scope.$watch('tx_hash', function() {

        scope.tx_json = null;
        explainView.html('');

        if (scope.tx_hash) {
          loadTx(scope.tx_hash);
        } else {
          status.style('display', 'none');
        }
      });

      function setMode(mode) {
        explainView.style('display', mode && mode === 'explain' ? 'block' : 'none');
        rawView.style('display', mode && mode === 'raw' ? 'block' : 'none');
      }

      /**
       * loadTx
       */

      function loadTx(hash) {
        var url = API + '/transactions/' + hash;

        $http({
          method: 'get',
          url: url
        })
        .then(function(resp) {
          status.style('display', 'none').html('');
          scope.tx_json = resp.data.transaction;
          displayTx();
        },
        function(err) {
          status.attr('class', 'alert alert-danger')
          .style('display','block')
          .html(err.data.message);
        })
      }

      /**
       * displayTx
       */
      function displayTx() {
        var tx = scope.tx_json;

        if (tx.tx.TransactionType === 'OfferCreate') {
          renderOfferCreate(tx);
        } else if (tx.tx.TransactionType === 'OfferCancel') {
          renderOfferCancel(tx);
        } else if (tx.tx.TransactionType === 'Payment') {
          renderPayment(tx);
        } else if (tx.tx.TransactionType === 'TrustSet') {
          renderTrustSet(tx);
        } else {
          explainView.append('div')
          .attr('class', 'description')
          .html('This is a <type>' + tx.tx.TransactionType +
            '</type> Transaction.');
        }

        renderFlags(tx);
        renderFee(tx);
        renderSequence(tx);
        renderStatus(tx);
        renderMemos(tx);
        renderMeta(tx);

        // add ripple names
        div.selectAll('account').each(function(){
          var div = d3.select(this);
          var account = div.html();

          rippleName(account, function(name) {
            if (name) {
              div.html('<t>~</t><name>' +
                name + '</name> <addr>(' + account + ')</addr>');
            }
          });
        });
      }

      function renderFlags(tx) {
        var flags = parseFlags(tx);
        if (flags.length) {
          var html = 'The transaction specified the following flags:<ul>';

          flags.forEach(function(flag) {
            html += '<li>' + flag + '</li>';
          });

          explainView.append('div')
          .attr('class', 'flags')
          .html(html + '</ul>');
        }
      }

      function renderFee(tx) {
        explainView.append('div')
        .attr('class', 'fee')
        .html('Sending this transaction consumed ' +
        '<amount>' + displayAmount(tx.tx.Fee) + '</amount>.');
      }

      function renderSequence(tx) {
        explainView.append('div')
        .attr('class', 'sequence')
        .html('The transaction\'s sequence number is ' +
          '<b>' + tx.tx.Sequence + '</b>');
      }

      function renderStatus(tx) {
        var status = tx.meta.TransactionResult === 'tesSUCCESS' ?
          'This transaction was successful' :
          'This transaction failed with a status code of <fail>' +
          tx.meta.TransactionResult + '</fail>';

        explainView.append('div')
        .attr('class', 'status')
        .html(status + ', and validated in ledger ' +
        '<ledger_index>' + tx.ledger_index + '</ledger_index>' +
        ' on <date>' + moment.utc(tx.date).format('LLL') + '<date>');

      }

      function renderMeta(tx) {
        var meta = explainView.append('div')
        .attr('class', 'meta');
        var html = 'It affected <b>' + tx.meta.AffectedNodes.length +
          '</b> nodes in the ledger:<ul class="affected-nodes">';

        tx.meta.AffectedNodes.forEach(function(a) {
          var action;
          if (a.DeletedNode) {
            action = 'deleted';
            node = a.DeletedNode;
          } else if (a.ModifiedNode) {
            action = 'modified';
            node = a.ModifiedNode;
          } else if (a.CreatedNode) {
            action = 'created';
            node = a.CreatedNode;
          } else {
            return;
          }

          html += '<li>It ' + action +
            ((node.LedgerEntryType === 'Offer' ||
              node.LedgerEntryType === 'AccountRoot') ? ' an ' : ' a ') +
            '<type>' + node.LedgerEntryType + '</type> node</li>';
        });

        meta.html(html + '</ul>');
      }

      function renderMemos(tx) {
        if (!tx.tx.Memos || !tx.tx.Memos.length) {
          return;
        }

        var memos = explainView.append('div')
        .attr('class', 'memos');
        var html = 'The transaction contains the following memos:<ul>';

        tx.tx.Memos.forEach(renderMemo);

        memos.html(html + '</ul>');

        function renderMemo(m, i) {
          var data = m.Memo.MemoData;
          var type = m.Memo.MemoType;
          var format = m.Memo.MemoFormat;

          if (hexMatch.test(type)) {
            type = decodeHex(type) + ' <small>(decoded hex)</small>';
          }

          if (hexMatch.test(format)) {
            format = decodeHex(format) + ' <small>(decoded hex)</small>';
          }

          if (hexMatch.test(data)) {
            data = decodeHex(data) + ' <small>(decoded hex)</small>';
          }

          html += '<li>' + (i+1) + ').<ul>';

          if (type) {
            html += '<li><label>Type:</label><span>' + type + '</span></li>';
          }

          if (format) {
            html += '<li><label>Format:</label><span>' + format + '</span></li>';
          }

          if (data) {
            html += '<li><label>Data:</label><span>' + data + '</span></li>';
          }
        }
      }

      function renderTrustSet(tx) {
        explainView.append('div')
        .attr('class', 'description')
        .html('This is a <type>TrustSet</type> Transaction.' +
          ' It establishes <b>' + commas(tx.tx.LimitAmount.value) + '</b>' +
          ' as the maximum amount of ' + tx.tx.LimitAmount.currency +
          ' that <account>' + tx.tx.Account + '</account> allows to be ' +
          ' held by <account>' + tx.tx.LimitAmount.issuer + '</account>.');
      }

      function renderPayment(tx) {
        var description = explainView.append('div')
        .attr('class', 'description');

        var text = 'This is a <type>Payment</type> from ' +
          '<account>' + tx.tx.Account + '</account> to ' +
          '<account>' + tx.tx.Destination + '</account>.';

        if (tx.tx.SourceTag) {
          text += '<br>The payment has a source tag: ' +
            '<tag>' + tx.tx.SourceTag + '</tag>';
        }

        if (tx.tx.DestinationTag) {
          text += '<br>The payment has a destination tag: ' +
            '<tag>' + tx.tx.DestinationTag + '</tag>';
        }

        text += '<br/>It was instructed to deliver ' +
          '<amount>' + displayAmount(tx.tx.Amount) + '</amount>';

        if (tx.tx.SendMax) {
          text += ' by spending up to <amount>' +
            displayAmount(tx.tx.SendMax) + '</amount>.';
        } else {
          text += '.';
        }

        description.html(text);
      }

      function renderOfferCreate(tx) {
        var c1 = tx.tx.TakerPays.currency || 'XRP';
        var c2 = tx.tx.TakerGets.currency || 'XRP';
        var direction = 'buy';
        var invert = currencyOrder.indexOf(c2) < currencyOrder.indexOf(c1);
        var rate = toDecimal(tx.tx.TakerGets) / toDecimal(tx.tx.TakerPays);
        var amount;
        var pair;
        var html;

        if (invert) {
          rate = 1/rate;
          pair = c2 + '/' + c1;
          amount = tx.tx.TakerPays;
          direction = 'sell';

        } else {
          pair = c1 + '/' + c2;
          amount = tx.tx.TakerGets;
        }

        html = 'This is an <type>OfferCreate</type>, where ' +
          '<account>' + tx.tx.Account + '</account>' +
          ' offered to pay ' +
          '<amount>' + displayAmount(tx.tx.TakerGets) + '</amount>' +
          ' in order to receive ' +
          '<amount>' + displayAmount(tx.tx.TakerPays) + '</amount>.' +
          '<div>The exchange rate for this offer is <amount><b>' +
          commas(rate.toPrecision(5)) + ' ' + pair + '</b></amount>.</div>';

        if (tx.tx.OfferSequence) {
          html += 'The transaction will also cancel the existing offer' +
            ' with sequence number <b>'+ tx.tx.OfferSequence + '</b>';
        }

        explainView.append('div')
        .attr('class', 'description')
        .html(html);
      }


      function renderOfferCancel(tx) {
        explainView.append('div')
        .attr('class', 'description')
        .html('This is an <type>OfferCancel</type> transaction from ' +
          '<account>' + tx.tx.Account + '</account>.<br/>' +
          'It is instructed to cancel offer #' +
          '<b>' + tx.tx.OfferSequence + '<b>.');
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
          return '<b>' + commas(Number(amount) / 1000000) + '</b> XRP';
        } else {
          return '<b>' + commas(Number(amount.value).toPrecision(8)) + '</b> ' +
            amount.currency + '.' +
            '<account>' + amount.issuer + '</account>';
        }
      }

      function parseFlags(tx) {
        var flags = txFlags[tx.tx.TransactionType];
        var num = tx.tx.Flags;
        var list = [];
        var key;

        // flags for all transactions
        for(key in txFlags.all) {
          if (num & key) {
            list.push(txFlags.all[key]);
          }
        }

        // type specific flags
        for(key in flags) {
          if (num & key) {
            list.push(flags[key]);
          }
        }

        return list;
      }


      function decodeHex(hex) {
        var str = '';
        for (var i = 0; i < hex.length; i += 2) {
            var v = parseInt(hex.substr(i, 2), 16);
            if (v) str += String.fromCharCode(v);
        }
        return str;
      }
    }
  };
}]);
