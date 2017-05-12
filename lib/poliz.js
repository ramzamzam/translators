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

    build(start, end, _stack, _output) {
        this.replaceUnary();
        let current;
        let stack = _stack || [];
        let initialStackLength = stack.length;
        let output = _output || [];
        let insertAfterSemicolon = [];
        let insertAfterNewLine = [];
        let newLinesLeft = -1;
        let newLinesCount = -1;
        let forInIf = false;
        let inForLoop = false;
        let ifCount = 0;
        let forLoopCount = 0;
        let inIf = 0;
        stack.push = function (e) {
            // if(e.lexeme === '\n') return;
            Array.prototype.push.call(stack, e);
        };
        output.push = function (e) {
            // if(e.lexeme === '\n') return;
            Array.prototype.push.call(output, e);
        };
        let lexIndex = start || this.lexTable.indexOf(this.lexTable.find(l => l.lexeme === 'body')) + 3;
        const lastIndex = end || this.lexTable.length - 2;
        // console.log(firstLexeme);
        while ((current = this.lexTable[lexIndex]) && lexIndex <= lastIndex) {
            if (current.isId() || current.isConst()) {
                output.push(current);
                lexIndex++;
            } else if (current.equals('for')) {
                // stack.push(this.nextLabel());
                // gjlbз присвоения до точки с зяпятой
                const labelAfterBody = this.nextLabel();
                const labelBeforeCondition = this.nextLabel();
                const labelBeforeStep = this.nextLabel();
                const labelBeforeBody = this.nextLabel();
                insertAfterSemicolon.push(
                    [labelBeforeBody, this.JMPT, labelAfterBody, this.JMP, labelBeforeStep],
                    [labelBeforeCondition]
                );

                insertAfterNewLine.push(
                    [labelBeforeStep, this.JMP, labelAfterBody],
                    [labelBeforeCondition, this.JMP, labelBeforeBody]
                );
                forLoopCount++;
                if (!inForLoop) {
                    newLinesCount = -1;
                    forLoopCount = 1;
                }
                inForLoop = true;
                if (inIf) forInIf = true;
                newLinesLeft++;
                lexIndex++;
            } else if (current.equals(';')) {
                let next;
                while ((next = stack.pop()) && !next.equals('(')) {
                    output.push(next);
                }
                stack.push(next);
                if (insertAfterSemicolon.length) {
                    insertAfterSemicolon.pop().forEach(output.push);
                }
                lexIndex++;
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
                if (next && (next.equals('print') || next.equals('read'))) {
                    output.push(next)
                } else {
                    if (next) stack.push(next);
                }
                lexIndex++;
            } else if (current.equals('{')) {
                // в вывод mi, JF, в стек mi
                const ifLabel = this.nextLabel();
                inIf = true;
                output.push(ifLabel);
                output.push(this.JMPF);
                stack.push(ifLabel);
                const blockEnd = this.findScopeEnd(lexIndex + 1);
                this.build(lexIndex + 1, blockEnd -1,stack, output);
                lexIndex = blockEnd;
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
                inIf = false;
                lexIndex++;
                // } else if(curent.equals('read') || current.equals('print')) {

            } else {


                // выталкиваем все из стека пока в стеке приоритет >=
                while (stack.length > initialStackLength && stack[stack.length - 1] && this.lessOrEqual(current, stack[stack.length - 1])) {
                    output.push(stack.pop());
                }
                stack.push(current);
                lexIndex++;
            }
            if (current.equals('\n')) {
                // if (newLinesLeft > 0) newLinesLeft--;
                // if (!inIf && inForLoop && insertAfterNewLine.length && newLinesLeft === 0) {
                //     insertAfterNewLine.pop().forEach(output.push);
                //     if (!insertAfterNewLine.length) inForLoop = false;
                // }
                //
                // if (forLoopCount > 0 && insertAfterNewLine.length && newLinesLeft === 0) {
                //     insertAfterNewLine.forEach(i => i.forEach(output.push));
                // }
                //
                if (inForLoop /*&& (!inIf)*/) {
                    newLinesCount++;
                    if (newLinesCount !== forLoopCount) {
                        insertAfterNewLine.pop().forEach(output.push);
                    } else {
                        insertAfterNewLine.reverse().forEach(i => i.forEach(output.push));
                        insertAfterNewLine = [];
                        inForLoop = false;
                    }
                }
            }
        }
        while (stack.length > initialStackLength) {
            output.push(stack.pop());
        }
        return output;
        console.log(this.flattenOutput(output).join(' '));

        console.log(insertAfterNewLine)
    }

    eval() {

    }

    findScopeEnd(startIndex) {
        let notClosedCount = 0;
        for (let i = startIndex; i < this.lexTable.length; i++) {
            if (this.lexTable[i].equals('{')) notClosedCount++;
            if (this.lexTable[i].equals('}') && notClosedCount === 0) return i;
            if (this.lexTable[i].equals('}')) notClosedCount--;
        }
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

        if (lex.lexeme === '=' && lex1.lexeme === '(') return false;

        if (lex.lexeme === '(' && ['<', '<=', '!=', '==', '>', '>='].includes(lex1.lexeme)) return false;

        if (lex.lexeme === '[' && ['!', '&', '|'].includes(lex1.lexeme)) return false;
        const exclude = ['(', '['];
        if (exclude.includes(lex.lexeme) && exclude.includes(lex1.lexeme)) return false;
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
const file = fs.readFileSync('../public/code1.txt').toString();
const tables = SA(file);
const builder = new RPNBuilder(tables);
console.log(builder.flattenOutput(builder.build()).join(' '));