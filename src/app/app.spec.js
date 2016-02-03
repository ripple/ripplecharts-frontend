describe( 'AppCtrl', function() {

  it ( 'should have Options defined', inject( function(){
    expect (Options).not.toBeUndefined();
  }));

  it ( 'should have Options.ripple defined', inject( function(){
    expect (Options.ripple).not.toBeUndefined();
  }));

  it ( 'should have Options.ripple.server defined', inject( function(){
    expect (Options.ripple.server).not.toBeUndefined();
  }));


  describe( 'isCurrentUrl', function() {
    var AppCtrl, $location, $scope;

    beforeEach( module( 'ripplecharts' ) );

    beforeEach( inject( function( $controller, _$location_, $rootScope ) {
      $location = _$location_;
      $scope = $rootScope.$new();
      AppCtrl = $controller( 'AppCtrl', { $location: $location, $scope: $scope });
    }));

    //it( 'should pass a dummy test', inject( function() {
    //  expect( AppCtrl ).toBeTruthy();
    //}));
  });
});
