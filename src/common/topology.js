var Topology = function ($http) {
  var self = this;
  var graph;

  self.fetch = function() {
    var url = API + '/network/topology';
    return new Promise(function(resolve, reject) {
        $http
        .get(url)
        .then(function(response) {
          if(typeof response.data === 'object') {
            return resolve(response.data);
          } else {
            return reject(response.data);
          }
        }, function(response) {
          return reject(response.data);
        });
    })
  },

  self.formatUptimes = function(nodes) {
    function format(time) {
      if (!time) return {name: '', time: -1};
      var seconds = time;
      var minutes = Math.floor(time / 60);
      seconds -= minutes * 60;
      var hours = Math.floor(minutes / 60);
      minutes -= hours * 60;
      var days = Math.floor(hours / 24);
      hours -= days * 24;
      var dayName = days + ' ' + 'Day' + (days > 1 ? 's' : '');
      var hourName = hours + ' ' + 'Hour' + (hours > 1 ? 's' : '');
      var minName = minutes + ' ' + 'min';
      var secName = seconds + ' ' + 'sec';

      if (days > 0) return { name: dayName, time: days * 60 * 60 * 24 };
      else if (hours > 0) return { name: hourName, time: hours * 60 * 60 };
      else if (minutes > 0) return { name: minName, time: minutes * 60 };
      else return { name: secName, time: seconds };
    }

    _.map(nodes, function(n) {
      var f = format(n.uptime);
      n.uptime_truncated = f.time;
      n.uptime_formatted = f.name;
    });
    return nodes;
  },

  self.sortByUptime = function(nodes) {
    nodes.sort(function(a, b) {
      var uptime_a = a.uptime || -1;
      var uptime_b = b.uptime || -1;
      if (uptime_b !== uptime_a) return uptime_b - uptime_a;
      return b.node_public_key > a.node_public_key ? 1 : -1;
    });
    return nodes;
  },

  self.mergeOldAndNew = function(newNodes, oldNodes) {
    var oldNodesByPubKey = {};
    _.each(oldNodes, function(item) {
      oldNodesByPubKey[item.new.node_public_key] = item.new;
    });
    var ret = _.map(newNodes, function(p) {
      return { new: p, old: oldNodesByPubKey[p.node_public_key]};
    });
    return ret;
  },

  self.animateChange = function(propertyArray) {
    function animate($element, oldValue, newValue) {
      var originalColor = '#999';
      var toColor = newValue > oldValue ? '#00FF00' : '#FF0000';
      $element.animate({'opacity': 0}, 0, function() {
        $element.html(newValue);
        $element.animate({'color': toColor, 'opacity': 1}, 600, function() {
          $element.animate({'color': originalColor}, 600);
        });
      }); 
    }

    _.each(propertyArray, function(prop) {
      var divs = $('div.' + prop);
      divs.each(function(index, div) {
        var $div = $(div);
        var ndiv = $div.attr('data-new');
        var odiv = $div.attr('data-old');
        if (ndiv !== odiv) {
          animate($div, odiv, ndiv);
        } else {
          $div.html(ndiv);
        }
      });
    });
  },

  self.versionToColor = function(version) {
    var blue = '#38b';
    var yellow = "#FDB34D";
    var red = "#c11";
    var color = "#FFFFFF";
    var LATEST_VERSION = 301;

    if (version) {
      var v_arr = version.split("-");
      var v_str = v_arr[1];
      var split = v_str.split('.');
      var v_num = parseInt(split[0] + split[1] + split[2], 10);
      if (v_num < LATEST_VERSION)
        color = red;
      else
        color = blue;
    }
    return color;
  },

  self.produce = function(data, options) {

    if (graph) {
      self.update(data);
      return;
    }

    graph = { };

    var width = options.width || 600;
    var height = options.height || 300;
    var linkDistance = options.linkDistance || (width + height) / 4;
    var charge = options.charge || 0 - (width + height) / 4;
    var chargeDistance = options.chargeDistance || charge / 10;

    graph.growth_factor = options.growth_factor || 0.5;

    graph.force = d3.layout.force()
      .nodes([])
      .links([])
      .charge(charge)
      .chargeDistance(chargeDistance)
      .linkDistance(linkDistance)
      .linkStrength(0.3)
      .friction(0.3)
      .gravity(1)
      .size([width, height])
      .on("tick", function() {
        graph.links.attr("x1", function(d) { return d.source.x; })
          .attr("y1", function(d) { return d.source.y; })
          .attr("x2", function(d) { return d.target.x; })
          .attr("y2", function(d) { return d.target.y; });

        graph.nodes.attr("cx", function(d) { return d.x; })
          .attr("cy", function(d) { return d.y; });
      });

    graph.svg = d3.select(options.element).append("svg")
      .attr("width", width)
      .attr("height", height)

    graph.linkGroup = graph.svg.append('g');
    graph.nodeGroup = graph.svg.append('g');
    graph.links = graph.linkGroup.selectAll(".topology-link");
    graph.nodes = graph.nodeGroup.selectAll(".topology-node");

    self.update(data);
  }

  function highlight() {
    var pubkey = d3.select(this).attr('pubkey');

    d3.selectAll('.' + pubkey)
    .classed('highlight', true);

    graph.nodeGroup.selectAll('.topology-node.' + pubkey)
    .transition()
    .style('fill-opacity', 0.9)
    .style('stroke-opacity', 0.8)
    .style('stroke-width', 3)
    .attr('r', function() {
      return d3.select(this).attr('_r') * 2;
    });

  }

  function unhighlight() {
    graph.nodeGroup.selectAll('.topology-node.highlight')
    .transition()
    .style('fill-opacity', 0.7)
    .style('stroke-opacity', 0.5)
    .style('stroke-width', 0.7)
    .attr('r', function(d) {
      return d3.select(this).attr('_r');
    });

    d3.selectAll('.topology-node')
    .classed('highlight', false);
    d3.selectAll('.topology-link')
    .classed('highlight', false);
  }

  function scrollTween(offset) {
    return function() {
      var y = window.pageYOffset || document.documentElement.scrollTop;
      var i = d3.interpolateNumber(y, offset);
      return function(t) {
        scrollTo(0, i(t));
      };
    };
  }

  self.update = function(data) {

    if (!graph) {
      return;
    }
    // builds reference array of sources and targets
    var edges = [];
    var nodes = graph.force.nodes();
    var nodesByPubkey = {};
    var drag;

    nodes.forEach(function(d) {
      d.keep = false;
      nodesByPubkey[d.node_public_key] = d;
    });

    data.nodes.forEach(function(d, i) {
      d.id = d.node_public_key;
      d.keep = true;

      if (nodesByPubkey[d.id]) {
        nodesByPubkey[d.id].keep = true;
      } else {
        nodesByPubkey[d.id] = d;
      }
    });

    nodes = []
    for (var key in nodesByPubkey) {
      if (nodesByPubkey[key].keep) {
        nodes.push(nodesByPubkey[key]);
      }
    }

    data.links.forEach(function(e) {
      var sourceNode = nodes.filter(function(n) {
        return n.id === e.source;
      })[0];

      var targetNode = nodes.filter(function(n) {
        return n.id === e.target;
      })[0];

      if (!sourceNode || !targetNode) {
        console.log(e, data.nodes);
      }

      edges.push({
        source: sourceNode,
        target: targetNode});
    });

    graph.force
      .nodes(nodes)
      .links(edges)
      .start();

    // allows dragged node to be fixed
    drag = graph.force.drag()
      .on("dragstart", function(d) {
      d.fixed = true;
    });

    graph.links = graph.links
      .data(edges, function(d) {
        return d.source.id + '|' +  d.target.id;
      });

    var link = graph.links.enter().append("line")
      .attr("class", function(d) {
        return [
          'topology-link',
          d.source.node_public_key,
          d.target.node_public_key
        ].join(' ')
      })
      .style('opacity', 0);

    link.transition()
      .delay(function(d, i) {
        return 1000 + 1 * i
      })
      .duration(500)
      .style('opacity', 1)

    graph.nodes = graph.nodes
      .data(nodes, function(d) {
        return d.id;
      });

    var node = graph.nodes.enter().append("circle")
      .attr("class", function(d) {
        return [
          'topology-node',
          d.node_public_key
        ].join(' ')
      })
      .style("fill", function(d) {
        return self.versionToColor(d.version);
      })
      .attr('r', 0)
      .style('opacity', 0)
      .call(drag);

    node.on('click', function(d) {
      var row = d3.select('#topology-table .' + d.id);
      var box = row.node().getBoundingClientRect();
      var header = d3.select('.header').node().getBoundingClientRect();
      var y = window.pageYOffset + box.top - header.bottom;

      d3.transition()
      .duration(500)
      .tween('scroll', scrollTween(y));
    });

    node.transition()
      .delay(function(d, i) {
        return 500 + 20 * i
      })
      .duration(1000)
      .style('opacity', 1);

    node.attr('pubkey', function(d) {
      return d.node_public_key;
    });

    node.append("title")
      .text(function(d) { return d.node_public_key; });

    d3.selectAll('.topology-node')
      .on('mouseover', highlight)
      .on('mouseout', unhighlight);

    graph.nodes.each(function(d) {
      var r = Number(d.inbound_count) + Number(d.outbound_count) ?
        Math.pow(Number(d.inbound_count) + Number(d.outbound_count), graph.growth_factor) + 2 : 2;

      d3.select(this)
      .attr('_r', r)
      //.transition()
      .attr('r', r);
    })


    graph.nodes.exit().remove();
    graph.links.exit().remove();
  }
}


var TopologyMap = function($http, topology) {
  var self = this;
  var t = topology;
  var svg, projection;

  self.fetch = function() {
    var url = API + '/network/topology/nodes?verbose=true';
    return new Promise(function(resolve, reject) {
        $http
        .get(url)
        .then(function(response) {
          if(typeof response.data === 'object') {
            return resolve(response.data);
          } else {
            return reject(response.data);
          }
        }, function(response) {
          return reject(response.data);
        });
    })
  }

  // draw the atlas
  self.draw = function(properties) {
    var w = properties.width, h = properties.height;

    // alternative options: stereographic, orthographic, equirectangular, albers, transverseMercator
    projection = d3.geo.mercator() 
        .center([0, 40])
        .scale(100)
        .translate([w/2, h/2-20]);

    var path = d3.geo.path().projection(projection);
    svg = d3.select(properties.element).append("svg")
            .attr("width", w)
            .attr("height", h)
            .append("g");

    d3.json("../src/app/topology/map.json", function(json) {
      // draw all of the countries
      svg.selectAll("path")
         .data(json["features"])
         .enter()
         .append("path")
         .attr("d", path);
    });
  }

  // populate the atlas with locations
  self.populate = function(nodeList) {
    // nodeList.forEach(function(node) {

    // });
    var x_offset = 80, y_offset = 300;

    var locations = svg.selectAll("circle")
      .data(nodeList)
      .enter()
      .append("circle")
      .attr("class", function(d) {
        return [
          'topology-node',
          d.node_public_key
        ].join(' ')
      })
      .attr("transform", function(d, i) {
        if(d.ip && d.lat <= 90 && d.lat >= -90 && d.long <= 180 && d.long >= -180) {
          // lat +90 to -90 long +180 to -180 constitute valid coords
          return "translate(" + projection([d.lat, d.long]) + ")";
        }
        return "translate(" + x_offset + "," + y_offset + ")"; 
      })
      .style("fill", function(d) {
        return t.versionToColor(d.version);
      })
      .attr("r", 2)
      .style("opacity", 1);

    locations.append("title")
      .text(function(d) { return d.node_public_key; });

  }

}

