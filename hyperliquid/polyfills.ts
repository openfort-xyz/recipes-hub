import "event-target-polyfill";

if (!globalThis.CustomEvent) {
    (globalThis as any).CustomEvent = function (type: string, params?: CustomEventInit) {
        params = params || {};
        const event = new Event(type, params) as CustomEvent;
        (event as any).detail = params.detail || null;
        return event;
    };
}

if (!AbortSignal.timeout) {
    AbortSignal.timeout = function (delay) {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), delay);
        return controller.signal;
    };
}

if (!Promise.withResolvers) {
    Promise.withResolvers = function <T>(): PromiseWithResolvers<T> {
        let resolve!: (value: T | PromiseLike<T>) => void;
        let reject!: (reason?: any) => void;
        const promise = new Promise<T>((res, rej) => {
            resolve = res;
            reject = rej;
        });
        return { promise, resolve, reject };
    };
}