var Topology = function ($http) {
  var self = this;

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
      var tds = $('td.' + prop);
      tds.each(function(index, td) {
        var $td = $(td);
        var nv = $td.attr('data-new');
        var ov = $td.attr('data-old');
        if (nv !== ov) {
          animate($td, ov, nv);
        } else {
          $td.html(nv);
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
    var width = options.width || 600;
    var height = options.height || 300;
    var linkDistance = options.linkDistance || (width + height) / 4;
    var charge = options.charge || 0 - (width + height) / 4;
    var chargeDistance = options.chargeDistance || charge / 10;
    var growth_factor = options.growth_factor || 0.5;

    var force = d3.layout.force()
        .charge(charge)
        .chargeDistance(chargeDistance)
        .linkDistance(linkDistance)
        .linkStrength(0.3)
        .friction(0.3)
        .gravity(1)
        //.theta(options.theta)
        //.alpha(options.alpha)
        .size([width, height]);

    var svg = d3.select(options.element).append("svg")
        .attr("width", width)
        .attr("height", height)

    var linkGroup = svg.append('g');
    var nodeGroup = svg.append('g');

    // builds reference array of sources and targets
    var edges = [];

    data.links.forEach(function(e) {
      var sourceNode = data.nodes.filter(function(n) {
        return n.node_public_key === e.source;
      })[0];

      var targetNode = data.nodes.filter(function(n) {
        return n.node_public_key === e.target;
      })[0];

      if (!sourceNode || !targetNode) {
        console.log(e, data.nodes);
      }

      edges.push({
        source: sourceNode,
        target: targetNode});
    });

    // allows dragged node to be fixed
    var drag = force.drag()
        .on("dragstart", dragstart);
    function dragstart(d) {
      d.fixed = true;
    }

    force
        .nodes(data.nodes)
        .links(edges)
        .start();

    var link = linkGroup.selectAll(".topology-link")
        .data(edges)
        .enter().append("line")
        .attr("class", "topology-link")
        .style('opacity', 0);

        link.transition()
        .delay(function(d, i) {
          return 1000 + 1 * i
        })
        .duration(500)
        .style('opacity', 1)

    var node = nodeGroup.selectAll(".topology-node")
        .data(data.nodes)
        .enter().append("circle")
        .attr("class", "topology-node")
        .attr("r", function(d) {
          return Number(d.inbound_count) + Number(d.outbound_count) ?
            Math.pow(Number(d.inbound_count) + Number(d.outbound_count), growth_factor) + 2 : 2;
        })
        .style("fill", function(d) { return self.versionToColor(d.version); })
        .style('opacity', 0)
        .call(drag);


      node.transition()
        .delay(function(d, i) {
          return 500 + 20 * i
        })
        .duration(1000)
        .style('opacity', 1)

    node.append("title")
        .text(function(d) { return d.node_public_key; });

    force.on("tick", function() {
      link.attr("x1", function(d) { return d.source.x; })
          .attr("y1", function(d) { return d.source.y; })
          .attr("x2", function(d) { return d.target.x; })
          .attr("y2", function(d) { return d.target.y; });

      node.attr("cx", function(d) { return d.x; })
          .attr("cy", function(d) { return d.y; });
    });
  }
}
