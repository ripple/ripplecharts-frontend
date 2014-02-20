describe ('Config.js', function(){
  it ( 'should have MIXPANEL defined', inject( function(){
    expect (MIXPANEL).not.toBeUndefined();
  }));  
  
  it ( 'should have API defined', inject( function(){
    expect (API).not.toBeUndefined();
  }));  
  
  it ( 'should have Options defined', inject( function(){
    expect (Options).not.toBeUndefined();
  }));  
});

describe( 'AppCtrl', function() {
  describe( 'isCurrentUrl', function() {
    var AppCtrl, $location, $scope;

    beforeEach( module( 'ripplecharts' ) );

    beforeEach( inject( function( $controller, _$location_, $rootScope ) {
      $location = _$location_;
      $scope = $rootScope.$new();
      AppCtrl = $controller( 'AppCtrl', { $location: $location, $scope: $scope });
    }));

    it( 'should pass a dummy test', inject( function() {
      expect( AppCtrl ).toBeTruthy();
    }));
  });
});
