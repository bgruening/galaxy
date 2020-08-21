/**
 * Functions used by the history content observable to handle content update
 * aggregation as items appear and disappear from the cache.
 */

import SkipList from "proper-skip-list";
import { toArray, compose, slice, map } from "iter-tools/es2015";
import { SearchParams } from "../model/SearchParams";


// sorted map, keys are hids

export const newHidMap = () => {
    // console.warn("new hid map");
    return new SkipList();
};

// scan function for consuming updates from the pouchdb-live-find. Update
// variable will either be a big initial chunk of results matching the query or
// a follow-up incremental change (if some other process modifies the cache).
// End result is a SkipList keyed by HID

const CHANGEACTION = {
    UPDATE: "UPDATE",
    DELETE: "DELETE"
};

export function processContentUpdate(hidMap, update) {
    const { initialMatches, action, doc } = update;

    // initial load
    if (initialMatches && initialMatches.length) {
        initialMatches.forEach((match) => {
            const key = +match.hid;
            hidMap.upsert(key, match);
        });
    }

    // incremental updates
    if (action && doc) {
        const key = +doc.hid;
        switch (action) {
            case CHANGEACTION.UPDATE:
                hidMap.upsert(key, doc);
                break;
            case CHANGEACTION.DELETE:
                hidMap.delete(key);
                break;
        }
    }

    return hidMap;
}




export const buildContentResult = (bench) => {

    // A Skiplist provides iterators for finding keys searching forward or backward
    // which is good because the map might get very large for some histories. We use
    // iterator operations to find the window of stuff we care about without looping
    // over the entire store.

    // create iterator transformer to nab values from skip list, this is better than
    // just converting it to an array because the skiplist might be huge and getting
    // just the window we want is going to be faster for large-N.
    // skiplist iterators return [key, val, index], so map to 2nd position

    const grab = (n) => compose(toArray, map((entry) => entry[1]), slice(n));
    const getContent = grab(bench);

    return ([ hidMap, hidCursor ]) => {

        // CONTENT LIST
        // bench items (above the cursor) uses the skiplist ascending iterator
        // page content (below the cursor) uses the skiplist descending iterator

        const { asc } = hidMap.findEntries(hidCursor + 1);
        const { matchingValue, desc } = hidMap.findEntries(hidCursor);
        const benchContent = getContent(asc).reverse();
        const pageContent = getContent(desc);
        const contents = benchContent.concat(pageContent);


        // INITIAL ROW
        // The HID cursor may not actually represent a row from the result set,
        // so figure out which returned row is closest and return that as the
        // startKey for the scroller component

        let startKey = hidCursor;

        if (!matchingValue) {
            const closestPageHid = pageContent.length ? pageContent[0].hid : Infinity;
            const closestBenchHid = benchContent.length ? benchContent[benchContent.length - 1].hid : Infinity;
            const pageDist = Math.abs(hidCursor - closestPageHid);
            const benchDist = Math.abs(hidCursor - closestBenchHid);

            if (isFinite(pageDist) && pageDist <= benchDist) {
                startKey = closestPageHid;
            } else if (isFinite(benchDist) && benchDist < pageDist) {
                startKey = closestBenchHid;
            }
        }


        // SCROLLER PADDING
        // The slice of data may not represent the entire history, and
        // definitely won't for very large ones. So we represent content items
        // not currently present in the hidMap by integer row counts above and
        // below the rendered list, the scroller will add css padding to make it
        // look roughly correct.

        // const firstHid = contents.length ? contents[0].hid : hidCursor;
        // const lastHid = contents.length ? contents[contents.length - 1].hid : hidCursor;

        // // do I want to set these?
        // const topRows = Math.max(0, maxHid - firstHid);
        // const bottomRows = Math.max(0, lastHid - minHid);



        // console.group("buildContentResult");
        // console.log("input: hidMap (skiplist)", hidMap.length);
        // console.log("input: hidCursor", hidCursor);
        // console.log("input: maxHid", maxHid);
        // console.log("input: minHid", minHid);

        // console.group("output: contents");
        //     console.log("> matchingValue", matchingValue);
        //     console.log("> benchContent", benchContent.map(x => x.hid));
        //     console.log("> pageContent", pageContent.map(x => x.hid));
        // console.groupEnd();

        // console.log("output: bench", bench);
        // console.log("output: topRows", topRows);
        // console.log("output: bottomRows", bottomRows);
        // console.log("output: scrollStartKey", scrollStartKey);
        // console.groupEnd();

        return { contents, startKey };
    }
}