/**
 * Each section of the site has its own module. It probably also has
 * submodules, though this boilerplate is too simple to demonstrate it. Within
 * `src/app/home`, however, could exist several additional folders representing
 * additional modules that would then be listed as dependencies of this one.
 * For example, a `note` section could have the submodules `note.create`,
 * `note.delete`, `note.edit`, etc.
 *
 * Regardless, so long as dependencies are managed correctly, the build process
 * will automatically take take of the rest.
 *
 * The dependencies block here is also where component dependencies should be
 * specified, as shown below.
 */
angular.module( 'ripplecharts.landing', [
  'ui.state'
])

/**
 * Each section or module of the site can also have its own routes. AngularJS
 * will handle ensuring they are all available at run-time, but splitting it
 * this way makes each module more "self-contained".
 */
.config(function config( $stateProvider ) {
  $stateProvider.state( 'landing', {
    url: '/',
    views: {
      "main": {
        controller: 'LandingCtrl',
        templateUrl: 'landing/landing.tpl.html'
      }
    },
    data:{ pageTitle: 'Ripple Charts' }
  });
})

/**
 * And of course we define a controller for our route.
 */
.controller( 'LandingCtrl', function LandingCtrl( $scope ) {
  var feed = new TransactionFeed({id : 'liveFeed'});
  remote.on('transaction_all', feed.handleTransaction);
  
  var markets = new MultiMarket ({
    url   : API+"/offersExercised",  
    id    : "topMarkets",
    fixed : true
  });
  
  markets.list([
    {
      base  : {currency:"XRP"},
      trade : {currency:"USD",issuer:"rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B"}},
    {
      base  : {currency:"XRP"},
      trade : {currency:"CNY",issuer:"rnuF96W4SZoCJmbHYBFoJZpR8eCaxNvekK"}},
    {
      base  : {currency:"BTC",issuer:"rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B"},
      trade : {currency:"XRP"}}
    ]);
    
  $scope.$on("$destroy", function(){
    markets.list([]);
  });

  
  //get num accounts
  api = new ApiHandler(API);
  api.getTotalAccounts(null, function(total){
    $scope.totalAccounts = total;
    $scope.$apply();
  });
  
  api.getTopMarkets(function(data){
    var volume = 0;
    for (var i=0; i<data.length; i++) {
      volume += data[i][3];
    }
    
    $scope.tradeVolume = "$"+feed.commas(volume,2);
    $scope.$apply();
  });
  
});

