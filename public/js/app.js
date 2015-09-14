require.config({

  baseUrl: '/js',
  // paths: {  'fp': 'fp' }
  paths: {  'fp': 'dist/fp' }

});

define( [ "fp" ], function( fp ) {

    fp.init( undefined, undefined, function() {

    	fp.appController.Setup();	
    	fp.appController.Run();	

    });

    // Trigger Jasmine
    if ( window.onload !== null ) {

        window.onload();

    }

});
