
export abstract class Block {

    static instances: Block[] = [];

    position: [number, number] = [0, 0];
    size: [number, number];

    elevation = 0;

    mass: number = 1;
    velocity: [number, number] = [0, 0];
    transforms: string[] = [];

    _hovering = false;
    _dragging = false;

    draggable = true;
    pressable = false;
    updatable = false;
    physics_enabled = true;

    shadow: HTMLElement;

    protected constructor(
        public readonly element: HTMLElement,
    ) {
        Block.instances.push(this);
        element.classList.add('block');

        element.addEventListener('mouseenter', () => this.hover_start());
        element.addEventListener('touchstart', () => {
            this.hover_start();
            this.dragging = true;
        });

        element.addEventListener('mouseleave', () => this.hover_end());
        document.body.addEventListener('touchend', () => {
            this.dragging = false;
            this.hover_end();
        });

        this.shadow = document.createElement('div');
        this.shadow.classList.add('shadow');
        document.body.append(this.shadow);
    }

    private hover_start() {
        this.hovering = true;
    }

    private hover_end() {
        this.hovering = false;
    }

    set hovering(hovering: boolean) {
        this._hovering = hovering;
        this.update();
    }

    get hovering() {
        return this._hovering;
    }

    set dragging(dragging: boolean) {
        if (dragging !== this._dragging) {
            this._dragging = dragging;
            if (dragging) {
                if (this.draggable) {
                    this.elevation += 100;
                    this.on_lift();
                }
                this.on_click_start();
            } else {
                if (this.draggable) {
                    this.elevation -= 100;
                    this.on_drop();
                }
                this.on_click_release();
            }
            this.update();
        }
    }

    get dragging() {
        return this._dragging;
    }

    get centre() {
        return [
            this.position[0] + this.size[0] / 2,
            this.position[1] + this.size[1] / 2,
        ]
    }

    set_position(position: [number, number]) {
        this.position = position;
        this.update();
    }

    move(displacement: [number, number]) {
        this.velocity[0] = (this.velocity[0] + displacement[0]) / 2;
        this.velocity[1] = (this.velocity[1] + displacement[1]) / 2;
        this.position[0] += displacement[0];
        this.position[1] += displacement[1];
        this.on_move();
        this.update();
    }

    update() {
        this.element.style.width = `${this.size[0]}px`;
        this.element.style.height = `${this.size[1]}px`;
        this.element.style.left = `${this.position[0]}px`;
        this.element.style.top = `${this.position[1]}px`;
        this.element.style.transform = [
            `translateZ(${this.elevation}px)`,
            ...this.transforms,
        ].join(' ');

        this.shadow.style.left = `${this.position[0] + 12}px`;
        this.shadow.style.top = `${this.position[1] + 12}px`;
        this.shadow.style.width = `${this.size[0] - 24}px`;
        this.shadow.style.height = `${this.size[1] - 24}px`;
        this.shadow.classList.remove('lifted', 'pressed');
        const shadow_class = this.draggable ? 'lifted' : this.pressable ? 'pressed' : null;
        if (shadow_class && this.dragging) this.shadow.classList.add(shadow_class);
    }

    collides(block: Block): boolean {
        return this.position[0] < block.position[0] + block.size[0] &&
            this.position[1] < block.position[1] + block.size[1] &&
            block.position[0] < this.position[0] + this.size[0] &&
            block.position[1] < this.position[1] + this.size[1];
    }

    on_lift() {}

    on_drop() {}

    on_move() {}

    on_click_start() {}
    on_click_release() {}
}

let mouse_start: [number, number] = [0, 0];

document.addEventListener('pointerdown', () => {
    Block.instances.forEach(block => {
        if (block.hovering) {
            block.dragging = true;
        }
    });
});

document.addEventListener('pointermove', ({x, y}) => {
    Block.instances.forEach(block => {
        if (block.draggable && block.dragging) {
            block.move([x - mouse_start[0], y - mouse_start[1]]);
        }
    });
    mouse_start = [x, y];
});

document.addEventListener('pointerup', () => {
    Block.instances.forEach(block => {
        block.dragging = false;
    });
});

let p: number = null;
function frame(t: number) {
    if (!p) p = t;
    while (p < t) {
        Block.instances.forEach((block, i) => {
            if (!block.dragging && block.physics_enabled) {
                Block.instances.slice(i + 1).forEach(block2 => {
                    if (!block2.dragging &&
                        block2.physics_enabled &&
                        block.collides(block2)
                    ) {

                        const difference = [
                            block2.centre[0] - block.centre[0],
                            block2.centre[1] - block.centre[1],
                        ];

                        const sign_difference = difference.map(d => Math.sign(d));
                        const abs_difference = Math.sqrt(difference[0] ** 2 + difference[1] ** 2) || 1;

                        const speed = [0, 0];

                        if (Math.sign(block.velocity[0]) !== -sign_difference[0]) speed[0] += Math.abs(block.velocity[0]) * block.mass;
                        if (Math.sign(block.velocity[1]) !== -sign_difference[1]) speed[1] += Math.abs(block.velocity[1]) * block.mass;
                        if (Math.sign(block2.velocity[0]) !== sign_difference[0]) speed[0] += Math.abs(block2.velocity[0]) * block2.mass;
                        if (Math.sign(block2.velocity[1]) !== sign_difference[1]) speed[1] += Math.abs(block2.velocity[1]) * block2.mass;

                        let momentum = [
                            speed[0] * sign_difference[0],
                            speed[1] * sign_difference[1],
                        ];

                        if (momentum[0] === 0 && momentum[1] === 0) momentum = difference.map(d => d / abs_difference);

                        if (!block.draggable || !block2.draggable) momentum = momentum.map(v => v * 2);

                        if (block.draggable) {
                            block.velocity[0] -= momentum[0] / block.mass;
                            block.velocity[1] -= momentum[1] / block.mass;
                        }

                        if (block2.draggable) {
                            block2.velocity[0] += momentum[0] / block2.mass;
                            block2.velocity[1] += momentum[1] / block2.mass;
                        }
                    }
                });
            }
        });

        const table_size = [
            document.body.offsetWidth,
            document.body.offsetHeight,
        ];

        Block.instances.forEach(block => {
            if (!block.dragging && block.draggable && block.physics_enabled) {
                if (block.position[0] < 50) block.velocity[0] += Math.max(1, -2 * block.velocity[0]);
                if (block.position[1] < 50) block.velocity[1] += Math.max(1, -2 * block.velocity[1]);
                if (block.position[0] + block.size[0] > table_size[0] - 50) block.velocity[0] -= Math.max(1, 2 * block.velocity[0]);
                if (block.position[1] + block.size[1] > table_size[1] - 50) block.velocity[1] -= Math.max(1, 2 * block.velocity[1]);

                if (Math.abs(block.velocity[0]) > 0.1 || Math.abs(block.velocity[1]) > 0.1) {
                    block.velocity = block.velocity.map(v => Math.min(100, Math.abs(v)) * Math.sign(v)) as [number, number];
                    block.move(block.velocity);
                    block.velocity[0] *= 0.8;
                    block.velocity[1] *= 0.8;
                } else {
                    block.velocity[0] = 0;
                    block.velocity[1] = 0;
                }
            }
        });

        Block.instances.forEach(block => {
            if (block.updatable) block.update();
        });

        p += 10;
    }
    window.requestAnimationFrame(frame);
}

window.requestAnimationFrame(frame);
