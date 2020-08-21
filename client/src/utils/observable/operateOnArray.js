/**
 * Invoke an operation on each item in the array of a source result such as an
 * ajax response. The Passed operation should be something that ultimately
 * completes or the forkJoin will never end.
 */
import { of, pipe, forkJoin } from "rxjs";
import { map, mergeMap } from "rxjs/operators";

// cache an array of raw content objects return result
export const operateOnArray = (operation) =>
    pipe(
        map((list) => {
            // turn an array into an array of observables where each item in the
            // inital array becomes the source of the passed operator
            return list.map((item) => of(item).pipe(operation));
        }),
        // wait for all those operations to complete.
        mergeMap((obsList) => forkJoin(obsList))
    );
