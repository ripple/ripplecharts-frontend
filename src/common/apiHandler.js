/* eslint no-unused-vars: 1 */
'use strict'

function ApiHandler(baseURL) {
  var self = this
  var timeFormat = 'YYYY-MM-DDTHH:mm:ss'

  self.url = baseURL

  /**
   * formatTime
   */

  function formatTime(time) {
    return moment.utc(time).format(timeFormat)
  }

  /**
   * getMetric
   */

  function getMetric(params, callback) {
    var url = self.url + '/network/' + params.type + '?'

    var start = params.start ?
      '&start=' + formatTime(params.start) : ''
    var end = params.end ?
      '&end=' + formatTime(params.end) : ''
    var interval = params.interval ?
      '&interval=' + params.interval : ''
    var currency = params.currency ?
      '&exchange_currency=' + params.currency : ''
    var issuer = params.issuer ?
      '&exchange_issuer=' + params.issuer : ''
    var limit = '&limit=' + (params.limit || 1000)
    var period = params.period ?
      '&live=' + params.period : ''

    url += start + end + interval + limit + currency + issuer + period
    return d3.json(url, function(err, resp) {
      if (err) {
        callback({
          status: err.status,
          text: err.statusText || 'Unable to load data'
        })

      } else {
        resp.rows.forEach(function(row) {
          row.total = Number(row.total)
          row.exchange_rate = Number(row.exchange_rate)

          row.components.forEach(function(c) {
            c.rate = Number(c.rate)
            c.amount = Number(c.amount)
            c.converted_amount = Number(c.converted_amount || '0')
          })
        })
        callback(null, resp)
      }
    })
  }

  this.getTx = function(hash, callback) {
    var url = self.url + '/transactions/' + hash

    return d3.json(url, function(err, resp) {
      if (err) {
        callback({
          status: err.status,
          text: err.statusText || 'Unable to load data'
        })

      } else {
        callback(null, resp)
      }
    })
  }

  this.getAccountTx = function(params, callback) {
    var url = self.url + '/accounts/' + params.account + '/transactions'
    var limit = params.limit ? '&limit=' + params.limit : ''
    var marker = params.marker ?
      '&marker=' + params.marker : ''
    var descending = params.descending ?
      '&descending=true' : ''

    url += '?' + limit + marker + descending
    return d3.json(url, function(err, resp) {
      if (err) {
        callback({
          status: err.status,
          text: err.statusText || 'Unable to load data'
        })

      } else {
        callback(null, resp)
      }
    })
  }

  this.getTopMarkets = function(limit, callback) {
    var order = [
      'XAU', 'XAG', 'BTC', 'ETH', 'LTC',
      'XRP', 'EUR', 'USD', 'GBP', 'AUD',
      'NZD', 'USD', 'CAD', 'CHF', 'JPY', 'CNY']

    var url = self.url + '/network/top_markets' +
      (limit ? '?limit=' + limit : '')

    return d3.json(url, function(err, resp) {
      if (err) {
        callback({
          status: err.status,
          text: err.statusText || 'Unable to load data'
        })

      } else {
        var markets = []
        resp.markets.forEach(function(m, i) {

          if (limit && i >= limit) {
            return
          }

          var pair = {
            base: {
              currency: m.base_currency,
              issuer: m.base_issuer
            },
            counter: {
              currency: m.counter_currency,
              issuer: m.counter_issuer
            }
          }

          var o1 = order.indexOf(pair.base.currency)
          var o2 = order.indexOf(pair.counter.currency)

          // order by priority
          if (o1 > o2 || o1 === -1) {
            pair = {
              base: pair.counter,
              counter: pair.base
            }
          }

          markets.push(pair)
        })

        callback(null, markets)
      }
    })
  }


  this.offersExercised = function(params, load, error) {

    var url = self.url + '/exchanges/'
    var base = params.base.currency +
      (params.base.issuer ? '+' + params.base.issuer : '')
    var counter = params.counter.currency +
      (params.counter.issuer ? '+' + params.counter.issuer : '')
    var limit = params.timeIncrement === 'all' ?
        '' : 'limit=' + (params.limit || 1000)
    var interval = params.timeIncrement && params.timeIncrement !== 'all' ?
      '&interval=' + (params.timeMultiple || 1) + params.timeIncrement : ''
    var start = params.startTime ?
      '&start=' + formatTime(params.startTime) : ''
    var end = params.endTime ?
      '&end=' + formatTime(params.endTime) : ''
    var descending = params.descending ? '&descending=true' : ''
    var reduce = params.reduce === true || params.timeIncrement === 'all' ?
      '&reduce=true' : ''

    url += base + '/' + counter + '?' + limit +
      interval + start + end + descending + reduce

    return d3.json(url, function(err, resp) {
      if (err) {
        error({
          status: err.status,
          text: err.statusText || 'Unable to load data'
        })

      } else if (params.reduce === false) {
        load(resp.exchanges.map(function(d) {
          return {
            time: moment.utc(d.executed_time),
            price: Number(d.rate),
            amount: Number(d.base_amount),
            amount2: Number(d.counter_amount),
            tx: d.tx_hash,
            type: d.taker === d.buyer ? 'buy' : 'sell'
          }
        }))

      } else {
        load(resp.exchanges.map(function(d) {
          return {
            startTime: moment.utc(d.start),
            baseVolume: Number(d.base_volume),
            counterVolume: Number(d.counter_volume),
            count: d.count,
            open: Number(d.open),
            high: Number(d.high),
            low: Number(d.low),
            close: Number(d.close),
            vwap: Number(d.vwap),
            openTime: d.open_time,
            closeTime: d.close_time
          }
        }))
      }
    })
  }


  this.paymentVolume = function(params, load, error) {
    var url = self.url + '/payments/'

    var currency = params.currency ?
      params.currency +
      (params.issuer ? '+' + params.issuer : '') : ''
    var limit = params.limit || 1000
    var interval = params.timeIncrement ?
      '&interval=' + params.timeIncrement : ''
    var start = params.startTime ?
      '&start=' + formatTime(params.startTime) : ''
    var end = params.endTime ?
      '&end=' + formatTime(params.endTime) : ''
    var descending = params.descending ? '&descending=true' : ''

    url += currency + '?limit=' + limit + interval +
      start + end + descending

    return d3.json(url, function(err, resp) {
      if (err) {
        error({
          status: err.status,
          text: err.statusText || 'Unable to load data'
        })

      } else {
        load(resp)
      }
    })
  }

  this.issuerCapitalization = function(params, load, error) {

    var url = self.url + '/capitalization/' + params.currency +
     '+' + params.issuer
    var limit = params.limit || 1000
    var interval = params.interval ?
      '&interval=' + params.interval : ''
    var start = params.start ?
      '&start=' + formatTime(params.start) : ''
    var end = params.end ?
      '&end=' + formatTime(params.end) : ''
    var descending = params.descending ? '&descending=true' : ''
    var adjusted = params.adjusted ? '&adjusted=true' : ''

    url += '?limit=' + limit + interval +
      start + end + descending + adjusted

    return d3.json(url, function(err, resp) {
      if (err) {
        error({
          status: err.status,
          text: err.statusText || 'Unable to load data'
        })

      } else {
        load(resp)
      }
    })
  }


  this.getTotalAccounts = function(time, callback) {
    var url = self.url + '/accounts?reduce=true&start=2013-01-01'

    if (time) {
      url += '&end=' + formatTime(time)
    }

    return d3.json(url, function(err, resp) {
      if (err) {
        callback({
          status: err.status,
          text: err.statusText || 'Unable to load data'
        })

      } else {
        callback(null, resp ? (resp.count || 0) : 0)
      }
    })
  }


  this.accountsCreated = function(params, callback) {
    var url = self.url + '/accounts?'
    var start = params.startTime ?
      '&start=' + formatTime(params.startTime) : ''
    var end = params.endTime ?
      '&end=' + formatTime(params.endTime) : ''
    var interval = params.timeIncrement ?
      '&interval=' + params.timeIncrement : ''
    var limit = '&limit=' + (params.limit || 1000)

    url += start + end + interval + limit

    return d3.json(url, function(err, resp) {
      if (err) {
        callback({
          status: err.status,
          text: err.statusText || 'Unable to load data'
        })

      } else {
        callback(null, resp)
      }
    })
  }

  this.getExchangeVolume = function(params, callback) {
    params.type = 'exchange_volume'
    getMetric(params, callback)
  }

  this.getPaymentVolume = function(params, callback) {
    params.type = 'payment_volume'
    getMetric(params, callback)
  }

  this.getIssuedValue = function(params, callback) {
    params.type = 'issued_value'
    getMetric(params, callback)
  }

  this.getExternalMarkets = function(params, callback) {
    var url = self.url + '/network/external_markets?'
    var period = params.period ?
      '&period=' + params.period : ''

    url += period
    return d3.json(url, function(err, resp) {
      if (err) {
        callback({
          status: err.status,
          text: err.statusText || 'Unable to load data'
        })

      } else {
        callback(null, resp.data)
      }
    })
  }

  this.exchangeRate = function(params, callback) {
    var url = self.url + '/exchange_rates'
    var base = '/' + params.base.currency +
      (params.base.issuer ? '+' + params.base.issuer : '')
    var counter = '/' + params.counter.currency +
      (params.counter.issuer ? '+' + params.counter.issuer : '')
    var qs = []
    if (params.date) {
      qs.push('date=' + formatTime(params.date))
    } else if (!params.period) {
      qs.push('live=true')
    }

    if (params.period) {
      qs.push('period=' + params.period)
    }

    url += base + counter + (qs.length ? '?' + qs.join('&') : '')

    return d3.json(url, function(err, resp) {
      if (err) {
        callback({
          status: err.status,
          text: err.statusText || 'Unable to load data'
        })

      } else {
        callback(null, resp.rate || 0)
      }
    })
  }

  this.activeAccounts = function(params, callback) {
    var url = self.url + '/active_accounts/'
    var base = params.base.currency +
      (params.base.issuer ? '+' + params.base.issuer : '')
    var counter = params.counter.currency +
      (params.counter.issuer ? '+' + params.counter.issuer : '')
    var period = params.period ?
      '&period=' + params.period : ''
    var tx = params.transactions ?
      '&include_exchanges=true' : ''
    url += base + '/' + counter + '?' + period + tx

    return d3.json(url, function(err, resp) {
      if (err) {
        callback({
          status: err.status,
          text: err.statusText || 'Unable to load data'
        })

      } else {
        resp.accounts.forEach(function(a) {
          a.base_volume = Number(a.base_volume)
          a.counter_volume = Number(a.counter_volume)
          a.exchanges.forEach(function(ex) {
            ex.base_amount = Number(ex.base_amount)
            ex.counter_amount = Number(ex.counter_amount)
          })
        })
        callback(null, resp)
      }
    })
  }

  this.getValidators = function(callback) {
    var url = self.url + '/network/validator_reports'

    return d3.json(url, function(err, resp) {
      if (err) {
        callback({
          status: err.status,
          text: err.statusText || 'Unable to load data'
        })

      } else {
        callback(null, resp.reports)
      }
    })
  }

  this.getValidator = function(pubkey, callback) {
    var url = self.url + '/network/validators/' + pubkey

    return d3.json(url, function(err, resp) {
      if (err) {
        callback({
          status: err.status,
          text: err.statusText || 'Unable to load data'
        })

      } else {
        callback(null, resp)
      }
    })
  }

  this.getValidatorReports = function(options, callback) {
    var url = self.url + '/network/validators/' +
        options.pubkey + '/reports?descending=true'

    return d3.json(url, function(err, resp) {
      if (err) {
        callback({
          status: err.status,
          text: err.statusText || 'Unable to load data'
        })

      } else {
        callback(null, resp.reports)
      }
    })
  }

  this.getMaintenanceStatus = function(callback) {
    var url = self.url + '/maintenance/ripplecharts'
    var xhr
    var timeout = setTimeout(function() {
      xhr.abort()
      callback({
        status: 500,
        text: 'Data Response Timeout'
      })
    }, 15000)

    xhr = d3.json(url, function(err, resp) {
      clearTimeout(timeout)

      if (err) {
        callback({
          status: err.status,
          text: err.statusText || 'Unable to load data'
        })
      } else {
        callback(null, resp)
      }
    })

    return xhr
  }
}
