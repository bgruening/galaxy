define(["mvc/tool/tool-form","libs/underscore"],function(a,b){var c=Backbone.View.extend({initialize:function(){this.search_query_minimum_length=3,this.active_filter="all",$(".full-content").prepend(this._template())},invokeOverlay:function(a){var b=$(".search-screen"),c=$(".search-screen-overlay"),e=$(".txtbx-search-data"),f=$(".search-results");a&&(a.stopPropagation(),(81===a.which||81===a.keyCode)&&a.ctrlKey&&a.altKey?(e.val(""),f.html(""),c.css("display","block"),b.css("display","block"),e.focus(),pinnedLink=new d({}),pinnedLink.buildPinnedLinks()):(27===a.which||27===a.keyCode)&&this.removeOverlay())},render:function(){var a=this,b=$(".txtbx-search-data");return this.removeOverlay(),b.on("keyup",function(b){a.searchData(a,b)}),this.registerFilterClicks(a),this},removeOverlay:function(){var a=$(".search-screen"),b=$(".search-screen-overlay");b.css("display","none"),a.css("display","none")},searchData:function(a,b){var c=$(".txtbx-search-data"),d="",e=(Galaxy.root+"api/tools",$(".search-results"));b&&(b.stopPropagation(),d=c.val().trim().toLowerCase(),d.length<a.search_query_minimum_length?e.html(""):(13===b.which||13===b.keyCode||d.length>=a.search_query_minimum_length)&&a.searchOne(a,a.active_filter,d))},registerFilterClicks:function(a){var b={};b.all=".all-filter",b.tools=".tool-filter",b.history=".history-filter",b.data_library=".datalibrary-filter";for(item in b)a.clickEvents(b[item],item,a)},clickEvents:function(a,b,c){$(a).click(function(){c.searchWithFilter(b,this,c)})},searchWithFilter:function(a,b,c){if(!$(b).hasClass("filter-active")){var d=$(".txtbx-search-data").val().trim().toLowerCase();d.length>=c.search_query_minimum_length&&(c.applyDomOperations(b),c.active_filter=a,c.searchOne(c,c.active_filter,d))}},applyDomOperations:function(a){var b=$(".overlay-filters a");$(".search-results").html(""),b.css("text-decoration","underline").removeClass("filter-active"),$(a).css("text-decoration","none").addClass("filter-active")},searchOne:function(a,b,c){switch(b){case"all":a.searchAll(a,c);break;case"tools":a.searchTools(c);break;case"history":a.searchHistory(c);break;case"data_library":a.searchDataLibrary(c);break;default:a.searchAll(a,c)}},searchAll:function(a,b){var c=$(".search-results"),d=$(".overlay-filters"),e=$(".all-filter");c.html(""),d.css("display","block"),e.css("text-decoration","none"),e.hasClass("filter-active")||e.addClass("filter-active"),a.searchHistory(b),a.searchTools(b),a.searchDataLibrary(b)},searchTools:function(a){var b=Galaxy.root+"api/tools";$.get(b,{q:a},function(a){toolSearch=new d({tools:a})},"json")},searchHistory:function(a){var c=Galaxy.root+"api/histories";$.get(c,function(e){var f=[];b.each(e,function(e){var g=c+"/"+e.id+"/contents";$.get(g,function(c){b.each(c,function(b){var c=b.name.toLowerCase();c.indexOf(a)>-1&&f.push(b)}),historySearch=new d({history:f})},"json")})},"json")},searchDataLibrary:function(a){var c=Galaxy.root+"api/libraries?deleted=false";$.get(c,function(c){data_lib_list=[],b.each(c,function(b){var c=b.name.toLowerCase();c.indexOf(a)>-1&&data_lib_list.push(b)}),libSearch=new d({data_library:data_lib_list})},"json")},_template:function(){return'<div class="overlay-wrapper"><div id="search_screen_overlay" class="search-screen-overlay"></div><div id="search_screen" class="search-screen"><input class="txtbx-search-data form-control" type="text" value="" placeholder="Give at least 3 letters to search" /><div class="overlay-filters"><a class="all-filter"> All </a><a class="history-filter"> History </a><a class="tool-filter"> Tools </a><a class="workflow-filter"> Workflow </a><a class="datalibrary-filter"> Data Library </a></div><div class="pinned-results"></div><div class="search-results"></div></div></div>'}}),d=Backbone.View.extend({self:this,data:{},initialize:function(a){var b=Object.keys(a)[0];if(this.data){switch(b){case"tools":this.data.tools=a[b];break;case"history":this.data.history=a[b];break;case"data_library":this.data.data_library=a[b]}this.refreshView(this.data)}},getActiveFilter:function(){var a="all";return a=$(".tool-filter").hasClass("filter-active")?"tools":a,a=$(".history-filter").hasClass("filter-active")?"history":a,a=$(".datalibrary-filter").hasClass("filter-active")?"data_library":a},refreshView:function(a){var b=$(".search-results"),c=$(".no-results"),d=this.getActiveFilter(),e=null;if(c.remove(),"all"===d)this.makeAllSection();else{if(e=a[d],!e||0===e.length)return void this.showEmptySection(b);this.makeSection(d,e)}},showEmptySection:function(a){a.html(""),a.append(this._templateNoResults())},makeSection:function(a,b){switch(a){case"tools":this.makeToolSection(b);break;case"history":this.makeCustomSearchSection({name:"History",id:"history",class_name:"search-section search-history",link_class_name:"history-search-link",data:b});break;case"data_library":this.makeCustomSearchSection({name:"Data Library",id:"datalibrary",class_name:"search-section search-datalib",link_class_name:"datalib-search-link",data:b})}},makeAllSection:function(){var a=!1,b=$(".search-results"),c=this;for(type in c.data)c.data[type]&&(a=!0,"tools"===type&&c.makeToolSection(c.data[type]),"history"===type&&c.data.history.length>0&&c.makeCustomSearchSection({name:"History",id:"history",class_name:"search-section search-history",link_class_name:"history-search-link",data:c.data[type]}),"data_library"===type&&c.data.data_library.length>0&&c.makeCustomSearchSection({name:"Data Library",id:"datalibrary",class_name:"search-section search-datalib",link_class_name:"datalib-search-link",data:c.data[type]}));a||c.showEmptySection(b)},checkItemPinned:function(a){var c=window.Galaxy.user.id+"_search_pref",d=!1,e=null;return window.Galaxy.user.id&&localStorage.getItem(c)&&(e=JSON.parse(localStorage.getItem(c)),e.pinned_results)?(b.each(e.pinned_results,function(b,c){c===a&&(d=!0)}),d):void 0},makeToolSection:function(a){var c=[],d="",e=this,f=$(".search-results");b.each(a,function(a){var f=Galaxy.toolPanel.attributes.layout.models;b.each(f,function(f){if("ToolSection"===f.attributes.model_class){var g=f.attributes.elems,h=!1,i="",j="",k="";b.each(g,function(b){if(b.id===a){var c=b.attributes;e.checkItemPinned(c.id)||(h=!0,i+=e._buildLinkTemplate(c.id,c.link,c.name,c.description,c.target,"tool-search-link",c.version,c.min_width,c.form_style))}}),h&&(j=f.attributes.id,k=f.attributes.name,c=e.appendTemplate(c,j,k,i))}else if("Tool"===f.attributes.model_class||"DataSourceTool"===f.attributes.model_class){var l=f.attributes;a===l.id&&(e.checkItemPinned(l.id)||(d+=e._buildLinkTemplate(l.id,l.link,l.name,l.description,l.target,"tool-search-link",l.version,l.min_width,l.form_style)))}})}),f.find(".search-tools").remove(),e.makeToolSearchResultTemplate(c,d)},appendTemplate:function(a,c,d,e){var f=!1;return b.each(a,function(a){c===a.id&&(a.template=a.template+" "+e,f=!0)}),f||a.push({id:c,template:e,name:d}),a},registerToolLinkClick:function(a,b){b.find("a.tool-search-link").click(function(b){b.preventDefault(),a.searchedToolLink(a,b)}),b.find("a>i.remove-item").click(function(b){b.preventDefault(),b.stopPropagation(),a.removeFromDataStorage(a,$(this).parent()),$(this).parent().remove()})},registerCustomPinnedLinkClicks:function(a,b){b.find("a>i.remove-item").click(function(b){b.preventDefault(),b.stopPropagation(),a.removeFromDataStorage(a,$(this).parent()),$(this).parent().remove()}),b.find(".btn").click(function(){a.removeOverlay()})},makePinRemoveItems:function(a,b,c){a.css("margin-left","2px"),b.css("margin-left","2px"),a.click(function(a){a.preventDefault(),a.stopPropagation(),c.pinLink(c,$(this).parent()),$(this).parent().remove()}),b.click(function(a){a.preventDefault(),a.stopPropagation(),$(this).parent().remove()})},makeToolSearchResultTemplate:function(a,c){var d=this,e=$(".search-results"),f=null,g=null;e.find(".tool-search-link").remove(),"all"===d.getActiveFilter()&&e.append(d._buildHeaderTemplate("tools","Tools","search-section search-tools")),b.each(a,function(a){e.append(a.template)}),e.append(c),d.registerToolLinkClick(d,e),f=$(".tool-search-link").find("i.pin-item"),g=$(".tool-search-link").find("i.remove-item"),d.makePinRemoveItems(f,g,d),e.fadeIn("slow")},searchedToolLink:function(b,c){var d="",e="",f="",g=null;if(c)if(b.removeOverlay(),c.srcElement?g=$(c.srcElement):c.target&&(g=$(c.target)),d=g.attr("data-toolid"),e=g.attr("data-formstyle"),f=g.attr("data-version"),"upload1"===d)Galaxy.upload.show();else if("regular"===e){var h=new a.View({id:d,version:f});h.deferred.execute(function(){Galaxy.app.display(h)})}else"special"===e&&(document.location=g.attr("href"))},makeCustomSearchSection:function(a){var c="",d=$(".search-results"),e=($("."+a.link_class_name),this),f="",g="galaxy_main",h="";a.link_class_name.indexOf("history")>-1?h="history":a.link_class_name.indexOf("datalib")>-1&&(h="data library"),d.find("."+a.class_name.split(" ")[1]).remove(),d.find("."+a.link_class_name).remove(),b.each(a.data,function(b){e.checkItemPinned(b.id)||("history"===h?f="/datasets/"+b.id+"/display/?preview=True":"data library"===h&&(f=Galaxy.root+"library/list#folders/"+b.root_folder_id),c+=e._buildLinkTemplate(b.id,f,b.name,b.description,g,a.link_class_name))}),"all"===e.getActiveFilter()&&d.append(e._buildHeaderTemplate(a.id,a.name,a.class_name)),d.append(c),d.find("."+a.link_class_name).css("margin-top","0.5%"),d.find("."+a.link_class_name).click(function(){e.removeOverlay()}),$el_pin_item=$("."+a.link_class_name).find("i.pin-item"),$el_remove_item=$("."+a.link_class_name).find("i.remove-item"),e.makePinRemoveItems($el_pin_item,$el_remove_item,e)},buildPinnedLinks:function(){var a=this,b={},c="",d=window.Galaxy.user.id+"_search_pref";if(window.Galaxy.user.id&&localStorage.getItem(d)){var e=localStorage.getItem(d),f=$(".pinned-results");b=JSON.parse(e).pinned_results;for(item in b)c+=b[item];f.html(""),f.html(c),f.find(".pin-item").remove(),a.registerToolLinkClick(a,f),a.registerCustomPinnedLinkClicks(a,f)}},removeFromDataStorage:function(a,b){var c="",d={},e=($(".pinned-results"),""),f=b[0].outerHTML;e=$(f).attr("class").split(" ")[3],window.Galaxy.user.id&&(c=window.Galaxy.user.id+"_search_pref",localStorage.getItem(c)&&(d=JSON.parse(localStorage.getItem(c)),d.pinned_results&&(delete d.pinned_results[e],localStorage.setItem(c,JSON.stringify(d)))))},setDataStorage:function(a,b){var c="",d={},e=$(".pinned-results"),f="";f=$(b).attr("class").split(" ")[3],window.Galaxy.user.id?(c=window.Galaxy.user.id+"_search_pref",localStorage.getItem(c)?(d=JSON.parse(localStorage.getItem(c)),d.pinned_results?d.pinned_results[f]=b:(d.pinned_results={},d.pinned_results[f]=b)):(d.pinned_results={},d.pinned_results[f]=b),localStorage.setItem(c,JSON.stringify(d)),e.append(b),e.find(".pin-item").remove(),a.registerToolLinkClick(a,e),a.registerCustomPinnedLinkClicks(a,e)):c="search_pref"},pinLink:function(a,b){a.setDataStorage(a,b[0].outerHTML)},_buildLinkTemplate:function(a,b,c,d,e,f,g,h,i){var j="";return j="<a class='"+f+" btn btn-primary "+a+"' href='"+b+"' role='button' title='"+c+" "+(d?d:"")+"' target='"+e,f.indexOf("tool")>-1&&(j=j+"' data-version='"+g+"' minsizehint='"+h+"' data-formstyle='"+i+"' data-toolid='"+a),j=j+"' >"+c+"<i class='fa fa-paperclip pin-item' aria-hidden='true' title='Pin it to top'></i><i class='fa fa-times remove-item' aria-hidden='true' title='Remove it from search result'></i></a>"},_buildHeaderTemplate:function(a,b,c){return"<div class='"+c+"' data-id='searched_"+a+"' >"+b+"</div>"},_templateNoResults:function(){return'<div class="no-results">No results for this query</div>'},removeOverlay:function(){var a=$(".search-screen"),b=$(".search-screen-overlay");b.css("display","none"),a.css("display","none")}});return{SearchOverlay:c,SearchItems:d}});
//# sourceMappingURL=../../maps/layout/generic-search.js.map