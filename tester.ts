
type InstanceMethod<T> = {
    [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never;
}[keyof T];

export class Tester<C extends new (...args: any) => T, T = InstanceType<C>> {
    test_count = 0;
    test_success_count = 0;
    test_failure_count = 0;

    constructor(
        private clazz: C,
        private show_passed: boolean = false,
        private show_failed: boolean = false,
    ) {}

    create(...args: ConstructorParameters<C>): T {
        return  new (this.clazz)(...args as any[]) as T;
    }

    subject(...args: ConstructorParameters<C>): TestSubject<C, T> {
        const subject = this.create(...args);
        return new TestSubject(this, subject);
    }

    record_success(message?: string) {
        this.test_count++;
        this.test_success_count++;
        if (this.show_passed) console.log(message);
    }

    record_failure(message?: string) {
        this.test_count++;
        this.test_failure_count++;
        if (this.show_failed) console.error(message);
    }

    summarise() {
        if (this.test_failure_count > 0) {
            console.log(`❌ FAILED ${this.test_failure_count}/${this.test_count} TESTS!`);
        } else {
            console.log(`✅ PASSED ALL ${this.test_count} TESTS!`);
        }
    }
}

class TestSubject<C extends new (...args: any) => T, T = InstanceType<C>> {
    constructor(
        private tester: Tester<C, T>,
        private subject: T,
    ) {}

    expect<M extends InstanceMethod<T> & string>(
        method: M,
        ...args: Parameters<Extract<T[M], (...args: any[]) => any>>
    ): TestResult<C, T> {
        const result = (this.subject[method] as any)(...args);
        return new TestResult(
            this.tester,
            `${this.subject}.${method}(${args.join(', ')})`,
            result,
        );
    }
}

class TestResult<C extends new (...args: any) => T, T = InstanceType<C>> {
    constructor(
        private tester: Tester<C, T>,
        private operation: string,
        private result: any,
    ) {}

    to_equal(expected: any, strict = false): boolean {
        if (strict
            ? (this.result === expected)
            : (this.result == expected)
        ) {
            this.tester.record_success(
                `✅ PASS - ${this.operation} = ${expected}`
            );
            return true;
        } else {
            this.tester.record_failure(
                `❌ FAIL - ${this.operation} != ${expected}, got ${this.result}`
            );
            return false;
        }
    }

    to_be_truthy() {
        if (this.result) {
            this.tester.record_success(
                `✅ PASS - ${this.operation} = ${this.result}`
            );
            return true;
        } else {
            this.tester.record_failure(
                `❌ FAIL - ${this.operation} to be truthy, got ${this.result}`
            );
            return false;
        }
    }
}
