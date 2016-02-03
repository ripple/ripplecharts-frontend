/* config vars must be global */

//API      = "" //moved to deployment.environments.json;
//MIXPANEL = "" //moved to deployment.environments.json;

Options = {
  theme     : "light",
  base      : {currency:"BTC", issuer:"rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B"},
  trade     : {currency:"XRP", issuer:""},
  chartType : "line",
  interval  : "15m",
  range     : {name: "1d"},

  ripple    : {
    "server": "wss://s1.ripple.com:443"
  }
}
