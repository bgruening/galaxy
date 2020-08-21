// import { expect } from "chai";
// import { SearchParams } from "../../../model/SearchParams";

const getThing = () => 6;

describe("SearchParams", () => {
    describe("chunk method", () => {
        it("chunk 5/- => 0/100", () => {
            const foo = 234;
            const what = getThing();
            expect(what).to.eq(foo);
            // const params = new SearchParams();
            // params.skip = 5;
            // const chunks = params.chunkParams();
            // expect(chunks.length).to.equal(1);
            // const chunk = chunks[0];
            // expect(chunk.skip).to.equal(0);
            // expect(chunk.limit).to.equal(SearchParams.pageSize);
        });
    });
});
