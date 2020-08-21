export default {
    data() {
        return {
            listState: {
                showSelection: false,
                selected: new Set(),
                expanded: new Set(),
            },
        };
    },

    methods: {
        isSelected({ type_id }) {
            return this.listState.selected.has(type_id);
        },
        setSelected({ type_id }, val) {
            const newSet = new Set(this.listState.selected);
            val ? newSet.add(type_id) : newSet.delete(type_id);
            this.listState.selected = newSet;
        },
        isExpanded({ type_id }) {
            return this.listState.expanded.has(type_id);
        },
        setExpanded({ type_id }, val) {
            const newSet = new Set(this.listState.expanded);
            val ? newSet.add(type_id) : newSet.delete(type_id);
            this.listState.expanded = newSet;
        },
    },

    provide() {
        return {
            listState: this.listState,
            isSelected: this.isSelected,
            setSelected: this.setSelected,
            isExpanded: this.isExpanded,
            setExpanded: this.setExpanded,
        };
    },

    watch: {
        "listState.selected": function (newSet) {
            if (newSet.size > 0) {
                this.showSelection = true;
            }
        },
    },
};
