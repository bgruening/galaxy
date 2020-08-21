import moment from "moment";
import { map, mergeMap, withLatestFrom } from "rxjs/operators";
import { SearchParams } from "../model/SearchParams";

/**
 * Generate a PouchDB selector for a specified history, filters, and a rough
 * guess of where to start looking.
 *
 * Can't use skip because there might be big un-cached regions of the history
 * and we need to be able to select without loading everything
 */
export const buildContentPouchRequest = (cfg = {}) => (src$) => {
    const { limit = SearchParams.pageSize, seek = "desc" } = cfg;

    return src$.pipe(
        map((inputs) => {
            const [history_id, params, targetHid] = inputs;

            const request = {
                selector: {
                    history_id: { $eq: history_id },
                    hid: {},
                    ...buildContentSelectorFromParams(params),
                },
                sort: [
                    { history_id: "desc" },
                    { hid: "desc" },
                ],
                limit,
            };

            // looking down the list from the guess hid
            if (seek == "desc") {
                request.selector.hid = {
                    $lte: targetHid,
                };
            }

            // look up the list from the guess hid
            else if (seek == "asc") {
                request.selector.hid = {
                    $gt: targetHid,
                };
                request.sort = [
                    { history_id: "asc" },
                    { hid: "asc" },
                ];
            } else {
                throw new Error("Unhandled seek direction, are you from another dimension?", seek);
            }

            return request;
        })
    );
};

/**
 * Build search selector for params filters:
 * deleted, visible, text search
 *
 * @param {SearchParams} params
 */
export function buildContentSelectorFromParams(params) {
    const selector = {
        visible: { $eq: true },
        isDeleted: { $eq: false },
    };

    if (params.showDeleted) {
        selector.visible = {};
        selector.isDeleted = { $eq: true };
    }

    if (params.showHidden) {
        selector.isDeleted = {};
        selector.visible = { $eq: false };
    }

    if (params.showDeleted && params.showHidden) {
        selector.visible = { $eq: false };
        selector.isDeleted = { $eq: true };
    }

    const textFields = params.parseTextFilter();
    for (const [field, val] of textFields.entries()) {
        selector[field] = { $regex: new RegExp(val, "gi") };
    }

    return selector;
}

/**
 * Collection contents, takes a contents_url representing the parent and
 * search params for filters/pagination
 */
export const buildCollectionContentRequest = ([contents_url, params]) => {
    // const { skip, limit, filterText } = params;
    return {
        selector: {
            // we put the contents_url in the id, should
            // come back with auto ordered and sorted results
            _id: { $regex: new RegExp(contents_url, "i") },
            // ...buildSelectorFromParams(params),
        },
        // skip,
        // limit
    };
};

/**
 * Finds the most recently cached row matching the search.
 */
export function lastCachedContentRequest([history_id, params]) {
    return {
        selector: {
            cached_at: { $gt: null }, // stupid but required syntax
            history_id: { $eq: history_id },
            ...buildContentSelectorFromParams(params),
        },
        sort: [{ cached_at: "desc" }],
        // limit: 1,
    };
}

/**
 * Returns latest cache date from the cache.
 *
 * This seemingly simple calculation is complicated because the galaxy API
 * currently returns update_times that are more precise than javascript dates.
 *
 * For example. The server will return an update_time as:
 *     2020-07-02T17:25:09.385026
 *
 * When parsing a javascript date, however, we don't have that many decimals.
 *     2020-07-02T17:25:09Z
 *
 * This means that trying to perform an inequality filter:
 *     update_time-gt=2020-07-02T17:25:09Z
 *
 * ...will always fail because of those extra fractions of a millisecond. And
 * given the granularity of the date storage it is not safe to "just add one
 * more" to the outgoing value, given that there may indeed be lost records if we do that.
 *
 * source stream: pouchdb-find query config
 */
export const lastCachedDate = (db$) => (query$) => {
    return query$.pipe(
        find(db$),
        map((docs) => {
            if (!docs.length) return null;
            const dates = docs.map((d) => d.cached_at);
            const maxDate = Math.max(...dates);
            return moment.utc(maxDate).toISOString();
        })
    );
};

/**
 * Pouchdb-find as an operator
 *
 * @param {Observable} db$ Observable pouchDb instance
 */
export const find = (db$) => (query$) => {
    return query$.pipe(
        withLatestFrom(db$),
        mergeMap(async ([query, db]) => {
            const response = await db.find(query);
            return response.docs || [];
        })
    );
};
