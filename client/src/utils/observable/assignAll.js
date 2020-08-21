import { pipe } from "rxjs";
import { map } from "rxjs/operators";

// check if object
const isObject = (val) => val === Object(val);

// merges all non-null inputs into one object
export const assignAll = () =>
    pipe(
        map((inputs) => inputs.filter(isObject)),
        map((inputs) => Object.assign({}, ...inputs))
    );
