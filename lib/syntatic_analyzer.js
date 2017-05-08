const LA = require('./lexical_analyzer');
const lexType = LA.lexType;

function analyze(code) {
    let tables;
    try {
        tables = LA.analyze(code);
    } catch(err) {
        console.log(err);
    }
    const nextLexeme = LexemeIterator(tables.lexemesTable);
    return Promise.resolve()
        .then(() => {
            if(!nextLexeme().equals('prog')) return error('Program should start with "prog"');
            if(!nextLexeme().isId()) return error('Program id is not defined');
            if(!nextLexeme().equals('head')) return error('"head" block not found');
            if(!nextLexeme().equals('{')) return error('head block must start with "{"');
            const declEnd = declarationList(nextLexeme);
            if(!declEnd.equals('}')) return error('head block should end with "}')
            if(!nextLexeme().equals('body')) return error('"body" not found');
            if(!nextLexeme().equals('{')) return error('body should start with "{"')
            const bodyEnd = operatorsList(nextLexeme);
            if(!bodyEnd.equals('}')) return error('program should end with "}"')

        })
}

function declarationList(nextLexeme) {

}

function operatorsList(nextLexeme) {

}

function LexemeIterator(lexemes) {
    return function next() {
        return lexemes.shift();
    }
}

function error(message) {
    return Promise.reject(message);
}


const fs = require('fs');
const file = fs.readFileSync('../public/code.txt').toString();
analyze(file).catch(console.error)
