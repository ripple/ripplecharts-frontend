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

  self.produce = function(data, element, height, width, charge, link_distance, growth_factor) {
    function versionToColor(version) {
      var green = "#4890CE";
      var yellow = "#FDB34D";
      var red = "#C0464B";
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
          color = green;
      }
      return color;
    }

    var color = d3.scale.category20();

    var force = d3.layout.force()
        .charge(charge)
        .linkDistance(link_distance)
        .size([width, height]);

    var svg = d3.select(element).append("svg")
        .attr("width", width)
        .attr("height", height)

    // builds reference array of sources and targets
    var edges = [];
    data.links.forEach(function(e) {
      var sourceNode = data.nodes.filter(function(n) { return n.node_public_key === e.source; })[0],
        targetNode = data.nodes.filter(function(n) { return n.node_public_key === e.target; })[0];
      edges.push({source: sourceNode, target: targetNode});
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

    var link = svg.selectAll(".topology-link")
        .data(edges)
        .enter().append("line")
        .attr("class", "topology-link");

    var node = svg.selectAll(".topology-node")
        .data(data.nodes)
        .enter().append("circle")
        .attr("class", "topology-node")
        .attr("r", function(d) { return parseInt(d.inbound_count, 10) + parseInt(d.outbound_count, 10) ? Math.pow(parseInt(d.inbound_count,10) + parseInt(d.outbound_count,10), growth_factor) + 1 : 1;})
        .style("fill", function(d) { return versionToColor(d.version); })
        .call(drag);

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
