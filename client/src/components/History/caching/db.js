/**
 * Generic pouch db operators, These are low-level pouchdb access operators
 * intended to be used to create more specific operators. For examples see
 * galaxyDb.
 */

import config from "config";

import moment from "moment";
import deepEqual from "deep-equal";

import { of, pipe, from } from "rxjs";
import { map, mergeMap, withLatestFrom, reduce, shareReplay } from "rxjs/operators";
import { tag } from "rxjs-spy/operators/tag";

import PouchDB from "pouchdb-browser";
import PouchAdapterMemory from "pouchdb-adapter-memory";
import PouchUpsert from "pouchdb-upsert";
import PouchFind from "pouchdb-find";
import PouchErase from "pouchdb-erase";
// import PouchDebug from "pouchdb-debug";

PouchDB.plugin(PouchAdapterMemory);
PouchDB.plugin(PouchUpsert);
PouchDB.plugin(PouchFind);
PouchDB.plugin(PouchErase);
// PouchDB.plugin(PouchDebug);

// debugging stuff
// PouchDB.debug.enable('pouchdb:find');
// const show = (obj) => console.log(JSON.stringify(obj, null, 4));

/**
 * Generate an observable that initializes and shares a pouchdb instance.
 *
 * @param {object} options pouchdb initialization configs
 * @return {Observable} observable that emits the pouch instance
 */
export const collection = (options) =>
    of(options).pipe(
        mergeMap(async (opts) => {
            const { name: dbName, indexes, ...otherOpts } = opts;
            const { name: envName } = config;
            const name = `${dbName}-${envName}`;
            const dbConfig = { ...config.caching, ...otherOpts, name };

            // make instance
            const db = new PouchDB(dbConfig);

            // indexing
            await Promise.all(indexes.map((idx) => db.createIndex(idx)));

            return db;
        }),
        shareReplay(1)
    );

/**
 * Retrieves an object from the cache
 *
 * @param {Observable} db$ Observable of a pouchdb instance
 * @param {string} keyName Field to lookup object by
 * @returns {Function} Observable operator
 */
export const getItemByKey = (db$, keyName = "_id") =>
    pipe(
        withLatestFrom(db$),
        mergeMap(async ([keyValue, db]) => {
            const searchConfig = {
                selector: { [keyName]: keyValue },
                limit: 1,
            };
            const response = await db.find(searchConfig);
            if (response.warning) {
                console.warn(response.warning, searchConfig);
            }
            if (response.docs.length > 1) {
                throw new Error(`Too many documents found for getItemByKey: ${keyValue} in db: ${db.name}`);
            }
            return response.docs[0];
        })
    );

/**
 * Operator that caches all source documents in the indicated collection.
 * Upserts new fields into the old document, so the props need not be complete,
 * just needs to have the _id.
 *
 * Adds a cached_at timestamp and fixes pouchdb
 * specific field names like "deleted"
 *
 * @source Observable stream of docs to cache
 * @param {Observable} db$ Observable pouchdb instance
 * @returns {Function} Observable operator
 */
export const cacheItem = (db$) =>
    pipe(
        map(fixDeleted),
        withLatestFrom(db$),
        mergeMap(([content, db]) => {
            return db.upsert(content._id, (existing) => {
                // if what we're caching is the same as what's in there, don't bother
                // eslint-disable-next-line no-unused-vars
                const { _rev, cached_at, ...existingFields } = existing;
                if (deepEqual(content, existingFields)) {
                    return false;
                }

                return {
                    ...existing,
                    ...content,
                    cached_at: moment().valueOf(),
                };
            });
        })
    );

/**
 * Doing it the dumb way for now, will try a true bulkDocs call later.
 *
 * @source Observable of docs to cache
 * @param {Observable} db$ Observable of a PouchDB instance
 * @returns {Function} Observable operator
 */
export const bulkCache = (db$) =>
    pipe(
        mergeMap((list) => {
            return from(list).pipe(
                cacheItem(db$),
                tag("bulk cache result"),
                reduce((result, item) => {
                    result.push(item);
                    return result;
                }, [])
            );
        })
    );

/**
 * Creates an operator that will delete the source document from the configured
 * database observable. In pouchdb, deleting just means
 * setting _deleted to true.
 *
 * @source Observable stream of documents to uncache
 * @param {Observable} db$ Observable of the pouchdb instance
 * @returns {Function} Observable operator
 */
export const unacheItem = (db$) =>
    pipe(
        withLatestFrom(db$),
        mergeMap(([doomedDoc, db]) => {
            return db.remove(doomedDoc);
        })
    );

/**
 * Delete existing indexes in a pouchdb database.
 *
 * @param {PouchDB} db pouch db instance
 * @returns {Promise}
 */
export async function deleteIndexes(db) {
    const response = await db.getIndexes();
    const doomedIndexes = response.indexes.filter((idx) => idx.ddoc !== null);
    const promises = doomedIndexes.map(idx => db.deleteIndex(idx));
    return await Promise.all(promises);
}

/**
 * We need to rename the deleted property because pouchDB uses that field,
 * which is unfortunate
 * @param {Object} props Raw document props
 */
const fixDeleted = (props) => {
    if (Object.prototype.hasOwnProperty.call(props, "deleted")) {
        const { deleted: isDeleted, ...theRest } = props;
        return { isDeleted, ...theRest };
    }
    return props;
};

