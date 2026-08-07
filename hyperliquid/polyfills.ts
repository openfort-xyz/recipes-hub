import "event-target-polyfill";

if (!globalThis.CustomEvent) {
    (globalThis as any).CustomEvent = function (type: string, params?: CustomEventInit) {
        params = params || {};
        const event = new Event(type, params) as CustomEvent;
        (event as any).detail = params.detail || null;
        return event;
    };
}

// Hermes exposes AbortController but not always the AbortSignal global — referencing the bare
// identifier throws at bundle init, so recover the class from a controller instance instead.
const g = globalThis as any;
if (!g.AbortSignal && g.AbortController) {
    g.AbortSignal = new g.AbortController().signal.constructor;
}

if (g.AbortSignal && !g.AbortSignal.timeout) {
    g.AbortSignal.timeout = function (delay: number) {
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