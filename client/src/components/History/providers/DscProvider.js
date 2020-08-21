import { filter, map, pluck, switchMap, distinctUntilChanged } from "rxjs/operators";
import { vueRxShortcuts } from "../../plugins/vueRxShortcuts";
import { monitorContentQuery, monitorDscQuery } from "../caching";
import { DatasetCollection } from "../model";

export default {
    mixins: [vueRxShortcuts],
    props: {
        collection: { type: Object, required: true },
        isRoot: { type: Boolean, required: true },
    },
    data: () => ({
        dsc: null,
    }),
    created() {
        // Watching either content or dscContent depending on whether this is
        // the root Really the only thing this is changing is the collection the
        // worker will monitor It will be either "galaxy-content" or
        // "galaxy-collection-content" depending on how far in we've drilled
        // down. First layer takes content directly from galaxy-content, the
        // normal history_contents list.

        // assemble pouchdb-find config for just the one row
        const request$ = this.watch$("collection", true).pipe(
            pluck("_id"),
            distinctUntilChanged(),
            map((_id) => ({ selector: { _id } }))
        );

        const results$ = this.watch$("isRoot", true).pipe(
            map((isRoot) => (isRoot ? monitorContentQuery : monitorDscQuery)),
            switchMap((monitor) => request$.pipe(monitor())),
            filter(({ matches }) => matches.length > 0),
            map(({ matches }) => new DatasetCollection(matches[0]))
        );

        this.$subscribeTo(results$, (dsc) => (this.dsc = dsc));
    },
    render() {
        return this.$scopedSlots.default({
            dsc: this.dsc,
        });
    },
};
