var ValueSummary = function (options) {

  var self = this;
  var outer  = options.id ?
      d3.select("#"+options.id).attr("class","valueSummary") :
      d3.select("body").append("div").attr("class","valueSummary");

  var inner = outer.append("div").attr("class","inner");
  var width = parseInt(outer.style("width"),  10);
  var height = parseInt(outer.style("height"), 10) || width;
  var radius = (Math.min(width, height)) / 2;
  var margin = {top:radius/10, bottom:radius/10, left:radius/10, right:radius/10};

  inner.style({width:(radius*2)+"px", height:(radius*2)+"px"});
  radius -= margin.top;

  var chart = inner.append('svg')
    .attr("width",  radius*2.3)
    .attr("height", radius*2.3)
    .append("g")
    .attr("transform", "translate(" + (radius+margin.left) + "," + (radius+margin.top) + ")");

  var toggle = outer.append("label").attr("class","xrpToggle");
  var hideXRP = true;
  var currencyOrder = ['XAU', 'XAG', 'BTC', 'LTC', 'XRP', 'EUR', 'USD', 'GBP', 'AUD', 'NZD', 'USD', 'CAD', 'CHF', 'JPY', 'CNY'];

  toggle.append("input").attr("type", "checkbox")
    .property("checked", !hideXRP)
    .on('click', function(){
      hideXRP = !d3.select(this).property("checked");
      self.load(null, exchange, true);
    });

  toggle.append("b");
  toggle.append("span").html("include XRP");

  //var color  = d3.scale.category20();
  var color = function (d) {
    var currency = "";
    if (d.data.base) {
      currency = d.data.base.currency;
    } else if (d.data.currency) {
      currency = d.data.currency;
    }

    var colors = {
      'XRP'     : '#346aa9',
      'USD'     : [20,150,30],
      'BTC'     : [240,150,50],
      'EUR'     : [220,210,50],
      'CNY'     : [180,30,35],
      'JPY'     : [140,80,170],
      'CAD'     : [130,100,190],
      'other'   : [100, 150, 200]
    };
    var c = colors[currency] || colors.other;
    var rank = d.data.rank - 1;
    if (typeof c !== 'string') {
      c[0] -= Math.floor(c[0] * (rank%3*0.1));
      c[1] -= Math.floor(c[1] * (rank%3*0.15));
      c[2] -= Math.floor(c[2] * (rank%3*0.2));

       c = 'rgb('+c[0]+','+c[1]+','+c[2]+')';
    }

    return c;
  }

  var arc = d3.svg.arc()
      .outerRadius(radius*0.9)
      .innerRadius(radius*0.55);

  var labelArc = d3.svg.arc()
      .outerRadius(radius*1.15)
      .innerRadius(radius);

  //arc paths
  var path = chart.selectAll("path");
  var label = inner.selectAll("label");
  var tooltip = outer.append("div").attr("class","tooltip");
  var transitioning = false;
  var gateways = options.gateways;
  var data = [];
  var exchange;
  var current;
  var total;

  //load a specific metric
  this.load = function (z, ex, xrpToggle) {

    if (z && z.components) {
      total = z.total || 0;
      data  = [];
      z.components.forEach(function(d){
        if (d.converted_amount) data.push(JSON.parse(JSON.stringify(d)));
      });
    } else if (!data) return;

    if (!data.length) {
      tooltip.html("");
      path.data([]).exit().remove();
      inner.selectAll("label").data([]).exit().remove();
      return;
    }

    //indicate we are in the midst of transition
    transitioning = true;
    exchange      = ex;

    //check for XRP, set the percentages
    var XRPObj, currencies = {};
    data.forEach(function(d) {
      if (d.currency=='XRP') XRPObj = d;

      d.percent = total ? d.converted_amount/total*100 : 0.00;
    });

    //XRP wont be present for trade volume, so add it at 0
    if (!XRPObj) data.push({currency:'XRP', converted_amount:0.0});

    //if the XRP toggle is active and XRP should be hidden
    //adjust the total, set the XRP amount to 0, and
    //recalculate the percentages
    else if (xrpToggle && hideXRP) {
      var adjusted = total - XRPObj.amount;
      data.forEach(function(d){
        if (d.currency=='XRP') d.converted_amount = 0;
        d.percent = adjusted ? d.converted_amount/adjusted*100 : 0.00;
      });

    //otherwise, reset the converted amount and set percentage
    } else {
      XRPObj.converted_amount = XRPObj.amount || 0.0;
      XRPObj.percent = total ? XRPObj.amount/total*100 : 0.00;
    }

    //sort by issuer, reversed
    data.sort(function(a, b){
      var i1 = a.base ? a.base.currency+a.base.issuer : a.currency+a.issuer || "Z"; //make XRP first
      var i2 = b.base ? b.base.currency+b.base.issuer : b.currency+b.issuer || "Z"; //make XRP first
      return i2 ? i2.localeCompare(i1) : 0;
    });

    //rank based on order of apperance. we could
    //do by percent, but then the colors would
    //change between metrics.
    data.forEach(function(d) {
      var c = d.currency || d.base.currency;
      if (currencies[c]) currencies[c]++;
      else currencies[c] = 1;
      d.rank = currencies[c];
    });

    var pie = d3.layout.pie()
        .sort(null)
        .startAngle(1.1*Math.PI)
        .endAngle(3.1*Math.PI)
        .value(function(d) { return d.converted_amount; });

    //add arcs
    path = path.data(pie(data));
    path.enter().append("path")
    .on('mouseover',showTooltip)
    .on('mouseout', function(){
      path.classed('fade', false);
      label.classed('fade', false);
    })
    .on('click', function(d) {
      if (d.data.base) {
        var co1 = currencyOrder.indexOf(d.data.base.currency);
        var co2 = currencyOrder.indexOf(d.data.counter.currency);
        var market;

        if (co2 < co1) {
          market = d.data.counter.currency +
            (d.data.counter.issuer ? ':' + d.data.counter.issuer : '') + '/' +
            d.data.base.currency +
            (d.data.base.issuer ? ':' + d.data.base.issuer : '');
        } else {
          market = d.data.base.currency +
            (d.data.base.issuer ? ':' + d.data.base.issuer : '') + '/' +
            d.data.counter.currency +
            (d.data.counter.issuer ? ':' + d.data.counter.issuer : '');
        }

        window.location.hash = '#/markets/' + market;
      }
    })

    path.classed('pair', function(d) {
      return d.data.base ? true : false;
    });

    var pathUpdate = chart.selectAll("path")
      .style("fill", function(d, i) { return color(d); })
      .style("stroke", function(d, i) { return color(d); })
      .style("stroke-width", ".35px")
      .transition().duration(750).attrTween("d", arcTween)
      .attr("id", function(d, i){return "arc_"+i})
      .each("end", function(){transitioning = false});

    path.exit().remove();

    //show data for the first item,
    //unless it has no volume
    current = null;
    var i = 0;
    var d = path.data()[i];
    while (d && !d.data.converted_amount) {
      i++;
      d = path.data()[i];
    }

    if (d) {
      showTooltip(d, i, true);
    }

    //add labels
    label = label.data(path.data());

    label.enter().append("label");

    label.html(function(d){
        if (!d.data.currency && !d.data.base) return "";
        if (!d.data.converted_amount) return "";
        if (d.data.percent<2) return "";

        var l;
        var co1;
        var co2;
        if (d.data.base) {
          co1 = currencyOrder.indexOf(d.data.base.currency);
          co2 = currencyOrder.indexOf(d.data.counter.currency);

          if (co1 < co2) {
            l = d.data.base.currency+"/"+d.data.counter.currency;
          } else {
            l = d.data.counter.currency+"/"+d.data.base.currency;
          }
        } else {
          l = d.data.currency;
        }

        return l+"<b>"+commas(d.data.percent,0)+"%</b>";
      })
      .style("margin-top", function(d){
        return ((0 - parseInt(d3.select(this).style("height"), 10))/2)+"px";
      })
      .style("margin-left", function(d){
        return ((0 - parseInt(d3.select(this).style("width"), 10))/2)+"px";
      })
      .transition().duration(500)
      .style("top", function(d){
        return (labelArc.centroid(d)[1]+125)+"px";
      })
      .style("left", function(d){
        return (labelArc.centroid(d)[0]+125)+"px";
      });

    label.exit().remove();

    toggle.style("display", xrpToggle ? "block" : "none");
  }


  //function for determining arc angles.
  function arcTween(b) {
    var c = this._current;
    if (!c) {
      if (chart.select("path:nth-last-child(2)")[0][0])
        c = chart.select("path:nth-last-child(2)")[0][0]._current;
      if (c) c.startAngle = c.endAngle;
    }

    if (!c) c = {startAngle: 1.1*Math.PI, endAngle: 1.1*Math.PI};
    var i = d3.interpolate(c, b);
    this._current = i(0);
    return function(t) {
      return arc(i(t));
    };
  }


  function showTooltip(d, i, init) {

    if (!init) {
      path.classed('fade', function(row) {
        return row !== d;
      });

      label.classed('fade', function(row) {
        return row !== d;
      });
    }

    if (current===i) return;
    current = i;

    var l;
    var co1;
    var co2;

    if (d.data.base) {
        co1 = currencyOrder.indexOf(d.data.base.currency);
        co2 = currencyOrder.indexOf(d.data.counter.currency);

      if (co1 < co2) {
        l = d.data.base.currency+"/"+d.data.counter.currency;
      } else {
        l = d.data.counter.currency+"/"+d.data.base.currency;
      }
    } else {
      l = d.data.currency;
    }

    var currency = d.data.base ? d.data.base.currency : d.data.currency;
    var issuer   = d.data.base ? d.data.base.issuer : d.data.issuer;
    var gateway  = gateways.getName(currency, issuer) || issuer;
    var amount   = commas(d.data.amount,2);
    var value    = currency === exchange.currency || !exchange.rate ? "" : commas(d.value/exchange.rate,2);
    var count    = d.data.count;

    tooltip.html("");
    tooltip.append("div").attr("class","title").html(l+(gateway ? " &middot <small>"+gateway+"</small>" : ""));
    if (value) tooltip.append("div").attr("class","value")
      .html("<label>Value:</label> "+value+" <small>"+exchange.currency+"</small>");
    tooltip.append("div").attr("class","amount")
      .html("<label>Amount:</label> "+amount+" <small>"+currency+"</small>");
    if (count) tooltip.append("div").attr("class","count")
      .html("<label>Count:</label> "+count);

    tooltip.select(".title small").style("color", color(d));
  }
}
