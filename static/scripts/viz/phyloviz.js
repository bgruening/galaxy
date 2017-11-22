define("viz/phyloviz",["exports","libs/d3","viz/visualization","mvc/dataset/data","mvc/ui/icon-button"],function(e,t,n,i,o){"use strict";function a(e){return e&&e.__esModule?e:{default:e}}function l(){function e(t,n,i,o){var a=t.children,r=0,h=t.dist||c;return h=h>1?1:h,t.dist=h,t.y0=null!==o?o.y0+h*l:d,a?(a.forEach(function(o){o.parent=t,r+=e(o,n,i,t)}),t.x0=r/a.length):(t.x0=s*i,s+=1),t.x=t.x0,t.y=t.y0,t.x0}var t=this,n=r.layout.hierarchy().sort(null).value(null),i=360,o="Linear",a=18,l=200,s=0,c=.5,d=50;return t.leafHeight=function(e){return void 0===e?a:(a=e,t)},t.layoutMode=function(e){return void 0===e?o:(o=e,t)},t.layoutAngle=function(e){return void 0===e?i:isNaN(e)||e<0||e>360?t:(i=e,t)},t.separation=function(e){return void 0===e?l:(l=e,t)},t.links=function(e){return r.layout.tree().links(e)},t.nodes=function(l,r){"[object Array]"===toString.call(l)&&(l=l[0]);var c=n.call(t,l,r),d=[],h=0,u=0;return window._d=l,window._nodes=c,c.forEach(function(e){h=e.depth>h?e.depth:h,d.push(e)}),d.forEach(function(e){e.children||(u+=1,e.depth=h)}),a="Circular"===o?i/u:a,s=0,e(d[0],h,a,null),d},t}Object.defineProperty(e,"__esModule",{value:!0});var r=function(e){if(e&&e.__esModule)return e;var t={};if(null!=e)for(var n in e)Object.prototype.hasOwnProperty.call(e,n)&&(t[n]=e[n]);return t.default=e,t}(t),s=a(n),c=a(i),d=a(o),h=Backbone.View.extend({className:"UserMenuBase",isAcceptableValue:function(e,t,n){var i=e.val(),o=e.attr("displayLabel")||e.attr("id").replace("phyloViz","");return function(e){return!isNaN(parseFloat(e))&&isFinite(e)}(i)?i>n?(alert(o+" is too large."),!1):!(i<t)||(alert(o+" is too small."),!1):(alert(o+" is not a number!"),!1)},hasIllegalJsonCharacters:function(e){return-1!==e.val().search(/"|'|\\/)&&(alert("Named fields cannot contain these illegal characters: double quote(\"), single guote('), or back slash(\\). "),!0)}}),u=s.default.Visualization.extend({defaults:{layout:"Linear",separation:250,leafHeight:18,type:"phyloviz",title:"Title",scaleFactor:1,translate:[0,0],fontSize:12,selectedNode:null,nodeAttrChangedTime:0},initialize:function(e){this.set("dataset",new c.default.Dataset({id:e.dataset_id}))},root:{},toggle:function(e){void 0!==e&&(e.children?(e._children=e.children,e.children=null):(e.children=e._children,e._children=null))},toggleAll:function(e){e.children&&0!==e.children.length&&(e.children.forEach(this.toggleAll),toggle(e))},getData:function(){return this.root},save:function(){function e(t){delete t.parent,t._selected&&delete t._selected,t.children&&t.children.forEach(e),t._children&&t._children.forEach(e)}e(this.root);var t=jQuery.extend(!0,{},this.attributes);return t.selectedNode=null,show_message("Saving to Galaxy","progress"),$.ajax({url:this.url(),type:"POST",dataType:"json",data:{config:JSON.stringify(t),type:"phyloviz"},success:function(e){hide_modal()}})}}),f=Backbone.View.extend({defaults:{nodeRadius:4.5},stdInit:function(e){var t=this;t.model.on("change:separation change:leafHeight change:fontSize change:nodeAttrChangedTime",t.updateAndRender,t),t.vis=e.vis,t.i=0,t.maxDepth=-1,t.width=e.width,t.height=e.height},updateAndRender:function(e){r.select(".vis");var t=this;e=e||t.model.root,t.renderNodes(e),t.renderLinks(e),t.addTooltips()},renderLinks:function(e){var t=this,n=(t.diagonal,t.duration,t.layoutMode,t.vis.selectAll("g.completeLink").data(t.tree.links(t.nodes),function(e){return e.target.id})),i=function(e){e.pos0=e.source.y0+" "+e.source.x0,e.pos1=e.source.y0+" "+e.target.x0,e.pos2=e.target.y0+" "+e.target.x0};n.enter().insert("svg:g","g.node").attr("class","completeLink").append("svg:path").attr("class","link").attr("d",function(e){return i(e),"M "+e.pos0+" L "+e.pos1}),n.transition().duration(500).select("path.link").attr("d",function(e){return i(e),"M "+e.pos0+" L "+e.pos1+" L "+e.pos2});n.exit().remove()},selectNode:function(e){var t=this;r.selectAll("g.node").classed("selectedHighlight",function(t){return e.id===t.id&&(e._selected?(delete e._selected,!1):(e._selected=!0,!0))}),t.model.set("selectedNode",e),$("#phyloVizSelectedNodeName").val(e.name),$("#phyloVizSelectedNodeDist").val(e.dist),$("#phyloVizSelectedNodeAnnotation").val(e.annotation||"")},addTooltips:function(){$(".tooltip").remove(),$(".node").attr("data-original-title",function(){var e=this.__data__,t=e.annotation||"None";return e?(e.name?e.name+"<br/>":"")+"Dist: "+e.dist+" <br/>Annotation1: "+t+(e.bootstrap?"<br/>Confidence level: "+Math.round(100*e.bootstrap):""):""}).tooltip({placement:"top",trigger:"hover"})}}).extend({initialize:function(e){var t=this;t.margins=e.margins,t.layoutMode="Linear",t.stdInit(e),t.layout(),t.updateAndRender(t.model.root)},layout:function(){var e=this;e.tree=(new l).layoutMode("Linear"),e.diagonal=r.svg.diagonal().projection(function(e){return[e.y,e.x]})},renderNodes:function(e){var t=this,n=t.model.get("fontSize")+"px";t.tree.separation(t.model.get("separation")).leafHeight(t.model.get("leafHeight"));var i=t.tree.separation(t.model.get("separation")).nodes(t.model.root),o=t.vis.selectAll("g.node").data(i,function(e){return e.name+e.id||(e.id=++t.i)});t.nodes=i,t.duration=500;var a=o.enter().append("svg:g").attr("class","node").on("dblclick",function(){r.event.stopPropagation()}).on("click",function(e){if(r.event.altKey)t.selectNode(e);else{if(e.children&&0===e.children.length)return;t.model.toggle(e),t.updateAndRender(e)}});"[object Array]"===toString.call(e)&&(e=e[0]),a.attr("transform",function(t){return"translate("+e.y0+","+e.x0+")"}),a.append("svg:circle").attr("r",1e-6).style("fill",function(e){return e._children?"lightsteelblue":"#fff"}),a.append("svg:text").attr("class","nodeLabel").attr("x",function(e){return e.children||e._children?-10:10}).attr("dy",".35em").attr("text-anchor",function(e){return e.children||e._children?"end":"start"}).style("fill-opacity",1e-6);var l=o.transition().duration(500);l.attr("transform",function(e){return"translate("+e.y+","+e.x+")"}),l.select("circle").attr("r",t.defaults.nodeRadius).style("fill",function(e){return e._children?"lightsteelblue":"#fff"}),l.select("text").style("fill-opacity",1).style("font-size",n).text(function(e){return e.name&&""!==e.name?e.name:e.bootstrap?Math.round(100*e.bootstrap):""});var s=o.exit().transition().duration(500).remove();s.select("circle").attr("r",1e-6),s.select("text").style("fill-opacity",1e-6),i.forEach(function(e){e.x0=e.x,e.y0=e.y})}}),p=Backbone.View.extend({className:"phyloviz",initialize:function(e){var t=this;t.MIN_SCALE=.05,t.MAX_SCALE=5,t.MAX_DISPLACEMENT=500,t.margins=[10,60,10,80],t.width=$("#PhyloViz").width(),t.height=$("#PhyloViz").height(),t.radius=t.width,t.data=e.data,$(window).resize(function(){t.width=$("#PhyloViz").width(),t.height=$("#PhyloViz").height(),t.render()}),t.phyloTree=new u(e.config),t.phyloTree.root=t.data,t.zoomFunc=r.behavior.zoom().scaleExtent([t.MIN_SCALE,t.MAX_SCALE]),t.zoomFunc.translate(t.phyloTree.get("translate")),t.zoomFunc.scale(t.phyloTree.get("scaleFactor")),t.navMenu=new g(t),t.settingsMenu=new v({phyloTree:t.phyloTree}),t.nodeSelectionView=new y({phyloTree:t.phyloTree}),t.search=new m,setTimeout(function(){t.zoomAndPan()},1e3)},render:function(){var e=this;$("#PhyloViz").empty(),e.mainSVG=r.select("#PhyloViz").append("svg:svg").attr("width",e.width).attr("height",e.height).attr("pointer-events","all").call(e.zoomFunc.on("zoom",function(){e.zoomAndPan()})),e.boundingRect=e.mainSVG.append("svg:rect").attr("class","boundingRect").attr("width",e.width).attr("height",e.height).attr("stroke","black").attr("fill","white"),e.vis=e.mainSVG.append("svg:g").attr("class","vis"),e.layoutOptions={model:e.phyloTree,width:e.width,height:e.height,vis:e.vis,margins:e.margins},$("#title").text("Phylogenetic Tree from "+e.phyloTree.get("title")+":");new f(e.layoutOptions)},zoomAndPan:function(e){var t,n;void 0!==e&&(t=e.zoom,n=e.translate);var i=this,o=i.zoomFunc.scale(),a=i.zoomFunc.translate(),l="",s="";switch(t){case"reset":o=1,a=[0,0];break;case"+":o*=1.1;break;case"-":o*=.9;break;default:"number"==typeof t?o=t:null!==r.event&&(o=r.event.scale)}if(!(o<i.MIN_SCALE||o>i.MAX_SCALE)){if(i.zoomFunc.scale(o),l="translate("+i.margins[3]+","+i.margins[0]+") scale("+o+")",null!==r.event)s="translate("+r.event.translate+")";else{if(void 0!==n){var c=n.split(",")[0],d=n.split(",")[1];isNaN(c)||isNaN(d)||(a=[a[0]+parseFloat(c),a[1]+parseFloat(d)])}i.zoomFunc.translate(a),s="translate("+a+")"}i.phyloTree.set("scaleFactor",o),i.phyloTree.set("translate",a),i.vis.attr("transform",s+l)}},reloadViz:function(){var e=this,t=$("#phylovizNexSelector :selected").val();$.getJSON(e.phyloTree.get("dataset").url(),{tree_index:t,data_type:"raw_data"},function(t){e.data=t.data,e.config=t,e.render()})}}),g=Backbone.View.extend({initialize:function(e){var t=this;t.phylovizView=e,$("#panelHeaderRightBtns").empty(),$("#phyloVizNavBtns").empty(),$("#phylovizNexSelector").off(),t.initNavBtns(),t.initRightHeaderBtns(),$("#phylovizNexSelector").off().on("change",function(){t.phylovizView.reloadViz()})},initRightHeaderBtns:function(){var e=this,t=d.default.create_icon_buttons_menu([{icon_class:"gear",title:"PhyloViz Settings",on_click:function(){$("#SettingsMenu").show(),e.settingsMenu.updateUI()}},{icon_class:"disk",title:"Save visualization",on_click:function(){var t=$("#phylovizNexSelector option:selected").text();t&&e.phylovizView.phyloTree.set("title",t),e.phylovizView.phyloTree.save()}},{icon_class:"chevron-expand",title:"Search / Edit Nodes",on_click:function(){$("#nodeSelectionView").show()}},{icon_class:"information",title:"Phyloviz Help",on_click:function(){window.open("https://galaxyproject.org/learn/visualization/phylogenetic-tree/")}}],{tooltip_config:{placement:"bottom"}});$("#panelHeaderRightBtns").append(t.$el)},initNavBtns:function(){var e=this,t=d.default.create_icon_buttons_menu([{icon_class:"zoom-in",title:"Zoom in",on_click:function(){e.phylovizView.zoomAndPan({zoom:"+"})}},{icon_class:"zoom-out",title:"Zoom out",on_click:function(){e.phylovizView.zoomAndPan({zoom:"-"})}},{icon_class:"arrow-circle",title:"Reset Zoom/Pan",on_click:function(){e.phylovizView.zoomAndPan({zoom:"reset"})}}],{tooltip_config:{placement:"bottom"}});$("#phyloVizNavBtns").append(t.$el)}}),v=h.extend({className:"Settings",initialize:function(e){var t=this;t.phyloTree=e.phyloTree,t.el=$("#SettingsMenu"),t.inputs={separation:$("#phyloVizTreeSeparation"),leafHeight:$("#phyloVizTreeLeafHeight"),fontSize:$("#phyloVizTreeFontSize")},$("#settingsCloseBtn").off().on("click",function(){t.el.hide()}),$("#phylovizResetSettingsBtn").off().on("click",function(){t.resetToDefaults()}),$("#phylovizApplySettingsBtn").off().on("click",function(){t.apply()})},apply:function(){var e=this;e.isAcceptableValue(e.inputs.separation,50,2500)&&e.isAcceptableValue(e.inputs.leafHeight,5,30)&&e.isAcceptableValue(e.inputs.fontSize,5,20)&&$.each(e.inputs,function(t,n){e.phyloTree.set(t,n.val())})},updateUI:function(){var e=this;$.each(e.inputs,function(t,n){n.val(e.phyloTree.get(t))})},resetToDefaults:function(){$(".tooltip").remove();var e=this;$.each(e.phyloTree.defaults,function(t,n){e.phyloTree.set(t,n)}),e.updateUI()},render:function(){}}),y=h.extend({className:"Settings",initialize:function(e){var t=this;t.el=$("#nodeSelectionView"),t.phyloTree=e.phyloTree,t.UI={enableEdit:$("#phylovizEditNodesCheck"),saveChanges:$("#phylovizNodeSaveChanges"),cancelChanges:$("#phylovizNodeCancelChanges"),name:$("#phyloVizSelectedNodeName"),dist:$("#phyloVizSelectedNodeDist"),annotation:$("#phyloVizSelectedNodeAnnotation")},t.valuesOfConcern={name:null,dist:null,annotation:null},$("#nodeSelCloseBtn").off().on("click",function(){t.el.hide()}),t.UI.saveChanges.off().on("click",function(){t.updateNodes()}),t.UI.cancelChanges.off().on("click",function(){t.cancelChanges()}),function(e){e.fn.enable=function(t){return e(this).each(function(){t?e(this).removeAttr("disabled"):e(this).attr("disabled","disabled")})}}(jQuery),t.UI.enableEdit.off().on("click",function(){t.toggleUI()})},toggleUI:function(){var e=this,t=e.UI.enableEdit.is(":checked");t||e.cancelChanges(),$.each(e.valuesOfConcern,function(n,i){e.UI[n].enable(t)}),t?(e.UI.saveChanges.show(),e.UI.cancelChanges.show()):(e.UI.saveChanges.hide(),e.UI.cancelChanges.hide())},cancelChanges:function(){var e=this,t=e.phyloTree.get("selectedNode");t&&$.each(e.valuesOfConcern,function(n,i){e.UI[n].val(t[n])})},updateNodes:function(){var e=this,t=e.phyloTree.get("selectedNode");if(t){if(!e.isAcceptableValue(e.UI.dist,0,1)||e.hasIllegalJsonCharacters(e.UI.name)||e.hasIllegalJsonCharacters(e.UI.annotation))return;$.each(e.valuesOfConcern,function(n,i){t[n]=e.UI[n].val()}),e.phyloTree.set("nodeAttrChangedTime",new Date)}else alert("No node selected")}}),m=h.extend({initialize:function(){var e=this;$("#phyloVizSearchBtn").on("click",function(){var t=$("#phyloVizSearchTerm"),n=$("#phyloVizSearchCondition").val().split("-"),i=n[0],o=n[1];e.hasIllegalJsonCharacters(t),"dist"===i&&e.isAcceptableValue(t,0,1),e.searchTree(i,o,t.val())})},searchTree:function(e,t,n){r.selectAll("g.node").classed("searchHighlight",function(i){var o=i[e];if(void 0!==o&&null!==o)if("dist"===e)switch(t){case"greaterEqual":return o>=+n;case"lesserEqual":return o<=+n;default:return}else if("name"===e||"annotation"===e)return-1!==o.toLowerCase().indexOf(n.toLowerCase())})}});e.default={PhylovizView:p}});