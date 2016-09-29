/* eslint {
  no-undef: 0,
  block-scoped-var: 0,
  no-unused-vars: 0,
  no-use-before-define: 0
} */
/* global ripple, OffersExercisedListener, ApiHandler */
'use strict';

var default_markets = [
  {
    base: {currency: 'XRP'},
    counter: {currency: 'CNY', issuer: 'rKiCet8SdvWxPXnAgYarFUXMh1zCPz432Y'}
  },
  {
    base: {currency: 'XRP'},
    counter: {currency: 'USD', issuer: 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B'}
  },
  {
    base: {currency: 'BTC', issuer: 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B'},
    counter: {currency: 'XRP'}
  },
  {
    base: {currency: 'XRP'},
    counter: {currency: 'JPY', issuer: 'r94s8px6kSw1uZ1MV98dhSRTvc6VMPoPcN'}
  },
  {
    base: {currency: 'XRP'},
    counter: {currency: 'USD', issuer: 'rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq'}
  },
  {
    base: {currency: 'XRP'},
    counter: {currency: 'JPY', issuer: 'rB3gZey7VWHYRqJHLoHDEJXJ2pEPNieKiS'}
  },
  {
    base: {currency: 'XRP'},
    counter: {currency: 'EUR', issuer: 'rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq'}
  }
];


var itext = 'Each ticker represents the last traded price of each ' +
            'currency and gateway pair. The arrow and precentage represent ' +
            'the change in price since the start of the day (UTC). The ' +
            'prices and precentages update live and refresh at the start of ' +
            'each new day (UTC). The price flashing signifies that a ' +
            'trade just went through. A red flash signifies it lowering the ' +
            'price, whereas a green flash signifies that it raised the price.';

var listener_list = [];

if (!LOADER_PNG) {
  var LOADER_PNG = 'assets/images/rippleThrobber.png';
}

if (!ARROW_UP_PNG) {
  var ARROW_UP_PNG = 'assets/icons/arrow_up.png';
}

if (!ARROW_DOWN_PNG) {
  var ARROW_DOWN_PNG = 'assets/icons/arrow_down.png';
}

if (!TICKER_CSS) {
  var TICKER_CSS = '';
}

var BLANK_PNG = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';

// connect to the ripple network;
var remote = new ripple.RippleAPI({
  server: 'wss://s1.ripple.com:443'
});
remote.connect()
.then(function() {
  console.log('connected to the ripple network');
})
.catch(function(e) {
  console.log(e.stack);
});

function addCommas(nStr) {
  var s = String(nStr);
  var x = s.split('.');
  var x1 = x[0];
  var x2 = x.length > 1 ? '.' + x[1] : '';
  var rgx = /(\d+)(\d{3})/;
  while (rgx.test(x1)) {
    x1 = x1.replace(rgx, '$1' + ',' + '$2');
  }
  return x1 + x2;
}

function getParams() {
  var params = {};
  var query = window.location.search.substring(1);
  var vars = query ? query.split('&') : [];

  for (var i = 0; i < vars.length; i++) {
    var pair = vars[i].split('=');
    var key = decodeURIComponent(pair[0]);
    var value = decodeURIComponent(pair[1]);

    try {
      params[key] = JSON.parse(value);
    } catch (e) { // invalid json
      params[key] = value;
    }
  }
  return params;
}

function Ticker(base, counter, obj, callback) {
  var self = this;

  self.div = obj.el.insert('div').attr('class', 'ticker hidden');
  self.markets = obj;
  self.price = 0.0;
  self.startTime = moment.utc().startOf('day');

  base.name = base.issuer || '';
  counter.name = counter.issuer || '';

  var endTime = moment.utc().add(1, 'd').startOf('day');
  var remainder = endTime.diff(moment.utc());

  function updateDiff() {
    self.difference =
      (((self.price - self.oldPrice) / self.oldPrice) * 100);

    if (self.difference < 0.01 && self.difference > -0.01) {
      self.difference = 0;
    }
    self.difference = self.difference.toFixed(2);
  }

  function updatePct() {
    if (self.difference > 0) {
      self.direction = 'up';
      self.divPriceStatus
        .attr('src', ARROW_UP_PNG)
        .style({'height': 5, 'width': 10});
      self.divPct.attr('class', null).attr('class', 'pct pctUp');

    } else if (self.difference < 0) {
      self.direction = 'down';
      self.divPriceStatus
        .attr('src', ARROW_DOWN_PNG)
        .style({'height': 5, 'width': 10});
      self.divPct.attr('class', null).attr('class', 'pct pctDown');

    } else {
      self.direction = 'unch';
      self.divPriceStatus
        .attr('src', BLANK_PNG)
        .style({'height': 0, 'width': 0});
      self.divPct.attr('class', null).attr('class', 'pct');
    }
  }

  function refreshTicker() {
    self.startTime = moment.utc().add(1, 'h').startOf('day');
    self.newUtcPrice = self.markets.apiHandler.offersExercised({
      base: base,
      counter: counter,
      startTime: '2013-1-1',
      endTime: self.startTime,
      reduce: false,
      limit: 1,
      descending: true
    }, function(oldPrice) {
      self.oldPrice = oldPrice[0].price;
      updateDiff();
      self.divPct.text(self.difference + '%');
      updatePct();
    });
  }

  function setNext() {
    self.timeout = setInterval(function() {
      refreshTicker();
    }, 86400000);
  }

  // add new data from the live feed to the chart
  function liveUpdate(data) {
    var prev = self.price;

    if (data.close !== 0) {
      self.price = data.close;
    }

    // price lower, flash red
    if (prev > self.price) {
      self.div.select('.price')
        .style('color', '#a22');
      self.div.select('.price')
        .transition().delay(500)
        .text(addCommas(parseFloat(self.price.toPrecision(6))));
      self.div.select('.price')
        .transition().delay(1500).duration(500)
        .style('color', '#3C3C3C');

    // price higher, flash green
    } else if (prev < self.price) {
      self.div.select('.price')
        .style('color', '#483');
      self.div.select('.price')
        .transition().delay(500)
        .text(addCommas(parseFloat(self.price.toPrecision(6))));
      self.div.select('.price')
        .transition().delay(1500).duration(500)
        .style('color', '#3C3C3C');
    }

    updateDiff();
    self.divPct.text(self.difference + '%');
    updatePct();
  }

  // enable the live feed via ripple-lib
  function setLiveFeed(b, c) {
    var point = {
      startTime: moment.utc(),
      baseVolume: 0.0,
      counterVolume: 0.0,
      count: 0,
      open: 0.0,
      high: 0.0,
      low: 0.0,
      close: 0.0,
      vwap: 0.0,
      openTime: null,
      closeTime: null
    };

    var viewOptions = {
      base: b,
      counter: c,
      timeIncrement: 'minute',
      timeMultiple: 15,
      incompleteApiRow: point
    };

    var liveFeed = new OffersExercisedListener(viewOptions, liveUpdate);
    listener_list.push(liveFeed);
  }

  if (remainder > 0) {
    self.timeout = setTimeout(function() {
      setNext();
      refreshTicker();
    }, remainder);
  } else {
    setNext();
  }

  self.reqUtcPrice = self.markets.apiHandler.offersExercised({
    base: base,
    counter: counter,
    startTime: '2013-1-1',
    endTime: self.startTime,
    reduce: false,
    limit: 1,
    descending: true
  }, function(oldPrice) {

    self.oldPrice = oldPrice[0] ? oldPrice[0].price : 0;

    self.reqCurrentPrice = self.markets.apiHandler.offersExercised({
      base: base,
      counter: counter,
      startTime: moment.utc().subtract(1, 'd'),
      endTime: moment.utc(),
      reduce: false,
      limit: 1,
      descending: true
    }, function(lastPrice) {


      self.price = lastPrice[0] ? lastPrice[0].price : 0;
      updateDiff();

      self.div.on('click', function() {
        var path = 'markets/' + base.currency +
          (base.issuer ? ':' + base.issuer : '') +
          '/' + counter.currency +
          (counter.issuer ? ':' + counter.issuer : '');
        window.open('https://www.charts.ripple.com/#/' + path, '_blank');
      });

      self.div.on('mouseover', function() {
        self.div.style('opacity', 1);
      });

      self.div.on('mouseout', function() {
        self.div.style('opacity', 0.7);
      });

      if (base.name !== '' && counter.name !== '') {
        self.div.append('div')
          .attr('class', 'baseGateway')
          .text(base.name + '/');
      } else if (base.name !== '') {
        self.div.append('div')
          .attr('class', 'baseGateway')
          .text(base.name);
      }

      if (counter.name !== '') {
        self.div.append('div')
          .attr('class', 'counterGateway')
          .text(counter.name);
      }

      self.divPrice = self.div.append('div')
        .attr('class', 'price priceWrapper')
        .text(addCommas(parseFloat(self.price.toPrecision(6))));

      self.div.append('div')
        .attr('class', 'baseCurrency')
        .text(base.currency + '/');

      self.div.append('div')
        .attr('class', 'counterCurrency')
        .text(counter.currency);

      self.divPct = self.div.append('div')
        .attr('class', 'pct')
        .text(self.difference + '%');

      self.divPriceStatus = self.div.append('img')
        .attr('class', 'priceStatus');

      updatePct();

      callback();
      setLiveFeed(base, counter);
    });
  });
}

function addTicker(base, counter, obj, callback) {
  var T = new Ticker(base, counter, obj, callback);
  return T;
}

function addMarkets(obj, options) {
  // add markets async and once done, remove loader
  var count = 0;
  obj.markets.forEach(function(market) {
    addTicker(market.base, market.counter, obj, function() {
      count += 1;
      if (count === obj.markets.length) {
        d3.selectAll('.tickerLoader').remove();
        d3.selectAll('.ticker').classed('hidden', false);

        if (options.closeable) {
          d3.select('#tickerWrapper')
          .append('div')
          .attr('class', 'closer')
          .text('x')
          .on('click', function() {
            var liveFeed;

            for (var j = 0; j < listener_list.length; j++) {
              liveFeed = listener_list[j];
              liveFeed.stopListener();
            }

            d3.select('#tickerWrapper').remove();
          });
        }

        if (options.info) {
          var info = d3.select('#tickerWrapper')
            .append('div')
            .attr('class', 'info closed');

          var info_text = info.append('div')
            .attr('class', 'infoText')
            .html('&#9432');


          info.on('click', function() {
            d3.event.stopPropagation();
            if (info.classed('closed')) {
              info
                .classed('closed', false)
                .classed('open', true)
                .transition().duration(500)
                .style({
                  'background-color': 'rgba(0,0,0,0.7)',
                  width: '100%',
                  color: '#fff'
                });

              info_text
                .style({
                  width: '100%',
                  padding: '10px 0px',
                  height: '40px'
                })
                .text(itext);

            } else if (info.classed('open')) {
              info
                .classed('open', false)
                .classed('closed', true)
                .style({
                  'background-color': 'rgba(0,0,0,0)',
                  color: '#000',
                  width: null
                });

              info_text
                .style({
                  padding: '2px 1px',
                  width: '20px',
                  height: '60px'
                })
                .html('&#9432');
            }
          });

          d3.select('body').on('click', function() {
            info
              .classed('open', false)
              .classed('closed', true)
              .style({
                'background-color': 'rgba(0,0,0,0)',
                color: '#000',
                width: null
              });

            info_text
              .style({
                padding: '2px 1px',
                width: '20px',
                height: '60px'
              })
              .html('&#9432');
          });
        }

        $('#prices').smoothDivScroll({
          autoScrollingDirection: 'endlessLoopRight',
          autoScrollingStep: 1,
          autoScrollingInterval: 15,
          hotSpotScrolling: false
        });

        $('#prices').smoothDivScroll('startAutoScrolling');

        $('#prices').bind('mouseover', function() {
          $('#prices').smoothDivScroll('stopAutoScrolling');
        });

        // Mouse out
        $('#prices').bind('mouseout', function() {
          $('#prices').smoothDivScroll('startAutoScrolling');
        });
      }
    });
  });
}

function TickerWidget(options) {
  var self = this;
  var div;

  if (!options.closeable) {
    options.closeable = false;
  }

  if (!options.info) {
    options.info = true;
  }

  if (!options.customCSS && TICKER_CSS) {
    var style = document.createElement('style');
    style.innerHTML = TICKER_CSS;
    document.getElementsByTagName('head')[0].appendChild(style);
  }

  if (options.id) {
    div = d3.select('#' + options.id)
      .append('div')
      .attr('id', 'tickerWrapper');

  } else {
    div = d3.select('body')
      .append('div')
      .attr('id', 'tickerWrapper');
  }

  self.el = div.append('div').attr('id', 'prices');
  self.apiHandler = new ApiHandler(options.url);
  self.options = options;

  div.append('img')
    .attr('class', 'tickerLoader')
    .attr('src', LOADER_PNG);

  this.load = function(params) {

    if (!params.markets) {
      params.markets = default_markets;
    }

    self.markets = params.markets;
    addMarkets(self.markets, options);
  };

  this.loadFromQS = function() {
    var params = getParams();
    if (!params.markets) {
      params.markets = default_markets;
    }

    self.markets = params.markets;
    addMarkets(self, options);
  };

  return this;
}
