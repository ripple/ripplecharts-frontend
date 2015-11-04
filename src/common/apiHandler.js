ApiHandler = function (baseURL) {
  var self = this;
  var timeFormat = 'YYYY-MM-DDTHH:mm:ss';

  self.url = baseURL;

  function formatTime(time) {
    return moment.utc(time).format(timeFormat);
  }

  this.offersExercised = function (params, load, error) {

    var url = self.url + '/exchanges/';
    var base = params.base.currency +
      (params.base.issuer ? '+' + params.base.issuer : '');
    var counter = params.counter.currency +
      (params.counter.issuer ? '+' + params.counter.issuer : '');
    var limit = params.timeIncrement === 'all' ? '' : 'limit=' + (params.limit || 1000);
    var interval = params.timeIncrement && params.timeIncrement !== 'all' ?
      '&interval=' + (params.timeMultiple || 1) + params.timeIncrement : '';
    var start = params.startTime ?
      '&start=' + formatTime(params.startTime) : '';
    var end = params.endTime ?
      '&end=' + formatTime(params.endTime) : '';
    var descending = params.descending ? '&descending=true' : '';
    var reduce = params.reduce === true || params.timeIncrement === 'all' ?
      '&reduce=true' : '';

    url += base + '/' + counter + '?' + limit +
      interval + start + end + descending + reduce;

    return d3.json(url, function(err, resp) {
      if (err) {
        error({
          status: err.status,
          text: err.statusText,
          message: err.response
        });

      } else if (params.reduce === false) {
        load(resp.exchanges.map(function(d) {
          return {
            time    : moment.utc(d.executed_time),
            price   : d.rate,
            amount  : d.base_amount,
            amount2 : d.counter_amount,
            tx      : d.tx_hash,
            type    : d.taker === d.buyer ? 'buy' : 'sell'
          }
        }));

      } else {
        load(resp.exchanges.map(function(d) {
          return {
            startTime     : moment.utc(d.start),
            baseVolume    : d.base_volume,
            counterVolume : d.counter_volume,
            count         : d.count,
            open          : d.open,
            high          : d.high,
            low           : d.low,
            close         : d.close,
            vwap          : d.vwap,
            openTime      : d.open_time,
            closeTime     : d.close_time
          };
        }));
      }
    });
  }


  this.paymentVolume = function (params, load, error) {
    var url = self.url + '/payments/';

    var currency = params.currency ?
      params.currency +
      (params.issuer ? '+' + params.issuer : '') : '';
    var limit = params.limit || 1000;
    var interval = params.timeIncrement ?
      '&interval=' + params.timeIncrement : '';
    var start = params.startTime ?
      '&start=' + formatTime(params.startTime) : '';
    var end = params.endTime ?
      '&end=' + formatTime(params.endTime) : '';
    var descending = params.descending ? '&descending=true' : '';

    url += currency + '?limit=' + limit + interval +
      start + end + descending;

    return d3.json(url, function(err, resp) {
      if (err) {
        error({
          status: err.status,
          text: err.statusText,
          message: err.response
        });

      } else {
        load(resp);
      }
    });
  }

  this.issuerCapitalization = function (params, load, error) {

    var url = self.url + '/capitalization/' + params.currency +
     '+' + params.issuer;
    var limit = params.limit || 1000;
    var interval = params.interval ?
      '&interval=' + params.interval : '';
    var start = params.start ?
      '&start=' + formatTime(params.start) : '';
    var end = params.end ?
      '&end=' + formatTime(params.end) : '';
    var descending = params.descending ? '&descending=true' : '';
    var adjusted = params.adjusted ? '&adjusted=true' : '';

    url += '?limit=' + limit + interval +
      start + end + descending + adjusted;

    return d3.json(url, function(err, resp) {
      if (err) {
        error({
          status: err.status,
          text: err.statusText,
          message: err.response
        });

      } else {
        load(resp);
      }
    });
  };


  this.getTotalAccounts = function(time, callback) {
    var url = self.url + '/accounts?reduce=true&start=2013-01-01';

    if (time) {
     url += '&end=' + formatTime(time);
    }

    return d3.json(url, function(err, resp) {
      if (err) {
        callback({
          status: err.status,
          text: err.statusText,
          message: err.response
        });

      } else {
        callback(null, resp ? (resp.count || 0) : 0);
      }
    });
  };


  this.accountsCreated = function (params, callback) {
    var url = self.url + '/accounts?';
    var start = params.startTime ?
      '&start=' + formatTime(params.startTime) : '';
    var end = params.endTime ?
      '&end=' + formatTime(params.endTime) : '';
    var interval = params.timeIncrement ?
      '&interval=' + params.timeIncrement : '';
    var limit = '&limit=' + (params.limit || 1000);

    url += start + end + interval + limit;

    return d3.json(url, function(err, resp) {
      if (err) {
        callback({
          status: err.status,
          text: err.statusText,
          message: err.response
        });

      } else {
        callback(null, resp);
      }
    });
  }

  this.getExchangeVolume = function (params, callback) {
    params.type = 'exchange_volume';
    getMetric(params, callback);
  }

  this.getPaymentVolume = function (params, callback) {
    params.type = 'payment_volume';
    getMetric(params, callback);
  }

  this.getIssuedValue = function (params, callback) {
    params.type = 'issued_value';
    getMetric(params, callback);
  }

  this.exchangeRate = function (params, callback) {
    var url = self.url + '/exchange_rates';
    var base = '/' + params.base.currency +
      (params.base.issuer ? '+' + params.base.issuer : '');
    var counter = '/' + params.counter.currency +
      (params.counter.issuer ? '+' + params.counter.issuer : '');
    var date = params.date ?
      '?date=' + formatTime(params.date) : '';
    url += base + counter + date;

    return d3.json(url, function(err, resp) {
      if (err) {
        callback({
          status: err.status,
          text: err.statusText,
          message: err.response
        });

      } else {
        callback(null, resp.rate || 0);
      }
    });
  };

  this.activeAccounts = function (params, callback) {
    var url = self.url + '/active_accounts/';
    var base = params.base.currency +
      (params.base.issuer ? '+' + params.base.issuer : '');
    var counter = params.counter.currency +
      (params.counter.issuer ? '+' + params.counter.issuer : '');
    var period = params.period ?
      '&period=' + params.period : '';
    var tx = params.transactions ?
      '&include_exchanges=true' : '';
    url += base + '/' + counter + '?' + period + tx;

    return d3.json(url, function(err, resp) {
      if (err) {
        callback({
          status: err.status,
          text: err.statusText,
          message: err.response
        });

      } else {
        callback(null, resp);
      }
    });
  }

  function getMetric (params, callback) {
    var url = self.url + '/network/' + params.type + '?';

    var start = params.start ?
      '&start=' + formatTime(params.start) : '';
    var end = params.end ?
      '&end=' + formatTime(params.end) : '';
    var interval = params.interval ?
      '&interval=' + params.interval : '';
    var currency = params.currency ?
      '&exchange_currency=' + params.currency : '';
    var issuer = params.issuer ?
      '&exchange_issuer=' + params.issuer : '';
    var limit = '&limit=' + (params.limit || 1000);

    url += start + end + interval + limit + currency + issuer;
    return d3.json(url, function(err, resp) {
      if (err) {
        callback({
          status: err.status,
          text: err.statusText,
          message: err.response
        });

      } else {
        callback(null, resp);
      }
    });
  }


  function handleRequest(request, params, callback) {

      request.post(JSON.stringify(params))
      .on('load', function(xhr){
        var response = xhr.response ? JSON.parse(xhr.response) : undefined;
        callback (null, response);
      })
      .on('error', function(xhr){
        callback({status:xhr.status,text:xhr.statusText,message:xhr.response});
      });

      return request;
  }
}
