
$(document).ready(function() {
	var iframes = {

	}
	$('.links').click(function(e) {
		var id = e.target.id;
		$('#content').empty();
		if ( id.indexOf('examples-') > -1 )
			$('#content').append('<iframe frameborder="0" src="' + id + '.html"/>');
		$('.about').hide();
		$('#content-' + id).show();
	});
});