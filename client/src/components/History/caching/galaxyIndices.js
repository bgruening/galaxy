/**
 * Indices are required by pouchdb to use the pouuchdb.find functionality. These
 * are the indices we keep on the main history content database
 */

export const contentIndices = [
    {
        index: {
            fields: [
                { history_id: "desc" },
                { hid: "desc" }
            ],
        },
        name: "by history and hid descending",
        ddoc: "idx-content-history-id-hid-desc",
    },
    {
        index: {
            fields: [
                { history_id: "asc" },
                { hid: "asc" }
            ],
        },
        name: "by history and hid ascending",
        ddoc: "idx-content-history-id-hid-asc",
    },
    {
        index: {
            fields: [
                { cached_at: "desc" }
            ],
        },
        name: "by cache time",
        ddoc: "idx-content-history-cached_at",
    },
];

/**
 * ...and the collection contents
 */

export const dscContentIndices = [
    {
        index: {
            fields: ["name", { element_index: "asc" }],
        },
        name: "by contents url",
        ddoc: "idx-collection-contents-name",
    },
    {
        index: {
            fields: [{ cached_at: "desc" }],
        },
        name: "by cache time",
        ddoc: "idx-collection-contents-cached_at",
    },
];
