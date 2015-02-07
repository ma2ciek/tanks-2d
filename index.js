var express = require('express');
var bodyParser = require('body-parser');
var routes = require('./routes');
var methodOverride = require('method-override');

var app = module.exports = express();

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

app.post('/update', function(req, res) {
	console.log(req.body.tank_x);
});

var port = process.env.PORT || 8080;

app.listen(port, function() {
	console.log("Listening on %d", port);
});