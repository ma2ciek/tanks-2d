'use strict';
$(document).ready(function() {

	var nick = localStorage.getItem('nick');
	if (nick)
		$('#play input').val(nick);
	changelog();
})

function play() {
	if ($('#play input').val().length != 0) {
		localStorage.setItem('nick', $('#play input').val());
		location.href = '/play';
	}
}

function changelog() {
	$.getJSON('data/logs.json', function(data) {
		var logs = data;
		var start = 88;
		$('.changes').text('');
		for (var i = 0; i < Math.min(logs.length, 10) && i < logs.length - start; i++) {
			$('.changes').append('<div class="comm"></div>');
			$('.comm:last-child').append('<div class="commit-nr">#<span>' + ('000' + (logs.length - i-start)).slice(-3) + '</span></div>');
			for (var j in logs[i]) {
				if (j == 'message') {
					var msg = logs[i][j].split('; ');
					$('.comm:last-child').append('<ul class="message">');
					for (var k in msg) {
						$('.comm:last-child .message:last-child').append('<li class="msg">' + msg[k] + '</li>')
					}
				} else {
					$('.comm:last-child').append('<div class="' + j + '">' + logs[i][j] + '</div>')
				}
			}
		}
	});
}