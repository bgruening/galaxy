/**
 * Key/Date storage. Used to monitor the last time a certain URL
 * was requested in the content update mechanism.
 *
 * Needs three public methods, has(), getLastDate(), markDate()
 */

import moment from "moment";

export class DateStore extends Map {
    set(key, val) {
        if (!moment.isMoment(val)) {
            throw new Error("Only store moment objects in the date store please");
        }
        return super.set(key, val);
    }

    getLastDate(key) {
        return this.has(key) ? this.get(key) : moment.utc(0);
    }
}

export function createDateStore(label = "Default") {
    // console.log("createDateStore", label);
    const ds = new DateStore();
    ds.label = label;
    return ds;
}
