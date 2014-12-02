angular.module('templates-app', ['accounts/accounts.tpl.html', 'active/active.tpl.html', 'graph/graph.tpl.html', 'history/history.tpl.html', 'landing/landing.tpl.html', 'markets/markets.tpl.html', 'multimarkets/multimarkets.tpl.html', 'value/value.tpl.html']);

angular.module("accounts/accounts.tpl.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("accounts/accounts.tpl.html",
    "<div class=\"accounts\">\n" +
    "  <div class=\"helpbox\" ng-class=\"{showHelp : showHelp}\">\n" +
    "    <h5>Accounts Created Chart</h5>\n" +
    "    The bright blue line shows cumulative number of accounts created, \n" +
    "    with the value on the right axis. The thin line shows the accounts \n" +
    "    created per day, with the value on the left axis. Change the\n" +
    "    time range by selecting from the options at the top of the chart.\n" +
    "  </div>\n" +
    "  <h3>Accounts Created</h3> \n" +
    "  <div id=\"interval\"></div>\n" +
    "  <div id=\"totalAccounts\" data-snap-ignore=\"true\"></div>\n" +
    "</div>\n" +
    "<style>\n" +
    "  footer .footerInner {\n" +
    "    width:90% !important;\n" +
    "  }\n" +
    "</style>\n" +
    "\n" +
    "");
}]);

angular.module("active/active.tpl.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("active/active.tpl.html",
    "<div class=\"active\">\n" +
    "  <div class=\"pairSelect\">\n" +
    "    <div id=\"base\" class=\"dropdowns\"></div>\n" +
    "    <div id=\"flip\"><span>Flip</span></div>\n" +
    "    <div id=\"counter\" class=\"dropdowns\"></div>\n" +
    "  </div> \n" +
    "  <div id=\"activeAccounts\"></div>  \n" +
    "</div>\n" +
    "\n" +
    "\n" +
    "");
}]);

angular.module("graph/graph.tpl.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("graph/graph.tpl.html",
    "<!-- BEGIN VISUALIZATION DIV -->\n" +
    "<div id=\"visualization\" class=\"fullwidth graph\">\n" +
    "  <div class=\"helpWrap\">\n" +
    "    <div class=\"helpbox\" ng-class=\"{showHelp : showHelp}\">\n" +
    "      <p>\n" +
    "        The visualization shows the current account being queried and\n" +
    "        each account that it is connected to via trust lines.  The arrows\n" +
    "        at the node indicate the direction of the trust line, and the width \n" +
    "        of the line indicates the relative size of the trust line balance.\n" +
    "  \n" +
    "        Clicking on a node will set it as the current node, and its additional\n" +
    "        connections will be added to the chart. Live transactions will appear \n" +
    "        as colored lines moving between nodes on the visualization. The color \n" +
    "        of the line corresponds to the type of asset sent.\n" +
    "        \n" +
    "        Selecting a currency from the dropdown will show 3 colors of nodes - \n" +
    "        red nodes have a negative balance and usually represent a gateway's wallet, \n" +
    "        gray nodes have no balance in the currency selected, and \n" +
    "        colored nodes have positive balances.\n" +
    "      </p>\n" +
    "      <p>\n" +
    "        At the bottom of the page, the table on the left shows all the balances\n" +
    "        by currency for the selected account. For currencies other than XRP, clicking\n" +
    "        on the balance will show the breakdown of each balance by trust lines for\n" +
    "        each currency. The table on the right shows the history of transactions\n" +
    "        for the selected account.\n" +
    "      </p>\n" +
    "\n" +
    "    </div>    \n" +
    "  </div>\n" +
    "\n" +
    "<!-- top bar -->\n" +
    "<div class=\"topbar\">\n" +
    "  <div class=\"centered\">\n" +
    "    <input id=\"focus\" type=\"text\"/>\n" +
    "    <div id=\"currencySelect\">\n" +
    "      <select id=\"currency\">\n" +
    "        <option value=\"XRP\">All Currencies</option>\n" +
    "        <option value=\"USD\">USD - U.S. Dollars</option>\n" +
    "        <option value=\"EUR\">EUR - Euro</option>\n" +
    "        <option value=\"CNY\">CNY - Chinese Yuan</option>\n" +
    "        <option value=\"JPY\">JPY - Japanese Yen</option>\n" +
    "        <option value=\"BTC\">BTC - Bitcoins</option>\n" +
    "        <option value=\"___\">Other</option>\n" +
    "      </select>\n" +
    "      <input type=\"text\" id=\"otherCurrency\" value=\"other\" class=\"sbSelector sbHolder\" />\n" +
    "    </div>\n" +
    "    <input id=\"searchButton\" type=\"button\" value=\"Go\"/>    \n" +
    "  </div>\n" +
    "</div>\n" +
    "\n" +
    "<div class=\"zoom\">\n" +
    "  <input type=\"button\" id=\"zoomOutButton\" value=\"&ndash;\"/>\n" +
    "  <input type=\"button\" id=\"zoomInButton\"  value=\"+\" disabled=\"disabled\"/>\n" +
    "</div>\n" +
    "\n" +
    "<div id=\"loading\" class=\"light large\" style=\"color:#aaa; position:absolute; width:100%; top:300px; line-height:50px; text-align:center;\">\n" +
    "  <img class=\"loader\" src=\"assets/images/rippleThrobber.png\" style=\"vertical-align: middle;\"/>\n" +
    "</div>\n" +
    "\n" +
    "\n" +
    "<!-- begin information below -->\n" +
    "<div id=\"information\">\n" +
    "<div class=\"tab midsize mediumgray unselectedTab\" style=\"margin-top:-36px; margin-left:140px;\" id=\"feedTab\">Network feed</div>\n" +
    "<div id=\"individualTab\" class=\"tab midsize mediumgray selectedTab\" style=\"margin-top:-35px; margin-left:-1px;\">Wallet info</div>\n" +
    "<div id=\"focalAddress\" class=\"light mediumgray large\" style=\"margin-bottom:13px; margin-top:13px; padding-left:20px; float:left;\">&nbsp;</div>\n" +
    "<div class=\"clearboth\"></div>\n" +
    "\n" +
    "<div class=\"fullwidth topbordered horizontalrule\"></div>\n" +
    "<div class=\"light midsize mediumgray\" id=\"leftHeading\" style=\"width:50%; border: none; float:left; padding-left:20px;\">Balances</div>\n" +
    "<div class=\"light midsize mediumgray\" id=\"rightHeading\" style=\"border:none; float:left;\">History</div>\n" +
    "<div class=\"clearboth\"></div>\n" +
    "<div class=\"fullwidth bottombordered horizontalrule\"></div>\n" +
    "\n" +
    "<!-- the table on the left -->\n" +
    "<div class=\"bottomlist rightbordered\" style=\"width:49%; float:left;\">\n" +
    "  <div class=\"scroll-pane\" id=\"transactionInformationContainer\" style=\"z-index:5; display:none;\">\n" +
    "    <div style=\"width:100%; overflow-x:hidden;\">\n" +
    "      <div id=\"transactionInformation\" class=\"light midsize mediumgray\" style=\"width:100%%; padding:20px; display:none;\"></div>\n" +
    "      <div id=\"transactionFeed\" class=\"light midsize mediumgray\" style=\"width:100%; padding:20px; display:none;\">\n" +
    "        <table id=\"transactionFeedTable\"></table> \n" +
    "      </div>\n" +
    "    </div>\n" +
    "  </div>\n" +
    "  <div class=\"scroll-pane\" style=\"height:288px; margin-left:10px;\">\n" +
    "    <table style=\"width:100%; margin-top:4px;\" class=\"outertable\" id=\"balanceTable\"></table>\n" +
    "  </div>\n" +
    "</div>\n" +
    "\n" +
    "<!-- the table on the right -->\n" +
    "<div class=\"bottomlist\" style=\"width:50%; float:right;\">\n" +
    "  <div class=\"scroll-pane\" style=\"height:288px;width:100%; \">\n" +
    "    <table class=\"outertable\" id=\"transactionTable\"></table>\n" +
    "  </div>\n" +
    "</div>\n" +
    "\n" +
    "<div class=\"clearboth\"></div>\n" +
    "\n" +
    "</div><!-- end information at the bottom -->\n" +
    "\n" +
    "</div><!-- END VISUALIZATION DIV -->");
}]);

angular.module("history/history.tpl.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("history/history.tpl.html",
    "<div class=\"history\" id=\"main\">\n" +
    "\n" +
    "	<div class=\"helpbox\" ng-class=\"{showHelp : showHelp}\">\n" +
    "		<h4>Historical Metrics</h4>\n" +
    "		<p>\n" +
    "			This chart shows trends for various currencies available on the Ripple Network. Each metric can be broken down into further detail by clicking on its entry in the legend below the graph. Once a currency has been chosen for an in depth view, the legend shows the name of the gateway, its issuing address and the counter currency if applicable. Gateways are grouped by currency for comparison. The time range and increment can be chosen from the top right.\n" +
    "		</p>\n" +
    "		\n" +
    "		<div class=\"table\">\n" +
    "			<div class=\"cell\">\n" +
    "			<h5>Total Volume</h5>\n" +
    "			<p>\n" +
    "				The initial Total Voluem chart shows the aggregate volume of both total transaction and trade volume. The legend at the bottom allows a deeper view into each of those metrics.\n" +
    "			</p>        \n" +
    "			</div>\n" +
    "			<div class=\"cell\">\n" +
    "			<h5>Transaction Volume</h5>\n" +
    "			<p>\n" +
    "				The transaction volume chart shows the amounts sent through payments and offers \n" +
    "				exercised for each currency. The legend at the bottom allows a deeper view into how that volume breaks down into different gateways.\n" +
    "			</p>        \n" +
    "			</div>\n" +
    "			<div class=\"cell\">\n" +
    "			<h5>Trade Volume</h5>\n" +
    "			<p>\n" +
    "				The trade volume chart shows the aggregate volume of trade between each currency \n" +
    "				and XRP. The legend at the bottom allows a deeper view into how that volume breaks down into different gateways.\n" +
    "			</p>  \n" +
    "			</div>\n" +
    "		</div>\n" +
    "		\n" +
    "	</div>\n" +
    "\n" +
    "	<div class=\"control\">\n" +
    "        <div id=\"currency\">\n" +
    "            <select class=\"currency\">\n" +
    "                <option value=\"USD\">USD</option>\n" +
    "                <option value=\"XRP\">XRP</option>\n" +
    "                <option value=\"BTC\">BTC</option>\n" +
    "                <option value=\"EUR\">EUR</option>\n" +
    "                <option value=\"CNY\">CNY</option>\n" +
    "                <option value=\"JPY\">JPY</option>\n" +
    "            </select>\n" +
    "        </div>\n" +
    "        <div id=\"breadcrumb\">\n" +
    "            <ul class=\"crumbs\">\n" +
    "                <li class=\"crumb\" id=\"totals\">Totals</li>\n" +
    "            </ul>\n" +
    "        </div>\n" +
    "		<div class=\"interval\">\n" +
    "            <div id=\"intervals\">\n" +
    "				<div class=\"tag\">Interval:</div>\n" +
    "				<div id = \"month\" class=\"int\"> months </div>\n" +
    "				<div id = \"week\" class=\"int\"> weeks </div>\n" +
    "				<div id = \"day\" class=\"int clicked\"> days </div>\n" +
    "			</div>\n" +
    "			<div id=\"ranges\">\n" +
    "				<div class=\"tag\">Range:</div>\n" +
    "				<input type=\"text\" class=\"ui-datepicker calendar\" id=\"datepicker_from\">\n" +
    "				<input type=\"text\" class=\"ui-datepicker calendar\" id=\"datepicker_to\">\n" +
    "				<div id = \"1m\" class=\"range clicked\">1M</div>\n" +
    "				<div id = \"3m\" class=\"range\">3m</div>\n" +
    "				<div id = \"6m\" class=\"range\">6m</div>\n" +
    "				<div id = \"1y\" class=\"range\">1y</div>\n" +
    "				<div id = \"max\" class=\"range\">max</div>\n" +
    "				<div id = \"custom\">custom</div>\n" +
    "			</div>\n" +
    "            <a id=\"csv\">\n" +
    "              <img src=\"http://www.ripplecharts.com/assets/images/download.svg\">\n" +
    "            </a>\n" +
    "		</div>\n" +
    "	</div>\n" +
    "\n" +
    "	 <div class=\"chart_wrapper\">\n" +
    "		<img class=\"throbber loader loading\" id=\"loading\" src=\"assets/images/rippleThrobber.png\">\n" +
    "		<canvas id=\"canvas\"></canvas>\n" +
    "	</div>\n" +
    "	<div id=\"lineLegend\"></div>\n" +
    "	<div id=\"tooltip\">\n" +
    "		<div class=\"title\"></div>\n" +
    "		<div class=\"iss\"></div>\n" +
    "		<div class=\"date\"></div>\n" +
    "		<div class=\"value\"></div>\n" +
    "	</div>\n" +
    "</div>\n" +
    "<style>\n" +
    "	footer .footerInner {\n" +
    "		width:90% !important;\n" +
    "	}\n" +
    "</style>\n" +
    "");
}]);

angular.module("landing/landing.tpl.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("landing/landing.tpl.html",
    "<div>\n" +
    "  <div class=\"main container landing\">\n" +
    "    <div class=\"helpbox\" ng-class=\"{showHelp : showHelp}\">\n" +
    "      <h3>Welcome to Ripple Charts</h3>\n" +
    "      <p>\n" +
    "        This charting site was built by Ripple Labs to provide live and historical data about \n" +
    "        the Ripple network. This site is open for anyone to use, alter and embed.  The source\n" +
    "        code is available <a href=\"https://github.com/ripple/ripplecharts-frontend\" target=\"_blank\">here</a>.\n" +
    "      </p>\n" +
    "    </div>\n" +
    "    <div class=\"row\">\n" +
    "      <div class=\"col-md-6 stats\">\n" +
    "        <h5>\n" +
    "          Ripple Network Stats\n" +
    "          <select id=\"valueCurrency\" class=\"valueCurrencySelect\"></select>\n" +
    "          <span class=\"valueRateDisplay\" ng-bind=\"valueRateDisplay\"></span>\n" +
    "        </h5> \n" +
    "        <ul>\n" +
    "          <li>\n" +
    "            <label>Total Network Value:</label>\n" +
    "            <div class=\"stat\">\n" +
    "              <span ng-show=\"valueRate\" ng-bind=\"totalNetworkValue\"></span>\n" +
    "              <img  ng-hide=\"totalNetworkValue\" src=\"assets/images/rippleThrobber.png\" class=\"loader\"/>\n" +
    "              <span ng-show=\"totalNetworkValue && totalNetworkValue != ' '\" ng-click=\"metricDetail='totalNetworkValue'\" class=\"details\" ng-class=\"{selected : metricDetail == 'totalNetworkValue' }\">\n" +
    "                Detail\n" +
    "                <img src=\"assets/images/triangle.svg\"/>\n" +
    "              </span>\n" +
    "            </div>\n" +
    "          </li>\n" +
    "          <li>\n" +
    "            <label>24 hr Transaction Volume:</label>\n" +
    "            <div class=\"stat\">\n" +
    "              <span ng-show=\"valueRate\" ng-bind=\"transactionVolume\"></span>\n" +
    "              <img  ng-hide=\"transactionVolume\" src=\"assets/images/rippleThrobber.png\" class=\"loader\"/>\n" +
    "              <span ng-show=\"transactionVolume && transactionVolume != ' '\" ng-click=\"metricDetail='transactionVolume'\" class=\"details\" ng-class=\"{selected : metricDetail == 'transactionVolume' }\">\n" +
    "                Detail\n" +
    "                <img src=\"assets/images/triangle.svg\"/>\n" +
    "              </span>\n" +
    "            </div>\n" +
    "          </li>\n" +
    "          <li>\n" +
    "            <label>24 hr Trade Volume:</label>\n" +
    "            <div class=\"stat\">\n" +
    "              <span ng-show=\"valueRate\" ng-bind=\"tradeVolume\"></span>\n" +
    "              <img  ng-hide=\"tradeVolume\" src=\"assets/images/rippleThrobber.png\" class=\"loader\"/>\n" +
    "              <span ng-show=\"tradeVolume && tradeVolume != ' '\" ng-click=\"metricDetail='tradeVolume'\" class=\"details\" ng-class=\"{selected : metricDetail == 'tradeVolume' }\">\n" +
    "                Detail\n" +
    "                <img src=\"assets/images/triangle.svg\"/>\n" +
    "              </span>\n" +
    "            </div>\n" +
    "          </li>          \n" +
    "          <li>\n" +
    "            <label>Total XRP:</label>\n" +
    "            <div class=\"stat\">\n" +
    "              <span ng-bind=\"totalCoins\"></span>\n" +
    "              <small ng-show=\"totalCoins\">XRP</small>\n" +
    "              <img ng-hide=\"totalCoins\" src=\"assets/images/rippleThrobber.png\" class=\"loader\"/>\n" +
    "            </div>\n" +
    "          </li>\n" +
    "          <li>\n" +
    "            <label>Ledger #:</label>\n" +
    "            <div class=\"stat\">\n" +
    "              <span ng-bind=\"ledgerIndex\"></span>\n" +
    "              <img ng-hide=\"ledgerIndex\" src=\"assets/images/rippleThrobber.png\" class=\"loader\"/>\n" +
    "            </div>\n" +
    "          </li> \n" +
    "          <li>\n" +
    "            <label># of Ripple accounts:</label>\n" +
    "            <div class=\"stat\">\n" +
    "              <span ng-bind=\"totalAccounts\"></span>\n" +
    "              <img ng-hide=\"totalAccounts\" src=\"assets/images/rippleThrobber.png\" class=\"loader\"/>\n" +
    "            </div>\n" +
    "          </li>  \n" +
    "        </ul>\n" +
    "      </div>\n" +
    "      <div class=\"col-md-6\">\n" +
    "        <h5  ng-bind=\"metricDetailTitle\"></h5>\n" +
    "        <div id=\"metricDetail\"></div>\n" +
    "      </div>\n" +
    "    </div>\n" +
    "    <h5>Top Markets</h5> \n" +
    "    <div id=\"topMarkets\"></div> \n" +
    "    <div class=\"disclaimer\">\n" +
    "      Top markets are updated every 60 seconds.\n" +
    "    </div>\n" +
    "  </div>\n" +
    "</div>\n" +
    "");
}]);

angular.module("markets/markets.tpl.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("markets/markets.tpl.html",
    "<div class=\"markets row\">\n" +
    "  <div class=\"col-md-3\">\n" +
    "    <div class=\"helpbox\" ng-class=\"{showHelp : showHelp}\">\n" +
    "      <h5>Live Trade Feed</h5>\n" +
    "      <p>\n" +
    "        The live trade feed shows the most recent trades for the \n" +
    "        selected currency pair, the latest trade price and\n" +
    "        the 24 hour high, low, and volume.\n" +
    "      </p>\n" +
    "      <p>  \n" +
    "        The large number at the top is the latest trade price.\n" +
    "        Currency prices are always quoted in relation to one another, e.g. XRP/USD.    \n" +
    "        The first currency in the pair is called the \"base currency\".  \n" +
    "        The second one is called the \"counter currency\". The price quote shows \n" +
    "        the value of 1 unit of base currency in terms of the counter currency.          \n" +
    "      </p>\n" +
    "      <p>  \n" +
    "        The table below is a real-time ticker of the latest trades.   \n" +
    "        The colored bar shows if the trade price was higher, lower or the \n" +
    "        same as the previous trade listed directly below. The left column shows the\n" +
    "        amount traded and the right column shows the trade price.\n" +
    "      </p>   \n" +
    "      <table>\n" +
    "        <tr><td class=\"type ask\"></td><th>Higher than previous price</th></tr>\n" +
    "        <tr><td class=\"type bid\"></td><th>Lower than previous price</th></tr>\n" +
    "        <tr><td class=\"type\"></td><th>Same as previous price</th></tr>\n" +
    "      </table>\n" +
    "    </div>\n" +
    "    <div id=\"tradeFeed\"></div> \n" +
    "  </div>   \n" +
    "  \n" +
    "  <div class=\"wrap col-md-9\">\n" +
    "    <div class=\"helpbox\" ng-class=\"{showHelp : showHelp}\">\n" +
    "      <h5>Live Market Data</h5>\n" +
    "      <p>\n" +
    "        The dropdowns allow you to select a base currency and a counter currency.  \n" +
    "        Select the currency first, and the issuer dropdown will update to show \n" +
    "        which issuers are available for the selected currency. On the right side,\n" +
    "        the current ledger number is represented, followed by a circle which\n" +
    "        indicates whether or not Ripple Charts is currently connected to the \n" +
    "        Ripple Network real time feed.       \n" +
    "      </p>\n" +
    "         <table>\n" +
    "          <tr>\n" +
    "            <td class=\"rippleStatus\">\n" +
    "              <svg height=\"20\" width=\"20\" class=\"connected\">\n" +
    "                <circle cx=\"10\" cy=\"10\" r=\"5\" fill=\"#c00\" />\n" +
    "              </svg>\n" +
    "            </td>\n" +
    "            <th>Connected to the Ripple Network</th>\n" +
    "          </tr>\n" +
    "          <tr>\n" +
    "            <td class=\"rippleStatus\">\n" +
    "              <svg height=\"20\" width=\"20\">\n" +
    "                <circle cx=\"10\" cy=\"10\" r=\"5\" fill=\"#c00\" />\n" +
    "              </svg>\n" +
    "            </td>\n" +
    "            <th>Disconnected from the Ripple Network</th>\n" +
    "          </tr>\n" +
    "        </table>     \n" +
    "      <p>\n" +
    "        This chart below shows price change over time. Grey bars in the \n" +
    "        background represent trade volume for that time period. In the top left, \n" +
    "        select time intervals between each data point. The displayed time range will\n" +
    "        automatically adjust based on which interval you select.  At the top right\n" +
    "        you can select between line or candlestick display.\n" +
    "      </p>\n" +
    "      <p>\n" +
    "        Hover your mouse over the chart to see open, high, low, and close values\n" +
    "        for each of the data points.  To download a csv file of the data from the \n" +
    "        current chart, click the <img src=\"assets/images/download.svg\" /> icon to \n" +
    "        the right of the currency dropdowns.\n" +
    "      </p>\n" +
    "    </div> \n" +
    "    <div class=\"controls\"> \n" +
    "      <div id=\"currencyPair\">\n" +
    "        <div class=\"rippleStatus\">\n" +
    "          <div class=\"items\">\n" +
    "            <div class=\"label\" ng-bind=\"ledgerLabel\"></div>\n" +
    "            <div class=\"index\" ng-bind=\"ledgerIndex\">--</div>\n" +
    "            <div class=\"status\">\n" +
    "              <svg height=\"20\" width=\"20\" ng-class=\"connectionStatus\">\n" +
    "                <circle cx=\"10\" cy=\"10\" r=\"5\" fill=\"#c00\" />\n" +
    "              </svg>\n" +
    "            </div>\n" +
    "          </div>\n" +
    "        </div>\n" +
    "              \n" +
    "        <div id=\"base\" class=\"dropdowns\"></div>\n" +
    "        <div id=\"flip\"><span>Flip</span></div>\n" +
    "        <div id=\"quote\" class=\"dropdowns\"></div>\n" +
    "        <a id=\"toCSV\" disabled=\"true\" title=\"Export to CSV\">\n" +
    "          <img src=\"assets/images/download.svg\"/>\n" +
    "        </a>\n" +
    "      </div>\n" +
    "      \n" +
    "      <div id=\"interval\"></div>\n" +
    "      <div id=\"chartType\"></div>\n" +
    "    </div>\n" +
    "    <div id=\"priceChart\" data-snap-ignore=\"true\"></div>\n" +
    "    <div class=\"helpbox\" ng-class=\"{showHelp : showHelp}\">\n" +
    "      <h5>Order Book</h5>\n" +
    "      <p>\n" +
    "        The current order book for the selected currency pair is below - \n" +
    "        these are orders across the Ripple Network that have been placed\n" +
    "        but not yet filled. \"Bids\" are orders to buy the base currency, and \n" +
    "        \"Asks\" are orders to sell the base currency. The “Total” column shows \n" +
    "        the total amount of currency anyone can get at that price. The \"Size\"\n" +
    "        columns show the amount of base currency available to buy or sell at\n" +
    "        \"Bid Price\" or \"Ask Price.\" The blue line shows the depth of the order \n" +
    "        book - the amount of base currency available at different rates. The \n" +
    "        vertical line represents the midpoint between the best bid and ask price\n" +
    "        which is the current market price.       \n" +
    "      </p>\n" +
    "    </div> \n" +
    "    <div id=\"bookChart\"  data-snap-ignore=\"true\"></div>\n" +
    "    <div id=\"bookTables\"></div>\n" +
    "  </div>\n" +
    "</div>\n" +
    "<style>\n" +
    "  footer .footerInner {\n" +
    "    width:94% !important;\n" +
    "    padding:10px 3% !important;\n" +
    "  }\n" +
    "</style>\n" +
    "");
}]);

angular.module("multimarkets/multimarkets.tpl.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("multimarkets/multimarkets.tpl.html",
    "<div class=\"row-fluid\">\n" +
    "  <div class=\"main mmpage\">\n" +
    "    <div id=\"multimarkets\">\n" +
    "      <div class=\"helpbox\" ng-class=\"{showHelp : showHelp}\">\n" +
    "       <h5>Multi Market Charts</h5>\n" +
    "       <p>\n" +
    "         Each chart is a 24 hour snapshot of the selected currency pair. the\n" +
    "         chart color indicates whether the price has moved up, down, or remained\n" +
    "         unchanged over the last 24 hours.  The middle line and number indicates\n" +
    "         the current price.  Click on any chart to see the live market data for \n" +
    "         that currency pair. These charts update every 60 seconds with the latest\n" +
    "         data from the Ripple Network.\n" +
    "       </p>\n" +
    "       <p>\n" +
    "         Add new charts by clicking the \"+\" button, or remove them by clicking the\n" +
    "         \"x\" button at the top right of each chart.  You can change currencies by\n" +
    "         selecting from the dropdowns at the bottom of the chart, and reverse the \n" +
    "         order by clicking the \"Flip\" button.\n" +
    "       </p>\n" +
    "      </div>\n" +
    "    </div>\n" +
    "    <div class=\"disclaimer\">\n" +
    "      Charts are updated every 60 seconds.\n" +
    "    </div>\n" +
    "  </div>\n" +
    "</div>\n" +
    "<style>\n" +
    "  footer .footerInner {\n" +
    "    width:96% !important;\n" +
    "  }\n" +
    "</style>\n" +
    "\n" +
    "");
}]);

angular.module("value/value.tpl.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("value/value.tpl.html",
    "<div class=\"valueWrap\">\n" +
    "  <div class=\"helpbox\" ng-class=\"{showHelp : showHelp}\">\n" +
    "    <h4>Value Trends</h4>\n" +
    "    <p>\n" +
    "      This chart shows trends for various currencies available on the Ripple Network.  Gateways are \n" +
    "      grouped by currency for comparison. Each gateway can be toggled on or off by clicking on its entry \n" +
    "      in the legend below the graph.  The legend shows the name of the gateway and its issuing address.\n" +
    "      The format of the graph can be changed between a line graph and a stacked area graph and \n" +
    "      time range can be selected from the list on the right.\n" +
    "    </p>\n" +
    "    \n" +
    "    <div class=\"table\">\n" +
    "      <div class=\"cell\">\n" +
    "        <h5>Gateway Capitalization</h5>\n" +
    "        <p>\n" +
    "          The gateway capitalization chart shows the changing balances of gateways on the Ripple \n" +
    "          Network for the selected currency.  The legend at the bottom includes the gateway's \n" +
    "          current balance.\n" +
    "        </p>        \n" +
    "      </div>\n" +
    "      <div class=\"cell\">\n" +
    "        <h5>Transaction Volume</h5>\n" +
    "        <p>\n" +
    "          The transaction volume chart shows the amounts sent through payments and offers \n" +
    "          exercised for the selected currency.  This chart adds the option of XRP to the currency \n" +
    "          dropdown.\n" +
    "        </p>        \n" +
    "      </div>\n" +
    "      <div class=\"cell\">\n" +
    "        <h5>Trade Volume</h5>\n" +
    "        <p>\n" +
    "          The trade volume chart shows the volume of trade between the selected currency \n" +
    "          and XRP for each gateway that issues the selected currency.\n" +
    "        </p>  \n" +
    "      </div>\n" +
    "    </div>\n" +
    "    \n" +
    "  </div>\n" +
    "</div>\n" +
    "<div id=\"valueChart\" data-snap-ignore=\"true\"></div>");
}]);
