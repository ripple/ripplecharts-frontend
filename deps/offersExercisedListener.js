var Remote,
  Amount,
  moment,
  remote;

if (typeof require != 'undefined') {

  /* Loading with Node.js */
  var Remote = require('ripple-lib').Remote,
    Amount = require('ripple-lib').Amount,
    moment = require('moment'),
    gateways = require('./gateways.json');

} else if (ripple && moment) {

  /* Loading in a webpage */
  Remote = ripple.Remote;
  Amount = ripple.Amount;

  // Note: also be sure to load momentjs and gateways.json before loading this file

} else {

  throw (new Error('Error: cannot load offersExercisedListener without ripple-lib, momentjs, and gateways.json'));

}


/**
 *  HOW-TO use this script...
 *
 *  Load it in Node.js or on a webpage after loading its dependencies.
 *  Then, initialize an OffersExercisedListener with (pretty much) the
 *  same options you use to query the offersExercised API route.
 *  
 *  If you query the API route again with different options and want the
 *  OffersExercisedListener to be updated accordingly, simply call
 *  the instance's updateViewOpts() method with the new options.
 *
 *  To use multiple OffersExercisedListeners on a single page, simply
 *  initialize one instance per option set, save a reference to each,
 *  and call the stopListener() function for any that you wish to remove.
 *  
 *  To create an OffersExercisedListener that listens for all offers exercised,
 *  intitialize one with no view options and it will call the display function
 *  each time it hears an offer exercised with an object of the form:
 *  {key: [[trade currency, trade curr issuer][base currency, base curr issuer], year, month, day, hour, minute second], value: [trade curr volume, base curr volume, exchange rate]}
 */



/**
 *  createOffersExercisedListener listens to the live transaction feed,
 *  parses offersExercised events, and passes the parsed data to the
 *  given displayFn
 *
 *  Available options include:
 *  {
 *    base: {currency: "XRP"},
 *    trade: {currency: "USD", issuer: "rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B"},
 *    
 *    reduce: true/false, // optional, defaults to false if timeIncrement is not set
 *    timeIncrement: (any of the following: "all", "none", "year", "month", "day", "hour", "minute", "second") // optional
 *    timeMultiple: positive integer // optional, defaults to 1
 *    
 *    openTime: a momentjs-readable value // optional, defaults to now
 *    incompleteApiRow: if the last timeIncrement returned by the API is 
 *      incomplete, that row can be passed in here to be completed by the live feed listener
 *  }
 */
function OffersExercisedListener(opts, displayFn) {

  // Connect to ripple-lib
  if (remote) {
    remote = remote;
  } else {
    remote = new Remote({
        // trace: true,
        servers: [{
            host: 's-west.ripple.com',
            port: 443
        },{
            host: 's-east.ripple.com',
            port: 443
        }]
    });
    remote.connect();
  }
  
  if (typeof opts === 'function') {
    displayFn = opts;
    opts = {};
  }

  this.displayFn = displayFn;
  this.txProcessor;
  this.interval;

  // Wrapper to call the displayFn and update the openTime and closeTime
  this.finishedInterval = function() {
    this.storedResults.closeTime = moment.utc().toArray().slice(0,6);
    
    this.displayFn(formatReduceResult(this.storedResults));

    this.storedResults = {
      openTime: moment.utc().toArray().slice(0,6),
    };
  };

  // setup this instance based on the given opts
  this.updateViewOpts(opts);
}


/**
 *  stopListener resets the OffersExercisedListener
 */
OffersExercisedListener.prototype.stopListener = function() {

  var listener = this;

  listener.storedResults = {};

  if (listener.interval) {
    clearInterval(listener.interval);
  }

  if (listener.txProcessor) {
    remote.removeListener('transaction_all', listener.txProcessor);
  }

};


/**
 *  updateViewOpts updates the viewOpts, resets the stored results
 *  and resets the txProcessor and transaction listener
 */
OffersExercisedListener.prototype.updateViewOpts = function(newOpts) {

  var listener = this;

  listener.stopListener();

  listener.viewOpts = parseViewOpts(newOpts);

  listener.storedResults.openTime = listener.viewOpts.openTime;

  // TODO make this work with formats other than 'json'
  if (listener.viewOpts.incompleteApiRow) {

    var row = listener.viewOpts.incompleteApiRow; 

    listener.viewOpts.openTime = row.time || row.openTime || row[0];

    listener.storedResults = {
      openTime: moment.utc(row.time || row.openTime || row[0]).toArray().slice(0,6),
      curr1Volume: row.tradeCurrVol || row[2],
      curr2Volume: row.baseCurrVol || row[1],
      numTrades: row.numTrades || row[3],
      open: row.openPrice || row[4],
      close: row.closePrice || row[5],
      high: row.highPrice || row[6],
      low: row.lowPrice || row[7],
      volumeWeightedAvg: row.vwavPrice || row[8]
    };

  }

  // If timeIncrement is set, setup an interval to call the displayFn,
  // otherwise, pass the displayFn directly to createTransactionProcessor()
  if (!listener.viewOpts.timeIncrement) {

    listener.txProcessor = createTransactionProcessor(listener.viewOpts, listener.displayFn);

  } else {

    // create regular listener
    listener.txProcessor = createTransactionProcessor(listener.viewOpts, function(reducedTrade){

      // Set storedResults to be the reducedTrade or merge them with offersExercisedReduce
      if (!listener.storedResults.open) {
        var tempOpenTime = listener.storedResults.openTime.slice();
        listener.storedResults = reducedTrade;
        listener.storedResults.openTime = tempOpenTime;
      } else {
        listener.storedResults = offersExercisedReduce(null, [reducedTrade, listener.storedResults], true);
      }

      listener.storedResults.closeTime = moment.utc().toArray().slice(0,6);

      // Call displayFn every time a new trade comes in, as well as after the interval
      listener.displayFn(formatReduceResult(listener.storedResults));
      
    });


    // handle first interval

    var endOfFirstIncrement = moment.utc(listener.viewOpts.openTime).add(listener.viewOpts.timeIncrement, listener.viewOpts.timeMultiple),
      firstIncrementRemainder = endOfFirstIncrement.diff(moment.utc());


    // If there is time left in the first timeIncrement, wait until that 
    // is finished to start the interval
    if (firstIncrementRemainder > 0) {
      setTimeout(function(){

        listener.finishedInterval();

        listener.interval = setInterval(function(){
          listener.finishedInterval();
        }, moment.duration(listener.viewOpts.timeMultiple, listener.viewOpts.timeIncrement).asMilliseconds());

      }, firstIncrementRemainder);
      
    } else {

      listener.interval = setInterval(function(){
        listener.finishedInterval();
      }, moment.duration(listener.viewOpts.timeMultiple, listener.viewOpts.timeIncrement).asMilliseconds());

    }

  }

  remote.on('transaction_all', listener.txProcessor);

}


/**
 *  parseViewOpts parses and validates the given view options
 */
function parseViewOpts(opts) {
  // TODO validate opts more thoroughly

  opts.openTime = moment.utc(opts.openTime).toArray().slice(0,6);

  if (opts.timeIncrement) {
    opts.reduce = true;

    if (!opts.timeMultiple) {
      opts.timeMultiple = 1;
    }
  }

  if (!opts.base || !opts.trade) {
    opts.reduce = false;
  }

  if (opts.base) {

    if (opts.base.issuer === '') {
      delete opts.base.issuer;
    } else if (opts.base.issuer) {

      var baseGatewayAddress = gatewayNameToAddress(opts.base.issuer, opts.base.currency);
      if (baseGatewayAddress) {
        opts.base.issuer = baseGatewayAddress;
      }
    }
  }

  if (opts.trade) {
    if (opts.trade.issuer === '') {
      delete opts.trade.issuer;
    } else if (opts.trade.issuer) {

      var tradeGatewayAddress = gatewayNameToAddress(opts.trade.issuer, opts.trade.currency);
      if (tradeGatewayAddress) {
        opts.trade.issuer = tradeGatewayAddress;
      }
    }
  }
  
  return opts;
}


/**
 *  createTransactionProcessor returns a function that accepts txData
 *  and parses it according to the viewOpts
 */
function createTransactionProcessor(viewOpts, resultHandler) {

  //console.log('Creating transaction processor with opts: ' + JSON.stringify(viewOpts));
  
  function txProcessor (txData){

    var txContainer = {
      close_time_timestamp: (new Date()).getTime(),
      transactions: [txData.transaction]
    };
    txContainer.transactions[0].metaData = txData.meta;

    // use the map function to parse txContainer data
    offersExercisedMap(txContainer, function(key, value){
      
      //console.log(viewOpts.reduce ? "chart:" : "trade:", key[0], key[1], value);
      
      if (viewOpts.trade) {
        
        // return if trade doesn't match either currency in the pair
        if ((viewOpts.trade.currency !== key[0][0] || viewOpts.trade.issuer !== key[0][1])
            && (viewOpts.trade.currency !== key[1][0] || viewOpts.trade.issuer !== key[1][1])) {
          return;
        }

      }

      if (viewOpts.base) {
        
        // return if base doesn't match either currency in the pair
        if ((viewOpts.base.currency !== key[0][0] || viewOpts.base.issuer !== key[0][1])
            && (viewOpts.base.currency !== key[1][0] || viewOpts.base.issuer !== key[1][1])) {
          return;
        }
        
      }

      // Flip the currencies if necessary
      if (viewOpts.base.currency === key[1][0] && viewOpts.base.issuer === key[1][1]) {
        key = [key[1].slice(), key[0].slice()].concat(key.slice(2));
        value = [value[1], value[0], 1/value[2]];
      }

      
      
      if (!viewOpts.reduce) resultHandler({key: key, value: value});
      else resultHandler(offersExercisedReduce([[key]], [value], false));
       
    });
  }

  return txProcessor;
}




/**
 *  offersExercisedMap is, with three exceptions, the same as the
 *  map function used in the CouchDB view offersExercised
 *
 *  the only exceptions are 'emit' as a parameter, emit only
 *  being called once, and the line that parses the exchange_rate
 */

function offersExercisedMap(doc, emit) {

    var time = new Date(doc.close_time_timestamp),
        timestamp = [time.getUTCFullYear(), time.getUTCMonth(), time.getUTCDate(),
            time.getUTCHours(), time.getUTCMinutes(), time.getUTCSeconds()
        ];

    doc.transactions.forEach(function(tx) {
        
      
        if (tx.metaData.TransactionResult !== 'tesSUCCESS') {
            return;
        }

        if (tx.TransactionType !== 'Payment' && tx.TransactionType !== 'OfferCreate') {
            return;
        }

        //console.log(tx.hash);
        tx.metaData.AffectedNodes.forEach(function(affNode) {

            var node = affNode.ModifiedNode || affNode.DeletedNode;

            if (!node || node.LedgerEntryType !== 'Offer') {
                return;
            }

            if (!node.PreviousFields || !node.PreviousFields.TakerPays || !node.PreviousFields.TakerGets) {
                return;
            }

            // parse exchange_rate
            // note: this block was inserted in addition to what is used in CouchDB
            if ((node.FinalFields || node.NewFields) && typeof(node.FinalFields || node.NewFields).BookDirectory === "string") {
                node.exchange_rate = Amount.from_quality((node.FinalFields || node.NewFields).BookDirectory).to_json().value;
            }

            var exchangeRate = node.exchange_rate,
                payCurr,
                payAmnt,
                getCurr,
                getAmnt;

            if (typeof node.PreviousFields.TakerPays === "object") {
                payCurr = [node.PreviousFields.TakerPays.currency, node.PreviousFields.TakerPays.issuer];
                payAmnt = node.PreviousFields.TakerPays.value - node.FinalFields.TakerPays.value;
            } else {
                payCurr = ["XRP"];
                payAmnt = (node.PreviousFields.TakerPays - node.FinalFields.TakerPays) / 1000000.0; // convert from drops
                exchangeRate = exchangeRate / 1000000.0;
            }

            if (typeof node.PreviousFields.TakerGets === "object") {
                getCurr = [node.PreviousFields.TakerGets.currency, node.PreviousFields.TakerGets.issuer];
                getAmnt = node.PreviousFields.TakerGets.value - node.FinalFields.TakerGets.value;
            } else {
                getCurr = ["XRP"];
                getAmnt = (node.PreviousFields.TakerGets - node.FinalFields.TakerGets) / 1000000.0;
                exchangeRate = exchangeRate * 1000000.0;
            }


            //I found it necessary to reverse the amounts here... - Matthew Fettig
            emit([payCurr, getCurr].concat(timestamp), [getAmnt, payAmnt, 1 / exchangeRate]);
            //emit([getCurr, payCurr].concat(timestamp), [getAmnt, payAmnt, 1 / exchangeRate]);
            
        });
        
        
    });
}

/**
 *  offersExercisedReduce is the same reduce function used by the 
 *  offersExercised view in CouchDB
 *  (note the difference between the 'reduce' and 'rereduce' modes)
 */
function offersExercisedReduce(keys, values, rereduce) {

    var stats;

    if (!rereduce) {

        var firstTime = keys[0][0].slice(2),
            firstPrice;

        if (values[0][2]) { // exchangeRate
            firstPrice = parseFloat(values[0][2]);
        } else {
            firstPrice = values[0][0] / values[0][1];
        }

        // initial values
        stats = {
            openTime: firstTime,
            closeTime: firstTime,

            open: firstPrice,
            close: firstPrice,
            high: firstPrice,
            low: firstPrice,

            curr1VwavNumerator: 0,
            curr1Volume: 0,
            curr2Volume: 0,
            numTrades: 0
        };

        values.forEach(function(trade, index) {

            var tradeTime = keys[index][0].slice(2),
                tradeRate = trade[2] || (trade[0] / trade[1]);

            if (lessThan(tradeTime, stats.openTime)) {
                stats.openTime = tradeTime;
                stats.open = tradeRate;
            }

            if (lessThan(stats.closeTime, tradeTime)) {
                stats.closeTime = tradeTime;
                stats.close = tradeRate;
            }

            stats.high = Math.max(stats.high, tradeRate);
            stats.low = Math.min(stats.low, tradeRate);
            stats.curr1VwavNumerator += tradeRate * trade[0];
            stats.curr1Volume += trade[0];
            stats.curr2Volume += trade[1];
            stats.numTrades++;

        });

        stats.volumeWeightedAvg = stats.curr1VwavNumerator / stats.curr1Volume;

        return stats;

    } else {

        stats = values[0];

        values.forEach(function(segment, index) {

            // skip values[0]
            if (index === 0) {
                return;
            }

            if (lessThan(segment.openTime, stats.openTime)) {
                stats.openTime = segment.openTime;
                stats.open = segment.open;
            }
            if (lessThan(stats.closeTime, segment.closeTime)) {
                stats.closeTime = segment.closeTime;
                stats.close = segment.close;
            }

            stats.high = Math.max(stats.high, segment.high);
            stats.low = Math.min(stats.low, segment.low);

            stats.curr1VwavNumerator += segment.curr1VwavNumerator;
            stats.curr1Volume += segment.curr1Volume;
            stats.curr2Volume += segment.curr2Volume;
            stats.numTrades += segment.numTrades;

        });

        stats.volumeWeightedAvg = stats.curr1VwavNumerator / stats.curr1Volume;

        return stats;
    }


    function lessThan(arr1, arr2) {
        if (arr1.length !== arr2.length)
            return false;

        for (var i = 0; i < arr1.length; i++) {
            if (arr1[i] < arr2[i]) {
                return true;
            } else if (arr1[i] > arr2[i]) {
                return false;
            } else {
                continue;
            }
        }

        return false;
    }
}


function formatReduceResult (reduceRes) {

  return {
    openTime: reduceRes.openTime,
    closeTime: reduceRes.closeTime,
    baseCurrVol: reduceRes.curr2Volume,
    tradeCurrVol: reduceRes.curr1Volume,
    numTrades: reduceRes.numTrades,
    openPrice: reduceRes.open,
    closePrice: reduceRes.close,
    highPrice: reduceRes.high,
    lowPrice: reduceRes.low,
    vwavPrice: reduceRes.volumeWeightedAvg
  };
}


/** HELPER FUNCTIONS **/

/**
 *  gatewayNameToAddress translates a given name and, 
 *  optionally, a currency to its corresponding ripple address or
 *  returns null
 */
 function gatewayNameToAddress( name, currency ) {

  var gatewayAddress = null;

  gateways.forEach(function(entry){

    if (entry.name.toLowerCase() === name.toLowerCase()) {
    
      if (currency) {

        entry.accounts.forEach(function(acct){

          if (acct.currencies.indexOf(currency) !== -1) {
            gatewayAddress = acct.address;
          }
        });

      } else {
         gatewayAddress = entry.accounts[0].address;
      }
    }

  });

  return gatewayAddress;

 }


/**
 *  getGatewaysForCurrency takes a currency and returns
 *  an array of gateways that issue that currency
 *  returns an empty array if the currency is invalid
 */
function getGatewaysForCurrency( currName ) {

  var issuers = [];
  gateways.forEach(function(gateway){
    gateway.accounts.forEach(function(acct){
      if (acct.currencies.indexOf(currName.toUpperCase()) !== -1) {
        issuers.push(acct.address);
      }
    });
  });

  return issuers;

}

/**
 *  getCurrenciesForGateway returns the currencies that that gateway handles
 */
function getCurrenciesForGateway( name ) {
  var currencies = [];
  gateways.forEach(function(gateway){
    if (gateway.name.toLowerCase() === name.toLowerCase()) {
      gateway.accounts.forEach(function(account){
        currencies = currencies.concat(account.currencies);
      });
    }
  });
  return currencies;
}



if (typeof module != 'undefined') {
  module.exports = OffersExercisedListener;
}
