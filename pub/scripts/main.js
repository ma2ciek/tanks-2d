$(document).ready(function() {
	eventListeners();
})
	

function eventListeners() {
	$('#play').click(function() {
		location.pathname = '/game'
	});
}		