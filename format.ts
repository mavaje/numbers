import {Rational} from "./rational.js";

export function scientific_notation(value: Rational): [Rational, bigint?] {
    if (value.is_negative()) {
        const [mantissa, exponent] = scientific_notation(value.negative());
        return [mantissa.negative(), exponent];
    }
    if (value.is_infinite()) return [value];
    if (value.is_zero()) return [value, 0n];

    let mantissa = value;
    let exponent = 0n;

    while (mantissa.is_less_than(Rational.ONE)) {
        mantissa = mantissa.times(Rational.TEN);
        exponent--;
    }

    while (mantissa.is_not_less_than(Rational.TEN)) {
        mantissa = mantissa.divide(Rational.TEN);
        exponent++;
    }

    return [mantissa, exponent];
}

const ROMAN: [number, string][] = [
    [1000, 'M'],
    [900, 'CM'],
    [500, 'D'],
    [400, 'CD'],
    [100, 'C'],
    [90, 'XC'],
    [50, 'L'],
    [40, 'XL'],
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
    [1/2, 's'],
    [5/12, '⁙'],
    [4/12, '∷'],
    [3/12, '∴'],
    [2/12, ':'],
    [1/12, '·'],
];

export function roman_numeral(value: Rational): string {
    if (value.is_negative()) return roman_numeral(value.negative());

    if (value.is_greater_than(100000)) value = new Rational(100000);

    // value = value.times(12).integer_part().divide(12);

    for (const [v, s] of ROMAN) {
        if (value.is_not_less_than(v)) {
            return s + roman_numeral(value.minus(v));
        }
    }

    return '';
}

function word_parts(value: Rational, include_zero = true): string[] {
    if (value.is_negative()) return ['negative', ...word_parts(value.negative(), false)];
    if (value.is_infinite()) return ['infinity'];

    const thousands = [
        'vigintillion',
        'novemdecillion',
        'octodecillion',
        'septendecillion',
        'sexdecillion',
        'quindecillion',
        'quattuordecillion',
        'tredecillion',
        'duodecillion',
        'undecillion',
        'decillion',
        'nonillion',
        'octillion',
        'septillion',
        'sextillion',
        'quintillion',
        'quadrillion',
        'trillion',
        'billion',
        'million',
        'thousand',
    ];

    if (value.is_not_less_than(1000n ** BigInt(thousands.length + 1))) {
        return ['too large to show'];
    }

    if (value.is_fractional()) {
        const fraction = value.modulo(1);
        const numerator = new Rational(fraction.numerator);
        const denominator = new Rational(fraction.denominator);

        const int_parts = word_parts(value.truncate(), false);
        const n_parts = word_parts(numerator);
        if (int_parts.length > 0) {
            int_parts.push('and');
            if (n_parts[0] === 'one') n_parts[0] = 'a';
        }
        const d_parts = {
            [2]: ['half'],
            [4]: ['quarter'],
        }[denominator.to_float()] ?? word_parts(denominator);
        if (d_parts[0] === 'one') d_parts.splice(0, 1);
        d_parts[d_parts.length - 1] = (d_parts[d_parts.length - 1] + (numerator.is_greater_than(1) ? 'ths' : 'th'))
            .replace(/halfth/, 'half')
            .replace(/quarterth/, 'quarter')
            .replace(/oneth/, 'first')
            .replace(/twoth/, 'second')
            .replace(/threeth/, 'third')
            .replace(/fiveth/, 'fifth')
            .replace(/eightth/, 'eighth')
            .replace(/nineth/, 'ninth')
            .replace(/twelveth/, 'twelfth')
            .replace(/twentyth/, 'twentieth')
            .replace(/tyth/, 'tieth');
        return [
            ...int_parts,
            ...n_parts,
            ...d_parts,
        ];
    }
    if (value.is_zero() && !include_zero) return [];
    if (value.to_float() < 20) return [[
        'zero',
        'one',
        'two',
        'three',
        'four',
        'five',
        'six',
        'seven',
        'eight',
        'nine',
        'ten',
        'eleven',
        'twelve',
        'thirteen',
        'fourteen',
        'fifteen',
        'sixteen',
        'seventeen',
        'eighteen',
        'nineteen',
    ][value.to_float()]];
    if (value.to_float() < 100) {
        return [
            [
                '', '',
                'twenty',
                'thirty',
                'forty',
                'fifty',
                'sixty',
                'seventy',
                'eighty',
                'ninety',
            ][Math.floor(value.to_float() / 10)],
            ...word_parts(new Rational(value.numerator % 10n), false),
        ];
    }
    if (value.to_float() < 1000) {
        const tens_ones = word_parts(new Rational(value.numerator % 100n), false);
        return [
            ...word_parts(value.divide(new Rational(100n)).truncate()),
            'hundred',
            ...(tens_ones.length > 0 ? ['and'] : []),
            ...tens_ones,
        ];
    }

    const parts = [];

    thousands.forEach((name, i) => {
        const log_min = 1000n ** BigInt(thousands.length - i);
        const p = word_parts(new Rational(value.numerator, log_min).modulo(1000n).truncate(), false);
        if (p.length > 0) {
            parts.push(...p, name);
        }
    });

    const hundreds = word_parts(new Rational(value.numerator % 1000n), false);
    if (hundreds.length > 0) {
        if (!hundreds.includes('and')) parts.push('and');
        parts.push(...hundreds);
    }

    return parts;
}

export function word(value: Rational): string {
    return word_parts(value).join(' ');
}
