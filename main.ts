import {NumberBlock, NumberMode} from "./block-number.js";
import {OperationBlock} from "./block-operation.js";
import {ButtonBlock} from "./block-button.js";
import {Block} from "./block.js";
import {Face} from "./face.js";
import {Rational} from "./rational.js";

([
    {face: Face.dots(new Rational(3), '#000000'), mode: 'dots'},
    {face: Face.fraction(new Rational(1/2)), mode: 'fraction'},
    {face: Face.decimal(new Rational(1.5)), mode: 'decimal'},
    {face: Face.word(new Rational(2)), mode: 'word'},
    {face: Face.roman(new Rational(4)), mode: 'roman'},
    {face: Face.scientific(new Rational(1.2e3)), mode: 'scientific'},
] as {
    face: HTMLElement;
    mode: NumberMode;
}[]).forEach(({face, mode}, i) =>
    ButtonBlock.create(face, () => NumberBlock.set_mode(mode), () => NumberBlock.MODE !== mode, [15 + 45 * i, 15]));

[
    new Rational(1),
    new Rational(1),
].forEach((v, i) =>
    NumberBlock.create(v, [50 + 75 * i, 100]));

([
    {text: '# + #', op: (a, b) => a.plus(b)},
    {text: '# - #', op: (a, b) => a.minus(b)},
    {text: '# × #', op: (a, b) => a.times(b)},
    {text: '# ÷ #', op: (a, b) => a.divide(b)},
] as {
    text: string;
    op: (...n: Rational[]) => Rational;
}[]).forEach(({text, op}, i) =>
    OperationBlock.create(text, op, [50, 200 + 100 * i]));

setTimeout(() => Block.instances.forEach(block => block.update()));

// Rational.test(false);
Rational.test(true);
