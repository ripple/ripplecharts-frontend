angular.module( 'ripplecharts.validators', [
  'ui.state',
  'ui.bootstrap'
])

.config(function config( $stateProvider ) {
  $stateProvider.state( 'validators', {
    url: '/validators',
    views: {
      "main": {
        controller: 'ValidatorsCtrl',
        templateUrl: 'validators/validators.tpl.html'
      }
    },
    data:{ pageTitle: 'Validators' }
  });
})

.controller( 'ValidatorsCtrl', function ValidatorsCtrl( $scope ) {

  var apiHandler = new ApiHandler(API);

  $scope.loading = true;
  $scope.status = 'Loading...';
  $scope.validators = [];

  apiHandler.getValidators(function(err, validators) {
    $scope.loading = false;
    $scope.status = err || '';

    if (err) {
      console.log(err);
    }

    if (validators && validators.length) {
      $scope.date = moment.utc(validators[0].date)
        .format('llll') + ' UTC';
    }

    $scope.reports = validators;
    $scope.$apply();
  });
});
