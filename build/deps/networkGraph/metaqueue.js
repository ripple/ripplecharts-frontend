/* A queue of queues.
-function isEnder(item): returns true/false, whether the item should mark the end of a queue.
-function isTimeful(item): true/false, whether an item's dischargement should delay the next
	in order to avoid bunching.
-function onDischarge(item, duration): what should be done with the item when it is
	discharged. (The "duration" argument tells the duration of the queue from which the item
	was drawn.)
Items are given an "enqueuedAt" timestamp upon enqueuing.
We don't start discharging until there are at least two queues in the upperQueue.
Items are discharged over time. The time it takes for an individual queue to
	discharge all of its items should be equal to the timespan between that queue's ender
	and the previous queue's ender. Within a queue, all of the "timeful" items are discharged
	at regular intervals. (The "timeless" items are discharged without delaying the next.)
*/
function MetaQueue(isEnder, isTimeful, onDischarge) {
	var lowerQueue = [];
	var upperQueue = [];	
	var lastEnqueuedEnder;
	var startedYet = false;
	var running = false;
	var paused = false;
	
	var mq = {};
	
	mq.clear = function() {
		lowerQueue = [];
		upperQueue = [];
	};
  
	mq.pause = function() {
		paused = true;
	}
	mq.play = function() {
		paused = false;
	}
	
	mq.getLastEnqueuedEnder = function() {
		return lastEnqueuedEnder;
	}
	
	mq.enqueue = function(item) {
    if (!paused) {
      var now = new Date();
      item.enqueuedAt = now;
      lowerQueue.push(item);
      if (isEnder(item)) {
        var lee = lastEnqueuedEnder;
        var duration = lee ? (now-lee.enqueuedAt) : 0;
        lastEnqueuedEnder = item;
        lowerQueue.duration = duration;
        upperQueue.push(lowerQueue);
        lowerQueue = [];
        if (!startedYet && upperQueue.length >= 2) {
          startedYet = true;
          //this.play();
          //console.log("initializing monitor");
          monitor();
        } else if (startedYet && !running) {
          //console.log("restarting monitor");
          monitor();
        }
      }
    }
	};
	
	var dischargementsInProgress = 0;
	function dischargeQueue(queue, callback) {
		dischargementsInProgress++;
		//console.log("START DQ", dischargementsInProgress);
		var numberOfTimefulItems = queue.filter(isTimeful).length;
		var delay = queue.duration / (1+numberOfTimefulItems);
		//console.log("DURATION", queue.duration, numberOfTimefulItems);
		function dischargeNext() {
			var item = queue.shift();
			if (item) {
				onDischarge(item, queue.duration);
				if (isTimeful(item)) {
					//console.log("delaying...");
					setTimeout(dischargeNext, delay);
				} else {
					setTimeout(dischargeNext, 0);
				}
			} else {
				//console.log("FINISH DQ", dischargementsInProgress);
				dischargementsInProgress--;
				callback();
			}
		}
		setTimeout(dischargeNext, delay);
	}
	/*
	function monitor() {
		if (!paused && upperQueue.length) {
			var queue = upperQueue.shift();
			dischargeQueue(queue, monitor);
		} else {
			setTimeout(monitor, 100);
		}
	}
	
	monitor();*/
	
	function monitor() {
		//console.log("MONITOR");
		if (upperQueue.length) {
			running = true;
			dischargeQueue(upperQueue.shift(), monitor);
		} else {
			running = false;
			//console.log("resting monitor");
		}
	}
	
	return mq;
}