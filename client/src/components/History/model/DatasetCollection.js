/**
 * Our API is very inconsistent which makes re-using components difficult.
 * This wrapper is supposed to make sub-collections look reasonably close to
 * the dataset collections that are loose in the content results so
 * we can pass them to the same components.
 */

import { Content } from "./Content";
import { JobStateSummary } from "./JobStateSummary";

export class DatasetCollection extends Content {
    loadProps(raw = {}) {
        if (!raw.contents_url) {
            throw new Error("missing contents_url", raw);
        }
        super.loadProps(raw);
    }

    // number of contained contents
    get contentLength() {
        return this.element_count || 0;
    }

    // text for UI
    get collectionCountDescription() {
        const ct = this.contentLength;
        return ct == 1 ? "with 1 item" : `with ${ct} items`;
    }

    // text for UI
    get collectionType() {
        if (this.collection_type) {
            switch (this.collection_type) {
                case "list":
                    return "list";
                case "paired":
                    return "dataset pair";
                case "list:paired":
                    return "list of pairs";
                default:
                    return "nested list";
            }
        }
        return null;
    }

    // amalgam state value
    get state() {
        return this.jobSummary.state || this.populated_state;
    }

    get jobSummary() {
        return new JobStateSummary(this);
    }
}
