##Price Chart

Widget for embedding a modifiable chart within any website.  The widget is capable 
of loading from the query string or from custom parameters.


###How to Use:


##Configuration options:
 
  id        : id of element that will contain the chart. if not specified, the chart will be appended the body
  bodyTheme : true/false - setting true will apply the chart theme to the entire document, defaults to false
  customCSS : true/false - disables the default styling
  apiURL    : custom url for the API backend, defaults to ripplecharts.com API
  width     : width of chart
  height    : height of chart
  margin    : e.g. "{top:50,bottom:50,left:50,right:50}" - axis labels are drawn in the margin

##Chart options:

  theme    : "light", "dark"
  type     : "line", "candlestick"
  base     : e.g "{currency:'USD',issuer:'rXaiz....'}"  
  trade    : e.g "{currency:'BTC',issuer:'rXaiz....'}"
  start    : e.g "January 2, 2014 1:15pm"   - moment.js readable date/time
  end      : e.g "Feb 12, 2014"             - moment.js readable date/time
  interval : "second","minute","hour","day","week","month"
  multiple : e.g 1,5  - integer applied to interval, such as 5 minutes, 4 hours, etc.


###EXAMPLES:

####Embedded IFRAME:

<iframe src='http://ripplecharts.com/embed/pricechart?theme=dark&type=line&trade={"currency":"USD","issuer":"rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B"}&base={"currency":"XRP"}'/>


####Javascript object:

<script type="text/javascript" src="http://ripplecharts.com/embed/pricechart/script.js"></script>
<script>

 //load from the query string
 PriceChartWidget().loadFromQS();



 //load from params
 var chart = PriceChartWidget({ 
   id     : "priceChart",
   width  : 400,
   height : 500,
   margin : {top:50, bottom:70, left:80, right:80}
   })

 chart.load({
   base : {
     "currency":"XRP"
   },
   trade : {
     "currency":"USD",
     "issuer":"rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B"
   },
     
   interval : "hour",
   theme    : "dark",         
 }); 

 
 
 //multiple charts
 var one = new PriceChartWidget({id:"FirstChart"});
 var two = new PriceChartWidget();
 
 one.load({
   base:{
     "currency":"XRP"
   },
   trade: {
     "currency":"USD",
     "issuer":"rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B"
   },
   
   interval:"hour",
   theme:"dark",
   });
 
 
   two.load({
   base:{
     "currency":"XRP"
   },
   trade: {
     "currency":"USD",
     "issuer":"rMwjYedjc7qqtKYVLiAccJSmCwih4LnE2q"
   },
   
   interval:"hour",
   theme:"light",
   type:"line"
 });