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

  $scope.$on('$stateChangeSuccess', function () {
    $scope.tx_hash = $scope.input_tx_hash = $state.params.tx_hash;
  })

  $scope.$watch('tx_hash', handleTransition);

  $scope.load = function() {
    $scope.tx_hash = $scope.input_tx_hash;
  };

  $scope.toggleFeed = function () {
    $scope.feedHidden = !$scope.feedHidden;
    $scope.toggleText = $scope.feedHidden ? 'Show Feed' : 'X';
    store.set('feedHidden', $scope.feedHidden);
  };

  $scope.feedHidden = !(store.get('feedHidden') || false);
  $scope.toggleFeed();

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
