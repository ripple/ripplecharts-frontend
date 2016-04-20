angular.module( 'ripplecharts.transactions', [
  'ui.state'
])

.config(function config( $stateProvider ) {
  $stateProvider
  .state('transactions', {
    url: '/transactions',
    views: {
      "main": {
        controller: 'TransactionsCtrl',
        templateUrl: 'transactions/transactions.tpl.html'
      }
    },
    data: {
      pageTitle: 'Transactions'
    }
  })
  .state('transactions.tx_hash', {
    url: '/:tx_hash',
    data: {
      pageTitle: 'Transactions'
    }
  });
})

.controller('TransactionsCtrl',
            function TransactionsCtrl($scope, $state, $location, $interval) {
  var timer;

  $scope.$watch(function() {
    return $location.url();
  }, function(url) {
    $scope.tx_hash = $scope.input_tx_hash = $state.params.tx_hash;
  });

  $scope.$watch('tx_hash', handleTransition);

  $scope.load = function() {
    $scope.tx_hash = $scope.input_tx_hash;
  };

  function handleTransition(hash) {
    if (hash) {
      $state.transitionTo('transactions.tx_hash', {
        tx_hash: hash
      });
    } else {
      $state.transitionTo('transactions');
    }
  }
});
