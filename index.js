var bodyParser = require('body-parser');
var routes = require('./routes');
var methodOverride = require('method-override');
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.set('view engine', 'jade');
app.set('views', __dirname + '/views');
app.set('view options', {
	layout: false
});

app.use(bodyParser.urlencoded({
	extended: true
}))
app.use(bodyParser.json());
app.use(methodOverride())
app.use(express.static(__dirname + '/pub'));

app.get('/', routes.index);

var port = process.env.PORT || 8080;

io.on('connection', function(socket){
  	socket.broadcast.emit('n-message', 'Nowa osoba dołączyła do rozmowy');
  	socket.on('disconnect', function(){
    	io.emit('n-message', 'Osoba się rozłączyła');
	});
	socket.on('message', function(msg){
		socket.broadcast.emit('message', msg);
	});
});
setInterval(function() {
	var clients = io.engine.clientsCount
	if(clients == 1) clients += ' person connected';
	else clients += ' persons connected'
	io.emit('clients', clients);
}, 1000);


http.listen(3000, function(){
  console.log('listening on *:3000');
});