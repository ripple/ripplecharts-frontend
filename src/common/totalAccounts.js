var TotalAccounts = function (options) {
  var self        = this;
  var apiHandler  = new ApiHandler(options.url);
  var request, basisRequest;
  
  if (options.id) self.div = d3.select("#"+options.id).attr("class","chartWrap");
  else            self.div = d3.select("body").append("div").attr("class","chartWrap");
  
  var list = self.div.append("div").attr("class","interval selectList");
  self.div.append("div").attr("class","lineChart").attr('id', options.id+"Chart");
  
  list.append("label").html("Range:");
  var interval = list.selectAll("a")
    .data([
      {name: "week",   interval:"hour",  offset: function(d) { return d3.time.day.offset(d, -7); }},
      {name: "month",  interval:"hour",  offset: function(d) { return d3.time.month.offset(d, -1); }},
      {name: "quarter",interval:"day",   offset: function(d) { return d3.time.month.offset(d, -3); }},
      {name: "year",   interval:"day",   offset: function(d) { return d3.time.year.offset(d, -1); }},
      {name: "max",    interval:"month",  offset: function(d) { return new Date("Jan 1 2013 Z")}}
    ])
  .enter().append("a")
    .attr("href", "#")
    .classed("selected", function(d) { return d.name === "year"})
    .text(function(d) { return d.name; })
    .on("click", function(d){
      d3.event.preventDefault();
      var that = this;
      interval.classed("selected", function() { return this === that; });
      if (d.name == "custom") {
        //$('#range').slideToggle();    
      } else selectRange (d);
    });
  
  
//create new line chart    
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
    update(d.interval, start, end);
  }
  
  
  function update (increment, start, end) {
    chart.loading = true;
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
    request = apiHandler.accountsCreated(params, function (err, data) {

      if (err) {
        console.log(err);
        chart.loading = false;
        chart.setStatus(err.text ? err.text : "Unable to load data");
        return;        
      }
      
      var total  = chart.basis,
        lineData = [];
        
      data.splice(0,1);
      data.reverse(); //descending option doesnt work
      
      lineData = data.map(function(d){
        total += d[1];
        return {
          x  : moment.utc(d[0]),
          y  : total,
          y2 : d[1]}
      });
      
      chart.loading = false;
      chart.redraw(params.timeIncrement, lineData);
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
