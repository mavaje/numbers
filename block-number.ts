import {Block} from "./block.js";
import {OperationBlock, Slot} from "./block-operation.js";
import {Face} from "./face.js";
import {Rational} from "./rational.js";

export type NumberMode =
    'dots' |
    'fraction' |
    'decimal' |
    'word' |
    'roman' |
    'scientific';

export class NumberBlock extends Block {

    public static MODE: NumberMode = 'dots';

    private static SIZE = 50;

    private static FACE_TRANSFORMS: {
        [M in NumberMode]: [string, string];
    } = {
        'dots': ['', ''],
        'fraction': ['rotateY(270deg)', 'rotateY(90deg)'],
        'decimal': ['rotateY(180deg)', 'rotateY(180deg)'],
        'word': ['rotateY(90deg)', 'rotateY(270deg)'],
        'roman': ['rotateX(270deg)', 'rotateX(90deg)'],
        'scientific': ['rotateX(90deg)', 'rotateX(270deg)'],
    };

    size: [number, number] = [NumberBlock.SIZE, NumberBlock.SIZE];

    elevation = 25;

    in_slot?: Slot;

    public faces: {
        [M in NumberMode]?: HTMLElement;
    } = {};

    public static create(value: Rational, position: [number, number], elevate = 0) {
        const block = new NumberBlock(value);
        block.set_position(position);
        block.change_mode(NumberBlock.MODE, elevate);
        document.body.append(block.element);
        return block;
    }

    public static set_mode(mode: NumberMode) {
        NumberBlock.MODE = mode;
        Block.instances.forEach(block => {
            if (block instanceof NumberBlock) block.change_mode(mode);
        });
    }

    constructor(
        public readonly value: Rational,
    ) {
        const element = document.createElement('div');
        element.classList.add('block-number');
        super(element);
        element.style.color = this.colour();

        if (this.value.is_undefined()) {
            element.classList.add('error');
            const error_face = this.face_base('dots', Face.text('ERROR'));
            error_face.classList.add('front');
            element.append(error_face);
            element.append(this.face_base('fraction'));
            element.append(this.face_base('decimal'));
            element.append(this.face_base('word'));
            element.append(this.face_base('roman'));
            element.append(this.face_base('scientific'));
        } else {
            element.append(this.face_dots());
            element.append(this.face_fraction());
            element.append(this.face_decimal());
            element.append(this.face_word());
            element.append(this.face_roman());
            element.append(this.face_scientific());
        }
    }

    public colour(): string {
        const value = this.value.to_float();
        let hue = 240;
        if (value > 0) hue = 165 - 30 / (1 + value);
        else if (value < 0) hue = 315 + 30 / (1 - value);
        return `hsl(${hue}deg, 100%, ${25 + 10 / (1 + Math.abs(value))}%)`;
    }

    change_mode(mode: NumberMode, elevate = 50) {
        if (!this.value.is_undefined()) {
            const transform = () => {
                this.transforms = [NumberBlock.FACE_TRANSFORMS[mode][1]];
                Object.values(this.faces).forEach(face => face.classList.remove('front'));
                this.faces[mode].classList.add('front');
                this.update();
                if (elevate) {
                    this.shadow.classList.add('lifted');
                    setTimeout(() => {
                        this.elevation -= elevate;
                        this.update();
                    }, 100);
                }
            };

            if (elevate && document.body.contains(this.element)) {
                this.elevation += elevate;
                this.update();
                this.shadow.classList.add('lifted');
                setTimeout(transform, 100);
            } else {
                transform();
            }
        }
    }

    face_base(mode: NumberMode, face: HTMLElement = Face.base()) : HTMLElement {
        face.style.transform = [
            NumberBlock.FACE_TRANSFORMS[mode][0],
            `translateZ(${NumberBlock.SIZE / 2}px)`,
        ].join(' ');
        this.faces[mode] = face;
        return face;
    }

    face_decimal() : HTMLElement {
        return this.face_base('decimal', Face.decimal(this.value));
    }

    face_dots() : HTMLElement {
        return this.face_base('dots', Face.dots(this.value, this.colour()));
    }

    face_fraction() : HTMLElement {
        return this.face_base('fraction', Face.fraction(this.value));
    }

    face_word() : HTMLElement {
        return this.face_base('word', Face.word(this.value));
    }

    face_roman() : HTMLElement {
        return this.face_base('roman', Face.roman(this.value));
    }

    face_scientific() : HTMLElement {
        return this.face_base('scientific', Face.scientific(this.value));
    }

    on_lift() {
        if (this.in_slot) {
            const slot = this.in_slot;
            this.in_slot = null;
            this.elevation = 125;
            this.physics_enabled = true;
            this.shadow.classList.remove('hidden');
            slot.block = null;
        }
    }

    on_drop() {
        Block.instances.forEach(block => {
            if (block instanceof OperationBlock) {
                block.slots.forEach(slot => {
                    if (!slot.block) {
                        const slot_pos = [
                            block.position[0] + slot.element.offsetLeft,
                            block.position[1] + 10,
                        ];

                        if (Math.abs(slot_pos[0] - this.position[0]) < 25 &&
                            Math.abs(slot_pos[1] - this.position[1]) < 25
                        ) {
                            this.in_slot = slot;
                            this.physics_enabled = false;
                            this.shadow.classList.add('hidden');
                            slot.block = this;
                            block.update();
                        }
                    }
                });
            }
        });
    }
}
