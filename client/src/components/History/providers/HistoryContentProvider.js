/**
 * History contents provider. Keeps subscriptions to three streams:
 *    cacheObservable: watches cache for changes that match current params
 *    loadingObservable: loads new content into the cache from the server
 *    pollingObservable: loads new content into the cache when the polling gets new data
 */
1;
import { of, combineLatest, NEVER } from "rxjs";
import { map, distinctUntilChanged, startWith, debounceTime, switchMap, scan, shareReplay } from "rxjs/operators";
import { tag } from "rxjs-spy/operators/tag";
import { activity } from "utils/observable/activity";
import { pollHistory, loadHistoryContents, monitorHistoryContent } from "../caching";
import { newHidMap, processContentUpdate, buildContentResult } from "./processing";
import { vueRxShortcuts } from "../../plugins/vueRxShortcuts";
import { History } from "../model";
import { SearchParams } from "../model/SearchParams";

export default {
    mixins: [vueRxShortcuts],

    props: {
        history: { type: History, required: true },
        debouncePeriod: { type: Number, default: 250 },
        bench: { type: Number, default: SearchParams.pageSize },
    },

    data() {
        const startData = this.freshData();
        return {
            params: new SearchParams(),
            ...startData,
        };
    },

    watch: {
        historyId(newId, oldId) {
            if (newId !== oldId) {
                this.reset();
                this.params = new SearchParams();
            }
        },
        params(newParams, oldParams) {
            if (!SearchParams.equals(newParams, oldParams)) {
                this.reset();
            }
        },
        topRows(val) {
            console.log("topRows", val);
        },
        bottomRows(val) {
            console.log("bottomRows", val);
        }
    },

    computed: {

        // Exact values derived from history

        historyId() {
            return this.history.id;
        },

        maxHistoryHid() {
            return this.history.hidItems;
        },


        // When we load data, we'll get an accurate totalMatches result
        // Before then, estimate from max/min

        totalMatches() {
            if (this.serverTotalMatches !== null) {
                return this.serverTotalMatches;
            }
            return this.topHid - this.bottomHid;
        },


        // It is important to remember that topRows and bottomRows are usually
        // an estimate since we dont always have enough relevant data to get an
        // exact count except for the few HIDs which get queried to the server
        // and return with exact count values.

        topRows() {
            return Math.max(0, this.topHid - this.firstHid);
        },

        bottomRows() {
            return Math.max(0, this.lastHid - this.bottomHid);
        },


        // first and last HID of current contents

        firstHid() {
            return this.contents.length ? this.contents[0].hid : this.topHid;
        },

        lastHid() {
            return this.contents.length ? this.contents[this.contents.length].hid : this.bottomHid;
        },


        // Top and bottom HID of entire history. These are known exactly when a
        // load query returns and we happen to be at one end or the other,
        // otherwise they are estimates based on statistics that are returned
        // during any load.

        topHid() {
            if (this.topHidExact !== null) {
                return this.topHidExact;
            }
            return this.topHidEstimate;
        },

        bottomHid() {
            if (this.bottomHidExact !== null) {
                return this.bottomHidExact;
            }
            return this.bottomHidEstimate;
        },



        // a HID representing where we think the scroller is. This can be
        // exactly known in the case when we're scrolling within an already
        // loaded content range. In that event, we just read the value off the
        // scroll handler. Or it can be estimated when the user drags the
        // scrollbar into an unloaded region of the history, in which case we do
        // some math to try and guess what hid it might be near

        hidCursor() {
            // reported by onScroll event handler. As user changes scroller,
            // this value updates. I think we want to assume this is correct
            if (this.scrollStartKey !== null) {
                return this.scrollStartKey;
            }

            // reported by the cache watcher. User requested some content from
            // the cache watcher, and the results came back, the cacheStartKey
            // will not necessarily match the input hidCursor, so we might want
            // to use this if there is no explicit scrollStartKey
            if (this.cacheStartKey !== null) {
                return this.cacheStartKey;
            }

            // We don't have cache results yet, and the user has not dragged the
            // scroller to a known region, need to guess a HID based on the
            // height of the scroller and the best known extrema of thie history
            if (this.scrollCursor !== null) {
                const scale = 1.0 - this.scrollCursor;
                const height = scale * Math.abs(this.maxHid - this.minHid);
                return Math.floor(scale * height + this.minHid);
            }

            // I give up, go to the top
            return this.maxHistoryHid;
        },

    },

    methods: {
        freshData() {
            return {
                // flags
                loading: false,
                scrolling: false,

                // set by cache watcher
                // starting cache key from the cache watcher
                contents: [],
                cacheStartKey: null,

                // set by onScroll handler from direct user input
                scrollCursor: null, // 0-1 distance down
                scrollStartKey: null, // hid of first content displayed in scroller

                // set by loader, after ajax request comes back
                serverTotalMatches: null,
                topHidExact: null,
                topHidEstimate: this.maxHistoryHid,
                bottomHidExact: null,
                bottomHidEstimate: 1,
            };
        },

        reset() {
            // resets everything except params
            const fresh = this.freshData();
            for (const [key, value] of Object.entries(fresh)) {
                this[key] = value;
            }
        },

        updateParams(newParams) {
            if (!SearchParams.equals(newParams, this.params)) {
                this.params = newParams.clone();
            }
        },


        // When user moves the scroller, we report the exact startKey if known,
        // or a scrollCursor representing how far down the bar we are if we're
        // not currently over known content.

        onListScroll(payload) {
            const { cursor, startKey = null } = payload;
            // 0-1
            this.scrollCursor = cursor;
            // hid of first displayed content (if any)
            this.scrollStartKey = startKey;
        },


        // The cache-watcher returns with a list of cached results and a key
        // (hid) of the closest row in the results to the HID we asked for in
        // the query. If somebody whips the scrollbar into uncharted territory,
        // it's probable that the closest result HID will not be what we guessed
        // because HIDs are not a continuous index, there are large gaps where
        // items have been deleted or potentially are filtered out.

        cacheWatcherResult(result) {
            const { contents, startKey } = result;
            if (this.hidCursor !== startKey) {
                console.warn("adjusting cursor", this.hidCursor, startKey);
            }
            this.contents = contents;
            this.cacheStartKey = startKey;
        },


        // The loader returns with some stats about the result set that is being
        // filtered. It does cache the returned page, but that is not what we're
        // dealing with here. Here we look at the total matches, and the results
        // counts above and below the returned window to get some numbers that
        // will help us properly display the scroller. We can't return 3 million
        // results so we need to pad the top and bottom of the scroller with css
        // to represent those rows that aren't even queried.

        loaderResult(result) {
            // console.log("[history.load] result", result);

            const {
                // all matches on server that meet filters
                // total matches and counts of results above/below the target HID
                totalMatches, totalMatchesUp, totalMatchesDown,
                // length of the results returned above/below the target HID
                matchesUp, matchesDown,
                // hid minimum and maximum HIDs of the returned content, not the min
                // and max of the entire filtered set which can't be known until
                // we've got those pieces
                maxHid, minHid
            } = result;


            // total number of matches for the filters we were provided

            this.serverTotalMatches = totalMatches;


            // if we now have the exact top & bottom hid, store them
            // Otherwise make an estimate based on the stats we got back

            const topRows = totalMatchesUp - matchesUp;
            if (topRows == 0) {
                this.topHidExact = maxHid;
            } else if (this.topHidExact == null) {
                this.topHidEstimate = Math.min(this.maxHistoryHid, maxHid + topRows);
            }

            const bottomRows = totalMatchesDown - matchesDown;
            if (bottomRows == 0) {
                this.bottomHidExact = minHid;
            } else if (this.bottomHidExact == null) {
                this.bottomHidEstimate = Math.max(1, minHid - bottomRows);
            }

        }

    },

    created() {
        // #region Base Observables

        // base props
        const id$ = this.watch$("historyId", true);
        const filter$ = this.watch$("params", true);

        // supplied by loader
        // const totalMatches$ = this.watch$("totalMatches", true);
        // const maxHid$ = this.watch$("maxHid", true);
        // const minHid$ = this.watch$("minHid", true);

        // 0-1 value from scroller
        const scrollCursor$ = this.watch$("scrollCursor", true);

        // best guess for desired hid location
        const hidCursor$ = this.watch$("hidCursor", true);
        const throttledHidCursor$ = hidCursor$.pipe(
            debounceTime(this.debouncePeriod), // user can change this quickly
            distinctUntilChanged(),
            shareReplay(1),
        );

        // needs a better name, combo of history id + SearchParams
        const inputs$ = combineLatest(id$, filter$).pipe(
            debounceTime(0),
            distinctUntilChanged((a, b) => {
                const idSame = a[0] == b[0];
                const paramSame = SearchParams.equals(a[1], b[1]);
                return idSame && paramSame;
            }),
            tag("inputs changed")
        );

        // #endregion

        // #region Activity Flags

        const scrolling$ = scrollCursor$.pipe(activity());

        this.$subscribeTo(scrolling$, (val) => (this.scrolling = val));

        // #endregion

        // #region Cache Observer
        // Monitors cache results matching the current search parameters and
        // scroller location, resets when id or filters changes

        const cacheUpdate$ = inputs$.pipe(
            switchMap((inputs) => {

                // Dual monitor, seeks up & down from hidCursor
                const hidMap$ = hidCursor$.pipe(
                    map(hid => [ ...inputs, hid ]),
                    monitorHistoryContent(),
                    scan(processContentUpdate, newHidMap()),
                );

                const cacheResult$ = combineLatest(hidMap$, throttledHidCursor$).pipe(
                    debounceTime(0), // 0 consolidates simultaneous events
                    map(buildContentResult(this.bench))
                );

                return cacheResult$;
            })
        );

        this.$subscribeTo(
            cacheUpdate$,
            this.cacheWatcherResult,
            (err) => console.warn(`[history.cache] error`, err),
            () => console.log(`[history.cache] complete`)
        );

        // #endregion


        // #region Loader
        // when inputs change, resubscribe to a loader in the worker. We want
        // keep this subscription open as the hid cursor changes so we can track
        // which urls have been requested recently, don't just combine the
        // inputs and the hidcursor

        const load$ = inputs$.pipe(
            switchMap((inputs) => throttledHidCursor$.pipe(
                map((hid) => [...inputs, hid]),
                loadHistoryContents()
            ))
        );

        this.$subscribeTo(
            load$,
            this.loaderResult,
            (err) => console.warn(`[history.load] error`, err),
            () => console.log(`[history.load] complete`)
        );

        // #endregion


        // #region Polling

        // const poll$ = inputs$.pipe(switchMap((inputs) => of(inputs).pipe(pollHistory())));

        // const polling$ = scrolling$.pipe(
        //     startWith(true),
        //     distinctUntilChanged(),
        //     switchMap((isScrolling) => (isScrolling ? NEVER : poll$))
        // );

        // this.listenTo(polling$, 'history.poll');

        // #endregion
    },

    render() {
        return this.$scopedSlots.default({
            // raw data
            contents: this.contents,
            params: this.params,

            // important computed values
            hidCursor: this.hidCursor,
            topRows: this.topRows,
            bottomRows: this.bottomRows,
            totalMatches: this.totalMatches,

            // settings/props passthrough
            bench: this.bench,

            // flags
            scrolling: this.scrolling,
            loading: this.loading,

            // update methods
            updateParams: this.updateParams,
            onListScroll: this.onListScroll,
        });
    },
};
