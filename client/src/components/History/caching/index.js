import { toPromise, toOperator } from "./client";

/**
 * monitor cache for changes
 */
export const monitorContentQuery = toOperator("monitorContentQuery");
export const monitorDscQuery = toOperator("monitorDscQuery");
export const monitorHistoryContent = toOperator("monitorHistoryContent");

/**
 * Cache promise functions
 */
export const cacheContent = toPromise("cacheContentItem");
export const getCachedContentByTypeId = toPromise("getCachedContentByTypeId");
export const uncacheContent = toPromise("uncacheContent");

/**
 * Loaders
 */
export const loadHistoryContents = toOperator("loadHistoryContents");
export const loadDscContent = toOperator("loadDscContent");
export const pollHistory = toOperator("pollHistory");

// Debugging
export const wipeDatabase = toPromise("wipeDatabase");
