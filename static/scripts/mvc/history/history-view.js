define("mvc/history/history-view",["exports","mvc/list/list-view","mvc/history/history-model","mvc/history/history-contents","mvc/history/history-preferences","mvc/history/hda-li","mvc/history/hdca-li","mvc/user/user-model","mvc/ui/error-modal","ui/fa-icon-button","mvc/base-mvc","utils/localization","ui/search-input"],function(e,t,s,i,n,o,l,r,a,d,c,h){"use strict";function u(e){return e&&e.__esModule?e:{default:e}}Object.defineProperty(e,"__esModule",{value:!0});var g=u(t),m=u(s),f=u(i),p=(u(n),u(o)),v=u(l),y=(u(r),u(a)),w=u(d),I=u(c),T=u(h),C=g.default.ModelListPanel,b=C.extend({_logNamespace:"history",HDAViewClass:p.default.HDAListItemView,HDCAViewClass:v.default.HDCAListItemView,collectionClass:f.default.HistoryContents,modelCollectionKey:"contents",tagName:"div",className:C.prototype.className+" history-panel",emptyMsg:(0,T.default)("This history is empty"),noneFoundMsg:(0,T.default)("No matching datasets found"),searchPlaceholder:(0,T.default)("search datasets"),FETCH_COLLECTION_COUNTS_DELAY:2e3,initialize:function(e){C.prototype.initialize.call(this,e),this.linkTarget=e.linkTarget||"_blank",this.detailedFetchTimeoutId=null},_createDefaultCollection:function(){return new this.collectionClass([],{history:this.model})},freeModel:function(){return C.prototype.freeModel.call(this),this.model&&this.model.clearUpdateTimeout(),this._clearDetailedFetchTimeout(),this},_clearDetailedFetchTimeout:function(){this.detailedFetchTimeoutId&&(clearTimeout(this.detailedFetchTimeoutId),this.detailedFetchTimeoutId=null)},_setUpListeners:function(){var e=this;C.prototype._setUpListeners.call(this),this.on({error:function(e,t,s,i,n){this.errorHandler(e,t,s,i,n)},"loading-done":function(){e.detailedFetchTimeoutId=_.delay(function(){e.detailedFetchTimeoutId=null,e.model.contents.fetchCollectionCounts()},e.FETCH_COLLECTION_COUNTS_DELAY)},"views:ready view:attached view:removed":function(e){this._renderSelectButton()},"view:attached":function(e){this.scrollTo(0)}})},loadHistory:function(e,t,s){var i=this;return s=_.extend(s||{silent:!0}),this.info("loadHistory:",e,t,s),this.setModel(new m.default.History({id:e})),s.silent=!0,this.trigger("loading"),this.model.fetchWithContents(t,s).always(function(){i.render(),i.trigger("loading-done")})},refreshContents:function(e){return this.model?this.model.refresh(e):$.when()},_setUpCollectionListeners:function(){return C.prototype._setUpCollectionListeners.call(this),this.listenTo(this.collection,{"fetching-more":function(){this._toggleContentsLoadingIndicator(!0),this.$emptyMessage().hide()},"fetching-more-done":function(){this._toggleContentsLoadingIndicator(!1)}})},_showLoadingIndicator:function(e,t,s){var i=$('<div class="loading-indicator"/>');this.$el.html(i.text(e).slideDown(_.isUndefined(t)?this.fxSpeed:t))},_hideLoadingIndicator:function(e){this.$(".loading-indicator").slideUp(_.isUndefined(e)?this.fxSpeed+200:e,function(){$(this).remove()})},_buildNewRender:function(){var e=C.prototype._buildNewRender.call(this);return this._renderSelectButton(e),e},_renderSelectButton:function(e){if(e=e||this.$el,!this.multiselectActions().length)return null;if(!this.views.length)return this.hideSelectors(),e.find(".controls .actions .show-selectors-btn").remove(),null;var t=e.find(".controls .actions .show-selectors-btn");return t.length?t:(0,w.default)({title:(0,T.default)("Operations on multiple datasets"),classes:"show-selectors-btn",faIcon:"fa-check-square-o"}).prependTo(e.find(".controls .actions"))},_renderEmptyMessage:function(e){var t=this.$emptyMessage(e);return this.model.get("contents_active").active<=0?t.empty().append(this.emptyMsg).show():this.searchFor&&this.model.contents.haveSearchDetails()&&!this.views.length?t.empty().append(this.noneFoundMsg).show():(t.hide(),$())},$scrollContainer:function(e){return this.$list(e)},_toggleContentsLoadingIndicator:function(e){e?this.$list().html('<div class="contents-loading-indicator"><span class="fa fa-2x fa-spinner fa-spin"/></div>'):this.$list().find(".contents-loading-indicator").remove()},renderItems:function(e){e=e||this.$el;var t=this.$list(e);$(".tooltip").remove(),t.empty(),this.views=[];var s=this._filterCollection();return s.length?(this._renderPagination(e),this.views=this._renderSomeItems(s,t)):e.find("> .controls .list-pagination").empty(),this._renderEmptyMessage(e).toggle(!s.length),this.trigger("views:ready",this.views),this.views},_renderPagination:function(e){var t=e.find("> .controls .list-pagination");return this.searchFor||!this.model.contents.shouldPaginate()?t.empty():(t.html(this.templates.pagination({current:this.model.contents.currentPage+1,last:this.model.contents.getLastPage()+1},this)),t.find("select.pages").tooltip(),t)},_renderSomeItems:function(e,t){var s=this,i=[];return t.append(e.map(function(e){var t=s._createItemView(e);return i.push(t),s._renderItemView$el(t)})),i},_filterItem:function(e){var t=this.model.contents;return(t.includeHidden||!e.hidden())&&(t.includeDeleted||!e.isDeletedOrPurged())&&C.prototype._filterItem.call(this,e)},_getItemViewClass:function(e){var t=e.get("history_content_type");switch(t){case"dataset":return this.HDAViewClass;case"dataset_collection":return this.HDCAViewClass}throw new TypeError("Unknown history_content_type: "+t)},_getItemViewOptions:function(e){var t=C.prototype._getItemViewOptions.call(this,e);return _.extend(t,{linkTarget:this.linkTarget,expanded:this.model.contents.storage.isExpanded(e.id),hasUser:this.model.ownedByCurrUser()})},_setUpItemViewListeners:function(e){var t=this;return C.prototype._setUpItemViewListeners.call(t,e),t.listenTo(e,{expanded:function(e){t.model.contents.storage.addExpanded(e.model)},collapsed:function(e){t.model.contents.storage.removeExpanded(e.model)}})},collapseAll:function(){this.model.contents.storage.clearExpanded(),C.prototype.collapseAll.call(this)},getSelectedModels:function(){var e=C.prototype.getSelectedModels.call(this);return e.historyId=this.collection.historyId,e},events:_.extend(_.clone(C.prototype.events),{"click .show-selectors-btn":"toggleSelectors","click > .controls .prev":"_clickPrevPage","click > .controls .next":"_clickNextPage","change > .controls .pages":"_changePageSelect","click .messages [class$=message]":"clearMessages"}),_clickPrevPage:function(e){this.model.clearUpdateTimeout(),this.model.contents.fetchPrevPage()},_clickNextPage:function(e){this.model.clearUpdateTimeout(),this.model.contents.fetchNextPage()},_changePageSelect:function(e){this.model.clearUpdateTimeout();var t=$(e.currentTarget).val();this.model.contents.fetchPage(t)},toggleShowDeleted:function(e,t){e=void 0!==e?e:!this.model.contents.includeDeleted;var s=this.model.contents;return s.setIncludeDeleted(e,t),this.trigger("show-deleted",e),s.fetchCurrentPage({renderAll:!0}),e},toggleShowHidden:function(e,t,s){e=void 0!==e?e:!this.model.contents.includeHidden;var i=this.model.contents;return i.setIncludeHidden(e,s),this.trigger("show-hidden",e),i.fetchCurrentPage({renderAll:!0}),e},_firstSearch:function(e){var t=this;if(this.log("onFirstSearch",e),this.model.contents.haveSearchDetails())this.searchItems(e);else{this.$("> .controls .search-input").searchInput("toggle-loading"),this.searchFor=e;this.model.contents.progressivelyFetchDetails({silent:!0}).progress(function(e,s,i){t.renderItems(),t.trigger("search:loading-progress",s,i)}).always(function(){t.$el.find("> .controls .search-input").searchInput("toggle-loading")}).done(function(){t.searchItems(e,"force")})}},clearSearch:function(e){var t=this;return this.searchFor?(this.searchFor="",this.trigger("search:clear",this),this.$("> .controls .search-query").val(""),this.model.contents.fetchCurrentPage({silent:!0}).done(function(){t.renderItems()}),this):this},errorHandler:function(e,t,s){if(!t||0!==t.status||0!==t.readyState){if(this.error(e,t,s),_.isString(e)&&_.isString(t)){var i=e,n=t;return y.default.errorModal(i,n,s)}return t&&502===t.status?y.default.badGatewayErrorModal():y.default.ajaxErrorModal(e,t,s)}},clearMessages:function(e){return(_.isUndefined(e)?this.$messages().children('[class$="message"]'):$(e.currentTarget)).fadeOut(this.fxSpeed,function(){$(this).remove()}),this},scrollToHid:function(e){return this.scrollToItem(_.first(this.viewsWhereModel({hid:e})))},ordinalIndicator:function(e){var t=""+e;switch(t.charAt(t.length-1)){case"1":return t+"st";case"2":return t+"nd";case"3":return t+"rd";default:return t+"th"}},toString:function(){return"HistoryView("+(this.model?this.model.get("name"):"")+")"}});b.prototype.templates=function(){var e=I.default.wrapTemplate(['<div class="controls">','<div class="title">','<div class="name"><%- history.name %></div>',"</div>",'<div class="subtitle"></div>','<div class="history-size"><%- history.nice_size %></div>','<div class="actions"></div>','<div class="messages">',"<% if( history.deleted && history.purged ){ %>",'<div class="deleted-msg warningmessagesmall">',(0,T.default)("This history has been purged and deleted"),"</div>","<% } else if( history.deleted ){ %>",'<div class="deleted-msg warningmessagesmall">',(0,T.default)("This history has been deleted"),"</div>","<% } else if( history.purged ){ %>",'<div class="deleted-msg warningmessagesmall">',(0,T.default)("This history has been purged"),"</div>","<% } %>","<% if( history.message ){ %>",'<div class="<%= history.message.level || "info" %>messagesmall">',"<%= history.message.text %>","</div>","<% } %>","</div>",'<div class="tags-display"></div>','<div class="annotation-display"></div>','<div class="search">','<div class="search-input"></div>',"</div>",'<div class="list-actions">','<div class="btn-group">','<button class="select-all btn btn-default"','data-mode="select">',(0,T.default)("All"),"</button>",'<button class="deselect-all btn btn-default"','data-mode="select">',(0,T.default)("None"),"</button>","</div>",'<div class="list-action-menu btn-group">',"</div>","</div>",'<div class="list-pagination form-inline"></div>',"</div>"],"history"),t=I.default.wrapTemplate(['<button class="prev" <%- pages.current === 1 ? "disabled" : "" %>>previous</button>','<select class="pages form-control" ','title="',(0,T.default)("Click to open and select a page. Begin typing a page number to select it"),'">',"<% _.range( 1, pages.last + 1 ).forEach( function( i ){ %>",'<option value="<%- i - 1 %>" <%- i === pages.current ? "selected" : "" %>>',"<%- view.ordinalIndicator( i ) %> of <%- pages.last %> pages","</option>","<% }); %>","</select>",'<button class="next" <%- pages.current === pages.last ? "disabled" : "" %>>next</button>'],"pages");return _.extend(_.clone(C.prototype.templates),{el:function(){return'<div>\n            <div class="controls"></div>\n            <ul class="list-items"></ul>\n            <div class="empty-message infomessagesmall"></div>\',\n        </div>'},controls:e,pagination:t})}(),e.default={HistoryView:b}});