define("mvc/history/history-list",["exports","utils/utils","mvc/grid/grid-view","mvc/history/history-model","mvc/history/copy-dialog"],function(t,e,i,o,n){"use strict";function a(t){return t&&t.__esModule?t:{default:t}}Object.defineProperty(t,"__esModule",{value:!0});var r=a(e),l=a(i),d=a(o),s=a(n),c=Backbone.View.extend({title:"Histories",initialize:function(t){var e=this;this.setElement($("<div/>")),this.model=new Backbone.Model,r.default.get({url:Galaxy.root+"history/"+t.action_id+"?"+$.param(Galaxy.params),success:function(t){t.dict_format=!0,_.each(t.operations,function(t){"Copy"==t.label&&(t.onclick=function(t){e._showCopyDialog(t)})}),e.model.set(t),e.render()}})},render:function(){var t=new l.default(this.model.attributes);this.$el.empty().append(t.$el)},_showCopyDialog:function(t){var e=new d.default.History({id:t});e.fetch().fail(function(){alert("History could not be fetched. Please contact an administrator")}).done(function(){(0,s.default)(e,{}).done(function(){window.parent&&window.parent.Galaxy&&window.parent.Galaxy.currHistoryPanel&&window.parent.Galaxy.currHistoryPanel.loadCurrentHistory(),window.location.reload(!0)})})}});t.default={View:c}});