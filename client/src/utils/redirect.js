import { getAppRoot } from "onload/loadConfig";

// Simple redirect, only here to make testing easier
export function redirectToUrl(url) {
    window.location = url;
}
export function reloadWindow() {
    window.location.reload();
}

// Prepends configured appRoot to given url
const slashCleanup = /(\/)+/g;
export function prependPath(path) {
    const root = getAppRoot();
    return `${root}/${path}`.replace(slashCleanup, "/");
}
