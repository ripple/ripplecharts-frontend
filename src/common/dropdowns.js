(function() {

	var accountsByCurrency,
	    gatewayByName,
	    gatewayByAddress,
	    queue = [];

	ripple.currencyDropdown = function() {
		var event = d3.dispatch("change"),
	      	selected;
	
	  	if (!accountsByCurrency) {
	 		accountsByCurrency = {};
	    	gatewayByName      = {};
	    	gatewayByAddress   = {};
	
    		gateways.forEach(function(gateway) {
      		gatewayByName[gateway.name] = gateway;
      		var accounts   = gateway.accounts,
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
	    	if (queue) queue.push(function() { selection.call(loaded); });
	    	else selection.call(loaded);
	  	}
	
	  	function loaded(selection) {
	
		    var currencies = ["XRP"].concat(d3.keys(accountsByCurrency).sort()),
		        names      = [""].concat(d3.keys(gatewayByName).sort()),
		        gateway    = selected && gatewayByAddress[selected.issuer];
			
	    	var gatewaySelect = selection.append("select").attr("class","gateway").on("change", function() {
	          	var gateway = gatewayByName[gatewaySelect.selectAll(":checked").datum()],
	              	option  = currencySelect.selectAll("option").data(gateway ? gateway.currencies : ["XRP"], String);
	              	
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
	      		var gateway  = gatewayByName[gatewaySelect.selectAll(":checked").datum()],
	          		currency = currencySelect.selectAll(":checked").datum(),
	          		accounts = accountsByCurrency[currency],
	          		address  = accounts && accounts.filter(function(d) { return d.gateway === gateway; })[0].address;
	      		event.change(address ? {currency:currency, issuer:address} : {currency:currency});
	    	}
	  	}
	
		dropdown.selected = function(_) {
	    	return arguments.length ? (selected = _, dropdown) : selected;
		};
	
		return d3.rebind(dropdown, event, "on");
	};

	function gatewayDropdown(selection, accounts) {}

})();
