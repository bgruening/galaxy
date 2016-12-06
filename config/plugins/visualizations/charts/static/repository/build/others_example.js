define(function(){return function(t){function e(r){if(a[r])return a[r].exports;var n=a[r]={exports:{},id:r,loaded:!1};return t[r].call(n.exports,n,n.exports,e),n.loaded=!0,n.exports}var a={};return e.m=t,e.c=a,e.p="",e(0)}([function(t,e,a){var r,n;r=[a(4),a(5)],n=function(t,e){return Backbone.View.extend({initialize:function(t){var a=t.chart;e.request({dataset_id:a.get("dataset_id"),dataset_groups:a.groups,success:function(e){var r=d3.scale.category20(),n=null;_.each(e,function(e,a){try{var i=d3.select("#"+(t.targets[a]||t.targets[0])),o=parseInt(i.style("height")),s=parseInt(i.style("width")),u=d3.max(e.values,function(t){return Math.max(t.x,t.y)});i.selectAll("bubbles").data(e.values).enter().append("circle").attr("r",function(t){return 20*Math.abs(t.z)/u}).attr("cy",function(t,e){return o*t.y/u}).attr("cx",function(t){return s*t.x/u}).style("stroke",r(a)).style("fill","white")}catch(c){n=c}}),n?a.state("failed",n):a.state("ok","Workshop chart has been drawn."),t.process.resolve()}})}})}.apply(e,r),!(void 0!==n&&(t.exports=n))},function(t,e,a){var r,n;r=[],n=function(){function t(t){return JSON.parse(JSON.stringify(t)||null)}function e(t){return/^[\],:{}\s]*$/.test(t.replace(/\\["\\\/bfnrtu]/g,"@").replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g,"]").replace(/(?:^|:|,)(?:\s*\[)+/g,""))}function a(t){top.__utils__get__=top.__utils__get__||{};var e=JSON.stringify(t);t.cache&&top.__utils__get__[e]?(t.success&&t.success(top.__utils__get__[e]),window.console.debug("utils.js::get() - Fetching from cache ["+t.url+"].")):r({url:t.url,data:t.data,success:function(a){top.__utils__get__[e]=a,t.success&&t.success(a)},error:function(e){t.error&&t.error(e)}})}function r(t){var a={contentType:"application/json",type:t.type||"GET",data:t.data||{},url:t.url};"GET"==a.type||"DELETE"==a.type?($.isEmptyObject(a.data)||(a.url+=a.url.indexOf("?")==-1?"?":"&",a.url+=$.param(a.data,!0)),a.data=null):(a.dataType="json",a.url=a.url,a.data=JSON.stringify(a.data)),$.ajax(a).done(function(a){if("string"==typeof a&&e(a))try{a=a.replace("Infinity,",'"Infinity",'),a=jQuery.parseJSON(a)}catch(r){console.debug(r)}t.success&&t.success(a)}).fail(function(e){var a=null;try{a=jQuery.parseJSON(e.responseText)}catch(r){a=e.responseText}t.error&&t.error(a,e)}).always(function(){t.complete&&t.complete()})}function n(t,e){return t?_.defaults(t,e):e}function i(){return top.__utils__uid__=top.__utils__uid__||0,"uid-"+top.__utils__uid__++}return{get:a,merge:n,uid:i,request:r,clone:t,isJSON:e}}.apply(e,r),!(void 0!==n&&(t.exports=n))},,,function(t,e,a){var r,n;r=[a(1),a(5)],n=function(t,e){function a(t,e){var a="",r="",n=0;for(key in t.settings.attributes){var i=t.settings.get(key);_.each([[" ","&#32;"],[",","&#44;"],[":","&#58;"]],function(t){i=i.replace(new RegExp(t[0],"g"),t[1])}),a+=key+":"+i+", "}return a=a.substring(0,a.length-2),t.groups.each(function(t){n++,_.each(t.get("__data_columns"),function(e,a){r+=a+"_"+n+":"+(parseInt(t.get(a))+1)+", "})}),r=r.substring(0,r.length-2),{tool_id:"charts",inputs:{input:{id:t.get("dataset_id"),src:"hda"},module:e,columns:r,settings:a}}}function r(t){var a=t.process,r=t.chart,n=t.render,i=t.targets,o=t.dataset_id||t.chart.get("dataset_id"),s=t.dataset_groups||t.chart.groups;e.request({chart:r,dataset_id:o,dataset_groups:s,success:function(t){try{if(i.length==t.length){var e=!0;for(var o in t){var s=t[o];if(!n(i[o],[s])){e=!1;break}}e&&r.state("ok","Multi-panel chart drawn.")}else 1==i.length?n(i[0],t)&&r.state("ok","Chart drawn."):r.state("failed","Invalid panel count.");a.resolve()}catch(u){console.debug("FAILED: tabular-utilities::panelHelper() - "+u),r.state("failed",u),a.reject()}}})}function n(t,e){function a(e,a){var r=void 0;for(var n in t){var i=d3[e](t[n].values,function(t){return t[a]});r=void 0===r?i:Math[e](r,i)}return r}var r={};for(var n in e){var i=e[n];r[i]={min:a("min",i),max:a("max",i)}}return r}function i(t,e){var a=[];for(var r in t){var n=t[r],i=[];for(var o in n.values){var s=[];if(e)for(var u in e){var c=e[u];s.push(n.values[o][c])}else for(var c in n.values[o])s.push(n.values[o][c]);i.push(s)}a.push(i)}return a}function o(t,e){var a={},r=t[0].__data_columns;return _.each(e,function(t){r[t].is_label&&(a[t]=[])}),t&&t[0]&&_.each(t[0].values,function(t){for(var e in a)a[e].push(String(t[e]))}),s(a,t),{array:a}}function s(t,e){_.each(e,function(e){_.each(e.values,function(e,a){for(var r in t)e[r]=parseInt(a)})})}function u(t,e){var a={},r={},n={},i=t[0].__data_columns;_.each(i,function(t,e){t.is_label&&(a[e]={},r[e]=[],n[e]=0)});for(var o in t){var s=t[o];for(var u in s.values){var c=s.values[u];for(var l in a){var f=String(c[l]);void 0===a[l][f]&&(a[l][f]=n[l],r[l].push(e?[n[l],f]:f),n[l]++)}}}for(var o in t){var s=t[o];for(var u in s.values){var c=s.values[u];for(var l in a){var f=String(c[l]);c[l]=a[l][f]}}}return{categories:a,array:r,counter:n}}function c(t){var e=t.type,a=t.precision,r=t.categories,n=t.formatter;if("hide"==e)n(function(){return""});else if("auto"==e)r&&n(function(t){return r[t]||""});else{var i=function(t){switch(e){case"s":var r=d3.formatPrefix(t);return r.scale(t).toFixed()+r.symbol;default:return d3.format("."+a+e)(t)}};n(r?function(t){var e=r[t];if(!e)return"";if(isNaN(e))return e;try{return i(e)}catch(a){return e}}:function(t){return i(t)})}}function l(t){function e(t,e){return t[0]=Math.min(Math.max(t[0],e[0]),e[1]-e[1]/n),t[1]=Math.max(e[0]+e[1]/n,Math.min(t[1],e[1])),t}function a(){u(e(d.domain(),_)),s(e(f.domain(),v)),c()}function r(){s(v),u(_),c(),p.scale(1),p.translate([0,0])}var n=100,i=t.yAxis,o=t.xAxis,s=t.xDomain||o.scale().domain,u=t.yDomain||i.scale().domain,c=t.redraw,l=t.svg,f=o.scale(),d=i.scale(),v=f.domain().slice(),_=d.domain().slice(),p=d3.behavior.zoom();return f.nice(),d.nice(),p.x(f).y(d).scaleExtent([1,n]).on("zoom",a),l.call(p).on("dblclick.zoom",r),p}return{buildJobDictionary:a,panelHelper:r,makeCategories:o,makeUniqueCategories:u,makeSeries:i,getDomains:n,mapCategories:s,makeTickFormat:c,addZoom:l}}.apply(e,r),!(void 0!==n&&(t.exports=n))},function(t,e,a){var r,n;r=[a(1)],n=function(t){var e={},a=function(a){var i=a.dataset_groups,o=a.dataset_id,s=[];return i.each(function(t){_.each(t.get("__data_columns"),function(a,r){var i=t.get(r),u=n(o,i);s.indexOf(i)!==-1||e[u]||"auto"==i||"zero"==i||void 0===i||s.push(i)})}),0==s.length?void r(a):void t.get({url:Galaxy.root+"api/datasets/"+o,data:{data_type:"raw_data",provider:"dataset-column",indeces:s.toString()},success:function(t){for(var i=new Array(s.length),u=0;u<i.length;u++)i[u]=[];for(var u in t.data){var c=t.data[u];for(var l in c){var f=c[l];void 0!==f&&2147483647!=f&&i[l].push(f)}}console.debug("tabular-datasets::_fetch() - Fetching complete.");for(var u in i){var d=s[u],v=n(o,d);e[v]=i[u]}r(a)}})},r=function(a){var r=a.dataset_groups,i=a.dataset_id;console.debug("tabular-datasets::_fillFromCache() - Filling request from cache.");var o=0;r.each(function(t){_.each(t.get("__data_columns"),function(a,r){var s=t.get(r),u=n(i,s),c=e[u];c&&(o=Math.max(o,c.length))})}),0==o&&console.debug("tabular-datasets::_fillFromCache() - No data available.");var s=[];r.each(function(e,a){for(var r=t.merge({key:a+":"+e.get("key"),values:[]},e.attributes),n=0;n<o;n++)r.values[n]={x:parseInt(n)};s.push(r)}),r.each(function(t,a){var r=s[a].values;_.each(t.get("__data_columns"),function(a,s){var u=t.get(s);switch(u){case"auto":for(var c=0;c<o;c++)r[c][s]=parseInt(c);break;case"zero":for(var c=0;c<o;c++)r[c][s]=0;break;default:for(var l=n(i,u),f=e[l],c=0;c<o;c++){var d=r[c],v=f[c];isNaN(v)&&!a.is_label&&(v=0),d[s]=v}}})}),a.success(s)},n=function(t,e){return t+"__"+e};return{request:a}}.apply(e,r),!(void 0!==n&&(t.exports=n))}])});
//# sourceMappingURL=others_example.js.map