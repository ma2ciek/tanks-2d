$(document).ready(function() {

	var nick = localStorage.getItem('nick');
	if(nick) 
		$('#play input').val(nick);
})

function play() {
	if($('#play input').val().length != 0) {
		localStorage.setItem('nick', $('#play input').val());
		location.href = '/play';
	}
}