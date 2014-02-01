(function() {

  var accountsByCurrency,
    gatewayByName,
    gatewayByAddress,
    queue = [];

  ripple.currencyDropdown = function(currencyList) {
    var event = d3.dispatch("change"), selected;
	
    if (!accountsByCurrency) {
      accountsByCurrency = {};
      gatewayByName      = {};
      gatewayByAddress   = {};
	
      gateways.forEach(function(gateway) {
        gatewayByName[gateway.name] = gateway;
      	var accounts = gateway.accounts,
          currencies = gateway.currencies = [];
          		
      	accounts.forEach(function(account) {
          gatewayByAddress[account.address] = account.gateway = gateway;
        	account.currencies.forEach(function(currency) {
            (accountsByCurrency.hasOwnProperty(currency) ? accountsByCurrency[currency] : accountsByCurrency[currency] = []).push(account);
          	currencies.push(currency);
        	});
        });
    	});
    		
    	for (var i = 0; i < queue.length; ++i) queue[i]();
    	queue = null;
    }
	
    function dropdown(selection) {
      if (queue) queue.push(function() { selection.call(loadDropdowns); });
      else selection.call(loadDropdowns);
    }


//  this function is called to display currency then issuer    
    function loadDropdowns(selection) {
      var currencies     = currencyList || ["XRP"].concat(d3.keys(accountsByCurrency).sort());
      var currencySelect = selection.append("select").attr("class","currency").on("change", changeCurrency);
      var gateway        = selected && gatewayByAddress[selected.issuer];
      if (!currencyList) var gatewaySelect  = selection.append("select").attr("class","gateway").on("change", changeGateway);

      var option = currencySelect.selectAll("option")
        .data(currencies)
        .enter().append("option")
        .property("selected", function(d) { return selected && d === selected.currency; })
        .text(function(d){return d});   
       
        
      if (!currencyList) changeCurrency();
      
      function changeCurrency() {
        if (currencyList) {
          event.change(currencySelect.node().value);  
        } else {
          var currency = currencySelect.node().value;
          var list = currency == 'XRP' ? [""] : 
            accountsByCurrency[currency].map(function(d){
              return d.gateway.name;
            });
          
          var option = gatewaySelect.selectAll("option").data(list, String);
          
          option.enter().append("option").text(function(d){return d});
          option.exit().remove();
          if (currency=="XRP") gatewaySelect.attr("disabled", "true");
          else gatewaySelect.attr('disabled', null);
         
          
          if (selected) {
            var name = gateway ? gateway.name : "";
            option.property("selected", function(d) { return d === name });
          }
          changeGateway();
        }
      } 
      
      function changeGateway() {
        var gateway = gatewaySelect.node().value,
          currency  = currencySelect.node().value,
          accounts  = accountsByCurrency[currency];
          issuer    = accounts && accounts.filter(function(d) { return d.gateway.name === gateway; })[0].address;
          
          event.change(issuer ? {currency:currency, issuer:issuer} : {currency:currency});  
      }    
    } 
    
//  the function below would be used in place of loadDropdowns if you wanted 
//  issuer-currency instead of currency - issuer    
    function loaded(selection) {
      //loadDropdowns(selection);
      var currencies = ["XRP"].concat(d3.keys(accountsByCurrency).sort()),
        names        = [""].concat(d3.keys(gatewayByName).sort()),
        gateway      = selected && gatewayByAddress[selected.issuer];
			
      var gatewaySelect = selection.append("select").attr("class","gateway").on("change", function() {
        var gateway = gatewayByName[gatewaySelect.selectAll(":checked").datum()],
	       option     = currencySelect.selectAll("option").data(gateway ? gateway.currencies : ["XRP"], String);
	              	
        option.enter().append("option").text(String);
        option.exit().remove();
        change();
      });
	        
      gatewaySelect.selectAll("option")
        .data(names)
        .enter().append("option")
        .property("selected", gateway ? function(d) { return d === gateway.name; } : function(_, i) { return !i; })
        .text(String);
    
      var currencySelect = selection.append("select").attr("class","currency").on("change", change);
      
      var option = currencySelect.selectAll("option")
        .data(gateway ? gateway.currencies : ["XRP"], String)
        .enter().append("option")
        .text(String);
        	
      if (selected) option.property("selected", function(d) { return d === selected.currency; });
      change();
      
      function change() {
        var gateway = gatewayByName[gatewaySelect.selectAll(":checked").datum()],
          currency  = currencySelect.selectAll(":checked").datum(),
          accounts  = accountsByCurrency[currency],
          address   = accounts && accounts.filter(function(d) { return d.gateway === gateway; })[0].address;
          
        event.change(address ? {currency:currency, issuer:address} : {currency:currency});
      }
    }
    
    dropdown.selected = function(_) {
      return arguments.length ? (selected = _, dropdown) : selected;
    };
    
    dropdown.getIssuers = function (currency) {
      var accounts = accountsByCurrency[currency], issuers = []; 
      if (!accounts || !accounts.length) return issuers;
      
      issuers = accounts.map(function(d){
        return d.address;
      });
      
      return issuers;
    }
    
    dropdown.getName = function(issuer) {
      var gateway = gatewayByAddress[issuer];
      return gateway ? gateway.name : ""; 
    }
    
    return d3.rebind(dropdown, event, "on");
  };
    
  function gatewayDropdown(selection, accounts) {}
})();
