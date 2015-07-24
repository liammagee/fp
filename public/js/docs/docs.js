$(document).ready(function() {
	$('.links').click(function(e) {
		var id = e.target.id;
        var parts = id.split('-');
        var len = parts.length;
        var key = parts[ 0 ];
        var folder = parts[ 1 ];
        var name = parts.slice( 2, len ).join( '-' );

        $('.heading').hide();
        $('#heading-' + id).show();
        $('.content').hide();
        $('#content-' + id).show();
        $('.content-group').hide();
        $('#content-group-intro-' + folder).show();
        $('#model').empty();

        if ( key === "example" ) {
            $('#model').append('<iframe frameborder="0" src="examples/' + folder + '/' + name + '.html"/>');
        }
	});
});
