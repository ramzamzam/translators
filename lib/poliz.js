/**
 * Created by ram on 10.05.17.
 */

const LA = require('./lexical_analyzer');
const lexemes = require('./lexemes.json');
const SA = require('./syntatic_analyzer');


class RPNBuilder {
    constructor(tables) {
        this.lexTable = tables.lexemesTable;
        this.idTable = tables.idTable;
        this.constTable = tables.constTable; // TODO check
        this.priority = {
            'if': 0, 'for': 0,
            '{': 1, '}': 1,
            '\n': 2,
            'write': 3, 'read': 3,
            '=': 4,
            '(': 5, '[': 5,
            ')': 6, ']': 6,
            '|': 7,
            '&': 8,
            '!': 9,
            '<': 10, '<=': 10, '>': 10, '>=': 10, '!=': 10, '==': 10,
            '+': 11, '-': 11,
            '*': 12, '/': 12, '@': 12
        };

        this.JMPF = {
            isJ: true,
            JMPON: false
        };

        this.JMPT = {
            isJ: true,
            JMPON: true
        };

        this.JMP = {
            isJ: true,
            JMPON: 'any'
        };

        this.labelIndex = -1;
    }

    build() {
        this.replaceUnary();
        let current;
        let stack = [];
        let output = [];
        output.push = function(e){
            if(e.lexeme === '\n') return;
            Array.prototype.push.call(output, e);
        };
        let lexIndex = this.lexTable.indexOf(this.lexTable.find(l => l.lexeme === 'body')) + 3;
        const lastIndex = this.lexTable.length - 2;
        // console.log(firstLexeme);
        while ((current = this.lexTable[lexIndex]) && lexIndex <= lastIndex) {
            if (current.isId() || current.isConst()) {
                output.push(current);
                lexIndex++;
            } else if (current.equals('for')) {

            } else if (current.equals(']')) {
                while (!(current = stack.pop()).equals('[')) {
                    output.push(current);
                }
                lexIndex++;
            } else if (current.equals(')')) {
                // вытолкнуть все до (
                while (!(current = stack.pop()).equals('(')) {
                    output.push(current);
                }
                let next = stack.pop();
                if(next.equals('print') || next.equals('read')) {
                    output.push(next)
                } else {
                    stack.push(next);
                }
                lexIndex++;
            } else if (current.equals('{')) {
                // в вывод mi, JF, в стек mi
                const ifLabel = this.nextLabel();
                output.push(ifLabel);
                output.push(this.JMPF);
                stack.push(ifLabel);
                lexIndex++;
            } else if (current.equals('}')) {
                // вытолкнуть все до if, убрать if из стека
                current = stack.pop();
                while (!current.equals('if')) {
                    if (!current.equals('{')) {
                        output.push(current);
                    }
                    /*else {
                     stack.pop();
                     }*/
                    current = stack.pop();
                }
                lexIndex++;
                // } else if(curent.equals('read') || current.equals('print')) {

            } else {
                // выталкиваем все из стека пока в стеке приоритет >=
                while (stack.length && this.lessOrEqual(current, stack[stack.length - 1])) {
                    output.push(stack.pop());
                }
                stack.push(current);
                lexIndex++;
            }
        }
        while (stack.length) {
            output.push(stack.pop());
        }
        console.log(this.flattenOutput(output).join(' '));
    }

    eval() {

    }

    flattenOutput(output) {
        return output.map(l => {
            if (l.lexeme) return l.lexeme;
            if (l.isJ) {
                if (l.JMPON === 'any') return 'JMP';
                if (l.JMPON) return 'JMPT'
                else return 'JMPF'
            }
            if (l.isLabel) return l.label;

        });
    }

    lessOrEqual(lex, lex1) {
        if(lex.lexeme === '(' &&  ['<','<=','!=','==','>','>='].includes(lex1.lexeme)) return false;

        if(lex.lexeme === '[' &&  ['!','&','|'].includes(lex1.lexeme)) return false;
        const exclude = ['(','['];
        if(exclude.includes(lex.lexeme) && exclude.includes(lex1.lexeme)) return false;
        return this.priority[lex.lexeme] <= this.priority[lex1.lexeme];
    }

    replaceUnary() {
        this.lexTable.forEach((lexeme, index) => {
            if (lexeme.equals('-') && this.lexTable[index - 1] && ['(', '[', '='].includes(this.lexTable[index - 1].lexeme)) {
                lexeme.lexeme = '@';
            }
        })
    }

    nextLabel() {
        return {
            label: `:m_${++this.labelIndex}`,
            isLabel: true,
            equals: () => false,
            isId: () => false,
            isConst: () => false
        }

    }
}

function indexGenerator() {
    let i = -1;
    return {
        next() {
            return `l_${++i}`;
        },
        current() {
            return i;
        }
    }
}
const labelIndex = indexGenerator();

// УПХ
const JF = 'JF';
// БП
const J = 'J';

function getRPN(tables) {
    const lexTable = tables.lexemesTable;
    // operators list starts after lexemes ['body', '{', '\n'] so we add 3 to index of

    console.log(lexTable[firstLexeme]);

}

function operatorsListRPN(nextLexeme) {
    let rpn = [];
    let current;
    while (current = nextLexeme()) {
        if (current.isId()) {
            rpn = rpn.concat(assignmentRPN(nextLexeme, current));
        }

        if (current.equals('read') || current.equals('print')) {
            rpn = rpn.concat(ioRPN(nextLexeme, current));
        }

        if (current.equals('for')) {
            rpn = rpn.concat(loopRPN(nextLexeme, current));
        }

        if (current.equals('if')) {
            rpn = rpn.concat(condRPN(nextLexeme, current));
        }
    }
    return rpn;
}

function loopRPN(nextLexeme, current) {
    let rpn = [];
    const validationLabel = labelIndex.next();
    // current is 'for' so we skip '('
    nextLexeme();
    rpn = rpn.concat(assignmentRPN(nextLexeme));
    rpm.push(validationLabel, JF);

}

function condRPN(nextLexeme) {

}

function assignmentRPN() {

}

function ioRPN() {

}

function logExpRPN() {

}

function exprRPN() {

}

const fs = require('fs');
const file = fs.readFileSync('../public/code.txt').toString();
const tables = SA(file);
new RPNBuilder(tables).build();