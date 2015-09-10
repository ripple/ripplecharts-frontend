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
    .then(function(resp) {
      var data;

      if (resp.data &&
          resp.data.links &&
          resp.data.links.length) {
        data = {
          name: getRef(nameRel, resp.data.links),
          address: getRef(addressRel, resp.data.links)
        };
      }

      callback(data);
    },
    function(resp) {
      if (resp.data && resp.status !== 404) {
        console.log(resp.data);
      }
      callback();
    });
  };

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
        cb(cache[comp].name, cache[comp].address);

      } else {
        cache[comp] = '#pending';
        lookupRequest(URL + comp, function(resp) {
          if (resp) {
            names[resp.address] = resp;
            reversed[resp.name] = resp;

            // include a link
            // for the name as it
            // originally came as well
            if (isName) {
              reversed[comp] = resp;
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
