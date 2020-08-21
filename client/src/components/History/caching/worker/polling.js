import { defer, of, concat, pipe, combineLatest } from "rxjs";
import { map, repeat, delay, mergeMap, share, debounceTime, pluck } from "rxjs/operators";
import { ajax } from "rxjs/ajax";
import { prependPath, hydrateParams } from "./util";
import { requestWithUpdateTime } from "./requestWithUpdateTime";
import { content$, bulkCacheContent } from "../galaxyDb";
import { lastCachedDate, buildContentPouchRequest } from "../pouchUtils";
import { buildHistoryContentsUrl, summarizeCacheOperation } from "./loadHistoryContents";
// import { enqueue } from "./queue";

/**
 * Generates an operator that takes inputs: [historyid, params] and generates
 * a repeated poll for history and history content updates. Stops when unsubscribed
 *
 * @param {object} cfg Config options for poll
 * @returns Observable operator
 */
export const pollForHistoryUpdates = (cfg = {}) => (input$) => {
    const {
        pollInterval = 5000,
        lambda = 0.15, // poll interval decay parameter
    } = cfg;

    // number of polls with the same inputs
    let counter = 0;
    const decayPeriod = () => Math.floor(pollInterval * Math.exp(lambda * counter++));

    const poll$ = defer(() =>
        input$.pipe(
            delay(decayPeriod()),
            mergeMap((inputs) => {
                const [id] = inputs;
                const historyUpdate$ = of(id).pipe(historyPoll());
                const contentUpdate$ = of(inputs).pipe(contentPoll());
                return concat(historyUpdate$, contentUpdate$);
            })
        )
    );

    return poll$.pipe(repeat());
};

// Checks server for history updates
const historyPoll = () => {
    return pipe(
        map(buildHistoryUpdateUrl),
        map(prependPath),
        requestWithUpdateTime({
            context: "poll:history",
        }),
        mergeMap((response) =>
            of(response).pipe(
                pluck("result"),
                bulkCacheContent(),
                summarizeCacheOperation(),
                map((summary) => {
                    const { totalMatches } = response;
                    return { ...summary, totalMatches };
                })
            )
        )
    );
};

// Checks server for content updates
const contentPoll = () => (src$) => {
    const input$ = src$.pipe(
        hydrateParams(),
        map(([id, p]) => [id, p.pad()]), // extend past the visible region
        share()
    );

    const baseUrl$ = input$.pipe(
        map(buildHistoryContentsUrl()) // same as regular loading query
    );

    const since$ = input$.pipe(
        map(buildContentPouchRequest),
        lastCachedDate(content$) // highest cached_at value
    );

    // build url from base request + cache-calculated last date
    const url$ = combineLatest(baseUrl$, since$).pipe(
        debounceTime(0),
        map(([url, since]) => {
            return since ? `${url}&q=update_time-gt&qv=${since}` : url;
        })
    );

    // do request
    const updates$ = url$.pipe(
        map(prependPath),
        mergeMap(ajax.getJSON),
        bulkCacheContent(),
        summarizeCacheOperation() // might be a big list
    );

    return updates$;
};


/**
 * Generates history update url
 * TODO: Move into history model? Use history model?
 * TODO: fix stupid q/qv api syntax
 * TODO: finalize a new serialization view for the new history client on the server
 *
 * @param {string} id History id
 * @returns {string} History update url without update_time
 */
export function buildHistoryUpdateUrl(id) {
    const parts = [
        `q=encoded_id-in&qv=${id}`,
        // `keys=${historyFields.join(",")}`,
        "view=betawebclient",
    ];
    const qs = parts.join("&");
    return `/api/histories?${qs}`;
}
