exports.index = function(req, res) {
	res.render('index');
};
exports.play = function(req, res) {
	res.render('game');
};
exports.tutorial = function(req, res) {
	res.render('tutorial');
}
exports.settings = function(req, res) {
	res.render('settings');
}
exports.beta = function(req,res) {
	res.render('beta');
}