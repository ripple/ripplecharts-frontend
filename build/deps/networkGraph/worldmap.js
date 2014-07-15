function WorldMap(mapContainer, detailsContainer, width, height, geography, circleAttributes, dataSourceUrl) {
	var wm = {};
	
	function htmlIDFormat(string) {
		return "_"+string.replace(/\./g,"_");
	}
	
	var projection = d3.geo.equirectangular().center([0,5]).scale(150).rotate([-10,0]);
	var svg = mapContainer.append("svg").attr({width:width, height:height});
	var path = d3.geo.path().projection(projection);
	svg.append("g").attr("class","geography").selectAll("path").data(geography).enter().append("path").attr("d", path);
	var linkContainer = svg.append("g").attr("id","serverlinks");
	var circleContainer = svg.append("g");
	
	var locations = [];
	var locationNameExists = {};
	
	function drawCircles(mapContainer2, cssClass, idPrefix) {
		return mapContainer2.selectAll("circle."+cssClass).data(locations).enter().append("circle")
			.attr(circleAttributes)
			.attr({
				"stroke":"none","fill":"none","class":cssClass, //stroke=none
				"id":function(loc){
					return idPrefix+htmlIDFormat(loc.name)
				},
				"cx":function(loc){
					return loc.coords.x;
				},
				"cy":function(loc){
					return loc.coords.y;
				}
			});
	}
	
	var ipData = {};
	// Request data about a given IP address, including longitude/latitude.
	// (Don't do anything if the request is already pending/complete.)
	// When you get the data back, add a circle to the map, and update the ipData object
	// to include the new data.
	wm.addIpAddress = function(ip) {
		if (!ipData[ip]) {
			ipData[ip] = {};
			$.get(dataSourceUrl+ip, function(response){
				response = JSON.parse(response);
				if (response.status === "success") {
					ipData[ip] = response;
					addLocationToMap(response);
				}
			});
		}
	}
	
	// Hexagonal geometry / location fudging:
	function spokeVector(sideNumber) {
		var s = Math.sqrt(3)/2;
		switch (sideNumber%6) {
			case 0: return [-s, 0.5];
			case 1: return [0, 1];
			case 2: return [s, 0.5];
			case 3: return [s, -0.5];
			case 4: return [0, -1];
			case 5: return [-s, -0.5];
		}
	}
	function times(scalar, vector) {
		return [scalar*vector[0], scalar*vector[1]];
	}
	function plus(vector1, vector2) {
		return [vector1[0]+vector2[0], vector1[1]+vector2[1]];
	}
	var hexagonalOffset = (function() { var memo={}; return function(n) {
		if (memo[n]) {
			return memo[n];
		}
		var coord;
		var ringNumber = Math.ceil((Math.sqrt(12*n+9)-3)/6);
		if (ringNumber === 0) {
			coord = [0,0];
		} else if (ringNumber === 1) {
			coord = spokeVector(n);
		} else {
			var perimeter = 6 * ringNumber;
			var pointNumber = n - 3*(ringNumber-1)*ringNumber - 1;
			var positionNumber = (pointNumber+1) % ringNumber;
			var sideNumber = Math.floor(((pointNumber+1) % perimeter)/ringNumber);
			coord = plus(
				times(ringNumber, spokeVector(sideNumber)),
				times(positionNumber, spokeVector(sideNumber+2))
			);
		}
		memo[n] = coord;
		return coord;
	}})();
	function isTooClose(loc, minDistance) {
		var len = locations.length;
		for (var i=0; i<locations.length; i++) {
			var otherLoc = locations[i];
			var distance = Math.sqrt(
				Math.pow(loc.latitude - otherLoc.latitude,2) + 
				Math.pow(loc.longitude - otherLoc.longitude,2)
			);
			if (distance < minDistance) {
				return true;
			}
		}
		return false;
	}
	function fudgeLocation(loc) {
		var MIN_DISTANCE = 5;
		var fudged = {
			longitude: loc.longitude,
			latitude: loc.latitude
		};
		var increment = 1;
		while (isTooClose(fudged, MIN_DISTANCE-0.5)) {
			var offset = hexagonalOffset(increment);
			fudged = {
				longitude: loc.longitude + offset[0]*MIN_DISTANCE,
				latitude: loc.latitude + offset[1]*MIN_DISTANCE
			};
			increment++;
		}
		return fudged;
	}
	
	
	// Details for each point on hover
	var detailsLocked = false;
	mapContainer.on("click", function(){
		detailsLocked = false;
		detailsContainer.style("border","1px solid transparent").style("display","none");
	});
	detailsContainer.on("click", function(){
		d3.event.stopPropagation();
	});
	function setDetails(details) {
		detailsContainer.select(".ipaddress").text(details.query);
		detailsContainer.select(".company").text(details.isp);
		var cityText = [
			details.city,
			details.region,
			details.region ? details.country_code : details.country
		].filter(function(x){return x});
		detailsContainer.select(".city").text(cityText.join(", "));
		detailsContainer.style("display","block");
	}
	

	// data = object of the kind returned from the IP address information request
	function addLocationToMap(data) {
		var loc = fudgeLocation({
			latitude: parseFloat(data.lat),
			longitude: parseFloat(data.lon)
		});
		loc.name = data.query;
		loc.details = data;
		var projected = projection.valueOf()([loc.longitude, loc.latitude]);
		loc.coords = {
			x: projected[0],
			y: projected[1]
		};
		locations.push(loc);
		drawCircles(circleContainer, "flashercircle", "flasher");
		drawCircles(circleContainer, "servercircle", "").style("cursor","pointer")
		.on("mouseover", function(d){
			if (!detailsLocked) {
				setDetails(d.details);
			}
		}).on("mouseout", function() {
			if (!detailsLocked) {
				detailsContainer.style("display","none");
			}
		}).on("click", function(d) {
			setDetails(d.details);
			detailsLocked = true;
			detailsContainer.style("border","1px dotted gray");
			d3.event.stopPropagation();
		});
		
		//draw the paths
		var source = htmlIDFormat(loc.name);
		for (var i=0; i<locations.length-1; i++) {
			var toLoc = locations[i];
			var target = htmlIDFormat(toLoc.name);
			var arc = {
				type: "LineString",
				coordinates: [
					[loc.longitude,   loc.latitude  ],
					[toLoc.longitude, toLoc.latitude]
				]
			};
			linkContainer.append("path").datum(arc).attr({
				d:path, "class":"serverlink",
				source:source, target:target,
				stroke:"none", "stroke-width":0.25,
				opacity:1, fill:"none"
			});
		}
	};
	
	
	// We want this to do nothing if the circle isn't on the map yet.
	wm.flashCircle = function(name, hash, coloringFunction) {
		var circleID = htmlIDFormat(name);
		if ($("#"+circleID).length) {
			var ANIMATION_DURATION = 800;
			var color = coloringFunction(hash);
			flashCircle(circleID, hash, color, ANIMATION_DURATION);
			eraseLinks(circleID);
			drawLinks(circleID);
		} /*else {
			console.log("No such server as", name);
		}*/
	};
	function flashCircle(circleID, hash, color, animationDuration) {
		var circle = circleContainer.select("#"+circleID);
		var flasher = circleContainer.select("#flasher"+circleID);
		circle.attr({
			hash:hash,
			stroke:color,
			fill:"transparent"
		});
		flasher.attr(circleAttributes).attr("stroke",color);
    flasher.classed("rippling", true);
    setTimeout(function(){
      flasher.classed("rippling", false);
    }, 800);
    
		/*flasher.transition().ease("linear").duration(animationDuration).attr({
			r: 300,
			opacity: 0,
			"stroke-width":0
		});*/
	}
	// Draw a line from this circle to all others with the same ledger hash
	function drawLinks(circleID) {
		var circle = circleContainer.select("#"+circleID);
		var color = circle.attr("stroke");
		var hash = circle.attr("hash");
		var targets = circleContainer.selectAll(".servercircle").filter(function(){
			return $(this).attr("id")!==circleID && $(this).attr("hash")===hash;
		})[0];
		var targetIDs = [];
		targets.forEach(function(target){
			targetIDs.push($(target).attr("id"));
		});
		var involvedLinks = linkContainer.selectAll(".serverlink").filter(function(){
			return $(this).attr("source")===circleID && targetIDs.indexOf($(this).attr("target"))!==-1 ||
				$(this).attr("target")===circleID && targetIDs.indexOf($(this).attr("source"))!==-1;
		});
		involvedLinks.attr({stroke:color, hash:hash});
	}
	// Erase all links to and from this circle
	function eraseLinks(circleID) {
		var involvedLinks = linkContainer.selectAll(".serverlink").filter(function(){
			return $(this).attr("source")===circleID ||
				$(this).attr("target")===circleID;
		});
		involvedLinks.attr("stroke","none");
	}
	
	
	return wm;
}