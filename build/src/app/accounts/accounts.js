angular.module('ripplecharts.accounts', [
  'ui.state',
  'ui.bootstrap'
]).config([
  '$stateProvider',
  function config($stateProvider) {
    $stateProvider.state('accounts', {
      url: '/accounts',
      views: {
        'main': {
          controller: 'AccountsCtrl',
          templateUrl: 'accounts/accounts.tpl.html'
        }
      },
      data: { pageTitle: 'Accounts' }
    });
  }
]).controller('AccountsCtrl', [
  '$scope',
  function AccountsCtrl($scope) {
    accounts = new TotalAccounts({
      url: API,
      id: 'totalAccounts',
      resize: true
    });
    $scope.$on('$destroy', function () {
      accounts.suspend();
    });
  }
]);