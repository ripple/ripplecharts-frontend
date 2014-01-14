

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
     
  this.handleTransaction = function (data) {
    addTransaction(data.transaction);
 
    var rows     = self.div.selectAll('.transaction').data(transactions);
    var rowEnter = rows.enter().append('div').attr('class','transaction');
    
    
    
    rowEnter.append("span").attr("class","time");
    rowEnter.append("span").attr("class","icon");
    rowEnter.append("span").attr("class","details");
    rowEnter.append("div").attr("class", "accounts");
    
    rows.select('.time').html(function(d){return absoluteTime(d.time)});
    rows.select('.icon')
      .attr('class', function(d){return d.type + " icon"})
      .attr('title', function(d){return txAltText[d.type]});
    rows.select('.details').html(function(d){
      var html = prepareAmount(d.amount1, d.currency1);
      if (d.amount2) html += "<i>for</i>" + prepareAmount(d.amount2, d.currency2);  
      return html;
    });
    
    rows.select(".accounts").html(function(d){return accountSpan(d.from)+(d.to ? "<i>to</i>"+accountSpan(d.to) : "")});

  }
  
  function accountSpan (address) {
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
      console.log("unhandled", tx);
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
  
  function prepareAmount (amount, currency) {
    var html = "";
    if (amount && currency) html = "<b>"+commas(amount)+"</b><small>"+currency+"</small>";
    return html;
  }
  
  //convert to html
  function renderTransaction(tx) {

    var transactionType;
    var from = tx.Account;
    var to = null;
    var amount = null;
    var currency = null;
    var secondAmount = null;
    var secondCurrency = null;
    if (tx.TransactionType == "Payment") {
      amount = tx.Amount;
      transactionType = "send";
      to = tx.Destination;
    } else if (tx.TransactionType == "TrustSet") {
      amount = tx.LimitAmount;
      transactionType = "trustout";
      to = tx.LimitAmount.issuer;
    } else if (tx.TransactionType == "OfferCreate") {
      transactionType = "offerout";
      amount = tx.TakerGets;
      secondAmount = tx.TakerPays;
    } else if (tx.TransactionType == "OfferCancel") {
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
    console.log('tTX:', tx);
    return (
      '<td style="width:80px;">'+absoluteTime(tx.date)+'</td>'+
      '<td style="width:1px;">'+clickableAccountSpan(from)+'</td>'+
      '<td style="width:40px;"><div '+(transactionType=='send'?'oncontextmenu="animateInPlaceWithHash(\''+tx.hash+'\');return false;" onclick="showTransactionWithHash(\''+tx.hash+'\')"':'')+' class="'+transactionType+' icon" title="'+txAltText[transactionType]+'">&nbsp;</div></td>'+
      ( to||secondAmount ?
        '<td style="width:1px;"><span class="bold amount small">'+commas(amount)+'</span>&nbsp;<span class="light small darkgray">'+currency+'</span></td>'+
        '<td style="text-align:center; width:20px;"><i class="light small darkgray">'+
        ( to ?
          'to</i></td>'+
          '<td style="width:1px;">'+clickableAccountSpan(to)+'</td>'
          :
          'for</i></td>'+
          '<td style="width:1px;"><span class="bold amount small">'+commas(secondAmount)+'</span>&nbsp;<span class="light small darkgray">'+secondCurrency+'</span></td>'
        )
        :
        '<td colspan=3></td>'
      ));
  }
  
  function absoluteDateOnly(secondsSince2000) {
    var d = new Date(0);
    d.setUTCSeconds(secondsSince2000+946684800);
    return d.getDate()+' '+['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]+' '+d.getFullYear()
  }

  function absoluteTimeOnly(secondsSince2000) {
    var d = new Date(0);
    d.setUTCSeconds(secondsSince2000+946684800);
    var hours = d.getHours();
    var minutes = d.getMinutes();
    var ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    minutes = minutes < 10 ? '0'+minutes : minutes;
    return strTime = hours + ':' + minutes + ':' + (d.getSeconds()<10 ? '0'+d.getSeconds() : d.getSeconds()) + ' ' + ampm;
  }
  
  function absoluteDate(secondsSince2000) {
    var d = new Date(0);
    d.setUTCSeconds(secondsSince2000+946684800);
    return '<span class="date" title="'+absoluteTimeOnly(secondsSince2000)+'">'+absoluteDateOnly(secondsSince2000)+'</span>';
  }
  function absoluteTime(secondsSince2000) {
    var d = new Date(0);
    d.setUTCSeconds(secondsSince2000+946684800);
    return '<span class="date" title="'+absoluteDateOnly(secondsSince2000)+'">'+absoluteTimeOnly(secondsSince2000)+'</span>';
  }
  
  function clickableAccountSpan(address) {
    var o = "<span class='light address' style='cursor:pointer;' "+
      "onmouseover='lightenAddress(\""+address+"\");' "+
      "onmouseout='darkenAddress(\""+address+"\");' "+
      "onclick='expandNode(\""+address+"\");'>"+
      address+"</span>";
    return o;
  }
  
  
  function commas(number) {
    var parts = number.toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
  }
}


