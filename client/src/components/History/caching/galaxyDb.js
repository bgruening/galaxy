/**
 * Content pouchdb database (galaxy-content)
 */

import { pipe } from "rxjs";
import { map, shareReplay } from "rxjs/operators";
import { collection, cacheItem, bulkCache, getItemByKey } from "./db";
import { contentIndices, dscContentIndices } from "./galaxyIndices";

// bulk insert helper operator, runs function on list
const prepList = (fn) => pipe(map((list) => list.map(fn)));

/**
 * History Content & associated operators
 */

export const content$ = collection({
    name: "galaxy-content",
    indexes: contentIndices,
}).pipe(shareReplay(1));

export const getCachedContent = () =>
    pipe(
        getItemByKey(content$) // key is _id (historyid-typeId)
    );

export const cacheContent = () =>
    pipe(
        map(prepContent), // build id, minor transforms
        cacheItem(content$)
    );

export const bulkCacheContent = () =>
    pipe(
        prepList(prepContent), // build id, minor transforms
        bulkCache(content$)
    );

export const buildContentId = (props) => {
    const { history_id, history_content_type, id, type_id: origTypeId } = props;
    const type_id = origTypeId ? origTypeId : `${history_content_type}-${id}`;
    return `${history_id}-${type_id}`;
};

export const prepContent = (props) => {
    const { history_content_type, id, type_id: origTypeId, ...theRest } = props;
    const type_id = origTypeId ? origTypeId : `${history_content_type}-${id}`;
    const _id = buildContentId(props);

    return {
        _id,
        history_content_type,
        id,
        type_id,
        ...theRest,
    };
};

/**
 * Collection content (drill down into a collection). Since we don't really
 * update dsc content, all I think we need is the bulk operator which gets run
 * when the scroller loads new data
 */

export const dscContent$ = collection({
    name: "galaxy-collection-content",
    indexes: dscContentIndices,
}).pipe(shareReplay(1));

export const bulkCacheDscContent = () =>
    pipe(
        prepList(prepDscContent), // un-hose api response format
        bulkCache(dscContent$)
    );

// unscrew the api result format
const prepDscContent = (props) => {
    const { contents_url, element_identifier: name, object } = props;
    const { id, model_class, ...otherObjectFields } = object;
    const history_content_type = model_class == "HistoryDatasetAssociation" ? "dataset" : "dataset_collection";

    if (contents_url === undefined) {
        throw new Error("missing contents_url");
    }
    if (id === undefined) {
        throw new Error("missing id");
    }

    const type_id = `${history_content_type}-${id}`;
    const _id = `${contents_url}-${type_id}`;

    const newProps = {
        // id = content url + counter as that is the most likely query
        _id,
        contents_url,

        // make a type_id so we can re-use all our functions which depend on it
        type_id,
        history_content_type,
        id,

        // switch element_identifier back to name
        name,

        // move stuff out of "object" and into root of cached packet
        ...otherObjectFields,
    };

    return newProps;
};

/**
 * Clear entire database
 */

export async function wipeDatabase() {
    const content = await content$.toPromise();
    const dsc = await dscContent$.toPromise();
    await content.erase();
    await dsc.erase();
}
