var TransactionFeed = function (options) {
  var self       = this,
    apiHandler   = new ApiHandler(options.url),
    div          = d3.select('#'+options.id).attr("class","transactions"),
    transactions = [],
    listener;
 
  var summary = div.append("div").attr('class', 'summary');
  var price = summary.append("div").attr('class', 'price');
  price.append("span").attr('class', 'amount');
  price.append("span").attr('class', 'pair');
  
  var daily = summary.append('div').attr('class','daily');
  daily.append('span').attr('class','high').html('H: --');
  daily.append('span').attr('class','low').html('L: --');
  daily.append('span').attr('class','volume').html('VOL: --');
  daily.append('label').html('(Last 24 hours)');
  
  var table = div.append('table');
  table.append('thead');
  table.append('tbody');
  
  this.loadPair = function (base, trade) {
    self.base  = base;
    self.trade = trade;
    
    if (listener) listener.updateViewOpts({base:base,trade:trade});
    else listener = new OffersExercisedListener({base:base,trade:trade}, handleTransaction);
    
    //mock data
    transactions = [
      {time:moment(new Date()), amount:100, price:50, type:""},
      {time:moment(new Date()), amount:110, price:200, type:"bid"},
      {time:moment(new Date()), amount:120, price:300, type:"ask"},
      {time:moment(new Date()), amount:130, price:400, type:"ask"},
      {time:moment(new Date()), amount:140, price:500, type:"ask"},
      {time:moment(new Date()), amount:150, price:600, type:"bid"},
      {time:moment(new Date()), amount:100, price:50, type:"bid"},
      {time:moment(new Date()), amount:110, price:200, type:"bid"},
      {time:moment(new Date()), amount:120, price:300, type:"ask"},
      {time:moment(new Date()), amount:130, price:400, type:"ask"},
      {time:moment(new Date()), amount:140, price:500, type:"ask"},
      {time:moment(new Date()), amount:150, price:600, type:"bid"},
      {time:moment(new Date()), amount:100, price:50, type:"bid"},
      {time:moment(new Date()), amount:110, price:200, type:"bid"}
    ];
    
    transactions = [];
    updateTrades();  //reset the last trade list
    loadDailyStats();
  }
  
  function handleTransaction (data) {
    console.log(data);
    
    var last = transactions[0];
    
    var trade = {
      time   : moment(data.key.slice(2)),
      amount : data.value[1],
      price  : data.value[2],
      type   : ''
    }
    
    transactions.unshift(trade);  //prepend trade
    transactions = transactions.slice(0,100);  //keep last 100
    
    console.log(trade);
    console.log(moment(trade.time).format());
    //console.log(transactions);
     
    updateTrades();      
  }
  
  function updateTrades () {
    var last = transactions[0];
      lastPrice = last ? last.price : "";
      
    price.select(".amount").html(valueFilter(lastPrice));
    price.select(".pair").html(self.base.currency+"/"+self.trade.currency);
    
    var rows = table.select("tbody").selectAll("tr")
      .data(transactions);
      
    var rowEnter = rows.enter().append("tr");
    
    rowEnter.append("td").attr("class","type");
    rowEnter.append("td").attr("class","amount");
    rowEnter.append("td").attr("class","time");
    rowEnter.append("td").attr("class","price");
    rows.exit().remove();
    
    rows.select(".type").attr('class', function(d){return "type "+d.type}); 
    rows.select(".amount").html(function(d){return valueFilter(d.amount)+" <small>"+self.base.currency+"</small>"});
    rows.select(".time").html(function(d){return d.time.local().format('h:mm:ss a')});
    rows.select(".price").html(function(d){return valueFilter(d.price)}); 
  }
  
  function valueFilter (d) {
    if (!d) return "&nbsp";
    value = ripple.Amount.from_human(d).to_human({
        precision      : 6,
        min_precision  : 0,
        max_sig_digits : 8
    }); 
    
    var parts = value.split(".");
    var decimalPart = parts[1] ?  parts[1].replace(/0(0+)$/, '0') : null;
    value = decimalPart && decimalPart.length > 0 ? parts[0] + "." + decimalPart : parts[0];
    return value;        
  }
  
  function loadDailyStats() {
    
    var now  = moment();
    var then = moment().subtract(1, 'days');
     
    if (self.request) self.request.abort();
    self.request = apiHandler.offersExercised({
      startTime     : then,
      endTime       : now,
      timeIncrement : 'all',
      
      "trade[currency]" : self.trade.currency,
      "trade[issuer]"   : self.trade.issuer ? self.trade.issuer : "",
      "base[currency]"  : self.base.currency,
      "base[issuer]"    : self.base.issuer  ? self.base.issuer : ""

    }, function(data){

      daily.select(".high").html("<small>H:</small> "+valueFilter(data[0].high));
      daily.select(".low").html("<small>L:</small> "+valueFilter(data[0].low));
      daily.select(".volume").html("<small>VOL:</small> "+valueFilter(data[0].volume)+"<small>"+self.base.currency+"</small>");
      price.select(".amount").html(valueFilter(data[0].close));
      price.select(".pair").html(self.base.currency+"/"+self.trade.currency);
      
    }, function (error){
      console.log(error);
    });   
  }
  
  this.suspendLiveFeed = function () {
    if (listener) listener.stopListener();
  }
}