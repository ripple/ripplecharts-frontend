ApiHandler = function (url) {
  var self = this;
  
  self.url = url;
  
  function apiRequest (route) {
    var request = d3.xhr(self.url+"/"+route);
    request.header("Content-type","application/x-www-form-urlencoded");
    return request;
  }
  
  this.offersExercised = function (params, load, error) {
    var request = apiRequest("offersExercised");
    
    request.post(parseParams(params))
      .on('load', function(xhr){
        var response = JSON.parse(xhr.response), data = [];   

        if (response.length>1) {
          if (params.reduce===false) {
            data = response.map(function(d) {
              d = JSON.parse(d);
              return {
                id     : d.id,
                time   : moment.utc(d.key.slice(2)),
                amount : d.value[1],
                price  : d.value[2],        
                type   : ''
              }
            });
            
            var prev = null;
            for (var i=data.length; i>-1; i--) {
              if (prev && prev.price>data[i].price)      data[i].type = 'bid';
              else if (prev && prev.price<data[i].price) data[i].type = 'ask';
              else if (prev)                             data[i].type = prev.type;
              prev = data[i];
            }
            
                     
          } else {
            response.splice(0,1); //remove first   
            
            //remove null row, if we get one 
            if (response.length==1 && !response[0][1]) response.shift();
            
            data = response.map(function(d) {
              return {
                time   : moment.utc(d[0]),
                open   : d[4],
                close  : d[5],
                high   : d[6],
                low    : d[7],
                vwap   : d[8],
                volume : d[1]
              };
            });
          }
        }
        
        load(data);
      })
      .on('error', function(xhr){
        console.log(xhr.response);
        error({status:xhr.status,text:xhr.statusText,message:xhr.response})
      });
      
    return request;    
  } 
  
  function parseParams(o) {
    var s = [];
    for (var key in o) {
      s.push(key + "=" + encodeURIComponent(o[key]));
    }

      return s.join("&");
  }
}