import { concat } from "rxjs";
import { async } from "rxjs/internal/scheduler/async";
import { debounceTime, publish, take } from "rxjs/operators";

export const debounceTimeAfter = (amount, dueTime, scheduler = async) => {
    return publish((value) => concat(value.pipe(take(amount)), value.pipe(debounceTime(dueTime, scheduler))));
};

export const debounceTimeAfterFirst = (dueTime, scheduler = async) => {
    return debounceTimeAfter(1, dueTime, scheduler);
};
