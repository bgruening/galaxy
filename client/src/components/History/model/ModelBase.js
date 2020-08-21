/**
 * Presentation models utilities.
 */

import moment from "moment";

export class ModelBase {
    constructor(doc = {}) {
        try {
            this.loadProps(doc);
        } catch (err) {
            console.log("unable to instantate model", doc);
            throw err;
        }
    }

    loadProps(raw = {}) {
        const { _rev, ...props } = raw; // eslint-disable-line no-unused-vars
        Object.assign(this, props);
    }
}

/**
 * Mixins
 */

// converts barbaric string date to a moment object
export const dateMixin = (superclass) =>
    class extends superclass {
        get updateDate() {
            return moment.utc(this.update_time);
        }
        get createDate() {
            return moment.utc(this.create_time);
        }
    };
