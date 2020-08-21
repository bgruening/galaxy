import { of, pipe, EMPTY, BehaviorSubject } from "rxjs";
import { tap, concatMap, withLatestFrom } from "rxjs/operators";

export const deltaGreaterThan = (minDelta = 0) => {
    const last$ = new BehaviorSubject(Infinity);

    return pipe(
        withLatestFrom(last$),
        concatMap(([curr, last]) => {
            const delta = Math.abs(last - curr);
            return delta > minDelta ? of(curr) : EMPTY;
        }),
        tap((val) => last$.next(val))
    );
};
