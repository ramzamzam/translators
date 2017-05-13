let lexTables;
let builder;
let rnp;
let extracted;
document.addEventListener("DOMContentLoaded", function(event) {
    // const editor = ace.edit('editor');
    // editor.getSession().setMode("ace/mode/javascript");
	const codeArea = document.querySelector('textarea#code');
    // $('textarea#code').numberedtextarea({
	 //    color : '#000'
    // });
	if(localStorage['code-translators']) codeArea.value = localStorage['code-translators'];
	const translateCode = document.querySelector('a#js-translate-code') ;
    const buildRPNButton = document.querySelector('a#js-build-rpn');
    const runButton = document.querySelector('a#js-run-rpn');
	translateCode.addEventListener('click', function(event) {
		const code = codeArea.value;
		try {
		    lexTables = SA(code, LA);
            showTables(lexTables);
            buildRPNButton.removeAttribute('disabled');
            runButton.removeAttribute('disabled');
		} catch(err) {
		    alert(err.toString());
        }
    });

    runButton.addEventListener('click', function () {
        builder.eval(extracted.rpn, extracted.labelsTable);
    });
	// 	const request = new XMLHttpRequest();
	// 	request.open('POST', '/translate', true);
	// 	request.setRequestHeader("Content-type", "application/json");
    //
	// 	const formData = new FormData();
	// 	formData.append('code', code);
	// 	request.send(JSON.stringify({ code }));
	// 	request.onreadystatechange = function() {
	// 		if(request.readyState !== 4) return;
    //
	// 		if(request.status != 200) {
	// 		    alert(request.response);
	// 		    return;
     //        }
     //        localStorage['code-translators'] = code;
    //
	// 		console.log(`${request.status} : ${request.statusText}`);
	// 		console.log(request.response);
	// 		showTables(JSON.parse(request.response));
	// 		buildRPNButton.removeAttribute('disabled');
	// 	}
	// });
    buildRPNButton.addEventListener('click', function(event) {
        builder = new RPNBuilder(lexTables);
        rnp = builder.build();
        extracted = builder.extractLabels(rnp);
        extracted.history = builder.rpnHistory;
        showRPN(extracted);
        // const request = new XMLHttpRequest();
        // request.open('POST', '/rpn', true);
        // request.setRequestHeader("Content-type", "application/json");
        //
        // request.send();
        // request.onreadystatechange = function() {
        //     if(request.readyState !== 4) return;
        //
        //     console.log(`${request.status} : ${request.statusText}`);
        //     console.log(request.response);
        //     // showTables(JSON.parse(request.response));
        //     // buildRPNButton.removeAttribute('disabled');
        //     showRPN(JSON.parse(request.response));
        //
        // }
    })
});

const lexTableTemplate = Handlebars.compile(`
<h4>{{title}}</h4>
<table class="table table-striped">
<thead>
    <tr><td>Lexeme</td><td>Line</td>{{#if type}}<td>Type</td>{{/if}}<td>Index</td></tr>
</thead>
<tbody>
    {{#each table}}
    <tr><td>{{lexeme}}</td><td>{{line}}</td>{{#if ../type}}<td>{{type}}</td>{{/if}}<td>{{index}}</td></tr>
    {{/each}}
</tbody>
`);

function showTables(tables) {
    lexTables = tables;
    const lexemeTableDiv = document.querySelector('.js-lex-table');
    tables.lexemesTable.forEach(l => l.lexeme = l.lexeme? l.lexeme.replace('\n','¶'):null);
    lexemeTableDiv.innerHTML = lexTableTemplate({table : tables.lexemesTable, type : true ,title:"Lexemes"});
    const idTable = document.querySelector('.js-id-table');
    idTable.innerHTML = lexTableTemplate({table : tables.idTable, title : "ID"});
    const constTable = document.querySelector('.js-const-table');
    constTable.innerHTML = lexTableTemplate({table : tables.constTable, title : "CONST"});

}

const labelsTableTemplate = Handlebars.compile(`
<h3>Label</h3>
<table class="table table-striped">
<thead>
    <tr><td>Lable</td><td>Link</td></tr>
</thead>
<tbody>
{{#each labels}}
    <tr><td>{{@key}}</td><td>{{this}}</td></tr>
{{/each}}
</tbody>
</table>
`);

const rpnTemplate = Handlebars.compile(`
<h3>RPN</h3>
<table class="table table-striped">
<thead>
    <tr><td>#</td><td></td></tr>
</thead>
<tbody>
{{#each rpn}}
    <tr><td>{{@index}}</td><td>
        {{#if lexeme}}{{lexeme}}{{/if}}
        {{#if isLabel}}{{label}}{{/if}}
        {{#if isJ}}{{text}}{{/if}}
        </td></tr>
{{/each}}
</tbody>
</table>
`)

const historyTemplate = Handlebars.compile(`
<h3>History</h3>
<table class="table table-striped">
<thead>
    <tr><td>input</td><td>stack</td><td>output</td></tr>
</thead>
<tbody>
{{#each history}}
      <tr><td>{{lexeme}}</td><td>{{stack}}</td><td>{{output}}</td></tr>
{{/each}}
</tbody>
</table>
`)
function showRPN(data) {
    const labelsContainer = document.querySelector('.js-poliz-labels');
    labelsContainer.innerHTML = labelsTableTemplate({labels : data.labelsTable});
    const polizListContainer = document.querySelector('.js-poliz-list');
    polizListContainer.innerHTML = rpnTemplate({rpn : data.rpn});

    const historyContainer = document.querySelector('.js-poliz-history');
    historyContainer.innerHTML = historyTemplate({history : data.history});
}