import { from, pipe } from "rxjs";
import { map, mergeMap } from "rxjs/operators";
import { SearchParams } from "../../model/SearchParams";

/**
 * Configuration var for inside the worker, must be set when worker
 * is fired up because we can't reach the document and that's how stupid,
 * stupid, stupid, stupid, galaxy backbone code gets some of its config.
 */
export const workerConfig = { root: "/" };

export const configure = (options = {}) => {
    Object.assign(workerConfig, options);
};

/**
 * Prepend against this config. Can't access document so we can't use
 * the standard one from utils
 */
const slashCleanup = /(\/)+/g;
export function prependPath(path) {
    const root = workerConfig.root;
    return `${root}/${path}`.replace(slashCleanup, "/");
}

/**
 * passing SearchParams into the worker removes its class information, inputs is
 * usually an array of [ id, params, ...otherstuff ], so the params are usually
 * at index 1
 */
export const hydrateParams = (position = 1) => {
    return pipe(
        map((inputs) => {
            inputs[position] = new SearchParams(inputs[position]);
            return inputs;
        })
    );
};

/**
 * Breaks inputs up into discrete chunks so the resulting URLs are esier to cache
 * Source: [history_id, SearchParam] or [url, SeaarchParam]
 */
export const chunkInputs = () => {
    return pipe(
        mergeMap(([idParameter, params]) => {
            const chunks = params.chunkParams(SearchParams.pageSize);
            return from(chunks).pipe(map((p) => [idParameter, p]));
        })
    );
};

/**
 * Change one parameter to be an multiple of indicated block size. Used to
 * regulate the URLs we send to the server so that some will be cached. Pos is
 * the position in the combined inputs array, and the chunkSize is the size of
 * the block to break the value into.
 *
 * Ex: Source Inputs [ x, y, z, 750 ],
 *     chunkParam(3, 200)
 *     Results in [ x, y, z, 600]
 *
 * @param {integer} pos Input array parameter number to chunk
 * @param {integer} chunkSize Size of chunks
 */
export const chunkParam = (pos, chunkSize) => {
    return pipe(
        map((inputs) => {
            const chunkMe = inputs[pos];
            const chunkedVal = chunkSize * Math.floor(chunkMe / chunkSize);
            const newInputs = inputs.slice();
            newInputs[pos] = chunkedVal;
            return newInputs;
        })
    );
}


/**
 * Gets min and max values from an array of objects
 *
 * @param {Array} list Array of objects, each with a propName
 * @param {string} propName Name of prop to measure range
 */
export const getPropRange = (list, propName) => {

    const narrowRange = (range, row) => {
        const val = parseInt(row[propName], 10);
        range.max = Math.max(range.max, val);
        range.min = Math.min(range.min, val);
        return range;
    };

    const everywhere = {
        min: Infinity,
        max: -Infinity,
    };

    return list.reduce(narrowRange, everywhere);
};
