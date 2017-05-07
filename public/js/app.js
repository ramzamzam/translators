document.addEventListener("DOMContentLoaded", function(event) { 

	const codeArea = document.querySelector('textarea#code');
	const translateCode = document.querySelector('a#js-translate-code') ;

	translateCode.addEventListener('click', function(event) {
		const code = codeArea.value;
		const request = new XMLHttpRequest();
		request.open('POST', '/translate', true);
		request.setRequestHeader("Content-type", "application/json");

		const formData = new FormData();
		formData.append('code', code);
		request.send(JSON.stringify({ code }));
		request.onreadystatechange = function() {
			if(request.readyState !== 4) return;

			console.log(`${request.status} : ${request.statusText}`);
			console.log(request.response);
		}
	});
})