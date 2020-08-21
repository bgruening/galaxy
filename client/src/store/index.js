/**
 * Central Vuex store
 */

import Vue from "vue";
import Vuex from "vuex";
import createCache from "vuex-cache";

import { gridSearchStore } from "./gridSearchStore";
import { tagStore } from "./tagStore";
import { jobMetricsStore } from "./jobMetricsStore";
import { jobDestinationParametersStore } from "./jobDestinationParametersStore";
import { invocationStore } from "./invocationStore";
import { historyStore } from "./historyStore";
import { userStore } from "./userStore";
import { configStore } from "./configStore";
import { workflowStore } from "./workflowStore";
import { datasetPathDestinationStore } from "./datasetPathDestinationStore";
import { datasetExtFilesStore } from "./datasetExtFilesStore";

// beta features
import { historyStore as betaHistoryStore, historyPersist } from "components/History/model/historyStore";

Vue.use(Vuex);

export function createStore() {
    const storeConfig = {
        plugins: [
            createCache(),
            (store) => {
                store.dispatch("config/$init", { store });
                store.dispatch("user/$init", { store });
            },
        ],
        modules: {
            gridSearch: gridSearchStore,
            histories: historyStore,
            tags: tagStore,
            jobMetrics: jobMetricsStore,
            destinationParameters: jobDestinationParametersStore,
            datasetPathDestination: datasetPathDestinationStore,
            datasetExtFiles: datasetExtFilesStore,
            invocations: invocationStore,
            user: userStore,
            config: configStore,
            workflows: workflowStore,
        },
    };

    // beta history panel features features
    const useBetaHistory = sessionStorage.getItem("useBetaHistory");
    if (useBetaHistory) {
        storeConfig.modules.history = betaHistoryStore;
        storeConfig.plugins.push(historyPersist.plugin, (store) => {
            store.dispatch("history/$init", { store });
        });
    }

    return new Vuex.Store(storeConfig);
}

const store = createStore();

export default store;
