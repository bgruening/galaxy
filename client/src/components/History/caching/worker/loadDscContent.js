/**
 * Manual loading operators for content lists. These get run as the user scrolls
 * or filters data in the listing for immediate lookups. All of them will run
 * one or more ajax calls against the api and cache ther results.
 */
import { map, finalize, withLatestFrom } from "rxjs/operators";
// import { tag } from "rxjs-spy/operators/tag";

import { throttleDistinct } from "utils/observable/throttleDistinct";
import { bulkCacheDscContent } from "../galaxyDb";
import { prependPath, hydrateParams, chunkInputs } from "./util";
import { requestWithUpdateTime } from "./requestWithUpdateTime";
import { summarizeCacheOperation } from "./loadHistoryContents";

/**
 * Load collection content (drill down)
 * Params: contents_url + search params
 */
export const loadDscContent = (cfg = {}) => (src$) => {
    const { onceEvery = 10 * 1000 } = cfg;

    // clean and chunk inputs
    const inputs$ = src$.pipe(hydrateParams(), chunkInputs());

    // request, throttle frequently repeated requests
    const ajaxResponse$ = inputs$.pipe(
        map(buildDscContentUrl),
        throttleDistinct({ timeout: onceEvery }),
        map(prependPath),
        requestWithUpdateTime()
    );

    // add contents_url to cache data, will use it as a key
    const url$ = inputs$.pipe(
        map((inputs) => inputs[0])
    );

    const response$ = ajaxResponse$.pipe(
        withLatestFrom(url$),
        map(([response, contents_url]) => {
            return response.result.map((row) => ({ ...row, contents_url }));
        })
    );

    const cached$ = response$.pipe(
        bulkCacheDscContent(),
        summarizeCacheOperation(),
        finalize(() => {
            console.log("[loader] loadDscContent subscription end");
        })
    );

    return cached$; // enqueue(load$, "load contents");
};


// Collection + params -> request url w/o update_time
export const buildDscContentUrl = ([contents_url, params]) => {
    const { skip, limit } = params;

    let skipClause = "";
    let limitClause = "";
    if (params) {
        skipClause = `offset=${skip}`;
        limitClause = `limit=${limit}`;
    }

    const qs = [skipClause, limitClause].filter((o) => o.length).join("&");
    return `${contents_url}?${qs}`;
};
