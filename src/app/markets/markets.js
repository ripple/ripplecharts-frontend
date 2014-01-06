angular.module( 'ripplecharts.markets', [
  'ui.state',
  'ui.bootstrap'
])

.config(function config( $stateProvider ) {
  $stateProvider.state( 'markets', {
    url: '/markets',
    views: {
      "main": {
        controller: 'MarketsCtrl',
        templateUrl: 'markets/markets.tpl.html'
      }
    },
    data:{ pageTitle: 'Markets' }
  });
})

.controller( 'MarketsCtrl', function MarketsCtrl( $scope ) {

  //load chart   
  var loaded = false,  
    trade    = {currency:"XRP", issuer:""},
    base     = {currency:"BTC", issuer:"rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B"},
    dropdownB = ripple.currencyDropdown().selected(trade)
      .on("change", function(d) {
        if (loaded) {
          priceChart.load(base, trade = d, d3.select("#interval .selected").datum());
          book.getMarket(base, trade);
          transFeed.loadPair (base, trade);
        }}),
    dropdownA = ripple.currencyDropdown().selected(base)
      .on("change", function(d) {
        if (loaded) {
          priceChart.load(base = d, trade, d3.select("#interval .selected").datum());
          book.getMarket(base, trade); 
          transFeed.loadPair (base, trade);
        }});

  d3.select("#base").call(dropdownA);
  d3.select("#quote").call(dropdownB);
  d3.select("#flip").on("click", function(){ //probably better way to do this
    dropdownA.selected(trade);
    dropdownB.selected(base);
    d3.select("#base").selectAll("select").remove();
    d3.select("#quote").selectAll("select").remove();
    loaded = false;
    d3.select("#base").call(dropdownA);
    d3.select("#quote").call(dropdownB);
    loaded = true;
    swap   = trade;
    trade  = base;
    base   = swap;
    priceChart.load(base, trade, d3.select("#interval .selected").datum());
    book.getMarket(base, trade);
    transFeed.loadPair (base, trade);
  });
  
  var intervalA = d3.select("#interval").selectAll("a")
    .data([
      {name: "10m", interval:"second", multiple:5,  offset: function(d) { return d3.time.minute.offset(d, -10); }},
      {name: "1h",  interval:"second", multiple:15, offset: function(d) { return d3.time.hour.offset(d, -1); }},
      {name: "12h", interval:"minute", multiple:1,  offset: function(d) { return d3.time.hour.offset(d, -12); }},
      {name: "24h", interval:"minute", multiple:15,  offset: function(d) { return d3.time.day.offset(d, -1); }},
      {name: "3d",  interval:"hour",   multiple:1,  offset: function(d) { return d3.time.day.offset(d, -3); }},
      {name: "1m",  interval:"hour",   multiple:6,  offset: function(d) { return d3.time.month.offset(d, -1); }},
      {name: "3m",  interval:"day",    multiple:1,  offset: function(d) { return d3.time.month.offset(d, -3); }},
      {name: "6m",  interval:"day",    multiple:1,  offset: function(d) { return d3.time.month.offset(d, -6); }},
      {name: "1y",  interval:"day",    multiple:3,  offset: function(d) { return d3.time.year.offset(d, -1); }},
      {name: "max", interval:"day",    multiple:7,  offset: function(d) { return d3.time.year.offset(d, -10); }}])
    .enter().append("a")
    .attr("href", "#")
    .classed("selected", function(_, i) { return !i; })
    .text(function(d) { return d.name; })
    .on("click", function(d) {
      d3.event.preventDefault();
      var that = this;
      intervalA.classed("selected", function() { return this === that; });
      priceChart.load(base, trade, d);
    });
    
  var chartType = d3.select("#chartType").selectAll("a")
    .data(["line", "candlestick"])
    .enter().append("a")
    .attr("href", "#")
    .classed("selected", function(_, i) { return !i; })
    .text(function(d) { return d })   
    .on("click", function(d) {
      d3.event.preventDefault();
      var that = this;
      chartType.classed("selected", function() { return this === that; });
      chartType.selected = d;
      priceChart.setType(d);
    });

  chartType.selected = "line";

  var priceChart = new PriceChart ({
    id     : "#priceChart",
    url    : API,  
    type   : chartType.selected
  });   

  loaded = true;
  d3.select("#interval a:nth-child(3)")[0][0].click();

  var remote = new ripple.Remote(Options.ripple);
    
  book = new OrderBook ({
    chartID : "bookChart",
    tableID : "bookTables",
    remote  : remote
  });
  
  book.resetChart();
  
  remote.connect();
  remote.on('connect', function(){
    book.getMarket(base, trade);
  }); 
  
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
    daily.append('span').attr('class','high').html('high: --');
    daily.append('span').attr('class','low').html('low: --');
    daily.append('span').attr('class','volume').html('volume: --');
    daily.append('label').html('(Last 24 hours)');
    
    var table = div.append('table');
    table.append('thead');
    table.append('tbody');
    
    this.loadPair = function (base, trade) {
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
      loadDailyStats(base, trade);
    }
    
    function handleTransaction (data) {
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
      console.log(transactions);
       
      updateTrades();      
    }
    
    function updateTrades () {
      var last = transactions[0];
        lastPrice = last ? last.price : "";
        
      price.select(".amount").html(valueFilter(lastPrice));
      price.select(".pair").html(base.currency+"/"+trade.currency);
      
      var rows = table.select("tbody").selectAll("tr")
        .data(transactions);
        
      var rowEnter = rows.enter().append("tr");
      
      rowEnter.append("td").attr("class","type");
      rowEnter.append("td").attr("class","amount");
      rowEnter.append("td").attr("class","time");
      rowEnter.append("td").attr("class","price");
      rows.exit().remove();
      
      rows.select(".type").attr('class', function(trade){return "type "+trade.type}); 
      rows.select(".amount").html(function(trade){return valueFilter(trade.amount)+" <small>"+base.currency+"</small>"});
      rows.select(".time").html(function(trade){return trade.time.local().format('h:mm:ss a')});
      rows.select(".price").html(function(trade){return valueFilter(trade.price)}); 
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
    
    function loadDailyStats(base, trade) {
      
      var now  = moment();
      var then = moment().subtract(1, 'days');
       
      if (self.request) self.request.abort();
      self.request = apiHandler.offersExercised({
        startTime     : then,
        endTime       : now,
        timeIncrement : 'all',
        
        "trade[currency]" : trade.currency,
        "trade[issuer]"   : trade.issuer ? trade.issuer : "",
        "base[currency]"  : base.currency,
        "base[issuer]"    : base.issuer  ? base.issuer : ""
  
      }, function(data){

        daily.select(".high").html("<small>H:</small> "+valueFilter(data[0].high));
        daily.select(".low").html("<small>L:</small> "+valueFilter(data[0].low));
        daily.select(".volume").html("<small>VOL:</small> "+valueFilter(data[0].volume)+"<small>"+base.currency+"</small>");
        price.select(".amount").html(valueFilter(data[0].close));
        price.select(".pair").html(base.currency+"/"+trade.currency);
        
      }, function (error){
        console.log(error);
      });   
    }
    
    this.suspendLiveFeed = function () {
      if (listener) listener.stopListener();
    }
  }
  
  transFeed = new TransactionFeed({
    id     : "tradeFeed",
    url    : API   
  });
  
  transFeed.loadPair (base, trade);
  
  
  $scope.$on("$destroy", function(){
    console.log("destroy");
    priceChart.suspendLiveFeed();
    transFeed.suspendLiveFeed();
    //stop the listener when leaving 
  });
});
