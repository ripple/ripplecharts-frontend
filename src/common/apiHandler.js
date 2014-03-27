ApiHandler = function (url) {
  var self = this;
  self.url = url;
  
  function apiRequest (route) {
    var request = d3.xhr(self.url+"/"+route);
    request.header('Content-Type', 'application/json');
    return request;
  }
  
    
  this.offersExercised = function (params, load, error) {
    var request = apiRequest("offersExercised");

    request.post(JSON.stringify(params))
      .on('load', function(xhr){
        var response = JSON.parse(xhr.response), data = [];   

        if (response.length>1) {
          if (params.reduce===false) {

            response.shift(); //remove header row
            data = response.map(function(d) {

              return {
                time    : moment.utc(d[0]),
                price   : d[1],   
                amount  : d[2], 
                amount2 : d[3],
                tx      : d[4], 
                id      : d[5],    
                type    : ''
              }
            });
            
            var prev = null;
            for (var i=data.length; i>-1; i--) {
              if (prev && prev.price>data[i].price)      data[i].type = 'bid';
              else if (prev && prev.price<data[i].price) data[i].type = 'ask';
            //else if (prev)                             data[i].type = prev.type;
              prev = data[i];
            }
            
                     
          } else {
            response.splice(0,1); //remove first   
            
            //remove null row, if we get one 
            if (response.length==1 && !response[0][1]) response.shift();
            
            data = response.map(function(d) {
              return {
                time    : moment.utc(d[0]),
                open    : d[4],
                close   : d[5],
                high    : d[6],
                low     : d[7],
                vwap    : d[8],
                volume  : d[1],
                num     : d[3],
                volume2 : d[2]
              };
            });
          }
        }
        
        load(data);
      })
      .on('error', function(xhr){
        console.log(xhr.response);
        if (error) error({status:xhr.status,text:xhr.statusText,message:xhr.response})
      });
      
    return request;    
  } 
  
  this.valueSent = function (params, load, error) {
    
    var request = apiRequest("valueSent");        
    request.post(JSON.stringify(params))
      .on('load', function(xhr) {
        var response = JSON.parse(xhr.response);  
        load(response);
      })
      .on('error', function(xhr){
        console.log(xhr.response);
        if (error) error({status:xhr.status,text:xhr.statusText,message:xhr.response})
      });
      
    return request;      
  }
  
  this.issuerCapitalization = function (params, load, error) {
    
    var request = apiRequest("issuerCapitalization");        
    request.post(JSON.stringify(params))
      .on('load', function(xhr) {
        var response = JSON.parse(xhr.response);  
        load(response);
      })
      .on('error', function(xhr){
        console.log(xhr.response);
        if (error) error({status:xhr.status,text:xhr.statusText,message:xhr.response})
      });
      
    return request;        
  }
  
  
  this.getTotalAccounts = function(time, callback){
    var request = apiRequest("accountsCreated");
    time = time || new Date();
    
    request.post(JSON.stringify({
      startTime     : time,  
      endTime       : d3.time.year.offset(time, -10),
      timeIncrement : "all"
      
    })).on('load', function(xhr){   
      data  = JSON.parse(xhr.response);
      num   = data[1] && data[1][1] ? data[1][1] : 0;
      callback (null, num);
      
    }).on('error', function(xhr){
      callback({status:xhr.status,text:xhr.statusText,message:xhr.response});
    }); 
    
    return request;
  }
  
  
  this.accountsCreated = function (params, callback) {
    var request = apiRequest("accountsCreated");
    request.post(JSON.stringify(params))
    .on('load', function(xhr){   
      callback(null, JSON.parse(xhr.response));
      
    }).on('error', function(xhr){
      callback({status:xhr.status,text:xhr.statusText,message:xhr.response});
    });
    
    return request;
  }
  
  
  this.getTopMarkets = function (ex, callback) {
    var request = apiRequest("topMarkets");

    request.post(JSON.stringify({ exchange : ex }))
    .on('load', function(xhr){   
      var response = JSON.parse(xhr.response); 
      callback(null, response);

    }).on('error', function(xhr){
      callback({status:xhr.status,text:xhr.statusText,message:xhr.response});
    });    
  }
  
  this.getVolume24Hours = function (ex, callback) {
    var request = apiRequest("totalValueSent");

      //exchange : {
      //  currency : "USD",
      //  issuer   : "rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B"
      //}
      
    request.post(JSON.stringify({ exchange : ex }))
    .on('load', function(xhr){   
      var response = JSON.parse(xhr.response);
        callback (null, response);
      
    }).on('error', function(xhr){
      callback({status:xhr.status,text:xhr.statusText,message:xhr.response});
    });     
  }
  
  this.getVolume30Days = function (ex, callback) {
    var request = apiRequest("totalValueSent");
    
    request.post(JSON.stringify({
      endTime   : moment.utc(),
      startTime : moment.utc().subtract(30, "days"),
      exchange  : ex
    }))
    .on('load', function(xhr){   
      var response = JSON.parse(xhr.response);
        callback (null, response);
      
    }).on('error', function(xhr){
      callback({status:xhr.status,text:xhr.statusText,message:xhr.response});
    }); 
    
  }
  

  this.getNetworkValue = function (ex, callback) {
    var request = apiRequest("totalNetworkValue");

    request.post(JSON.stringify({ exchange : ex }))
    .on('load', function(xhr){   
      callback(null, JSON.parse(xhr.response));
      
    }).on('error', function(xhr){
      console.log(xhr);
      callback({status:xhr.status,text:xhr.statusText,message:xhr.response});
    });
    
    return request;    
  }
  
  
  this.exchangeRates = function (params, callback) {
    var request = apiRequest("exchangeRates");

    request.post(JSON.stringify(params))
    .on('load', function(xhr){   
      var response = JSON.parse(xhr.response);
      callback (null, response);
      
    }).on('error', function(xhr){

      callback({status:xhr.status,text:xhr.statusText,message:xhr.response});
    });     
  }
 
}