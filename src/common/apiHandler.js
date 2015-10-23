ApiHandler = function (url) {
  var self = this;
  var timeFormat = 'YYYY-MM-DDTHH:mm:ss';

  self.url = url;

  function formatTime(time) {
    return moment.utc(time).format(timeFormat);
  }

  function apiRequest (route) {
    var request = d3.xhr(self.url+"/"+route);
    request.header('Content-Type', 'application/json');
    return request;
  }


  this.offersExercised = function (params, load, error) {
    console.log(params);
    var url = self.url + '/exchanges/';
    var base = params.base.currency +
      (params.base.issuer ? '+' + params.base.issuer : '');
    var counter = params.counter.currency +
      (params.counter.issuer ? '+' + params.counter.issuer : '');
    var limit = params.limit || 1000;
    var interval = params.timeIncrement && params.timeMultiple ?
      '&interval=' + params.timeMultiple + params.timeIncrement : '';
    var start = params.startTime ?
      '&start=' + formatTime(params.startTime) : '';
    var end = params.endTime ?
      '&end=' + formatTime(params.endTime) : '';
    var descending = params.descending ? '&descending=true' : '';
    var reduce = params.reduce === false || interval ? '' : '&reduce=true';

    url += base + '/' + counter + '?limit=' + limit +
      interval + start + end + descending + reduce;

    d3.json(url, function(err, resp) {
      if (err) {
        error({
          status: err.status,
          text: err.statusText,
          message: err.response
        });
      } else if (params.reduce===false) {
        var data = resp.exchanges.map(function(d) {
          return {
            time    : moment.utc(d.executed_time),
            price   : d.rate,
            amount  : d.base_amount,
            amount2 : d.counter_amount,
            tx      : d.tx_hash,
            type    : ''
          }
        });

        var prev = null;
        var index = data.length;
        var d;
        while(index--) {
          d = data[index];
          if (prev && prev.price>d.price)      d.type = 'bid';
          else if (prev && prev.price<d.price) d.type = 'ask';
          prev = d;
        }

        load(data);
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

  this.valueSent = function (params, load, error) {

    var request = apiRequest("valueSent");
    return handleRequest(request, params, function (err, response){
      if (err) error(err);
      else load(response);
    });
  }

  this.paymentVolume = function (params, load, error) {

    var request = apiRequest("payments");
    return handleRequest(request, params, function (err, response){
      if (err) error(err);
      else load(response);
    });
  }

  this.issuerCapitalization = function (params, load, error) {

    var request = apiRequest("issuerCapitalization");
    return handleRequest(request, params, function (err, response){
      if (err) error(err);
      else load(response);
    });
  }


  this.getTotalAccounts = function(time, callback){
    var request = apiRequest("accountsCreated");
    time = time || moment.utc().format();

    request.post(JSON.stringify({
      startTime: moment.utc('2013-01-01').format(),
      endTime: time,
      timeIncrement: "all"
    })).on('load', function(xhr){
      data  = JSON.parse(xhr.response);
      callback (null, data || 0);

    }).on('error', function(xhr){
      callback({status:xhr.status,text:xhr.statusText,message:xhr.response});
    });

    return request;
  }


  this.accountsCreated = function (params, callback) {
    var request = apiRequest("accountsCreated");
    return handleRequest(request, params, callback);
  }


  this.getTopMarkets = function (ex, callback) {
    var request = apiRequest("topMarkets");
    return handleRequest(request, { exchange : ex }, callback);
  }

  this.getVolume24Hours = function (ex, callback) {
    var request = apiRequest("totalValueSent");
    return handleRequest(request, { exchange : ex }, callback);
  }

  this.getPaymentVolume = function (ex, callback) {
    var request = apiRequest("totalPaymentVolume");
    return handleRequest(request, { exchange : ex }, callback);
  }

  this.getVolume30Days = function (ex, callback) {
    var request = apiRequest("totalValueSent");
    return handleRequest(request, {
      endTime   : moment.utc(),
      startTime : moment.utc().subtract(30, "days"),
      exchange  : ex
    }, callback);
  }

  this.historicalMetrics = function(metric, currency, issuer, start, end, inc, callback){
      var request = apiRequest("historicalMetrics");
      start = start || new Date();
      json = {
          startTime     : start,
          endTime       : end,
          timeIncrement : inc,
          metric: metric
      };
      if (currency !== "XRP"){
          json.exchange = {currency: currency, issuer: issuer}
      }
      request.post(JSON.stringify(json)).on('load', function(xhr){
          data  = JSON.parse(xhr.response);
          callback (null, data);

      }).on('error', function(xhr){
          callback({status:xhr.status,text:xhr.statusText,message:xhr.response});
      });

      return request;
  }


  this.accountsCreated = function (params, callback) {
      var request = apiRequest("accountsCreated");
      return handleRequest(request, params, callback);
  }


  this.getTopMarkets = function (ex, callback) {
      var request = apiRequest("topMarkets");
      return handleRequest(request, { exchange : ex }, callback);
  }

  this.getVolume24Hours = function (ex, callback) {
      var request = apiRequest("totalValueSent");
      return handleRequest(request, { exchange : ex }, callback);
  }

  this.getVolume30Days = function (ex, callback) {
      var request = apiRequest("totalValueSent");
      return handleRequest(request, {
          endTime   : moment.utc(),
          startTime : moment.utc().subtract(30, "days"),
          exchange  : ex
      }, callback);
  }

  this.getNetworkValue = function (ex, callback) {
      var request = apiRequest("totalNetworkValue");
      return handleRequest(request, { exchange : ex }, callback);
  }

  this.getIssuedValue = function (ex, callback) {
      var request = apiRequest("totalIssued");
      return handleRequest(request, { exchange : ex }, callback);
  }

  this.exchangeRates = function (params, callback) {
      var request = apiRequest("exchangeRates");
      return handleRequest(request, params, callback);
  }

  this.marketTraders = function (params, callback) {
      var request = apiRequest("marketTraders");
      return handleRequest(request, params, callback);
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
