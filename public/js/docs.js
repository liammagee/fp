
$(document).ready(function() {
	$('.links').click(function(e) {
		var id = e.target.id;
        $('.heading').hide();
        $('#heading-' + id).show();
        $('.content').hide();
        $('#content-' + id).show();
        $('#model').empty();

        if ( id.indexOf('example') > -1 ) {
            $('#model').append('<iframe frameborder="0" src="examples/' + id + '.html"/>');
        }
	});
});
