import { JobStateSummary } from "../../../model/JobStateSummary";

// test data
import rawProcessing from "./json/DatasetCollection.error.json";

describe("JobStateSummary", () => {
    const summary = new JobStateSummary(rawProcessing.job_state_summary);

    it("should exist", () => {
        expect(summary);
    });
});
