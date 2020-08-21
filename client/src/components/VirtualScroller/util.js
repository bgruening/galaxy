// dumb formatter
export function cssLength(str, unit = "px") {
    if (str == null || str === "") {
        return undefined;
    } else if (isNaN(+str)) {
        return String(str);
    } else {
        const val = Number(str);
        return `${val}${unit}`;
    }
}
