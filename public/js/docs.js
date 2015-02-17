
$(document).ready(function() {
	$('.links').click(function(e) {
		var id = e.target.id;
        $('.heading').hide();
        $('#heading-' + id).show();
        $('.content').hide();
        $('#content-' + id).show();

        console.log(id)
        if (id.indexOf('examples') > -1) {
            $('#model').empty();
            $('#model').append('<iframe frameborder="0" src="' + id + '.html"/>');
        }
	});
});
