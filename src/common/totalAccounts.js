var TotalAccounts = function (options) {
  var self        = this;
  var apiHandler  = new ApiHandler(options.url);
  var request, basisRequest;
  
  if (options.id) self.div = d3.select("#"+options.id).attr("class","chartWrap");
  else            self.div = d3.select("body").append("div").attr("class","chartWrap");
  
  self.div.append("div").attr("class","interval selectList");
  self.div.append("div").attr("class","lineChart").attr('id', options.id+"Chart");
  
  var interval = d3.select(".interval").selectAll("a")
    .data([
      {name: "15m", interval:"minute", multiple:15, offset: function(d) { return d3.time.day.offset(d, -2); }},
      {name: "1h",  interval:"hour",   multiple:1,  offset: function(d) { return d3.time.day.offset(d, -5); }},
      {name: "4hr", interval:"hour",   multiple:4,  offset: function(d) { return d3.time.day.offset(d, -20); }},
      {name: "1d",  interval:"day",    multiple:1,  offset: function(d) { return d3.time.day.offset(d, -120); }},
      {name: "3d",  interval:"day",    multiple:3,  offset: function(d) { return d3.time.year.offset(d, -1); }},
      {name: "1w",  interval:"day",    multiple:7,  offset: function(d) { return d3.time.year.offset(d, -3); }},
      {name: "1m",  interval:"month",  multiple:1,  offset: function(d) { return d3.time.year.offset(d, -5); }}
    ])
  .enter().append("a")
    .attr("href", "#")
    .classed("selected", function(d) { return d.name === "3d"})
    .text(function(d) { return d.name; })
    .on("click", function(d){
      d3.event.preventDefault();
      var that = this;
      interval.classed("selected", function() { return this === that; });
      if (d.name == "custom") {
        //$('#range').slideToggle();    
      } else selectRange (d);
    });
    
  var chart = new LineChart({
    id         : options.id+"Chart",
    title      : "Total Accounts",
    leftTitle  : "Accounts Created",
    rightTitle : "Total",
    resize     : true,
    tooltip    : function (d, increment) {
      return "<div>"+parseDate(d.x.local(), increment) + 
        "</div><span>Accounts Created:</span>" + d.y2 + 
        "<br/><span>Total Accounts:</span>" + d.y
      }
  });
  
  function selectRange (d) {
    var end   = new Date();
    var start = d.offset(end);

    //$('#startTime').datepicker('setValue', start);
    //$('#endTime').datepicker('setValue', end);
    self.update(d.interval, start, end);
  }
  
  this.update = function (increment, start, end) {
    chart.fadeOut();
    
    if (start.getFullYear()<2005) { //because of bug in API for earlier dates   
      chart.basis = 0;
      updateHelper({
        startTime     : start,
        endTime       : end,
        timeIncrement : increment,
        descending    : true
      }); 
            
    } else {
      if (basisRequest) basisRequest.abort();
      basisRequest = apiHandler.getTotalAccounts(start, function(total){
        chart.basis = total;
      });
      
      updateHelper({
        startTime     : start,
        endTime       : end,
        timeIncrement : increment,
        descending    : true
      });
    } 
  } 
  
  this.suspend = function () {
    chart.suspend(); //remove resize listener
  } 
  
  function updateHelper (params) {
    if (request) request.abort();
    request = apiHandler.accountsCreated(params, function (data) {
      var total  = chart.basis,
        lineData = [];
        
      data.splice(0,1);
      
      lineData = data.map(function(d){
        total += d[1];
        return {
          x  : moment.utc(d[0]),
          y  : total,
          y2 : d[1]}
      });
      
      chart.redraw(params.timeIncrement, lineData);
    }, function (error) {
      
    });
  } 
  
  function parseDate (date, increment) {
    var monthNames = [ "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December" ];
    
    
    if      (increment == "month") return monthNames[date.month()] + " " + date.year();
    else if (increment == "day")   return monthNames[date.month()] + " " + date.date();
    else if (increment == "hour")  return monthNames[date.month()] + " " + date.date() + " &middot " + date.format("hh:mm A");
    else return monthNames[date.month()] + " " + date.date() + " &middot " + date.format("hh:mm:ss A");
  }
  
  self.div.select(".interval .selected")[0][0].click();
}
