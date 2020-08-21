/**
 * Handy for figuring out which properties forced a re-render
 */

export default {
    mounted() {
        this.storeUpdateProps();
    },

    beforeUpdate() {
        this.breakAfterUpdate = this.reportProps("beforeUpdate: changed fields", ["scrollTop", "range", "cursor"]);
    },

    updated() {
        this.storeUpdateProps();
        if (this.breakAfterUpdate) {
            console.log("hasChanges...");
            // debugger;
        }
        this.breakAfterUpdate = false;
    },

    methods: {
        // get data and computed fields
        getUpdateProps() {
            const computed = this.collectProps(Object.keys(this._computedWatchers));
            const data = this.collectProps(Object.keys(this._data));
            const props = this.collectProps(Object.keys(this._props));
            return { ...props, ...data, ...computed };
        },

        collectProps(fields) {
            return fields.reduce((acc, fName) => ({ ...acc, [fName]: this[fName] }), {});
        },

        storeUpdateProps() {
            this.lastProps = this.getUpdateProps();
        },

        reportProps(label, ignore = []) {
            let hasChanges = false;
            const lastProps = this.lastProps || {};
            const nowProps = this.getUpdateProps();
            console.groupCollapsed(label);
            for (const [key, val] of Object.entries(nowProps)) {
                if (val !== lastProps[key]) {
                    if (!ignore.includes(key)) {
                        hasChanges = true;
                    }
                    console.log(key, val);
                }
            }
            console.groupEnd();
            return hasChanges;
        },
    },
};
