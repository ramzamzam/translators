"use strict";
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
    ';',
];

const lexType = {
    "RESERVED": 0,
    "ID": 1,
    "const": 2
};

const lexemesTable = [];
const constTable = [];
const idTable = [];

let currentLexeme = '';
let currentLine = 0;
let varmode = false;
let headblock = false;

function LexicalAnalyzer(code) {
}

function addLexeme(lexeme, line, type, constIndex) {

    if(lexeme === 'head') headblock = true;
    if(lexeme === '}' && headblock) {
        headblock = false;
        varmode = false;
    }
    if(lexeme === 'fixed' && !varmode) varmode = true;

    let index = constIndex||'';
    if (lexemesList.includes(lexeme)) {
        type = lexType.RESERVED;
    } else if (!type && !isDelimiter(lexeme)) {
        type = lexType.ID;
        const declaredID = idTable.find(id => id.lexeme === lexeme);
        if (!declaredID) {
            index = addVar(lexeme, line);
        } else {
            index = declaredID.index;
        }
    }
    lexemesTable.push({
        lexeme,
        type,
        line: ++line,
        index
    });
    if (lexeme === '==') {
        lexeme = lexeme;
    }
    currentLexeme = '';
}

function addVar(lexeme, line) {
    if(lexemesList.includes(lexeme)) {
        console.log({lexemesTable})
        throw new Error(`Variable cannot be names as reserved word! line:${line}`);
    }

    if(idTable.find(id => id.lexeme === lexeme)) {
        throw new Error(`Variable cannot be declared twice! line:${currentLine}`);
    }
    const index = idTable.length;
    idTable.push({
        lexeme,
        line,
        index
    });
    // addLexeme(lexeme, line, lexType.ID)
    currentLexeme = '';
    return index;
}

function addNumber(lexeme, line) {
    const index = constTable.length;
    constTable.push({
        lexeme,
        line,
        index
    });
    addLexeme(lexeme, line, lexType.const, index);

    currentLexeme = '';
}

function isWhiteSpace(char) {
    return /\s+/.test(char);
}

function isCharacter(char) {
    return char >= 'A' && char <= 'z' ;
}

function isDigit(char) {
    return /\d/.test(char);
}

function isDelimiter(char) {
    return spaceDelimiter.test(char) || delimiters.includes(char);
}

// initial state
function mode1(char) {
    console.log(char, "1");

    if (currentLine === 7) {
        currentLexeme = currentLexeme;
    }

    if (isCharacter(char)) {
        currentLexeme += char;
        return 2;
    }

    if (isDigit(char)) {
        currentLexeme += char;
        return 3;
    }

    if (char === '=') {
        currentLexeme += char;
        return 5;
    }

    if (char === '!') {
        currentLexeme += char;
        return 6;
    }
    if (char === '>') {
        currentLexeme += char;
        return 7;
    }
    if (char === '<') {
        currentLexeme += char;
        return 8;
    }

    if(char === '-') {
        currentLexeme += char;
        return 9
    }

    if (isDelimiter(char)) {
        if (!isWhiteSpace(char) && char !== '\n') {
            currentLexeme += char;
            addLexeme(currentLexeme, currentLine, lexType.RESERVED);
        }

        if (char === '\n') {
            currentLine++;
            if(headblock && varmode) varmode = false;
        }
        return 1;
    }
    throw new Error(`Unknown symbol! line:${currentLine}`)
}

// БЦ
function mode2(char) {
    console.log(char, "2")

    if (isCharacter(char)) {
        currentLexeme += char;
        return 2;
    }

    if (isDigit(char)) {
        currentLexeme += char;
        return 2;
    }
    // TODO: check "varmode"
    // set varmode when declaration block ends
    if (varmode) {
        addVar(currentLexeme, currentLine);
    } else {
        addLexeme(currentLexeme, currentLine);
    }
    return mode1(char);
}

// fixed to dot
function mode3(char) {
    console.log(char, "3")

    if(isCharacter(char)) {
        throw new Error(`Variable cannot start with a number! line:${currentLine}`);
    }

    if (isDigit(char)) {
        currentLexeme += char;
        return 3;
    }

    if (char === '.') {
        currentLexeme += char;
        return 4;
    }

    if (varmode) {
        throw new Error('Variable cannot start with a number');
    } else {
        addNumber(currentLexeme, currentLine);
    }
    return mode1(char);
}

// fixed after dot
function mode4(char) {
    console.log(char, "4")

    if (isDigit(char)) {
        currentLexeme += char;
        return 4;
    }

    // if not number and not delimiter then err
    if (!isDelimiter(char)) {
        throw new Error(`Illegal char in fixed point number! line:${currentLine}`);
    } else {
        addNumber(currentLexeme, currentLine);
    }
    return mode1(char)
}

// = ==
function mode5(char) {
    console.log(char, "5")

    if (char === '=') {
        currentLexeme += char;
        addLexeme(currentLexeme, currentLine, lexType.RESERVED);
        return 1;
    }
    addLexeme(currentLexeme, currentLine, lexType.RESERVED);
    return mode1(char);
}

// !
function mode6(char) {
    console.log(char, "6")

    if (char === '=') {
        currentLexeme += char;
        addLexeme(currentLexeme, currentLine, lexType.RESERVED);
        return 1;
    }
    addLexeme(currentLexeme, currentLine, lexType.RESERVED);
    return mode1(char);
}

// >
function mode7(char) {
    console.log(char, "7")

    if (char === '=') {
        currentLexeme += char;
        addLexeme(currentLexeme, currentLine, lexType.RESERVED);
        return 1;
    }
    addLexeme(currentLexeme, currentLine, lexType.RESERVED);
    return mode1(char);
}

// <
function mode8(char) {
    console.log(char, "8")

    if (char === '=') {
        currentLexeme += char;
        addLexeme(currentLexeme, currentLine, lexType.RESERVED);
        return 1;
    }
    addLexeme(currentLexeme, currentLine, lexType.RESERVED);
    return mode1(char);
}

// -
function mode9(char) {
    if(isDigit(char)) return mode3(char);
    addLexeme(currentLexeme, currentLine, lexType.RESERVED);
    return 1;
}
function getMode(mode, ch) {
    switch (mode) {
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
        case 9 : {
            return mode9(ch);
        }
        default :
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
        lexemesTable : addEqualsMethod(lexemesTable),
        idTable : addEqualsMethod(idTable),
        constTable : addEqualsMethod(constTable)
    }
}
function addEqualsMethod(array) {
    array.forEach(el => {
        el.equals = function (lex) {
            return lex === el.lexeme;
        };
        el.isId = function() {
            return el.type === lexType.ID
        };
        el.isConst = function() {
            return el.type === lexType.const
        };
        // el.isId = function() {
        //     return el.type === lexType.ID
        // }

    });
    return array;
}

//// for debugging purposes
// const fs = require('fs');
// const file = fs.readFileSync('../public/code.txt').toString();
//
// console.log(analyze(file));

module.exports = {
    analyze,
    lexType
}