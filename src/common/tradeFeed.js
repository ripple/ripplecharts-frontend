var TradeFeed = function (options) {
  var self       = this,
    apiHandler   = new ApiHandler(options.url),
    div          = d3.select('#'+options.id).attr("class","tradeFeed"),
    transactions = [],
    listener, dailyTimer, high, low, close, volume;
 
  var summary = div.append("div").attr('class', 'summary');
  var price = summary.append("div").attr('class', 'price');
  price.append("span").attr('class', 'amount');
  price.append("span").attr('class', 'pair');
  
  var daily = summary.append('div').attr('class','daily');
  daily.append('span').attr('class','high').html('H: --');
  daily.append('span').attr('class','low').html('L: --');
  daily.append('span').attr('class','volume').html('VOL: --');
  daily.append('label').html('(Last 24 hours)');
  
  var tableWrap = div.append('div').attr('class','table').append("div").attr("class","tableWrap");
  var table     = tableWrap.append('table');
  table.append('thead');
  table.append('tbody');
  
  var status = tableWrap.append("h4").attr('class','status');
  var loader = tableWrap.append("img")
      .attr("class", "loader")
      .attr("src", "assets/images/rippleThrobber.png")
      .style("opacity", 0); 
 
 
//load the latest trade feed for the given pair   
  this.loadPair = function (base, trade) {
    self.base  = base;
    self.trade = trade;
    high = low = close = volume = 0;
    
    if (listener) listener.updateViewOpts({base:base,trade:trade});
    else listener = new OffersExercisedListener({base:base,trade:trade}, handleTransaction);

/*   
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
*/   
    transactions = [];
    updateTrades();     //reset the last trade list
    updateDailyStats(); //reset the daily stats
    loadHistoricalData();
  }
  
  
//process incoming transaction from the live feed handler  
  function handleTransaction (data) {
    
    var last = transactions[0];
    
    var trade = {
      time   : moment.utc(data.key.slice(2)),
      amount : data.value[1], //oddly backwards from my expectation
      price  : data.value[2],
      type   : ''
    }
    
    if (last && last.price<trade.price)      trade.type = 'ask';
    else if (last && last.price>trade.price) trade.type = 'bid';
    //else if (last)                         trade.type = last.type;
    
    transactions.unshift(trade);  //prepend trade
    transactions = transactions.slice(0,50);  //keep last 50
    
    if (trade.price>high) high = trade.price;
    if (trade.price<low)  low  = trade.price;
    close   = trade.price;
    volume += trade.amount;
    
    updateDailyStats(); 
    updateTrades();
    loader.style('opacity', 0);    
  }
  
  
//update the display with new data  
  function updateTrades () {
    status.html(transactions.length ? "" : "no recent trades");
    
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
 
 
//make values human readable  
  function valueFilter (d) {
    if (!d) return "&nbsp";
    value = ripple.Amount.from_human(d).to_human({
        precision      : 6,
        min_precision  : 0,
        max_sig_digits : 8
    }); 
    
    //its possible there are other reasons for value being empty, but right
    //now i am assuming it is below the minimum threshold
    if (!value) return "> 0.000001"; //must match min_precision variable
    var parts = value.split(".");
    var decimalPart = parts[1] ?  parts[1].replace(/0(0+)$/, '0') : null;
    value = decimalPart && decimalPart.length > 0 ? parts[0] + "." + decimalPart : parts[0];
    return value;        
  }
 
 
//load price and volume stats from the last 24hours  
  function loadDailyStats () {
    var now  = moment();
    var then = moment().subtract(1, 'days');
     
    if (self.requestDaily) self.requestDaily.abort();
    self.requestDaily = apiHandler.offersExercised({
      startTime     : then.toDate(),
      endTime       : now.toDate(),
      timeIncrement : 'all',
      base          : self.base,
      trade         : self.trade
      
    }, function(data){

      if (data && data.length) {
        //TODO: should be comparing the existing high and low      
        high   = data[0].high;
        low    = data[0].low;
        volume = data[0].volume;
        if (!close) close = data[0].close; //dont overwrite existing
      }
      
      updateDailyStats();
      
    }, function (error){
      console.log(error);
    });     
  }


//display 24 hour stats from the known values
  function updateDailyStats () {
      daily.select(".high").html("<small>H:</small> "+valueFilter(high));
      daily.select(".low").html("<small>L:</small> "+valueFilter(low));
      daily.select(".volume").html("<small>VOL:</small> "+valueFilter(volume)+"<small>"+self.base.currency+"</small>");
      price.select(".amount").html(valueFilter(close));
      price.select(".pair").html(self.base.currency+"/"+self.trade.currency);
  }


//load latest trades historical data from the API  
  function loadHistoricalData() {
    if (dailyTimer) clearInterval(dailyTimer);
    dailyTimer = setInterval(loadDailyStats, 180000);
    loadDailyStats();
   
    loader.transition().style('opacity',1);
    status.html("");
    
    var now  = moment();
    var then = moment().subtract(1, 'days');
        

    if (self.request) self.request.abort();
    self.request = apiHandler.offersExercised({
      startTime  : then.toDate(),
      endTime    : now.toDate(),
      reduce     : false,
      base       : self.base,
      trade      : self.trade,
      descending : true,
      limit      : 50
      
    }, function(data){

      loader.transition().style('opacity',0);
      transactions = transactions.concat(data).slice(0,50);   
      updateTrades()
           
    }, function (error){

      if (!transactions.length) //trades may have come through the live feed
        status.html(error.text ? error.text : "Unable to load data");
      
      loader.transition().style('opacity',0);      
      console.log(error);
    }); 
  }
  
  
//stop the live feed and the daily stats updater  
  this.suspend = function () {
    if (listener) listener.stopListener();
    if (dailyTimer) clearInterval(dailyTimer);
  }
}