'use strict'

angular.module('ripplecharts.validator', [
  'ui.state',
  'ui.bootstrap',
  'ui.route'
])

.config(function config($stateProvider) {
  $stateProvider
  .state('validator', {
    url: '/validators/:pubkey',
    views: {
      main: {
        controller: 'ValidatorCtrl',
        templateUrl: 'validators/validator.tpl.html'
      }
    },
    data: {pageTitle: 'Rippled Validator'}
  })
})

.controller('ValidatorCtrl', function ValidatorCtrl($scope, $state) {

  if (!$state.params.pubkey) {
    $state.transitionTo('validators')
    return
  }

  var apiHandler = new ApiHandler(API)

  $scope.reports = []
  $scope.loading = true
  $scope.status = 'Loading...'

  $scope.validator = {
    pubkey: $state.params.pubkey
  }

  apiHandler.getValidator($scope.validator.pubkey, function(err, validator) {
    if (err) {
      console.log('err')

    } else {
      $scope.validator.domain = validator.domain
      $scope.validator.domain_state = validator.domain_state
      $scope.$apply()
    }
  })

  apiHandler.getValidatorReports({
    pubkey: $scope.validator.pubkey
  }, function(err, reports) {
    $scope.loading = false
    $scope.status = err || ''

    if (err) {
      console.log(err)
    }

    if (reports && reports.length) {
      reports.forEach(function(v) {
        v.date = moment.utc(v.date)
        .format('dddd, MMMM D YYYY')
        var disagreement = v.total_ledgers - v.main_net_ledgers
        disagreement /= v.total_ledgers
        v.main_net_disagreement = disagreement.toFixed(5)
      })
    }

    $scope.reports = reports
    $scope.$apply()
  })
})
