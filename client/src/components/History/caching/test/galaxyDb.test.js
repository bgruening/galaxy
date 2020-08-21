import { of } from "rxjs";
import {
    getCachedContent,
    cacheContent,
    wipeDatabase,
    bulkCacheContent,
    buildContentId,
    bulkCacheDscContent,
} from "../galaxyDb";
import historyContent from "./historyContent.json";
import collectionContent from "./collectionContent.json";

const show = (obj) => console.log(JSON.stringify(obj, null, 4));

describe("galaxyDb", () => {
    describe("caching history content using rxjs operators", () => {
        const doc = historyContent[0];

        // convert to promises because promises are easy to test
        const getFn = (id) => of(id).pipe(getCachedContent()).toPromise();
        const cacheFn = (doc) => of(doc).pipe(cacheContent()).toPromise();
        const bulkFn = (list) => of(list).pipe(bulkCacheContent()).toPromise();

        beforeEach(async () => {
            await wipeDatabase();
        });

        describe("getCachedContent", () => {
            const id = buildContentId(doc);

            beforeEach(async () => {
                await cacheFn(doc);
            });

            it("should retrieve a doc", async () => {
                const doc = await getFn(id);
                expect(doc).to.exist;
            });

            it("should have an _id field", async () => {
                const doc = await getFn(id);
                expect(doc).to.include.keys("_id");
                expect(doc._id).to.equal(id);
            });

            it("should have a cached_at date", async () => {
                const doc = await getFn(id);
                expect(doc).to.include.keys("cached_at");
                expect(doc.cached_at).to.be.a("number");
            });

            it("should rename deleted to isDeleted", async () => {
                const doc = await getFn(id);
                expect(doc).to.include.keys("isDeleted");
                expect(doc.isDeleted).to.be.a("boolean");
            });
        });

        describe("cacheContent", () => {
            it("should cache a new document", async () => {
                const result = await cacheFn(doc);
                expect(result.updated).to.be.true;
            });

            it("should cache a changed document", async () => {
                const insertResult = await cacheFn(doc);
                const newDoc = Object.assign({}, doc);
                newDoc.someNewField = "abc";
                const updateResult = await cacheFn(newDoc);

                expect(insertResult.updated).to.be.true;
                expect(updateResult.updated).to.be.true;
                expect(insertResult.id).to.equal(updateResult.id);
                expect(insertResult.rev).not.to.equal(updateResult.rev);
            });

            it("should not cache a document if none of the fields have changed", async () => {
                await cacheFn(doc);
                const result = await cacheFn(doc);
                expect(result.updated).to.be.false;
            });

            it("should generate an _id field from history and data type", async () => {
                const id = buildContentId(doc);
                const result = await cacheFn(doc);
                expect(result.id).to.equal(id);
            });
        });

        describe("bulkCacheContent", () => {
            it("should cache a list of stuff", async () => {
                const results = await bulkFn(historyContent);
                expect(results.length).to.be.above(0);
            });

            it("should write over the existing list with the new values", async () => {
                const insertResults = await bulkFn(historyContent);
                const insertsOk = insertResults.map((result) => result.updated).every(Boolean);
                expect(insertsOk).to.be.true;

                const modifiedList = historyContent.map((val) => {
                    const newItem = Object.assign({}, val);
                    newItem.fakeProp = 123;
                    return newItem;
                });
                const updateResults = await bulkFn(modifiedList);
                const updatesOk = updateResults.map((result) => result.updated).every(Boolean);

                expect(updatesOk).to.be.true;
                expect(updateResults.length).to.equal(insertResults.length);
            });

            it("should process identical values without updating, but without throwing a 409 conflict either", async () => {
                const insertResults = await bulkFn(historyContent);
                const allUpdated = insertResults.map((result) => result.updated).every(Boolean);
                expect(allUpdated).to.be.true;
                const updateResults = await bulkFn(historyContent);
                // show(updateResults);
                const allNotUpdated = updateResults.map((result) => result.updated).every((val) => !val);
                expect(allNotUpdated).to.be.true;
            });
        });
    });

    describe("caching dataset collection reseults", () => {
        // We need to add the contents_url to each element before caching
        // because that field is not returned in the ajax response.
        // This is something that has to happen right after the ajax call in the
        // main code.
        const fakeContentsUrl = "/api/thing/234/234";
        const processedContent = collectionContent.map((item) => {
            return { ...item, contents_url: fakeContentsUrl };
        });

        // collections are immutable? I think? So we only ever bulk cache
        const bulkFn = (list) => of(list).pipe(bulkCacheDscContent()).toPromise();

        beforeEach(async () => {
            await wipeDatabase();
        });

        describe("bulkCacheContent", () => {
            it("should cache a list of stuff", async () => {
                const insertResults = await bulkFn(processedContent);
                expect(insertResults.length).to.equal(processedContent.length);
                const allUpdated = insertResults.map((result) => result.updated).every(Boolean);
                expect(allUpdated).to.be.true;
            });

            it("should write over the existing list with the new values", async () => {
                const insertResults = await bulkFn(processedContent);
                const insertsOk = insertResults.map((result) => result.updated).every(Boolean);
                expect(insertsOk).to.be.true;

                const modifiedList = processedContent.map((val) => {
                    const newItem = Object.assign({}, val);
                    // most fields live in the terribly named "object" sub
                    // property. This object won't be seen as different if we
                    // don't change this because we pull out specific named
                    // props from the top level, not the whole field set
                    newItem.object.fakeProp = 123;
                    return newItem;
                });
                const updateResults = await bulkFn(modifiedList);
                const updatesOk = updateResults.map((result) => result.updated).every(Boolean);
                // show(updateResults);

                expect(updatesOk).to.be.true;
                expect(updateResults.length).to.equal(insertResults.length);
            });

            it("should process identical values without updating, but without throwing a 409 conflict either", async () => {
                const insertResults = await bulkFn(processedContent);
                const allUpdated = insertResults.map((result) => result.updated).every(Boolean);
                expect(allUpdated).to.be.true;
                const updateResults = await bulkFn(processedContent);
                // show(updateResults);
                const allNotUpdated = updateResults.map((result) => result.updated).every((val) => !val);
                expect(allNotUpdated).to.be.true;
            });
        });
    });
});
