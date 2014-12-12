angular.module( 'ripplecharts.history', [
	'ui.state',
	'ui.bootstrap'
])

.config(function config( $stateProvider ) {
	$stateProvider.state( 'history', {
		url: '/history',
		views: {
			"main": {
				controller: 'HistoryCtrl',
				templateUrl: 'history/history.tpl.html'
			}
		},
		data:{ pageTitle: 'History' }
	});
})

.controller( 'HistoryCtrl', function HistoryCtrl( $scope ) {

	var history = new TotalHistory({
		url    : API,
		id     : 'totalHistory',
		resize : true
	});
});
