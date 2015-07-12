$(document).ready(function() {
	$('.links').click(function(e) {
		var id = e.target.id;
        $('.heading').hide();
        $('#heading-' + id).show();
        $('.content').hide();
        $('#content-' + id).show();
        $('#model').empty();

        var parts = id.split('-');

        if ( parts.length >= 2 && parts[ 0 ] === "example" ) {
            var len = parts.length;
            var folder = parts[ 1 ];
            var name = parts.slice( 2, len ).join( '-' );
            $('#model').append('<iframe frameborder="0" src="examples/' + folder + '/' + name + '.html"/>');
        }
	});
});
