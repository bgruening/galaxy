import { Observable, isObservable, combineLatest } from "rxjs";
import { switchMap, debounceTime, distinctUntilChanged } from "rxjs/operators";
import deepEqual from "deep-equal";


/**
 * Turns a selector into a live cache result emitter.
 *
 * @param {Observable} db$ Observable PouchDB instance
 * @param {Observable} request$ Observable Pouchdb-find configuration
 */
export const monitorQuery = (cfg = {}) => (request$) => {
    const { db$ = null, inputDebounce = 100 } = cfg;

    if (!isObservable(db$)) {
        throw new Error("Please pass a database observable to the configuration of monitorQuery");
    }

    const debouncedRequest$ = request$.pipe(
        debounceTime(inputDebounce), // hid cursor changes frequently
        distinctUntilChanged(deepEqual),
    );

    return combineLatest(debouncedRequest$, db$).pipe(
        debounceTime(0),
        switchMap(buildPouchQueryEmitter),
    );
};


export function buildPouchQueryEmitter(inputs) {
    const [ request, db ] = inputs;

    const {
        selector = {},
        use_index = null,
        sort = []
    } = request;

    const changesCfg = {
        live: true,
        include_docs: true,
        since: 'now',
        timeout: false,
        use_index,
        selector
    };

    const findCfg = {
        selector,
        sort,
        use_index,
    };

    return Observable.create((obs) => {

        // monitor subsequent updates
        const emitter = db.changes(changesCfg);

        emitter.on('change', (change) => {
            // console.log("change");
            const { deleted = false, doc } = change;
            const action = deleted ? "DELETED" : "UPDATE";
            obs.next({ action, doc });
        });

        // Do initial query
        db.find(findCfg)
            .then((result) => {
                // console.log("initial find result", result):
                const { docs: initialMatches } = result;
                obs.next({ initialMatches })
            })
            .catch(err => {
                console.warn("Error on initial search", err);
                console.log("changesCfg", changesCfg);
                console.log("findCfg", findCfg);
                obs.error(err);
            });

        return () => {
            emitter.cancel();
        }
    })

}
