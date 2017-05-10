const LA = require('./lexical_analyzer');
const lexType = LA.lexType;
////////////////
// TODO : CHECK MINUS IN EXPRESSIONS, IT GETS READ AS
//
////////////////
let previousLexeme;
let currentLexeme;
let lexemeIndex = 0;
function analyze(code) {
    let tables;
    try {
        tables = LA.analyze(code);
    } catch(err) {
        console.log(err);
        throw err;
    }
    const nextLexeme = LexemeIterator(tables.lexemesTable);
    return Promise.resolve()
        .then(() => {
            if(!nextLexeme().equals('prog')) return error('Program should start with "prog"');
            if(!nextLexeme().isId()) return error('Program id is not defined');
            if(!nextLexeme().equals('head')) return error('"head" block not found');
            if(!nextLexeme().equals('{')) return error('head block must start with "{"');
            console.log({previousLexeme})
            const declEnd = declarationList(nextLexeme);
            console.log(declEnd)
            if(!declEnd.equals('}')) return error('head block should end with "}')
            if(!nextLexeme().equals('body')) return error('"body" not found');
            if(!nextLexeme().equals('{')) return error('body should start with "{"')
            const bodyEnd = operatorsList(nextLexeme);
            if(!bodyEnd.equals('}')) return error('program should end with "}"')
        })
}

function declarationList(nextLexeme) {
    if(!(currentLexeme = nextLexeme()).equals('fixed')) return expected('type name');
    return idList(nextLexeme);
}

function idList(nextLexeme) {
    let current = nextLexeme();
    if(!current.isId()) return expected('id', current);
    let next;
    while(current.isId()) {
        if(!(next = nextLexeme()).equals(',')) return next;
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
    // TODO add '\n' deleimiter to lexemes table;
    while(!current.equals('}')) {
        nextLexeme(-1);
        current = operator(nextLexeme);
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
    if(current.isId()) {
        if((current = nextLexeme()).equals('=')) {
            return expression(nextLexeme);
        } else {
            return expected(' = ');
        }
    } else if(current.equals('read') || current.equals('print')) {
        if(!(current = nextLexeme()).equals('(')) return expected('(', current);
        current = idList(nextLexeme);
        if(!current.equals(')')) return expected(')', current);
        return nextLexeme();
    } else if(current.equals('for')) {
        if(!(current = nextLexeme()).equals('(')) return expected('(', current);
        if(!(current = nextLexeme()).isId()) return expected('id', current);
        if(!(current = nextLexeme()).equals('=')) return expected('=', current);
        current = expression(nextLexeme);
        if(!current.equals(';')) expected(';',current);
        current = LV(nextLexeme);
        if(!current.equals(';')) expected(';',current);
        if(!(current = nextLexeme()).isId()) return expected('id',current);
        if(!(current = nextLexeme()).equals('=')) return expected('=',current);
        current = expression(nextLexeme);
        if(!current.equals(')')) return expected(')',current);
        current = operator(nextLexeme);
        return current;
    } else if(current.equals('if')) {
        if(!(current = nextLexeme()).equals('(')) return expected('(',current);
        current = LV(nextLexeme);
        if(!current.equals(')')) return expected(')',current);
        if(!(current = nextLexeme()).equals('{')) return expected('{',current)
        current = operatorsList(nextLexeme, true);
        if(!current.equals('}')) return expected('}',current);
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
        if (!current.equals("]")) return expected(']',current);
        return nextLexeme();
    } else {
        current = expression(nextLexeme, true);
        if(!['>','<','>=','<=','!=','=='].includes(current.lexeme)) return expected('condition sign',current);
        return expression(nextLexeme);
    }
}

function expression(nextLexeme, currLex) {

    let current = term(nextLexeme,currLex);
    while(current.equals('-') || current.equals('+')) {
        current = term(nextLexeme);
    }
    return current;
}

function term(nextLexeme, currLex) {
    let current = multiplier(nextLexeme, currLex);
    while(current.equals('*') || current.equals('/')){
        current = multiplier(nextLexeme);
    }
    return current;
}

function multiplier(nextLexeme, currLex) {
    let current = nextLexeme(currLex);
    if (current.equals("(")) {
        current = expression(nextLexeme);
        if(!current.equals(')')) return expected(')',current);
        return nextLexeme(); //TODO: CHECK THIS
    } else if (current.isId() || current.isConst()) {
        return nextLexeme();
    } else {
        return expected('id or const',current);
    }
}

function expected(symbol, currentLexeme,current) {
    throw new Error(`${symbol} expected, got: ${currentLexeme.lexeme}, line: ${currentLexeme.line}`);
}

function LexemeIterator(lexemes) {
    let index = 0;
    return function next(current) {
        if(current == -1) {
            index--;
            return;
        }
        if(current) return lexemes[ index === 0 ? 0 : index - 1];
        lexemeIndex = index++;
        return currentLexeme = lexemes[lexemeIndex];
    }
}

function error(message) {
    return Promise.reject(message);
}


const fs = require('fs');
const file = fs.readFileSync('../public/code.txt').toString();
analyze(file).catch(console.error)