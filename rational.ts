import {Tester} from "./tester.js";

export enum RoundMode {
    IN,
    OUT,
    UP,
    DOWN,
    EVEN,
    ODD,
    HALF_IN,
    HALF_OUT,
    HALF_UP,
    HALF_DOWN,
    HALF_EVEN,
    HALF_ODD,
}

type FormatOptionsPart = {
    min_digits?: number,
    max_digits?: number,
    digit_separator?: string,
    group_separator?: string,
    group_size?: number,
}

export type FormatOptions = {
    base?: number|bigint|Rational,
    point?: string;
    digit_separator?: string,
    integer?: FormatOptionsPart,
    fraction?: FormatOptionsPart,
};

export class Rational {

    public static readonly UNDEFINED = new Rational(0n, 0n);
    public static readonly ZERO = new Rational(0n);
    public static readonly THOUSANDTH = new Rational(1n, 1000n);
    public static readonly HUNDREDTH = new Rational(1n, 100n);
    public static readonly TENTH = new Rational(1n, 10n);
    public static readonly HALF = new Rational(1n, 2n);
    public static readonly ONE = new Rational(1n);
    public static readonly TWO = new Rational(2n);
    public static readonly TEN = new Rational(10n);
    public static readonly HUNDRED = new Rational(100n);
    public static readonly THOUSAND = new Rational(1000n);
    public static readonly INFINITY = new Rational(1n, 0n);
    public static readonly NEGATIVE_ONE = new Rational(-1n);
    public static readonly NEGATIVE_INFINITY = new Rational(-1n, 0n);

    public readonly numerator: bigint;
    public readonly denominator: bigint;

    constructor(value: number|bigint);
    constructor(numerator: number|bigint, denominator: number|bigint);
    constructor(
        numerator: number|bigint,
        denominator: number|bigint = 1n,
    ) {
        let n: bigint;
        let d: bigint;
        if (typeof numerator === 'bigint') {
            n = numerator;
            d = 1n;
        } else {
            [n, d] = Rational.float_as_fraction(numerator);
        }

        if (typeof denominator === 'bigint') {
            d *= denominator;
        } else {
            const [nd, dd] = Rational.float_as_fraction(denominator);
            n *= dd;
            d *= nd;
        }

        if (n === 0n) {
            this.numerator = 0n;
            this.denominator = d === 0n ? 0n : 1n;
        } else {
            if (d < 0) {
                n = -n;
                d = -d;
            }

            if (d === 0n) {
                this.numerator = n < 0n ? -1n : 1n;
                this.denominator = 0n;
            } else {
                let gcd = n < 0n ? -n : n;
                let remainder = d;

                while (remainder > 0n) {
                    [gcd, remainder] = [remainder, gcd % remainder];
                }

                this.numerator = n / gcd;
                this.denominator = d / gcd;
            }
        }
    }

    private static float_as_fraction(value: number): [bigint, bigint] {
        if (value % 1 === 0) return [BigInt(value), 1n];

        const denominator = 2n ** 52n;

        const buffer = new ArrayBuffer(8);
        new DataView(buffer).setFloat64(0, value);

        let bits = '';
        for (let byte of new Uint8Array(buffer)) {
            bits += byte.toString(2).padStart(8, '0');
        }

        const sign = bits[0] === '0' ? 1n : -1n;
        const raw_exponent = BigInt('0b' + bits.slice(1, 12));
        const raw_mantissa = BigInt('0b' + bits.slice(12));

        if (raw_exponent === 0n) {
            if (raw_mantissa === 0n) {
                return [0n, 1n];
            } else {
                return [sign * raw_mantissa, denominator * (2n ** 1022n)]
            }
        } if (raw_exponent === 2047n) {
            if (raw_mantissa === 0n) {
                return [sign, 0n];
            } else {
                return [0n, 0n];
            }
        } else {
            const exponent = raw_exponent - 1023n;
            const mantissa = denominator + raw_mantissa;

            return exponent < 0
                ? [sign * mantissa, denominator * (2n ** -exponent)]
                : [sign * mantissa * (2n ** exponent), denominator];
        }
    }

    sign(): -1 | 0 | 1 {
        switch (true) {
            case this.is_negative():
                return -1;
            case this.is_zero():
                return 0;
            case this.is_positive():
                return 1;
        }
    }

    is_negative(): boolean {
        return this.numerator < 0n;
    }

    is_zero(): boolean {
        return this.numerator === 0n;
    }

    is_positive(): boolean {
        return this.numerator > 0n;
    }

    is_integer(): boolean {
        return this.denominator === 1n;
    }

    is_even(): boolean {
        return this.divide(Rational.TWO).is_integer();
    }

    is_odd(): boolean {
        return this.divide(Rational.TWO).denominator === 2n;
    }

    is_fractional(): boolean {
        return this.denominator > 1n;
    }

    is_finite(): boolean {
        return this.denominator > 0n;
    }

    is_infinite(): boolean {
        return this.denominator === 0n;
    }

    is_undefined(): boolean {
        return this.numerator === 0n && this.denominator === 0n;
    }

    negative(): Rational {
        return new Rational(
            -this.numerator,
            this.denominator,
        );
    }

    absolute(): Rational {
        return this.is_negative()
            ? this.negative()
            : this;
    }

    reciprocal(): Rational {
        return new Rational(
            this.denominator,
            this.numerator,
        );
    }

    truncate(unit?: number|bigint|Rational): Rational;
    truncate(unit_numerator?: number|bigint, unit_denominator?: number|bigint): Rational;
    truncate(unit?: number|bigint|Rational, unit_denominator?: number|bigint): Rational {
        return this.round(RoundMode.IN, unit as any, unit_denominator);
    }

    ceiling(unit?: number|bigint|Rational): Rational;
    ceiling(unit_numerator?: number|bigint, unit_denominator?: number|bigint): Rational;
    ceiling(unit?: number|bigint|Rational, unit_denominator?: number|bigint): Rational {
        return this.round(RoundMode.UP, unit as any, unit_denominator);
    }

    floor(unit?: number|bigint|Rational): Rational;
    floor(unit_numerator?: number|bigint, unit_denominator?: number|bigint): Rational;
    floor(unit?: number|bigint|Rational, unit_denominator?: number|bigint): Rational {
        return this.round(RoundMode.DOWN, unit as any, unit_denominator);
    }

    round(mode?: RoundMode, unit?: number|bigint|Rational): Rational;
    round(mode?: RoundMode, unit_numerator?: number|bigint, unit_denominator?: number|bigint): Rational;
    round(
        mode: RoundMode = RoundMode.HALF_OUT,
        unit: number|bigint|Rational = Rational.ONE,
        unit_denominator?: number|bigint,
    ): Rational {
        if (this.is_infinite()) return this;

        if (!(unit instanceof Rational)) unit = new Rational(unit, unit_denominator);

        if (unit.is_zero() || unit.is_infinite()) return Rational.UNDEFINED;

        let scaled = this.divide(unit);

        if (scaled.is_integer()) return scaled.times(unit);

        if (mode >= 6) {
            if (scaled.denominator === 2n) {
                mode -= 6;
            } else {
                mode = RoundMode.DOWN;
                scaled = scaled.plus(Rational.HALF);
            }
        }

        const truncated = new Rational(scaled.numerator / scaled.denominator);

        if ([
            RoundMode.IN,
            scaled.is_negative() ? RoundMode.UP : RoundMode.DOWN,
            truncated.is_even() ? RoundMode.EVEN : RoundMode.ODD,
        ].includes(mode)) {
            return truncated.times(unit);
        } else {
            return scaled.is_negative()
                ? truncated.minus(Rational.ONE).times(unit)
                : truncated.plus(Rational.ONE).times(unit);
        }
    }

    equals(comparand?: number|bigint|Rational): boolean;
    equals(comparand_numerator?: number|bigint, comparand_denominator?: number|bigint): boolean;
    equals(comparand: number|bigint|Rational, comparand_denominator?: number|bigint): boolean {
        if (!(comparand instanceof Rational)) comparand = new Rational(comparand, comparand_denominator);

        return this.numerator === comparand.numerator
            && this.denominator === comparand.denominator;
    }

    not_equals(comparand?: number|bigint|Rational): boolean;
    not_equals(comparand_numerator?: number|bigint, comparand_denominator?: number|bigint): boolean;
    not_equals(comparand: number|bigint|Rational, comparand_denominator?: number|bigint): boolean {
        return !this.equals(comparand as any, comparand_denominator);
    }

    is_less_than(comparand?: number|bigint|Rational): boolean;
    is_less_than(comparand_numerator?: number|bigint, comparand_denominator?: number|bigint): boolean;
    is_less_than(comparand: number|bigint|Rational, comparand_denominator?: number|bigint): boolean {
        if (!(comparand instanceof Rational)) comparand = new Rational(comparand, comparand_denominator);

        return this.numerator * comparand.denominator < comparand.numerator * this.denominator;
    }

    is_not_less_than(comparand?: number|bigint|Rational): boolean;
    is_not_less_than(comparand_numerator?: number|bigint, comparand_denominator?: number|bigint): boolean;
    is_not_less_than(comparand: number|bigint|Rational, comparand_denominator?: number|bigint): boolean {
        return !this.is_less_than(comparand as any, comparand_denominator);
    }

    is_greater_than(comparand?: number|bigint|Rational): boolean;
    is_greater_than(comparand_numerator?: number|bigint, comparand_denominator?: number|bigint): boolean;
    is_greater_than(comparand: number|bigint|Rational, comparand_denominator?: number|bigint): boolean {
        if (!(comparand instanceof Rational)) comparand = new Rational(comparand, comparand_denominator);

        return this.numerator * comparand.denominator > comparand.numerator * this.denominator;
    }

    is_not_greater_than(comparand?: number|bigint|Rational): boolean;
    is_not_greater_than(comparand_numerator?: number|bigint, comparand_denominator?: number|bigint): boolean;
    is_not_greater_than(comparand: number|bigint|Rational, comparand_denominator?: number|bigint): boolean {
        return !this.is_greater_than(comparand as any, comparand_denominator);
    }

    plus(addend?: number|bigint|Rational): Rational;
    plus(addend_numerator?: number|bigint, addend_denominator?: number|bigint): Rational;
    plus(addend: number|bigint|Rational, addend_denominator?: number|bigint): Rational {
        if (!(addend instanceof Rational)) addend = new Rational(addend, addend_denominator);

        if (this.equals(addend)) {
            return this.times(Rational.TWO);
        }

        return new Rational(
            this.numerator * addend.denominator + addend.numerator * this.denominator,
            this.denominator * addend.denominator,
        );
    }

    minus(subtrahend?: number|bigint|Rational): Rational;
    minus(subtrahend_numerator?: number|bigint, subtrahend_denominator?: number|bigint): Rational;
    minus(subtrahend: number|bigint|Rational, subtrahend_denominator?: number|bigint): Rational {
        if (!(subtrahend instanceof Rational)) subtrahend = new Rational(subtrahend, subtrahend_denominator);

        return this.plus(subtrahend.negative());
    }

    times(multiplier?: number|bigint|Rational): Rational;
    times(multiplier_numerator?: number|bigint, multiplier_denominator?: number|bigint): Rational;
    times(multiplier: number|bigint|Rational, multiplier_denominator?: number|bigint): Rational {
        if (!(multiplier instanceof Rational)) multiplier = new Rational(multiplier, multiplier_denominator);

        return new Rational(
            this.numerator * multiplier.numerator,
            this.denominator * multiplier.denominator,
        );
    }

    divide(divisor?: number|bigint|Rational): Rational;
    divide(divisor_numerator?: number|bigint, divisor_denominator?: number|bigint): Rational;
    divide(divisor: number|bigint|Rational, divisor_denominator?: number|bigint): Rational {
        if (!(divisor instanceof Rational)) divisor = new Rational(divisor, divisor_denominator);

        return this.times(divisor.reciprocal());
    }

    modulo(modulus?: number|bigint|Rational): Rational;
    modulo(modulus_numerator?: number|bigint, modulus_denominator?: number|bigint): Rational;
    modulo(modulus: number|bigint|Rational, modulus_denominator?: number|bigint): Rational {
        if (!(modulus instanceof Rational)) modulus = new Rational(modulus, modulus_denominator);

        if (this.is_finite() && modulus.is_infinite()) {
            return modulus.is_undefined() || this.sign() * modulus.sign() < 0
                ? modulus
                : this;
        }

        return this.minus(this.floor(modulus));
    }

    power(exponent: bigint): Rational {
        if (exponent < 0n) {
            return new Rational(
                this.denominator ** -exponent,
                this.numerator ** -exponent,
            );
        } else {
            return new Rational(
                this.numerator ** exponent,
                this.denominator ** exponent,
            );
        }
    }

    private static positional(value: Rational, base: Rational): {
        sign: -1 | 0 | 1;
        integer_digits: bigint[];
        fraction_digits: bigint[];
        integer_repeat?: number;
        fraction_repeat?: number;
    } {
        if (!(base instanceof Rational)) base = new Rational(base);

        if (value.is_negative() && base.is_positive()) {
            return {
                ...Rational.positional(value.negative(), base),
                sign: -1,
            };
        }

        if (base.is_infinite()
            || base.is_zero()
            || base.absolute().equals(Rational.ONE)
        ) throw new Error(`Invalid base ${base}`);

        if (base.absolute().is_less_than(Rational.ONE)) {
            let {
                sign,
                integer_digits,
                fraction_digits,
                integer_repeat,
                fraction_repeat,
            } = Rational.positional(value, base.reciprocal());

            return {
                sign,
                integer_digits: fraction_digits,
                fraction_digits: integer_digits,
                integer_repeat: fraction_repeat,
                fraction_repeat: integer_repeat,
            };
        }

        const integer_digits: bigint[] = [];
        const fraction_digits: bigint[] = [];
        let fraction_repeat = 0;

        integer_digits[0] = value.numerator;

        let index = 0;
        while (true) {
            let count = integer_digits[index] / base.numerator;

            if (integer_digits[index] % base.numerator < 0n) {
                count++;
            }

            if (count !== 0n) {
                integer_digits[index] -= count * base.numerator;
                integer_digits[++index] = count * base.denominator;
            } else {
                break;
            }
        }

        const max_index = index;
        fraction_digits[0] = integer_digits[0];

        const repeats: Rational[] = [];
        if (value.is_fractional()) {
            let digit: Rational;
            let quotient: Rational;
            let carry = Rational.ZERO;
            while (index >= -100) {
                digit = carry.times(base).plus(integer_digits[index] ?? Rational.ZERO);

                carry = digit.modulo(value.denominator);
                quotient = digit.minus(carry).divide(value.denominator);

                if (index >= 0) integer_digits[index] = quotient.numerator;
                if (index <= 0) {
                    fraction_digits[-index] = quotient.numerator;
                    const repeat = repeats.findIndex(f => f.equals(carry));
                    if (index < 0 && repeat > -1) {
                        fraction_repeat = repeats.length - repeat;
                        break;
                    } else {
                        repeats.push(carry);
                    }
                    if (carry.is_zero()) break;
                }
                index--;
            }

            while (index < max_index) {
                const digit = integer_digits[index] ?? fraction_digits[-index] ?? 0n;
                let count = digit / base.numerator;

                if (digit % base.numerator < 0n) {
                    count++;
                }

                if (count !== 0n) {
                    if (fraction_repeat === 1 && -index === fraction_digits.length - fraction_repeat) {
                        fraction_repeat++;
                        fraction_digits[fraction_repeat - index - 1] = fraction_digits[fraction_repeat - index - 2];
                    }

                    if (index >= 0) integer_digits[index] -= count * base.numerator;
                    if (index <= 0) fraction_digits[-index] -= count * base.numerator;

                    if (index >= -1) {
                        integer_digits[index + 1] ??= 0n;
                        integer_digits[index + 1] += count * base.denominator;
                    }
                    if (index <= -1) {
                        fraction_digits[-index - 1] += count * base.denominator;
                    }

                    if (-index === fraction_digits.length - fraction_repeat) {
                        index -= fraction_repeat;
                        fraction_digits[-index - 1] += count * base.denominator;
                    }
                }

                index++;
            }
        }

        const leading_zeroes = integer_digits.findLastIndex(digit => digit !== 0n);
        if (leading_zeroes > -1) {
            integer_digits.splice(leading_zeroes + 1, integer_digits.length);
        }

        if (fraction_repeat === 0) {
            const trailing_zeroes = fraction_digits.findLastIndex(digit => digit !== 0n);
            if (trailing_zeroes > -1) {
                fraction_digits.splice(trailing_zeroes + 1, fraction_digits.length);
            }
        }

        return {
            sign: value.is_zero() ? 0 : 1,
            integer_digits,
            fraction_digits,
            fraction_repeat,
        };
    }

    to_positional(options: FormatOptions = {}): string {
        if (this.is_undefined()) return 'NAN';
        if (this.is_infinite()) return this.negative() ? '-∞' : '∞';

        let {
            base = Rational.TEN,
            point = '.',
            digit_separator,
            integer = {},
            fraction = {},
        } = options;

        if (!(base instanceof Rational)) base = new Rational(base);

        const positional = Rational.positional(this, base);

        const digit_base = Math.max(
            Math.abs(Number(base.numerator)),
            Math.abs(Number(base.denominator)),
        );

        digit_separator ??= digit_base > 36 ? ':' : '';

        const integer_digits = positional.integer_digits
            .reverse()
            .map(digit => digit.toString(digit_base));

        while (integer_digits.length < (integer.min_digits ?? 1)) {
            if (positional.integer_repeat) {
                integer_digits.push(...integer_digits.slice(-positional.integer_repeat));
                integer_digits.splice(integer.min_digits ?? 1, integer_digits.length - (integer.min_digits ?? 1));
            } else {
                integer_digits.push('0');
            }
        }

        let integer_string: string;

        const integer_separator = integer.digit_separator ?? digit_separator;

        if (positional.integer_repeat && !('max_digits' in integer)) {
            const repeating = positional.integer_repeat;
            if (repeating > 1) {
                integer_string = `...[${
                    integer_digits.slice(0, repeating).join(integer_separator)
                }]${
                    integer_digits.slice(repeating).join(integer_separator)
                }`;
            } else {
                integer_string = `...${integer_digits.join(integer_separator)}`;
            }
        } else {
            integer_string = integer_digits
                .slice(0, integer.max_digits ?? integer_digits.length)
                .join(integer_separator);
        }

        const fraction_digits = positional.fraction_digits
            .map(digit => digit.toString(digit_base));

        while (fraction_digits.length < (fraction.min_digits ?? 0) + 1) {
            if (positional.fraction_repeat) {
                fraction_digits.push(...fraction_digits.slice(-positional.fraction_repeat));
                fraction_digits.splice((fraction.min_digits ?? 0) + 1, fraction_digits.length - (fraction.min_digits ?? 0) - 1);
            } else {
                fraction_digits.push('0');
            }
        }

        let fraction_string: string;

        const fraction_separator = fraction.digit_separator ?? digit_separator;

        if (positional.fraction_repeat && !('max_digits' in fraction)) {
            const repeating = positional.fraction_repeat;
            if (repeating > 1) {
                fraction_string = `${
                    fraction_digits.slice(1, -repeating).join(fraction_separator)
                }[${
                    fraction_digits.slice(-repeating).join(fraction_separator)
                }]...`;
            } else {
                fraction_string = `${
                    fraction_digits.slice(1).join(fraction_separator)
                }...`;
            }
        } else {
            fraction_string = fraction_digits.slice(1)
                .slice(0, fraction.max_digits ?? fraction_digits.length)
                .join(fraction_separator);
        }

        return (positional.sign === -1 ? '-' : '')
            + integer_string
            + (fraction_string.length > 0 ? point : '')
            + fraction_string;
    }

    to_float(): number {
        return Number(this.numerator) / Number(this.denominator);
    }

    toString(): string {
        return `[${this.numerator}/${this.denominator}]`;
    }

    static test(show_passed: boolean = true, show_failed: boolean = true): void {
        const tester = new Tester(Rational, show_passed, show_failed);

        tester.subject(0n, 0n).expect('equals', 0n, 0n).to_be_truthy();
        tester.subject(-1n, 0n).expect('equals', -1n, 0n).to_be_truthy();
        tester.subject(-2n, 1n).expect('equals', -2n, 1n).to_be_truthy();
        tester.subject(-3n, 2n).expect('equals', -3n, 2n).to_be_truthy();
        tester.subject(-1n, 1n).expect('equals', -1n, 1n).to_be_truthy();
        tester.subject(-1n, 2n).expect('equals', -1n, 2n).to_be_truthy();
        tester.subject(0n, 1n).expect('equals', 0n, 1n).to_be_truthy();
        tester.subject(1n, 2n).expect('equals', 1n, 2n).to_be_truthy();
        tester.subject(1n, 1n).expect('equals', 1n, 1n).to_be_truthy();
        tester.subject(3n, 2n).expect('equals', 3n, 2n).to_be_truthy();
        tester.subject(2n, 1n).expect('equals', 2n, 1n).to_be_truthy();
        tester.subject(1n, 0n).expect('equals', 1n, 0n).to_be_truthy();
        tester.subject(0n, 1n).expect('equals', 0n, -1n).to_be_truthy();
        tester.subject(-1n, -1n).expect('equals', 1n, 1n).to_be_truthy();
        tester.subject(-1n, 1n).expect('equals', 1n, -1n).to_be_truthy();
        tester.subject(4n, 2n).expect('equals', 2n, 1n).to_be_truthy();
        tester.subject(9n, 24n).expect('equals', 3n, 8n).to_be_truthy();

        tester.subject(0n, 0n).expect('reciprocal').to_equal('[0/0]');
        tester.subject(-1n, 0n).expect('reciprocal').to_equal('[0/1]');
        tester.subject(-2n, 1n).expect('reciprocal').to_equal('[-1/2]');
        tester.subject(-3n, 2n).expect('reciprocal').to_equal('[-2/3]');
        tester.subject(-1n, 1n).expect('reciprocal').to_equal('[-1/1]');
        tester.subject(-1n, 2n).expect('reciprocal').to_equal('[-2/1]');
        tester.subject(0n, 1n).expect('reciprocal').to_equal('[1/0]');
        tester.subject(1n, 2n).expect('reciprocal').to_equal('[2/1]');
        tester.subject(1n, 1n).expect('reciprocal').to_equal('[1/1]');
        tester.subject(3n, 2n).expect('reciprocal').to_equal('[2/3]');
        tester.subject(2n, 1n).expect('reciprocal').to_equal('[1/2]');
        tester.subject(1n, 0n).expect('reciprocal').to_equal('[0/1]');
        
        tester.subject(0n, 0n).expect('negative').to_equal('[0/0]');
        tester.subject(-1n, 0n).expect('negative').to_equal('[1/0]');
        tester.subject(-2n, 1n).expect('negative').to_equal('[2/1]');
        tester.subject(-3n, 2n).expect('negative').to_equal('[3/2]');
        tester.subject(-1n, 1n).expect('negative').to_equal('[1/1]');
        tester.subject(-1n, 2n).expect('negative').to_equal('[1/2]');
        tester.subject(0n, 1n).expect('negative').to_equal('[0/1]');
        tester.subject(1n, 2n).expect('negative').to_equal('[-1/2]');
        tester.subject(1n, 1n).expect('negative').to_equal('[-1/1]');
        tester.subject(3n, 2n).expect('negative').to_equal('[-3/2]');
        tester.subject(2n, 1n).expect('negative').to_equal('[-2/1]');
        tester.subject(1n, 0n).expect('negative').to_equal('[-1/0]');
        
        tester.subject(0n, 0n).expect('absolute').to_equal('[0/0]');
        tester.subject(-1n, 0n).expect('absolute').to_equal('[1/0]');
        tester.subject(-2n, 1n).expect('absolute').to_equal('[2/1]');
        tester.subject(-3n, 2n).expect('absolute').to_equal('[3/2]');
        tester.subject(-1n, 1n).expect('absolute').to_equal('[1/1]');
        tester.subject(-1n, 2n).expect('absolute').to_equal('[1/2]');
        tester.subject(0n, 1n).expect('absolute').to_equal('[0/1]');
        tester.subject(1n, 2n).expect('absolute').to_equal('[1/2]');
        tester.subject(1n, 1n).expect('absolute').to_equal('[1/1]');
        tester.subject(3n, 2n).expect('absolute').to_equal('[3/2]');
        tester.subject(2n, 1n).expect('absolute').to_equal('[2/1]');
        tester.subject(1n, 0n).expect('absolute').to_equal('[1/0]');
        
        tester.subject(0n, 0n).expect('truncate').to_equal('[0/0]');
        tester.subject(-1n, 0n).expect('truncate').to_equal('[-1/0]');
        tester.subject(-2n, 1n).expect('truncate').to_equal('[-2/1]');
        tester.subject(-3n, 2n).expect('truncate').to_equal('[-1/1]');
        tester.subject(-1n, 1n).expect('truncate').to_equal('[-1/1]');
        tester.subject(-1n, 2n).expect('truncate').to_equal('[0/1]');
        tester.subject(0n, 1n).expect('truncate').to_equal('[0/1]');
        tester.subject(1n, 2n).expect('truncate').to_equal('[0/1]');
        tester.subject(1n, 1n).expect('truncate').to_equal('[1/1]');
        tester.subject(3n, 2n).expect('truncate').to_equal('[1/1]');
        tester.subject(2n, 1n).expect('truncate').to_equal('[2/1]');
        tester.subject(1n, 0n).expect('truncate').to_equal('[1/0]');
        
        tester.subject(0n, 0n).expect('floor').to_equal('[0/0]');
        tester.subject(-1n, 0n).expect('floor').to_equal('[-1/0]');
        tester.subject(-2n, 1n).expect('floor').to_equal('[-2/1]');
        tester.subject(-3n, 2n).expect('floor').to_equal('[-2/1]');
        tester.subject(-1n, 1n).expect('floor').to_equal('[-1/1]');
        tester.subject(-1n, 2n).expect('floor').to_equal('[-1/1]');
        tester.subject(0n, 1n).expect('floor').to_equal('[0/1]');
        tester.subject(1n, 2n).expect('floor').to_equal('[0/1]');
        tester.subject(1n, 1n).expect('floor').to_equal('[1/1]');
        tester.subject(3n, 2n).expect('floor').to_equal('[1/1]');
        tester.subject(2n, 1n).expect('floor').to_equal('[2/1]');
        tester.subject(1n, 0n).expect('floor').to_equal('[1/0]');
        
        tester.subject(0n, 0n).expect('ceiling').to_equal('[0/0]');
        tester.subject(-1n, 0n).expect('ceiling').to_equal('[-1/0]');
        tester.subject(-2n, 1n).expect('ceiling').to_equal('[-2/1]');
        tester.subject(-3n, 2n).expect('ceiling').to_equal('[-1/1]');
        tester.subject(-1n, 1n).expect('ceiling').to_equal('[-1/1]');
        tester.subject(-1n, 2n).expect('ceiling').to_equal('[0/1]');
        tester.subject(0n, 1n).expect('ceiling').to_equal('[0/1]');
        tester.subject(1n, 2n).expect('ceiling').to_equal('[1/1]');
        tester.subject(1n, 1n).expect('ceiling').to_equal('[1/1]');
        tester.subject(3n, 2n).expect('ceiling').to_equal('[2/1]');
        tester.subject(2n, 1n).expect('ceiling').to_equal('[2/1]');
        tester.subject(1n, 0n).expect('ceiling').to_equal('[1/0]');

        tester.summarise();
        
        return;

        let count = 0;
        let failed = 0;

        const operation_tests: {
            [K in {
                [K in keyof Rational]: Rational[K] extends (r: Rational) => Rational ? K : never;
            }[keyof Rational]]?: [
                [bigint, bigint],
                [
                    [bigint, bigint],
                    [bigint, bigint],
                ][],
            ][];
        } = {
            plus: [
                [[0n, 0n], [
                    [[0n, 0n], [0n, 0n]],
                    [[-1n, 0n], [0n, 0n]],
                    [[-2n, 1n], [0n, 0n]],
                    [[-3n, 2n], [0n, 0n]],
                    [[-1n, 1n], [0n, 0n]],
                    [[-1n, 2n], [0n, 0n]],
                    [[0n, 1n], [0n, 0n]],
                    [[1n, 2n], [0n, 0n]],
                    [[1n, 1n], [0n, 0n]],
                    [[3n, 2n], [0n, 0n]],
                    [[2n, 1n], [0n, 0n]],
                    [[1n, 0n], [0n, 0n]],
                ]],
                [[-1n, 0n], [
                    [[0n, 0n], [0n, 0n]],
                    [[-1n, 0n], [-1n, 0n]],
                    [[-2n, 1n], [-1n, 0n]],
                    [[-3n, 2n], [-1n, 0n]],
                    [[-1n, 1n], [-1n, 0n]],
                    [[-1n, 2n], [-1n, 0n]],
                    [[0n, 1n], [-1n, 0n]],
                    [[1n, 2n], [-1n, 0n]],
                    [[1n, 1n], [-1n, 0n]],
                    [[3n, 2n], [-1n, 0n]],
                    [[2n, 1n], [-1n, 0n]],
                    [[1n, 0n], [0n, 0n]],
                ]],
                [[-2n, 1n], [
                    [[0n, 0n], [0n, 0n]],
                    [[-1n, 0n], [-1n, 0n]],
                    [[-2n, 1n], [-4n, 1n]],
                    [[-3n, 2n], [-7n, 2n]],
                    [[-1n, 1n], [-3n, 1n]],
                    [[-1n, 2n], [-5n, 2n]],
                    [[0n, 1n], [-2n, 1n]],
                    [[1n, 2n], [-3n, 2n]],
                    [[1n, 1n], [-1n, 1n]],
                    [[3n, 2n], [-1n, 2n]],
                    [[2n, 1n], [0n, 1n]],
                    [[1n, 0n], [1n, 0n]],
                ]],
                [[-3n, 2n], [
                    [[0n, 0n], [0n, 0n]],
                    [[-1n, 0n], [-1n, 0n]],
                    [[-2n, 1n], [-7n, 2n]],
                    [[-3n, 2n], [-3n, 1n]],
                    [[-1n, 1n], [-5n, 2n]],
                    [[-1n, 2n], [-2n, 1n]],
                    [[0n, 1n], [-3n, 2n]],
                    [[1n, 2n], [-1n, 1n]],
                    [[1n, 1n], [-1n, 2n]],
                    [[3n, 2n], [0n, 1n]],
                    [[2n, 1n], [1n, 2n]],
                    [[1n, 0n], [1n, 0n]],
                ]],
                [[-1n, 1n], [
                    [[0n, 0n], [0n, 0n]],
                    [[-1n, 0n], [-1n, 0n]],
                    [[-2n, 1n], [-3n, 1n]],
                    [[-3n, 2n], [-5n, 2n]],
                    [[-1n, 1n], [-2n, 1n]],
                    [[-1n, 2n], [-3n, 2n]],
                    [[0n, 1n], [-1n, 1n]],
                    [[1n, 2n], [-1n, 2n]],
                    [[1n, 1n], [0n, 1n]],
                    [[3n, 2n], [1n, 2n]],
                    [[2n, 1n], [1n, 1n]],
                    [[1n, 0n], [1n, 0n]],
                ]],
                [[-1n, 2n], [
                    [[0n, 0n], [0n, 0n]],
                    [[-1n, 0n], [-1n, 0n]],
                    [[-2n, 1n], [-5n, 2n]],
                    [[-3n, 2n], [-2n, 1n]],
                    [[-1n, 1n], [-3n, 2n]],
                    [[-1n, 2n], [-1n, 1n]],
                    [[0n, 1n], [-1n, 2n]],
                    [[1n, 2n], [0n, 1n]],
                    [[1n, 1n], [1n, 2n]],
                    [[3n, 2n], [1n, 1n]],
                    [[2n, 1n], [3n, 2n]],
                    [[1n, 0n], [1n, 0n]],
                ]],
                [[0n, 1n], [
                    [[0n, 0n], [0n, 0n]],
                    [[-1n, 0n], [-1n, 0n]],
                    [[-2n, 1n], [-2n, 1n]],
                    [[-3n, 2n], [-3n, 2n]],
                    [[-1n, 1n], [-1n, 1n]],
                    [[-1n, 2n], [-1n, 2n]],
                    [[0n, 1n], [0n, 1n]],
                    [[1n, 2n], [1n, 2n]],
                    [[1n, 1n], [1n, 1n]],
                    [[3n, 2n], [3n, 2n]],
                    [[2n, 1n], [2n, 1n]],
                    [[1n, 0n], [1n, 0n]],
                ]],
                [[1n, 2n], [
                    [[0n, 0n], [0n, 0n]],
                    [[-1n, 0n], [-1n, 0n]],
                    [[-2n, 1n], [-3n, 2n]],
                    [[-3n, 2n], [-1n, 1n]],
                    [[-1n, 1n], [-1n, 2n]],
                    [[-1n, 2n], [0n, 1n]],
                    [[0n, 1n], [1n, 2n]],
                    [[1n, 2n], [1n, 1n]],
                    [[1n, 1n], [3n, 2n]],
                    [[3n, 2n], [2n, 1n]],
                    [[2n, 1n], [5n, 2n]],
                    [[1n, 0n], [1n, 0n]],
                ]],
                [[1n, 1n], [
                    [[0n, 0n], [0n, 0n]],
                    [[-1n, 0n], [-1n, 0n]],
                    [[-2n, 1n], [-1n, 1n]],
                    [[-3n, 2n], [-1n, 2n]],
                    [[-1n, 1n], [0n, 1n]],
                    [[-1n, 2n], [1n, 2n]],
                    [[0n, 1n], [1n, 1n]],
                    [[1n, 2n], [3n, 2n]],
                    [[1n, 1n], [2n, 1n]],
                    [[3n, 2n], [5n, 2n]],
                    [[2n, 1n], [3n, 1n]],
                    [[1n, 0n], [1n, 0n]],
                ]],
                [[3n, 2n], [
                    [[0n, 0n], [0n, 0n]],
                    [[-1n, 0n], [-1n, 0n]],
                    [[-2n, 1n], [-1n, 2n]],
                    [[-3n, 2n], [0n, 1n]],
                    [[-1n, 1n], [1n, 2n]],
                    [[-1n, 2n], [1n, 1n]],
                    [[0n, 1n], [3n, 2n]],
                    [[1n, 2n], [2n, 1n]],
                    [[1n, 1n], [5n, 2n]],
                    [[3n, 2n], [3n, 1n]],
                    [[2n, 1n], [7n, 2n]],
                    [[1n, 0n], [1n, 0n]],
                ]],
                [[2n, 1n], [
                    [[0n, 0n], [0n, 0n]],
                    [[-1n, 0n], [-1n, 0n]],
                    [[-2n, 1n], [0n, 1n]],
                    [[-3n, 2n], [1n, 2n]],
                    [[-1n, 1n], [1n, 1n]],
                    [[-1n, 2n], [3n, 2n]],
                    [[0n, 1n], [2n, 1n]],
                    [[1n, 2n], [5n, 2n]],
                    [[1n, 1n], [3n, 1n]],
                    [[3n, 2n], [7n, 2n]],
                    [[2n, 1n], [4n, 1n]],
                    [[1n, 0n], [1n, 0n]],
                ]],
                [[1n, 0n], [
                    [[0n, 0n], [0n, 0n]],
                    [[-1n, 0n], [0n, 0n]],
                    [[-2n, 1n], [1n, 0n]],
                    [[-3n, 2n], [1n, 0n]],
                    [[-1n, 1n], [1n, 0n]],
                    [[-1n, 2n], [1n, 0n]],
                    [[0n, 1n], [1n, 0n]],
                    [[1n, 2n], [1n, 0n]],
                    [[1n, 1n], [1n, 0n]],
                    [[3n, 2n], [1n, 0n]],
                    [[2n, 1n], [1n, 0n]],
                    [[1n, 0n], [1n, 0n]],
                ]],
            ],

            minus: [
                [[0n, 0n], [
                    [[0n, 0n], [0n, 0n]],
                    [[-1n, 0n], [0n, 0n]],
                    [[-2n, 1n], [0n, 0n]],
                    [[-3n, 2n], [0n, 0n]],
                    [[-1n, 1n], [0n, 0n]],
                    [[-1n, 2n], [0n, 0n]],
                    [[0n, 1n], [0n, 0n]],
                    [[1n, 2n], [0n, 0n]],
                    [[1n, 1n], [0n, 0n]],
                    [[3n, 2n], [0n, 0n]],
                    [[2n, 1n], [0n, 0n]],
                    [[1n, 0n], [0n, 0n]],
                ]],
                [[-1n, 0n], [
                    [[0n, 0n], [0n, 0n]],
                    [[-1n, 0n], [0n, 0n]],
                    [[-2n, 1n], [-1n, 0n]],
                    [[-3n, 2n], [-1n, 0n]],
                    [[-1n, 1n], [-1n, 0n]],
                    [[-1n, 2n], [-1n, 0n]],
                    [[0n, 1n], [-1n, 0n]],
                    [[1n, 2n], [-1n, 0n]],
                    [[1n, 1n], [-1n, 0n]],
                    [[3n, 2n], [-1n, 0n]],
                    [[2n, 1n], [-1n, 0n]],
                    [[1n, 0n], [-1n, 0n]],
                ]],
                [[-2n, 1n], [
                    [[0n, 0n], [0n, 0n]],
                    [[-1n, 0n], [1n, 0n]],
                    [[-2n, 1n], [0n, 1n]],
                    [[-3n, 2n], [-1n, 2n]],
                    [[-1n, 1n], [-1n, 1n]],
                    [[-1n, 2n], [-3n, 2n]],
                    [[0n, 1n], [-2n, 1n]],
                    [[1n, 2n], [-5n, 2n]],
                    [[1n, 1n], [-3n, 1n]],
                    [[3n, 2n], [-7n, 2n]],
                    [[2n, 1n], [-4n, 1n]],
                    [[1n, 0n], [-1n, 0n]],
                ]],
                [[-3n, 2n], [
                    [[0n, 0n], [0n, 0n]],
                    [[-1n, 0n], [1n, 0n]],
                    [[-2n, 1n], [1n, 2n]],
                    [[-3n, 2n], [0n, 1n]],
                    [[-1n, 1n], [-1n, 2n]],
                    [[-1n, 2n], [-1n, 1n]],
                    [[0n, 1n], [-3n, 2n]],
                    [[1n, 2n], [-2n, 1n]],
                    [[1n, 1n], [-5n, 2n]],
                    [[3n, 2n], [-3n, 1n]],
                    [[2n, 1n], [-7n, 2n]],
                    [[1n, 0n], [-1n, 0n]],
                ]],
                [[-1n, 1n], [
                    [[0n, 0n], [0n, 0n]],
                    [[-1n, 0n], [1n, 0n]],
                    [[-2n, 1n], [1n, 1n]],
                    [[-3n, 2n], [1n, 2n]],
                    [[-1n, 1n], [0n, 1n]],
                    [[-1n, 2n], [-1n, 2n]],
                    [[0n, 1n], [-1n, 1n]],
                    [[1n, 2n], [-3n, 2n]],
                    [[1n, 1n], [-2n, 1n]],
                    [[3n, 2n], [-5n, 2n]],
                    [[2n, 1n], [-3n, 1n]],
                    [[1n, 0n], [-1n, 0n]],
                ]],
                [[-1n, 2n], [
                    [[0n, 0n], [0n, 0n]],
                    [[-1n, 0n], [1n, 0n]],
                    [[-2n, 1n], [3n, 2n]],
                    [[-3n, 2n], [1n, 1n]],
                    [[-1n, 1n], [1n, 2n]],
                    [[-1n, 2n], [0n, 1n]],
                    [[0n, 1n], [-1n, 2n]],
                    [[1n, 2n], [-1n, 1n]],
                    [[1n, 1n], [-3n, 2n]],
                    [[3n, 2n], [-2n, 1n]],
                    [[2n, 1n], [-5n, 2n]],
                    [[1n, 0n], [-1n, 0n]],
                ]],
                [[0n, 1n], [
                    [[0n, 0n], [0n, 0n]],
                    [[-1n, 0n], [1n, 0n]],
                    [[-2n, 1n], [2n, 1n]],
                    [[-3n, 2n], [3n, 2n]],
                    [[-1n, 1n], [1n, 1n]],
                    [[-1n, 2n], [1n, 2n]],
                    [[0n, 1n], [0n, 1n]],
                    [[1n, 2n], [-1n, 2n]],
                    [[1n, 1n], [-1n, 1n]],
                    [[3n, 2n], [-3n, 2n]],
                    [[2n, 1n], [-2n, 1n]],
                    [[1n, 0n], [-1n, 0n]],
                ]],
                [[1n, 2n], [
                    [[0n, 0n], [0n, 0n]],
                    [[-1n, 0n], [1n, 0n]],
                    [[-2n, 1n], [5n, 2n]],
                    [[-3n, 2n], [2n, 1n]],
                    [[-1n, 1n], [3n, 2n]],
                    [[-1n, 2n], [1n, 1n]],
                    [[0n, 1n], [1n, 2n]],
                    [[1n, 2n], [0n, 1n]],
                    [[1n, 1n], [-1n, 2n]],
                    [[3n, 2n], [-1n, 1n]],
                    [[2n, 1n], [-3n, 2n]],
                    [[1n, 0n], [-1n, 0n]],
                ]],
                [[1n, 1n], [
                    [[0n, 0n], [0n, 0n]],
                    [[-1n, 0n], [1n, 0n]],
                    [[-2n, 1n], [3n, 1n]],
                    [[-3n, 2n], [5n, 2n]],
                    [[-1n, 1n], [2n, 1n]],
                    [[-1n, 2n], [3n, 2n]],
                    [[0n, 1n], [1n, 1n]],
                    [[1n, 2n], [1n, 2n]],
                    [[1n, 1n], [0n, 1n]],
                    [[3n, 2n], [-1n, 2n]],
                    [[2n, 1n], [-1n, 1n]],
                    [[1n, 0n], [-1n, 0n]],
                ]],
                [[3n, 2n], [
                    [[0n, 0n], [0n, 0n]],
                    [[-1n, 0n], [1n, 0n]],
                    [[-2n, 1n], [7n, 2n]],
                    [[-3n, 2n], [3n, 1n]],
                    [[-1n, 1n], [5n, 2n]],
                    [[-1n, 2n], [2n, 1n]],
                    [[0n, 1n], [3n, 2n]],
                    [[1n, 2n], [1n, 1n]],
                    [[1n, 1n], [1n, 2n]],
                    [[3n, 2n], [0n, 1n]],
                    [[2n, 1n], [-1n, 2n]],
                    [[1n, 0n], [-1n, 0n]],
                ]],
                [[2n, 1n], [
                    [[0n, 0n], [0n, 0n]],
                    [[-1n, 0n], [1n, 0n]],
                    [[-2n, 1n], [4n, 1n]],
                    [[-3n, 2n], [7n, 2n]],
                    [[-1n, 1n], [3n, 1n]],
                    [[-1n, 2n], [5n, 2n]],
                    [[0n, 1n], [2n, 1n]],
                    [[1n, 2n], [3n, 2n]],
                    [[1n, 1n], [1n, 1n]],
                    [[3n, 2n], [1n, 2n]],
                    [[2n, 1n], [0n, 1n]],
                    [[1n, 0n], [-1n, 0n]],
                ]],
                [[1n, 0n], [
                    [[0n, 0n], [0n, 0n]],
                    [[-1n, 0n], [1n, 0n]],
                    [[-2n, 1n], [1n, 0n]],
                    [[-3n, 2n], [1n, 0n]],
                    [[-1n, 1n], [1n, 0n]],
                    [[-1n, 2n], [1n, 0n]],
                    [[0n, 1n], [1n, 0n]],
                    [[1n, 2n], [1n, 0n]],
                    [[1n, 1n], [1n, 0n]],
                    [[3n, 2n], [1n, 0n]],
                    [[2n, 1n], [1n, 0n]],
                    [[1n, 0n], [0n, 0n]],
                ]],
            ],

            times: [
                [[0n, 0n], [
                    [[0n, 0n], [0n, 0n]],
                    [[-1n, 0n], [0n, 0n]],
                    [[-2n, 1n], [0n, 0n]],
                    [[-3n, 2n], [0n, 0n]],
                    [[-1n, 1n], [0n, 0n]],
                    [[-1n, 2n], [0n, 0n]],
                    [[0n, 1n], [0n, 0n]],
                    [[1n, 2n], [0n, 0n]],
                    [[1n, 1n], [0n, 0n]],
                    [[3n, 2n], [0n, 0n]],
                    [[2n, 1n], [0n, 0n]],
                    [[1n, 0n], [0n, 0n]],
                ]],
                [[-1n, 0n], [
                    [[0n, 0n], [0n, 0n]],
                    [[-1n, 0n], [1n, 0n]],
                    [[-2n, 1n], [1n, 0n]],
                    [[-3n, 2n], [1n, 0n]],
                    [[-1n, 1n], [1n, 0n]],
                    [[-1n, 2n], [1n, 0n]],
                    [[0n, 1n], [0n, 0n]],
                    [[1n, 2n], [-1n, 0n]],
                    [[1n, 1n], [-1n, 0n]],
                    [[3n, 2n], [-1n, 0n]],
                    [[2n, 1n], [-1n, 0n]],
                    [[1n, 0n], [-1n, 0n]],
                ]],
                [[-2n, 1n], [
                    [[0n, 0n], [0n, 0n]],
                    [[-1n, 0n], [1n, 0n]],
                    [[-2n, 1n], [4n, 1n]],
                    [[-3n, 2n], [3n, 1n]],
                    [[-1n, 1n], [2n, 1n]],
                    [[-1n, 2n], [1n, 1n]],
                    [[0n, 1n], [0n, 1n]],
                    [[1n, 2n], [-1n, 1n]],
                    [[1n, 1n], [-2n, 1n]],
                    [[3n, 2n], [-3n, 1n]],
                    [[2n, 1n], [-4n, 1n]],
                    [[1n, 0n], [-1n, 0n]],
                ]],
                [[-3n, 2n], [
                    [[0n, 0n], [0n, 0n]],
                    [[-1n, 0n], [1n, 0n]],
                    [[-2n, 1n], [3n, 1n]],
                    [[-3n, 2n], [9n, 4n]],
                    [[-1n, 1n], [3n, 2n]],
                    [[-1n, 2n], [3n, 4n]],
                    [[0n, 1n], [0n, 1n]],
                    [[1n, 2n], [-3n, 4n]],
                    [[1n, 1n], [-3n, 2n]],
                    [[3n, 2n], [-9n, 4n]],
                    [[2n, 1n], [-3n, 1n]],
                    [[1n, 0n], [-1n, 0n]],
                ]],
                [[-1n, 1n], [
                    [[0n, 0n], [0n, 0n]],
                    [[-1n, 0n], [1n, 0n]],
                    [[-2n, 1n], [2n, 1n]],
                    [[-3n, 2n], [3n, 2n]],
                    [[-1n, 1n], [1n, 1n]],
                    [[-1n, 2n], [1n, 2n]],
                    [[0n, 1n], [0n, 1n]],
                    [[1n, 2n], [-1n, 2n]],
                    [[1n, 1n], [-1n, 1n]],
                    [[3n, 2n], [-3n, 2n]],
                    [[2n, 1n], [-2n, 1n]],
                    [[1n, 0n], [-1n, 0n]],
                ]],
                [[-1n, 2n], [
                    [[0n, 0n], [0n, 0n]],
                    [[-1n, 0n], [1n, 0n]],
                    [[-2n, 1n], [1n, 1n]],
                    [[-3n, 2n], [3n, 4n]],
                    [[-1n, 1n], [1n, 2n]],
                    [[-1n, 2n], [1n, 4n]],
                    [[0n, 1n], [0n, 1n]],
                    [[1n, 2n], [-1n, 4n]],
                    [[1n, 1n], [-1n, 2n]],
                    [[3n, 2n], [-3n, 4n]],
                    [[2n, 1n], [-1n, 1n]],
                    [[1n, 0n], [-1n, 0n]],
                ]],
                [[0n, 1n], [
                    [[0n, 0n], [0n, 0n]],
                    [[-1n, 0n], [0n, 0n]],
                    [[-2n, 1n], [0n, 1n]],
                    [[-3n, 2n], [0n, 1n]],
                    [[-1n, 1n], [0n, 1n]],
                    [[-1n, 2n], [0n, 1n]],
                    [[0n, 1n], [0n, 1n]],
                    [[1n, 2n], [0n, 1n]],
                    [[1n, 1n], [0n, 1n]],
                    [[3n, 2n], [0n, 1n]],
                    [[2n, 1n], [0n, 1n]],
                    [[1n, 0n], [0n, 0n]],
                ]],
                [[1n, 2n], [
                    [[0n, 0n], [0n, 0n]],
                    [[-1n, 0n], [-1n, 0n]],
                    [[-2n, 1n], [-1n, 1n]],
                    [[-3n, 2n], [-3n, 4n]],
                    [[-1n, 1n], [-1n, 2n]],
                    [[-1n, 2n], [-1n, 4n]],
                    [[0n, 1n], [0n, 1n]],
                    [[1n, 2n], [1n, 4n]],
                    [[1n, 1n], [1n, 2n]],
                    [[3n, 2n], [3n, 4n]],
                    [[2n, 1n], [1n, 1n]],
                    [[1n, 0n], [1n, 0n]],
                ]],
                [[1n, 1n], [
                    [[0n, 0n], [0n, 0n]],
                    [[-1n, 0n], [-1n, 0n]],
                    [[-2n, 1n], [-2n, 1n]],
                    [[-3n, 2n], [-3n, 2n]],
                    [[-1n, 1n], [-1n, 1n]],
                    [[-1n, 2n], [-1n, 2n]],
                    [[0n, 1n], [0n, 1n]],
                    [[1n, 2n], [1n, 2n]],
                    [[1n, 1n], [1n, 1n]],
                    [[3n, 2n], [3n, 2n]],
                    [[2n, 1n], [2n, 1n]],
                    [[1n, 0n], [1n, 0n]],
                ]],
                [[3n, 2n], [
                    [[0n, 0n], [0n, 0n]],
                    [[-1n, 0n], [-1n, 0n]],
                    [[-2n, 1n], [-3n, 1n]],
                    [[-3n, 2n], [-9n, 4n]],
                    [[-1n, 1n], [-3n, 2n]],
                    [[-1n, 2n], [-3n, 4n]],
                    [[0n, 1n], [0n, 1n]],
                    [[1n, 2n], [3n, 4n]],
                    [[1n, 1n], [3n, 2n]],
                    [[3n, 2n], [9n, 4n]],
                    [[2n, 1n], [3n, 1n]],
                    [[1n, 0n], [1n, 0n]],
                ]],
                [[2n, 1n], [
                    [[0n, 0n], [0n, 0n]],
                    [[-1n, 0n], [-1n, 0n]],
                    [[-2n, 1n], [-4n, 1n]],
                    [[-3n, 2n], [-3n, 1n]],
                    [[-1n, 1n], [-2n, 1n]],
                    [[-1n, 2n], [-1n, 1n]],
                    [[0n, 1n], [0n, 1n]],
                    [[1n, 2n], [1n, 1n]],
                    [[1n, 1n], [2n, 1n]],
                    [[3n, 2n], [3n, 1n]],
                    [[2n, 1n], [4n, 1n]],
                    [[1n, 0n], [1n, 0n]],
                ]],
                [[1n, 0n], [
                    [[0n, 0n], [0n, 0n]],
                    [[-1n, 0n], [-1n, 0n]],
                    [[-2n, 1n], [-1n, 0n]],
                    [[-3n, 2n], [-1n, 0n]],
                    [[-1n, 1n], [-1n, 0n]],
                    [[-1n, 2n], [-1n, 0n]],
                    [[0n, 1n], [0n, 0n]],
                    [[1n, 2n], [1n, 0n]],
                    [[1n, 1n], [1n, 0n]],
                    [[3n, 2n], [1n, 0n]],
                    [[2n, 1n], [1n, 0n]],
                    [[1n, 0n], [1n, 0n]],
                ]],
            ],

            divide: [
                [[0n, 0n], [
                    [[0n, 0n], [0n, 0n]],
                    [[-1n, 0n], [0n, 0n]],
                    [[-2n, 1n], [0n, 0n]],
                    [[-3n, 2n], [0n, 0n]],
                    [[-1n, 1n], [0n, 0n]],
                    [[-1n, 2n], [0n, 0n]],
                    [[0n, 1n], [0n, 0n]],
                    [[1n, 2n], [0n, 0n]],
                    [[1n, 1n], [0n, 0n]],
                    [[3n, 2n], [0n, 0n]],
                    [[2n, 1n], [0n, 0n]],
                    [[1n, 0n], [0n, 0n]],
                ]],
                [[-1n, 0n], [
                    [[0n, 0n], [0n, 0n]],
                    [[-1n, 0n], [0n, 0n]],
                    [[-2n, 1n], [1n, 0n]],
                    [[-3n, 2n], [1n, 0n]],
                    [[-1n, 1n], [1n, 0n]],
                    [[-1n, 2n], [1n, 0n]],
                    [[0n, 1n], [-1n, 0n]],
                    [[1n, 2n], [-1n, 0n]],
                    [[1n, 1n], [-1n, 0n]],
                    [[3n, 2n], [-1n, 0n]],
                    [[2n, 1n], [-1n, 0n]],
                    [[1n, 0n], [0n, 0n]],
                ]],
                [[-2n, 1n], [
                    [[0n, 0n], [0n, 0n]],
                    [[-1n, 0n], [0n, 1n]],
                    [[-2n, 1n], [1n, 1n]],
                    [[-3n, 2n], [4n, 3n]],
                    [[-1n, 1n], [2n, 1n]],
                    [[-1n, 2n], [4n, 1n]],
                    [[0n, 1n], [-1n, 0n]],
                    [[1n, 2n], [-4n, 1n]],
                    [[1n, 1n], [-2n, 1n]],
                    [[3n, 2n], [-4n, 3n]],
                    [[2n, 1n], [-1n, 1n]],
                    [[1n, 0n], [0n, 1n]],
                ]],
                [[-3n, 2n], [
                    [[0n, 0n], [0n, 0n]],
                    [[-1n, 0n], [0n, 1n]],
                    [[-2n, 1n], [3n, 4n]],
                    [[-3n, 2n], [1n, 1n]],
                    [[-1n, 1n], [3n, 2n]],
                    [[-1n, 2n], [3n, 1n]],
                    [[0n, 1n], [-1n, 0n]],
                    [[1n, 2n], [-3n, 1n]],
                    [[1n, 1n], [-3n, 2n]],
                    [[3n, 2n], [-1n, 1n]],
                    [[2n, 1n], [-3n, 4n]],
                    [[1n, 0n], [0n, 1n]],
                ]],
                [[-1n, 1n], [
                    [[0n, 0n], [0n, 0n]],
                    [[-1n, 0n], [0n, 1n]],
                    [[-2n, 1n], [1n, 2n]],
                    [[-3n, 2n], [2n, 3n]],
                    [[-1n, 1n], [1n, 1n]],
                    [[-1n, 2n], [2n, 1n]],
                    [[0n, 1n], [-1n, 0n]],
                    [[1n, 2n], [-2n, 1n]],
                    [[1n, 1n], [-1n, 1n]],
                    [[3n, 2n], [-2n, 3n]],
                    [[2n, 1n], [-1n, 2n]],
                    [[1n, 0n], [0n, 1n]],
                ]],
                [[-1n, 2n], [
                    [[0n, 0n], [0n, 0n]],
                    [[-1n, 0n], [0n, 1n]],
                    [[-2n, 1n], [1n, 4n]],
                    [[-3n, 2n], [1n, 3n]],
                    [[-1n, 1n], [1n, 2n]],
                    [[-1n, 2n], [1n, 1n]],
                    [[0n, 1n], [-1n, 0n]],
                    [[1n, 2n], [-1n, 1n]],
                    [[1n, 1n], [-1n, 2n]],
                    [[3n, 2n], [-1n, 3n]],
                    [[2n, 1n], [-1n, 4n]],
                    [[1n, 0n], [0n, 1n]],
                ]],
                [[0n, 1n], [
                    [[0n, 0n], [0n, 0n]],
                    [[-1n, 0n], [0n, 1n]],
                    [[-2n, 1n], [0n, 1n]],
                    [[-3n, 2n], [0n, 1n]],
                    [[-1n, 1n], [0n, 1n]],
                    [[-1n, 2n], [0n, 1n]],
                    [[0n, 1n], [0n, 0n]],
                    [[1n, 2n], [0n, 1n]],
                    [[1n, 1n], [0n, 1n]],
                    [[3n, 2n], [0n, 1n]],
                    [[2n, 1n], [0n, 1n]],
                    [[1n, 0n], [0n, 1n]],
                ]],
                [[1n, 2n], [
                    [[0n, 0n], [0n, 0n]],
                    [[-1n, 0n], [0n, 1n]],
                    [[-2n, 1n], [-1n, 4n]],
                    [[-3n, 2n], [-1n, 3n]],
                    [[-1n, 1n], [-1n, 2n]],
                    [[-1n, 2n], [-1n, 1n]],
                    [[0n, 1n], [1n, 0n]],
                    [[1n, 2n], [1n, 1n]],
                    [[1n, 1n], [1n, 2n]],
                    [[3n, 2n], [1n, 3n]],
                    [[2n, 1n], [1n, 4n]],
                    [[1n, 0n], [0n, 1n]],
                ]],
                [[1n, 1n], [
                    [[0n, 0n], [0n, 0n]],
                    [[-1n, 0n], [0n, 1n]],
                    [[-2n, 1n], [-1n, 2n]],
                    [[-3n, 2n], [-2n, 3n]],
                    [[-1n, 1n], [-1n, 1n]],
                    [[-1n, 2n], [-2n, 1n]],
                    [[0n, 1n], [1n, 0n]],
                    [[1n, 2n], [2n, 1n]],
                    [[1n, 1n], [1n, 1n]],
                    [[3n, 2n], [2n, 3n]],
                    [[2n, 1n], [1n, 2n]],
                    [[1n, 0n], [0n, 1n]],
                ]],
                [[3n, 2n], [
                    [[0n, 0n], [0n, 0n]],
                    [[-1n, 0n], [0n, 1n]],
                    [[-2n, 1n], [-3n, 4n]],
                    [[-3n, 2n], [-1n, 1n]],
                    [[-1n, 1n], [-3n, 2n]],
                    [[-1n, 2n], [-3n, 1n]],
                    [[0n, 1n], [1n, 0n]],
                    [[1n, 2n], [3n, 1n]],
                    [[1n, 1n], [3n, 2n]],
                    [[3n, 2n], [1n, 1n]],
                    [[2n, 1n], [3n, 4n]],
                    [[1n, 0n], [0n, 1n]],
                ]],
                [[2n, 1n], [
                    [[0n, 0n], [0n, 0n]],
                    [[-1n, 0n], [0n, 1n]],
                    [[-2n, 1n], [-1n, 1n]],
                    [[-3n, 2n], [-4n, 3n]],
                    [[-1n, 1n], [-2n, 1n]],
                    [[-1n, 2n], [-4n, 1n]],
                    [[0n, 1n], [1n, 0n]],
                    [[1n, 2n], [4n, 1n]],
                    [[1n, 1n], [2n, 1n]],
                    [[3n, 2n], [4n, 3n]],
                    [[2n, 1n], [1n, 1n]],
                    [[1n, 0n], [0n, 1n]],
                ]],
                [[1n, 0n], [
                    [[0n, 0n], [0n, 0n]],
                    [[-1n, 0n], [0n, 0n]],
                    [[-2n, 1n], [-1n, 0n]],
                    [[-3n, 2n], [-1n, 0n]],
                    [[-1n, 1n], [-1n, 0n]],
                    [[-1n, 2n], [-1n, 0n]],
                    [[0n, 1n], [1n, 0n]],
                    [[1n, 2n], [1n, 0n]],
                    [[1n, 1n], [1n, 0n]],
                    [[3n, 2n], [1n, 0n]],
                    [[2n, 1n], [1n, 0n]],
                    [[1n, 0n], [0n, 0n]],
                ]],
            ],

            modulo: [
                [[0n, 0n], [
                    [[0n, 0n], [0n, 0n]],
                    [[-1n, 0n], [0n, 0n]],
                    [[-2n, 1n], [0n, 0n]],
                    [[-3n, 2n], [0n, 0n]],
                    [[-1n, 1n], [0n, 0n]],
                    [[-1n, 2n], [0n, 0n]],
                    [[0n, 1n], [0n, 0n]],
                    [[1n, 2n], [0n, 0n]],
                    [[1n, 1n], [0n, 0n]],
                    [[3n, 2n], [0n, 0n]],
                    [[2n, 1n], [0n, 0n]],
                    [[1n, 0n], [0n, 0n]],
                ]],
                [[-1n, 0n], [
                    [[0n, 0n], [0n, 0n]],
                    [[-1n, 0n], [0n, 0n]],
                    [[-2n, 1n], [0n, 0n]],
                    [[-3n, 2n], [0n, 0n]],
                    [[-1n, 1n], [0n, 0n]],
                    [[-1n, 2n], [0n, 0n]],
                    [[0n, 1n], [0n, 0n]],
                    [[1n, 2n], [0n, 0n]],
                    [[1n, 1n], [0n, 0n]],
                    [[3n, 2n], [0n, 0n]],
                    [[2n, 1n], [0n, 0n]],
                    [[1n, 0n], [0n, 0n]],
                ]],
                [[-2n, 1n], [
                    [[0n, 0n], [0n, 0n]],
                    [[-1n, 0n], [-2n, 1n]],
                    [[-2n, 1n], [0n, 1n]],
                    [[-3n, 2n], [-1n, 2n]],
                    [[-1n, 1n], [0n, 1n]],
                    [[-1n, 2n], [0n, 1n]],
                    [[0n, 1n], [0n, 0n]],
                    [[1n, 2n], [0n, 1n]],
                    [[1n, 1n], [0n, 1n]],
                    [[3n, 2n], [1n, 1n]],
                    [[2n, 1n], [0n, 1n]],
                    [[1n, 0n], [1n, 0n]],
                ]],
                [[-3n, 2n], [
                    [[0n, 0n], [0n, 0n]],
                    [[-1n, 0n], [-3n, 2n]],
                    [[-2n, 1n], [-3n, 2n]],
                    [[-3n, 2n], [0n, 1n]],
                    [[-1n, 1n], [-1n, 2n]],
                    [[-1n, 2n], [0n, 1n]],
                    [[0n, 1n], [0n, 0n]],
                    [[1n, 2n], [0n, 1n]],
                    [[1n, 1n], [1n, 2n]],
                    [[3n, 2n], [0n, 1n]],
                    [[2n, 1n], [1n, 2n]],
                    [[1n, 0n], [1n, 0n]],
                ]],
                [[-1n, 1n], [
                    [[0n, 0n], [0n, 0n]],
                    [[-1n, 0n], [-1n, 1n]],
                    [[-2n, 1n], [-1n, 1n]],
                    [[-3n, 2n], [-1n, 1n]],
                    [[-1n, 1n], [0n, 1n]],
                    [[-1n, 2n], [0n, 1n]],
                    [[0n, 1n], [0n, 0n]],
                    [[1n, 2n], [0n, 1n]],
                    [[1n, 1n], [0n, 1n]],
                    [[3n, 2n], [1n, 2n]],
                    [[2n, 1n], [1n, 1n]],
                    [[1n, 0n], [1n, 0n]],
                ]],
                [[-1n, 2n], [
                    [[0n, 0n], [0n, 0n]],
                    [[-1n, 0n], [-1n, 2n]],
                    [[-2n, 1n], [-1n, 2n]],
                    [[-3n, 2n], [-1n, 2n]],
                    [[-1n, 1n], [-1n, 2n]],
                    [[-1n, 2n], [0n, 1n]],
                    [[0n, 1n], [0n, 0n]],
                    [[1n, 2n], [0n, 1n]],
                    [[1n, 1n], [1n, 2n]],
                    [[3n, 2n], [1n, 1n]],
                    [[2n, 1n], [3n, 2n]],
                    [[1n, 0n], [1n, 0n]],
                ]],
                [[0n, 1n], [
                    [[0n, 0n], [0n, 0n]],
                    [[-1n, 0n], [0n, 1n]],
                    [[-2n, 1n], [0n, 1n]],
                    [[-3n, 2n], [0n, 1n]],
                    [[-1n, 1n], [0n, 1n]],
                    [[-1n, 2n], [0n, 1n]],
                    [[0n, 1n], [0n, 0n]],
                    [[1n, 2n], [0n, 1n]],
                    [[1n, 1n], [0n, 1n]],
                    [[3n, 2n], [0n, 1n]],
                    [[2n, 1n], [0n, 1n]],
                    [[1n, 0n], [0n, 1n]],
                ]],
                [[1n, 2n], [
                    [[0n, 0n], [0n, 0n]],
                    [[-1n, 0n], [-1n, 0n]],
                    [[-2n, 1n], [-3n, 2n]],
                    [[-3n, 2n], [-1n, 1n]],
                    [[-1n, 1n], [-1n, 2n]],
                    [[-1n, 2n], [0n, 1n]],
                    [[0n, 1n], [0n, 0n]],
                    [[1n, 2n], [0n, 1n]],
                    [[1n, 1n], [1n, 2n]],
                    [[3n, 2n], [1n, 2n]],
                    [[2n, 1n], [1n, 2n]],
                    [[1n, 0n], [1n, 2n]],
                ]],
                [[1n, 1n], [
                    [[0n, 0n], [0n, 0n]],
                    [[-1n, 0n], [-1n, 0n]],
                    [[-2n, 1n], [-1n, 1n]],
                    [[-3n, 2n], [-1n, 2n]],
                    [[-1n, 1n], [0n, 1n]],
                    [[-1n, 2n], [0n, 1n]],
                    [[0n, 1n], [0n, 0n]],
                    [[1n, 2n], [0n, 1n]],
                    [[1n, 1n], [0n, 1n]],
                    [[3n, 2n], [1n, 1n]],
                    [[2n, 1n], [1n, 1n]],
                    [[1n, 0n], [1n, 1n]],
                ]],
                [[3n, 2n], [
                    [[0n, 0n], [0n, 0n]],
                    [[-1n, 0n], [-1n, 0n]],
                    [[-2n, 1n], [-1n, 2n]],
                    [[-3n, 2n], [0n, 1n]],
                    [[-1n, 1n], [-1n, 2n]],
                    [[-1n, 2n], [0n, 1n]],
                    [[0n, 1n], [0n, 0n]],
                    [[1n, 2n], [0n, 1n]],
                    [[1n, 1n], [1n, 2n]],
                    [[3n, 2n], [0n, 1n]],
                    [[2n, 1n], [3n, 2n]],
                    [[1n, 0n], [3n, 2n]],
                ]],
                [[2n, 1n], [
                    [[0n, 0n], [0n, 0n]],
                    [[-1n, 0n], [-1n, 0n]],
                    [[-2n, 1n], [0n, 1n]],
                    [[-3n, 2n], [-1n, 1n]],
                    [[-1n, 1n], [0n, 1n]],
                    [[-1n, 2n], [0n, 1n]],
                    [[0n, 1n], [0n, 0n]],
                    [[1n, 2n], [0n, 1n]],
                    [[1n, 1n], [0n, 1n]],
                    [[3n, 2n], [1n, 2n]],
                    [[2n, 1n], [0n, 1n]],
                    [[1n, 0n], [2n, 1n]],
                ]],
                [[1n, 0n], [
                    [[0n, 0n], [0n, 0n]],
                    [[-1n, 0n], [0n, 0n]],
                    [[-2n, 1n], [0n, 0n]],
                    [[-3n, 2n], [0n, 0n]],
                    [[-1n, 1n], [0n, 0n]],
                    [[-1n, 2n], [0n, 0n]],
                    [[0n, 1n], [0n, 0n]],
                    [[1n, 2n], [0n, 0n]],
                    [[1n, 1n], [0n, 0n]],
                    [[3n, 2n], [0n, 0n]],
                    [[2n, 1n], [0n, 0n]],
                    [[1n, 0n], [0n, 0n]],
                ]],
            ],
        };

        for (const [method, targets] of Object.entries(operation_tests)) {
            for (const [t, cases] of targets) {
                const target = new Rational(...t);
                for (const [o, e] of cases) {
                    const expected = new Rational(...e);
                    const operand = new Rational(...o);
                    count++;
                    const actual = (target[method] as (r: Rational) => Rational)(operand);
                    if (expected.not_equals(actual)) {
                        failed++;
                        console.log(`❌ FAIL - ${target}.${method}(${operand}) != ${expected}, got ${actual}`);
                    } else if (show_passed) {
                        console.log(`✅ PASS - ${target}.${method}(${operand}) = ${expected}`);
                    }
                }
            }
        }

        const rounding_tests: {
            [M in RoundMode]?: [
                [bigint, bigint],
                [bigint, bigint],
            ][];
        } = {
            [RoundMode.OUT]: [
                [[-7n, 4n], [-2n, 1n]],
                [[-3n, 2n], [-2n, 1n]],
                [[-5n, 4n], [-2n, 1n]],
                [[-3n, 4n], [-1n, 1n]],
                [[-1n, 2n], [-1n, 1n]],
                [[-1n, 4n], [-1n, 1n]],
                [[1n, 4n], [1n, 1n]],
                [[1n, 2n], [1n, 1n]],
                [[3n, 4n], [1n, 1n]],
                [[5n, 4n], [2n, 1n]],
                [[3n, 2n], [2n, 1n]],
                [[7n, 4n], [2n, 1n]],
            ],

            [RoundMode.IN]: [
                [[-7n, 4n], [-1n, 1n]],
                [[-3n, 2n], [-1n, 1n]],
                [[-5n, 4n], [-1n, 1n]],
                [[-3n, 4n], [0n, 1n]],
                [[-1n, 2n], [0n, 1n]],
                [[-1n, 4n], [0n, 1n]],
                [[1n, 4n], [0n, 1n]],
                [[1n, 2n], [0n, 1n]],
                [[3n, 4n], [0n, 1n]],
                [[5n, 4n], [1n, 1n]],
                [[3n, 2n], [1n, 1n]],
                [[7n, 4n], [1n, 1n]],
            ],

            [RoundMode.UP]: [
                [[-7n, 4n], [-1n, 1n]],
                [[-3n, 2n], [-1n, 1n]],
                [[-5n, 4n], [-1n, 1n]],
                [[-3n, 4n], [0n, 1n]],
                [[-1n, 2n], [0n, 1n]],
                [[-1n, 4n], [0n, 1n]],
                [[1n, 4n], [1n, 1n]],
                [[1n, 2n], [1n, 1n]],
                [[3n, 4n], [1n, 1n]],
                [[5n, 4n], [2n, 1n]],
                [[3n, 2n], [2n, 1n]],
                [[7n, 4n], [2n, 1n]],
            ],

            [RoundMode.DOWN]: [
                [[-7n, 4n], [-2n, 1n]],
                [[-3n, 2n], [-2n, 1n]],
                [[-5n, 4n], [-2n, 1n]],
                [[-3n, 4n], [-1n, 1n]],
                [[-1n, 2n], [-1n, 1n]],
                [[-1n, 4n], [-1n, 1n]],
                [[1n, 4n], [0n, 1n]],
                [[1n, 2n], [0n, 1n]],
                [[3n, 4n], [0n, 1n]],
                [[5n, 4n], [1n, 1n]],
                [[3n, 2n], [1n, 1n]],
                [[7n, 4n], [1n, 1n]],
            ],

            [RoundMode.EVEN]: [
                [[-7n, 4n], [-2n, 1n]],
                [[-3n, 2n], [-2n, 1n]],
                [[-5n, 4n], [-2n, 1n]],
                [[-3n, 4n], [0n, 1n]],
                [[-1n, 2n], [0n, 1n]],
                [[-1n, 4n], [0n, 1n]],
                [[1n, 4n], [0n, 1n]],
                [[1n, 2n], [0n, 1n]],
                [[3n, 4n], [0n, 1n]],
                [[5n, 4n], [2n, 1n]],
                [[3n, 2n], [2n, 1n]],
                [[7n, 4n], [2n, 1n]],
            ],

            [RoundMode.ODD]: [
                [[-7n, 4n], [-1n, 1n]],
                [[-3n, 2n], [-1n, 1n]],
                [[-5n, 4n], [-1n, 1n]],
                [[-3n, 4n], [-1n, 1n]],
                [[-1n, 2n], [-1n, 1n]],
                [[-1n, 4n], [-1n, 1n]],
                [[1n, 4n], [1n, 1n]],
                [[1n, 2n], [1n, 1n]],
                [[3n, 4n], [1n, 1n]],
                [[5n, 4n], [1n, 1n]],
                [[3n, 2n], [1n, 1n]],
                [[7n, 4n], [1n, 1n]],
            ],

            [RoundMode.HALF_IN]: [
                [[-7n, 4n], [-2n, 1n]],
                [[-3n, 2n], [-1n, 1n]],
                [[-5n, 4n], [-1n, 1n]],
                [[-3n, 4n], [-1n, 1n]],
                [[-1n, 2n], [0n, 1n]],
                [[-1n, 4n], [0n, 1n]],
                [[1n, 4n], [0n, 1n]],
                [[1n, 2n], [0n, 1n]],
                [[3n, 4n], [1n, 1n]],
                [[5n, 4n], [1n, 1n]],
                [[3n, 2n], [1n, 1n]],
                [[7n, 4n], [2n, 1n]],
            ],

            [RoundMode.HALF_OUT]: [
                [[-7n, 4n], [-2n, 1n]],
                [[-3n, 2n], [-2n, 1n]],
                [[-5n, 4n], [-1n, 1n]],
                [[-3n, 4n], [-1n, 1n]],
                [[-1n, 2n], [-1n, 1n]],
                [[-1n, 4n], [0n, 1n]],
                [[1n, 4n], [0n, 1n]],
                [[1n, 2n], [1n, 1n]],
                [[3n, 4n], [1n, 1n]],
                [[5n, 4n], [1n, 1n]],
                [[3n, 2n], [2n, 1n]],
                [[7n, 4n], [2n, 1n]],
            ],

            [RoundMode.HALF_UP]: [
                [[-7n, 4n], [-2n, 1n]],
                [[-3n, 2n], [-1n, 1n]],
                [[-5n, 4n], [-1n, 1n]],
                [[-3n, 4n], [-1n, 1n]],
                [[-1n, 2n], [0n, 1n]],
                [[-1n, 4n], [0n, 1n]],
                [[1n, 4n], [0n, 1n]],
                [[1n, 2n], [1n, 1n]],
                [[3n, 4n], [1n, 1n]],
                [[5n, 4n], [1n, 1n]],
                [[3n, 2n], [2n, 1n]],
                [[7n, 4n], [2n, 1n]],
            ],

            [RoundMode.HALF_DOWN]: [
                [[-7n, 4n], [-2n, 1n]],
                [[-3n, 2n], [-2n, 1n]],
                [[-5n, 4n], [-1n, 1n]],
                [[-3n, 4n], [-1n, 1n]],
                [[-1n, 2n], [-1n, 1n]],
                [[-1n, 4n], [0n, 1n]],
                [[1n, 4n], [0n, 1n]],
                [[1n, 2n], [0n, 1n]],
                [[3n, 4n], [1n, 1n]],
                [[5n, 4n], [1n, 1n]],
                [[3n, 2n], [1n, 1n]],
                [[7n, 4n], [2n, 1n]],
            ],

            [RoundMode.HALF_EVEN]: [
                [[-7n, 4n], [-2n, 1n]],
                [[-3n, 2n], [-2n, 1n]],
                [[-5n, 4n], [-1n, 1n]],
                [[-3n, 4n], [-1n, 1n]],
                [[-1n, 2n], [0n, 1n]],
                [[-1n, 4n], [0n, 1n]],
                [[1n, 4n], [0n, 1n]],
                [[1n, 2n], [0n, 1n]],
                [[3n, 4n], [1n, 1n]],
                [[5n, 4n], [1n, 1n]],
                [[3n, 2n], [2n, 1n]],
                [[7n, 4n], [2n, 1n]],
            ],

            [RoundMode.HALF_ODD]: [
                [[-7n, 4n], [-2n, 1n]],
                [[-3n, 2n], [-1n, 1n]],
                [[-5n, 4n], [-1n, 1n]],
                [[-3n, 4n], [-1n, 1n]],
                [[-1n, 2n], [-1n, 1n]],
                [[-1n, 4n], [0n, 1n]],
                [[1n, 4n], [0n, 1n]],
                [[1n, 2n], [1n, 1n]],
                [[3n, 4n], [1n, 1n]],
                [[5n, 4n], [1n, 1n]],
                [[3n, 2n], [1n, 1n]],
                [[7n, 4n], [2n, 1n]],
            ],
        };

        for (const [mode, cases] of Object.entries(rounding_tests)) {
            for (const [t, e] of cases) {
                const target = new Rational(...t);
                const expected = new Rational(...e);
                count++;
                const actual = target.round(Number(mode) as RoundMode);
                if (expected.not_equals(actual)) {
                    failed++;
                    console.log(`❌ FAIL - ${target}.round(${mode}) != ${expected}, got ${actual}`);
                } else if (show_passed) {
                    console.log(`✅ PASS - ${target}.round(${mode}) = ${expected}`);
                }
            }
        }

        const positional_tests: [
            [bigint, bigint],
            string,
            FormatOptions?,
        ][] = [
            [[1n, 1n], '1'],
            [[2n, 1n], '2'],
            [[3n, 1n], '3'],
            [[10n, 1n], '10'],
            [[123n, 1n], '123'],
            [[1n, 2n], '0.5'],
            [[1n, 3n], '0.3...'],
            [[1n, 3n], '0.33333...', {fraction: {min_digits: 5}}],
            [[1n, 3n], '0.33333', {fraction: {max_digits: 5}}],
            [[1n, 4n], '0.25'],
            [[1n, 5n], '0.2'],
            [[1n, 10n], '0.1'],
            [[1n, 11n], '0.[09]...'],

            [[-1n, 1n], '19', {base: -10}],
            [[-2n, 1n], '18', {base: -10}],
            [[-3n, 1n], '17', {base: -10}],
            [[-10n, 1n], '10', {base: -10}],
            [[-123n, 1n], '1937', {base: -10}],
            [[1n, 2n], '1.5', {base: -10}],
            [[3n, 2n], '2.5', {base: -10}],
            [[1n, 3n], '1.[74]...', {base: -10}],
            [[1n, 4n], '1.85', {base: -10}],
            [[3n, 4n], '1.35', {base: -10}],
            [[5n, 4n], '2.85', {base: -10}],
            [[1n, 5n], '1.8', {base: -10}],
            [[1n, 10n], '1.9', {base: -10}],
            [[1n, 11n], '1.[90]...', {base: -10}],

            [[1n, 1n], '1', {base: 2}],
            [[2n, 1n], '10', {base: 2}],
            [[3n, 1n], '11', {base: 2}],
            [[10n, 1n], '1010', {base: 2}],
            [[123n, 1n], '1111011', {base: 2}],
            [[1n, 2n], '0.1', {base: 2}],
            [[1n, 3n], '0.[01]...', {base: 2}],
            [[1n, 4n], '0.01', {base: 2}],
            [[1n, 5n], '0.[0011]...', {base: 2}],
            [[1n, 10n], '0.0[0011]...', {base: 2}],
            [[1n, 11n], '0.[0001011101]...', {base: 2}],

            [[1n, 1n], '1', {base: 0.5}],
            [[2n, 1n], '0.1', {base: 0.5}],
            [[3n, 1n], '1.1', {base: 0.5}],
            [[10n, 1n], '0.101', {base: 0.5}],
            [[123n, 1n], '1.101111', {base: 0.5}],
            [[1n, 2n], '10', {base: 0.5}],
            [[1n, 3n], '...[10]0', {base: 0.5}],
            [[1n, 4n], '100', {base: 0.5}],
            [[1n, 5n], '...[1100]0', {base: 0.5}],
            [[1n, 10n], '...[1100]00', {base: 0.5}],
            [[1n, 11n], '...[1011101000]0', {base: 0.5}],

            [[1n, 1n], '1', {base: -2}],
            [[2n, 1n], '110', {base: -2}],
            [[3n, 1n], '111', {base: -2}],
            [[10n, 1n], '11110', {base: -2}],
            [[123n, 1n], '110001111', {base: -2}],
            [[1n, 2n], '1.1', {base: -2}],
            [[3n, 2n], '110.1', {base: -2}],
            [[1n, 3n], '1.[10]...', {base: -2}],
            [[1n, 4n], '0.01', {base: -2}],
            [[3n, 4n], '1.11', {base: -2}],
            [[5n, 4n], '1.01', {base: -2}],
            [[1n, 5n], '0.[0111]...', {base: -2}],
            [[1n, 10n], '0.0[1101]...', {base: -2}],
            [[1n, 11n], '0.[01101]...', {base: -2}],

            [[1n, 1n], '1', {base: -0.5}],
            [[2n, 1n], '0.11', {base: -0.5}],
            [[3n, 1n], '1.11', {base: -0.5}],
            [[10n, 1n], '0.1111', {base: -0.5}],
            [[123n, 1n], '1.11100011', {base: -0.5}],
            [[1n, 2n], '11', {base: -0.5}],
            [[3n, 2n], '10.11', {base: -0.5}],
            [[1n, 3n], '...[01]1', {base: -0.5}],
            [[1n, 4n], '100', {base: -0.5}],
            [[3n, 4n], '111', {base: -0.5}],
            [[5n, 4n], '101', {base: -0.5}],
            [[1n, 5n], '...[1110]0', {base: -0.5}],
            [[1n, 10n], '...[1011]00', {base: -0.5}],
            [[1n, 11n], '...[10110]0', {base: -0.5}],

            [[1n, 1n], '1', {base: 16}],
            [[2n, 1n], '2', {base: 16}],
            [[3n, 1n], '3', {base: 16}],
            [[10n, 1n], 'a', {base: 16}],
            [[11n, 1n], 'b', {base: 16}],
            [[12n, 1n], 'c', {base: 16}],
            [[123n, 1n], '7b', {base: 16}],
            [[1n, 2n], '0.8', {base: 16}],
            [[15n, 16n], '0.f', {base: 16}],
            [[1n, 3n], '0.5...', {base: 16}],
            [[1n, 4n], '0.4', {base: 16}],
            [[1n, 5n], '0.3...', {base: 16}],
            [[1n, 10n], '0.19...', {base: 16}],
            [[1n, 11n], '0.[1745d]...', {base: 16}],

            [[1n, 1n], '1', {base: 1.5}],
            [[2n, 1n], '2', {base: 1.5}],
            [[3n, 2n], '10', {base: 1.5}],
            [[5n, 2n], '11', {base: 1.5}],
            [[3n, 1n], '20', {base: 1.5}],
            [[4n, 1n], '21', {base: 1.5}],
            [[5n, 1n], '22', {base: 1.5}],
            [[6n, 1n], '210', {base: 1.5}],
            [[7n, 1n], '211', {base: 1.5}],
            [[8n, 1n], '212', {base: 1.5}],
            [[9n, 1n], '2100', {base: 1.5}],
            [[10n, 1n], '2101', {base: 1.5}],
            [[123n, 1n], '2101100010', {base: 1.5}],
            [[2n, 3n], '0.1', {base: 1.5}],

            [[1n, 1n], '1', {base: -1.5}],
            [[2n, 1n], '2', {base: -1.5}],
            [[3n, 1n], '210', {base: -1.5}],
            [[4n, 1n], '211', {base: -1.5}],
            [[5n, 1n], '212', {base: -1.5}],
            [[6n, 1n], '21120', {base: -1.5}],
            [[7n, 1n], '21121', {base: -1.5}],
            [[8n, 1n], '21122', {base: -1.5}],
            [[9n, 1n], '21100', {base: -1.5}],
            [[10n, 1n], '21101', {base: -1.5}],
            [[123n, 1n], '2112010200220', {base: -1.5}],
            [[2n, 3n], '2.2', {base: -1.5}],
        ];

        for (const [t, expected, o = {}] of positional_tests) {
            const target = new Rational(...t);
            count++;
            const actual = target.to_positional(o);

            if (actual !== expected) {
                failed++;
                console.log(`❌ FAIL - ${target}.to_positional(${JSON.stringify(o)}) != ${expected}, got ${actual}`);
            } else if (show_passed) {
                console.log(`✅ PASS - ${target}.to_positional(${JSON.stringify(o)}) = ${expected}`);
            }
        }

        if (failed > 0) {
            console.log(`❌ FAILED ${failed}/${count} TESTS!`);
        } else {
            console.log(`✅ PASSED ALL ${count} TESTS!`);
        }
    }
}
