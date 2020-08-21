import { pipe } from "rxjs";
import { map, finalize, withLatestFrom, pluck, share } from "rxjs/operators";
import { tag } from "rxjs-spy/operators/tag";

import { throttleDistinct } from "utils/observable/throttleDistinct";
import { bulkCacheContent } from "../galaxyDb";
import { prependPath, hydrateParams, chunkParam, getPropRange } from "./util";
import { requestWithUpdateTime } from "./requestWithUpdateTime";
import { SearchParams } from "../../model/SearchParams";
// import { enqueue } from "./queue";


/**
 * Turn historyId + params into content update urls. Send distinct requests
 * within a 30 sec period. Polling will pick up any other server side variations
 */
export const loadHistoryContents = (cfg = {}) => (src$) => {
    const {
        // This is how often you can request the exact same content url
        // We have a separate polling operation so this isn't urgent
        onceEvery = 60 * 1000,

        // Search a few pages up and down to get a little overlap in the cache for
        // when the user scrolls a little
        pageSize = SearchParams.pageSize,

        // will turn the hid input HID into a multiple of pageSize so we don't
        // get so many unique urls, this must be smaller than the pageSize
        chunkSize = Math.floor(SearchParams.pageSize / 2),
    } = cfg;

    // [historyId, filters, hid]
    const inputs$ = src$.pipe(
        hydrateParams(1),
        // chunk the HID so we don't end up with a zillion uncacheable urls
        chunkParam(2, chunkSize),
        tag("loadHistoryContents inputs")
    );

    const url$ = inputs$.pipe(
        map(buildHistoryContentsUrl({ pageSize })),
        // ignore repeated identical requests
        throttleDistinct({ timeout: onceEvery }),
        map(prependPath),
        tag("loadHistoryContents url")
    );

    const ajaxResponse$ = url$.pipe(
        requestWithUpdateTime(),
        share()
    );

    const cacheSummary$ = ajaxResponse$.pipe(
        pluck("response"),
        bulkCacheContent(),
        summarizeCacheOperation()
    );

    const load$ = cacheSummary$.pipe(
        withLatestFrom(ajaxResponse$),
        map(([summary, ajaxResponse]) => {

            // actual list
            const { xhr, response = [] } = ajaxResponse;
            const { max: maxHid, min: minHid } = getPropRange(response, "hid");

            // header counts
            const matchesUp = +xhr.getResponseHeader('matches_up');
            const matchesDown = +xhr.getResponseHeader('matches_down');
            const totalMatchesUp = +xhr.getResponseHeader('total_matches_up');
            const totalMatchesDown = +xhr.getResponseHeader('total_matches_down');

            // Hid on the first row of the page that the down query returned
            // this should correspond to the hid we sent in the query, if there
            // was a matching result, or the closest one if there wasn't an
            // exact match
            const startHid = response[matchesUp].hid;

            const result = {
                ...summary,
                startHid, // closest HID to requested target
                minHid,
                maxHid,
                matchesUp,
                matchesDown,
                matches: response.length,
                totalMatchesUp,
                totalMatchesDown,
                totalMatches: totalMatchesUp + totalMatchesDown
            }

            return result;
        }),
        finalize(() => {
            // we unsubscribe when the history changes, otherwise we keep this
            // subscription so that throttleDistinct continues to filter out
            // repeated requests.
            console.log("[loadHistoryContents] loadHistoryContents unsubscribed");
        })
    );

    return load$;
};



// generate a content update url for the indicated history id, searches up or
// down from passed hid threshold
export const buildHistoryContentsUrl = (cfg = {}) => (inputs) => {
    const [ historyId, filters, hid ] = inputs;
    const { pageSize = SearchParams.pageSize } = cfg;
    // console.log("buildHistoryContentsUrl", hid, dir);

    // Filtering
    const { showDeleted, showHidden } = filters;
    let deletedClause = "deleted=False";
    let visibleClause = "visible=True";
    if (showDeleted) {
        deletedClause = "deleted=True";
        visibleClause = "";
    }
    if (showHidden) {
        deletedClause = "";
        visibleClause = "visible=False";
    }
    if (showDeleted && showHidden) {
        deletedClause = "deleted=True";
        visibleClause = "visible=False";
    }

    const filterMap = filters.parseTextFilter();
    const textfilters = Array.from(filterMap.entries())
        .map(([field, val]) => `${field}-contains=${val}`);

    const parts = [
        deletedClause,
        visibleClause,
        ...textfilters,
    ];

    const baseUrl = `/api/histories/${historyId}/contents/near/${hid}/${pageSize}`;
    const qs = parts.filter((o) => o.length).join("&");

    return `${baseUrl}?${qs}`;
};


/**
 * Once data was cached, there's no need to send everything back over into the
 * main thread since the cache watcher will pick up those new values. This just
 * summarizes what pouchdb did during the bulk cache and sends back some stats.
 */
export const summarizeCacheOperation = () => {
    return pipe(
        map((list) => {
            const cached = list.filter((result) => result.updated || result.ok);
            return {
                updatedItems: cached.length,
                totalReceived: list.length,
            };
        })
    );
};
