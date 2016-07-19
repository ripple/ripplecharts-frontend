(function() {

  ripple.currencyDropdown = function(gateways, old, fixed) {
    var event = d3.dispatch("change");
    var select;
    var loaded = false;

    function dropdown(selection) {
      if (old) selection.call(oldDropdowns, fixed);
      else selection.call(loadDropdowns);
    }

    dropdown.selected = function(_) {
      return arguments.length ? (select = _, dropdown) : select;
    };

    function loadDropdowns(selection) {
      selection.html("");
      var theme = store.get("theme") || store.session.get("theme") || "light";

      var selectionId;
      if (selection.attr("id") === "quote") selectionId = "trade";
      else selectionId = selection.attr("id");
      var currencies     = gateways.getCurrencies();
      var currencySelect = selection.append("select").attr("class", "currency").attr("id", selectionId+"_currency");
      var gatewaySelect  = selection.append("select").attr("class","gateway").attr("id", selectionId+"_gateway");
      var found = false;

      //format currnecies for dropdowns
      var i = currencies.length;
      while (i--) {
        if (!currencies[i].include) {
          currencies.splice(i, 1);
        }
        else {
          currencies[i] = {
            text     : currencies[i].currency,
            value    : i,
            currency : currencies[i].currency,
            imageSrc : currencies[i].icon
          };
          if (select.currency === currencies[i].currency) {
            currencies[i].selected = true;
            found = true;
          }
        }
      }

      if (select && !found) {
        currencies.push({
          text: select.currency,
          value: i,
          currency: select.currency,
          imageSrc:  API + '/currencies/' +
            select.currency + '.svg',
          selected: true
        });
      }

      $("#"+selectionId+"_currency").ddslick({
        data: currencies,
        imagePosition: "left",
        width: "120px",
        onSelected: function (data) {
          if (!loaded) {
            changeCurrency(data.selectedData.currency);
          } else if (data.selectedData.currency !== select.currency) {
            changeCurrency(data.selectedData.currency);
          }
        }
      });

      editList(selectionId, 'gateway');
      editList(selectionId, 'currency');

      function checkThemeLogo(issuer) {
        if (theme == 'dark') {
          issuer.imageSrc = issuer.assets['logo.grayscale.svg'];
        } else if (theme == 'light') {
          issuer.imageSrc = issuer.assets['logo.svg'];
        }
      }

      function changeCurrency(selected){
        $("#"+selectionId+"_gateway").ddslick("destroy");
        var issuers;
        var issuer;
        var picked  = false;
        var disable = false;
        var found = false;

        issuers = gateways.getIssuers(selected);
        if (selected === "XRP" || issuers.length === 0) {
          issuers = [{}];
          disable = true;
        }

        var i = issuers.length;
        while (i--) {
          issuer = issuers[i];
          if (disable !== true && !issuers[i].include) {
            issuers.splice(i, 1);
          } else {
            issuer.text = issuer.name;
            if (disable !== true && !issuer.custom) {
              checkThemeLogo(issuer);
            }
            issuer.value = i;
            if (select.issuer === issuer.account) {
              issuer.selected = true;
              found = true;
            }
            else issuer.selected = false;
          }
        }

        //issuer is not in the list for this currency
        if (selected === select.currency &&
            selected !== 'XRP' &&
            !found) {
          disable = false;
          issuers.push({
            text: gateways.getName(select.issuer) || select.issuer,
            value: issuers.length,
            account: select.issuer,
            selected: true
          });
        }

        //Special edge case for custom issuer being duplicate of featured
        for (i=0; i<issuers.length; i++) {
          if (issuers[i].selected && !picked) picked = true;
          else if (issuers[i].selected && picked) issuers[i].selected = false;
        }

        $("#"+selectionId+"_gateway").ddslick({
          data: issuers,
          imagePosition: "left",
          onSelected: function (data) {
            var different_issuer   = data.selectedData.account !== select.issuer;
            var different_currency = selected !== select.currency;
            if (different_currency || different_issuer) {
              changeGateway(selected, data.selectedData.account, selectionId);
            }
          }
        });

        d3.select("#"+selectionId+"_currency").classed("currency", true);
        d3.select("#"+selectionId+"_gateway").classed("gateway", true);

        if (disable === true) {
          d3.select("#"+selectionId+"_gateway").classed("disabledDropdown", true);
        }

      }

      function changeGateway(currency, issuer, selectionId) {
        if ($("#"+selectionId+"_gateway").find('li.edit_list.gateway').length < 1) {
          editList(selectionId, 'gateway');
        }
        select = issuer ? {currency: currency, issuer: issuer} : {currency:currency}
        event.change(select);
      }
    }

    //append edit list option to dropdowns
    function editList( selectionId, selectionSuffix ) {
      $('#'+ selectionId + '_' + selectionSuffix + ' ul.dd-options').append( '<a onClick=ga("send", "event", "Manage", "Edit button"); class="edit_list" href="#/manage-' + selectionSuffix +'?'+ selectionId +'"><li ui-route="/manage-' + selectionSuffix + '" ng-class="{active:$uiRoute !== false}" class="' + selectionSuffix + '"><span class="plus">+</span><label class="dd-option-text">Edit</label></li></a>');
     }

    function oldDropdowns(selection, fixed) {
      var currencies = gateways.getCurrencies(fixed);
      var currencySelect = selection.append('select')
        .attr('class','currency')
        .on('change', changeCurrency);
      var selectedCurrency = select ? select.currency : null;
      var gatewaySelect = selection.append('select')
        .attr('class','gateway')
        .on('change', changeGateway);

      var option = currencySelect.selectAll('option')
        .data(currencies)
        .enter().append('option')
        .attr('class', function(d){ return d.currency })
        .property('selected', function(d) {
          return selectedCurrency && d.currency === selectedCurrency; })
        .text(function(d){ return d.currency });

      changeCurrency();

      function changeCurrency() {
        var currency = currencySelect.node().value;
        var list = [];

        if (currency !== 'XRP') {
          list = gateways.getIssuers(currency, fixed);

          if (list.every(function(d) { return select.issuer !== d.account})) {
            list.unshift({
              name: gateways.getName(select.issuer) || select.issuer,
              account: select.issuer
            });
          }
        }

        var option = gatewaySelect.selectAll('option')
        .data(list);

        option.enter().append('option')
          .text(function(d) {
            return d.name
          });

        option.exit().remove();

        if (currency === 'XRP') {
          gatewaySelect.attr('disabled', 'true');
        } else {
          gatewaySelect.attr('disabled', null);
        }


        if (select) {
          option.property('selected', function(d) {
            return d.account === select.issuer;
          });
        }

        changeGateway();
      }

      function changeGateway() {
        var name = gatewaySelect.node().value;
        var currency = currencySelect.node().value;
        var list = gatewaySelect.selectAll('option')
        .data();

        var gateway = list.filter(function(d) {
          return d.name === name;
        })[0];

        event.change(gateway ? {
          currency: currency,
          issuer: gateway.account
        } : {
          currency: currency
        });
      }
    }

    return d3.rebind(dropdown, event, "on");
  };

})();
