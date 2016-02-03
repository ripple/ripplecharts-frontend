networkGraph = function (nameService) {
  var api = new ApiHandler(API);

  // CONSTANTS
  var UNIX_RIPPLE_TIME = 946684800;
  var RECURSION_DEPTH = 1;
  var MAX_NUTL = 360;
  var REFERENCE_NODE = store.session.get('graphID') || 'r3kmLJN5D28dHuH8vZNUZpMC43pEHpaocV';
  var HALO_MARGIN = 6;
  var COLOR_TABLE = {
  //currency  |  center  |   rim  |
    "__Z": [["#dfe0e1","#999999"], //degree 0
  /*GRAY*/  ["#ebecec","#aaa9a9"], //degree 1
            ["#ededee","#bcbbbb"], //etc.
            ["#f3f4f4","#d0cece"],
            ["#fdfdfe","#e5e4e3"]],

    "__N": [["#f05656","#ee2d2c"],
  /*RED*/   ["#f37a6f","#f16249"],
            ["#f6998b","#f5886d"],
            ["#fab9ac","#f9ad95"],
            ["#fddad1","#fcd4c4"]],

    "BTC": [["#e19e41","#b76f2f"],
  /*ORANGE*/["#e5af65","#c38a57"],
            ["#e9c189","#d0a57e"],
            ["#edd2ad","#dcbfa6"],
            ["#f1e4d1","#e9dacd"]],

    "EUR": [["#fcf5a1","#fedb3d"],
  /*YELLOW*/["#fdf7b4","#ffe069"],
            ["#fdf7c4","#ffe68d"],
            ["#fefad8","#ffed83"],
            ["#fffcea","#fff5d6"]],

    "USD": [["#99cc66","#669940"],
  /*LIME*/  ["#acd585","#82a85d"],
            ["#c0dea1","#9eb880"],
            ["#d4e8be","#bbcba4"],
            ["#e8f2dd","#dae1cd"]],

    "AUD": [["#8dc198","#609869"],
  /*GREEN*/ ["#a2cbab","#7eab85"],
            ["#b7d6bd","#9cbda1"],
            ["#cbe0d0","#b9d0bd"],
            ["#e0ebe2","#d7e2d9"]],

    "XRP": [["#55a7cc","#346aa9"],
  /*BLUE*/  ["#83b8d6","#5083b9"],
            ["#a7cae1","#7ba1cb"],
            ["#d0e1ed","#a3c2dd"],
            ["#f2f6fa","#cee8f1"]],

    "___": [["#6566ae","#363795"], //I.e., any other currency.
  /*INDIGO*/["#7e7cbb","#5855a5"],
            ["#9896c9","#7a74b6"],
            ["#b6b4da","#9e99cb"],
            ["#d7d6eb","#c9c6e3"]],

    "CAD": [["#8e68ad","#673695"],
  /*VIOLET*/["#9f80ba","#7d58a5"],
            ["#8e68ad","#673695"],
            ["#c8b8da","#b29ecc"],
            ["#e0d8eb","#d4cae4"]],

    "JPY": [["#b76e99","#863d66"],
  /*PINK*/  ["#c389ab","#9c6283"],
            ["#d0a4be","#b2879f"],
            ["#dcbfd0","#c9abbc"],
            ["#d9dae3","#dfd0d8"]]};

  var HIGH_SATURATION_COLORS = {
    "__N": "#f00", //RED
    "BTC": "#fa0", //ORANGE
    "EUR": "#af0", //YELLOW
    "USD": "#0f0", //LIME
    "AUD": "#0fa", //GREEN
    "XRP": "#0af", //BLUE
    "___": "#00f", //INDIGO
    "CAD": "#a0f", //VIOLET
    "JPY": "#f0a"  //PINK
  };
  var HEX_TO_PERCENT = {"0":0,"a":0.67,"f":1};

  var REQUEST_REPETITION_INTERVAL = 8*1000; //milliseconds



  var param = REFERENCE_NODE;

  var alreadyFailed = false;
  var focalNode;
  var transaction_id;
  var rippleName;
  var changingFocus = false;

  if (param === "") {
    focalNode = REFERENCE_NODE;
  } else if (param.length < 21) {
    rippleName = param
  } else if (param.charAt(0) == "r" ) {
    focalNode = param;
  } else if ("0123456789ABCDEF".indexOf(param.charAt(0)) != -1) {
    transaction_id = param;
  } else if (param.charAt(0) == "u" && Sha1.hash(param) == "7d0b25cc0abdcc216e9f26b078c0cb5c9032ed8c") {
    //Easter egg!
    RECURSION_DEPTH = 999999999;
    focalNode = REFERENCE_NODE;
  } else {
    focalNode = REFERENCE_NODE;
  }


  function gotoThing() {
    var string = $('#focus').val().replace(/\s+/g, '');
    if (string.length < 21) {
      nameService(string, function(name, address) {
        if (address) {
          changeMode('individual');
          refocus(address, true);
        } else {
          $(".loading")
            .text('No Address Found.')
            .css("color","#a00");
        }
      });
    } else if (string.length === 64) {
      eraseGraph();
      //window.location.hash = string;
      mode = 'individual';
      api.getTx(string, handleIndividualTransaction);
      if (!remote.isConnected()) {
        remote.connect();
      }
    } else {
      changeMode('individual');
      refocus(string, true);
    }
  }


  var lastFocalNode = REFERENCE_NODE;
  var currentCurrency = "XRP";
  var currentLedger;

  var w = 935;  //Width
  var h = 1100; //Height
  var hh = 710; //Height above the bottom bar

  var nodes = [];
  var le_links = [];
  var nodeMap = {};
  //nodeMap[focalNode] = 0;
  var degreeMap = {};
  //degreeMap[focalNode] = 0;
  var expandedNodes = {};
  var provisionallyExpandedNodes = {};
  var txx;
  var firstTime = true;

  var pendingRequests = {};

  var requestRepetitionInterval = setInterval(function(){
    var now = new Date().getTime();
    var idsToDelete = [];
    var entriesToAdd = {};
    for (var id in pendingRequests) {
      if (pendingRequests.hasOwnProperty(id)) {
        var req = pendingRequests[id];
        if (req.timestamp + REQUEST_REPETITION_INTERVAL <= now) {
          console.log("Repeating request");
          var newID = req.func();
          entriesToAdd[newID] = {func: req.func, timestamp:now};
          idsToDelete.push(id);
        }
      }
    }
    for (var i=0; i<idsToDelete.length; i++) {
      delete pendingRequests[idsToDelete[i]];
    }
    for (var key in entriesToAdd) {
      if (entriesToAdd.hasOwnProperty(key)) {
        pendingRequests[key] = entriesToAdd[key];
      }
    }
  }, REQUEST_REPETITION_INTERVAL);


  function serverGetLines(address) {
    if (!$.isEmptyObject(nodes[nodeMap[address]].trustLines)) {
      addConnections(address, nodes[nodeMap[address]].trustLines);
      return;
    }

    var options;

    if (!currentLedger) {
      setTimeout(serverGetLines.bind(this, address), 100);
      return;
    }

    remote.getTrustlines(address, {
      ledgerVersion: currentLedger
    })
    .then(handleLines.bind(undefined, address))
    .catch(function(e) {
      console.log(e);
    });
  }

  function serverGetInfo(address) {

    if (!nodes[nodeMap[address]] || !nodes[nodeMap[address]].account.index) {

      remote.getAccountInfo(address)
       .then(handleAccountData.bind(undefined, address))
       .catch(function(e) {
        console.log(e);
      });
    }
  }

  var TRANSACTION_PAGE_LENGTH = 13;

  function getNextTransactionPage() {

    api.getAccountTx({
      account: focalNode,
      limit: TRANSACTION_PAGE_LENGTH,
      marker: nodes[nodeMap[focalNode]].marker,
      descending: true
    }, handleAccountTransactions);
  }


  //Handlers
  function handleLines(account, data) {
    var trustlines = [];

    data.forEach(function(d) {
      trustlines.push({
        account: d.specification.counterparty,
        balance: Number(d.state.balance),
        currency: d.specification.currency,
        limit: Number(d.specification.limit),
        limit_peer: Number(d.counterparty.limit)
      });
    });

    addConnections(account, trustlines);
  }

  function handleTransaction(obj) {
    obj.tx = obj.transaction;
    obj.date = moment((UNIX_RIPPLE_TIME + obj.tx.date)*1000).format();
    obj.hash = obj.tx.hash;

    //prependFeed(obj);
    if (obj.transaction.TransactionType === "Payment") {
      animateTransaction(obj);
    }
  }

  function prependFeed(obj) {
    $('#transactionFeedTable').prepend(renderTransaction(obj));
    $('#transactionFeedTable tr').slice(50).remove();
  }

  function handleAccountData(account, data) {

    var n = nodes[nodeMap[account]];

    n.account = data;
    n.account.Account = account;

    // Change the size of the circles, and recalculate the arrows.
    if (currentCurrency === 'XRP') {
      updated = svg.select("g#nodeGroup")
      .select("circle#_" + account)
      .attr("r", nodeRadius(n));

      svg.select("g#haloGroup")
      .select("circle#halo_" + account)
      .attr("r", HALO_MARGIN + nodeRadius(n));
    }

    // Update the XRP listing on the table below.
    // (But don't rewrite the whole table)
    if (account === focalNode) {
      $("#xrpBalance").text(commas(data.xrpBalance));
    }


  }

  function handleAccountTransactions(err, obj) {

    if (err) {
      console.log('Account TX error:', err);
      return;
    }

    var n = nodes[nodeMap[focalNode]];

    if (n.transactions) {
      n.transactions.push.apply(n.transactions, obj.transactions);
    } else {
      n.transactions = obj.transactions;
    }

    if (obj.marker) {
      n.marker = obj.marker;
    } else {
      n.transactionsFinished = true;
    }

    updateTransactions(focalNode); //appending=true
  }

  function handleIndividualTransaction(err, resp) {
    if (err) {
      console.log(err);
      $(".loading")
        .text(err.message || 'server error')
        .css("color","#a00");
    } else {
      txx = resp.transaction;
      changeMode("transaction", txx);
    }
  }






  // MODE CHANGING

  var mode = "individual";
  var senderAddress;

  function changeMode(newMode, data) {
    if (mode != newMode) {
      if (mode=="individual") {
        exitIndividualMode();
      } else if (mode=="transaction") {
        exitTransactionMode();
      } else if (mode=="feed") {
        exitFeedMode();
      }
      if (newMode=="individual") {
        enterIndividualMode(data);
      } else if (newMode=="transaction") {
        enterTransactionMode(data);
      } else if (newMode=="feed") {
        enterFeedMode();
      }
      mode = newMode;
    }
  }

  function enterIndividualMode(data) {
    if (mode != "individual") {
      $("#leftHeading").text("Balances");
      $("#rightHeading").text("History");
      //$("#focalAddress").show();
      $("#balanceTable").show();
      $("#transactionTable").show();
      $("#transactionInformationContainer").css("display","none");
      $("#transactionFeed").css("display",'none');
      $("#feedTab")
        .addClass("unselectedTab")
        .removeClass("selectedTab")
        .css("visibility","visible");
      $("#individualTab")
        .removeClass("unselectedTab")
        .addClass("selectedTab")
        .css("visibility","visible");

      if (data) {
        expandNode(data);
        senderAddress = false;
      }
      mode = "individual";
    }
  }
  function exitIndividualMode() {
    if (mode == "individual") {
      $("#rightHeading").text("");
      //$("#focalAddress").hide();
      $("#balanceTable").hide();
      $("#transactionTable").hide();
      $("#transactionInformationContainer").css("display","inherit");
    }
  }

  function enterFeedMode() {
    if (mode != "feed") {
      $("#feedTab").removeClass("unselectedTab").addClass("selectedTab");
      $("#individualTab").addClass("unselectedTab").removeClass("selectedTab");
      $("#transactionFeed").css("display","inherit");
      $("#leftHeading").text("Live transaction feed");
      mode = "feed";
    }
  }
  function exitFeedMode() {
    if (mode == "feed") {
      $("#transactionFeed").css("display","none");
    }
  }

  function enterTransactionMode(tx) {
    $("#transactionFeed").css("display",'none');
    $("#feedTab")
      .addClass("unselectedTab")
      .removeClass("selectedTab")
      .css("visibility","visible");
    $("#individualTab")
      .removeClass("unselectedTab")
      .addClass("selectedTab")
      .css("visibility","visible");

    if (mode === "transaction") {
      return;
    }

    if (tx.tx.TransactionType !== 'Payment') {
      $('.loading').html('Transaction type: <b>' + tx.tx.TransactionType + '</b>');
      return;
    }

    var amount = tx.meta.DeliveredAmount || tx.tx.Amount || tx.tx.LimitAmount;
    var currency = amount.currency || 'XRP';

    eraseGraph();
    txx = tx;
    $("#transactionInformation").html(txDescription(tx));
    senderAddress = tx.tx.Account;


    var animateButton = $('<input type="button" value="animate"/>');
    var option = $("select#currency")
    .find("option[value="+currency+"]");

    if (option.html()) {
      $("select#currency")
      .selectbox("change", currency, option.html());

    } else {
      $("select#currency").selectbox("change", "___", "SSGSGS");
      $("#otherCurrency").attr("value",currency);
      $('#otherCurrency').css('font-style','inherit').css('color','inherit');
      changeCurrency("___");
    }

    walkPaths(tx, true);

    setTimeout(function(){
      animateTransaction(txx);
    }, 2000);

    animateButton.on('click', function (){
      animateTransaction(txx)
    });

    $("#leftHeading").html('Transaction information ').append(animateButton);
    $("#feedTab").addClass("unselectedTab").removeClass("selectedTab");
    $("#individualTab").addClass("unselectedTab").removeClass("selectedTab");
    $("#transactionInformation").show();
    mode = "transaction";
  }

  function exitTransactionMode() {
    if (mode == "transaction") {
      $("#transactionInformation").hide();
    }
  }


  function walkPaths(tx, clearing) {
    var anyNewNodes = false;
    var numberOfExistingNodes = nodes.length-1;

    addNode(tx.tx.Account, clearing ? 0 : 1);
    addNode(tx.tx.Destination, clearing ? 0 : 1);

    if (tx.tx.Paths) {
      for (var i=0; i<tx.tx.Paths.length; i++) {
        for (var j=0; j<tx.tx.Paths[i].length; j++) {
          addNode(tx.tx.Paths[i][j].account, 1);
        }
      }
    }

    if (anyNewNodes) {
      addNodes(1);
    }

    if (clearing) { //Do this if we just cleared the graph and are displaying the transaction.
      for (var k=0; k<nodes.length; k++) {
        serverGetInfo(nodes[k].account.Account);
        serverGetLines(nodes[k].account.Account);
      }
    } else if (anyNewNodes) { //Do this if we're displaying in place:
      //Note: This will NOT display new connections between already existing nodes, even if the transaction uses them.
      displayingTransactionInPlace = true;
      for (var l=numberOfExistingNodes; l<nodes.length; l++) {
        serverGetInfo(nodes[l].account.Account);
        serverGetLines(nodes[l].account.Account);
      }
    }

    function addNode(address, degree) {
      if (!address || nodeMap[address]) {
        return;
      }

      nodes.push({
        x: w*Math.random(),
        y: hh*Math.random(),
        account: {
          Account: address,
          xrpBalance: 0
        },
        trustLines: [],
        balances: {}
      });
      nodeMap[address] = nodes.length-1;
      degreeMap[address] = degree;
      anyNewNodes = true;
    }

  }

  function eraseGraph() {
    zoomLevel = 1;
    translationX = 0;
    translationY = 0;
    panAndZoom();
    $("#zoomInButton").attr("disabled","disabled");

    svg.select("g#nodeGroup").selectAll("circle.node").data([]).exit().remove();
    svg.select("g#linkGroup").selectAll("line")       .data([]).exit().remove();
    svg.select("g#haloGroup").selectAll("circle.halo").data([]).exit().remove();
    svg.select("g#arrowheadGroup").selectAll("path.arrowhead").data([]).exit().remove();

    nodes = [];
    le_links = [];
    nodeMap = {};
    expandedNodes = {};
    provisionallyExpandedNodes = {};
    animatorLinks = [];
    $(".loading").css("display","block").css("color","#aaa");
    $(".loading").html('<img class="loader" src="assets/images/rippleThrobber.png" style="vertical-align: middle;" /> Loading...');
  }


  // DATA-TO-HTML FUNCTIONS
  function renderTransaction(tx) {
    var transactionType;
    var from = tx.Account;
    var to = null;
    var amount = null;
    var currency = null;
    var secondAmount = null;
    var secondCurrency = null;
    if (tx.tx.TransactionType == "Payment") {
      amount = tx.meta.DeliveredAmount || tx.tx.Amount || tx.tx.LimitAmount;
      transactionType = "send";
      to = tx.tx.Destination;
    } else if (tx.tx.TransactionType == "TrustSet") {
      amount = tx.tx.LimitAmount;
      transactionType = "trustout";
      to = tx.tx.LimitAmount.issuer;
    } else if (tx.tx.TransactionType == "OfferCreate") {
      transactionType = "offerout";
      amount = tx.tx.TakerGets;
      secondAmount = tx.tx.TakerPays;
    } else if (tx.tx.TransactionType == "OfferCancel") {
      transactionType = "canceloffer";
    } else {return;}
    if (amount) {
      if (amount.currency) {
        currency = amount.currency;
        amount = amount.value;
      } else {
        currency = "XRP";
        amount = amount/1000000;
      }
    }
    if (secondAmount) {
      if (secondAmount.currency) {
        secondCurrency = secondAmount.currency;
        secondAmount = secondAmount.value;
      } else {
        secondCurrency = "XRP";
        secondAmount = secondAmount/1000000;
      }
    }
    transactionMap[tx.hash] = tx;

    var tr = $('<tr/>');
    tr.append('<td style="width:80px;">'+moment(tx.date).format('lll')+'</td>');
    tr.append($('<td style="width:1px;"/>').append(clickableAccountSpan(from)));

    var td  = $('<td style="width:40px;">');
    var div = $('<div class="'+transactionType+' icon" title="'+txAltText[transactionType]+'">&nbsp;</div>');
    if (transactionType === 'send') {
      div.on('contextmenu', function() {
        animateInPlaceWithHash(tx.hash);
        return false;
      }).on('click', function(){
        mode = "";
        enterTransactionMode(tx);
      });
    }

   td.append(div);
   tr.append(td);

   if (to||secondAmount) {
      tr.append('<td style="width:1px;"><span class="bold amount small">'+commas(amount)+'</span>&nbsp;<span class="light small darkgray">'+currency+'</span></td>');
      tr.append('<td style="text-align:center; width:20px;"><i class="light small darkgray">');
      if (to) {
        tr.append('<td style="text-align:center; width:20px;"><i class="light small darkgray">to</i></td>');
        tr.append($('<td style="width:1px;"/>').append(clickableAccountSpan(to)));
      } else {
        tr.append('<td style="text-align:center; width:20px;"><i class="light small darkgray">for</i></td>');
        tr.append('<td style="width:1px;"><span class="bold amount small">'+commas(secondAmount)+'</span>&nbsp;<span class="light small darkgray">'+secondCurrency+'</span></td>');
      }

   } else {
     tr.append('<td colspan=3></td>');
   }

   return tr;
  }

  function clickableAccountSpan(address) {
    var o = $("<span class='light address' style='cursor:pointer;'/>");
    o.on('mouseover', function(){
      lightenAddress(address)
    });
    o.on('mouseout', function(){
      darkenAddress(address);
    });
    o.on('click', function(){
      $('#focus').val(address);
      expandNode(address);
    });

    o.html(address);

    return o;
  }

  function txDescription(tx) {
    var xrpExpense;
    if (tx.meta) {
      for (var i=0; i<tx.meta.AffectedNodes.length; i++) {
        var an = tx.meta.AffectedNodes[i];
        if (an.ModifiedNode && an.ModifiedNode.LedgerEntryType==="AccountRoot" &&
            an.ModifiedNode.FinalFields &&
            an.ModifiedNode.FinalFields.Account===tx.tx.Account) {
          xrpExpense = {before:an.ModifiedNode.PreviousFields.Balance/1000000 , after:an.ModifiedNode.FinalFields.Balance/1000000};
          break;
        }
      }
    }

    var div    = $('<div/>');
    var amount = tx.meta.DeliveredAmount || tx.tx.Amount;
    if (amount) {
      var span = $("<span class='amount'/>");
      span.html(amount.currency ? commas(amount.value)+" "+amount.currency : commas(amount/1000000)+" XRP");

      div.append("<b>Amount:</b>")
        .append(span)
        .append("<br/>");

      if (amount.issuer) div.append("<b>Issuer:</b>")
        .append(clickableAccountSpan(amount.issuer))
        .append("<br/>");
    }

    div.append("<b>Path:</b>")
      .append(function(){
        var ul = $('<ul/>'), li;

        if (tx.tx.Paths) {
          for (var i=0; i<tx.tx.Paths.length; i++) {
            li = $('<li/>');
            li.append(clickableAccountSpan(tx.tx.Account))
              .append(" &rarr; ");

            for (var j=0; j<tx.tx.Paths[i].length; j++) {
              if (tx.tx.Paths[i][j].account) {
                li.append(clickableAccountSpan(tx.tx.Paths[i][j].account))
                  .append(" &rarr; ");
              }
            }

            li.append(clickableAccountSpan(tx.tx.Destination));
            ul.append(li);
          }

        } else {
          li = $('<li/>');
          li.append(clickableAccountSpan(tx.tx.Account))
            .append(" &rarr; ")
            .append(clickableAccountSpan(tx.tx.Destination));

          ul.append(li);
        }

        return ul;
    });

    div.append((tx.meta ? "<b>Result:</b> "+(tx.meta.TransactionResult=="tesSUCCESS"?"<span>":"<span style='color:#900;'>")+tx.meta.TransactionResult+"</span><br/>" : "")+
      (xrpExpense||xrpExpense===0 ? "<b>XRP change:</b> "+commas(xrpExpense.before) + " XRP &rarr; "+commas(xrpExpense.after)+" XRP ("+(xrpExpense.after>=xrpExpense.before?"+":"&ndash;")+commas(Math.round(1000000*Math.abs(xrpExpense.before-xrpExpense.after))/1000000)+" XRP)<br/>" : "")+
      "<b>Date:</b> "+moment(tx.date).format('lll')+"<br/>"+
      (tx.tx.InvoiceID ? "<b>Invoice ID:</b> <tt>"+tx.tx.InvoiceID+"</tt><br/>" : "")+
      (tx.tx.DestinationTag ? "<b>Destination tag:</b> "+tx.tx.DestinationTag+"<br/>" : "")+
      "<b>Hash:</b> <tt>"+tx.hash+"</tt><br/>"+
      "<b>Ledger:</b> "+tx.ledger_index+"<br/>"+
      "<b>Signing key:</b> <tt>"+tx.tx.SigningPubKey+
      "</tt><br/><b>Signature:</b><br/><div class='bigString' style='width:"+tx.tx.TxnSignature.length*4+"px;'>"+tx.tx.TxnSignature+"</div>");

    return div;
  }


  function currentCurrencyBalance(accountNode) {
    var output;
    if (currentCurrency === 'XRP') {
      output = accountNode.account.xrpBalance;

    } else {
      output = accountNode.balances[currentCurrency];
      if (!output) { output = 0; }
    }
    return output;
  }

  var displayingTransactionInPlace = false;

  function addConnections(origin, trustLines) {
    var transactionMode = (mode === "transaction") || displayingTransactionInPlace;
    $(".loading").css("display","none");

    if (!nodes[nodeMap[origin]]) {
      console.log(origin, "node not added");
      return;
    }

    nodes[nodeMap[origin]].trustLines = trustLines;
    nodes[nodeMap[origin]].balances = getBalances(origin);

    if (origin == focalNode) {
      updateInformation(origin);
    }

    // Change the size of the circle,
    // if we needed to wait until now to
    // figure out its balance (i.e. we're
    // looking at a currency other than XRP.)
    if (currentCurrency != "XRP") {
      svg.select("g#nodeGroup")
        .select("circle#_"+origin)
        .attr("r", nodeRadius(nodes[nodeMap[origin]]) );
      svg.select("g#haloGroup")
        .select("circle#halo_"+origin)
        .attr("r", HALO_MARGIN+nodeRadius(nodes[nodeMap[origin]]) );
    }

    if ((degreeMap[origin] < RECURSION_DEPTH ||
        ( degreeMap[origin] == RECURSION_DEPTH) && transactionMode)) {

      if (!transactionMode && trustLines.length >= MAX_NUTL) {
        alert('Account '+origin+' has too many trustlines to show ('+trustLines.length+')');

      } else {
        if (!transactionMode) {
          expandedNodes[origin] = true;
        } else {
          provisionallyExpandedNodes[origin] = true;
        }

        var newNodes = [];
        var newLinks = [];

        for (var i=0; i<trustLines.length; i++) {
          var linkWasToExisting = false;
          var node, link;

          // add trustLines[i]["account"] to the
          // list of nodes, if it's not on it already.
          // add a link from the current node to
          // trustLines[i]["account"], if it's not there already.

          trustLine = trustLines[i];
          account = trustLine["account"];

          // Fetch the node corresponding
          // to the counterparty of this trust line,
          // or if it's not on the list yet,
          // create one and add it to the list.
          if (nodeMap[account] === undefined) {
            if (!transactionMode &&
              (parseFloat(trustLine.limit) !== 0 ||
               parseFloat(trustLine.limit_peer) !== 0) ) {

              nodeMap[account]=nodes.length;
              degreeMap[account] = degreeMap[origin] + 1;
              var angle = Math.random() * 6.283185307179586;
              var radius= Math.random() * 100;
              node = {
                x:nodes[nodeMap[origin]].x+Math.cos(angle)*radius,
                y:nodes[nodeMap[origin]].y+Math.sin(angle)*radius,
                account: {
                  Account:account,
                  xrpBalance:0
                },
                trustLines: [],
                balances: {}
              }
              newNodes.push(node);
              nodes.push(node);

              //Only add the node if the trust line is non-zero.
              degreeMap[account] = degreeMap[origin] + 1;
              serverGetInfo(account);

              // If this node is not on the list yet,
              // we're going to need to get the info
              // and trustLines for it.
              serverGetLines(account);
            }

          } else {
            node = nodes[nodeMap[account]];
            linkWasToExisting = true;
          }

          // Now, create links to all of the
          // counterparties that have not been expanded
          // (ie., had their links displayed.). If we're
          // in transaction mode, only add links to existing nodes.
          if ((!transactionMode &&
               !expandedNodes[account]) ||
              (transactionMode &&
               linkWasToExisting &&
               !provisionallyExpandedNodes[account])) {


            if (trustLine.limit !== 0) {
              link={};
              link.source = nodes[nodeMap[ origin ]];
              link.target = node;
              link.value  = trustLine.limit;
              goon(link);
            }

            if (trustLine.limit_peer !== 0) {
              link = {};
              link.target = nodes[nodeMap[ origin ]];
              link.source = node;
              link.value  = trustLine.limit_peer;
              goon(link);
            }
          }

          // If we're adding a trust line to
          // an already-existing node, check
          // that node again to see if we should
          // put a halo on it.
          if (linkWasToExisting) {
            svg.select("g#haloGroup")
            .select("circle#halo_"+account)
            .style("display", (numberOfUnseenTrustLines(node)>0) ?
              "block":"none" );
          }
        }
      }
    }

    reassignColors(origin);
    addNodes(degreeMap[origin]+1);


    //should we add a halo to origin?
    svg.select("g#haloGroup").select("circle#halo_"+origin)
      .style("display", (numberOfUnseenTrustLines(nodes[nodeMap[origin]])>0)?"block":"none" );
    displayingTransactionInPlace = false; //really?

    function goon(link) {
      if (trustLine.limit !== 0 &&
          trustLine.limit_peer !== 0) {
        link.strength = 0.5;
      } else {
        link.strength = 1;
      }

      link.currency = trustLines[i].currency;
      le_links.push(link);
    }
  }



  var svg = d3.select("#visualization")
    .append("svg:svg")
    .attr("class","visual")
    .attr("height", h).attr("pointer-events", "auto")
    .on("click",function(){
      if($('.sbOptions').css("display") == "block") {
        $('.sbToggle').trigger('click');
      }
      if($('#otherCurrency').css("display") == "block") {
        $('#otherCurrency').trigger('blur');
      }
    })
    .style("float","left")//.style({"border-left":"1px solid #c8c8c8", "border-right":"1px solid #c8c8c8", "border-top":"1px solid #c8c8c8"})
    .style("margin-right","10").call(d3.behavior.drag().on("drag", redraw));

  var zoomLevel = 1;
  var translationX = 0;
  var translationY = 0;
  var panOffset = [0,0];
  function redraw() {
    translationX += d3.event.dx;
    translationY += d3.event.dy;
    panAndZoom();
  }


  function zoomOut() {
    if (zoomLevel >= 1) {
      $("#zoomInButton").removeAttr("disabled");
    }
    translationX += (w/8 * zoomLevel);
    translationY += (hh/8 * zoomLevel);
    panOffset[0] -= (w/8 * zoomLevel);
    panOffset[1] -= (hh/8 * zoomLevel);
    zoomLevel *= 0.75;
    panAndZoom();
  }

  function zoomIn() {
    zoomLevel /= 0.75;
    if (zoomLevel >= 1) {
      zoomLevel = 1;
      $("#zoomInButton").attr("disabled","disabled");
    }
    translationX -= (w/8 * zoomLevel);
    translationY -= (hh/8 * zoomLevel);
    panOffset[0] += (w/8 * zoomLevel);
    panOffset[1] += (hh/8 * zoomLevel);
    panAndZoom();
  }

  function panAndZoom() {
    linkGroup.attr     ("transform","translate(" + [translationX,translationY] + "),scale("+zoomLevel+")");
    nodeGroup.attr     ("transform","translate(" + [translationX,translationY] + "),scale("+zoomLevel+")");
    haloGroup.attr     ("transform","translate(" + [translationX,translationY] + "),scale("+zoomLevel+")");
    arrowheadGroup.attr("transform","translate(" + [translationX,translationY] + "),scale("+zoomLevel+")");
  }

  var defs = svg.append("defs");

  function defineRadialGradient(name, innerColor, outerColor) {
    var radGrad = defs.append("radialGradient")
      .attr("id", name)
      .attr("fx", "50%")
      .attr("fy", "50%")
      .attr("r", "100%")
      .attr("spreadMethod", "pad");
    radGrad.append("stop")
      .attr("offset","0%")
      .attr("stop-color",innerColor)
      .attr("stop-opacity","1");
    radGrad.append("stop")
      .attr("offset","100%")
      .attr("stop-color",outerColor)
      .attr("stop-opacity","1");
  }

  for (var cur in COLOR_TABLE) {
    var shades = COLOR_TABLE[cur];
    for (var i=0; i<shades.length; i++) {
      defineRadialGradient("gradient"+cur+i, shades[i][0], shades[i][1]);
    }
  }

  function defineFilter(name, red, green, blue) {
    var filter = defs.append("filter").attr("id",name).attr("x","-200%").attr("y","-200%").attr("width","800%").attr("height","800%");
    var fct = filter.append("feComponentTransfer").attr("in","SourceAlpha");
    fct.append("feFuncR").attr("type","discrete").attr("tableValues",red+" 1");
    fct.append("feFuncG").attr("type","discrete").attr("tableValues",green+" 1");
    fct.append("feFuncB").attr("type","discrete").attr("tableValues",blue+" 1");
    filter.append("feGaussianBlur").attr("stdDeviation","20");
    filter.append("feOffset").attr("dx","0").attr("dy","0").attr("result","shadow");
    filter.append("feComposite").attr("in","SourceGraphic").attr("in2","shadow").attr("operator","over");
  }


  for (cur in HIGH_SATURATION_COLORS) {
    var red = HEX_TO_PERCENT[HIGH_SATURATION_COLORS[cur].charAt(1)];
    var green = HEX_TO_PERCENT[HIGH_SATURATION_COLORS[cur].charAt(2)];
    var blue = HEX_TO_PERCENT[HIGH_SATURATION_COLORS[cur].charAt(3)];
    defineFilter("shine"+cur, red, green, blue);
  }


  var haloGroup = svg.append("g").attr("id","haloGroup");
  var linkGroup = svg.append("g").attr("id","linkGroup");
  var arrowheadGroup = svg.append("g").attr("id","arrowheadGroup");
  var nodeGroup = svg.append("g").attr("id","nodeGroup");

  function nodeRadius(accountNode) {
    var bal = currentCurrencyBalance(accountNode);

    if (!bal) {
      bal = 0;
    }

    if (currentCurrency === "XRP") {
      bal *= 1000000;
    } else {
      bal *= 1000000000;
    }

    return 14 + Math.pow(Math.log(Math.abs(bal) + 1), 3) / 2000;
  }

  var force = d3.layout.force()
    .size([(window.innerWidth > 0) ? window.innerWidth : screen.width, 710]) //w
    .linkDistance(80)
    .linkStrength(function(d) {
      if (currentCurrency == "XRP" || currentCurrency == d.currency) {
        return d.strength * 0.25;
      } else {
        return 0;
      }
    }).friction(0.5)
    .charge(-1500).nodes([]).links([]).start();





  function expandNode(address) {
    var nutl;

    store.session.set("graphID", address);

    if (typeof(nodes[nodeMap[address]]) !== "undefined") {
      nutl = numberOfUnseenTrustLines(nodes[nodeMap[address]]);
    } else {
      nutl = 0;
    }

    changingFocus = true;
    //window.location.hash = address;
    changeMode("individual");
    lastFocalNode = focalNode;
    focalNode = address;

    if (nodeMap[address] === undefined) {
      refocus(address, false);
    } else {
      if (!nodes[nodeMap[address]].transactions ||
          nodes[nodeMap[address]].transactions.length === 0) {
        getNextTransactionPage();
      }
      degreeMap = {};
      degreeMap[address] = 0;
      reassignColors(address);
      fadeLinks(address);
      colorRogueNodes();

      if (nutl>MAX_NUTL) {
        alert('Account '+address+' has too many trustlines to show ('+nutl+')');
      } else {
        serverGetLines(address);
      }
      updateInformation(address);
    }
  }


  function borderColor(cur, colorDegree) {
    if (colorDegree === 0) {
      return "#fc0"; //It actually doesn't use the border color for the focal node.
    } else {
      return COLOR_TABLE[cur][colorDegree-1][1]; //Use the rim color of the next darkest degree.
    }
  }


  function findCur(d) {
    var cur = currentCurrency;
    if(cur != "XRP") {
      if(!d.balances[cur]){cur="__Z";}
      else if(d.balances[cur]<0){cur="__N";}
      else if(!COLOR_TABLE.hasOwnProperty(cur)) {cur = "___";}
    }
    return cur;
  }

  function lightenNodeFunction(colorDegree) {
    return function(d) {
      var cur = findCur(d);
      d3.select(d3.event.target).style("fill", "url(#gradient"+cur+(colorDegree+1)+")").style("stroke-width", 2).style("stroke", "#fc0" );
    }
  }
  function darkenNodeFunction(colorDegree) {
    return function(d) {
      var cur = findCur(d);
      d3.select(d3.event.target).style("fill", "url(#gradient"+cur+(colorDegree)+")").style("stroke-width", (colorDegree===0?5:0.5)).style("stroke", function(d){var cur = findCur(d); return borderColor(cur,colorDegree);} );
    }
  }
  function lightenAddress(address) {
    if (typeof degreeMap[address] != "undefined") {
      var colorDegree = Math.min(degreeMap[address], 3);
      var cur = findCur(force.nodes()[nodeMap[address]]);
      nodeGroup.select("#_"+address).style("fill", "url(#gradient"+cur+(colorDegree+1)+")").style("stroke-width", 2).style("stroke", "#fc0" );
    }
  }
  function darkenAddress(address) {
    if (typeof degreeMap[address] != "undefined") {
      var colorDegree = Math.min(degreeMap[address], 3);
      var cur = findCur(force.nodes()[nodeMap[address]]);
      nodeGroup.select("#_"+address).style("fill", "url(#gradient"+cur+(colorDegree)+")").style("stroke-width", (colorDegree===0?5:0.5)).style("stroke", function(d){var cur = findCur(d); return borderColor(cur,colorDegree);} );
    }
  }


  function numberOfUnseenTrustLines(aNode) {
    var output = 0;
    var trustLines = aNode.trustLines;
    for (var i=0; i<trustLines.length; i++) {
      if ((trustLines[i].limit!==0 || trustLines[i].limit_peer!==0) && isLineInvisible(aNode.account.Account, trustLines[i].account)) {
        output++;
      }
    }
    return output;
  }

  function isLineInvisible(source, target) {
    for (var j=0; j<le_links.length; j++) {
      if ((le_links[j].source.account.Account==source && le_links[j].target.account.Account==target) ||
        (le_links[j].source.account.Account==target && le_links[j].target.account.Account==source)  ) {
        return false;
      }
    }
    return true;
  }


  function colorNodes(nodeSelection, colorDegree) {
    nodeSelection.style("fill", function(d) {
      var cur = findCur(d);
      return ("url(#gradient"+cur+colorDegree+")");
    })
    .style("stroke", function(d){
      var cur = findCur(d);
      return borderColor(cur,colorDegree);
    })
    .style("stroke-width", 0.5 )
    .on("mouseover", lightenNodeFunction(colorDegree))
    .on("mouseout", darkenNodeFunction(colorDegree));

    if (colorDegree === 0) {
      nodeSelection.style("stroke-width", 5);
    }
  }

  function fadeNodes(address, fadeIn) {
    var nodes  = svg.select("g#nodeGroup").selectAll("circle#_"+address);
    var halos  = svg.select("g#haloGroup").selectAll("circle#halo_"+address);
    var arrows = svg.select("g#arrowheadGroup").selectAll("path#arrow_"+address);

    if (fadeIn) {
      nodes.transition().style("opacity",1);
      halos.transition().style("opacity",1);
      arrows.transition().style("opacity",1);
    } else {
      nodes.transition().style("opacity",0.4);
      halos.transition().style("opacity",0.4);
      arrows.transition().style("opacity",0.1);
    }
  }

  function fadeLinks(address) {
    for (var i=0; i<le_links.length; i++) {
      var link = le_links[i];

      if (link.source.account.Account == address ||
          link.target.account.Account == address) { // If this address is party to the link...
        le_links[i].opacity = 1;
      } else {
        le_links[i].opacity = 0.3;
      }
    }


    svg.select("g#linkGroup").selectAll("line.static")
      .data(le_links)
      .style("opacity", function (d) {return d.opacity});
  }

  function reassignColors(address) {
    var colorDegree = Math.min(degreeMap[address], 3);
    colorNodes(svg.select("g#nodeGroup").select("circle#_"+address), colorDegree)
    fadeNodes(address, colorDegree>1 ? false : true);

    function goon(counterparty) { // ...then reassign the colors of each counterparty too,
      //only if the new degree is lower than the previous one (or the degree is as yet unknown)
      if (typeof degreeMap[counterparty] == "undefined" || degreeMap[counterparty] > degreeMap[address]+1) {
        degreeMap[counterparty] = degreeMap[address]+1;
        reassignColors(counterparty);
      }
    }

    for (var i=0; i<le_links.length; i++) {
      var link = le_links[i];

      if (link.source.account.Account == address) { // If this address is party to the link...
        goon(link.target.account.Account);
      } else if (link.target.account.Account == address) {
        goon(link.source.account.Account);
      }
    }
  }

  function colorRogueNodes() {
    for (var address in nodeMap) {
      if (typeof degreeMap[address] == "undefined") {
        degreeMap[address] = Infinity;
        colorNodes(svg.select("g#nodeGroup").select("circle#_"+address), 3);
        fadeNodes(address, true);
      }
    }
  }





  function lineLength(lineElement) {
    return Math.sqrt(Math.pow(lineElement.attr("x1")-lineElement.attr("x2"),2) + Math.pow(lineElement.attr("y1")-lineElement.attr("y2"),2));
  }

  function shine(onOrOff, address, cur) {
    $("#_"+address).attr("filter",(onOrOff ? "url(#shine"+cur+")" : "none"));
  }



  var animatorLinks = [];



  function animateLink(onOrOff, speed, from, to, cur, callback) {
    if (typeof nodeMap[from] == "undefined" || typeof nodeMap[to] == "undefined") {
      setTimeout(callback, 10.0/speed);
    } else {
      var animator = $("#" + from + "_" + to + "_" + cur);
      if (animator.length === 0) {
        animatorLinks.push({source:nodes[nodeMap[from]], target:nodes[nodeMap[to]], value:100, currency:currency, strength:0});
        var alink = svg.select("g#linkGroup").selectAll("line.animator").data(animatorLinks)
          .enter().append("svg:line")
          .attr("x1", function(d){ return d.source.x; })
          .attr("y1", function(d){ return d.source.y; })
          .attr("x2", function(d){ return d.target.x; })
          .attr("y2", function(d){ return d.target.y; })
          .attr("class", "animator")
          .attr("id", from + "_" + to + "_" + cur )
          .style("stroke",function(d){ return HIGH_SATURATION_COLORS[cur];} )
          .style("z-index","2")
          .style("stroke-dasharray","0,999999")
          .attr("stroke-width", 10);
        animator = $("#" + from + "_" + to + "_" + cur);
      }

      animator.css("display","inherit");
      var pct = 1;
      var interval = setInterval( function(){
        var len = lineLength(animator) * (1-pct);
        if (onOrOff === true) { //If we're turning it on
          animator.css("stroke-dasharray",len+", 999999");
        } else { //If we're turning it off
          animator.css("stroke-dasharray","0, "+len+", 999999");
        }
        pct -= speed;
        if (pct <= 0) {
          if (onOrOff === true) {
            animator.css("stroke-dasharray","");
          } else {
            animator.css("display","none");
          }
          clearInterval(interval);
          callback();
        }
      }, 10 );
    }
  }


  function animateTransaction(tx) {
    var initialCur, finalCur, pathList;
    var amount = tx.meta.DeliveredAmount || tx.tx.Amount;

    if (tx.tx.SendMax && tx.tx.SendMax.currency) {
      initialCur = tx.tx.SendMax.currency;
      if(!HIGH_SATURATION_COLORS.hasOwnProperty(initialCur)) {initialCur = "___";}
    } else {
      initialCur = "XRP";
    }
    shine(true, tx.tx.Account, initialCur);

    if (amount.currency) {
      finalCur = amount.currency;
      if(!HIGH_SATURATION_COLORS.hasOwnProperty(finalCur)) {finalCur = "___";}
    } else {
      finalCur = "XRP";
    }

    if (tx.tx.Paths) {
      pathList = [];
      for (var i=0; i<tx.tx.Paths.length; i++) {
        var thisOldPath = tx.tx.Paths[i];
        var thisPath = [];
        for (var j=0; j<thisOldPath.length; j++) {
          if (thisOldPath[j].account) {
            thisPath.push(thisOldPath[j]);
          }
        }
        pathList.push(thisPath);
      }
      for (var k=0; k<pathList.length; k++) {
        animatePath(true, k);
      }
    } else {
      pathList = [[]];
      animatePath(true, 0);
    }

    function animatePath(onOrOff, i) {
      if (i==pathList.length) {
        console.log("Done with every path!");
      } else {
        var path = pathList[i];
        var lastNode = tx.tx.Account;
        var nextNode;
        var speed = 0.01 * (path.length + 1);

        animatePathLink(0);
      }

      function animatePathLink(j) {
        if (j==path.length) {
          animateLink(onOrOff, speed, lastNode, tx.tx.Destination, finalCur, function(){
            shine(onOrOff, tx.tx.Destination, finalCur);
            if(onOrOff) {
              shine(false, tx.tx.Account);
              animatePath(false, i);
            }
          });
        } else {
          nextNode = path[j].account;
          if (path[j].currency) {
            cur = path[j].currency;
            if(!HIGH_SATURATION_COLORS.hasOwnProperty(cur)) {cur = "___";}
          } else {
            cur = "XRP";
          }

          animateLink(onOrOff, speed, lastNode, nextNode, cur, function(){
            shine(onOrOff, nextNode, cur);
            animatePathLink(j+1);
          });
          lastNode = nextNode;
        }
      }
    }
  }





var lastNodeTouched = "";

function stopExpandResume(d) {
  force.stop();
  $('#focus').val(d.account.Account);
  expandNode(d.account.Account);
  setTimeout(force.resume,500);
}

function addNodes(degree) {

  force.nodes(nodes).links(le_links);
  var timer;
  var colorDegree = Math.min(degree, 3);
  var node = svg.select("g#nodeGroup").selectAll("circle.node").data(nodes)
    .enter().append("svg:circle")
    .attr("class", "node")
    .attr("id", function(d) { return "_"+d.account.Account;})
    .attr("cx", function(d) { return d.x; })
    .attr("cy", function(d) { return d.y; })
    .attr("r", nodeRadius )
    .attr("title", function(d) { return d.account.Account; })
    .attr("pointer-events", "all")
    .style("cursor", "pointer")
    .on("touchstart", function() {  } )
    .on("touchmove", function(d) { lastNodeTouched=d.account.Account; } )
    .on("touchend", function(d) { if (lastNodeTouched != d.account.Account) {stopExpandResume(d); lastNodeTouched=d.account.Account;} else {lastNodeTouched="";} } )
    .on("click", stopExpandResume );
  colorNodes(node, colorDegree);
  node.append("svg:title").text( function(d) { return d.account.Account;} );
  node.call(force.drag);



  var link = svg.select("g#linkGroup").selectAll("line.static").data(force.links())
    .enter().append("svg:line")
    .attr("class","static")
    .style("opacity",function(d) { return d.opacity ? d.opacity:1})
    .attr("stroke-width", linkOrNot);


  function arrowheadPath(radius, theta) {
    var rCosTheta = radius*Math.cos(theta);
    var rSinTheta = radius*Math.sin(theta);
    return "M 0 0 L "+
      rCosTheta+" "+rSinTheta+" L "+
      (rCosTheta+rSinTheta*Math.sqrt(3))+" 0 L "+
      rCosTheta+" "+(-rSinTheta)+" z";
  }

  var arrowhead = svg.select("g#arrowheadGroup")
  .selectAll("path.arrowhead")
  .data(force.links())
  .enter().append("svg:path")
  .attr("class", "arrowhead");

  arrowhead = setArrowheads(arrowhead);

  function euclidean(pointA, pointB) {
    return Math.sqrt(Math.pow(pointA.x-pointB.x,2)
      +Math.pow(pointA.y-pointB.y,2));
  }

  function projection(distance, origin, towards) {
    var farDistance = euclidean(origin, towards);
    var scalar = distance/farDistance;
    var xOutput = origin.x + (towards.x-origin.x)*scalar;
    var yOutput = origin.y + (towards.y-origin.y)*scalar;
    return {x:xOutput, y:yOutput};
  }

  function angle(pointA, pointB) {
    return 180/Math.PI * Math.atan2(pointB.y-pointA.y, pointB.x-pointA.x);
  }

  function thetaValue(value) {
    return value/(1+value) * 1.04719755 // max = 60 degrees in radians
  }

  function setArrowheads(selection) {
    return selection
      .attr("id", function(d) { return "arrow_"+d.source.account.Account;})
      .attr("transform", function(d) {
        var position = d.source;
        return "translate("+position.x+","+position.y+"), rotate("+angle(d.source,d.target)+",0,0)";
      })
      .attr("d", function(d) {
        var radius = parseFloat($("#_"+d.source.account.Account).attr("r"));
        var theta = thetaValue(d.value);
        return arrowheadPath(radius, theta);
      })
      .style("display", function(d) {
        return (isLinkVisible(d) ? "block" : "none");
      });

  }


  var halo = svg.select("g#haloGroup").selectAll("circle.halo").data(nodes)
    .enter().append("svg:circle")
    .attr("class", "halo")
    .attr("id", function(d) { return "halo_"+d.account.Account;})
    .attr("cx", function(d) { return d.x; })
    .attr("cy", function(d) { return d.y; })
    .attr("r", function(d){ return HALO_MARGIN+nodeRadius(d);} );

  force.start();





  force.on("tick", function(e) {
    var node = svg.selectAll("circle.node");
    var halo = svg.selectAll("circle.halo");
    var arrowhead = svg.selectAll("path.arrowhead");
    var link = svg.selectAll("line");
    node.attr("cx", function(d) { return d.x; })
      .attr("cy", function(d) { return d.y; });
    link.attr("x1", function(d) {return d.source.x;})
      .attr("y1", function(d) {return d.source.y;})
      .attr("x2", function(d) {return d.target.x;})
      .attr("y2", function(d) {return d.target.y;});
    halo.attr("cx", function(d) { return d.x; })
      .attr("cy", function(d) { return d.y; });
    setArrowheads(arrowhead);
  });

  force.drag().on("dragstart", function(){
    d3.event.sourceEvent.stopPropagation(); // silence other listeners
  });
}

function refocus(focus, erase, noExpand) {
  changingFocus = true;
  if (erase) {
    eraseGraph();
  }

  store.session.set("graphID", focus);
  lastFocalNode = focalNode;
  focalNode = focus;
  nodeMap[focalNode] = nodes.length;
  nodes.push({
    x: 0.5*w,
    y: hh/2,
    account:{
      Account:focalNode,
      xrpBalance:0
    },
    trustLines:[],
    balances:{}
  });

  degreeMap = {};
  degreeMap[focalNode] = 0;
  if (!noExpand) {
    serverGetLines(focalNode);
  }
  addNodes(0);
  reassignColors(focalNode);
  fadeLinks(focalNode);
  colorRogueNodes();
  serverGetInfo(focalNode);
  updateInformation(focus);
  getNextTransactionPage();
}



function commas(number) {
  var parts = number.toString().split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}

function abbreviate(address) {
  return address.slice(0,25)+"...";
}

function magnitude(oom) {
  var mfo3 = Math.floor(oom/3);
  var text = {1:"K", 2:"M", 3:"B", 4:"T", 5:"Q"}[mfo3];
  var value;
  if (text) {
    value = Math.pow(1000, mfo3);
  } else {
    value = Math.pow(10, oom);
    text = "&times;10<sup>"+(""+oom).replace("-","&#8209;")+"</sup>";
  }
  return {value:value, text:text};
}

function roundNumber(number) {
  number = parseFloat(number);
  var man = Math.abs(number);

  if (number === 0 || (man < 100000.00 && man > 0.00001)) {
    return commas(Math.round(number*100)/100);
  } else {
    var oom = Math.floor((Math.log(man)+0.00000000000001) / Math.LN10);
    var mag = magnitude(oom);
    var rounded = Math.round(number/mag.value*100)/100;
    return commas(rounded) + mag.text;
  }
}

function updateInformation(address) {
  $('#focalAddress').text(address);

  var currencies = [];
  var balances = getBalances(address);
  for (var currency in balances) {
    currencies.push(currency);
  }
  currencies.sort(function(a,b){return (Math.abs(balances[b])-Math.abs(balances[a]))});

  var trustLines = nodes[nodeMap[address]].trustLines;
  if (!trustLines) {
    trustLines = [];
  }


  $('#balanceTable').html("");
  $('#balanceTable').append(
    '<tr class="toprow">'+
      '<td class="circlecell"><svg width="22" height="22">'+
        '<circle cx="11" cy="11" r="11" style="fill:'+COLOR_TABLE['XRP'][0][1]+';"></circle>'+
      '</svg></td>'+
      '<td class="light small mediumgray" style="width:35px;">XRP</td>'+
      '<td class="bold amount" id="xrpBalance">'+commas(nodes[nodeMap[address]].account.xrpBalance)+'</td>'+
      '<td class="light expander">&nbsp;</td>'+
    '</tr>');

  function sortHelper (a,b) {
    return Math.abs(b.balance)-Math.abs(a.balance);
  }

  function rowClick(){
    toggleExpansion(this);
  }

  for (var i=0; i<currencies.length; i++) {
    var cur = currencies[i];
    var trustLinesForCur = [];
    var tr, tl;

    for (var j=0; j<trustLines.length; j++) {
      var trustLine = trustLines[j];
      if (trustLine.currency == cur) {
        trustLinesForCur.push(trustLine);
      }
    }
    trustLinesForCur.sort(sortHelper);
    tr = $('<tr style="cursor:'+(trustLinesForCur.length ? 'pointer' : 'auto')+'" sublistid="'+cur+
          '" numberofsubrows="'+trustLinesForCur.length+'">'+
        '<td class="circlecell"><svg width="22" height="22">'+
          '<circle cx="11" cy="11" r="11" style="fill:'+COLOR_TABLE[(COLOR_TABLE.hasOwnProperty(cur)?cur:'___')][0][1]+';"></circle>'+
        '</svg></td>'+
        '<td class="light small mediumgray">'+cur+'</td>'+
        '<td class="bold amount">'+commas(balances[cur])+'</td>'+
        '<td class="light expander">'+(trustLinesForCur.length ? '<span id="'+cur+'Expander">+</span></td>' : '&nbsp;')+
      '</tr>');

    if (trustLinesForCur.length) tr.click(rowClick);
    $('#balanceTable').append(tr);


    if (trustLinesForCur.length) {
      $('#balanceTable').append(
        '<tr class="innertablecontainer" id="'+cur+'">'+
        '<td colspan=4>'+
        '<div id="'+cur+'Inner">'+
        '<table class="innertable" style="table-layout:fixed;" id="'+cur+'InnerTable">'+
        '</table></div></td></tr>');
      $('#'+cur+'InnerTable').append(
        '<tr>'+
          '<th class="light midsize mediumgray" style="width:50%;">Address</th>'+
          '<td class="light midsize mediumgray" style="width:16%;">Min</td>'+
          '<td class="light midsize mediumgray center" style="width:16%">Balance</td>'+
          '<td class="light midsize mediumgray right" style="width:16%;">Max</td>'+
        '</tr>');

      for (var k=0; k<trustLinesForCur.length; k++) {
        tl = trustLinesForCur[k];
        tr = $('<tr/>').append($('<th class="light address"/>').append(clickableAccountSpan(tl.account)));
        tr.append(
          '<td class="light '+(tl.limit_peer>0 ? 'negative ' : '')+'amount"><span title="'+commas(-1*tl.limit_peer)+'">'+roundNumber(-1*tl.limit_peer)+'</span></td>'+
          '<td style="width:37px;" class="bold '+(tl.balance<0 ? 'negative ' : '')+'amount center"><span title="'+commas(tl.balance)+'">'+roundNumber(tl.balance)+'</span></td>'+
          '<td style="width:37px;" class="light '+(tl.limit<0 ? 'negative ' : '')+'amount right"><span title="'+commas(tl.limit)+'">'+roundNumber(tl.limit)+'</span></td>'
        );

        $('#'+cur+'InnerTable').append(tr);
      }
    }
  }

  updateTransactions(address);
}

var txAltText = {
  "send"       :"Sent payment to...",
  "receive"    :"Received payment from...",
  "intermediate":"Intermediated payment of...",
  "sendfailed" :"Failed to send payment to...",
  "receivefailed":"Failed to receive payment from...",
  "intermediatefailed":"Failed to intermediate payment of...",
  "trustout"   :"Sent trust to...",
  "trustinfailed"    :"Failed to receive trust from...",
  "trustoutfailed"   :"Failed to send trust to...",
  "trustin"    :"Received trust from...",
  "offerout"   :"Made offer to give...",
  "offerin"    :"Accepted offer and got...",
  "offeroutfailed"   :"Failed to make offer to give...",
  "offerinfailed"    :"Failed to accept offer and get...",
  "canceloffer":"Canceled offer",
  "accountset":"Edited account properties"
};

function showTransactionWithHash(hash) {
  changingFocus = true;
  //window.location.hash = hash;
  changeMode("transaction",transactionMap[hash]);
}

var transactionMap = {};

function updateTransactions(address) {
  $('#transactionTable').html("");
  $("#transactionThrobber").remove();

  if (nodes[nodeMap[address]].transactions) {
    nodes[nodeMap[address]].transactions.forEach(function(obj) {
      var tx = obj.tx;
      var meta = obj.meta;
      var transactionType;
      var counterparty = "";
      var amount = null;
      var currency = null;
      var aissuer = null;
      var secondAmount = null;
      var secondCurrency = null;
      var secondAissuer = null;

      if (tx.TransactionType == "Payment") {
        amount = meta.DeliveredAmount || tx.Amount;
        if (tx.Account === address) {
          transactionType = "send";
          counterparty = tx.Destination;
        }
        else if (tx.Destination === address) {
          transactionType = "receive";
          counterparty = tx.Account;
        } else {
          transactionType = "intermediate";
        }
      } else if (tx.TransactionType === "TrustSet") {
        amount = tx.LimitAmount;
        if (tx.Account == address) {
          transactionType = "trustout";
          counterparty = tx.LimitAmount.issuer;
        }
        else if (tx.LimitAmount.issuer == address) {
          transactionType = "trustin";
          counterparty = tx.Account;
        } else {
          console.log("Could not interpret transaction TrustSet!");
          return;
        }
      } else if (tx.TransactionType == "OfferCreate") {
        if (tx.Account === address) {
          transactionType = "offerout";
          amount = tx.TakerGets;
          secondAmount = tx.TakerPays;
        } else {
          //console.log("An offer was made, but not by you. We must now scour the meta-data to find out how exactly this transaction affected you.");
          var affectedBalances = {};
          for (var j=0; j<meta.AffectedNodes.length; j++) {
            var mn = meta.AffectedNodes[j].ModifiedNode || meta.AffectedNodes[j].DeletedNode || meta.AffectedNodes[j].CreatedNode;
            var LatestFields = mn.FinalFields || mn.NewFields;
            var diff,type,cur,issuer,cip;


            if (mn && LatestFields) {
              if (LatestFields.Account == address || (LatestFields.HighLimit && LatestFields.HighLimit.issuer == address) ) {
                type = mn.LedgerEntryType;
                if (type == "AccountRoot") {
                  diff = LatestFields.Balance - (mn.PreviousFields ? mn.PreviousFields.Balance : 0);
                  if (affectedBalances["XRP"]) {
                    affectedBalances["XRP"]+=diff;
                  } else {
                    affectedBalances["XRP"]=diff;
                  }
                } else if (type == "RippleState") {
                  //console.log("Affected RippleState:", mn);
                  //Not sure why this is reversed, but that's the way it is:
                  diff = 0-(LatestFields.Balance.value - (mn.PreviousFields ? mn.PreviousFields.Balance.value : 0));
                  cur = LatestFields.Balance.currency;
                  issuer = LatestFields.LowLimit.issuer;
                  cip = cur+":"+issuer;
                  //console.log("Got/gave", cip, ":", diff);
                  if (affectedBalances[cip]) {
                    affectedBalances[cip]+=diff;
                  } else {
                    affectedBalances[cip]=diff;
                  }
                } else {
                  //console.log("Affected my", type,  mn);
                }

              } else {
                //console.log("Did not affect me?", mn);
              }
            }
          }

          var affectedKeys = Object.keys(affectedBalances)
          if (affectedKeys.length == 2) {
            var fip = affectedBalances[affectedKeys[0]] > 0;
            var posKey = fip > 0 ? 0 : 1;
            var negKey = fip > 0 ? 1 : 0;
            var positive = affectedBalances[affectedKeys[posKey]];
            var negative = affectedBalances[affectedKeys[negKey]];
            if (positive * negative > 0) {
              console.log("Could not interpret as offerin.");
              return;
            } else {
              transactionType = "offerin";
              amount = affectedKeys[posKey]=="XRP" ? positive : {value: positive, currency: affectedKeys[posKey]};
              secondAmount = affectedKeys[negKey]=="XRP" ? -negative : {value: -negative, currency: affectedKeys[negKey]};
            }
          } else {
            console.log("Could not interpret as offerin.", affectedBalances);
            return;
          }
        }
      } else if (tx.TransactionType == "OfferCancel") {
        transactionType = "canceloffer";
      } else if (tx.TransactionType == "AccountSet") {
        transactionType = "accountset";
      } else {
        console.log("Could not interpret transaction: "+tx.transactionType);
      }

      if (amount) {
        if (amount.currency) {
          currency = amount.currency.split(":")[0];
          aissuer = amount.currency.split(":")[1];
          amount = amount.value;
        } else {
          currency = "XRP";
          amount = amount/1000000;
        }
      }

      if (secondAmount) {
        if (secondAmount.currency) {
          secondCurrency = secondAmount.currency.split(":")[0];
          secondAissuer = secondAmount.currency.split(":")[1];
          secondAmount = secondAmount.value;
        } else {
          secondCurrency = "XRP";
          secondAmount = secondAmount/1000000;
        }
      }

      transactionMap[obj.hash] = obj;
      var success = meta.TransactionResult == "tesSUCCESS" ? "" : "failed";
      var result =  meta.TransactionResult == "tesSUCCESS" ? "" : "["+meta.TransactionResult+"] ";
      var tr = $('<tr hash="'+obj.hash+'"/>');
      var td = $('<td style="width:10%;"/>');
      var div = $('<div class="'+transactionType+success+' icon" title="'+result+txAltText[transactionType+success]+'">&nbsp;</div>');

      if (transactionType=='send' ||
          transactionType=='receive' ||
          transactionType=='intermediate') {

        div.on('contextmenu', makeMenuClick(obj)).on('click', makeClick(obj));

      } else {
        div.css('cursor', "default");
      }

      td.append(div);
      tr.append(td);

      td = $('<td style="width:90%"'+(counterparty===""?' colspan="1"':'')+'>');
      var span = $('<span style="float:left">');
      span.append('<span '+(aissuer&&!(transactionType=='trustin'||transactionType=='trustout')?'title="'+aissuer+'"':'')+'>');

      if (amount) span.append('<span class="bold amount small" >'+commas(amount)+'</span> <span class="light small darkgray" style="margin-right:5px">'+currency+'</span></span>');
      if (secondAmount) span.append(' <i class="light small darkgray" style="margin-right:5px">for</i> <span '+(secondAissuer&&!(transactionType=='trustin'||transactionType=='trustout')?'title="'+secondAissuer+'"':'')+'><span class="bold amount small">'+commas(secondAmount)+'</span> <span class="light small darkgray" style="margin-right:5px">'+secondCurrency+'</span>');
      span.append(agoDate(obj.date));
      td.append(span);

      if (counterparty) td.append(clickableAccountSpan(counterparty).css({
        display         : "block",
        "margin-top"    : "3px",
        overflow        : "hidden",
        "text-overflow" : "ellipsis"
      }).addClass("right"));

      tr.append(td);
      $('#transactionTable').append(tr);
    });

    if (!nodes[nodeMap[address]].transactionsFinished) { //Are there more?
      $('#transactionTable').append('<tr id="transactionThrobber"><td colspan=3 style="text-align:center; padding:10px"><img class="loader" src="assets/images/rippleThrobber.png" width=30 height=30 /></td></tr>');
      $('#transactionThrobber').bind('inview', function (event, visible) {
        if (visible === true) {
          getNextTransactionPage();
        }
      });
    } else {
      console.log("Looks like we're finished?", nodes[nodeMap[address]]);
    }

  }

  function makeMenuClick(tx) {
    return function () {
        animateInPlaceWithHash(tx.hash);
        return false;
    };
  }

  function makeClick(tx) {
    return function(){
        showTransactionWithHash(tx.hash);
    }
  }
}


function animateInPlaceWithHash(hash) {
  var tx = transactionMap[hash];
  //walk the paths to see if any nodes need to be added.
  walkPaths(tx);
  animateTransaction(tx);
}


function agoDate(date) {
  return '<span style="margin-right:5px" ' +
    'class="light small mediumgray date" title="' +
    moment(date).format('lll') + '">' +
    moment(date).fromNow() + '</span>';
}

function getBalances(address) {
  var balances = {};
  if (nodes[nodeMap[address]].trustLines) {
    for (var i=0; i<nodes[nodeMap[address]].trustLines.length; i++) {
      var trustLine = nodes[nodeMap[address]].trustLines[i];
      if (balances[trustLine.currency]) {
        balances[trustLine.currency] += parseFloat(trustLine.balance);
      } else {
        balances[trustLine.currency] = parseFloat(trustLine.balance);
      }
    }
  }

  return balances;
}

function linkOrNot(d) {
  if(currentCurrency=="XRP" || currentCurrency==d.currency) {
    var o = 5*Math.pow(Math.log(1+d.value),0.3333);
    return o;
  }
  else{return 0;}
}

function isLinkVisible(d) {
  return currentCurrency=="XRP" || currentCurrency==d.currency
}

function changeCurrency(newCurrency) {
  var isOther = (newCurrency == '___');
  if (isOther && $('#otherCurrency').css('font-style')!='italic') {
    newCurrency = $('#otherCurrency').val();
  }
  if (newCurrency == "___") {
    $("#otherCurrency").css("display","block");
  } else {
    if (isOther) {
      $("#otherCurrency").css("display","block");
    } else {
      $("#otherCurrency").css("display","none");
    }
    currentCurrency = newCurrency;
    degreeMap = {};
    degreeMap[focalNode] = 0;
    reassignColors(focalNode);
    fadeLinks(focalNode);
    colorRogueNodes();
    updated = svg.select("g#nodeGroup").selectAll("circle.node");
    updated.attr("r", nodeRadius );
    svg.select("g#haloGroup").selectAll("circle.halo").attr("r", function(d){return HALO_MARGIN+nodeRadius(d);} );
    svg.select("g#linkGroup").selectAll("line.static").attr("stroke-width", linkOrNot);
    force.start();
  }
}

function toggleExpansion(row) {
  var cur = row.getAttribute("sublistid");
  var numberOfSubrows = parseInt(row.getAttribute("numberofsubrows"), 10);
  var expander = document.getElementById(cur+"Expander");
  if (expander.innerHTML == "+") {
    $('#'+cur+'Inner').animate({height:(11+(numberOfSubrows+1)*25.5)+'px'});
        $('#'+cur).show()
    expander.innerHTML = "&ndash;";
  } else {
    $('#'+cur+'Inner').animate({height:'0px'}, {complete: function(){$('#'+cur).hide();} });
    expander.innerHTML = "+";
  }
}


function focusOtherCurrency(that) {
  if ($(that).css('font-style')=='italic') {
    $(that).css('font-style','inherit').css('color','inherit').val('');
  }
}

function blurOtherCurrency(that) {

  if ($(that).val()==='' || $(that).css('font-style')=='italic') {
    $(that).css('font-style','italic').css('color','#999').val('other');
  } else {
    var upper=$(that).val().toUpperCase();
    $(that).val(upper);
    changeCurrency('___');
  }
}
/*
window.onhashchange = function(){
  if (!changingFocus) {
    if (window.location.hash == "" || window.location.hash == "#") {
      refocus(REFERENCE_NODE, true);
    } else if (window.location.hash.charAt(1) == "r") {
      if (nodeMap[window.location.hash.substring(1)]) {
        expandNode(window.location.hash.substring(1));
      }
    } else if ("0123456789ABCDEF".indexOf(window.location.hash.charAt(1)) != -1) {
      showTransactionWithHash(window.location.hash.substring(1));
    }

  } else {
  }
  changingFocus = false;
};
*/

  $(function () {$('.scroll-pane').jScrollPane({autoReinitialise: true, hideFocus: true});});
  $(function () {$("#currency").selectbox();});
  $("#focus").keyup(function(event){
    if(event.keyCode == 13){
      $("#searchButton").click();
    }
  });
  $("#otherCurrency").keyup(function(event){
    if(event.keyCode == 13){
      $(this).blur();
    }
  });

  $('#searchButton').click(gotoThing);

  $('#feedTab').click(function(){
    changeMode('feed');
  });

  $('#individualTab').click(function(){
    changeMode('individual',senderAddress);
  });

  $('#zoomInButton').click(zoomIn);
  $('#zoomOutButton').click(zoomOut);
  $('#currency').change(function(){
    changeCurrency(this.value);
  });

  $('#otherCurrency')
    .focus(function(){focusOtherCurrency(this)})
    .blur(function(){blurOtherCurrency(this)});

  function resizeGraph () {
    //translationX = parseInt(svg.style("width"),10)/4;
    //translationY = parseInt(svg.style("height"),10)/4;
    translationX = translationY = 0;
    panAndZoom();
  }

  addResizeListener($('#visualization').get(0), resizeGraph);

  this.suspend = function() {
    force.nodes([]).links([]).stop();
    svg.html('');
    clearInterval(requestRepetitionInterval);
    remote.connection.removeListener('transaction', handleTransaction);
    remote.removeListener('ledger', handleLedger);
  }

  remote.connection.on('transaction', handleTransaction);
  remote.on('ledger', handleLedger);

  function handleLedger(d) {
    currentLedger = d.ledgerVersion;
  }

  function init () {

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
      }

      if (firstTime) {
        if (transaction_id && transaction_id !== "") {
          nodeMap = {};
          degreeMap = {};
          nodes = [];
          $('#focus').val(transaction_id);
          api.getTx(transaction_id, handleIndividualTransaction);

        } else if (rippleName) {
          $('#focus').val(rippleName);
          nameService(rippleName, function(name, address){
            if (address) {
              focalNode = address;
              expandNode(focalNode);
              addNodes(0);
            } else {
              $(".loading")
                .text('No Address Found.')
                .css("color","#a00");
            }
          });

        } else {
          $('#focus').val(focalNode);
          lastFocalNode = REFERENCE_NODE;
          expandNode(focalNode);
          addNodes(0);
        }
      }
      firstTime = false;
  }

  if (remote.isConnected()) {
    init();

  } else {
    remote.connect()
    .then(init)
    .catch(function(e) {
      console.log(e);
    });
  }
}
