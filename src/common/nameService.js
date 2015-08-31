angular.module('rippleName', [])
.factory('rippleName', function($http) {
  var names = { };
  var reversed = { };
  var URL = 'https://id.ripple.com/.well-known/webfinger?resource=';
  var addressRel = 'https://ripple.com/rel/ripple-address';
  var nameRel = 'https://ripple.com/rel/ripple-name';

  /**
   * getRef
   * get value for relational
   */

  var getRef = function (rel, links) {
    var ref;
    links.every(function(link) {
      if (link.rel !== rel) {
        return true;
      }

      ref = link.href;
      return false;
    });

    return ref;
  };

  var lookupRequest = function (url, callback) {
    $http.get(url)
    .success(function(resp) {
      var data;

      if (resp.links && resp.links.length) {
        data = {
          name: getRef(nameRel, resp.links),
          address: getRef(addressRel, resp.links)
        };
      }

      callback(data);
    }).error(function(err) {
      console.log(err);
      callback();
    });
  }

  /**
   * lookup
   * lookup name/address
   */

  var lookup = function (text, callback) {
    var type;
    var name;
    var address;

    // by address NOTE: should validate ripple address
    if (text && text.length > 20) {
      lookupHelper(text, names, callback);
    } else if (text) {
      lookupHelper(text, reversed, callback, true);
    }

    // handle lookup
    function lookupHelper (comp, cache, cb, isName) {
      if (cache[comp] && cache[comp] === '#pending') {

        setTimeout(function() {
          lookup(comp, cb);
        }, 50);

      } else if (cache[comp] && cache[comp] === '#unknown') {
        cb();

      } else if (cache[comp]) {
        cb(cache[comp]);

      } else {
        cache[comp] = '#pending';
        lookupRequest(URL + comp, function(resp) {
          if (resp) {
            names[resp.address] = resp.name;
            reversed[resp.name] = resp.address;

            // include a link
            // for the name as it
            // originally came as well
            if (isName) {
              reversed[comp] = resp.address;
            }

            cb(resp.name, resp.address);

          } else {
            cache[comp] = '#unknown';
            cb();
          }
        });
      }
    }
  }

  return lookup;
});
