/**
 * Temporary adapter to launch bootstrap modals from Vue components, for use with
 * the collection assembly modals. i.e. With selected..... create dataset collection,
 * create paired collection, etc.
 *
 * The goal is to use the existing "crateListCollection", etc. functions but doctor
 * the content parameter to have the API of a horrible backbone model.
 */

import jQuery from "jquery";
import LIST_COLLECTION_CREATOR from "mvc/collection/list-collection-creator";
import PAIR_COLLECTION_CREATOR from "mvc/collection/pair-collection-creator";
import LIST_OF_PAIRS_COLLECTION_CREATOR from "mvc/collection/list-of-pairs-collection-creator";
import { getCachedContentByTypeId } from "../caching";

// stand-in for buildCollection from history-view-edit.js
export async function buildCollectionModal(collectionType, history_id, type_ids, hideSourceItems = false) {
    // select legacy function
    let createFunc;
    if (collectionType == "list") {
        createFunc = LIST_COLLECTION_CREATOR.createListCollection;
    } else if (collectionType == "paired") {
        createFunc = PAIR_COLLECTION_CREATOR.createPairCollection;
    } else if (collectionType == "list:paired") {
        createFunc = LIST_OF_PAIRS_COLLECTION_CREATOR.createListOfPairsCollection;
    } else if (collectionType.startsWith("rules")) {
        createFunc = LIST_COLLECTION_CREATOR.createCollectionViaRules;
    } else {
        throw new Error(`Unknown collectionType encountered ${collectionType}`);
    }

    // pull up cached content by type_ids;
    const selection = await loadSelectedContent(type_ids);
    const fakeBackboneContent = createBackboneContent(selection);
    fakeBackboneContent.historyId = history_id;
    return await createFunc(fakeBackboneContent, hideSourceItems);
}

const createBackboneContent = (selection) => {
    return {
        toJSON: () => selection,

        // result must be a $.Deferred object instead of a promise because
        // that's the kind of deprecated data format that backbone likes to use.
        createHDCA(element_identifiers, collection_type, name, hide_source_items, copy_elements, options = {}) {
            const def = jQuery.Deferred();
            return def.resolve(null, {
                collection_type,
                name,
                copy_elements,
                hide_source_items,
                element_identifiers,
                options,
            });
        },
    };
};

async function loadSelectedContent(type_ids) {
    const promises = type_ids.map((typeId) => getCachedContentByTypeId(typeId));
    return await Promise.all(promises);
}
