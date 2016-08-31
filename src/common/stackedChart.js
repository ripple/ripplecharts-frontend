var StackedChart = function (options) {
  var self = this;
  var wrap = options.div;
  var div;
  var svg;
  var svgEnter;
  var g;
  var status;
  var details;
  var background;
  var hover;
  var loader;
  var axisX;
  var axisY;
  var label;

  var xAxis = d3.svg.axis().scale(xScale).orient('bottom');
  var yAxis = d3.svg.axis().scale(yScale).orient('right').tickFormat(d3.format('s'));
  var xScale = d3.time.scale().nice();
  var yScale = d3.scale.linear().nice();
  var color = options.color || d3.scale.category20();

  var area = d3.svg.area()
  .interpolate('monotone')
  .x(function(d) {
    return xScale(d.date);
  })
  .y0(function(d) {
    return yScale(d.y0);
  })
  .y1(function(d) {
    return yScale(d.y0 + d.y);
  });

  var stack = d3.layout.stack().values(function(d) {
    return d.values;
  });

  if (!wrap) {
    wrap = d3.select('body').append('div');
  }

  div = wrap.append('div').attr('class','stackedChart');

  if (!options.margin) options.margin = {top: 10, right: 60, bottom: 20, left: 60};
  if (!options.width)  options.width  = parseInt(div.style('width'), 10) - options.margin.left - options.margin.right;
  if (!options.height) options.height = options.width/2.25>400 ? options.width/2.25 : 400;

  self.lineData = [];
  self.interval = null;
  self.loading  = false;

  function drawChart () {

    div.html('');
    svg = div.append('svg')
      .attr('width', options.width + options.margin.left + options.margin.right)
      .attr('height', options.height + options.margin.top + options.margin.bottom);

    g = svg.append('g')
    .attr("transform", "translate(" +
          options.margin.left +
          "," + options.margin.top +
          ")");

    status  = div.append('h4')
      .attr('class', 'status')
      .style('opacity', 0);

    details = div.append('div')
      .attr('class', 'details')
      .style({
        top: options.margin.top + 'px',
        left: options.margin.left + 'px',
        opacity: 0
      });

    background = svg.append('rect')
      .attr('class', 'background')
      .attr('x', options.margin.left)
      .attr('y', options.margin.top)
      .attr('height', options.height)
      .attr('width', options.width);

    hover = svg.append('line')
      .attr('class', 'hover')
      .attr('y1', options.margin.top)
      .attr('y2', options.height + options.margin.top)
      .style('opacity', 0);

    loader = div.append('img')
      .attr('class', 'loader')
      .attr('src', 'assets/images/rippleThrobber.png');

    axisX = svg.append("g").attr("class", "x axis");
    axisY = svg.append("g").attr("class", "y axis");

    axisX.attr("transform", "translate("+ options.margin.left +
               "," + (options.height + options.margin.top) +
               ")");

    axisY.attr("transform", "translate(" +
               (options.width + options.margin.left) +
               "," + options.margin.top +
               ")");

    xScale.range([0, options.width])
    yScale.range([options.height, 0]);

    label = axisY.append("text")
    .attr("class", "title")
    .text(options.title)
    .attr("transform", "rotate(-90)")
    .attr("y", -5)
    .attr("x", -5)
    .attr('text-anchor', 'end')

    if (!self.loading) {
      loader.style('opacity', 0);
    }
  }

  function setStatus (string) {
    status.html(string);
    if (string) {
      self.loading  = false;
      loader.transition().style('opacity', 0);
      svg.transition().style('opacity', 0.3);
    } else {
      svg.style('opacity', 1);
    }
  }

  function drawData() {
    var data;
    var sections;
    var xExtent;
    var yExtent;

    if (!self.data) {
      return;
    }

    xScale.range([0, options.width])
    yScale.range([options.height, 0]);

    setStatus('');
    loader.transition().style('opacity', 0);
    color.domain(Object.keys(self.data));

    data = stack(color.domain().map(function(name) {
      return {
        name: name,
        values: self.data[name]
      }
    }));

    sections = stack(data);
    xExtent = d3.extent(data[0].values, function(d) {
      return d.date;
    });

    yExtent = [0, d3.max(data, function(d) {
        return d3.max(d.values, function(v) {
          return v.y + v.y0;
        }) * 1.1;
      })
    ];

    xScale.domain(xExtent);
    yScale.domain(yExtent);

    var section = g.selectAll('g.section')
    .data(sections);

    section.enter().append('g')
    .attr('class','section');

    section.exit().remove();

    var path = section.selectAll('path')
    .data(function(d) {
      return[d];
    });

    path.enter().append('path')
    .style('fill', function(d) {
      return color(d.name);
    })
    .style('stroke', function(d) {
      return color(d.name);
    });

    path.transition()
    .attr({
      class: 'area',
      d: function(d) {
        return area(d.values);
      }
    });

    path.exit().remove();

    var ticks = options.width / 60 - (options.width / 60 ) % 2;

    axisX.transition().call(xAxis.ticks(ticks).scale(xScale));
    axisY.transition().call(yAxis.scale(yScale));


    function mousemove() {

      var mouse = d3.mouse(this);
      var date = xScale.invert(mouse[0] - options.margin.left);
      var i = d3.bisect(self.byDate.map(function(d) {return moment(d.date)}), date);
      var d0 = i > 0 ? self.byDate[i-1] : null;
      var d = self.byDate[i];

      // determine which is closest
      if (d0 && !d) {
        d = d0;
      } else if (d0) {
        var first = moment.utc(d0.date);
        var second = moment.utc(d.date);
        var check = moment.utc(date);

        if (first.unix() - check.unix() >
            check.unix() - second.unix()) {
          d = d0;
        }
      }

      var tx = xScale(date) + options.margin.left;
      var data;

      if (tx < options.margin.left ||
         tx > options.margin.left + options.width ||
         mouse[1] < options.margin.top ||
         mouse[1] > options.margin.top + options.height) {
        hover.style('opacity', 0);
        details.style('opacity', 0);

      } else {
        data = Object.keys(d.data).map(function(key) {
          return {
            key: key,
            value: d.data[key]
          };
        });

        hover.style('opacity', 1)
        .attr('transform', 'translate(' + tx + ')');


        details.html('')
        .append('h5')
        .html(moment.utc(d.date).format(options.dateFormat || 'YYYY-MM-DD'));

        var rows = details.selectAll('tr')
        .data(data).enter().append('tr')
        .style('display', function(d) {
          return d.value ? 'table-row' : 'none';
        });

        rows.append('th')
        .append('div')
        .attr('class', 'box')
        .style('background-color', function(d) {
          return color(d.key);
        })

        rows.append('th').html(function(d) {
          return options.formatLabel ?
            options.formatLabel(d.key) : d.key;
        });

        rows.append('td').html(function(d) {
          return options.formatValue ?
            options.formatValue(d.value) : commas(d.value);
        });



        details.style('opacity', 1);
      }
    }

    svg.on('mousemove.hover', mousemove);
  }

  this.setStatus = function (string) {
    status.html(string).style('opacity',1);
    loader.transition().style('opacity',0);
  }

  this.fadeOut = function () {
    svg.transition().duration(100).style('opacity', 0);
    svg.on('mousemove.hover', '');
    details.style('opacity', 0);
    status.style('opacity', 0);
    div.selectAll('.hover').style('opacity', 0);
    div.selectAll('.details').style('opacity',0);
    if (self.loading) loader.style('opacity',1);
  }


  this.redraw = function (data) {
    self.data = data;
    self.byDate = {};

    for (var key in data) {
      data[key].forEach(function(d) {
        var date = d.date.format();
        if (!self.byDate[date]) {
          self.byDate[date] = {};
        }

        self.byDate[date][key] = d.y;
      });
    }

    self.byDate = Object.keys(self.byDate).map(function(date) {
      return {
        date: date,
        data: self.byDate[date]
      };
    });

    drawData();
  }

  this.suspend = function() {}

  function resizeChart () {
    old = options.width;
    w   = parseInt(div.style('width'), 10);

    if (!w) return;

    options.width  = w-options.margin.left - options.margin.right;
    options.height = options.width/2.25>400 ? options.width/2.25 : 400;

    if (old != options.width) {
      drawChart();
      drawData();
    }
  }

  drawChart();
  if (options.resize) {
    addResizeListener(wrap.node(), resizeChart);
  }
};
