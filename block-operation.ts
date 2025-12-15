import {Block} from "./block.js";
import {ButtonBlock} from "./block-button.js";
import {NumberBlock} from "./block-number.js";
import {Face} from "./face.js";
import {Rational} from "./rational.js";

export interface Slot {
    element: HTMLElement,
    block?: Block,
}
export type Operation = (...values: Rational[]) => Rational;

export class OperationBlock extends Block {

    mass = 5;

    slots: Slot[] = [];

    button: Slot;

    operate?: Operation;

    public static create(operation: string, operate: Operation, position: [number, number]) {
        const block = new OperationBlock(operation, operate);
        block.set_position(position);
        document.body.append(block.element);
        return block;
    }

    constructor(operation: string, operate: Operation) {
        const element = document.createElement('div');
        element.classList.add('block-operation');
        super(element);

        const front = document.createElement('div');
        front.classList.add('face', 'front');
        element.append(front);

        const spacer_top = document.createElement('div');
        spacer_top.classList.add('spacer');
        front.append(spacer_top);

        const operation_row = document.createElement('div');
        operation_row.classList.add('operation-row');
        operation.split('#').forEach((part, i) => {
            if (i > 0) {
                const slot = document.createElement('div');
                slot.classList.add('slot');
                [
                    'back',
                    'left',
                    'right',
                    'top',
                    'bottom',
                ].forEach(name => {
                    const face = document.createElement('div');
                    face.classList.add('face', name);
                    slot.append(face);
                });
                operation_row.append(slot);
                this.slots.push({element: slot});
            }

            const text = document.createElement('div');
            text.classList.add('blue');
            if (part) text.classList.add('text');
            text.innerText = part;
            operation_row.append(text);
        });
        const button = document.createElement('div');
        button.classList.add('button-slot');
        operation_row.append(button);
        const button_block = ButtonBlock.create(
            Face.text('='),
            () => this.evaluate(),
            () => this.slots.every(slot => slot.block),
            [0, 0],
        );
        button_block.physics_enabled = false;
        button_block.shadow.classList.add('hidden');
        this.button = {
            element: button,
            block: button_block,
        };
        front.append(operation_row);

        const spacer_bottom = document.createElement('div');
        spacer_bottom.classList.add('spacer');
        front.append(spacer_bottom);

        this.size = [0, 70];

        element.append(this.face('left'));
        element.append(this.face('right'));
        element.append(this.face('top'));
        element.append(this.face('bottom'));

        setTimeout(() => this.size[0] = front.scrollWidth);

        this.operate = operate;
    }

    face(clazz: string): HTMLElement {
        const side = document.createElement('div');
        side.classList.add('face', clazz);
        if (clazz === 'right') {
            const hole = document.createElement('div');
            hole.classList.add('hole');
            side.append(hole);
        }
        return side;
    }

    update() {
        super.update();
        this.slots.forEach(slot => {
            if (slot.block) {
                const slot_pos: [number, number] = [
                    this.position[0] + slot.element.offsetLeft,
                    this.position[1] + 10,
                ];

                slot.block.elevation = this.elevation + 55;
                slot.block.set_position(slot_pos);
            }
        });

        const slot_pos: [number, number] = [
            this.position[0] + 10 + this.button.element.offsetLeft,
            this.position[1] + 20,
        ];

        this.button.block.elevation = this.elevation + 70;
        this.button.block.set_position(slot_pos);
    }

    evaluate() {
        const pos: [number, number] = [
            this.position[0] + this.size[0] - 50,
            this.position[1] + 10,
        ];

        const values = this.slots.map(slot => (slot.block as NumberBlock).value);
        const result = this.operate(...values);
        const block = NumberBlock.create(result, pos, 10);
        block.velocity[0] = 30;
        block.velocity[1] = Math.random() - 0.5;
    }
}
