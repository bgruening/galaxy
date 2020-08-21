import { assert } from "mocha";
import { Dataset } from "../../../model/Dataset";
import raw from "../json/Dataset.json";

describe("Dataset", () => {
    const model = new Dataset(raw);

    // state is an aggregat
    it("state", () => {
        assert(model);
    });
});
