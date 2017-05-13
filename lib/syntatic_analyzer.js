"use strict";
const LA = require('./lexical_analyzer');
const lexType = LA.lexType;

let previousLexeme;
let currentLexeme;
let lexemeIndex = 0;
let declaredVariables = [];

function analyze(code) {
    currentLexeme = null;
    lexemeIndex = 0;
    declaredVariables = [];

    let tables;
    try {
        tables = LA.analyze(code);
    } catch (err) {
        //console.log(err);
        throw err;
    }
    const nextLexeme = LexemeIterator(tables.lexemesTable);
    let current;
    if(!tables.lexemesTable.length) throw new Error('Empty program');
    if (!(current = nextLexeme()).equals('prog')) return expected('prog', current);
    if (!(current = nextLexeme()).isId()) return expected('id', current);
    if (!(current = nextLexeme()).isNewLine()) return expected('new line', current);
    if (!(current = nextLexeme()).equals('head')) return expected('head', current);
    if (!(current = nextLexeme()).equals('{')) return expected('{', current);
    if (!(current = nextLexeme()).isNewLine()) return expected('new line', current);
    const declEnd = declarationList(nextLexeme);
    if (!declEnd.equals('}')) return expected('}', declEnd);
    if (!(current = nextLexeme()).equals('body')) return expected('body', current);
    if (!(current = nextLexeme()).equals('{')) return expected('{', current);
    if (!(current = nextLexeme()).isNewLine()) return expected('new line', current);
    const bodyEnd = operatorsList(nextLexeme);
    if (!bodyEnd.equals('}')) return expected('}', bodyEnd);
    if(nextLexeme()) throw new Error('Unexpected symbol in the end of program!');
    return tables;
}

function declarationList(nextLexeme) {
    if (!(currentLexeme = nextLexeme()).equals('fixed')) return expected('type name');
    const endDecl = idList(nextLexeme, true);
    if (!endDecl.isNewLine()) return expected('new line');
    return nextLexeme();
}

function idList(nextLexeme, inDeclaration) {
    let current = nextLexeme();
    if (!current.isId()) return expected('id', current);
    if (inDeclaration) declaredVariables.push(current);
    let next;
    while (current.isId()) {
        if (inDeclaration) declaredVariables.push(current);
        if (!(next = nextLexeme()).equals(',')) return next;
        // console.log(current)
        current = nextLexeme();
    }
    return current;
}

// function read(nextLexeme) {
//
// }

function operatorsList(nextLexeme, inIfStatement) {
    let current = operator(nextLexeme);
    if (!current.isNewLine()) return expected('new line', current);
    current = nextLexeme();
    // TODO add '\n' deleimiter to lexemes table;
    while (!current.equals('}')) {
        nextLexeme(-1);
        current = operator(nextLexeme);
        if (!current.isNewLine()) return expected('new line', current);
        current = nextLexeme();
        if (!current) throw new Error('Unexpected end of program!');
    }
    // if(inIfStatement) current = nextLexeme();
    return current;
}

function operator(nextLexeme) {
    return unmarkedOperator(nextLexeme);
}

function unmarkedOperator(nextLexeme) {
    // assignment
    let current = nextLexeme();
    if (current.isId()) {
        if ((current = nextLexeme()).equals('=')) {
            return expression(nextLexeme);
        } else {
            return expected(' = ', current);
        }
    } else if (current.equals('read') || current.equals('print')) {
        if (!(current = nextLexeme()).equals('(')) return expected('(', current);
        current = nextLexeme();
        if(!current.isId()) return expected('id', current);
        current = nextLexeme();
        if (!current.equals(')')) return expected(')', current);
        return nextLexeme();
    } else if (current.equals('for')) {
        if (!(current = nextLexeme()).equals('(')) return expected('(', current);
        if (!(current = nextLexeme()).isId()) return expected('id', current);
        if (!(current = nextLexeme()).equals('=')) return expected('=', current);
        current = expression(nextLexeme);
        if (!current.equals(';')) expected(';', current);
        current = LV(nextLexeme);
        if (!current.equals(';')) expected(';', current);
        if (!(current = nextLexeme()).isId()) return expected('id', current);
        if (!(current = nextLexeme()).equals('=')) return expected('=', current);
        current = expression(nextLexeme);
        if (!current.equals(')')) return expected(')', current);
        if (!(current = nextLexeme()).isNewLine()) return expected('new line', current);
        current = operator(nextLexeme);
        return current;
    } else if (current.equals('if')) {
        if (!(current = nextLexeme()).equals('(')) return expected('(', current);
        current = LV(nextLexeme);
        if (!current.equals(')')) return expected(')', current);
        if (!(current = nextLexeme()).equals('{')) return expected('{', current);
        if (!(current = nextLexeme()).isNewLine()) return expected('new line', current);
        current = operatorsList(nextLexeme, true);
        if (!current.equals('}')) return expected('}', current);
        return nextLexeme();
    } else {
        throw new Error(`unexpected symbol: ${current.lexeme}, line: ${current.line}`);
    }
    // return current;
}
function LV(nextLexeme) {
    let current = LT(nextLexeme);
    while (current.equals('|')) {
        current = LT(nextLexeme);
    }
    return current; //TODO : check
}

function LT(nextLexeme) {
    let current = LM(nextLexeme);

    while (current.equals('&')) {
        current = LM(nextLexeme);
    }
    return current;
}

function LM(nextLexeme) {
    let current = nextLexeme();
    if (current.equals('!')) {
        return LM(nextLexeme)
        // current = nextLexeme();
    }
    if (current.equals("[")) {
        current = LV(nextLexeme);
        if (!current.equals("]")) return expected(']', current);
        return nextLexeme();
    } else {
        current = expression(nextLexeme, true);
        if (!['>', '<', '>=', '<=', '!=', '=='].includes(current.lexeme)) return expected('condition sign', current);
        return expression(nextLexeme);
    }
}

function expression(nextLexeme, currLex) {

    let current = term(nextLexeme, currLex);
    while (current.equals('-') || current.equals('+')) {
        current = term(nextLexeme);
    }
    return current;
}

function term(nextLexeme, currLex) {
    let current = multiplier(nextLexeme, currLex);
    while (current.equals('*') || current.equals('/')) {
        current = multiplier(nextLexeme);
    }
    return current;
}

function multiplier(nextLexeme, currLex) {
    let current = nextLexeme(currLex);
    if (current.equals("(")) {
        current = expression(nextLexeme);
        if (!current.equals(')')) return expected(')', current);
        return nextLexeme(); //TODO: CHECK THIS
    }
    if (current.equals('-')) {
        // negative consts
        if (!(current = nextLexeme()).isConst()) return expected('const', current);
        return nextLexeme();
    } else if (current.isId()) {
        if (!declaredVariables.find(c => c.lexeme === current.lexeme)) {
            throw new Error(`Variable "${current.lexeme}" is not declared! line: ${current.line}`);
        }
        return nextLexeme();
    } else if (current.isConst()) {
        return nextLexeme();
    } else {
        return expected('id or const', current);
    }
}

function expected(symbol, currentLexeme, current) {
    throw new Error(`${symbol} expected` + (currentLexeme ? ` , got: ${currentLexeme.lexeme}, line: ${currentLexeme.line}` : ''));
}

function LexemeIterator(lexemes) {
    let index = 0;
    return function next(current) {
        if (current == -1) {
            index--;
            return;
        }
        if (current) return lexemes[index === 0 ? 0 : index - 1];
        lexemeIndex = index++;
        return currentLexeme = lexemes[lexemeIndex];
    }
}

function error(message) {
    return Promise.reject(message);
}

//
// const fs = require('fs');
// const file = fs.readFileSync('../public/code.txt').toString();
// analyze(file)/*.catch(console.error)*/

module.exports = analyze;