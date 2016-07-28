var Topology = function ($http) {
  var self = this;
  var cScale = d3.scale.linear().range([1,10]);
  var uScale = d3.scale.linear().range([1,10]);
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

  self.produce = function(options) {

    graph = { };
    var div = d3.select(options.element);

    var width = div.node().getBoundingClientRect().width;
    var height = div.node().getBoundingClientRect().height;
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

    graph.svg = div.append("svg")
      .attr("width", width)
      .attr("height", height)

    graph.linkGroup = graph.svg.append('g');
    graph.nodeGroup = graph.svg.append('g');
    graph.links = graph.linkGroup.selectAll(".topology-link");
    graph.nodes = graph.nodeGroup.selectAll(".topology-node");
  }

  function highlight() {
    // console.log("HIGHLIGHT");
    var pubkey = d3.select(this).attr('pubkey');
    d3.selectAll('.' + pubkey)
    .classed('highlight', true);

    d3.selectAll('.topology-node.' + pubkey)
      .transition()
      .style('fill-opacity', 0.9)
      .style('stroke-opacity', 0.8)
      .attr('r', function() {
        return d3.select(this).attr('_r') * 2;
      });

  }

  function unhighlight() {
    // console.log("UNHIGHLIGHT");
    d3.selectAll('.topology-node.highlight')
      .transition()
      .style('fill-opacity', 0.7)
      .style('stroke-opacity', 0.5)
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


    var extent = d3.extent(data.nodes, function(d) {
      d.connections = Number(d.inbound_count || 0)  + Number(d.outbound_count || 0);
      return d.connections;
    });

    cScale.domain(extent);

    extent = d3.extent(data.nodes, function(d) {
      return d.uptime;
    });

    uScale.domain(extent);

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
        return 1000 + 1 * i;
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
          'graph-node',
          d.node_public_key
        ].join(' ')
      })
      .attr('r', 0)
      .style('opacity', 0)
      .call(drag);

    d3.selectAll('circle').on('click', function(d) {
      var row = d3.select('#topology-table .' + d.node_public_key);
      var box = row.node().getBoundingClientRect();

      var header = d3.select('.header').node().getBoundingClientRect();

      var y = window.pageYOffset + box.top - header.bottom;

      d3.transition()
      .duration(500)
      .tween('scroll', scrollTween(y));
    });

    node.transition()
      .delay(function(d, i) {
        return 500 + 20 * i;
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

    graph.nodes.exit().remove();
    graph.links.exit().remove();
  }

  // changes the weight of graph nodes from uptime to connections (or vice versa)
  this.weight = function(weight_by) {
    d3.selectAll("circle.graph-node").each(function(d) {

      var node = d3.select(this);
      var scale = weight_by === 'uptime' ? uScale : cScale;
      var value = weight_by === 'uptime' ?
          d.uptime : d.connections;

      var r = scale(value);
      node
        .attr('_r', r)
        .transition('radius')
        .duration(500)
        .attr('r', r)
    });
  }

  this.color = function(versionColor) {
    d3.selectAll("circle.graph-node").each(function(d) {
      d3.select(this)
      .style('fill', versionColor(d.version));
    });
  }
}


var TopologyMap = function($http, topology) {
  var self = this;
  var t = topology;
  var parent, svg, nodes, countries, projection, w, h;
  var cScale = d3.scale.linear().range([1,8]);
  var uScale = d3.scale.linear().range([1,8]);
  var locations;

  var zoom = d3.behavior.zoom()
  .scaleExtent([1, 100])
  .on("zoom", function() {
    var e = d3.event,
        tx = Math.min(0, Math.max(e.translate[0], w - w * e.scale)),
        ty = Math.min(0, Math.max(e.translate[1], h - h * e.scale));
    zoom.translate([tx, ty]);
    svg.attr("transform", [
      "translate(" + [tx, ty] + ")",
      "scale(" + e.scale + ")"
      ].join(" "));

      svg.selectAll("circle")
      .attr("transform", function(){
        var trans = d3.transform(d3.select(this).attr("transform"));
        return "translate(" + trans.translate[0] + "," + trans.translate[1] + ")scale(" + 1/e.scale + ")";
      })
      .attr("_r", function(){
        // only update _r if the node isn't highlighted
        // prevents node size from being stuck if the user zooms while highlighting a node
        var is_highlighted = d3.select(this).attr("class").indexOf("highlight") > -1;

        return is_highlighted ? d3.select(this).attr("_r") : d3.select(this).attr("r");
      });
  });

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

  // if the node has an invalid/unknown location, then place it in the appropriate zone
  // this function generates the x and y offsets so that those nodes are placed in neat rows and cols
  function get_offset(invalid_count) {
    var x_dim = 10, y_dim = 12, x_offset = 10, y_offset = h-25; // 420

    // variable for which column the node should be placed in
    var placement = x_dim * invalid_count;
    // if the node placement is beyond the edge of the box, then go to the next row
    var row = Math.floor(placement / w);

    // start in the first column if the node is placed in the next row
    x_offset = placement >= w ? x_offset + placement % w : placement;

    y_offset += row * y_dim;

    return {x: x_offset, y: y_offset};
  }

  // draw the atlas
  self.draw = function(properties) {
    var div = d3.select(properties.element);

    w = div.node().getBoundingClientRect().width;
    h = div.node().getBoundingClientRect().height;

    // alternative options: stereographic, orthographic (globe), equirectangular, albers, transverseMercator
    projection = d3.geo.mercator()
        .center([0, 35])
        .scale(w/6.25)
        .translate([w/2-3, h/2-37]);

    var path = d3.geo.path().projection(projection);

    parent = div.append("svg")
      .attr("width", w)
      .attr("height", h)
      .append("g");

    // intermediate layer so that dragging is smooth
    // see: http://stackoverflow.com/questions/10988445/d3-behavior-zoom-jitters-shakes-jumps-and-bounces-when-dragging
    svg = parent.append("g");
    countries = svg.append("g").attr("class", "countries");
    nodes = svg.append("g").attr("class", "nodes");

    // transparent rectangle so click to drag works on the entire map, not just the land
    nodes.append("rect")
       .attr("x", 0)
       .attr("y", 0)
       .attr("width", w)
       .attr("height", h);

    // dividing line for the unknown/invalid ip zone
    nodes.append("line")
       .attr("x1", 0)
       .attr("y1", h-35)
       .attr("x2", w)
       .attr("y2", h-35); // 410

    // label for unknown/invalid ip zone
    nodes.append("text")
       .attr("x", 7)
       .attr("y", h-42) // 403
       .text("Unknown Location");

    // draw all of the countries
    d3.json("assets/map.json", function(json) {
      countries.selectAll("path")
         .data(json["features"])
         .enter()
         .append("path")
         .attr("d", path);
    });

  }

  // populate the atlas with locations
  self.populate = function(node_list) {

    // running tally of the number of nodes with invalid locations
    var invalid_count = 0;
    var extent = d3.extent(node_list, function(d) {
      d.connections = Number(d.inbound_count || 0)  + Number(d.outbound_count || 0);
      return d.connections;
    });

    cScale.domain(extent);

    extent = d3.extent(node_list, function(d) {
      return d.uptime;
    });

    uScale.domain(extent);

    locations = nodes.selectAll("circle")
      .data(node_list);

    locations.enter()
      .append("circle")
      .attr("class", function(d) {
        return [
          'topology-node',
          'map-node',
          d.node_public_key
        ].join(' ')
      })
      .attr('opacity', 1)
      .attr('r', 0)
      .attr('pubkey', function(d) {
        return d.node_public_key;
      });

    locations.enter()
      .append("title")
      .text(function(d) {
      return d.node_public_key;
    });

    nodes.selectAll("circle")
      .attr("transform", function(d, i) {

        // only place on the map if the ip exists
        if(d.ip && d.lat && d.long) {
          return "translate(" + projection([d.long, d.lat]) + ")";
        }

        // if there is no location, then place the node in the invalid zone
        invalid_count++;
        var o = get_offset(invalid_count);
        return "translate(" + o.x + "," + o.y + ")";
      });

    locations.exit()
    .transition()
    .duration(1000)
    .attr('r', 0)
    .remove();

    // enables zooming behavior
    parent.call(zoom);
  }


  this.color = function(versionColor) {
    d3.selectAll("circle.map-node").each(function(d) {
      d3.select(this)
      .style('fill', versionColor(d.version));
    });
  }

  // changes the weight of map nodes from uptime to connections (or vice versa)
  this.weight = function(weight_by) {
    d3.selectAll("circle.map-node").each(function(d) {
      var node = d3.select(this);
      var scale = weight_by === 'uptime' ? uScale : cScale;
      var value = weight_by === 'uptime' ?
          d.uptime : d.connections;

      var r = scale(value);
      node.transition()
        .duration(500)
        .attr('r', r)
        .attr('_r', r);
    });
  }
}
