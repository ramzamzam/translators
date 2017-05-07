const express = require('express');
const app = express();
const bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));
// app.use(bodyParser.urlencoded({extended : true}));
// app.use(bodyParser.json());


app.get('/', function (req, res) {
  res.sendFile('public/index.html');
});

app.post('/translate', function(req, res) {
	// console.log(req)
	console.log(req.body.code);
	return res.json({done : true});
});

app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});