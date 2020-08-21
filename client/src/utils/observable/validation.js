import { pipe, of, throwError } from "rxjs";
import { mergeMap } from "rxjs/operators";

export const validate = (validator, err) =>
    pipe(
        mergeMap((val) => {
            return validator(val) ? of(val) : throwError(err);
        })
    );

export const validateType = (type, errMsg = `Value is wrong type, expected: ${type.constructor.name}`) =>
    pipe(validate((val) => val instanceof type, errMsg));

export const validateArray = (msg = "Not an array") => pipe(validate(Array.isArray, msg));
