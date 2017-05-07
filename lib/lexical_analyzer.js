
const lexemes = require('./lexemes');
const lexemesList = Object.keys(lexemes);
const spaceDelimiter = /[\s\n]/;
const delimiters = [
	'=',
    '==',
	'\n',
	'(',
	')',
	'[',
	']',
	'+',
	'-',
	'*',
	'/',
	' ',
    ',',
    '{',
    '}',
    '&',
    '|',
    ';'
];

const lexType = {
	"RESERVED": 0,
	"ID": 1,
	"const": 2
};

const lexemesTable = [];
const constTable = [];
const idTable = [];
	
let currentLexeme ='';
let currentLine = 0;
let varmode = false;


function LexicalAnalyzer(code) {
}

function addLexeme(lexeme, line, type) {
    if(lexemesList.includes(lexeme)) {
        type = lexType.RESERVED;
    } else if(!type) {
        type = lexType.ID;
        addVar(lexeme, line);
    }
    lexemesTable.push({
        lexeme,
        type,
        line : ++line
    });

    currentLexeme = '';
}

function addVar(lexeme, line) {
	const index = idTable.length;
	idTable.push({
		lexeme,
		line,
		index
	});
	// addLexeme(lexeme, line, lexType.ID)
    currentLexeme = '';
}

function addNumber(lexeme, line) {
	const index = constTable.length;
	constTable.push({
		lexeme,
		line,
		index
	});
    addLexeme(lexeme, line, lexType.const);

    currentLexeme = '';
}

function isCharacter(char) {
    return char >= 'A' && char <= 'z' || char == '.';
}

function isDigit(char) {
	return /\d/.test(char);
}

function isDelimiter(char) {
	return spaceDelimiter.test(char) || delimiters.includes(char); 
}

// initial state
function mode1(char) {
	console.log(char,"1");

    if(currentLine === 7) {
	    currentLexeme = currentLexeme;
    }

	if(isCharacter(char)) {
		currentLexeme += char;
		return 2;
	}

	if(isDigit(char)) {
		currentLexeme += char;
		return 3;
	}

	if(char === '=') {
	    currentLexeme += char;
	    return 5;
    }

	if(char === '!') {
        currentLexeme += char;
        return 6;
    }
	if(char === '>') {
        currentLexeme += char;
        return 7;
    }
	if(char === '<') {
        currentLexeme += char;
        return 8;
    }

	if(isDelimiter(char)) {
		if(char !== ' ' && char !== '\n') {
		    currentLexeme += char;
			addLexeme(currentLexeme, currentLine, lexType.RESERVED);
		}

		if(char === '\n') {
			currentLine++;
		}
		return 1;
	}

}

// БЦ
function mode2  (char) {
console.log(char,"2")

	if(isCharacter(char)) {
		currentLexeme += char;
		return 2;
	}

	if(isDigit(char)) {
		currentLexeme += char;
		return 2;
	}
	// TODO: check "varmode"
	// set varmode when declaration block ends
	if(varmode) {
		addVar(currentLexeme, currentLine);
	} else {
		addLexeme(currentLexeme, currentLine);
	}
	return mode1(char);
}

// fixed to dot
function mode3  (char) {
console.log(char,"3")

	if(isDigit(char)) {
		currentLexeme += char;
		return 3;
	}

	if(char === '.') {
		currentLexeme += char;
		return 4;
	}

	if(varmode) {
		throw new Error('Variable cannot start with a number');
	} else {
		addNumber(currentLexeme, currentLine);
	}
	return mode1(char);
}

// fixed after dot
function mode4  (char) {
console.log(char,"4")

	if(isDigit(char)) {
		currentLexeme += char;
		return 4;
	}

	// if not number and not delimiter then err
	if(!isDelimiter(char)) {
		return new Eror('Illegal char in fixed point number!');
	} else {
		addNumber(currentLexeme, currentLine);
	}
	return mode1(char)
}

// = ==
function mode5  (char) {
console.log(char,"5")

	if(char === '=') {
		currentLexeme += char;
		addLexeme(currentLexeme, currentLine, lexType.RESERVED);
	}
	addLexeme(currentLexeme, currentLine, lexType.RESERVED);
	return mode1(char);
}

// !
function mode6  (char) {
console.log(char,"6")

	if(char === '=') {
		currentLexeme += char;
		addLexeme(currentLexeme, currentLine, lexType.RESERVED);
	}
	addLexeme(currentLexeme, currentLine, lexType.RESERVED);
	return mode1(char);
}

// >
function mode7  (char) {
console.log(char,"7")

	if(char === '=') {
		currentLexeme += char;
		addLexeme(currentLexeme, currentLine, lexType.RESERVED);
	}
	addLexeme(currentLexeme, currentLine, lexType.RESERVED);
	return mode1(char);
}

// <
function mode8  (char) {
console.log(char,"8")

	if(char === '=') {
		currentLexeme += char;
		addLexeme(currentLexeme, currentLine, lexType.RESERVED);
	}
	addLexeme(currentLexeme, currentLine, lexType.RESERVED);
	return mode1(char);
}

function getMode(mode, ch) {
        switch(mode) {
            case 1: {
                return mode1(ch);
            }
            case 2: {
                return mode2(ch);
            }
            case 3: {
                return mode3(ch);
            }
            case 4: {
                return mode4(ch);
            }
            case 5: {
                return mode5(ch);
            }
            case 6: {
                return mode6(ch);
            }
            case 7: {
                return mode7(ch);
            }
      		case 8: {
                return mode8(ch);
            }
        return -1;
    }
}

function analyze(code) {
	let mode = 1;
	for (let i = 0; i < code.length; i++) {
		// console.log('at char ' + i + ' ' + code[i])
		mode = getMode(mode, code[i]);
		// console.log(mode)
	}
	return {
		lexemesTable,
		idTable,
		constTable
	}
}

//// for debugging purposes
const fs  = require('fs');
const file = fs.readFileSync('../public/code.txt').toString();

console.log(analyze(file));