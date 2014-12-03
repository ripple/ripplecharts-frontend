var TradeFeed = function (options) {
  var self = this, apiHandler = new ApiHandler(options.url), div = d3.select('#' + options.id).attr('class', 'tradeFeed'), transactions = [], listener, dailyTimer, high, low, close, volume;
  var numberFormat = {
      precision: 6,
      min_precision: 0,
      max_sig_digits: 8
    };
  var summary = div.append('div').attr('class', 'summary');
  var price = summary.append('div').attr('class', 'price');
  price.append('span').attr('class', 'amount');
  price.append('span').attr('class', 'pair');
  var daily = summary.append('div').attr('class', 'daily');
  daily.append('span').attr('class', 'high').html('H: --');
  daily.append('span').attr('class', 'low').html('L: --');
  daily.append('span').attr('class', 'volume').html('VOL: --');
  daily.append('label').html('(Last 24 hours)');
  var tableWrap = div.append('div').attr('class', 'table').append('div').attr('class', 'tableWrap');
  var table = tableWrap.append('table');
  table.append('thead');
  table.append('tbody');
  var status = tableWrap.append('h4').attr('class', 'status');
  var loader = tableWrap.append('img').attr('class', 'loader').attr('src', 'assets/images/rippleThrobber.png').style('opacity', 0);
  this.loadPair = function (base, counter) {
    self.base = base;
    self.counter = counter;
    high = low = close = volume = 0;
    if (listener)
      listener.updateViewOpts({
        base: base,
        counter: counter
      });
    else
      listener = new OffersExercisedListener({
        base: base,
        counter: counter
      }, handleTransaction);
    transactions = [];
    updateTrades();
    updateDailyStats();
    loadHistoricalData();
  };
  function handleTransaction(data) {
    var last = transactions[0];
    var trade = {
        time: moment.utc(data.value[5]),
        amount: valueFilter(data.value[0], self.base.currency),
        price: valueFilter(data.value[2], self.counter.currency),
        type: ''
      };
    if (last && last.price < trade.price)
      trade.type = 'ask';
    else if (last && last.price > trade.price)
      trade.type = 'bid';
    transactions.unshift(trade);
    transactions = transactions.slice(0, 50);
    if (trade.price > high)
      high = trade.price;
    if (trade.price < low)
      low = trade.price;
    close = data.value[2];
    volume += data.value[0];
    updateDailyStats();
    updateTrades();
    loader.style('opacity', 0);
  }
  function updateTrades() {
    status.html(transactions.length ? '' : 'no recent trades');
    var rows = table.select('tbody').selectAll('tr').data(transactions);
    var rowEnter = rows.enter().append('tr');
    var baseCurrency = ripple.Currency.from_json(self.base.currency).to_human();
    rowEnter.append('td').attr('class', 'type');
    rowEnter.append('td').attr('class', 'amount');
    rowEnter.append('td').attr('class', 'time');
    rowEnter.append('td').attr('class', 'price');
    rows.exit().remove();
    rows.select('.type').attr('class', function (d) {
      return 'type ' + d.type;
    });
    rows.select('.amount').html(function (d) {
      return d.amount + ' <small>' + baseCurrency + '</small>';
    });
    rows.select('.time').html(function (d) {
      return d.time.local().format('h:mm:ss a');
    });
    rows.select('.price').html(function (d) {
      return d.price;
    });
  }
  function valueFilter(d, currency) {
    if (!d)
      return '&nbsp';
    var value = ripple.Amount.from_human(d + ' ' + currency).to_human(numberFormat);
    if (!value)
      return '> 0.000001';
    return value;
  }
  function loadDailyStats() {
    var now = moment();
    var then = moment().subtract(1, 'days');
    if (self.requestDaily)
      self.requestDaily.abort();
    self.requestDaily = apiHandler.offersExercised({
      startTime: then.toDate(),
      endTime: now.toDate(),
      timeIncrement: 'all',
      base: self.base,
      counter: self.counter
    }, function (data) {
      if (data && data.length) {
        high = data[0].high;
        low = data[0].low;
        volume = data[0].baseVolume;
        if (!close)
          close = data[0].close;
      }
      updateDailyStats();
    }, function (error) {
      console.log(error);
    });
  }
  function updateDailyStats() {
    var base = ripple.Currency.from_json(self.base.currency).to_human();
    var counter = ripple.Currency.from_json(self.counter.currency).to_human();
    daily.select('.high').html('<small>H:</small> ' + valueFilter(high, self.counter.currency));
    daily.select('.low').html('<small>L:</small> ' + valueFilter(low, self.counter.currency));
    daily.select('.volume').html('<small>VOL:</small> ' + valueFilter(volume, self.base.currency) + '<small>' + base + '</small>');
    price.select('.amount').html(valueFilter(close, self.counter.currency));
    price.select('.pair').html(base + '/' + counter);
  }
  function loadHistoricalData() {
    if (dailyTimer)
      clearInterval(dailyTimer);
    dailyTimer = setInterval(loadDailyStats, 180000);
    loadDailyStats();
    loader.transition().style('opacity', 1);
    status.html('');
    var now = moment();
    var then = moment().subtract(1, 'days');
    if (self.request)
      self.request.abort();
    self.request = apiHandler.offersExercised({
      startTime: then.toDate(),
      endTime: now.toDate(),
      reduce: false,
      base: self.base,
      counter: self.counter,
      descending: true,
      limit: 50
    }, function (data) {
      loader.transition().style('opacity', 0);
      data.forEach(function (d) {
        d.amount = valueFilter(d.amount, self.base.currency);
        d.price = valueFilter(d.price, self.counter.currency);
        transactions.push(d);
      });
      transactions = transactions.slice(0, 50);
      updateTrades();
    }, function (error) {
      if (!transactions.length)
        status.html(error.text ? error.text : 'Unable to load data');
      loader.transition().style('opacity', 0);
      console.log(error);
    });
  }
  this.suspend = function () {
    if (listener)
      listener.stopListener();
    if (dailyTimer)
      clearInterval(dailyTimer);
  };
};