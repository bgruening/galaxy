import { from, of, pipe } from "rxjs";
import { filter, finalize, materialize, map, mergeMap, shareReplay } from "rxjs/operators";
// import { tag } from "rxjs-spy/operators/tag";
import { v4 as uuidv4 } from "uuid";

import { spawn } from "threads";
import CacheWorker from "worker-loader!./worker";

import config from "config";
import { getRootFromIndexLink } from "onload/getRootFromIndexLink";

/**
 * @constant Observable yields the worker thread instance
 */
const thread$ = of(config).pipe(
    mergeMap(async (cfg) => {
        const newThread = await spawn(new CacheWorker());
        if (!newThread) throw new MissingWorkerError();

        // Configure the worker This is sending in setings that are derived from
        // galaxy's absurd global application instance or written directly to
        // the document, which will not be available in the worker.
        const root = getRootFromIndexLink();
        const workerConfigs = { ...cfg, root };
        await newThread.configure(workerConfigs);

        return newThread;
    }),
    shareReplay(1)
);

// glorified pluck operator
const method = (fnName) => {
    return pipe(
        map((thread) => {
            if (!(fnName in thread)) throw new MissingWorkerMethodError(fnName);
            return thread[fnName];
        })
    );
};

/**
 * Give this a string of the function name on the worker thread instance,
 * returns an observable operator that transparently calls a matching oprator
 * from inside the worker .
 *
 * @param {string} fnName Name of an exposed property on the thread object
 */
export const toOperator = (fnName) => {
    const method$ = thread$.pipe(method(fnName));

    // Result of the returned method call will be an "ObservablePromise", a
    // custom object returned by thread library that the author probably thought
    // was clever. We need to fix that by turning it back to a real observable

    const cleanMethod$ = method$.pipe(
        map((f) => (...args) => from(f(...args))) // I'm a real boy now!
    );

    const operator = () => (src$) => {
        // identifies subscription so we can match external observable with
        // itnernal observable
        const id = uuidv4();

        return cleanMethod$.pipe(
            mergeMap((method) =>
                src$.pipe(
                    materialize(),
                    map((notification) => {
                        return method({ id, ...notification });
                    }),
                    // first emission will be the observable created by threads
                    // that's the only one we want, rest should be nulls
                    filter(Boolean),
                    // subscribe to the observable threads made
                    mergeMap((val) => val),
                    // unsub when exterior observable completes
                    finalize(() => method({ id, kind: "C" }))
                )
            )
        );
    };

    return operator;
};

/**
 * Returns an async function from a property on the thread object. This is
 * actually what was already there, but we're using thread$ to manage the
 * lifetime of the worker instance, so we'll derive the function from the thread
 * observable.
 *
 * @param {string} workerMethod Name of method inside the worker
 * @return {Function} Function that returns a promise
 */
export const toPromise = (fnName) => {
    const methodPromise = thread$.pipe(method(fnName)).toPromise();
    return async (...request) => {
        const fn = await methodPromise;
        return await fn(...request);
    };
};

/**
 * Custom Errors
 */

class MissingWorkerError extends Error {}

class MissingWorkerMethodError extends Error {
    constructor(missingMethod, ...args) {
        const msg = `
            Missing method on client cache worker: ${missingMethod}.
            Please write a function named ${missingMethod} in caching/cacheWorker.js
        `;
        super(msg, ...args);
    }
}
