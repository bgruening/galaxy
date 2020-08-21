import { Content, DatasetCollection, STATES } from "../../../model";

// test data
import raw from "../json/DatasetCollection.json";

// error on load
import rawError from "../json/DatasetCollection.error.json";

// mixed bag
import rawProcessing from "../json/DatasetCollection.processing.json";

describe("DatasetCollection", () => {
    const model = new DatasetCollection(raw);
    const errorModel = new DatasetCollection(rawError);
    const processingModel = new DatasetCollection(rawProcessing);

    it("it should be the right type", () => {
        expect(model).to.be.instanceOf(DatasetCollection);
        expect(model).to.be.instanceOf(Content);
    });

    describe("jobStateSummary", () => {
        // it("should report a job count", () => {
        //     expect(model.jobSummary.get('all_jobs')).to.equal(0);
        //     expect(processingModel.jobSummary.get('all_jobs')).to.equal(6);
        // })

        describe("jobSummary", () => {
            it("should show error states", () => {
                expect(processingModel.jobSummary.errorCount).to.be.greaterThan(0);
            });
        });

        describe("has", () => {
            it("should show appropriate states", () => {
                expect(errorModel.jobSummary.state).to.equal(STATES.ERROR);
            });
        });
    });
});

// describe("normal result", () => {
//     const dsc = new DatasetCollection(rawGood);

//     it("should exist", () => {
//         expect(dsc);
//     });
// });

// describe("error before create", () => {
//     const dsc = new DatasetCollection(rawLoadError);

//     it("should exist", () => {
//         expect(dsc);
//     });
// });

// describe("collection processing", () => {
//     const dsc = new DatasetCollection(rawProcessing);

//     it("should exist", () => {
//         expect(dsc);
//     });
// });
