const express = require('express');
const app = express();
const bodyParser = require('body-parser');

const SA = require('./lib/syntatic_analyzer');
const RPNBuilder = require('./lib/poliz');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));
// app.use(bodyParser.urlencoded({extended : true}));
// app.use(bodyParser.json());


app.get('/', function (req, res) {
  res.sendFile('public/index.html');
});

let _tables;
app.post('/translate', function(req, res) {
	// console.log(req)
	try {
        const tables = SA(req.body.code);
        _tables = tables;
        return res.status(200).json(tables);
    } catch(err) {
	    console.log(err)
	    res.status(500).end(err.toString().replace('\n', '¶'));
    }
	// return res.json({done : true});
});

app.post('/rpn', function (req, res) {
    const builder = new RPNBuilder(_tables);
    try {
        const result = builder.extractLabels(builder.build());
        result.history = builder.rpnHistory;
        console.log({history : result.history});
        return res.json(result);

    } catch (err) {
        console.log(err);
        return res.status(500).end(err.toString())
    }
})

app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});