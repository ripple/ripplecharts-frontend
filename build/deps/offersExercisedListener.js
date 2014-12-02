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
    opts      = {};
  }

  this.displayFn = displayFn;
  this.txProcessor;
  this.interval;

  // Wrapper to call the displayFn and update the openTime and closeTime
  this.finishedInterval = function() {      
    
    //send to display
    this.displayFn(formatReduceResult(this.storedResults));
    
    //reset the stored results
    var startTime = moment.utc(this.storedResults.startTime)
      .add(this.viewOpts.timeIncrement, this.viewOpts.timeMultiple);
    this.resetStored([startTime.format()]);
  };

  // setup this instance based on the given opts
  this.updateViewOpts(opts);
}


OffersExercisedListener.prototype.resetStored = function (row) {
  if (!row) row = [];
  
  this.storedResults = {
    startTime   : moment.utc(row.startTime || row.time || row[0]).format(),
    curr1Volume : row.baseVolume    || row[1]  || 0.0,
    curr2Volume : row.counterVolume || row[2]  || 0.0,
    numTrades   : row.count         || row[3]  || 0,
    open        : row.open          || row[4]  || 0.0,
    high        : row.high          || row[5]  || 0.0,
    low         : row.low           || row[6]  || 0.0,
    close       : row.close         || row[7]  || 0.0,
    volumeWeightedAvg: row.vwap     || row[8]  || 0.0,
    openTime    : row.openTime      || row[9]  || 0,
    closeTime   : row.closeTime     || row[10] || 0,
  }; 
  
  this.storedResults.curr1VwavNumerator = this.storedResults.volumeWeightedAvg * this.storedResults.curr1Volume;
 
}


/**
 *  stopListener resets the OffersExercisedListener
 */
OffersExercisedListener.prototype.stopListener = function() {

  var listener = this;
  listener.storedResults = {};

  if (listener.interval) clearInterval(listener.interval);  
  if (listener.timeout)  clearTimeout(listener.timeout);
 

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

  // If timeIncrement is set, setup an interval to call the displayFn,
  // otherwise, pass the displayFn directly to createTransactionProcessor()
  if (!listener.viewOpts.timeIncrement) {
    listener.txProcessor = createTransactionProcessor(listener.viewOpts, listener.displayFn);

  } else {
    
    //if there isnt a row, start time will be set to now
    listener.resetStored(listener.viewOpts.incompleteApiRow || []);
         
    // create regular listener
    listener.txProcessor = createTransactionProcessor(listener.viewOpts, function(reducedTrade){
      
      listener.storedResults = offersExercisedReduce([listener.storedResults, reducedTrade], true);
      
      // Call displayFn every time a new trade comes in, as well as after the interval
      listener.displayFn(formatReduceResult(listener.storedResults));
      
    });


    // handle first interval

    var endTime   = moment.utc(listener.storedResults.startTime)
      .add(listener.viewOpts.timeIncrement, listener.viewOpts.timeMultiple);
    var remainder = endTime.diff(moment.utc());


    // If there is time left in the first timeIncrement, wait until that 
    // is finished to start the interval
    if (remainder > 0) {

      listener.timeout = setTimeout(function(){
        listener.finishedInterval();
        setNext(listener);

      }, remainder);
      
    } else {
      listener.finishedInterval();
      setNext(listener);
    }

  }

  function setNext(listener) {
    listener.interval = setInterval(function(){
      listener.finishedInterval();
    }, moment.duration(listener.viewOpts.timeMultiple, listener.viewOpts.timeIncrement).asMilliseconds());    
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

  if (!opts.base || !opts.counter) opts.reduce = false;
  else if (opts.base    && opts.base.issuer == '')    delete opts.base.issuer;
  else if (opts.counter && opts.counter.issuer == '') delete opts.counter.issuer;
 
  return opts;
}


/**
 *  createTransactionProcessor returns a function that accepts txData
 *  and parses it according to the viewOpts
 */
function createTransactionProcessor(viewOpts, resultHandler) {
 
  function txProcessor (txData){

    var txContainer = {
      close_time_timestamp: (new Date()).getTime(),
      transactions: [txData.transaction]
    };
    txContainer.transactions[0].metaData = txData.meta;

    // use the map function to parse txContainer data
    offersExercisedMap(txContainer, function(key, value){
      
      if (viewOpts.counter) {
        // return if trade doesn't match either currency in the pair
        if ((viewOpts.counter.currency !== key[0][0] || viewOpts.counter.issuer !== key[0][1])
            && (viewOpts.counter.currency !== key[1][0] || viewOpts.counter.issuer !== key[1][1])) {
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
        key      = [key[1], key[0]]
        value    = [value[1], value[0], 1/value[2], value[3], value[4], value[5], value[6]];
      }

      //console.log(value);
      if (!viewOpts.reduce) resultHandler({key: key, value: value});
      else resultHandler(offersExercisedReduce([value], false));
       
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
      unix   = Math.round(time.getTime());
      
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
                counterparty = node.FinalFields.Account,
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

            emit([payCurr, getCurr], [payAmnt, getAmnt, 1/exchangeRate, counterparty, tx.Account, unix, tx.hash]);            
        });
        
        
    });
}

/**
 *  offersExercisedReduce is the same reduce function used by the 
 *  offersExercised view in CouchDB
 *  (note the difference between the 'reduce' and 'rereduce' modes)
 */
function offersExercisedReduce(values, rereduce) {

  var stats;

  if ( !rereduce ) {

    var firstTime = values[0][5], //unix timestamp
      firstPrice  = values[0][2]; //exchange rate

    // initial values
    stats = {
      openTime  : firstTime,
      closeTime : firstTime,

      open  : firstPrice,
      close : firstPrice,
      high  : firstPrice,
      low   : firstPrice,

      curr1VwavNumerator : 0,
      curr1Volume : 0,
      curr2Volume : 0,
      numTrades   : 0
    };
    
    values.forEach( function( trade, index ) {

      var time = trade[5], //unix timestamp
        price  = trade[2]; //exchange rate
      
      if (time<stats.openTime) {
        stats.openTime = time;
        stats.open     = price;
      }

      if (stats.closeTime<time) {
        stats.closeTime = time;
        stats.close     = price;
      }

      if (price>stats.high) stats.high = price;
      if (price<stats.low)  stats.low  = price;
      
      stats.curr1VwavNumerator += price * trade[0]; //pay amount
      stats.curr1Volume += trade[0];
      stats.curr2Volume += trade[1];
      stats.numTrades++;
    });

    stats.volumeWeightedAvg = stats.curr1VwavNumerator / stats.curr1Volume;
    return stats;

  } else {

    stats = values[0];

    values.forEach( function( segment, index ) {
      
      // skip values[0]
      if (index === 0) return;

      if (!stats.open || segment.openTime<stats.openTime) {
        stats.openTime = segment.openTime;
        stats.open     = segment.open;
      }
      if (!stats.close || stats.closeTime<segment.closeTime) {
        stats.closeTime = segment.closeTime;
        stats.close     = segment.close;
      }

      if (!stats.high || segment.high>stats.high) stats.high = segment.high;
      if (!stats.low  || segment.low<stats.low)   stats.low  = segment.low;

      stats.curr1VwavNumerator += segment.curr1VwavNumerator;
      stats.curr1Volume += segment.curr1Volume;
      stats.curr2Volume += segment.curr2Volume;
      stats.numTrades   += segment.numTrades;
           
    } );

    stats.volumeWeightedAvg = stats.curr1VwavNumerator / stats.curr1Volume;
  
    return stats;
  }
}


function formatReduceResult (result) {

  return {
    startTime     : result.startTime,
    openTime      : moment.utc(result.openTime).format(),
    closeTime     : moment.utc(result.closeTime).format(),
    baseVolume    : result.curr1Volume,
    counterVolume : result.curr2Volume,
    count         : result.numTrades,
    open          : result.open,
    close         : result.close,
    high          : result.high,
    low           : result.low,
    vwap          : result.volumeWeightedAvg
  };
}


if (typeof module != 'undefined') {
  module.exports = OffersExercisedListener;
}
