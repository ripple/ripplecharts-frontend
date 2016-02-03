var TradeFeed = function (options) {
  var self       = this,
    apiHandler   = new ApiHandler(options.url),
    div          = d3.select('#'+options.id).attr("class","tradeFeed"),
    transactions = [],
    listener, dailyTimer, high, low, close, volume;

  var numberFormat = d3.format(',');
  var summary = div.append("div").attr('class', 'summary');
  var price = summary.append("div").attr('class', 'price');
  price.append("span").attr('class', 'amount');
  price.append("span").attr('class', 'pair');

  var daily = summary.append('div').attr('class','daily');
  daily.append('span').attr('class','high').html('H: --');
  daily.append('span').attr('class','low').html('L: --');
  daily.append('span').attr('class','volume').html('VOL: --');
  daily.append('label').attr('class','date').html('--');

  var tableWrap = div.append('div').attr('class','table')
    .append("div")
    .attr("class","tableWrap");

  var table  = tableWrap.append('table');
  var header = table.append('thead')
    .append('tr')
    .attr('class', 'trade-table-header');


  header.append('td').attr('class', 'amount').attr('colspan', 4);
  header.append('td').html('Time');
  header.append('td').attr('class', 'price').attr('colspan', 3);

  table.append('tbody');

  var status = tableWrap.append("h4").attr('class','status');
  var loader = tableWrap.append("img")
      .attr("class", "loader")
      .attr("src", "assets/images/rippleThrobber.png")
      .style("opacity", 0);


//load the latest trade feed for the given pair
  this.loadPair = function (base, counter) {
    self.base    = base;
    self.counter = counter;
    high = low = close = volume = 0;

    if (listener) listener.updateViewOpts({base:base,counter:counter});
    else listener = new OffersExercisedListener({base:base,counter:counter}, handleTransaction);

    var b = self.base.currency;
    var c = self.counter.currency;

    header.selectAll('.amount').html('Amount <small>'+b+'</small>');
    header.selectAll('.price').html('Price <small>'+c+'</small>');

    transactions = [];
    updateTrades();     //reset the last trade list
    updateDailyStats(); //reset the daily stats
    loadHistoricalData();
  }


//process incoming transaction from the live feed handler
  function handleTransaction (data) {
    var last = transactions[0];
    var price = data.value[2];

    var trade = {
      time   : moment.unix(data.value[7]),
      amount : valueFilter(data.value[0], 8),
      price  : valueFilter(price, 5),
      type   : data.value[3] === data.value[5] ? 'buy' : 'sell'
    }

    transactions.unshift(trade);  //prepend trade
    transactions = transactions.slice(0,60);  //keep last 60

    if (price > high) high = price;
    if (price < low)  low  = price;

    close   = data.value[2];
    volume += data.value[0];

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
    var baseCurrency = self.base.currency;
    rowEnter.append("td").attr("class","type");
    rowEnter.append("td").attr("class","amount");
    rowEnter.append("td").attr("class","dot").html('.');
    rowEnter.append("td").attr("class","amount-decimal");
    rowEnter.append("td").attr("class","time");
    rowEnter.append("td").attr("class","price");
    rowEnter.append("td").attr("class","dot").html('.');
    rowEnter.append("td").attr("class","price-decimal");
    rows.exit().remove();

    rows.select(".type").attr('class', function(d){return "type "+d.type});
    rows.select(".amount").html(function(d){return d.amount.split('.')[0]});
    rows.select(".amount-decimal").html(function(d){
      var decimal = d.amount.split('.')[1];
      return decimal ? decimal.replace(/0(0+)$/, '0<span class="insig">$1</span>') : '0';
    });
    rows.select(".time").html(function(d){return d.time.local().format('h:mm:ss a')});
    rows.select(".price").html(function(d){return d.price.split('.')[0]});
    rows.select(".price-decimal").html(function(d){
      var decimal = d.price.split('.')[1];
      return decimal ? decimal.replace(/0(0+)$/, '0<span class="insig">$1</span>') : '0';
    });
  }


//make values human readable
  function valueFilter (d, precision) {
    if (!d) return "&nbsp";

    var value = Number(d.toPrecision(precision || 8));

    return numberFormat(value);
  }


//load price and volume stats from the last day
  function loadDailyStats () {
    var now  = moment().utc().endOf('day');
    var then = moment().utc().startOf('day');

    if (self.requestDaily) self.requestDaily.abort();
    self.requestDaily = apiHandler.offersExercised({
      startTime: then.format(),
      endTime: now.format(),
      base: self.base,
      counter: self.counter,
      timeIncrement: 'day'

    }, function(data){

      if (data && data.length) {
        //TODO: should be comparing the existing high and low
        high   = data[0].high;
        low    = data[0].low;
        volume = data[0].baseVolume;
        if (!close) close = data[0].close; //dont overwrite existing
      }

      updateDailyStats();

    }, function (error){
      console.log(error);
    });
  }


//display 24 hour stats from the known values
  function updateDailyStats () {
    var base    = self.base.currency;
    var counter = self.counter.currency;
    daily.select(".high").html("<small>H:</small> " +
      valueFilter(high, 5));
    daily.select(".low").html("<small>L:</small> " +
      valueFilter(low, 5));
    daily.select(".volume").html("<small>VOL:</small> " +
      valueFilter(volume, 8) +
      "<small>" + base + "</small>");
    daily.select(".date").html(moment.utc().format('YYYY-MM-DD') +
      ' <small>(UTC)</small>');
    price.select(".amount").html(valueFilter(close, 5));
    price.select(".pair").html(base+"/"+counter);
  }


//load latest trades historical data from the API
  function loadHistoricalData() {
    if (dailyTimer) clearInterval(dailyTimer);
    dailyTimer = setInterval(loadDailyStats, 180000);
    loadDailyStats();

    loader.transition().style('opacity',1);
    status.html("");

    var end  = moment().utc().endOf('day');
    var start = moment().utc().startOf('day').subtract(1,'day');

    if (self.request) self.request.abort();
    self.request = apiHandler.offersExercised({
      endTime    : end.format(),
      startTime  : start.format(),
      reduce     : false,
      base       : self.base,
      counter    : self.counter,
      descending : true,
      limit      : 60

    }, function(data){

      loader.transition().style('opacity',0);

      data.forEach(function(d) {
        d.amount   = valueFilter(d.amount, 8);
        d.price    = valueFilter(d.price, 5);
        transactions.push(d);
      });

      transactions = transactions.slice(0,60);
      updateTrades();

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
