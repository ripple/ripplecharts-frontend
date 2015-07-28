angular.module('rippleName', [])
.factory('rippleName', function($http) {
  var names = { };
  var reversed = { };
  var url = 'https://id.ripple.com/v1/user/';

  var getUser = function (text, callback) {
    var name;
    var address;

    //lookup by address
    if (text.length > 20) {
      address = text;
      if (names[address] && names[address] === '#pending') {

        setTimeout(function() {
          getUser(address, callback);
        }, 50);

      } else if (names[address] && names[address] === '#unknown') {
        callback();

      } else if (names[address]) {
        callback(names[address]);

      } else {
        names[address] = '#pending';
        $http.get(url + address)
        .success(function(resp) {
          if (resp.exists) {
            names[resp.address] = resp.username;
            reversed[resp.username] = resp.address;
            callback(resp.username);
          } else {
            names[address] = '#unknown';
            callback();
          }
        }).error(function(err) {
          names[address] = '#unknown';
          callback();
        });
      }

    //lookup by name
    } else if (text) {
      name = text;
      if (reversed[name] && reversed[name] === '#pending') {
        setTimeout(function() {
          getUser(name, callback);
        }, 50);

      } else if (reversed[name] === '#unknown') {
        callback();

      } else if (reversed[name]) {
        callback(reversed[name]);

      } else {
        $http.get(url + name)
        .success(function(resp) {
          if (resp.address) {
            names[resp.address] = resp.username;
            reversed[resp.username] = resp.address;
            callback(resp.address);
          } else {
            reversed[resp.username] = '#unknown';
            callback();
          }

        }).error(function(err) {
          console.log(err);
        });
      }

    } else {
      callback();
    }
  }

  return getUser;
});
