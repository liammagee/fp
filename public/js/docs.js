$(document).ready(function() {
	$('.examples').click(function(e) {
		var id = e.target.id;
		console.log(e)
		$('#content').empty();
		$('#content').append('<iframe frameborder="0" src="' + id + '.html"/>');
	}); 
});