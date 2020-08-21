import deepEqual from "deep-equal";
import Scroll from "./Scroll";
import Resize from "./Resize";
import { cssLength } from "./util";
import "./scroller.scss";
// import debugUpdate from "./debugUpdate";

const positiveNumber = (rawVal) => {
    console.log("positiveNumber", rawVal);
    const val = Number(rawVal);
    if (isNaN(val)) return false;
    if (val < 0) return false;
    return true;
};

export default {
    // mixins: [ debugUpdate ],

    directives: {
        Scroll,
        Resize,
    },

    props: {
        // list of data objects
        items: { type: Array, required: true },

        // field from the objects in items to use as a key for the v-for loop
        keyField: { type: String, required: true },

        // used to determine the number of rows to render, doesn't need to be
        // perfect, should be a rough estimate, but this is the size rows will
        // be smashed into when they are in the bench region
        itemHeight: { required: true, validator: positiveNumber },

        // number of items from the top of the list to keep in reserve in case
        // the user scrolls upward, changes the starting render index
        bench: { default: 0, validator: positiveNumber },

        // since we are rendering very large lists and a lot of the data may not
        // yet be available in the cache, the items array represents a local
        // window in the complete set. These two numbers are used to approximate
        // the number of rows above and below that window in order to make the
        // scrollbar proportionately sized.
        topPlaceholders: { default: 0, validator: positiveNumber },
        bottomPlaceholders: { default: 0, validator: positiveNumber },

        // set this if we need to shift
        scrollStartKey: { default: null },
    },

    data() {
        return {
            scrollTop: 0,
            contentHeight: 0, // dom height of scroller contents
            scrollerHeight: null, // dom height of container
            scrollToKeyOnNextUpdate: null,
        };
    },

    mounted() {
        this.scrollToItemIndex(0);
    },

    updated() {
        if (this.scrollToKeyOnNextUpdate) {
            this.scrollToKey(this.scrollToKeyOnNextUpdate);
            this.scrollToKeyOnNextUpdate = null;
        }
    },

    watch: {
        // When contents are updated, we'll often need to shift the list to
        // match a known starting position, we want to do this without firing a
        // bunch of events and property updates because that'll start an endless
        // update loop, so we watch an explicit property on the component

        scrollStartKey(key, oldKey) {
            if (key !== oldKey) {
                this.scrollToKeyOnNextUpdate = key;
            }
        },

        range: {
            // deep: true, // doesn't work
            handler(newRange, oldRange = {}) {
                if (deepEqual(newRange, oldRange)) return;

                const { start, end } = this.range;
                // const { scrollTop, contentHeight, scrollerHeight, cursor } = this;
                const { cursor } = this;

                // if scroller is outside items window, these might be null
                const startItem = start >= 0 ? this.items[start] : null;
                const endItem = end < this.items.length ? this.items[end] : null;

                // keys of start/end
                const startKey = startItem ? startItem[this.keyField] : null;
                const endKey = endItem ? endItem[this.keyField] : null;

                const payload = {
                    // index of first visible, last visible relative to the
                    // items array
                    start,
                    end,

                    // send back what we calculated for page size
                    pageSize: this.visibleRowEstimate,

                    // index of first visible, last visible relative to the
                    // complete represented data set, including the placeholders
                    // these are important when the user has scrolled outside
                    // the provided items data window, as will often be the case
                    // with a very large history
                    dataStart: start + this.topPlaceholders,
                    dataEnd: end + this.topPlaceholders,

                    // item keys
                    startKey,
                    endKey,

                    // dom props
                    // scrollTop,
                    // contentHeight,
                    // scrollerHeight,

                    // 0-1 value, how far down are we
                    cursor,

                    // items corresponding to start/end, if within the window
                    // startItem,
                    // endItem,
                };

                this.$emit("scroll", payload);
            },
        },
    },

    computed: {
        // first & last visible item index

        start() {
            const height = this.scrollTop - this.topPlaceholderHeight;
            return Math.floor(height / this.itemHeight);
        },

        end() {
            return this.start + this.visibleRowEstimate;
        },

        range() {
            return { start: this.start, end: this.end };
        },

        // key corresponding to the item associated with the start index

        startKey() {
            const item = this.items[this.start];
            return item ? item[this.keyField] : null;
        },

        // first & last rendered item index

        benchStart() {
            return Math.max(0, this.start - this.bench);
        },

        benchEnd() {
            return this.benchStart + this.sliceSize;
        },

        // number of rows to render starting at benchStart

        sliceSize() {
            return Math.max(0, this.start - this.benchStart) + this.visibleRowEstimate + this.bench;
        },

        // eyeball a reasonable number

        visibleRowEstimate() {
            return Math.ceil(this.scrollerHeight / this.itemHeight);
        },

        // 0-1 value representing how far down we are on the scroller

        cursor() {
            return this.contentHeight > 0 ? this.scrollTop / this.contentHeight : 0;
        },

        // padding representing non-rendered rows from the items array, these
        // items have scrolled off the top of the display but are no longer
        // rendered, items from the bench are rendered even though they are
        // above the ine for smoothness of scrolling

        paddingTop() {
            const rows = Math.max(0, this.start - this.bench);
            const padding = rows * this.itemHeight;
            // console.log(">> compute paddingTop", padding, rows);
            return padding;
        },

        paddingBottom() {
            const rows = Math.max(0, this.items.length - this.benchStart - this.sliceSize);
            const padding = rows * this.itemHeight;
            // console.log(">> compute paddingBottom", padding, rows);
            return padding;
        },

        // padding representing non-rendered rows that are beyond the scope of
        // the items array, in the event that we're talking about a very large
        // list and we just want a window into a segment in the middle

        topPlaceholderHeight() {
            return this.topPlaceholders * this.itemHeight;
        },

        bottomPlaceholderHeight() {
            return this.bottomPlaceholders * this.itemHeight;
        },
    },

    methods: {
        // Event handlers

        onScroll() {
            if (this.suppressScrollEvent) return;
            // console.log("<< scrollTop", this.$el.scrollTop);
            this.scrollTop = this.$el.scrollTop;
        },

        onContainerResize(height) {
            if (height === this.scrollerHeight) return;
            this.scrollerHeight = height;
        },

        onContentResize(height) {
            if (height === this.contentHeight) return;
            this.contentHeight = height;
        },

        // Scrolling: these methods do not trigger the normal scroll event

        scrollToKey(key) {
            // console.log("scrollToKey", key);
            const idx = this.items.findIndex((x) => x[this.keyField] == key);
            if (idx > -1) {
                this.scrollToItemIndex(idx);
            }
        },

        scrollToItemIndex(idx) {
            // console.log("scrollToItemIndex", idx);

            // perfect scrolltop for this idx
            const scrollTop = idx * this.itemHeight + this.topPlaceholderHeight;

            // gets the little offset so it's not so jerky when this updates
            const realScrollTop = this.$refs.scroller.scrollTop;
            const startScrollTop = this.start * this.itemHeight + this.topPlaceholderHeight;
            const offset = realScrollTop - startScrollTop;

            this.scrollTo(scrollTop + offset);
        },

        scrollTo(height) {
            // console.log("scrollTo", height);
            if (height !== this.$refs.scroller.scrollTop) {
                this.suppressScrollEvent = true;
                this.$refs.scroller.scrollTo({
                    top: height,
                    behavior: "auto",
                });
                setTimeout(() => {
                    this.suppressScrollEvent = false;
                }, 0);
            }
        },

        // Rendering

        renderList() {
            const list = this.items.slice(this.benchStart, this.benchEnd);
            return list.map(this.renderItem);
        },

        renderItem(item, sliceIndex) {
            const key = item[this.keyField];
            const index = sliceIndex + this.benchStart; // item index

            const h = this.$createElement;
            const slotChild = this.renderSlot("default", { key, index, item });

            const isFirst = index == this.start;
            const isBench = index < this.start;
            const isBenchStart = this.bench > 0 && index == this.benchStart;
            const ref = isFirst ? "first" : isBenchStart ? "benchStart" : null;

            return h(
                "li",
                {
                    key,
                    ref,
                    class: {
                        first: isFirst,
                        bench: isBench,
                        // benchStart: isBenchStart,
                    },
                    // force bench items to be itemHeight tall regardless of
                    // whatever's going on with their normal rendering, this makes
                    // all the rendering math a lot faster
                    style: {
                        height: isBench ? `${cssLength(this.itemHeight)} !important` : "",
                    },
                    attrs: {
                        // index considering the missing data rows reprsented by topPlaceholders
                        "data-index": index + this.topPlaceholders,
                        // index with respect to the passed items array
                        "item-index": index,
                        "data-key": key,
                    },
                },
                slotChild
            );
        },

        renderSlot(name = "default", data, optional = false) {
            if (this.$scopedSlots[name]) {
                return this.$scopedSlots[name](data instanceof Function ? data() : data);
            } else if (this.$slots[name] && (!data || optional)) {
                return this.$slots[name];
            }
            return undefined;
        },
    },

    render(h) {
        // simple ul, each item is a slot inside a LI

        const list = h("ul", {}, this.renderList());

        // wrapper around content, houses topPadding + bottomPadding + ul
        // this wrapper handles the normal paddingTop/paddingBottom which
        // represent non-rendered rows in the dataset

        const wrapper = h(
            "div",
            {
                style: {
                    paddingTop: cssLength(this.paddingTop),
                    paddingBottom: cssLength(this.paddingBottom),
                },
            },
            [list]
        );

        // This div handles the topPlaceholders and bottomPlaceholders values
        // which is extra spacing meant to represent rows which were not
        // provided to the items array in the event that items is a small slice
        // of a very very large dataset. Essentially this is to keep the
        // scrollbars looking roughly right

        const contentWrapper = h(
            "div",
            {
                ref: "content",
                staticClass: "scrollContent",
                style: {
                    paddingTop: cssLength(this.topPlaceholderHeight),
                    paddingBottom: cssLength(this.bottomPlaceholderHeight),
                },
                directives: [{ name: "resize", value: this.onContentResize }],
            },
            [wrapper]
        );

        // container, fixed height, wrapper is longer and scrolls within this

        return h(
            "div",
            {
                staticClass: "virtualScroller",
                ref: "scroller",
                directives: [
                    { name: "scroll", modifiers: { self: true }, value: this.onScroll },
                    { name: "resize", value: this.onContainerResize },
                ],
            },
            [contentWrapper]
        );
    },
};
