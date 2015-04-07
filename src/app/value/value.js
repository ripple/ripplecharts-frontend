angular.module( 'ripplecharts.value', [
  'ui.state',
  'ui.bootstrap'
])

.config(function config( $stateProvider ) {
  $stateProvider.state( 'value', {
    url: '/value',
    views: {
      "main": {
        controller: 'ValueCtrl',
        templateUrl: 'value/value.tpl.html'
      }
    },
    data:{ pageTitle: 'Network Value' },
    resolve : {
      gateInit : function (gateways) {
        return gateways.promise;
      }
    }
  });
})

.controller( 'ValueCtrl', function ValueCtrl( $scope, gateways ) {

  var dataType = store.session.get('valueChartData')     || store.get('valueChartData')     || "Capitalization";
  var format   = store.session.get('valueChartFormat')   || store.get('valueChartFormat')   || "stacked";
  var range    = store.session.get('valueChartRange')    || store.get('valueChartRange')    || "max";
  var currency = store.session.get('valueChartCurrency') || store.get('valueChartCurrency') || "USD";
  
//CapitalizationChart(); //old version
  var cap = new CapChart ({
    id       : "#valueChart",
    url      : API,  
    resize   : true,
    dataType : dataType,
    format   : format,
    range    : range,
    currency : currency,
    gateways : gateways,
    onchange : function(params) {
 
      store.session.set('valueChartData',     params.dataType);
      store.session.set('valueChartFormat',   params.format);
      store.session.set('valueChartRange',    params.range);
      store.session.set('valueChartCurrency', params.currency);     
      
      store.set('valueChartData',     params.dataType);
      store.set('valueChartFormat',   params.format);
      store.set('valueChartRange',    params.range);
      store.set('valueChartCurrency', params.currency);   
    }
  });
  
//stop the listeners when leaving page  
  $scope.$on("$destroy", function(){
    cap.suspend();
  });    
});
