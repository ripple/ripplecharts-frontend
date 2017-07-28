'use strict'

angular.module('txsplain', [])
.directive('txsplain', ['$http', 'rippleName', function($http, rippleName) {
  var commas = d3.format(',')
  var currencyOrder = [
    'XAU', 'XAG', 'BTC', 'LTC', 'XRP',
    'EUR', 'USD', 'GBP', 'AUD', 'NZD',
    'USD', 'CAD', 'CHF', 'JPY', 'CNY'
  ]

  var hexMatch = new RegExp('^(0x)?[0-9A-Fa-f]+$')
  // var base64Match = new RegExp('^(?:[A-Za-z0-9+/]{4})*' +
  //                             '(?:[A-Za-z0-9+/]{2}==|' +
  //                             '[A-Za-z0-9+/]{3}=|' +
  //                             '[A-Za-z0-9+/]{4})([=]{1,2})?$')

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
  }

  // var PATHSTEP_RIPPLING = 0x01
  // var PATHSTEP_REDEEMING = 0x02
  // var PATHSTEP_ORDERBOOK = 0x10
  // var PATHSTEP_ISSUER = 0x20
  var RIPPLE_EPOCH = 946684800

  function renderNumber(d) {
    var parts = commas(d).split('.')
    return parts[0] + (parts[1] ?
      '<decimal>.' + parts[1] + '</decimal>' : '')
  }

  function toDecimal(amount) {
    if (typeof amount === 'string') {
      return Number(amount) / 1000000
    } else if (amount) {
      return Number(amount.value)
    }

    return undefined
  }

  function displayAmount(amount, isFee) {
    if (isFee) {
      return '<b>' + renderNumber(Number(amount) / 1000000) + '</b> XRP'
    } else if (typeof amount === 'string') {
      return '<b>' + renderNumber(Number(amount) / 1000000) + '</b> XRP'
    } else {
      return '<b>' + renderNumber(Number(amount.value).toPrecision(8)) +
        '</b> ' + amount.currency + '.' +
        '<account>' + amount.issuer + '</account>'
    }
  }

  function parseFlags(tx) {
    var flags = txFlags[tx.tx.TransactionType]
    var num = tx.tx.Flags
    var list = []
    var key

    // flags for all transactions
    for (key in txFlags.all) {
      if (num & key) {
        list.push(txFlags.all[key])
      }
    }

    // type specific flags
    for (key in flags) {
      if (num & key) {
        list.push(flags[key])
      }
    }

    return list
  }


  function decodeHex(hex) {
    var str = ''
    for (var i = 0; i < hex.length; i += 2) {
      var v = parseInt(hex.substr(i, 2), 16)
      str += v ? String.fromCharCode(v) : ''
    }
    return str
  }

  function getBalanceChange(node) {
    var fields = node.FinalFields || node.NewFields
    var prev = node.PreviousFields
    var account = fields && fields.Account

    if (fields && prev) {
      var previousBalance = Number(prev.Balance)
      var finalBalance = Number(fields.Balance)
      if (account && previousBalance !== finalBalance) {
        return {account: account, change: finalBalance - previousBalance}
      }
    }
  }

  function getBalanceChanges(meta) {
    return meta.AffectedNodes.map(function(node) {
        return node.ModifiedNode ? getBalanceChange(node.ModifiedNode) : false
      }).filter(function(change) {
        return change && change.change
      })
  }

  function getEscrowDeletedNode(tx) {
    return tx.meta.AffectedNodes.map(function(node) {
        return node.DeletedNode &&
          node.DeletedNode.LedgerEntryType == 'Escrow' ? node.DeletedNode : false
      }).filter(function(node) {
        return node
      })[0]
  }

  return {
    restrict: 'AE',
    template: '<div class="contents">' +
      '<div class="status"></div>' +
      '<div class="control">' +
      '<span ng-click="mode = \'explain\'" ' +
      'ng-class="{selected: mode === \'explain\'}">Description</span>' +
      '<span ng-click="mode = \'raw\'" ' +
      'ng-class="{selected: mode === \'raw\'}">Raw</span>' +
      '</div>' +
      '<div class="sub explain-view"></div>' +
      '<div class="sub raw-view">' +
      '<json-formatter json="tx_json" open="3"></json-formatter>' +
      '</div>' +
      '</div>',
    link: function(scope, element) {

      var div = d3.select(element[0])
      var status = div.select('.status')
      var explainView = div.select('.explain-view')
      var rawView = div.select('.raw-view')

      // set mode
      function setMode(mode) {
        explainView.style('display', mode && mode === 'explain' ?
                          'block' : 'none')
        rawView.style('display', mode && mode === 'raw' ?
                      'block' : 'none')
      }

      // render Flags
      function renderFlags(tx) {
        var flags = parseFlags(tx)
        if (flags.length) {
          var html = '<H4>FLAGS:</h4>' +
              'The transaction specified the following flags:<ul>'

          flags.forEach(function(flag) {
            html += '<li>' + flag + '</li>'
          })

          explainView.append('div')
          .attr('class', 'flags')
          .html(html + '</ul>')
        }
      }

      // render Fee
      function renderFee(tx) {
        explainView.append('div')
        .attr('class', 'fee')
        .html('<h4>TRANSACTION COST:</h4>Sending this transaction consumed ' +
        '<amount>' + displayAmount(tx.tx.Fee, true) + '</amount>.')
      }

      // render stats
      function renderStatus(tx) {
        var statusText = '<h4>STATUS:</h4>'

        statusText += tx.meta.TransactionResult === 'tesSUCCESS' ?
          'This transaction was successful' :
          'This transaction failed with a status code of <fail>' +
          tx.meta.TransactionResult + '</fail>'

        explainView.append('div')
        .attr('class', 'status')
        .html(statusText + ', and validated in ledger ' +
        '<ledger_index>' + tx.ledger_index + '</ledger_index>' +
        ' on <date>' + moment.utc(tx.date).format('LLL') + '<date>.')

      }

      // render Meta
      function renderMeta(tx) {
        var meta = explainView.append('div')
        .attr('class', 'meta')
        var d = '<h4>AFFECTED LEDGER NODES:</h4>' +
          'It affected <b>' + tx.meta.AffectedNodes.length +
          '</b> nodes in the ledger:<ul class="affected-nodes">'

        var created = []
        var modified = []
        var deleted = []

        // render RippleSate
        function renderRippleState(action, node) {
          var fields = node.FinalFields || node.NewFields
          var prev = node.PreviousFields
          var previousBalance = prev && prev.Balance ?
              Number(prev.Balance.value) : 0
          var finalBalance = Number(fields.Balance.value)
          var change
          var account
          var issuer

          if (finalBalance < 0) {
            account = fields.HighLimit.issuer
            issuer = fields.LowLimit.issuer
            finalBalance = 0 - finalBalance
            previousBalance = 0 - previousBalance

          } else {
            account = fields.LowLimit.issuer
            issuer = fields.HighLimit.issuer
          }

          change = finalBalance - previousBalance

          var html = '<li>It ' + action + ' a ' +
            '<b>' + fields.Balance.currency + '</b> ' +
            '<type>RippleState</type> ' +
            'node between <br/>' +
            '<account>' + account + '</account> and ' +
            '<account>' + issuer + '</account>'

          if (change) {
            html += '<ul><li>Balance changed by ' +
              '<b>' + renderNumber(change.toPrecision(12)) +
              '</b> from <b>' + renderNumber(previousBalance) +
              '</b> to <b>' + renderNumber(finalBalance) +
              '</b> ' + fields.Balance.currency + '</li></ul>'
          }


          return html + '</li>'
        }

        // render offer changes
        function renderOfferChanges(node) {
          var html = ''
          var paysCurrency = node.FinalFields.TakerPays.currency || 'XRP'
          var paysIssuer = node.FinalFields.TakerPays.issuer || ''
          var getsCurrency = node.FinalFields.TakerGets.currency || 'XRP'
          var getsIssuer = node.FinalFields.TakerGets.issuer || ''

          var finalPays = toDecimal(node.FinalFields.TakerPays)
          var finalGets = toDecimal(node.FinalFields.TakerGets)
          var prevPays = toDecimal(node.PreviousFields.TakerPays)
          var prevGets = toDecimal(node.PreviousFields.TakerGets)

          var changePays = prevPays - finalPays
          var changeGets = prevGets - finalGets

          if (prevPays && finalPays) {
            html += '<li>TakerPays decreased by <b>' +
              renderNumber(changePays) +
              '</b><br/> from <b>' + renderNumber(prevPays) +
              '</b> to <b>' + renderNumber(finalPays) +
              '</b> ' + paysCurrency +
              (paysIssuer ? '.<account>' + paysIssuer + '</account>' : '') +
              '</li>'
          }

          if (prevGets && finalGets) {
            html += '<li>TakerGets decreased by <b>' +
              renderNumber(changeGets) +
              '</b><br/> from <b>' + renderNumber(prevGets) +
              '</b> to <b>' + renderNumber(finalGets) +
              '</b> ' + getsCurrency +
              (getsIssuer ? '.<account>' + getsIssuer + '</account>' : '') +
              '</li>'
          }

          return html
        }

        // render Offer
        function renderOfferNode(action, node) {
          var fields = node.FinalFields || node.NewFields
          var html = '<li>It ' + action + ' a ' +
            '<b>' + (fields.TakerPays.currency || 'XRP') + '/' +
            (fields.TakerGets.currency || 'XRP') + '</b> ' +
            '<type>Offer</type> ' +
            'node of <account>' + fields.Account + '</account><ul>' +
            '<li>The offer\'s Sequence number is ' + fields.Sequence + '.</li>'

          if (action === 'created' &&
              tx.tx.TransactionType === 'OfferCreate' &&
              tx.tx.Account === fields.Account &&
              tx.tx.Sequence === fields.Sequence &&
              tx.tx.OfferSequence) {
            html += '<li>This offer replaces offer #' +
              tx.tx.OfferSequence + '.</li>'

          } else if (action === 'modified') {
            html += '<li> the offer was partially filled.</li>' +
              renderOfferChanges(node)


          } else if (action === 'deleted' &&
              (fields.TakerPays === '0' ||
               fields.TakerPays.value === '0')) {
            html += '<li>The offer was filled.</li>' +
              renderOfferChanges(node)

          } else if (action === 'deleted' &&
                     tx.tx.TransactionType === 'OfferCancel') {
            html += '<li>The offer was cancelled.</li>'

          } else if (action === 'deleted' &&
                     tx.tx.TransactionType === 'OfferCreate' &&
                     tx.tx.Account === fields.Account &&
                     tx.tx.OfferSequence === fields.Sequence) {
            html += '<li>This offer was replaced by the new offer #' +
              tx.tx.Sequence + '.</li>'

          } else if (action === 'deleted') {
            html += '<li>The offer was partially filled, ' +
              'then cancelled due to lack of funds.</li>'
          }

          return html + '</ul></li>'
        }

        // render AccountRoot
        function renderAccountRoot(action, node) {
          var fields = node.FinalFields || node.NewFields
          var prev = node.PreviousFields
          var previousBalance
          var finalBalance
          var html = ''

          if (fields && fields.Account) {
            html = '<li>It ' + action + ' the ' +
            '<type>AccountRoot</type> ' +
            'node of <account>' + fields.Account + '</account><ul>'
          } else {
            html = '<li>It ' + action + ' an ' +
            '<type>AccountRoot</type> node<ul>'
          }

          if (fields && prev) {
            previousBalance = Number(prev.Balance)
            finalBalance = Number(fields.Balance)
            if (previousBalance < finalBalance) {
              html += '<li>Balance increased by <b>' +
                renderNumber((finalBalance - previousBalance) / 1000000) +
                '</b> from <b>' + renderNumber(previousBalance / 1000000) +
                '</b> to <b>' + renderNumber(finalBalance / 1000000) +
                '</b> XRP </li>'
            } else if (previousBalance > finalBalance) {
              html += '<li>Balance reduced by <b>' +
                renderNumber((previousBalance - finalBalance) / 1000000) +
                '</b> from <b>' + renderNumber(previousBalance / 1000000) +
                '</b> to <b>' + renderNumber(finalBalance / 1000000) +
                '</b> XRP </li>'
            }
          }

          return html + '</ul>'
        }

        // render DirectoryNode
        function renderDirectoryNode(action, node) {
          var fields = node.FinalFields || node.NewFields
          var html = '<li>It ' + action + ' a ' +
            '<type>DirectoryNode</type> ' +
            'node'

          if (fields.Owner) {
            html += ' owned by <account>' + fields.Owner + '</account>'
          }

          return html + '<ul></ul></li>'
        }

        // render nodes
        function renderNodes(type, nodes) {
          var html = ''

          if (nodes.length) {
            html += '<h5>' + type.toUpperCase() +
              ' NODES:</h5><ul class="nodes">'
            nodes.forEach(function(node) {
              switch (node.LedgerEntryType) {
                case 'AccountRoot':
                  html += renderAccountRoot(type, node)
                  break
                case 'DirectoryNode':
                  html += renderDirectoryNode(type, node)
                  break
                case 'Offer':
                  html += renderOfferNode(type, node)
                  break
                case 'RippleState':
                  html += renderRippleState(type, node)
                  break
                default:
                  html += '<li>It ' + type +
                ' a <type>' + node.LedgerEntryType +
                    '</type> node<ul></ul></li>'
              }
            })

            html += '</ul>'
          }

          return html
        }

        tx.meta.AffectedNodes.forEach(function(a) {
          if (a.DeletedNode) {
            deleted.push(a.DeletedNode)
          } else if (a.ModifiedNode) {
            modified.push(a.ModifiedNode)
          } else if (a.CreatedNode) {
            created.push(a.CreatedNode)
          } else {
            console.log('unknown node type')
            console.log(a)
          }
        })

        modified.sort(function(a, b) {
          return a.LedgerEntryType.localeCompare(b.LedgerEntryType)
        })

        d += renderNodes('created', created)
        d += renderNodes('modified', modified)
        d += renderNodes('deleted', deleted)
        meta.html(d)
      }

      // render Memos
      function renderMemos(tx) {
        var memos = explainView.append('div')
        .attr('class', 'memos')
        var html

        function renderMemo(m) {
          var data = m.Memo.MemoData
          var type = m.Memo.MemoType
          var format = m.Memo.MemoFormat

          if (hexMatch.test(type)) {
            type = decodeHex(type) + ' <small>(decoded hex)</small>'
          }

          if (hexMatch.test(format)) {
            format = decodeHex(format) + ' <small>(decoded hex)</small>'
          }

          if (hexMatch.test(data)) {
            data = decodeHex(data) + ' <small>(decoded hex)</small>'
          }

          html += '<li><ul>'

          if (type) {
            html += '<li><label>Type:</label><span>' +
              type + '</span></li>'
          }

          if (format) {
            html += '<li><label>Format:</label><span>' +
              format + '</span></li>'
          }

          if (data) {
            html += '<li><label>Data:</label><span>' +
              data + '</span></li>'
          }

          html += '</ul></li>'
        }

        if (tx.tx.Memos && tx.tx.Memos.length) {
          html = 'The transaction contains the following memos:' +
            '<ul class="list">'
          tx.tx.Memos.forEach(renderMemo)
          html += '</ul>'

        } else {
          html = 'The transaction has no memos.'
        }

        memos.html('<h4>MEMOS:</h4>' + html)
      }

      // render tx description
      function renderDescription(tx) {
        var d = '<h4>DESCRIPTION:</h4>'

        // renderType
        function renderType(type) {
          var article = ['o','e'].indexOf(type[0].toLowerCase()) === -1 ?
            'a' : 'an'
          return 'This is ' + article + ' <type>' +
            type + '</type> transaction.<br/>'
        }

        // renderTrustSet
        function renderTrustSet() {
          return 'It establishes <b>' + renderNumber(tx.tx.LimitAmount.value) +
            '</b> as the maximum amount of ' + tx.tx.LimitAmount.currency +
            ' from <account>' + tx.tx.LimitAmount.issuer + '</account>' +
            ' that <account>' + tx.tx.Account +
            '</account> is willing to hold.'
        }

        // renderPayment
        function renderPayment() {
          var html = 'The payment is from ' +
            '<account>' + tx.tx.Account + '</account> to ' +
            '<account>' + tx.tx.Destination + '</account>.'

          if (tx.tx.SourceTag) {
            html += '<br>The payment has a source tag: ' +
              '<tag>' + tx.tx.SourceTag + '</tag>'
          }

          if (tx.tx.DestinationTag) {
            html += '<br>The payment has a destination tag: ' +
              '<tag>' + tx.tx.DestinationTag + '</tag>'
          }

          html += '<br/>It was instructed to deliver ' +
            '<amount>' + displayAmount(tx.tx.Amount) + '</amount>'

          if (tx.tx.SendMax) {
            html += ' by spending up to <amount>' +
              displayAmount(tx.tx.SendMax) + '</amount>.'
          } else {
            html += '.'
          }

          if (tx.meta.delivered_amount) {
            html += '<br/>The actual amount delivered was ' +
            '<amount>' + displayAmount(tx.meta.delivered_amount) + '</amount>'
          }

          return html
        }

        // render OfferCreate
        function renderOfferCreate() {
          var c1 = tx.tx.TakerPays.currency || 'XRP'
          var c2 = tx.tx.TakerGets.currency || 'XRP'
          var invert = currencyOrder.indexOf(c2) < currencyOrder.indexOf(c1)
          var rate = toDecimal(tx.tx.TakerGets) / toDecimal(tx.tx.TakerPays)
          var pair
          var html

          if (invert) {
            rate = 1 / rate
            pair = c2 + '/' + c1

          } else {
            pair = c1 + '/' + c2
          }

          html = '<account>' + tx.tx.Account + '</account>' +
            ' offered to pay ' +
            '<amount>' + displayAmount(tx.tx.TakerGets) + '</amount>' +
            ' in order to receive ' +
            '<amount>' + displayAmount(tx.tx.TakerPays) + '</amount>.' +
            '<br/>The exchange rate for this offer is <amount><b>' +
            renderNumber(rate.toPrecision(5)) + ' ' + pair + '</b></amount>.'

          if (tx.tx.OfferSequence) {
            html += '<br/>The transaction will also cancel ' +
              '<account>' + tx.tx.Account + '</account>\'s existing offer' +
              ' #<b>' + tx.tx.OfferSequence + '</b>'
          }

          if (tx.tx.Expiration) {
            var expiration = moment.unix(tx.tx.Expiration + RIPPLE_EPOCH)
            var tense = expiration.diff(new Date()) > 0 ? 'expires' : 'expired'
            html += '<br/>The offer ' + tense +
              ' at <date>' + expiration.format('LTS [on] l') + '</date>' +
              ' unless canceled or consumed before then.'
          }

          return html
        }

        // render OfferCancel
        function renderOfferCancel() {
          return 'The transaction will cancel ' +
            '<account>' + tx.tx.Account + '</account>' +
            ' offer #<b>' + tx.tx.OfferSequence + '</b>.'
        }

        // renderEscrowCreate
        function renderEscrowCreate() {
          var html = ''
          if (tx.tx.Destination && tx.tx.Destination !== tx.tx.Account) {
            html = 'The escrow is from <account>' + tx.tx.Account +
              '</account> to <account>' + tx.tx.Destination + '</account><br/>'
          }
          html += 'It escrowed ' +
            '<amount>' + displayAmount(tx.tx.Amount) + '</amount>'
          if (tx.tx.Condition)
            html += '<br/>Condition: ' + tx.tx.Condition
          if (tx.tx.CancelAfter) {
            html += '<br/>It can be cancelled after <date>' +
              moment((RIPPLE_EPOCH + tx.tx.CancelAfter)*1000).format('LLL') +
              '</date>.'
          }
          if (tx.tx.FinishAfter) {
            html += '<br/>It can be finished after <date>' +
              moment((RIPPLE_EPOCH + tx.tx.FinishAfter)*1000).format('LLL') +
              '</date>.'
          }
          return html
        }

        // renderEscrowFinish
        function renderEscrowFinish() {
          var deleted = getEscrowDeletedNode(tx)
          if (!deleted)
            return ''
          var html = 'Completion was triggered by <account>' +
            tx.tx.Account + '</account>' +
            '<br/>The escrowed amount of <amount>' +
            displayAmount(deleted.FinalFields.Amount) + '</amount> ' +
            'was delivered to <account>' + deleted.FinalFields.Destination +
            '</account>'
          if (tx.tx.Account === deleted.FinalFields.Destination) {
              html += ' (' + displayAmount(String(Number(deleted.FinalFields.Amount) - Number(tx.tx.Fee))) +
              ' after transactions costs)'
          }
          html += '<br/>The escrow was created by <account>' +
            tx.tx.Owner + '</account> with transaction '+
            '<a href="#/transactions/' +
            deleted.FinalFields.PreviousTxnID + '">' +
            deleted.FinalFields.PreviousTxnID + '</a>'
          html += tx.tx.Fulfillment ?
            '<br/>Fulfillment: ' + tx.tx.Fulfillment : ''
          return html
        }

        // renderEscrowCancel
        function renderEscrowCancel() {
          var deleted = getEscrowDeletedNode(tx)
          if (!deleted)
            return ''
          var html = 'Cancellation was triggered by <account>' +
            tx.tx.Account + '</account>' +
            '<br/>The escrowed amount of <amount>' +
            displayAmount(deleted.FinalFields.Amount) + '</amount> ' +
            'was returned to <account>' + tx.tx.Owner +
            '</account>'
          if (tx.tx.Account === tx.tx.Owner) {
            html += ' (' + displayAmount(String(Number(deleted.FinalFields.Amount) - Number(tx.tx.Fee))) +
            ' after transactions costs)'
          }
          html += '<br/>The escrow was created by <account>' +
            tx.tx.Owner + '</account> with transaction '+
            '<a href="#/transactions/' +
            deleted.FinalFields.PreviousTxnID + '">' +
            deleted.FinalFields.PreviousTxnID + '</a>'
          return html
        }

        d += renderType(tx.tx.TransactionType)

        if (tx.tx.TransactionType === 'OfferCreate') {
          d += renderOfferCreate()
        } else if (tx.tx.TransactionType === 'OfferCancel') {
          d += renderOfferCancel()
        } else if (tx.tx.TransactionType === 'Payment') {
          d += renderPayment()
        } else if (tx.tx.TransactionType === 'TrustSet') {
          d += renderTrustSet()
        } else if (tx.tx.TransactionType === 'EscrowCreate') {
          d += renderEscrowCreate()
        } else if (tx.tx.TransactionType === 'EscrowFinish') {
          d += renderEscrowFinish()
        } else if (tx.tx.TransactionType === 'EscrowCancel') {
          d += renderEscrowCancel()
        }

        d += '<br/>The transaction\'s sequence number is ' +
          '<b>' + tx.tx.Sequence + '</b>'


        explainView.append('div')
        .attr('class', 'description')
        .html(d)
      }

      // display TX
      function displayTx() {
        var tx = scope.tx_json

        renderStatus(tx)
        renderDescription(tx)
        renderMemos(tx)
        renderFee(tx)
        renderFlags(tx)
        renderMeta(tx)

        // add ripple names
        div.selectAll('account').each(function() {
          var el = d3.select(this)
          var account = el.html()

          rippleName(account, function(name) {
            if (name) {
              el.html('<t>~</t><name>' +
                name + '</name> <addr>(' + account + ')</addr>')
            }
          })
        })
      }

      // load TX
      function loadTx(hash) {
        var url = API + '/transactions/' + hash

        scope.tx_json = null
        explainView.html('')

        $http({
          method: 'get',
          url: url
        })
        .then(function(resp) {
          explainView.html('')
          status.style('display', 'none').html('')
          scope.tx_json = resp.data.transaction
          displayTx()
        },
        function(err) {
          status.attr('class', 'alert alert-danger')
          .style('display', 'block')
          .html(err.data.message)
        })
      }

      scope.tx_json = null
      scope.mode = 'explain'
      scope.$watch('mode', setMode)

      scope.$watch('tx_hash', function() {
        if (scope.tx_hash) {
          loadTx(scope.tx_hash)
        } else {
          explainView.html('')
          status.style('display', 'none')
        }
      })

      scope.reload = function() {
        console.log('reload')
        loadTx(scope.tx_hash)
      }
    }
  }
}])
