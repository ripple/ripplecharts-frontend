angular.module('chordDiagram', []).directive('chordDiagram', ['$window', 'matrixFactory', 'rippleName',

function ($window, matrixFactory, rippleName) {

  var link = function ($scope, $el, $attr) {

    var div  = d3.select($el[0]).attr('class', 'chord-chart');
    var height;
    var width;
    var marg = [10, 10, 10, 10]; // TOP, RIGHT, BOTTOM, LEFT
    var dims = []; // USABLE DIMENSIONS
    var currencyOrder = ['XAU', 'XAG', 'BTC', 'LTC', 'XRP', 'EUR', 'USD', 'GBP', 'AUD', 'NZD', 'USD', 'CAD', 'CHF', 'JPY', 'CNY'];
    var xrpRates = {
      XRP : 1
    };
    var filters = {};
    var exCurrency = 'XRP';
    var exRate = 1;
    var chordData;
    var smallest;
    var innerRadius;
    var outerRadius;
    var x;
    var y;
    var arc;
    var path;

    /**
     * currencyColor
     */

    var currencyColor = function (currency, rank) {
      var baseColors = {
        'XRP'     : '#346aa9',
        'USD'     : [20,150,30],
        'BTC'     : [240,150,50],
        'EUR'     : [220,210,50],
        'CNY'     : [180,30,35],
        'JPY'     : [140,80,170],
        'CAD'     : [130,100,190],
        'other'   : [100, 150, 200]
      };

      var c = baseColors[currency] || baseColors.other;
      rank = rank ? rank-- : 3;

      if (typeof c !== 'string') {
        c[0] -= Math.floor(c[0] * (rank%3*0.1));
        c[1] -= Math.floor(c[1] * (rank%3*0.25));
        c[2] -= Math.floor(c[2] * (rank%3*0.3));

         c = 'rgb('+c[0]+','+c[1]+','+c[2]+')';
      }

      return c;
    }

    var chord = d3.layout.chord()
      .padding(0.05)
      .sortSubgroups(d3.descending);

    var matrix = matrixFactory.chordMatrix()
      .layout(chord)
      .sort(function(a, b) {
        return a.split('.')[0] < b.split('.')[0] ? -1 : 1;
      })
      .filter(function (item, r, c) {
        return (item.base === r.name && item.counter === c.name) ||
               (item.counter === r.name && item.base === c.name);
      })
      .reduce(function (items, r, c) {
        var value = 0;

        if (items.length) {
          value = items.reduce(function (m, n) {
            return m + n.volume;
          }, 0);
        }

        return {
          value: value,
          data: items
        };
      });

    var svg = div.append("svg")
    .attr("class", "chart")
    .attr("preserveAspectRatio", "xMinYMin")

    var container = svg.append("g")
    .attr("class", "container")

    var sidebarLeft = div.append('div')
    .attr('class','sidebar left');

    var sidebarRight = div.append('div')
    .attr('class','sidebar right');

    sidebarLeft.append('div')
    .attr('class','normalization')
    .html('<label>Normalization Currency:</label>' +
      '<select class="valueCurrencySelect"></select>' +
      '<div class="normalization-rate"></div>');

    sidebarLeft.append('div')
    .attr('class','totals');

    sidebarLeft.append('div')
    .attr('class', 'filters')
    .html('<div class="title"></div>' +
      '<div class="list"></div>' +
      '<div class="empty"></div>');

    sidebarLeft.select('.filters .title')
    .html('Filtered Currencies')
    .append('div')
    .attr('class', 'clear')
    .style('display','none')
    .html('clear all')
    .on('click', function() {
      filters = {};
      $scope.update();
      updateFilters();
    });

    sidebarLeft.select('.filters .empty')
    .style('display','none')
    .html('Click a currency to remove it from the display.');

    sidebarRight.append('div')
    .attr('class','groups');

    sidebarRight.append('div')
    .attr('class','chord');

    $scope.setNormalizationRates = function(rates, selected) {
      rates.push({
        currency: 'XRP',
        rate: 1
      });

      var select = sidebarLeft.select('.normalization select');
      var options = select.selectAll('option')
      .data(rates, function(d) { return d.currency });

      if (selected) {
        exCurrency = selected;
      }

      options.enter().append('option').html(function(d) {
        return d.currency;
      });

      options.property('selected', function(d) {
        return d.currency === exCurrency;
      });

      options.exit().remove();

      select.on('change', function() {
        setExchangeCurrency(this.value);
        updateSidebars();
      });

      setExchangeCurrency(select.node().value);

      function setExchangeCurrency(currency) {
        var html;

        rates.every(function(rate) {
          if (rate.currency === currency) {

            exRate = rate.rate;
            exCurrency = currency;

            html = currency === 'XRP' ?
              '' : rate.rate.toPrecision(4) + ' <small>XRP/' + currency + '</small>';
            sidebarLeft.select('.normalization-rate')
            .html(html);
            return false;
          }

          return true;
        });
      }
    };

    $scope.setNormalizationRates([{
      currency: 'XRP',
      rate: 1
    }]);

    $scope.update = function (resize) {
      $scope.drawChords($scope.chordData || []);
      if (!resize) {
        //update sidebars
        setTimeout(updateSidebars, 1000);
        setTimeout(updateFilters, 1000);
      }
    };

    /**
     * drawChords
     */

    $scope.drawChords = function (data) {
      chordData = data.filter(function (d) {
        if (filters[d.base] || filters[d.counter]) {
          return false;
        } else {
          return true;
        }
      });

      //save exchange rates
      chordData.forEach(function(chord) {
        xrpRates[chord.base] = chord.base_rate;
      });

      matrix.data(chordData)
        .resetKeys()
        .addKeys(['base','counter'])
        .update()

      var tracker = {};
      var list = matrix.chords();
      list.forEach(function(c) {
        c.currency = c.source._id.split('.')[0];
        c.index = tracker[c.currency] = tracker[c.currency] ?
          ++tracker[c.currency] : 1;
      });

      //handle chords
      var chords = container.selectAll("path.chord")
      .data(list, function (d) { return d._id; });

      chords.enter().append("path")
      .attr("class", "chord")
      .style("fill", function (d) {
        return currencyColor(d.currency, d.index);
      })
      .style("stroke", function (d) {
        return currencyColor(d.currency, d.index);
      })
      .attr("d", path)
      .on("mouseover", chordMouseover)
      .on("mouseout", chordMouseout)

      chords
      .transition()
      .duration(2000)
      .attrTween("d", matrix.chordTween(path))

      chords.exit().remove()

      //handle groups
      var groups = container.selectAll("g.group")
        .data(matrix.groups(), function (d) { return d._id; });

      var gEnter = groups.enter()
      .append("g")
      .attr("class", "group")
      .on("click", groupClick)
      .on("mouseover", groupMouseover)
      .on("mouseout", groupMouseout)

      gEnter.append("path")
      .style("fill", function (d) {
        return currencyColor(d._id.split('.')[0]);
      })
      .style("stroke", function (d) {
        return currencyColor(d._id.split('.')[0]);
      })
      .attr("d", arc)
      .style('opacity', 0);

      var textBox = gEnter.append('text')
      .attr('class','text-box')
      .attr("dy", ".5em")
      .on("click", groupClick)
      .on("mouseover", groupMouseover)
      .on("mouseout", groupMouseout)
      .attr("transform", 'scale(3), translate(-100,-100)')
      .style('opacity', 0)

      textBox.append('tspan')
      .attr('class', 'currency')
      .text(function(d) {
        return d._id.split('.')[0];
      });

      textBox.append('tspan')
      .attr('class', 'issuer')
      .text(function(d) {
        return d._id.split('.')[1] || '';
      });
/*
        var c = d._id.split('.');
        var currency;
        var issuer;

        currency = '<text class="currency">' + c[0] + '</text>';
        issuer = c[1] ? '<text class="issuer">' + c[1] + '</text>' : '';
        console.log(currency + issuer);
        return currency + issuer;
      });
*/
      groups.select("path")
      .transition()
      .duration(function(d,i) {
        return 1200 + i*100;
      })
      .attrTween("d", matrix.groupTween(arc))
      .style('opacity', 1);

      groups.select('.text-box').each(function(d) {
        d.angle = (d.startAngle + d.endAngle) / 2;
        var el = d3.select(this);
        var c = el.select('.currency').node();
        var i = el.select('.issuer').node();
        if (i) {
          el.html('');
          if (d.angle > Math.PI) {
            el.node().appendChild(i);
            el.node().appendChild (document.createTextNode (' '));
            el.node().appendChild(c);
          } else {
            el.node().appendChild(c);
            el.node().appendChild (document.createTextNode (' '));
            el.node().appendChild(i);
          }
        }
      });

      groups.select('.text-box')
      .transition()
      .delay(function(d,i) {
        return i*100;
      })
      .duration(1200)
      .style('opacity', 1)
      .attr("transform", function (d) {
        var r = "rotate(" + (d.angle * 180 / Math.PI - 90) + ")";
        var t = " translate(" + (outerRadius + (outerRadius - innerRadius)/2) + ")";
        var s = " scale(" + smallest/1000 + ")";
        return r + t + s + (d.angle > Math.PI ? " rotate(180)" : " rotate(0)");
      })
      .attr("text-anchor", function (d) {
        return d.angle > Math.PI ? "end" : "begin";
      });


      groups.exit()
      .selectAll("text")
      .transition().duration(500)
      .style({
        fill: 'orange',
        stroke: 'orange'
      });

      groups.exit()
      .transition()
      .duration(1000)
      .style("opacity", 0)
      .remove();

/*
      //disable transitions
      function flushAllD3Transitions() {
        var now = Date.now;
        Date.now = function() { return Infinity; };
        d3.timer.flush();
        Date.now = now;
      }
*/
      function groupClick(d) {
        d3.event.preventDefault();
        d3.event.stopPropagation();
        addFilter(d._id);
        resetChords();
      }

      function chordMouseover(d) {
        d3.event.preventDefault();
        d3.event.stopPropagation();
        dimChords(d);
        updateSidebars(d);
      }

      function chordMouseout() {
        d3.event.preventDefault();
        d3.event.stopPropagation();
        resetChords();
      }

      function groupMouseover(d) {
        d3.event.preventDefault();
        d3.event.stopPropagation();
        dimChords(d);
        updateSidebars(d);
      }

      function groupMouseout() {
        d3.event.preventDefault();
        d3.event.stopPropagation();
        resetChords();
      }

      function resetChords() {
        d3.event.preventDefault();
        d3.event.stopPropagation();
        container.selectAll("path.chord").classed('faded', false);
        container.selectAll("path.chord").classed('highlight', false);
        updateSidebars();
      }

      function dimChords(d) {
        d3.event.preventDefault();
        d3.event.stopPropagation();
        container.selectAll("path.chord").classed('faded', function (p) {
          if (d.source) { // COMPARE CHORD IDS
            return (p._id === d._id) ? false : true;
          } else { // COMPARE GROUP IDS
            return (p.source._id === d._id || p.target._id === d._id) ? false : true;
          }
        });
        container.selectAll("path.chord").classed('highlight', function (p) {
          if (d.source) { // COMPARE CHORD IDS
            return (p._id === d._id) ? true : false;
          } else { // COMPARE GROUP IDS
            return (p.source._id === d._id || p.target._id === d._id) ? true : false;
          }
        });
      }
    }; // END DRAWCHORDS FUNCTION

    function normalize(amount) {
      return amount * (exRate || 1);
    }

    function addFilter(id) {
      filters[id] = true;
      $scope.update();
      updateFilters();
    }

    function removeFilter(id) {
      delete filters[id];
      updateFilters();
      $scope.update();
    }

    function updateFilters() {

      var filterList = Object.keys(filters);

      var list = sidebarLeft.select('.filters .list')
      .selectAll('.filter').data(filterList, function(d) { return d });

      var listEnter = list.enter().append('div')
      .attr('class','filter');

      sidebarLeft.select('.filters .title')
      .style('display','block');

      sidebarLeft.select('.filters .empty')
      .style('display', filterList.length ? 'none' : 'block');

      sidebarLeft.select('.filters .clear')
      .style('display', filterList.length > 1 ? 'block' : 'none');

      list.exit().remove();

      if (filterList.length) {

        listEnter.append('div')
        .attr('class', 'close')
        .text('x')
        .on('click', function(d) {
          removeFilter(d);
        });

        listEnter.append('div')
        .attr('class','name')
        .html(function(d) {
          var currency = d.split('.');
          return currency[0] + ' <div class="issuer">' +
            (currency[1] || '') + '</div>';
        });

      }
    }

    function updateSidebars(d) {
      var groupList = [];
      var total = 0;
      var count = 0;
      var nFormat = d3.format(',.8g');
      var commas = d3.format(',d');
      var currency;
      var groups;
      var group;
      var groupEnter;
      var components;

      chordData.forEach(function(chord) {
        total += chord.volume;
        count += chord.count;
      });

      sidebarLeft.select('.totals').html('');
      sidebarRight.select('.chord').html('');

      // currency pair
      if (d && d.source) {
        var chord;
        var el = sidebarRight.select('.chord');

        chordData.every(function(c) {
          if ((c.base === d.source._id && c.counter === d.target._id) ||
             (c.base === d.target._id && c.counter === d.source._id)) {
            chord = c;
            return false;
          }

          return true;
        });

        el.append('div').attr('class','pair').html(function() {
          var co1 = currencyOrder.indexOf(chord.base_currency);
          var co2 = currencyOrder.indexOf(chord.counter_currency);

          var c1 = '<div class="currency"><div class="code">';
          var c2 = '<div class="currency"><div class="code">';

          c1 += chord.base_currency + '</div>';
          c1 += chord.base_issuer ? '<div class="issuer">' +
            chord.base_issuer + '</div></div>' : '</div>';

          c2 += chord.counter_currency + '</div>';
          c2 += chord.counter_issuer ? '<div class="issuer">' +
            chord.counter_issuer + '</div></div>' : '</div>';

          if (co2 < co1) {
            return c2 + '<div class="sep">/</div>' + c1;
          } else {
            return c1 + '<div class="sep">/</div>' + c2;
          }
        });

        el.append('div').attr('class','volume')
        .html(nFormat(normalize(chord.volume)) + ' <span>'+ exCurrency +'</span>');
        el.append('div').attr('class','amount')
        .html(nFormat(chord.amount) + ' <span>' + chord.base_currency + '</span>');
        el.append('div').attr('class','percent')
        .html('<span>percent of total volume:</span> ' + (chord.volume/total*100).toFixed(2) + '%');
        el.append('div').attr('class','count')
        .html('<span># of exchanges:</span> ' + commas(chord.count));


      // currency group
      } else if (d) {
        group = {
          currency: d._id,
          chords: [],
          volume: 0,
          amount: 0,
          count: 0
        }

        group.chords = chordData.filter(function(chord) {
          return chord.base === d._id || chord.counter === d._id;
        });

        group.chords.forEach(function(chord) {
          group.volume += chord.volume;
          group.count += chord.count;
        })

        group.chords.sort(function(a, b) {
          return a.volume < b.volume ? 1 : -1;
        });

        //rate could be 0
        group.amount = xrpRates[group.currency] ?
          group.volume / xrpRates[group.currency] : 0
        groupList.push(group);

      // default display
      } else {

        var temp = {};
        chordData.forEach(function(chord) {
          if (!temp[chord.base]) {
            temp[chord.base] = {
              currency: chord.base,
              chords: [],
              volume: 0,
              amount: 0,
              count: 0
            }
          }

          if (!temp[chord.counter]) {
            temp[chord.counter] = {
              currency: chord.counter,
              chords: [],
              volume: 0,
              amount: 0,
              count: 0
            }
          }

          temp[chord.base].chords.push(chord);
          temp[chord.base].volume += chord.volume;
          temp[chord.base].count += chord.count;

          temp[chord.counter].chords.push(chord);
          temp[chord.counter].volume += chord.volume;
          temp[chord.counter].count += chord.count;
        });

        for (var key in temp) {
          //rate could be 0
          temp[key].amount = xrpRates[key] ?
            temp[key].volume / xrpRates[key] : 0;
          temp[key].chords.sort(function(a, b) {
            return a.volume < b.volume ? 1 : -1;
          });
          groupList.push(temp[key]);
        }

        groupList.sort(function(a, b) {
          return a.volume < b.volume ? 1 : -1;
        });
      }

      sidebarLeft.select('.totals').html('<table>' +
        '<tr><th>Total Volume:</th> ' +
        '<td>' + nFormat(normalize(total)) +
        ' ' + exCurrency + '</td></tr>' +
        '<tr><th># of Exchanges:</th> ' +
        '<td>' + commas(count) + '</td></tr>')
      .transition()
      .duration(500)
      .style('opacity', 1);

      groups = sidebarRight.select('.groups')
      .selectAll('.group')
      .data(groupList, function(d, i) {
        return i;
      });

      groupEnter = groups.enter().append('div')
      .attr('class','group')

      groupEnter.html('<div class="groupCurrency"></div>' +
        '<div class="groupVolume"></div>' +
        '<div class="groupAmount"></div>' +
        '<div class="more">pairs</div>' +
        '<div class="components"></div>')
      .style('opacity', 0).transition()
      .duration(function(d,i) {
        return 300 + i*70;
      })
      .style('opacity', 1);

      groupEnter.select('.more').on('click', function(d) {
        var table = d3.select(this.parentNode).select('.components table');
        if (table.classed('open')) {
          d3.select(this).text('pairs');
          table.classed('open', false);
        } else {
          d3.select(this).text('hide');
          table.classed('open', true);
        }
      });

      groupEnter.select('.components').append('table')
      .html('<tr><th></th>' +
        '<th>Volume</th>' +
        '<th>Pct. of Group</th>' +
        '<th>Pct. of Total</th></tr>');

      groups.select('.groupCurrency').html(function(d) {
        var currency = d.currency.split('.');
        return '<div class="currency">' + currency[0] +
          '</div><small class="issuer">' +
          (currency[1] || '') + '</small>';
      });

      groups.select('.groupVolume').html(function(d) {
        return nFormat(normalize(d.volume)) + ' <b>' + exCurrency + '</b>' +
          '<span class="right percent">(' + (d.volume/total*100).toFixed(2) + '%)</span>';
      });

      groups.select('.groupAmount').html(function(d) {
        var currency = d.currency.split('.');
        var amount = '';
        if (currency[0] !== exCurrency) {
          amount = nFormat(d.amount) + ' <b>' + currency[0] + '</b>';
        }
        return amount + '<span class="right"><b>count:</b> ' + commas(d.count) + '</span>';
      });

      groups.each(addComponents);

      groups.select('.components table')
      .classed('open' , groupList.length > 1 ? false : true);
      groups.select('.more')
      .style('display', groupList.length > 1 ? 'block' : 'none');

      groups.exit().remove();

      div.selectAll('.issuer:not(.checked)').each(function(d) {
        var el = d3.select(this);
        var issuer = el.text(); //.html doesnt work on safari for tspan
        if (issuer) {
          rippleName(issuer, function(name) {
            el.text(name || issuer)
            .classed('checked', true)
            .classed('named', name ? true : false);
          });
        }
      });

      function addComponents (d) {
        var volume = d.volume;
        var components = d3.select(this)
        .select('.components table')
        .selectAll('.component')
        .data(d.chords, function(d) {
          return d.base + d.counter;
        });

        var cEnter = components.enter()
        .append('tr')
        .attr('class', 'component')
        .html('<td></td><td></td>' +
          '<td class="percent-group"></td><td class="percent-total"></td>');

        components.select('td:nth-child(1)').html(function(d) {
          var co1 = currencyOrder.indexOf(d.base_currency);
          var co2 = currencyOrder.indexOf(d.counter_currency);

          var c1 = '<div class="currency"';
          var c2 = '<div class="currency"';

          c1 += d.base_issuer ? ' title="' + d.base_issuer + '">' : '>';
          c1 += d.base_currency + '</div>';

          c2 += d.counter_issuer ? ' title="' + d.counter_issuer + '">' : '>';
          c2 += d.counter_currency + '</div>';

          if (co2 < co1) {
            return '<td colspan="2">' + c2 + '/' + c1 + '</td>';
          } else {
            return '<td colspan="2">' + c1 + '/' + c2 + '</td>';
          }
        });


        components.select('td:nth-child(2)').html(function(d) {
          return nFormat(normalize(d.volume)) + ' <b>' + exCurrency + '</b>';
        });

        components.select('.percent-total').html(function(d) {
          return '<span>' + (d.volume/total*100).toFixed(2) + '%</span>';
        });

        components.select('.percent-group').html(function(d) {
          return '<span>' + (d.volume/volume*100).toFixed(2) + '%</span>';
        });

        components.exit().remove();
      }
    }

    function resize () {
      height = window.innerHeight - 160;
      width = $el[0].clientWidth;

      if (height < 320 || width < 320) {
        width = height = 320;
      } else if (width < height) {
        height = width;
      }

      dims[0] = width - marg[1] - marg[3]; // WIDTH
      dims[1] = height - marg[0] - marg[2]; // HEIGHT

      smallest = dims[0] < dims[1] ? dims[0] : dims[1];
      innerRadius = (smallest * 0.38);
      outerRadius = innerRadius + innerRadius * 1/20;

      x = (dims[0] / 2) + marg[3];
      y = (dims[1] / 2) + marg[0];

      arc = d3.svg.arc()
      .innerRadius(innerRadius)
      .outerRadius(outerRadius);

      path = d3.svg.chord()
      .radius(innerRadius);

      svg.attr({
        width: width,
        height: height,
        viewBox: "0 0 " + width + " " + height
      });

      div.attr('height', height);
      container.attr("transform", "translate(" + x + "," + y + ")");
      $scope.update(true);
    }

    resize();
    addResizeListener($el[0], resize);
  }; // END LINK FUNCTION

  return {
    link: link,
    restrict: 'EA'
  };
}]);
