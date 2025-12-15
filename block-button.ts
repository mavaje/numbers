import {Block} from "./block.js";

export class ButtonBlock extends Block {

    private static SIZE = 30;

    size: [number, number] = [ButtonBlock.SIZE, ButtonBlock.SIZE];

    draggable = false;
    physics_enabled = false;
    pressable = true;
    updatable = true;

    public on_press: () => void;
    public is_active: () => boolean;

    pressed: number = 0;

    public static create(
        face: HTMLElement,
        on_press: () => void,
        is_active: () => boolean,
        position: [number, number],
    ) {
        const block = new ButtonBlock(face, on_press, is_active);
        block.set_position(position);
        document.body.append(block.element);
        return block;
    }

    constructor(
        face: HTMLElement,
        on_press: () => void,
        is_active: () => boolean,
    ) {
        const element = document.createElement('div');
        element.classList.add('block-button');
        super(element);
        this.on_press = on_press;
        this.is_active = is_active;

        face.classList.add('face', 'front');
        element.append(face);

        [
            'left',
            'right',
            'top',
            'bottom',
        ].forEach(name => {
            const face = document.createElement('div');
            face.classList.add('face', name);
            element.append(face);
        });
    }

    update() {
        this.pressable = this.pressed > 0 || this.is_active();
        if (this.pressable) {
            this.element.classList.add('enabled');
        } else {
            this.element.classList.remove('enabled');
        }
        super.update();
    }

    on_click_start() {
        if (this.is_active() && !this.pressed) {
            this.pressed = Date.now();
            this.elevation -= 5;
            this.element.classList.add('pressed');
            this.on_press();
        }
    }

    on_click_release() {
        if (this.pressed) {
            setTimeout(() => {
                this.pressed = null;
                this.elevation += 5;
                this.element.classList.remove('pressed');
                this.update();
            }, Math.max(0, this.pressed + 200 - Date.now()));
        }
    }
}
