export default {
    name: "production",
    debug: false,
    caching: {
        adapter: "idb",
        revs_limit: 1,
        pageSize: 50
    }
}
