
function LedgerQueue(onDischarge, isSlow) {
  var queue = [];
  var POLLING_INTERVAL_MS = 250;
  var dischargingInterval;
  var standardDelay = Infinity;
  var lastTimestamp;
  
  var lq = {};
  
  lq.enqueueLedger = function(ledger) { // ledger = {ledger_index: Integer, ledger_hash: String, timestamp: Number}
    if (queue.length) {
      var lastLedger = queue[queue.length-1];
      if (ledger.ledger_index <= lastLedger.ledger_index) {
        return;
      }
      var duration = ledger.timestamp - lastTimestamp;
      lastLedger.timeTillNext = duration;
      ledger.timeSinceLast = duration;
      if (!isFinite(standardDelay) && queue.length > 0) {
        standardDelay = (new Date() / 1000) - queue[0].timestamp;
        lq.start();
      }
    }
    lastTimestamp = ledger.timestamp;
    ledger.subsequentEvents = [];
    queue.push(ledger);
  }
  
  lq.enqueueEvent = function(event) {
    if (queue.length) {
      queue[queue.length-1].subsequentEvents.push(event);
    }
  }
  
  function dischargeLedger(ledger) {
    var events = ledger.subsequentEvents;
    var slowEvents = events.filter(isSlow).length;
    var fastEvents = events.length - slowEvents;
    var slowTime = 0.6 * ledger.timeTillNext / (slowEvents+1);
    var fastTime = 0.2 * ledger.timeTillNext / (fastEvents+1);
    function dischargeRemainder() {
      if (events.length) {
        var event = events.shift();
        setTimeout(function(){
          onDischarge(event);
          dischargeRemainder();
        }, 1000*(isSlow(event) ? slowTime : fastTime));
      }
    }
    onDischarge(ledger);
    dischargeRemainder();
  }
  
  var firstTime = true;
  lq.start = function() {
    dischargingInterval = setInterval(function(){
      if (firstTime && queue.length > 0 || queue.length > 1) {
        firstTime = false;
        var oldestLedger = queue[0];
        var nowSeconds = new Date() / 1000;
        if (nowSeconds - oldestLedger.timestamp > standardDelay) {
          dischargeLedger(queue.shift());
        }
      }
    }, POLLING_INTERVAL_MS);
  }
  
  lq.stop = function() {
    clearInterval(dischargingInterval);
  }
  
  lq.reset = function() {
    lq.stop();
    queue = [];
    standardDelay = Infinity;
    firstTime = true;
  }
  
  return lq;
}