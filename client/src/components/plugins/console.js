// Adds debug flag and basic log functionality to all components

export const consoleMixin = {
    methods: {
        clog() {
            console.log(...arguments);
        },
        cdir() {
            console.dir(...arguments);
        },
        cgroup() {
            console.group(...arguments);
        },
        cGroupCollapsed() {
            console.groupCollapsed(...arguments);
        },
        cGroupEnd() {
            console.groupEnd(...arguments);
        },
    },
};

export const consolePlugin = {
    install(Vue) {
        Vue.mixin(consoleMixin);
    },
};
