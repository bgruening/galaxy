<template>
    <HistoryContentProvider
        :history="history"
        v-slot="{
            contents,
            hidCursor,
            bench,
            topRows,
            bottomRows,
            totalMatches,
            onListScroll,
            scrolling,
            loading,
            params,
            updateParams,
        }"
    >
        <Layout>
            <!-- optional top-nav slot, for right-side history panel -->
            <template v-slot:nav>
                <slot name="nav"></slot>
            </template>

            <template v-slot:details>
                <HistoryDetails class="history-details" :history="history" />
            </template>

            <template v-slot:messages>
                <HistoryMessages class="history-messages m-2" :history="history" />
                <HistoryEmpty v-if="history.empty" class="m-2" />
            </template>

            <template v-slot:listcontrols>
                <ContentOperations
                    :history="history"
                    :params="params"
                    @update:params="updateParams"
                    :total-matches="totalMatches"
                    :loading="loading"
                    :content-selection.sync="listState.selected"
                    :show-selection.sync="listState.showSelection"
                />
            </template>

            <template v-slot:listing>
                <div :class="{ loadingBackground: loading }">
                    <VirtualScroller
                        key-field="hid"
                        :item-height="36"
                        :items="contents"
                        :scroll-start-key="hidCursor"
                        :bench="bench"
                        :top-placeholders="topRows"
                        :bottom-placeholders="bottomRows"
                        @scroll="onListScroll"
                        v-slot="{ item, index }"
                    >
                        <HistoryContentItem :item="item" :index="index" />
                    </VirtualScroller>
                </div>
            </template>

            <template v-slot:modals>
                <ToolHelpModal />
            </template>
        </Layout>
    </HistoryContentProvider>
</template>

<script>
import { History } from "./model";
// import { SearchParams } from "./model/SearchParams";
import { HistoryContentProvider } from "./providers";
import Layout from "./Layout";
import HistoryMessages from "./HistoryMessages";
import HistoryDetails from "./HistoryDetails";
import HistoryEmpty from "./HistoryEmpty";
import ContentOperations from "./ContentOperations";
import ToolHelpModal from "./ToolHelpModal";
import ListMixin from "./ListMixin";
import VirtualScroller from "../VirtualScroller";
import { HistoryContentItem } from "./ContentItem";

export default {
    mixins: [ListMixin],
    components: {
        HistoryContentProvider,
        Layout,
        HistoryMessages,
        HistoryDetails,
        HistoryEmpty,
        ContentOperations,
        ToolHelpModal,
        VirtualScroller,
        HistoryContentItem,
    },
    props: {
        history: { type: History, required: true },
    },
    computed: {
        historyId() {
            return this.history.id;
        },
    },
    watch: {
        historyId(newId, oldId) {
            if (newId && newId !== oldId) {
                this.listState.selected = new Set();
                this.listState.expanded = new Set();
                this.listState.showSelection = false;
            }
        },
    },
};
</script>
