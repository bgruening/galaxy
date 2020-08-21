/**
 * Framework for a content list provider.
 * A scroller like this has 3 observables
 *
 * Cache watch
 * Watches cache for changes. Emits updates from the worker
 *
 * Loader
 * This monitors user input and loads new content on demand. It monitors the
 * pagination (skip/limit) and filter properties contained in SearchParams,
 * then issues a request to the worker to load and cache matching data.
 *
 * Polling
 * This subscribes to a long-running observable inside the worker that polls
 * the history to get updates which may not have come from the user.
 */

import { distinctUntilChanged } from "rxjs/operators";
import { activity } from "utils/observable/activity";
import { SearchParams } from "../model/SearchParams";
import { vueRxShortcuts } from "../../plugins/vueRxShortcuts";

// Computed properties ending in $ are observables and are used inside the
// provider itself. Data properties are exposed as slot props for child
// components in the rest of the Vue app. (see render function)

export default {
    mixins: [vueRxShortcuts],

    props: {
        id: { type: String, required: true },
        debouncePeriod: { type: Number, required: false, default: 200 },
    },

    data() {
        return {
            contents: [],
            params: new SearchParams(),
            loading: false,
            totalMatches: 0,
            scrollCursor: 0,
            bench: 0,
            topRows: 0,
            bottomRows: 0,
        };
    },

    created() {
        // History ID or content_url, the parent id,
        // May merge this into params as a criteria hash object.
        // params.criteria.history_id = "xyz", etc.
        this.id$ = this.watch$("id");

        // search params, deleted/visible, text filter, pagination
        // Updated by other elements of the UI through an exposed update function
        this.params$ = this.watch$("params").pipe(distinctUntilChanged(SearchParams.equals));

        // total number of search matches for filters, regardless of pagination
        // Updated when load subscriptions return from server with new contents
        this.totalMatches$ = this.watch$("totalMatches");

        // 0-1 value from the scroller, represents how far down from the top
        // the scrollTop is. Used to calculate search criteria for the cache
        // and for server requests when it cannot be calculated from data
        // that already exists in the cache
        this.scrollCursor$ = this.watch$("scrollCursor");

        // true when moving/false otherwise
        this.scrolling$ = this.scrollCursor$.pipe(activity());
    },

    methods: {
        // Allows child components to update params through events reset
        // pagination fields if filters are different

        updateParams(newParams) {
            if (!SearchParams.equals(newParams, this.params)) {
                this.params = newParams.clone();
            }
        },

        // When scroller updates, calculate a 0-1 value representing how far
        // down the scroller the user currently is. This is necessary to
        // determine search criteria (ex: hid > x) when the represented data is
        // not yet in the cache and therefore cannot be calculated exactly

        onListScroll(payload) {
            console.log("onListScroll", payload);
            const { cursor } = payload;
            this.scrollCursor = cursor;
        },

        // Equality comparator for "inputs" which is [ id, SearchParams ]
        // a combination that appears a lot in our processing streams

        inputsSame(a, b) {
            const idSame = a[0] == b[0];
            const paramSame = SearchParams.equals(a[1], b[1]);
            return idSame && paramSame;
        },

        // Generic subscriber with debugging output. Assumes you don't need
        // to do anything special with the contents. May remove

        listenTo(obs$, label) {
            if (!obs$) return;
            this.$subscribeTo(
                obs$,
                (result) => console.log(`[${label}] next`, typeof result),
                (err) => console.warn(`[${label}] error`, err),
                () => console.log(`[${label}] complete`)
            );
        },
    },

    render() {
        return this.$scopedSlots.default({
            contents: this.contents,
            params: this.params,
            totalMatches: this.totalMatches,
            loading: this.loading,
            scrolling: this.scrolling,
            // update functions, usable as event handlers for child components
            updateParams: this.updateParams,
            onListScroll: this.onListScroll,
            topRows: this.topRows,
            bottomRows: this.bottomRows,
            bench: this.bench,
        });
    },
};
