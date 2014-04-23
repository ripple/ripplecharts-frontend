var MarketMakerMap = function (options){
  var self     = this,
    apiHandler = new ApiHandler(options.url);
  
  var base, counter, accounts, account, treemap, isLoading, inTransition, transactions = false;
  var div    = d3.select("#"+options.id).attr("class", "traderMap");
  var metric = options.metric || "count";
  var period = options.period || "24h";
  var color  = d3.scale.pow().exponent(0.35).range(['#ccc', "#003099"]); 
  
  var metricSelect = div.append("div").attr("class","metricSelect selectList");
  
  metricSelect.append("label").html("Metric:");
  metricSelect.selectAll("a").data(["volume","count"])
    .enter().append("a")
    .text(function(d){return d})
    .classed("selected", function(d) { return d === metric })
    .on("click", function(d){
      if (transactions) return;
      var that = this;
      metricSelect.selectAll("a").classed("selected", function() { return this === that; });
      metric = d;
      
      if (typeof store !== undefined) {
        store.set('traderMetric', metric);
        store.session.set('traderMetric', metric); 
      }
      
      //sort the accounts by the appropriate metric
      accounts.children.sort(function(a,b){return metric=="volume" ? b[1]-a[1] : b[3]-a[3]});
      
      //redraw the nodes on the map
      inTransition = true;
      color.domain(d3.extent(accounts.children, function(d){return metric=="volume" ? d[1] : d[3]}));
      map.datum(accounts).selectAll(".node").data(treemap.nodes)
        .attr("id", function(d){ return d[0] ? "node_"+d[0] : null})
        .transition().duration(500)
        .style("background", colorFunction)
        .call(position).each("end",function(){ inTransition=false });
        
      drawAccountsTable(); //redraw the table
    });  
  
  var periodSelect = div.append("div").attr("class","periodSelect selectList");
  
  periodSelect.append("label").html("Period:");
  periodSelect.selectAll("a").data(["24h","3d","7d","30d"])
    .enter().append("a")
    .text(function(d){return d})
    .classed("selected", function(d) { return d === period })
    .on("click", function(d){
      var that = this;

      if (typeof store !== undefined) {
        store.set('traderPeriod', d);
        store.session.set('traderPeriod', d); 
      }      
      
      periodSelect.selectAll("a").classed("selected", function() { return this === that; });
      self.load(null, null, d);
    });
    
  var crumb  = div.append("div").attr("class","breadcrumbs");
  var wrap   = div.append("div").attr("class","wrap");
  var width  = options.width  ? options.width  : parseInt(wrap.style('width'), 10);
  var height = 350;
    
  var map = wrap.append("div")
    .attr("class","map")
    .style("width", width + "px")
    .style("height", height + "px"); 
    
  var status = wrap.append("div")
    .attr("class","status");
    
  var loader = wrap.append("img")
    .attr("class", "loader")
    .attr("src", "assets/images/rippleThrobber.png");
      
  var table = div.append("div").attr("class","accountsTable");
  var accountsHeader = table.append("div").attr("class","accountsHeader");
    accountsHeader.append("div").html("Address");
    accountsHeader.append("div").html("Volume");
    accountsHeader.append("div").html("% of Volume");
    accountsHeader.append("div").html("# of Trades");
    accountsHeader.append("div").html("% of Trades");
    accountsHeader.append("div").html("Buy/Sell");
    
  var transactionsHeader = table.append("div").attr("class","transactionsHeader").style("display","none");
    transactionsHeader.append("div").html("Date");
    transactionsHeader.append("div").html("Base Volume");
    transactionsHeader.append("div").html("Counter Volume");
    transactionsHeader.append("div").html("Rate");
    transactionsHeader.append("div").html("Type");
    
  var tooltip = div.append("div").attr("class", "tooltip");
    tooltip.append("div").attr("class", "name");
    tooltip.append("div").attr("class", "address");
    tooltip.append("div").attr("class","volume");
    tooltip.append("div").attr("class","count");
        
  if (options.resize && typeof addResizeListener === 'function') {
    addResizeListener(window, resizeMap);
  } 
  
  
  //function called whenever the window is resized (if resizable)    
  function resizeMap () {
    old    = width;
    width  = parseInt(wrap.style('width'), 10);
    
    if (old != width) { //resized
      map.style("width", width + "px").style("height", height + "px");
      if (treemap) {
        treemap.size([width, height]);
        if (transactions) drawTransactions(true);
        else map.datum(accounts).selectAll(".node").data(treemap.nodes).call(position);
      }  
    } 
  }
  
  
  /*
   * load -
   * load a market from the selected parameters
   */
  this.load = function (b, c, p, m) {
    if (b) base    = b;
    if (c) counter = c;
    if (p) period  = p;
    if (m) metric  = m;
    
    isLoading = true;
    loader.transition().style("opacity",1);
    map.transition().style("opacity",0.5);
    tooltip.transition().style("opacity",0);
    
    //switch back to accounts display
    transactions = false;
    crumb.html("");
    periodSelect.style("display","");
    metricSelect.style("display","");
            
    apiHandler.marketMakers({
      base         : base,
      counter      : counter,
      period       : period,
      transactions : true 
    
    }, function(error, data){
      
      isLoading = false;     
      if (error) return setStatus(error.text ? error.text : "Unable to load data");
      
      data.shift(); //remove header row
      data.sort(function(a,b){return metric=="volume" ? b[1]-a[1] : b[3]-a[3]});
      
      accounts = {
        name       : base.currency+"."+base.issuer,
        volume     : 0.0,
        count      : 0,
        children   : data
      }
      
      data.forEach(function(d){
        accounts.volume += d[1];
        accounts.count  += d[3];
      });
      
     
      map.html("");
      drawAccounts();
      drawAccountsTable();
    });
  }
  
  /*
   * drawAccounts -
   * draw treemap nodes for each account returned from the API
   * 
   */  
  function drawAccounts () {    
    inTransition = true;
    transactions = false;
    map.transition().style("opacity",1);
    loader.transition().style("opacity",0);
    
    if (accounts.count) setStatus("");
    else return setStatus("No offers exercised for this period.");
    
    treemap = d3.layout.treemap()
      .size([width, height])
      .value(function(d) { return metric=="volume" ? d[1] : d[3]; });

    color.domain(d3.extent(accounts.children, function(d){return metric=="volume" ? d[1] : d[3]}));
    var node = map.datum(accounts).selectAll(".node").data(treemap.nodes);
    
    var nodeEnter = node.enter().append("div")
          .attr("class", "node")
          .on('mouseover', function(d, i){
            if (!inTransition) showTooltip(d, i, d3.select(this));
          }).on('mouseout', function(d, i){
            if (!inTransition) hideTooltip(d, i, d3.select(this));
          }).on('click', selectAccount);
    
    node.attr("id", function(d){ return d[0] ? "node_"+d[0] : null})
      .classed("account", true)
      .style("opacity","")
      .transition().duration(500)
      .style("background", colorFunction)
      .call(position).each("end",function(){ inTransition=false });
      
    node.exit().remove();
  }  


  /*
   * selectAccount -
   * display the transactions for a single account
   * 
   */
  function selectAccount (d) {
    account = {
      name     : d[0],
      children : d[10].sort(function(a,b){return moment(b[0]).unix()-moment(a[0]).unix()})
    }
    
    periodSelect.style("display","none");
    metricSelect.style("display","none");
    transactions = true;
    drawTransactions();
    drawTransactionsTable();    
  } 
  

  /*
   * drawTransactions -
   * draw treemap nodes for each transaction of a selected account
   * 
   */
  function drawTransactions(resize) {
    if (!resize) inTransition = true;
    
    treemap = d3.layout.treemap()
      .size([width, height])
      .sort(function(a,b){return moment(b[0]).unix()-moment(a[0]).unix()})
      .value(function(d) { return d[2]});

    color.domain(d3.extent(account.children, function(d){ return d[2] }));
    var node = map.datum(account).selectAll(".node").data(treemap.nodes);
    
    var nodeEnter = node.enter().append("div")
          .attr("class", "node")
          .on('mouseover', function(d, i){
            if (!inTransition) showTooltip(d, i, d3.select(this));
          }).on('mouseout', function(d, i){
            if (!inTransition) hideTooltip(d, i, d3.select(this));
          });
    
    if (resize) node.attr("id", function(d, i){return "node_"+i})
      .classed("account", false)
      .style("opacity","")
      .style("background", colorFunction)
      .call(position);
      
    else node.attr("id", function(d, i){return "node_"+(i-1)})
      .classed("account", false)
      .style("opacity","")
      .transition().duration(500)
      .style("background", colorFunction)
      .call(position).each("end",function(){ inTransition=false });
      
    node.exit().remove();    

    //set up the breadcrumb so we can get back to the accounts view    
    crumb.html("").append("span")
      .html(base.currency+"/"+counter.currency)
      .attr("class","market")
      .on('click', function(){
        transactions = false;
        crumb.html("");
        drawAccounts();
        drawAccountsTable();
        periodSelect.style("display","");
        metricSelect.style("display","")
      });
    crumb.append("span").html("&middot");
    crumb.append("span").html(account.name);
  } 
 
 
  /*
   * drawTransactionsTable -
   * fill the table with a list of transactions for the selected account
   * 
   */ 
  function drawTransactionsTable() {

    table.selectAll(".account").remove(); //remove account rows
    accountsHeader.style("display","none");
    transactionsHeader.style("display",undefined);
    
    var row = table.selectAll(".transaction").data(account.children); 
    var rowEnter = row.enter()
      .append("div")
      .attr("class", "transaction")
      .on("mouseover", function(d, i){
        if (!inTransition) d3.select("#node_"+i).classed("selected",true).transition().style("opacity", 1);
        d3.select(this).classed("selected",true);        
      }).on("mouseout", function(d, i){
        if (!inTransition) d3.select("#node_"+i).classed("selected",true).transition().style("opacity", "");
        d3.select(this).classed("selected",false);        
      });   
   
    rowEnter.append("div").attr("class","date");
    rowEnter.append("div").attr("class","baseVolume");
    rowEnter.append("div").attr("class","counterVolume");
    rowEnter.append("div").attr("class","rate");
    rowEnter.append("div").attr("class","type");
    
    row.attr('id', function(d, i){return "row_"+i})
    row.select(".date").html(function(d){return moment(d[0]).format("MMMM Do YYYY, h:mm:ss a")});
    row.select(".baseVolume").html(function(d){return commas(d[2],4)+" <small>"+base.currency+"</small>"});
    row.select(".counterVolume").html(function(d){return commas(d[3],4)+" <small>"+counter.currency+"</small>"});
    row.select(".rate").html(function(d){return commas(d[1],5)});
    row.select(".type").html(function(d){return account.name==d[4] ? "sell":"buy"})
      .classed("buy",  function(d){return account.name != d[4]}) 
      .classed("sell", function(d){return account.name == d[4]}); 
    
    row.style({opacity:0}).transition().delay(function(d, i){return i*10}).style({opacity:1});  
    row.exit().remove();        
  }
  
  /*
   * drawAccountsTable -
   * fill the table with a list of accounts for the loaded market
   * 
   */  
  function drawAccountsTable () {
    
    table.selectAll(".transaction").remove();
    transactionsHeader.style("display","none");
    accountsHeader.style("display",undefined);
    
    var row = table.selectAll(".account").data(accounts.children);
     
    var rowEnter = row.enter()
      .append("div")
      .attr("class", "account")
      .on("mouseover", function(d){
        if (!inTransition) d3.select("#node_"+d[0]).classed("selected",true).transition().style("opacity", 1);
        d3.select(this).classed("selected",true);        
      }).on("mouseout", function(d){
        if (!inTransition) d3.select("#node_"+d[0]).classed("selected",true).transition().style("opacity", "");
        d3.select(this).classed("selected",false);        
      }).on("click", selectAccount);
     
    rowEnter.append("div").attr("class","address");
    rowEnter.append("div").attr("class","volume");
    rowEnter.append("div").attr("class","volumePCT");
    rowEnter.append("div").attr("class","count");
    rowEnter.append("div").attr("class","countPCT");  
    rowEnter.append("div").attr("class","buySell"); 
     
    row.attr('id', function(d){return "row_"+d[0]})
    row.select(".address").html(function(d){return d[0]});
    row.select(".volume").html(function(d){return commas(d[1],4)+" <small>"+base.currency+"</small>"});
    row.select(".volumePCT").html(function(d){return commas(100*d[1]/accounts.volume,2)+"%"});
    row.select(".count").html(function(d){return d[3]});
    row.select(".countPCT").html(function(d){return commas(100*d[3]/accounts.count,2)+"%"});
    row.select(".buySell").html(function(d){return commas(100*d[4]/d[1],0)+"/"+commas(100*d[7]/d[1],0);})
      .classed("buy",  function(d){return (d[4]-d[7])/d[1]>0.04})  //overall buyer
      .classed("sell", function(d){return (d[7]-d[4])/d[1]>0.04}); //overall seller 
    
    row.style({opacity:0}).transition().delay(function(d, i){return i*10}).style({opacity:1});  
    row.exit().remove();    
  }
  
  
  /*
   * showTooltip -
   * update, position, and show the tooltip
   * 
   */
  function showTooltip (d, i, node) {
    if (!d[0]) return hideTooltip(d);
    
    var top, left;
    
    if (transactions) transactionTooltip (d, i, node);
    else              accountTooltip (d, i, node);
    
    left     = d.x+300>width  ? width-300 : d.x+60;
    top      = d.y+160>height ? height-160 : d.y+60;
    if (left<20) left = 20;
    if (top<20)  top  = 20;    
    
    tooltip.transition()
      .style("opacity",1)
      .style("left", left+"px")
      .style("top", top+"px");       
  }
  
  /*
   * transactionTooltip -
   * update the tooltip with data from a transaction
   * 
   */
  function transactionTooltip (d, i, node) {
    node.classed("selected",true).transition().style("opacity", 1);
    d3.select("#row_"+(i-1)).classed("selected",true);
    
    tooltip.select(".address").html(account.name);
    
    var volume, count, type;
    type    = account.name==d[4] ? "sell":"buy";
    
    volume  = "<label>Base Amount:</label> <b>"+commas(d[2],4)+" <small>"+base.currency+"</small></b>";
    volume += "<label>Counter Amount:</label> <b>"+commas(d[3],4)+" <small>"+counter.currency+"</small></b>";
    count   = "<b><span class='"+type+"'>"+type+"</span> @ "+commas(d[1],5)+"</b>"; 
    count  += "<div class='date'>"+moment(d[0]).format("MMMM Do YYYY, h:mm:ss a")+"</div>";
    
    tooltip.select(".volume").html(volume);   
    tooltip.select(".count").html(count);     
  }
  
  
  /*
   * accountTooltip -
   * update the tooltip with data from an account
   * 
   */
  function accountTooltip (d, i, node) {  
    var volume, count, top, left;
    
    node.classed("selected",true).transition().style("opacity", 1);
    d3.select("#row_"+d[0]).classed("selected",true);
     
    tooltip.select(".address").html(d[0]);
    
    volume   = "<b>"+commas(d[1],4)+" <small>"+base.currency+"</small></b> ("+commas(100*d[1]/accounts.volume,2)+"%)";
    count    = "<b>"+d[3]+"</b> ("+commas(100*d[3]/accounts.count,2)+"%)";

    
    tooltip.select(".volume").html("<label>Total Volume:</label>"+volume);   
    tooltip.select(".count").html("<label># of Transactions:</label>"+count); 
  }
  
  /*
   * hideTooltip -
   * hide the tooltip and deselect nodes and table rows
   * 
   */
  function hideTooltip (d, i, node) {
    if (node) node.classed("selected",false).transition().style("opacity", "");
    
    if (transactions) d3.select("#row_"+(i-1)).classed("selected",false); 
    else  d3.select("#row_"+d[0]).classed("selected",false); 
    tooltip.transition().style("opacity",0);       
  }
  
  /*
   * position -
   * establish the position of a node
   * 
   */
  function position() {
    this.style("left", function(d) { return d.x + "px"; })
      .style("top", function(d) { return d.y + "px"; })
      .style("width", function(d) { return Math.max(0, d.dx - 1) + "px"; })
      .style("height", function(d) { return Math.max(0, d.dy - 1) + "px"; });
  }
  
  /*
   * colorFunction -
   * select the color for a node
   * 
   */
  function colorFunction (d) { 
    if(!d[0]) return null;
    if      (transactions) return color(d[2]);     //baseVolume
    if      (metric=="volume") return color(d[1]); //baseVolume
    else if (metric=="count") return color(d[3]);  //# of transactions
    return null;
  } 
  
  /*
   * setStatus - 
   * set the text of the status message
   * 
   */
  function setStatus(string) {
    status.html(string)
    if (string) {
      loader.transition().style("opacity",0);
    }
  } 
}