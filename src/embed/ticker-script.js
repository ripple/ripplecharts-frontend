var TickerWidget = function (options) {
  var self = this;
  apiHandler  = new ApiHandler(API);

  req = apiHandler.exchangeRates({
    base          : options.base,
    counter       : options.counter,
    last          : true
  }, function(err, data){
    console.log("INITIAL:", data[0].last);
    $("#prices").text(parseFloat(data[0].last).toFixed(6));
  });

  setLiveFeed(options.base, options.counter);

}

//enable the live feed via ripple-lib
function setLiveFeed (base, counter) {
  console.log("Starting");
  var point = {
      startTime     : moment.utc(),
      baseVolume    : 0.0,
      counterVolume : 0.0, 
      count         : 0,
      open          : 0.0,
      high          : 0.0,
      low           : 0.0,
      close         : 0.0,
      vwap          : 0.0,
      openTime      : null,
      closeTime     : null
    };
  
  var viewOptions = {
    base    : base,
    counter : counter,
    timeIncrement    : "minute",
    timeMultiple     : 15,
    incompleteApiRow : point
  }
  
  liveFeed = new OffersExercisedListener (viewOptions, liveUpdate);
}

//add new data from the live feed to the chart  
function liveUpdate (data) {
  console.log(data);
  $("#prices").text(parseFloat(data.close).toFixed(6));
}