import Utils from "utils/utils";

function _templateNametag(tag) {
    return `<span class="dropdown tag-dropdown"><span class="label label-info dropbtn" data-toggle="dropdown">${_.escape(tag.slice(5))}</span><span class="dropdown-content"><a href="#" class="propagate-tag" id="propagate-to-child">Add to child datasets</a><a href="#" class="propagate-tag" id="propagate-to-parent">Add to parents datasets</a><a href="#" class="propagate-tag" id="propagate-to-both">Add to both</a></span></span>`;
}

function nametagTemplate(historyItem) {
    let uniqueNametags = _.filter(_.uniq(historyItem.tags), t => t.indexOf("name:") === 0);
    let nametagsDisplay = _.sortBy(uniqueNametags).map(_templateNametag);
    return `
        <div class="nametags" title="${uniqueNametags.length} nametags">
            ${nametagsDisplay.join("")}
        </div>`;
}

function stopClickPropagation(){
    window.setTimeout(() => {
        $(".tag-dropdown .label-info").on("click", (e) => {
            e.stopPropagation();
            $(e.target.nextSibling).toggle();
        });
        $(".tag-dropdown .propagate-tag").on("click", (e) => {
            e.stopPropagation();
            let historyId = "",
                datasetId = "",
                tagName = "";
            updateTagsAsyncCall(historyId, datasetId, tagName);
        });
    }, 2000); 
}

function updateTagsAsyncCall(historyId, datasetId, tagName){
    let asyncUrl = Galaxy.root + 'api/histories/' + historyId + '/contents/' + datasetId + '/propagate_history_tags';
    Utils.request({
        type: "PUT",
        url: asyncUrl,
        data: {"history_id": historyId, "id": datasetId, "tag_name": tagName},
        success: function(response) {
            console.log("Async call success");
        },
        error: function(response) {
            console.error("Async call error");
        }
    });
}

export default {
    nametagTemplate: nametagTemplate,
    stopClickPropagation: stopClickPropagation,
    updateTagsAsyncCall: updateTagsAsyncCall
};
