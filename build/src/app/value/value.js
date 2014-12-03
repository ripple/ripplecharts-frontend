angular.module('ripplecharts.value', [
  'ui.state',
  'ui.bootstrap'
]).config([
  '$stateProvider',
  function config($stateProvider) {
    $stateProvider.state('value', {
      url: '/value',
      views: {
        'main': {
          controller: 'ValueCtrl',
          templateUrl: 'value/value.tpl.html'
        }
      },
      data: { pageTitle: 'Network Value' }
    });
  }
]).controller('ValueCtrl', [
  '$scope',
  function ValueCtrl($scope) {
    var dataType = store.session.get('valueChartData') || store.get('valueChartData') || 'Capitalization';
    var format = store.session.get('valueChartFormat') || store.get('valueChartFormat') || 'stacked';
    var range = store.session.get('valueChartRange') || store.get('valueChartRange') || 'max';
    var currency = store.session.get('valueChartCurrency') || store.get('valueChartCurrency') || 'USD';
    var cap = new CapChart({
        id: '#valueChart',
        url: API,
        resize: true,
        dataType: dataType,
        format: format,
        range: range,
        currency: currency,
        onchange: function (params) {
          store.session.set('valueChartData', params.dataType);
          store.session.set('valueChartFormat', params.format);
          store.session.set('valueChartRange', params.range);
          store.session.set('valueChartCurrency', params.currency);
          store.set('valueChartData', params.dataType);
          store.set('valueChartFormat', params.format);
          store.set('valueChartRange', params.range);
          store.set('valueChartCurrency', params.currency);
        }
      });
    $scope.$on('$destroy', function () {
      cap.suspend();
    });
  }
]);