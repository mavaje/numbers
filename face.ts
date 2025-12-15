import {fit_text} from "./fit-text.js";
import {roman_numeral, scientific_notation, word} from "./format.js";
import {Rational} from "./rational.js";

export class Face {

    private static DOTS: {
        [value: number]: {
            size: number;
            dots?: {
                x: number;
                y: number;
            }[];
        }
    } = {
        1: {
            size: 1,
            dots: [{x: 0, y: 0}],
        },
        2: {
            size: 2,
            dots: [
                {x: 0, y: 0},
                {x: 1, y: 1},
            ],
        },
        3: {
            size: 2.5,
            dots: [
                {x: 0, y: 0},
                {x: 0.75, y: 0.75},
                {x: 1.5, y: 1.5},
            ],
        },
        4: {
            size: 2.5,
            dots: [
                {x: 0, y: 0}, {x: 1.5, y: 0},
                {x: 0, y: 1.5}, {x: 1.5, y: 1.5},
            ],
        },
        5: {
            size: 2.5,
            dots: [
                {x: 0, y: 0}, {x: 1.5, y: 0},
                {x: 0.75, y: 0.75},
                {x: 0, y: 1.5}, {x: 1.5, y: 1.5},
            ],
        },
        6: {
            size: 3,
            dots: [
                {x: 0, y: 0}, {x: 2, y: 0},
                {x: 0, y: 1}, {x: 2, y: 1},
                {x: 0, y: 2}, {x: 2, y: 2},
            ],
        },
    }

    static base() {
        const face = document.createElement('div');
        face.classList.add('face');
        return face;
    }

    static text(text: string | HTMLElement, font_size?: number) {
        return fit_text(text, Face.base(), font_size);
    }

    static dots(value: Rational, colour: string) {
        const face = Face.base();

        const abs_value = value.absolute();
        const n_dots = abs_value.is_less_than(1) ? 1
            : abs_value.is_greater_than(256) ? 256
            : Math.ceil(abs_value.to_float());
        let {size, dots} = Face.DOTS[n_dots] ?? {
            size: Math.ceil(Math.sqrt(n_dots)),
        };

        let size_x = size;
        let size_y = Math.ceil(n_dots / size);

        let a = size;
        let b = n_dots / a;
        while (b > 1 && a <= 16) {
            if (b % 1 === 0) {
                size_x = a;
                size_y = b;
                break;
            }
            a++;
            b = n_dots / a;
        }

        const view = size_x * 3 + 1;

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        svg.setAttribute('viewBox', `0 0 ${view} ${view}`);
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        face.append(svg);

        for (let i = 0; i < n_dots; i++) {
            if (abs_value.is_not_greater_than(0) && abs_value.is_greater_than(0)) break;

            const {x, y} = dots ? dots[i] : {
                x: i % size_x,
                y: (size_x - size_y) / 2 + Math.floor(i / size_x),
            };

            const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            dot.setAttribute('cx', `${x * 3 + 2}`);
            dot.setAttribute('cy', `${y * 3 + 2}`);
            dot.setAttribute('r', '1');
            svg.append(dot);

            if (abs_value.is_not_less_than(i + 1)) {
                dot.setAttribute('fill', colour);
            } else {
                dot.setAttribute('r', '0.95');
                dot.setAttribute('fill', 'none');
                dot.setAttribute('stroke', colour);
                dot.setAttribute('stroke-width', '0.1');
                dot.setAttribute('stroke-dasharray', '0.2');

                const f_dot = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                const fraction = abs_value.modulo(1).to_float();
                const a = (fraction * 2 * Math.PI) % Math.PI;
                f_dot.setAttribute('d', [
                    `M ${x * 3 + 2},${y * 3 + 2}`,
                    'v -1',
                    fraction < 0.5 ?
                        [
                            `a 1,1 0,0,0 ${-Math.sin(a)},${1 - Math.cos(a)}`,
                        ] : [
                            `a 1,1 0,0,0 0,2`,
                            `a 1,1 0,0,0 ${Math.sin(a)},${Math.cos(a) - 1}`,
                        ],
                    'z',
                ].join(' '));
                f_dot.setAttribute('fill', colour);
                svg.append(f_dot);
            }
        }

        return face;
    }

    static fraction(value: Rational) {
        if (value.is_integer()) {
            return Face.text(value.to_positional({integer: {group_separator: ','}}));
        } else {
            const sub_face = document.createElement('div');
            sub_face.classList.add('fraction');
            sub_face.append(new Rational(value.numerator).to_positional({integer: {group_separator: ','}}));
            sub_face.append(document.createElement('div'));
            sub_face.append(new Rational(value.denominator).to_positional({integer: {group_separator: ','}}));
            return Face.text(sub_face);
        }
    }

    static decimal(value: Rational) {
        return Face.text(value.to_positional({integer: {group_separator: ','}}));
    }

    static word(value: Rational) {
        return Face.text(word(value).toUpperCase(), 16);
    }

    static roman(value: Rational) {
        const face = Face.text(roman_numeral(value));
        face.style.fontFamily = 'serif';
        return face;
    }

    static scientific(value: Rational) {
        let [mantissa, exponent] = scientific_notation(value);

        mantissa = mantissa.round(undefined, Rational.THOUSANDTH);

        if (mantissa.is_not_less_than(Rational.TEN)) {
            mantissa = Rational.ONE;
            exponent++;
        }

        const span = document.createElement('span');
        span.append(mantissa.to_positional({
            fraction: {min_digits: 3, max_digits: 3},
        }));

        if (exponent !== undefined) {
            span.append(` × 10`);
            const sup = document.createElement('sup');
            sup.append(exponent.toString());
            span.append(sup);
        }

        return Face.text(span);
    }
}
