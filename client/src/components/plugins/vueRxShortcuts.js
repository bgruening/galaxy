import Vue from "vue";
import VueRx from "vue-rx";
import { pluck } from "rxjs/operators";
import { tag } from "rxjs-spy/operators/tag";

Vue.use(VueRx);

export const vueRxShortcuts = {
    methods: {
        /**
         * Watch any property, adds debugging tag and assumes you want newValue,
         * this is usually what we want and shorter than typing it every time
         *
         * @param {string} propName Member to watch
         * @param {boolean} immediate Check right now?
         * @returns Observable of new value
         */
        watch$(propName, immediate = true) {
            const opts = { immediate };
            return this.$watchAsObservable(propName, opts).pipe(pluck("newValue"), tag(propName));
        },

        /**
         * Generic subscriber, subscribes to observable and disposes when
         * component unloads. Assumes you don't need to manage the response
         * data, if you do just use $subscribeTo instead
         *
         * @param {obervable} obs$ Observable to subscribe to
         * @param {string} label Debugging label
         */
        listenTo(obs$, label = "unknown observable") {
            if (!obs$) return;
            this.$subscribeTo(
                obs$,
                (result) => console.log(`[${label}] next`, typeof result),
                (err) => console.warn(`[${label}] error`, err),
                () => console.log(`[${label}] complete`)
            );
        },
    },
};
