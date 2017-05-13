/**
 * Created by ram on 10.05.17.
 */

// const LA = require('./lexical_analyzer');
// const lexemes = require('./lexemes.json');
// const SA = require('./syntatic_analyzer');
//

class RPNBuilder {
    constructor(tables) {
        this.rpnHistory = [];
        this.lexTable = tables.lexemesTable;
        this.idTable = tables.idTable;
        this.constTable = tables.constTable; // TODO check
        this.operations = {
            '-': (o1, o2) => o1 - o2,
            '+': (o1, o2) => o1 + o2,
            '*': (o1, o2) => o1 * o2,
            '/': (o1, o2) => o1 / o2,
            '|': (o1, o2) => !!(o1 || o2),
            '&': (o1, o2) => !!(o1 && o2),
            '!': (o1) => !o1,
            '>': (o1, o2) => o1 > o2,
            '>=': (o1, o2) => o1 >= o2,
            '!=': (o1, o2) => o1 !== o2,
            '==': (o1, o2) => o1 === o2,
            '<=': (o1, o2) => o1 <= o2,
            '<': (o1, o2) => o1 < o2,
            '@': (o1) => o1 * -1,
            'read': (lex) => {
                let val = prompt(lex.lexeme);
                val = +val;
                if(!isNaN(val)) {
                    return val;
                } else {
                    alert('only numbers allowed');
                    return this.operation('read', lex);
                }
            },
            'print': (val) => console.log(val)
        };
        this.priority = {
            'if': 0, 'for': 0,
            '{': 1, '}': 1,
            '\n': 2,"¶" : 2,
            'write': 3, 'read': 3,
            '=': 4,
            '(': 5, '[': 5,
            ')': 6, ']': 6,
            '|': 7,
            '&': 8,
            '!': 9,
            '<': 10, '<=': 10, '>': 10, '>=': 10, '!=': 10, '==': 10,
            '+': 11, '-': 11,
            '*': 12, '/': 12, '@': 12,


        };

        this.JMPF = {
            isJ: true,
            JMPON: false,
            text : 'JMPF'
        };

        this.JMPT = {
            isJ: true,
            JMPON: true,
            text : 'JMPT'
        };

        this.JMP = {
            isJ: true,
            JMPON: 'any',
            text : 'JMP'
        };

        this.labelIndex = -1;
    }

    saveHistory(stack, output, lexeme) {
        // console.log({stack, output, lexeme})
        this.rpnHistory.push({
            stack : this.flattenOutput(stack).join(',').replace('\n', '¶'),
            output : this.flattenOutput(output).join(',').replace('\n', '¶'),
            lexeme : lexeme.lexeme.replace('\n', '¶')
        })
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

        let newOutput = [];
        let startLex;
        stack.push = function (e) {
            // if(e.lexeme === '\n') return;
            Array.prototype.push.call(stack, e);
        };
        output.push = function (e) {
            if (e.lexeme === '\n' || e.lexeme === "¶") return;
            newOutput.push(e);
            Array.prototype.push.call(output, e);
        };
        let lexIndex = start || this.lexTable.indexOf(this.lexTable.find(l => l.lexeme === 'body')) + 3;
        const lastIndex = end || this.lexTable.length - 2;
        // console.log(firstLexeme);
        while ((current = this.lexTable[lexIndex]) && lexIndex <= lastIndex) {
            startLex = current;
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
                this.build(lexIndex + 1, blockEnd - 1, stack, output);
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
            this.saveHistory(stack, newOutput, startLex);
            newOutput = [];
        }
        while (stack.length > initialStackLength) {
            output.push(stack.pop());
        }
        return output;
    }


    extractLabels(rpn) {
        console.log({rpn: this.flattenOutput(rpn).join(' ')})
        const labelsTable = {};
        const extractedRPN = [];
        for (let i = 0; i < rpn.length; i++) {
            if (!rpn[i].isLabel) {
                extractedRPN.push(rpn[i]);
            } else {
                if (rpn[i + 1] && rpn[i + 1].isJ) {
                    extractedRPN.push(rpn[i]);
                } else {
                    labelsTable[rpn[i].label] = extractedRPN.length;
                }
            }
        }
        return {
            labelsTable,
            rpn: extractedRPN
        }
    }

    value(lex) {
        return lex.value;
    }

    setValue(lex, value) {
        let table;
        if (lex.isId && lex.isId()) table = this.idTable;
        if (table) {
            const id = table.find(i => i.lexeme === lex.lexeme);
            id.value = value;
            return id;
        } else {
            lex.value = value;
            return lex;
        }
    }

    getValue(lex) {
        if (typeof lex !== 'object') return lex;
        if (lex.isId && lex.isId()) {
            return this.idTable.find(i => i.lexeme === lex.lexeme).value;
        } else {
            return lex.value;
        }
    }

    setConstValues(rpn) {
        rpn.forEach(l => {
            if (l.isConst && l.isConst()) {
                l.value = +l.lexeme;
            }
        })
    }

    operation(operator, ...args) {
        const value = this.operations[operator](...args);
        return value;
    }


    eval(rpn, labels, startIndex) {
        this.setConstValues(rpn);
        let operands = [];
        let set = this.setValue.bind(this);
        let get = this.getValue.bind(this);
        let op = () => operands.pop();
        let push = (o) => operands.push(o);
        let operators = Object.keys(this.operations);
        let lexIndex = 0;
        while (lexIndex < rpn.length) {
            let lex = rpn[lexIndex];
            if (lex.isLabel) {
                const destIndex = labels[lex.label];
                const lastValue = operands[operands.length - 1];
                lexIndex++;
                let jump = rpn[lexIndex];
                if (jump.JMPON === 'any') {
                    lexIndex = destIndex
                } else if (jump.JMPON && lastValue) {
                    lexIndex = destIndex
                } else if (!jump.JMPON && !lastValue) {
                    lexIndex = destIndex
                } else {
                    lexIndex++;
                }
                operands = [];
            } else if (lex.equals('=')) {
                let val = get(operands[operands.length - 1]);
                let id = operands[operands.length - 2];
                set(id, val);
                lexIndex++;
            } else if (lex.isId()) {
                operands.push(lex);
                lexIndex++;
            } else if (lex.isConst()) {
                operands.push(get(lex));
                lexIndex++;
            } else if (lex.lexeme === 'read') {
                let op = rpn[lexIndex - 1];
                let value = this.operation('read', op);
                set(op, value);
            } else if (['print'].includes(lex.lexeme)) {
                let value = get(rpn[lexIndex - 1]);
                this.operation(lex.lexeme, value);
                lexIndex++;
            } else if (['@', '!'].includes(lex.lexeme)) {
                let _op = op();
                let value = this.operation(lex.lexeme, get(_op));
                push(value);
                lexIndex++;
            } else if (operators.includes(lex.lexeme)) {
                let op1 = op();
                let op2 = op();
                let value = this.operation(lex.lexeme, get(op2), get(op1));
                push(value);
                lexIndex++;
            }
        }
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
        if (lex1.lexeme === '(') return false;
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

// const fs = require('fs');
// const file = fs.readFileSync('../public/code.txt').toString();
// const tables = SA(file);
// const builder = new RPNBuilder(tables);
// const {rpn, labelsTable} = builder.extractLabels(builder.build());
// console.log({rpn: builder.flattenOutput(rpn), labelsTable});
// console.log('evaluating');
// builder.eval(rpn, labelsTable);

// module.exports = RPNBuilder;