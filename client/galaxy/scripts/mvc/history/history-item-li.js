function _templateNametag(tag) {
    return `<span class="dropdown tag-dropdown"><span class="label label-info dropbtn" data-toggle="dropdown">${_.escape(tag.slice(5))}</span><span class="dropdown-content"><a href="#">Add to child datasets</a><a href="#">Add to parents datasets</a><a href="#">Add to both</a></span></span>`;
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
    }, 2000);
    
}

export default {
    nametagTemplate: nametagTemplate,
    stopClickPropagation: stopClickPropagation
};
