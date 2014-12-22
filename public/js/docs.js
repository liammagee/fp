$(document).ready(function() {
	$('.links').click(function(e) {
		var id = e.target.id;
		$('#content').empty();
		$('#content').append('<iframe frameborder="0" src="' + id + '.html"/>');
	}); 


});