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
      var timer;

      scope.tx_json = null;
      scope.mode = 'explain';

      scope.$watch('mode', setMode);

      scope.$watch('tx_hash', function() {
        if (scope.tx_hash) {
          loadTx(scope.tx_hash);
        } else {
          status.style('display', 'none');
        }
      });

      scope.reload = function() {
        console.log('reload');
        loadTx(scope.tx_hash);
      };

      function setMode(mode) {
        explainView.style('display', mode && mode === 'explain' ? 'block' : 'none');
        rawView.style('display', mode && mode === 'raw' ? 'block' : 'none');
      }

      /**
       * loadTx
       */

      function loadTx(hash) {
        var url = API + '/transactions/' + hash;

        scope.tx_json = null;
        explainView.html('');

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

        renderStatus(tx);
        renderDescription(tx);
        renderMemos(tx);
        renderFee(tx);
        renderFlags(tx);
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
          var html = '<H4>FLAGS:</h4>The transaction specified the following flags:<ul>';

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
        .html('<h4>TRANSACTION COST:</h4>Sending this transaction consumed ' +
        '<amount>' + displayAmount(tx.tx.Fee) + '</amount>.');
      }

      function renderStatus(tx) {
        var status = '<h4>STATUS:</h4>';

        status += tx.meta.TransactionResult === 'tesSUCCESS' ?
          'This transaction was successful' :
          'This transaction failed with a status code of <fail>' +
          tx.meta.TransactionResult + '</fail>';

        explainView.append('div')
        .attr('class', 'status')
        .html(status + ', and validated in ledger ' +
        '<ledger_index>' + tx.ledger_index + '</ledger_index>' +
        ' on <date>' + moment.utc(tx.date).format('LLL') + '<date>.');

      }

      function renderMeta(tx) {
        var meta = explainView.append('div')
        .attr('class', 'meta');
        var html = '<h4>AFFECTED LEDGER NODES:</h4>' +
          'It affected <b>' + tx.meta.AffectedNodes.length +
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

          switch(node.LedgerEntryType) {
            case 'AccountRoot':
              html += renderAccountRoot(action, node);
              break;
            case 'DirectoryNode':
              html += renderDirectoryNode(action, node);
              break;
            case 'Offer':
              html += renderOfferNode(action, node);
              break;
            case 'RippleState':
              html += renderRippleState(action, node);
              break;
            default:
              html += '<li>It ' + action +
            ((node.LedgerEntryType === 'Offer' ||
              node.LedgerEntryType === 'AccountRoot') ? ' an ' : ' a ') +
            '<type>' + node.LedgerEntryType + '</type> node</li>';
          }

        });

        meta.html(html + '</ul>');

        function renderRippleState(action, node) {
          var fields = node.FinalFields || node.NewFields;
          var prev = node.PreviousFields;
          var previousBalance = prev ? Number(prev.Balance.value) : 0;
          var finalBalance = Number(fields.Balance.value);
          var change;
          var account;
          var issuer;

          if (finalBalance < 0) {
            account = fields.HighLimit.issuer;
            issuer = fields.LowLimit.issuer;
            change = previousBalance - finalBalance;
            finalBalance = 0 - finalBalance;
          } else {
            account = fields.LowLimit.issuer;
            issuer = fields.HighLimit.issuer;
            change = finalBalance - previousBalance;
          }

          var html = '<li>It ' + action + ' a ' +
            '<b>' + fields.Balance.currency + '</b> ' +
            '<type>RippleState</type> ' +
            'node between <br/>' +
            '<account>' + account + '</account> and ' +
            '<account>' + issuer + '</account>';

          if (change) {
            html += '<ul><li>Balance changed by <b>' + commas(change.toPrecision(12)) +
              '</b> to <b>' + commas(finalBalance) +
              '</b> ' + fields.Balance.currency + '</li></ul>';
          }


          return html + '</li>';
        }

        function renderOfferNode(action, node) {
          var fields = node.FinalFields || node.NewFields;
          var html = '<li>It ' + action + ' a ' +
            '<b>' + (fields.TakerPays.currency || 'XRP') + '/' +
            (fields.TakerGets.currency || 'XRP') + '</b> ' +
            '<type>Offer</type> ' +
            'node of <account>' + fields.Account + '</account>';

          return html + '</li>';
        }

        function renderAccountRoot(action, node) {
          var fields = node.FinalFields || node.NewFields;
          var prev = node.PreviousFields;
          var previousBalance;
          var finalBalance;
          var html = '';

          if (fields && fields.Account) {
            html = '<li>It ' + action + ' the ' +
            '<type>AccountRoot</type> ' +
            'node of <account>' + fields.Account + '</account>';
          } else {
            html = '<li>It ' + action + ' an ' +
            '<type>AccountRoot</type> node';
          }

          if (fields && prev) {
            html += '<ul>';
            previousBalance = Number(prev.Balance);
            finalBalance = Number(fields.Balance);
            if (previousBalance < finalBalance) {
              html += '<li>Balance increased by <b>' +
                commas((finalBalance - previousBalance) / 1000000) +
                '</b> to <b>' + commas(finalBalance / 1000000) +
                '</b> XRP </li>';
            } else if (previousBalance > finalBalance) {
              html += '<li>Balance reduced by <b>' +
                commas((previousBalance - finalBalance) / 1000000) +
                '</b> to <b>' + commas(finalBalance / 1000000) +
                '</b> XRP </li>';
            }

            html += '</ul>';
          }

          return html;
        }

        function renderDirectoryNode(action, node) {
          var fields = node.FinalFields || node.NewFields;
          var html = '<li>It ' + action + ' a ' +
            '<type>DirectoryNode</type> ' +
            'node';

          if (fields.Owner) {
            html += ' owned by <account>' + fields.Owner + '</account>';
          }

          return html + '</li>';
        }
      }

      function renderMemos(tx) {
        var memos = explainView.append('div')
        .attr('class', 'memos');
        var html;

        if (tx.tx.Memos && tx.tx.Memos.length) {
          html = 'The transaction contains the following memos:<ul class="list">';
          tx.tx.Memos.forEach(renderMemo);
          html += '</ul>';
        } else {
          html = 'The transaction has no memos.';
        }

        memos.html('<h4>MEMOS:</h4>' + html);

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

          html += '<li><ul>';

          if (type) {
            html += '<li><label>Type:</label><span>' + type + '</span></li>';
          }

          if (format) {
            html += '<li><label>Format:</label><span>' + format + '</span></li>';
          }

          if (data) {
            html += '<li><label>Data:</label><span>' + data + '</span></li>';
          }

          html += '</ul></li>';
        }
      }

      function renderDescription(tx) {
        var html = '<h4>DESCRIPTION:</h4>';

        html += renderType(tx.tx.TransactionType);

        if (tx.tx.TransactionType === 'OfferCreate') {
          html += renderOfferCreate(tx);
        } else if (tx.tx.TransactionType === 'OfferCancel') {
          html += renderOfferCancel(tx);
        } else if (tx.tx.TransactionType === 'Payment') {
          html += renderPayment(tx);
        } else if (tx.tx.TransactionType === 'TrustSet') {
          html += renderTrustSet(tx);
        }

        html += '<br/>The transaction\'s sequence number is ' +
          '<b>' + tx.tx.Sequence + '</b>';


        explainView.append('div')
        .attr('class', 'description')
        .html(html);


        function renderType(type) {
          return 'This is a <type>' + type + '</type> Transaction.<br/>';
        }

        function renderTrustSet(tx) {
          return 'It establishes <b>' + commas(tx.tx.LimitAmount.value) + '</b>' +
            ' as the maximum amount of ' + tx.tx.LimitAmount.currency +
            ' that <account>' + tx.tx.Account + '</account> allows to be ' +
            ' held by <account>' + tx.tx.LimitAmount.issuer + '</account>.';
        }

        function renderPayment(tx) {

          var html = 'The payment is from' +
            '<account>' + tx.tx.Account + '</account> to ' +
            '<account>' + tx.tx.Destination + '</account>.';

          if (tx.tx.SourceTag) {
            html += '<br>The payment has a source tag: ' +
              '<tag>' + tx.tx.SourceTag + '</tag>';
          }

          if (tx.tx.DestinationTag) {
            html += '<br>The payment has a destination tag: ' +
              '<tag>' + tx.tx.DestinationTag + '</tag>';
          }

          html += '<br/>It was instructed to deliver ' +
            '<amount>' + displayAmount(tx.tx.Amount) + '</amount>';

          if (tx.tx.SendMax) {
            html += ' by spending up to <amount>' +
              displayAmount(tx.tx.SendMax) + '</amount>.';
          } else {
            html += '.';
          }

          return html;
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

          html = '<account>' + tx.tx.Account + '</account>' +
            ' offered to pay ' +
            '<amount>' + displayAmount(tx.tx.TakerGets) + '</amount>' +
            ' in order to receive ' +
            '<amount>' + displayAmount(tx.tx.TakerPays) + '</amount>.' +
            '<br/>The exchange rate for this offer is <amount><b>' +
            commas(rate.toPrecision(5)) + ' ' + pair + '</b></amount>.';

          if (tx.tx.OfferSequence) {
            html += '<br/>The transaction will also cancel ' +
              '<account>' + tx.tx.Account + '</account>\'s existing offer' +
              ' #<b>'+ tx.tx.OfferSequence + '</b>';
          }

          return html;
        }


        function renderOfferCancel(tx) {
          return 'The transaction will cancel ' +
            '<account>' + tx.tx.Account + '</account>' +
            ' offer #<b>' + tx.tx.OfferSequence + '</b>.';
        }
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
