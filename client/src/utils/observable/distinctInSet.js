/**
 * Distinct, but with an externally-provided previous result set which allows us
 * to decide the scope of the distinction
 */
import { pipe } from "rxjs";
import { filter, tap } from "rxjs/operators";

export const distinctInSet = (previous = new Set(), debug = false) =>
    pipe(
        filter((val) => {
            const inSet = previous.has(val);
            if (debug) {
                const label = inSet ? "in set" : "not in set";
                console.log(label);
                console.log(`http://localhost:8080${val}`);
            }
            return !inSet;
        }),
        tap((val) => previous.add(val))
    );
