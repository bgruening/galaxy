<!--
Job state progress bar for a collection. There's another similar component at
components/JobStates/CollectionJobStates but it relies on the backbone data model,
so probably has to go eventually.

TODO: remove components/JobStates/CollectionJobStates when the underlying backbone
model is appropriately dead
-->

<template>
    <b-progress v-if="maxJobs && runningJobs" :max="maxJobs" height="1em">
        <b-progress-bar v-if="errorJobs" :value="errorJobs" variant="danger"></b-progress-bar>
        <b-progress-bar v-if="okJobs" :value="okJobs" variant="success"></b-progress-bar>
        <b-progress-bar v-if="runningJobs" :value="runningJobs" variant="info" animated></b-progress-bar>
        <b-progress-bar v-if="waitingJobs" :value="waitingJobs" variant="dark" animated></b-progress-bar>
    </b-progress>
</template>

<script>
import { JobStateSummary } from "../../model";
// {"paused": 0, "failed": 0, "all_jobs": 8, "upload": 0,
//     "resubmitted": 0, "deleted_new": 0, "waiting": 0,
//     "running": 0, "error": 0, "new": 0,
//     "deleted": 0, "ok": 8, "queued": 0}

export default {
    props: {
        summary: { type: JobStateSummary, required: true },
    },
    computed: {
        hasRunningJobs() {
            return this.summary && this.summary.running > 0;
        },
        maxJobs() {
            return this.summary.all_jobs;
        },
        okJobs() {
            return this.summary.ok;
        },
        runningJobs() {
            return this.summary.running;
        },
        errorJobs() {
            const { failed = 0, error = 0 } = this.summary;
            return failed + error;
        },
        waitingJobs() {
            const { waiting = 0, queued = 0 } = this.summary;
            return waiting + queued;
        },
    },
};
</script>
