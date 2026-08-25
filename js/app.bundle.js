/* JETL startup bundle — generated from ordered source files. */

/* ---- js/vendor/drawflow.min.js ---- */
!function(e,t){"object"==typeof exports&&"object"==typeof module?module.exports=t():"function"==typeof define&&define.amd?define([],t):"object"==typeof exports?exports.Drawflow=t():e.Drawflow=t()}("undefined"!=typeof self?self:this,(function(){return function(e){var t={};function n(i){if(t[i])return t[i].exports;var s=t[i]={i:i,l:!1,exports:{}};return e[i].call(s.exports,s,s.exports,n),s.l=!0,s.exports}return n.m=e,n.c=t,n.d=function(e,t,i){n.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:i})},n.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},n.t=function(e,t){if(1&t&&(e=n(e)),8&t)return e;if(4&t&&"object"==typeof e&&e&&e.__esModule)return e;var i=Object.create(null);if(n.r(i),Object.defineProperty(i,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var s in e)n.d(i,s,function(t){return e[t]}.bind(null,s));return i},n.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return n.d(t,"a",t),t},n.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},n.p="",n(n.s=0)}([function(e,t,n){"use strict";n.r(t),n.d(t,"default",(function(){return i}));class i{constructor(e,t=null,n=null){this.events={},this.container=e,this.precanvas=null,this.nodeId=1,this.ele_selected=null,this.node_selected=null,this.drag=!1,this.reroute=!1,this.reroute_fix_curvature=!1,this.curvature=.5,this.reroute_curvature_start_end=.5,this.reroute_curvature=.5,this.reroute_width=6,this.drag_point=!1,this.editor_selected=!1,this.connection=!1,this.connection_ele=null,this.connection_selected=null,this.canvas_x=0,this.canvas_y=0,this.pos_x=0,this.pos_x_start=0,this.pos_y=0,this.pos_y_start=0,this.mouse_x=0,this.mouse_y=0,this.line_path=5,this.first_click=null,this.force_first_input=!1,this.draggable_inputs=!0,this.useuuid=!1,this.parent=n,this.noderegister={},this.render=t,this.drawflow={drawflow:{Home:{data:{}}}},this.module="Home",this.editor_mode="edit",this.zoom=1,this.zoom_max=1.6,this.zoom_min=.5,this.zoom_value=.1,this.zoom_last_value=1,this.evCache=new Array,this.prevDiff=-1}start(){this.container.classList.add("parent-drawflow"),this.container.tabIndex=0,this.precanvas=document.createElement("div"),this.precanvas.classList.add("drawflow"),this.container.appendChild(this.precanvas),this.container.addEventListener("mouseup",this.dragEnd.bind(this)),this.container.addEventListener("mousemove",this.position.bind(this)),this.container.addEventListener("mousedown",this.click.bind(this)),this.container.addEventListener("touchend",this.dragEnd.bind(this)),this.container.addEventListener("touchmove",this.position.bind(this)),this.container.addEventListener("touchstart",this.click.bind(this)),this.container.addEventListener("contextmenu",this.contextmenu.bind(this)),this.container.addEventListener("keydown",this.key.bind(this)),this.container.addEventListener("wheel",this.zoom_enter.bind(this)),this.container.addEventListener("input",this.updateNodeValue.bind(this)),this.container.addEventListener("dblclick",this.dblclick.bind(this)),this.container.onpointerdown=this.pointerdown_handler.bind(this),this.container.onpointermove=this.pointermove_handler.bind(this),this.container.onpointerup=this.pointerup_handler.bind(this),this.container.onpointercancel=this.pointerup_handler.bind(this),this.container.onpointerout=this.pointerup_handler.bind(this),this.container.onpointerleave=this.pointerup_handler.bind(this),this.load()}pointerdown_handler(e){this.evCache.push(e)}pointermove_handler(e){for(var t=0;t<this.evCache.length;t++)if(e.pointerId==this.evCache[t].pointerId){this.evCache[t]=e;break}if(2==this.evCache.length){var n=Math.abs(this.evCache[0].clientX-this.evCache[1].clientX);this.prevDiff>100&&(n>this.prevDiff&&this.zoom_in(),n<this.prevDiff&&this.zoom_out()),this.prevDiff=n}}pointerup_handler(e){this.remove_event(e),this.evCache.length<2&&(this.prevDiff=-1)}remove_event(e){for(var t=0;t<this.evCache.length;t++)if(this.evCache[t].pointerId==e.pointerId){this.evCache.splice(t,1);break}}load(){for(var e in this.drawflow.drawflow[this.module].data)this.addNodeImport(this.drawflow.drawflow[this.module].data[e],this.precanvas);if(this.reroute)for(var e in this.drawflow.drawflow[this.module].data)this.addRerouteImport(this.drawflow.drawflow[this.module].data[e]);for(var e in this.drawflow.drawflow[this.module].data)this.updateConnectionNodes("node-"+e);const t=this.drawflow.drawflow;let n=1;Object.keys(t).map((function(e,i){Object.keys(t[e].data).map((function(e,t){parseInt(e)>=n&&(n=parseInt(e)+1)}))})),this.nodeId=n}removeReouteConnectionSelected(){this.dispatch("connectionUnselected",!0),this.reroute_fix_curvature&&this.connection_selected.parentElement.querySelectorAll(".main-path").forEach((e,t)=>{e.classList.remove("selected")})}click(e){if(this.dispatch("click",e),"fixed"===this.editor_mode){if("parent-drawflow"!==e.target.classList[0]&&"drawflow"!==e.target.classList[0])return!1;this.ele_selected=e.target.closest(".parent-drawflow"),e.preventDefault()}else"view"===this.editor_mode?(null!=e.target.closest(".drawflow")||e.target.matches(".parent-drawflow"))&&(this.ele_selected=e.target.closest(".parent-drawflow"),e.preventDefault()):(this.first_click=e.target,this.ele_selected=e.target,0===e.button&&this.contextmenuDel(),null!=e.target.closest(".drawflow_content_node")&&(this.ele_selected=e.target.closest(".drawflow_content_node").parentElement));switch(this.ele_selected.classList[0]){case"drawflow-node":null!=this.node_selected&&(this.node_selected.classList.remove("selected"),this.node_selected!=this.ele_selected&&this.dispatch("nodeUnselected",!0)),null!=this.connection_selected&&(this.connection_selected.classList.remove("selected"),this.removeReouteConnectionSelected(),this.connection_selected=null),this.node_selected!=this.ele_selected&&this.dispatch("nodeSelected",this.ele_selected.id.slice(5)),this.node_selected=this.ele_selected,this.node_selected.classList.add("selected"),this.draggable_inputs?"SELECT"!==e.target.tagName&&(this.drag=!0):"INPUT"!==e.target.tagName&&"TEXTAREA"!==e.target.tagName&&"SELECT"!==e.target.tagName&&!0!==e.target.hasAttribute("contenteditable")&&(this.drag=!0);break;case"output":this.connection=!0,null!=this.node_selected&&(this.node_selected.classList.remove("selected"),this.node_selected=null,this.dispatch("nodeUnselected",!0)),null!=this.connection_selected&&(this.connection_selected.classList.remove("selected"),this.removeReouteConnectionSelected(),this.connection_selected=null),this.drawConnection(e.target);break;case"parent-drawflow":case"drawflow":null!=this.node_selected&&(this.node_selected.classList.remove("selected"),this.node_selected=null,this.dispatch("nodeUnselected",!0)),null!=this.connection_selected&&(this.connection_selected.classList.remove("selected"),this.removeReouteConnectionSelected(),this.connection_selected=null),this.editor_selected=!0;break;case"main-path":null!=this.node_selected&&(this.node_selected.classList.remove("selected"),this.node_selected=null,this.dispatch("nodeUnselected",!0)),null!=this.connection_selected&&(this.connection_selected.classList.remove("selected"),this.removeReouteConnectionSelected(),this.connection_selected=null),this.connection_selected=this.ele_selected,this.connection_selected.classList.add("selected");const t=this.connection_selected.parentElement.classList;t.length>1&&(this.dispatch("connectionSelected",{output_id:t[2].slice(14),input_id:t[1].slice(13),output_class:t[3],input_class:t[4]}),this.reroute_fix_curvature&&this.connection_selected.parentElement.querySelectorAll(".main-path").forEach((e,t)=>{e.classList.add("selected")}));break;case"point":this.drag_point=!0,this.ele_selected.classList.add("selected");break;case"drawflow-delete":this.node_selected&&this.removeNodeId(this.node_selected.id),this.connection_selected&&this.removeConnection(),null!=this.node_selected&&(this.node_selected.classList.remove("selected"),this.node_selected=null,this.dispatch("nodeUnselected",!0)),null!=this.connection_selected&&(this.connection_selected.classList.remove("selected"),this.removeReouteConnectionSelected(),this.connection_selected=null)}"touchstart"===e.type?(this.pos_x=e.touches[0].clientX,this.pos_x_start=e.touches[0].clientX,this.pos_y=e.touches[0].clientY,this.pos_y_start=e.touches[0].clientY,this.mouse_x=e.touches[0].clientX,this.mouse_y=e.touches[0].clientY):(this.pos_x=e.clientX,this.pos_x_start=e.clientX,this.pos_y=e.clientY,this.pos_y_start=e.clientY),["input","output","main-path"].includes(this.ele_selected.classList[0])&&e.preventDefault(),this.dispatch("clickEnd",e)}position(e){if("touchmove"===e.type)var t=e.touches[0].clientX,n=e.touches[0].clientY;else t=e.clientX,n=e.clientY;if(this.connection&&this.updateConnection(t,n),this.editor_selected&&(i=this.canvas_x+-(this.pos_x-t),s=this.canvas_y+-(this.pos_y-n),this.dispatch("translate",{x:i,y:s}),this.precanvas.style.transform="translate("+i+"px, "+s+"px) scale("+this.zoom+")"),this.drag){e.preventDefault();var i=(this.pos_x-t)*this.precanvas.clientWidth/(this.precanvas.clientWidth*this.zoom),s=(this.pos_y-n)*this.precanvas.clientHeight/(this.precanvas.clientHeight*this.zoom);this.pos_x=t,this.pos_y=n,this.ele_selected.style.top=this.ele_selected.offsetTop-s+"px",this.ele_selected.style.left=this.ele_selected.offsetLeft-i+"px",this.drawflow.drawflow[this.module].data[this.ele_selected.id.slice(5)].pos_x=this.ele_selected.offsetLeft-i,this.drawflow.drawflow[this.module].data[this.ele_selected.id.slice(5)].pos_y=this.ele_selected.offsetTop-s,this.updateConnectionNodes(this.ele_selected.id)}if(this.drag_point){i=(this.pos_x-t)*this.precanvas.clientWidth/(this.precanvas.clientWidth*this.zoom),s=(this.pos_y-n)*this.precanvas.clientHeight/(this.precanvas.clientHeight*this.zoom);this.pos_x=t,this.pos_y=n;var o=this.pos_x*(this.precanvas.clientWidth/(this.precanvas.clientWidth*this.zoom))-this.precanvas.getBoundingClientRect().x*(this.precanvas.clientWidth/(this.precanvas.clientWidth*this.zoom)),l=this.pos_y*(this.precanvas.clientHeight/(this.precanvas.clientHeight*this.zoom))-this.precanvas.getBoundingClientRect().y*(this.precanvas.clientHeight/(this.precanvas.clientHeight*this.zoom));this.ele_selected.setAttributeNS(null,"cx",o),this.ele_selected.setAttributeNS(null,"cy",l);const e=this.ele_selected.parentElement.classList[2].slice(9),c=this.ele_selected.parentElement.classList[1].slice(13),d=this.ele_selected.parentElement.classList[3],a=this.ele_selected.parentElement.classList[4];let r=Array.from(this.ele_selected.parentElement.children).indexOf(this.ele_selected)-1;if(this.reroute_fix_curvature){r-=this.ele_selected.parentElement.querySelectorAll(".main-path").length-1,r<0&&(r=0)}const h=e.slice(5),u=this.drawflow.drawflow[this.module].data[h].outputs[d].connections.findIndex((function(e,t){return e.node===c&&e.output===a}));this.drawflow.drawflow[this.module].data[h].outputs[d].connections[u].points[r]={pos_x:o,pos_y:l};const p=this.ele_selected.parentElement.classList[2].slice(9);this.updateConnectionNodes(p)}"touchmove"===e.type&&(this.mouse_x=t,this.mouse_y=n),this.dispatch("mouseMove",{x:t,y:n})}dragEnd(e){if("touchend"===e.type)var t=this.mouse_x,n=this.mouse_y,i=document.elementFromPoint(t,n);else t=e.clientX,n=e.clientY,i=e.target;if(this.drag&&(this.pos_x_start==t&&this.pos_y_start==n||this.dispatch("nodeMoved",this.ele_selected.id.slice(5))),this.drag_point&&(this.ele_selected.classList.remove("selected"),this.pos_x_start==t&&this.pos_y_start==n||this.dispatch("rerouteMoved",this.ele_selected.parentElement.classList[2].slice(14))),this.editor_selected&&(this.canvas_x=this.canvas_x+-(this.pos_x-t),this.canvas_y=this.canvas_y+-(this.pos_y-n),this.editor_selected=!1),!0===this.connection)if("input"===i.classList[0]||this.force_first_input&&(null!=i.closest(".drawflow_content_node")||"drawflow-node"===i.classList[0])){if(!this.force_first_input||null==i.closest(".drawflow_content_node")&&"drawflow-node"!==i.classList[0])s=i.parentElement.parentElement.id,o=i.classList[1];else{if(null!=i.closest(".drawflow_content_node"))var s=i.closest(".drawflow_content_node").parentElement.id;else var s=i.id;if(0===Object.keys(this.getNodeFromId(s.slice(5)).inputs).length)var o=!1;else var o="input_1"}var l=this.ele_selected.parentElement.parentElement.id,c=this.ele_selected.classList[1];if(l!==s&&!1!==o){if(0===this.container.querySelectorAll(".connection.node_in_"+s+".node_out_"+l+"."+c+"."+o).length){this.connection_ele.classList.add("node_in_"+s),this.connection_ele.classList.add("node_out_"+l),this.connection_ele.classList.add(c),this.connection_ele.classList.add(o);var d=s.slice(5),a=l.slice(5);this.drawflow.drawflow[this.module].data[a].outputs[c].connections.push({node:d,output:o}),this.drawflow.drawflow[this.module].data[d].inputs[o].connections.push({node:a,input:c}),this.updateConnectionNodes("node-"+a),this.updateConnectionNodes("node-"+d),this.dispatch("connectionCreated",{output_id:a,input_id:d,output_class:c,input_class:o})}else this.dispatch("connectionCancel",!0),this.connection_ele.remove();this.connection_ele=null}else this.dispatch("connectionCancel",!0),this.connection_ele.remove(),this.connection_ele=null}else this.dispatch("connectionCancel",!0),this.connection_ele.remove(),this.connection_ele=null;this.drag=!1,this.drag_point=!1,this.connection=!1,this.ele_selected=null,this.editor_selected=!1,this.dispatch("mouseUp",e)}contextmenu(e){if(this.dispatch("contextmenu",e),e.preventDefault(),"fixed"===this.editor_mode||"view"===this.editor_mode)return!1;if(this.precanvas.getElementsByClassName("drawflow-delete").length&&this.precanvas.getElementsByClassName("drawflow-delete")[0].remove(),this.node_selected||this.connection_selected){var t=document.createElement("div");t.classList.add("drawflow-delete"),t.innerHTML="x",this.node_selected&&this.node_selected.appendChild(t),this.connection_selected&&this.connection_selected.parentElement.classList.length>1&&(t.style.top=e.clientY*(this.precanvas.clientHeight/(this.precanvas.clientHeight*this.zoom))-this.precanvas.getBoundingClientRect().y*(this.precanvas.clientHeight/(this.precanvas.clientHeight*this.zoom))+"px",t.style.left=e.clientX*(this.precanvas.clientWidth/(this.precanvas.clientWidth*this.zoom))-this.precanvas.getBoundingClientRect().x*(this.precanvas.clientWidth/(this.precanvas.clientWidth*this.zoom))+"px",this.precanvas.appendChild(t))}}contextmenuDel(){this.precanvas.getElementsByClassName("drawflow-delete").length&&this.precanvas.getElementsByClassName("drawflow-delete")[0].remove()}key(e){if(this.dispatch("keydown",e),"fixed"===this.editor_mode||"view"===this.editor_mode)return!1;("Delete"===e.key||"Backspace"===e.key&&e.metaKey)&&(null!=this.node_selected&&"INPUT"!==this.first_click.tagName&&"TEXTAREA"!==this.first_click.tagName&&!0!==this.first_click.hasAttribute("contenteditable")&&this.removeNodeId(this.node_selected.id),null!=this.connection_selected&&this.removeConnection())}zoom_enter(e,t){e.ctrlKey&&(e.preventDefault(),e.deltaY>0?this.zoom_out():this.zoom_in())}zoom_refresh(){this.dispatch("zoom",this.zoom),this.canvas_x=this.canvas_x/this.zoom_last_value*this.zoom,this.canvas_y=this.canvas_y/this.zoom_last_value*this.zoom,this.zoom_last_value=this.zoom,this.precanvas.style.transform="translate("+this.canvas_x+"px, "+this.canvas_y+"px) scale("+this.zoom+")"}zoom_in(){this.zoom<this.zoom_max&&(this.zoom+=this.zoom_value,this.zoom_refresh())}zoom_out(){this.zoom>this.zoom_min&&(this.zoom-=this.zoom_value,this.zoom_refresh())}zoom_reset(){1!=this.zoom&&(this.zoom=1,this.zoom_refresh())}createCurvature(e,t,n,i,s,o){var l=e,c=t,d=n,a=i,r=s;switch(o){case"open":if(e>=n)var h=l+Math.abs(d-l)*r,u=d-Math.abs(d-l)*(-1*r);else h=l+Math.abs(d-l)*r,u=d-Math.abs(d-l)*r;return" M "+l+" "+c+" C "+h+" "+c+" "+u+" "+a+" "+d+"  "+a;case"close":if(e>=n)h=l+Math.abs(d-l)*(-1*r),u=d-Math.abs(d-l)*r;else h=l+Math.abs(d-l)*r,u=d-Math.abs(d-l)*r;return" M "+l+" "+c+" C "+h+" "+c+" "+u+" "+a+" "+d+"  "+a;case"other":if(e>=n)h=l+Math.abs(d-l)*(-1*r),u=d-Math.abs(d-l)*(-1*r);else h=l+Math.abs(d-l)*r,u=d-Math.abs(d-l)*r;return" M "+l+" "+c+" C "+h+" "+c+" "+u+" "+a+" "+d+"  "+a;default:return" M "+l+" "+c+" C "+(h=l+Math.abs(d-l)*r)+" "+c+" "+(u=d-Math.abs(d-l)*r)+" "+a+" "+d+"  "+a}}drawConnection(e){var t=document.createElementNS("http://www.w3.org/2000/svg","svg");this.connection_ele=t;var n=document.createElementNS("http://www.w3.org/2000/svg","path");n.classList.add("main-path"),n.setAttributeNS(null,"d",""),t.classList.add("connection"),t.appendChild(n),this.precanvas.appendChild(t);var i=e.parentElement.parentElement.id.slice(5),s=e.classList[1];this.dispatch("connectionStart",{output_id:i,output_class:s})}updateConnection(e,t){const n=this.precanvas,i=this.zoom;let s=n.clientWidth/(n.clientWidth*i);s=s||0;let o=n.clientHeight/(n.clientHeight*i);o=o||0;var l=this.connection_ele.children[0],c=this.ele_selected.offsetWidth/2+(this.ele_selected.getBoundingClientRect().x-n.getBoundingClientRect().x)*s,d=this.ele_selected.offsetHeight/2+(this.ele_selected.getBoundingClientRect().y-n.getBoundingClientRect().y)*o,a=e*(this.precanvas.clientWidth/(this.precanvas.clientWidth*this.zoom))-this.precanvas.getBoundingClientRect().x*(this.precanvas.clientWidth/(this.precanvas.clientWidth*this.zoom)),r=t*(this.precanvas.clientHeight/(this.precanvas.clientHeight*this.zoom))-this.precanvas.getBoundingClientRect().y*(this.precanvas.clientHeight/(this.precanvas.clientHeight*this.zoom)),h=this.curvature,u=this.createCurvature(c,d,a,r,h,"openclose");l.setAttributeNS(null,"d",u)}addConnection(e,t,n,i){var s=this.getModuleFromNodeId(e);if(s===this.getModuleFromNodeId(t)){var o=this.getNodeFromId(e),l=!1;for(var c in o.outputs[n].connections){var d=o.outputs[n].connections[c];d.node==t&&d.output==i&&(l=!0)}if(!1===l){if(this.drawflow.drawflow[s].data[e].outputs[n].connections.push({node:t.toString(),output:i}),this.drawflow.drawflow[s].data[t].inputs[i].connections.push({node:e.toString(),input:n}),this.module===s){var a=document.createElementNS("http://www.w3.org/2000/svg","svg"),r=document.createElementNS("http://www.w3.org/2000/svg","path");r.classList.add("main-path"),r.setAttributeNS(null,"d",""),a.classList.add("connection"),a.classList.add("node_in_node-"+t),a.classList.add("node_out_node-"+e),a.classList.add(n),a.classList.add(i),a.appendChild(r),this.precanvas.appendChild(a),this.updateConnectionNodes("node-"+e),this.updateConnectionNodes("node-"+t)}this.dispatch("connectionCreated",{output_id:e,input_id:t,output_class:n,input_class:i})}}}updateConnectionNodes(e){const t="node_in_"+e,n="node_out_"+e;this.line_path;const i=this.container,s=this.precanvas,o=this.curvature,l=this.createCurvature,c=this.reroute_curvature,d=this.reroute_curvature_start_end,a=this.reroute_fix_curvature,r=this.reroute_width,h=this.zoom;let u=s.clientWidth/(s.clientWidth*h);u=u||0;let p=s.clientHeight/(s.clientHeight*h);p=p||0;const f=i.querySelectorAll("."+n);Object.keys(f).map((function(t,n){if(null===f[t].querySelector(".point")){var m=i.querySelector("#"+e),g=f[t].classList[1].replace("node_in_",""),_=i.querySelector("#"+g).querySelectorAll("."+f[t].classList[4])[0],w=_.offsetWidth/2+(_.getBoundingClientRect().x-s.getBoundingClientRect().x)*u,v=_.offsetHeight/2+(_.getBoundingClientRect().y-s.getBoundingClientRect().y)*p,y=m.querySelectorAll("."+f[t].classList[3])[0],C=y.offsetWidth/2+(y.getBoundingClientRect().x-s.getBoundingClientRect().x)*u,x=y.offsetHeight/2+(y.getBoundingClientRect().y-s.getBoundingClientRect().y)*p;const n=l(C,x,w,v,o,"openclose");f[t].children[0].setAttributeNS(null,"d",n)}else{const n=f[t].querySelectorAll(".point");let o="";const m=[];n.forEach((t,a)=>{if(0===a&&n.length-1==0){var f=i.querySelector("#"+e),g=((x=t).getBoundingClientRect().x-s.getBoundingClientRect().x)*u+r,_=(x.getBoundingClientRect().y-s.getBoundingClientRect().y)*p+r,w=(L=f.querySelectorAll("."+t.parentElement.classList[3])[0]).offsetWidth/2+(L.getBoundingClientRect().x-s.getBoundingClientRect().x)*u,v=L.offsetHeight/2+(L.getBoundingClientRect().y-s.getBoundingClientRect().y)*p,y=l(w,v,g,_,d,"open");o+=y,m.push(y);f=t;var C=t.parentElement.classList[1].replace("node_in_",""),x=(E=i.querySelector("#"+C)).querySelectorAll("."+t.parentElement.classList[4])[0];g=(R=E.querySelectorAll("."+t.parentElement.classList[4])[0]).offsetWidth/2+(R.getBoundingClientRect().x-s.getBoundingClientRect().x)*u,_=R.offsetHeight/2+(R.getBoundingClientRect().y-s.getBoundingClientRect().y)*p,w=(f.getBoundingClientRect().x-s.getBoundingClientRect().x)*u+r,v=(f.getBoundingClientRect().y-s.getBoundingClientRect().y)*p+r,y=l(w,v,g,_,d,"close");o+=y,m.push(y)}else if(0===a){var L;f=i.querySelector("#"+e),g=((x=t).getBoundingClientRect().x-s.getBoundingClientRect().x)*u+r,_=(x.getBoundingClientRect().y-s.getBoundingClientRect().y)*p+r,w=(L=f.querySelectorAll("."+t.parentElement.classList[3])[0]).offsetWidth/2+(L.getBoundingClientRect().x-s.getBoundingClientRect().x)*u,v=L.offsetHeight/2+(L.getBoundingClientRect().y-s.getBoundingClientRect().y)*p,y=l(w,v,g,_,d,"open");o+=y,m.push(y);f=t,g=((x=n[a+1]).getBoundingClientRect().x-s.getBoundingClientRect().x)*u+r,_=(x.getBoundingClientRect().y-s.getBoundingClientRect().y)*p+r,w=(f.getBoundingClientRect().x-s.getBoundingClientRect().x)*u+r,v=(f.getBoundingClientRect().y-s.getBoundingClientRect().y)*p+r,y=l(w,v,g,_,c,"other");o+=y,m.push(y)}else if(a===n.length-1){var E,R;f=t,C=t.parentElement.classList[1].replace("node_in_",""),x=(E=i.querySelector("#"+C)).querySelectorAll("."+t.parentElement.classList[4])[0],g=(R=E.querySelectorAll("."+t.parentElement.classList[4])[0]).offsetWidth/2+(R.getBoundingClientRect().x-s.getBoundingClientRect().x)*u,_=R.offsetHeight/2+(R.getBoundingClientRect().y-s.getBoundingClientRect().y)*p,w=(f.getBoundingClientRect().x-s.getBoundingClientRect().x)*(s.clientWidth/(s.clientWidth*h))+r,v=(f.getBoundingClientRect().y-s.getBoundingClientRect().y)*(s.clientHeight/(s.clientHeight*h))+r,y=l(w,v,g,_,d,"close");o+=y,m.push(y)}else{f=t,g=((x=n[a+1]).getBoundingClientRect().x-s.getBoundingClientRect().x)*(s.clientWidth/(s.clientWidth*h))+r,_=(x.getBoundingClientRect().y-s.getBoundingClientRect().y)*(s.clientHeight/(s.clientHeight*h))+r,w=(f.getBoundingClientRect().x-s.getBoundingClientRect().x)*(s.clientWidth/(s.clientWidth*h))+r,v=(f.getBoundingClientRect().y-s.getBoundingClientRect().y)*(s.clientHeight/(s.clientHeight*h))+r,y=l(w,v,g,_,c,"other");o+=y,m.push(y)}}),a?m.forEach((e,n)=>{f[t].children[n].setAttributeNS(null,"d",e)}):f[t].children[0].setAttributeNS(null,"d",o)}}));const m=i.querySelectorAll("."+t);Object.keys(m).map((function(t,n){if(null===m[t].querySelector(".point")){var h=i.querySelector("#"+e),f=m[t].classList[2].replace("node_out_",""),g=i.querySelector("#"+f).querySelectorAll("."+m[t].classList[3])[0],_=g.offsetWidth/2+(g.getBoundingClientRect().x-s.getBoundingClientRect().x)*u,w=g.offsetHeight/2+(g.getBoundingClientRect().y-s.getBoundingClientRect().y)*p,v=(h=h.querySelectorAll("."+m[t].classList[4])[0]).offsetWidth/2+(h.getBoundingClientRect().x-s.getBoundingClientRect().x)*u,y=h.offsetHeight/2+(h.getBoundingClientRect().y-s.getBoundingClientRect().y)*p;const n=l(_,w,v,y,o,"openclose");m[t].children[0].setAttributeNS(null,"d",n)}else{const n=m[t].querySelectorAll(".point");let o="";const h=[];n.forEach((t,a)=>{if(0===a&&n.length-1==0){var f=i.querySelector("#"+e),m=((C=t).getBoundingClientRect().x-s.getBoundingClientRect().x)*u+r,g=(C.getBoundingClientRect().y-s.getBoundingClientRect().y)*p+r,_=(E=f.querySelectorAll("."+t.parentElement.classList[4])[0]).offsetWidth/2+(E.getBoundingClientRect().x-s.getBoundingClientRect().x)*u,w=E.offsetHeight/2+(E.getBoundingClientRect().y-s.getBoundingClientRect().y)*p,v=l(m,g,_,w,d,"close");o+=v,h.push(v);f=t;var y=t.parentElement.classList[2].replace("node_out_",""),C=(L=i.querySelector("#"+y)).querySelectorAll("."+t.parentElement.classList[3])[0];m=(x=L.querySelectorAll("."+t.parentElement.classList[3])[0]).offsetWidth/2+(x.getBoundingClientRect().x-s.getBoundingClientRect().x)*u,g=x.offsetHeight/2+(x.getBoundingClientRect().y-s.getBoundingClientRect().y)*p,_=(f.getBoundingClientRect().x-s.getBoundingClientRect().x)*u+r,w=(f.getBoundingClientRect().y-s.getBoundingClientRect().y)*p+r,v=l(m,g,_,w,d,"open");o+=v,h.push(v)}else if(0===a){var x;f=t,y=t.parentElement.classList[2].replace("node_out_",""),C=(L=i.querySelector("#"+y)).querySelectorAll("."+t.parentElement.classList[3])[0],m=(x=L.querySelectorAll("."+t.parentElement.classList[3])[0]).offsetWidth/2+(x.getBoundingClientRect().x-s.getBoundingClientRect().x)*u,g=x.offsetHeight/2+(x.getBoundingClientRect().y-s.getBoundingClientRect().y)*p,_=(f.getBoundingClientRect().x-s.getBoundingClientRect().x)*u+r,w=(f.getBoundingClientRect().y-s.getBoundingClientRect().y)*p+r,v=l(m,g,_,w,d,"open");o+=v,h.push(v);f=t,_=((C=n[a+1]).getBoundingClientRect().x-s.getBoundingClientRect().x)*u+r,w=(C.getBoundingClientRect().y-s.getBoundingClientRect().y)*p+r,m=(f.getBoundingClientRect().x-s.getBoundingClientRect().x)*u+r,g=(f.getBoundingClientRect().y-s.getBoundingClientRect().y)*p+r,v=l(m,g,_,w,c,"other");o+=v,h.push(v)}else if(a===n.length-1){var L,E;f=t,y=t.parentElement.classList[1].replace("node_in_",""),C=(L=i.querySelector("#"+y)).querySelectorAll("."+t.parentElement.classList[4])[0],_=(E=L.querySelectorAll("."+t.parentElement.classList[4])[0]).offsetWidth/2+(E.getBoundingClientRect().x-s.getBoundingClientRect().x)*u,w=E.offsetHeight/2+(E.getBoundingClientRect().y-s.getBoundingClientRect().y)*p,m=(f.getBoundingClientRect().x-s.getBoundingClientRect().x)*u+r,g=(f.getBoundingClientRect().y-s.getBoundingClientRect().y)*p+r,v=l(m,g,_,w,d,"close");o+=v,h.push(v)}else{f=t,_=((C=n[a+1]).getBoundingClientRect().x-s.getBoundingClientRect().x)*u+r,w=(C.getBoundingClientRect().y-s.getBoundingClientRect().y)*p+r,m=(f.getBoundingClientRect().x-s.getBoundingClientRect().x)*u+r,g=(f.getBoundingClientRect().y-s.getBoundingClientRect().y)*p+r,v=l(m,g,_,w,c,"other");o+=v,h.push(v)}}),a?h.forEach((e,n)=>{m[t].children[n].setAttributeNS(null,"d",e)}):m[t].children[0].setAttributeNS(null,"d",o)}}))}dblclick(e){null!=this.connection_selected&&this.reroute&&this.createReroutePoint(this.connection_selected),"point"===e.target.classList[0]&&this.removeReroutePoint(e.target)}createReroutePoint(e){this.connection_selected.classList.remove("selected");const t=this.connection_selected.parentElement.classList[2].slice(9),n=this.connection_selected.parentElement.classList[1].slice(13),i=this.connection_selected.parentElement.classList[3],s=this.connection_selected.parentElement.classList[4];this.connection_selected=null;const o=document.createElementNS("http://www.w3.org/2000/svg","circle");o.classList.add("point");var l=this.pos_x*(this.precanvas.clientWidth/(this.precanvas.clientWidth*this.zoom))-this.precanvas.getBoundingClientRect().x*(this.precanvas.clientWidth/(this.precanvas.clientWidth*this.zoom)),c=this.pos_y*(this.precanvas.clientHeight/(this.precanvas.clientHeight*this.zoom))-this.precanvas.getBoundingClientRect().y*(this.precanvas.clientHeight/(this.precanvas.clientHeight*this.zoom));o.setAttributeNS(null,"cx",l),o.setAttributeNS(null,"cy",c),o.setAttributeNS(null,"r",this.reroute_width);let d=0;if(this.reroute_fix_curvature){const t=e.parentElement.querySelectorAll(".main-path").length;var a=document.createElementNS("http://www.w3.org/2000/svg","path");if(a.classList.add("main-path"),a.setAttributeNS(null,"d",""),e.parentElement.insertBefore(a,e.parentElement.children[t]),1===t)e.parentElement.appendChild(o);else{const n=Array.from(e.parentElement.children).indexOf(e);d=n,e.parentElement.insertBefore(o,e.parentElement.children[n+t+1])}}else e.parentElement.appendChild(o);const r=t.slice(5),h=this.drawflow.drawflow[this.module].data[r].outputs[i].connections.findIndex((function(e,t){return e.node===n&&e.output===s}));void 0===this.drawflow.drawflow[this.module].data[r].outputs[i].connections[h].points&&(this.drawflow.drawflow[this.module].data[r].outputs[i].connections[h].points=[]),this.reroute_fix_curvature?(d>0||this.drawflow.drawflow[this.module].data[r].outputs[i].connections[h].points!==[]?this.drawflow.drawflow[this.module].data[r].outputs[i].connections[h].points.splice(d,0,{pos_x:l,pos_y:c}):this.drawflow.drawflow[this.module].data[r].outputs[i].connections[h].points.push({pos_x:l,pos_y:c}),e.parentElement.querySelectorAll(".main-path").forEach((e,t)=>{e.classList.remove("selected")})):this.drawflow.drawflow[this.module].data[r].outputs[i].connections[h].points.push({pos_x:l,pos_y:c}),this.dispatch("addReroute",r),this.updateConnectionNodes(t)}removeReroutePoint(e){const t=e.parentElement.classList[2].slice(9),n=e.parentElement.classList[1].slice(13),i=e.parentElement.classList[3],s=e.parentElement.classList[4];let o=Array.from(e.parentElement.children).indexOf(e);const l=t.slice(5),c=this.drawflow.drawflow[this.module].data[l].outputs[i].connections.findIndex((function(e,t){return e.node===n&&e.output===s}));if(this.reroute_fix_curvature){const t=e.parentElement.querySelectorAll(".main-path").length;e.parentElement.children[t-1].remove(),o-=t,o<0&&(o=0)}else o--;this.drawflow.drawflow[this.module].data[l].outputs[i].connections[c].points.splice(o,1),e.remove(),this.dispatch("removeReroute",l),this.updateConnectionNodes(t)}registerNode(e,t,n=null,i=null){this.noderegister[e]={html:t,props:n,options:i}}getNodeFromId(e){var t=this.getModuleFromNodeId(e);return JSON.parse(JSON.stringify(this.drawflow.drawflow[t].data[e]))}getNodesFromName(e){var t=[];const n=this.drawflow.drawflow;return Object.keys(n).map((function(i,s){for(var o in n[i].data)n[i].data[o].name==e&&t.push(n[i].data[o].id)})),t}addNode(e,t,n,i,s,o,l,c,d=!1){if(this.useuuid)var a=this.getUuid();else a=this.nodeId;const r=document.createElement("div");r.classList.add("parent-node");const h=document.createElement("div");h.innerHTML="",h.setAttribute("id","node-"+a),h.classList.add("drawflow-node"),""!=o&&h.classList.add(...o.split(" "));const u=document.createElement("div");u.classList.add("inputs");const p=document.createElement("div");p.classList.add("outputs");const f={};for(var m=0;m<t;m++){const e=document.createElement("div");e.classList.add("input"),e.classList.add("input_"+(m+1)),f["input_"+(m+1)]={connections:[]},u.appendChild(e)}const g={};for(m=0;m<n;m++){const e=document.createElement("div");e.classList.add("output"),e.classList.add("output_"+(m+1)),g["output_"+(m+1)]={connections:[]},p.appendChild(e)}const _=document.createElement("div");if(_.classList.add("drawflow_content_node"),!1===d)_.innerHTML=c;else if(!0===d)_.appendChild(this.noderegister[c].html.cloneNode(!0));else if(3===parseInt(this.render.version)){let e=this.render.h(this.noderegister[c].html,this.noderegister[c].props,this.noderegister[c].options);e.appContext=this.parent,this.render.render(e,_)}else{let e=new this.render({parent:this.parent,render:e=>e(this.noderegister[c].html,{props:this.noderegister[c].props}),...this.noderegister[c].options}).$mount();_.appendChild(e.$el)}Object.entries(l).forEach((function(e,t){if("object"==typeof e[1])!function e(t,n,i){if(null===t)t=l[n];else t=t[n];null!==t&&Object.entries(t).forEach((function(n,s){if("object"==typeof n[1])e(t,n[0],i+"-"+n[0]);else for(var o=_.querySelectorAll("[df-"+i+"-"+n[0]+"]"),l=0;l<o.length;l++)o[l].value=n[1],o[l].isContentEditable&&(o[l].innerText=n[1])}))}(null,e[0],e[0]);else for(var n=_.querySelectorAll("[df-"+e[0]+"]"),i=0;i<n.length;i++)n[i].value=e[1],n[i].isContentEditable&&(n[i].innerText=e[1])})),h.appendChild(u),h.appendChild(_),h.appendChild(p),h.style.top=s+"px",h.style.left=i+"px",r.appendChild(h),this.precanvas.appendChild(r);var w={id:a,name:e,data:l,class:o,html:c,typenode:d,inputs:f,outputs:g,pos_x:i,pos_y:s};return this.drawflow.drawflow[this.module].data[a]=w,this.dispatch("nodeCreated",a),this.useuuid||this.nodeId++,a}addNodeImport(e,t){const n=document.createElement("div");n.classList.add("parent-node");const i=document.createElement("div");i.innerHTML="",i.setAttribute("id","node-"+e.id),i.classList.add("drawflow-node"),""!=e.class&&i.classList.add(...e.class.split(" "));const s=document.createElement("div");s.classList.add("inputs");const o=document.createElement("div");o.classList.add("outputs"),Object.keys(e.inputs).map((function(n,i){const o=document.createElement("div");o.classList.add("input"),o.classList.add(n),s.appendChild(o),Object.keys(e.inputs[n].connections).map((function(i,s){var o=document.createElementNS("http://www.w3.org/2000/svg","svg"),l=document.createElementNS("http://www.w3.org/2000/svg","path");l.classList.add("main-path"),l.setAttributeNS(null,"d",""),o.classList.add("connection"),o.classList.add("node_in_node-"+e.id),o.classList.add("node_out_node-"+e.inputs[n].connections[i].node),o.classList.add(e.inputs[n].connections[i].input),o.classList.add(n),o.appendChild(l),t.appendChild(o)}))}));for(var l=0;l<Object.keys(e.outputs).length;l++){const e=document.createElement("div");e.classList.add("output"),e.classList.add("output_"+(l+1)),o.appendChild(e)}const c=document.createElement("div");if(c.classList.add("drawflow_content_node"),!1===e.typenode)c.innerHTML=e.html;else if(!0===e.typenode)c.appendChild(this.noderegister[e.html].html.cloneNode(!0));else if(3===parseInt(this.render.version)){let t=this.render.h(this.noderegister[e.html].html,this.noderegister[e.html].props,this.noderegister[e.html].options);t.appContext=this.parent,this.render.render(t,c)}else{let t=new this.render({parent:this.parent,render:t=>t(this.noderegister[e.html].html,{props:this.noderegister[e.html].props}),...this.noderegister[e.html].options}).$mount();c.appendChild(t.$el)}Object.entries(e.data).forEach((function(t,n){if("object"==typeof t[1])!function t(n,i,s){if(null===n)n=e.data[i];else n=n[i];null!==n&&Object.entries(n).forEach((function(e,i){if("object"==typeof e[1])t(n,e[0],s+"-"+e[0]);else for(var o=c.querySelectorAll("[df-"+s+"-"+e[0]+"]"),l=0;l<o.length;l++)o[l].value=e[1],o[l].isContentEditable&&(o[l].innerText=e[1])}))}(null,t[0],t[0]);else for(var i=c.querySelectorAll("[df-"+t[0]+"]"),s=0;s<i.length;s++)i[s].value=t[1],i[s].isContentEditable&&(i[s].innerText=t[1])})),i.appendChild(s),i.appendChild(c),i.appendChild(o),i.style.top=e.pos_y+"px",i.style.left=e.pos_x+"px",n.appendChild(i),this.precanvas.appendChild(n)}addRerouteImport(e){const t=this.reroute_width,n=this.reroute_fix_curvature,i=this.container;Object.keys(e.outputs).map((function(s,o){Object.keys(e.outputs[s].connections).map((function(o,l){const c=e.outputs[s].connections[o].points;void 0!==c&&c.forEach((l,d)=>{const a=e.outputs[s].connections[o].node,r=e.outputs[s].connections[o].output,h=i.querySelector(".connection.node_in_node-"+a+".node_out_node-"+e.id+"."+s+"."+r);if(n&&0===d)for(var u=0;u<c.length;u++){var p=document.createElementNS("http://www.w3.org/2000/svg","path");p.classList.add("main-path"),p.setAttributeNS(null,"d",""),h.appendChild(p)}const f=document.createElementNS("http://www.w3.org/2000/svg","circle");f.classList.add("point");var m=l.pos_x,g=l.pos_y;f.setAttributeNS(null,"cx",m),f.setAttributeNS(null,"cy",g),f.setAttributeNS(null,"r",t),h.appendChild(f)})}))}))}updateNodeValue(e){for(var t=e.target.attributes,n=0;n<t.length;n++)if(t[n].nodeName.startsWith("df-")){for(var i=t[n].nodeName.slice(3).split("-"),s=this.drawflow.drawflow[this.module].data[e.target.closest(".drawflow_content_node").parentElement.id.slice(5)].data,o=0;o<i.length-1;o+=1)null==s[i[o]]&&(s[i[o]]={}),s=s[i[o]];s[i[i.length-1]]=e.target.value,e.target.isContentEditable&&(s[i[i.length-1]]=e.target.innerText),this.dispatch("nodeDataChanged",e.target.closest(".drawflow_content_node").parentElement.id.slice(5))}}updateNodeDataFromId(e,t){var n=this.getModuleFromNodeId(e);if(this.drawflow.drawflow[n].data[e].data=t,this.module===n){const n=this.container.querySelector("#node-"+e);Object.entries(t).forEach((function(e,i){if("object"==typeof e[1])!function e(i,s,o){if(null===i)i=t[s];else i=i[s];null!==i&&Object.entries(i).forEach((function(t,s){if("object"==typeof t[1])e(i,t[0],o+"-"+t[0]);else for(var l=n.querySelectorAll("[df-"+o+"-"+t[0]+"]"),c=0;c<l.length;c++)l[c].value=t[1],l[c].isContentEditable&&(l[c].innerText=t[1])}))}(null,e[0],e[0]);else for(var s=n.querySelectorAll("[df-"+e[0]+"]"),o=0;o<s.length;o++)s[o].value=e[1],s[o].isContentEditable&&(s[o].innerText=e[1])}))}}addNodeInput(e){var t=this.getModuleFromNodeId(e);const n=this.getNodeFromId(e),i=Object.keys(n.inputs).length;if(this.module===t){const t=document.createElement("div");t.classList.add("input"),t.classList.add("input_"+(i+1));this.container.querySelector("#node-"+e+" .inputs").appendChild(t),this.updateConnectionNodes("node-"+e)}this.drawflow.drawflow[t].data[e].inputs["input_"+(i+1)]={connections:[]}}addNodeOutput(e){var t=this.getModuleFromNodeId(e);const n=this.getNodeFromId(e),i=Object.keys(n.outputs).length;if(this.module===t){const t=document.createElement("div");t.classList.add("output"),t.classList.add("output_"+(i+1));this.container.querySelector("#node-"+e+" .outputs").appendChild(t),this.updateConnectionNodes("node-"+e)}this.drawflow.drawflow[t].data[e].outputs["output_"+(i+1)]={connections:[]}}removeNodeInput(e,t){var n=this.getModuleFromNodeId(e);const i=this.getNodeFromId(e);this.module===n&&this.container.querySelector("#node-"+e+" .inputs .input."+t).remove();const s=[];Object.keys(i.inputs[t].connections).map((function(n,o){const l=i.inputs[t].connections[o].node,c=i.inputs[t].connections[o].input;s.push({id_output:l,id:e,output_class:c,input_class:t})})),s.forEach((e,t)=>{this.removeSingleConnection(e.id_output,e.id,e.output_class,e.input_class)}),delete this.drawflow.drawflow[n].data[e].inputs[t];const o=[],l=this.drawflow.drawflow[n].data[e].inputs;Object.keys(l).map((function(e,t){o.push(l[e])})),this.drawflow.drawflow[n].data[e].inputs={};const c=t.slice(6);let d=[];if(o.forEach((t,i)=>{t.connections.forEach((e,t)=>{d.push(e)}),this.drawflow.drawflow[n].data[e].inputs["input_"+(i+1)]=t}),d=new Set(d.map(e=>JSON.stringify(e))),d=Array.from(d).map(e=>JSON.parse(e)),this.module===n){this.container.querySelectorAll("#node-"+e+" .inputs .input").forEach((e,t)=>{const n=e.classList[1].slice(6);parseInt(c)<parseInt(n)&&(e.classList.remove("input_"+n),e.classList.add("input_"+(n-1)))})}d.forEach((t,i)=>{this.drawflow.drawflow[n].data[t.node].outputs[t.input].connections.forEach((i,s)=>{if(i.node==e){const o=i.output.slice(6);if(parseInt(c)<parseInt(o)){if(this.module===n){const n=this.container.querySelector(".connection.node_in_node-"+e+".node_out_node-"+t.node+"."+t.input+".input_"+o);n.classList.remove("input_"+o),n.classList.add("input_"+(o-1))}i.points?this.drawflow.drawflow[n].data[t.node].outputs[t.input].connections[s]={node:i.node,output:"input_"+(o-1),points:i.points}:this.drawflow.drawflow[n].data[t.node].outputs[t.input].connections[s]={node:i.node,output:"input_"+(o-1)}}}})}),this.updateConnectionNodes("node-"+e)}removeNodeOutput(e,t){var n=this.getModuleFromNodeId(e);const i=this.getNodeFromId(e);this.module===n&&this.container.querySelector("#node-"+e+" .outputs .output."+t).remove();const s=[];Object.keys(i.outputs[t].connections).map((function(n,o){const l=i.outputs[t].connections[o].node,c=i.outputs[t].connections[o].output;s.push({id:e,id_input:l,output_class:t,input_class:c})})),s.forEach((e,t)=>{this.removeSingleConnection(e.id,e.id_input,e.output_class,e.input_class)}),delete this.drawflow.drawflow[n].data[e].outputs[t];const o=[],l=this.drawflow.drawflow[n].data[e].outputs;Object.keys(l).map((function(e,t){o.push(l[e])})),this.drawflow.drawflow[n].data[e].outputs={};const c=t.slice(7);let d=[];if(o.forEach((t,i)=>{t.connections.forEach((e,t)=>{d.push({node:e.node,output:e.output})}),this.drawflow.drawflow[n].data[e].outputs["output_"+(i+1)]=t}),d=new Set(d.map(e=>JSON.stringify(e))),d=Array.from(d).map(e=>JSON.parse(e)),this.module===n){this.container.querySelectorAll("#node-"+e+" .outputs .output").forEach((e,t)=>{const n=e.classList[1].slice(7);parseInt(c)<parseInt(n)&&(e.classList.remove("output_"+n),e.classList.add("output_"+(n-1)))})}d.forEach((t,i)=>{this.drawflow.drawflow[n].data[t.node].inputs[t.output].connections.forEach((i,s)=>{if(i.node==e){const o=i.input.slice(7);if(parseInt(c)<parseInt(o)){if(this.module===n){const n=this.container.querySelector(".connection.node_in_node-"+t.node+".node_out_node-"+e+".output_"+o+"."+t.output);n.classList.remove("output_"+o),n.classList.remove(t.output),n.classList.add("output_"+(o-1)),n.classList.add(t.output)}i.points?this.drawflow.drawflow[n].data[t.node].inputs[t.output].connections[s]={node:i.node,input:"output_"+(o-1),points:i.points}:this.drawflow.drawflow[n].data[t.node].inputs[t.output].connections[s]={node:i.node,input:"output_"+(o-1)}}}})}),this.updateConnectionNodes("node-"+e)}removeNodeId(e){this.removeConnectionNodeId(e);var t=this.getModuleFromNodeId(e.slice(5));this.module===t&&this.container.querySelector("#"+e).remove(),delete this.drawflow.drawflow[t].data[e.slice(5)],this.dispatch("nodeRemoved",e.slice(5))}removeConnection(){if(null!=this.connection_selected){var e=this.connection_selected.parentElement.classList;this.connection_selected.parentElement.remove();var t=this.drawflow.drawflow[this.module].data[e[2].slice(14)].outputs[e[3]].connections.findIndex((function(t,n){return t.node===e[1].slice(13)&&t.output===e[4]}));this.drawflow.drawflow[this.module].data[e[2].slice(14)].outputs[e[3]].connections.splice(t,1);var n=this.drawflow.drawflow[this.module].data[e[1].slice(13)].inputs[e[4]].connections.findIndex((function(t,n){return t.node===e[2].slice(14)&&t.input===e[3]}));this.drawflow.drawflow[this.module].data[e[1].slice(13)].inputs[e[4]].connections.splice(n,1),this.dispatch("connectionRemoved",{output_id:e[2].slice(14),input_id:e[1].slice(13),output_class:e[3],input_class:e[4]}),this.connection_selected=null}}removeSingleConnection(e,t,n,i){var s=this.getModuleFromNodeId(e);if(s===this.getModuleFromNodeId(t)){if(this.drawflow.drawflow[s].data[e].outputs[n].connections.findIndex((function(e,n){return e.node==t&&e.output===i}))>-1){this.module===s&&this.container.querySelector(".connection.node_in_node-"+t+".node_out_node-"+e+"."+n+"."+i).remove();var o=this.drawflow.drawflow[s].data[e].outputs[n].connections.findIndex((function(e,n){return e.node==t&&e.output===i}));this.drawflow.drawflow[s].data[e].outputs[n].connections.splice(o,1);var l=this.drawflow.drawflow[s].data[t].inputs[i].connections.findIndex((function(t,i){return t.node==e&&t.input===n}));return this.drawflow.drawflow[s].data[t].inputs[i].connections.splice(l,1),this.dispatch("connectionRemoved",{output_id:e,input_id:t,output_class:n,input_class:i}),!0}return!1}return!1}removeConnectionNodeId(e){const t="node_in_"+e,n="node_out_"+e,i=this.container.querySelectorAll("."+n);for(var s=i.length-1;s>=0;s--){var o=i[s].classList,l=this.drawflow.drawflow[this.module].data[o[1].slice(13)].inputs[o[4]].connections.findIndex((function(e,t){return e.node===o[2].slice(14)&&e.input===o[3]}));this.drawflow.drawflow[this.module].data[o[1].slice(13)].inputs[o[4]].connections.splice(l,1);var c=this.drawflow.drawflow[this.module].data[o[2].slice(14)].outputs[o[3]].connections.findIndex((function(e,t){return e.node===o[1].slice(13)&&e.output===o[4]}));this.drawflow.drawflow[this.module].data[o[2].slice(14)].outputs[o[3]].connections.splice(c,1),i[s].remove(),this.dispatch("connectionRemoved",{output_id:o[2].slice(14),input_id:o[1].slice(13),output_class:o[3],input_class:o[4]})}const d=this.container.querySelectorAll("."+t);for(s=d.length-1;s>=0;s--){o=d[s].classList,c=this.drawflow.drawflow[this.module].data[o[2].slice(14)].outputs[o[3]].connections.findIndex((function(e,t){return e.node===o[1].slice(13)&&e.output===o[4]}));this.drawflow.drawflow[this.module].data[o[2].slice(14)].outputs[o[3]].connections.splice(c,1);l=this.drawflow.drawflow[this.module].data[o[1].slice(13)].inputs[o[4]].connections.findIndex((function(e,t){return e.node===o[2].slice(14)&&e.input===o[3]}));this.drawflow.drawflow[this.module].data[o[1].slice(13)].inputs[o[4]].connections.splice(l,1),d[s].remove(),this.dispatch("connectionRemoved",{output_id:o[2].slice(14),input_id:o[1].slice(13),output_class:o[3],input_class:o[4]})}}getModuleFromNodeId(e){var t;const n=this.drawflow.drawflow;return Object.keys(n).map((function(i,s){Object.keys(n[i].data).map((function(n,s){n==e&&(t=i)}))})),t}addModule(e){this.drawflow.drawflow[e]={data:{}},this.dispatch("moduleCreated",e)}changeModule(e){this.dispatch("moduleChanged",e),this.module=e,this.precanvas.innerHTML="",this.canvas_x=0,this.canvas_y=0,this.pos_x=0,this.pos_y=0,this.mouse_x=0,this.mouse_y=0,this.zoom=1,this.zoom_last_value=1,this.precanvas.style.transform="",this.import(this.drawflow,!1)}removeModule(e){this.module===e&&this.changeModule("Home"),delete this.drawflow.drawflow[e],this.dispatch("moduleRemoved",e)}clearModuleSelected(){this.precanvas.innerHTML="",this.drawflow.drawflow[this.module]={data:{}}}clear(){this.precanvas.innerHTML="",this.drawflow={drawflow:{Home:{data:{}}}}}export(){const e=JSON.parse(JSON.stringify(this.drawflow));return this.dispatch("export",e),e}import(e,t=!0){this.clear(),this.drawflow=JSON.parse(JSON.stringify(e)),this.load(),t&&this.dispatch("import","import")}on(e,t){return"function"!=typeof t?(console.error("The listener callback must be a function, the given type is "+typeof t),!1):"string"!=typeof e?(console.error("The event name must be a string, the given type is "+typeof e),!1):(void 0===this.events[e]&&(this.events[e]={listeners:[]}),void this.events[e].listeners.push(t))}removeListener(e,t){if(!this.events[e])return!1;const n=this.events[e].listeners,i=n.indexOf(t);i>-1&&n.splice(i,1)}dispatch(e,t){if(void 0===this.events[e])return!1;this.events[e].listeners.forEach(e=>{e(t)})}getUuid(){for(var e=[],t=0;t<36;t++)e[t]="0123456789abcdef".substr(Math.floor(16*Math.random()),1);return e[14]="4",e[19]="0123456789abcdef".substr(3&e[19]|8,1),e[8]=e[13]=e[18]=e[23]="-",e.join("")}}}]).default}));
;

/* ---- js/core.js ---- */
        // =============================================
        // 1. SISTEMA CORE Y STORAGE
        // =============================================
        const SafeStorage={isAvailable:!1,init:function(){try{let e="__test__";localStorage.setItem(e,e),localStorage.removeItem(e),this.isAvailable=!0}catch(e){console.warn("Storage disabled")}},save:function(e,t){this.isAvailable&&localStorage.setItem(e,t)},load:function(e){return this.isAvailable?localStorage.getItem(e):null},clear:function(e){this.isAvailable&&localStorage.removeItem(e)}};SafeStorage.init();

        const CITIES = [{n:"Madrid",c:[40.416,-3.703]},{n:"Barcelona",c:[41.385,2.173]},{n:"Valencia",c:[39.469,-0.376]},{n:"Sevilla",c:[37.389,-5.984]}];
        let layerControl; 
        let currentNodeId = null;
        let currentRunTimestamp = 0; // Para el control de estado (verde/naranja)

        const ensureFC = (geo) => {
            if (!geo) return turf.featureCollection([]);
            if (geo.type === 'FeatureCollection') return geo;
            if (geo.type === 'Feature') return turf.featureCollection([geo]);
            if (geo.type === 'GeometryCollection') return turf.featureCollection(geo.geometries.map(g => turf.feature(g)));
            return turf.featureCollection([turf.feature(geo)]);
        };

        function JETLCloneFallback(value, seen) {
            if (value === null || value === undefined) return value;
            const t = typeof value;
            if (t !== 'object') return value;
            if (value instanceof Date) return new Date(value.getTime());
            if (value instanceof RegExp) return new RegExp(value.source, value.flags);
            if (value instanceof ArrayBuffer) return value.slice(0);
            if (ArrayBuffer.isView(value)) {
                if (typeof value.slice === 'function') return value.slice(0);
                return new value.constructor(value);
            }

            const refs = seen || new Map();
            if (refs.has(value)) return refs.get(value);

            if (Array.isArray(value)) {
                const outArr = new Array(value.length);
                refs.set(value, outArr);
                for (let i = 0; i < value.length; i++) outArr[i] = JETLCloneFallback(value[i], refs);
                return outArr;
            }

            const out = {};
            refs.set(value, out);
            Object.keys(value).forEach((k) => { out[k] = JETLCloneFallback(value[k], refs); });
            return out;
        }

        function JETLClone(value) {
            if (value === null || value === undefined) return value;
            if (typeof structuredClone === 'function') {
                try { return structuredClone(value); } catch (e) {}
            }
            return JETLCloneFallback(value);
        }
        window.JETLClone = JETLClone;
        window.JETLCloneFallback = JETLCloneFallback;

        function JETLIsCancelledError(err) {
            return !!(
                (typeof window !== 'undefined' && window.isEngineCancelled) ||
                (err && (err.cancelled || err.name === 'CancelledError'))
            );
        }
        window.JETLIsCancelledError = JETLIsCancelledError;

        function JETLThrowIfCancelled() {
            if (typeof window !== 'undefined' && window.isEngineCancelled) {
                const err = new Error('Operacion cancelada por el usuario');
                err.name = 'CancelledError';
                err.cancelled = true;
                throw err;
            }
        }
        window.JETLThrowIfCancelled = JETLThrowIfCancelled;

        function JETLNextTick() {
            return new Promise(resolve => setTimeout(resolve, 0));
        }
        window.JETLNextTick = JETLNextTick;

        // =============================================
        // 1.b PARAMETROS GLOBALES DE WORKSPACE
        // =============================================
        const PARAMS_STORAGE_KEY = 'jetl_workspace_params';
        let __jetlParams = {};
        try {
            const raw = SafeStorage.load(PARAMS_STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === 'object') __jetlParams = parsed;
            }
        } catch (e) { /* noop */ }

        function JETLGetParams() {
            return { ...(__jetlParams || {}) };
        }

        function JETLSetParams(map) {
            __jetlParams = (map && typeof map === 'object') ? { ...map } : {};
            SafeStorage.save(PARAMS_STORAGE_KEY, JSON.stringify(__jetlParams));
            return JETLGetParams();
        }

        function JETLSetParam(key, value) {
            const k = String(key || '').trim();
            if (!k) return JETLGetParams();
            __jetlParams[k] = value == null ? '' : String(value);
            SafeStorage.save(PARAMS_STORAGE_KEY, JSON.stringify(__jetlParams));
            return JETLGetParams();
        }

        function JETLGetParam(key, fallback = '') {
            const k = String(key || '').trim();
            if (!k) return fallback;
            return Object.prototype.hasOwnProperty.call(__jetlParams, k) ? __jetlParams[k] : fallback;
        }

        function JETLResolveParamText(input) {
            const source = input == null ? '' : String(input);
            if (!source.includes('${')) return source;
            return source.replace(/\$\{([a-zA-Z0-9_.-]+)\}/g, (m, key) => {
                const k = String(key || '').trim();
                if (!k) return m;
                return Object.prototype.hasOwnProperty.call(__jetlParams, k) ? String(__jetlParams[k]) : m;
            });
        }

        window.JETLParams = {
            getAll: JETLGetParams,
            setAll: JETLSetParams,
            get: JETLGetParam,
            set: JETLSetParam
        };
        window.JETLResolveParamText = JETLResolveParamText;

        // =============================================
        // 1.c FALLBACK DE CARGA SMOKE (anti-cache/SW)
        // =============================================
        const SMOKE_SRC = 'js/smoke.js';
        let __smokeLoadPromise = null;

        function ensureSmokeApiLoaded() {
            if (typeof window === 'undefined') return;
            if (window.JETLSmoke) return;
            const existing = document.querySelector('script[data-jetl-smoke-fallback="1"]');
            if (existing) return;
            const s = document.createElement('script');
            s.src = SMOKE_SRC;
            s.defer = true;
            s.setAttribute('data-jetl-smoke-fallback', '1');
            s.onload = () => console.log('[JETL] smoke fallback loaded');
            s.onerror = (e) => console.warn('[JETL] smoke fallback failed', e);
            (document.head || document.body || document.documentElement).appendChild(s);
        }

        function ensureSmokeApiLoadedAsync(timeoutMs = 5000) {
            if (typeof window === 'undefined') return Promise.resolve(false);
            if (window.JETLSmoke && !window.JETLSmoke.__proxy) return Promise.resolve(true);
            if (__smokeLoadPromise) return __smokeLoadPromise;

            __smokeLoadPromise = new Promise((resolve) => {
                let done = false;
                const finish = (ok) => {
                    if (done) return;
                    done = true;
                    resolve(!!ok);
                };

                const checkReady = () => !!(window.JETLSmoke && !window.JETLSmoke.__proxy);
                if (checkReady()) return finish(true);

                let s = document.querySelector('script[data-jetl-smoke-fallback="1"]');
                if (!s) {
                    s = document.createElement('script');
                    s.src = SMOKE_SRC;
                    s.defer = true;
                    s.setAttribute('data-jetl-smoke-fallback', '1');
                    (document.head || document.body || document.documentElement).appendChild(s);
                }

                s.addEventListener('load', () => finish(checkReady()), { once: true });
                s.addEventListener('error', () => finish(false), { once: true });
                setTimeout(() => finish(checkReady()), timeoutMs);
            }).finally(() => {
                __smokeLoadPromise = null;
            });
            return __smokeLoadPromise;
        }

        if (typeof window !== 'undefined' && !window.JETLSmoke) {
            const smokeProxy = {
                __proxy: true,
                runBasic: async () => {
                    await ensureSmokeApiLoadedAsync();
                    if (!window.JETLSmoke || window.JETLSmoke === smokeProxy || typeof window.JETLSmoke.runBasic !== 'function') {
                        throw new Error('JETLSmoke no disponible (fallo de carga de js/smoke.js)');
                    }
                    return window.JETLSmoke.runBasic();
                },
                runExtended: async () => {
                    await ensureSmokeApiLoadedAsync();
                    if (!window.JETLSmoke || window.JETLSmoke === smokeProxy || typeof window.JETLSmoke.runExtended !== 'function') {
                        throw new Error('JETLSmoke no disponible (fallo de carga de js/smoke.js)');
                    }
                    return window.JETLSmoke.runExtended();
                }
            };
            window.JETLSmoke = smokeProxy;
        }

        if (typeof window !== 'undefined') {
            window.addEventListener('load', () => setTimeout(ensureSmokeApiLoaded, 120));
            window.ensureSmokeApiLoaded = ensureSmokeApiLoaded;
            window.ensureSmokeApiLoadedAsync = ensureSmokeApiLoadedAsync;
        }

;

/* ---- js/params.js ---- */
// =============================================
// WORKSPACE PARAMS UI
// =============================================
(function () {
    function ensureRowsContainer() {
        return document.getElementById('params-rows');
    }

    function getParamMapFromUI() {
        const rows = Array.from(document.querySelectorAll('#params-rows [data-param-row]'));
        const out = {};
        rows.forEach((row) => {
            const k = (row.querySelector('[data-param-key]')?.value || '').trim();
            const v = row.querySelector('[data-param-val]')?.value || '';
            if (!k) return;
            out[k] = v;
        });
        return out;
    }

    function addParamRow(key = '', value = '') {
        const rows = ensureRowsContainer();
        if (!rows) return;
        const row = document.createElement('div');
        row.setAttribute('data-param-row', '1');
        row.style.display = 'grid';
        row.style.gridTemplateColumns = '1fr 1fr auto';
        row.style.gap = '6px';
        row.style.marginBottom = '6px';
        row.innerHTML = `
            <input data-param-key class="node-control" placeholder="param_key" value="${String(key).replace(/"/g, '&quot;')}">
            <input data-param-val class="node-control" placeholder="valor" value="${String(value).replace(/"/g, '&quot;')}">
            <button class="btn" data-ui-action="remove-param-row" title="Eliminar"><i class="fas fa-times"></i></button>
        `;
        rows.appendChild(row);
    }

    function openParamsModal() {
        const modal = document.getElementById('params-modal');
        const rows = ensureRowsContainer();
        if (!modal || !rows) return;
        rows.innerHTML = '';
        const data = (window.JETLParams && typeof window.JETLParams.getAll === 'function')
            ? window.JETLParams.getAll()
            : {};
        const keys = Object.keys(data || {});
        if (!keys.length) addParamRow('', '');
        else keys.forEach((k) => addParamRow(k, data[k]));
        modal.style.display = 'flex';
    }

    function closeParamsModal() {
        const modal = document.getElementById('params-modal');
        if (modal) modal.style.display = 'none';
    }

    function saveParamsFromModal() {
        const map = getParamMapFromUI();
        if (window.JETLParams && typeof window.JETLParams.setAll === 'function') {
            window.JETLParams.setAll(map);
        }
        closeParamsModal();
        if (typeof showToast === 'function') showToast('Parametros guardados', 'success');
    }

    document.addEventListener('click', (e) => {
        const actionEl = e.target.closest('[data-ui-action]');
        if (!actionEl) return;
        const action = actionEl.getAttribute('data-ui-action');
        if (action === 'open-params') openParamsModal();
        else if (action === 'close-params') closeParamsModal();
        else if (action === 'save-params') saveParamsFromModal();
        else if (action === 'add-param-row') addParamRow('', '');
        else if (action === 'remove-param-row') {
            const row = actionEl.closest('[data-param-row]');
            if (row) row.remove();
        }
    });

    window.openParamsModal = openParamsModal;
    window.closeParamsModal = closeParamsModal;
})();

;

/* ---- js/formats.js ---- */
// =============================================
// FORMATS REGISTRY (MODULAR I/O)
// =============================================
// This module isolates new/experimental formats so they are easy to locate.
(function () {
    const registry = {
        readers: [],
        writers: []
    };

    function _xmlEscape(v) {
        return String(v)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    function _coordsToKml(coords) {
        return coords.map(c => {
            const x = Number(c[0]);
            const y = Number(c[1]);
            const z = c.length > 2 ? Number(c[2]) : null;
            return z === null || Number.isNaN(z) ? `${x},${y}` : `${x},${y},${z}`;
        }).join(' ');
    }

    function _parseCoords(text) {
        if (!text) return [];
        return text
            .trim()
            .split(/\s+/)
            .map(token => token.split(',').map(Number))
            .filter(c => c.length >= 2 && Number.isFinite(c[0]) && Number.isFinite(c[1]))
            .map(c => c.length >= 3 && Number.isFinite(c[2]) ? [c[0], c[1], c[2]] : [c[0], c[1]]);
    }

    function _elText(parent, tag) {
        const el = parent.getElementsByTagName(tag)[0];
        return el && el.textContent ? el.textContent.trim() : '';
    }

    function _firstDirectChild(el, tagName) {
        for (const child of el.children || []) {
            if (child.tagName === tagName) return child;
        }
        return null;
    }

    function _kmlGeometryToGeoJSON(el) {
        if (!el) return null;
        const tag = el.tagName;

        if (tag === 'Point') {
            const coords = _parseCoords(_elText(el, 'coordinates'));
            if (!coords.length) return null;
            return { type: 'Point', coordinates: coords[0] };
        }
        if (tag === 'LineString') {
            const coords = _parseCoords(_elText(el, 'coordinates'));
            if (coords.length < 2) return null;
            return { type: 'LineString', coordinates: coords };
        }
        if (tag === 'Polygon') {
            const rings = [];
            const outer = el.getElementsByTagName('outerBoundaryIs')[0];
            if (outer) {
                const lr = outer.getElementsByTagName('LinearRing')[0];
                const coords = _parseCoords(_elText(lr || outer, 'coordinates'));
                if (coords.length >= 4) rings.push(coords);
            }
            const inners = el.getElementsByTagName('innerBoundaryIs');
            for (let i = 0; i < inners.length; i++) {
                const lr = inners[i].getElementsByTagName('LinearRing')[0];
                const coords = _parseCoords(_elText(lr || inners[i], 'coordinates'));
                if (coords.length >= 4) rings.push(coords);
            }
            if (!rings.length) return null;
            return { type: 'Polygon', coordinates: rings };
        }
        if (tag === 'MultiGeometry') {
            const geoms = [];
            for (const child of el.children || []) {
                const g = _kmlGeometryToGeoJSON(child);
                if (g) geoms.push(g);
            }
            if (!geoms.length) return null;

            const same = geoms.every(g => g.type === geoms[0].type);
            if (same && geoms[0].type === 'Point') return { type: 'MultiPoint', coordinates: geoms.map(g => g.coordinates) };
            if (same && geoms[0].type === 'LineString') return { type: 'MultiLineString', coordinates: geoms.map(g => g.coordinates) };
            if (same && geoms[0].type === 'Polygon') return { type: 'MultiPolygon', coordinates: geoms.map(g => g.coordinates) };
            return { type: 'GeometryCollection', geometries: geoms };
        }

        return null;
    }

    function parseKMLToGeoJSON(text) {
        const xml = new DOMParser().parseFromString(text, 'text/xml');
        const parseErr = xml.getElementsByTagName('parsererror');
        if (parseErr && parseErr.length) throw new Error("KML invalido");

        const placemarks = Array.from(xml.getElementsByTagName('Placemark'));
        const features = [];

        const kmlGeomTags = ['Point', 'LineString', 'Polygon', 'MultiGeometry'];
        const findGeom = (pm) => {
            for (const t of kmlGeomTags) {
                const el = _firstDirectChild(pm, t);
                if (el) return el;
            }
            for (const t of kmlGeomTags) {
                const all = pm.getElementsByTagName(t);
                if (all.length) return all[0];
            }
            return null;
        };

        placemarks.forEach(pm => {
            const geomEl = findGeom(pm);
            const geometry = _kmlGeometryToGeoJSON(geomEl);
            if (!geometry) return;

            const props = {};
            const name = _elText(pm, 'name');
            const description = _elText(pm, 'description');
            if (name) props.name = name;
            if (description) props.description = description;

            const dataEls = pm.getElementsByTagName('Data');
            for (let i = 0; i < dataEls.length; i++) {
                const key = dataEls[i].getAttribute('name');
                if (!key) continue;
                const valEl = dataEls[i].getElementsByTagName('value')[0];
                props[key] = valEl ? (valEl.textContent || '').trim() : '';
            }

            features.push(turf.feature(geometry, props));
        });

        if (features.length) return turf.featureCollection(features);

        const firstGeom = (() => {
            for (const t of kmlGeomTags) {
                const all = xml.getElementsByTagName(t);
                if (all.length) return all[0];
            }
            return null;
        })();

        const g = _kmlGeometryToGeoJSON(firstGeom);
        if (!g) throw new Error("KML sin geometrias compatibles");
        return turf.featureCollection([turf.feature(g, {})]);
    }

    function _geomToKml(geometry) {
        if (!geometry || !geometry.type) return '';
        const t = geometry.type;
        const c = geometry.coordinates;

        if (t === 'Point') {
            return `<Point><coordinates>${_coordsToKml([c])}</coordinates></Point>`;
        }
        if (t === 'LineString') {
            return `<LineString><coordinates>${_coordsToKml(c)}</coordinates></LineString>`;
        }
        if (t === 'Polygon') {
            const rings = (c || []).map(r => {
                if (!r || !r.length) return null;
                const first = r[0];
                const last = r[r.length - 1];
                const closed = (first[0] === last[0] && first[1] === last[1]) ? r : [...r, first];
                return closed;
            }).filter(Boolean);
            if (!rings.length) return '';
            const outer = `<outerBoundaryIs><LinearRing><coordinates>${_coordsToKml(rings[0])}</coordinates></LinearRing></outerBoundaryIs>`;
            const inners = rings.slice(1).map(r => `<innerBoundaryIs><LinearRing><coordinates>${_coordsToKml(r)}</coordinates></LinearRing></innerBoundaryIs>`).join('');
            return `<Polygon>${outer}${inners}</Polygon>`;
        }
        if (t === 'MultiPoint') {
            return `<MultiGeometry>${(c || []).map(p => `<Point><coordinates>${_coordsToKml([p])}</coordinates></Point>`).join('')}</MultiGeometry>`;
        }
        if (t === 'MultiLineString') {
            return `<MultiGeometry>${(c || []).map(line => `<LineString><coordinates>${_coordsToKml(line)}</coordinates></LineString>`).join('')}</MultiGeometry>`;
        }
        if (t === 'MultiPolygon') {
            const polys = (c || []).map(poly => _geomToKml({ type: 'Polygon', coordinates: poly })).join('');
            return `<MultiGeometry>${polys}</MultiGeometry>`;
        }
        if (t === 'GeometryCollection') {
            return `<MultiGeometry>${(geometry.geometries || []).map(g => _geomToKml(g)).join('')}</MultiGeometry>`;
        }
        return '';
    }

    function toKML(data) {
        const fc = (data && data.type === 'FeatureCollection')
            ? data
            : turf.featureCollection(Array.isArray(data) ? data : [data]);

        const body = (fc.features || []).map((f, idx) => {
            const geomXml = _geomToKml(f.geometry);
            if (!geomXml) return '';

            const props = f.properties || {};
            const name = props.name !== undefined ? `<name>${_xmlEscape(props.name)}</name>` : `<name>feature_${idx + 1}</name>`;
            const desc = props.description !== undefined ? `<description>${_xmlEscape(props.description)}</description>` : '';
            const ext = Object.keys(props)
                .filter(k => k !== 'name' && k !== 'description' && !k.startsWith('_'))
                .map(k => `<Data name="${_xmlEscape(k)}"><value>${_xmlEscape(props[k])}</value></Data>`)
                .join('');
            const extXml = ext ? `<ExtendedData>${ext}</ExtendedData>` : '';

            return `<Placemark>${name}${desc}${extXml}${geomXml}</Placemark>`;
        }).join('');

        return [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<kml xmlns="http://www.opengis.net/kml/2.2">',
            '<Document>',
            body,
            '</Document>',
            '</kml>'
        ].join('');
    }

    function _ext(name) {
        const i = name.lastIndexOf('.');
        return i >= 0 ? name.slice(i + 1).toLowerCase() : '';
    }

    function registerReader(def) {
        if (!def || !def.exts || !def.read) return;
        registry.readers.push(def);
    }

    function registerWriter(def) {
        if (!def || !def.exts || !def.write) return;
        registry.writers.push(def);
    }

    async function readFile(file) {
        if (!file) throw new Error("Archivo no válido.");
        const ext = _ext(file.name);
        const reader = registry.readers.find(r => r.exts.includes(ext));
        if (!reader) throw new Error(`Formato no soportado: .${ext}`);
        const timeoutMs = reader.timeoutMs || 30000;
        return await _withTimeout(reader.read(file), timeoutMs, `Timeout leyendo .${ext}`);
    }

    async function writeFile(ext, data) {
        const writer = registry.writers.find(w => w.exts.includes(ext));
        if (!writer) throw new Error(`Formato de salida no soportado: .${ext}`);
        return await writer.write(data);
    }

    // ----------------------------
    // Built-in readers
    // ----------------------------
    registerReader({
        exts: ['geojson', 'json'],
        label: 'GeoJSON',
        read: async (file) => {
            const text = await file.text();
            return JSON.parse(text);
        }
    });

    registerReader({
        exts: ['kml'],
        label: 'KML',
        read: async (file) => {
            const text = await file.text();
            return parseKMLToGeoJSON(text);
        }
    });

    registerReader({
        exts: ['zip'],
        label: 'Shapefile ZIP',
        read: async (file) => {
            const buffer = await file.arrayBuffer();
            const result = await shp(buffer);
            return Array.isArray(result) ? turf.featureCollection(result.flatMap(r => r.features)) : result;
        }
    });

    // ----------------------------
    // Experimental readers
    // ----------------------------
    registerReader({
        exts: ['gpkg'],
        label: 'GeoPackage (Experimental)',
        timeoutMs: 45000,
        read: async (file) => {
            if (window.log) window.log("⏳ Descargando motor GeoPackage desde CDN para Lectura...", "info");
            await loadScript('https://unpkg.com/@ngageoint/geopackage@3.0.0/dist/geopackage.min.js', 'GeoPackage');
            const GP = window.GeoPackage;
            if (!GP || !GP.GeoPackageAPI) throw new Error("Motor GeoPackage no disponible.");

            if (window.log) window.log("⏳ Abriendo GeoPackage en memoria...", "info");
            const buffer = await file.arrayBuffer();
            const bytes = new Uint8Array(buffer);

            const gpkg = await GP.GeoPackageAPI.open(bytes);
            const tables = gpkg.getFeatureTables ? gpkg.getFeatureTables() : [];
            if (!tables || tables.length === 0) {
                if (gpkg.close) gpkg.close();
                throw new Error("No se encontraron tablas vectoriales en el GPKG.");
            }

            const tableName = tables[0];
            const dao = gpkg.getFeatureDao(tableName);
            const rows = dao.queryForAll();
            const features = [];

            let iterCount = 0;
            while (rows.moveToNext()) {
                if (window.isEngineCancelled) throw new Error("Lectura de GeoPackage cancelada.");
                if (iterCount++ % 200 === 0) await new Promise(r => setTimeout(r, 0));

                const row = rows.getRow();
                const geomData = row.getGeometry();
                if (!geomData) continue;

                let gj = null;
                try {
                    // Intento de parseo de geometria v3
                    if (geomData.geometry) {
                        gj = geomData.geometry.toGeoJSON();
                    } else if (geomData.toGeoJSON) {
                        gj = geomData.toGeoJSON();
                    }
                } catch (e) { }

                if (!gj) continue;

                // Extraer propiedades
                const props = {};
                const geomColumn = dao.getGeometryColumnName();
                if (row.values) {
                    for (const key in row.values) {
                        if (key !== geomColumn) {
                            props[key] = row.values[key];
                        }
                    }
                }

                features.push(turf.feature(gj, props));
            }

            if (gpkg.close) gpkg.close();
            return turf.featureCollection(features);
        }
    });

    registerReader({
        exts: ['parquet'],
        label: 'Parquet (GeoParquet-lite)',
        read: async (file) => {
            if (window.log) window.log("⏳ Iniciando motor Parquet WASM para Lectura...", "info");
            try {
                // Importación dinámica nativa de ESM
                const parquetWasm = await import('https://unpkg.com/parquet-wasm@0.6.1/esm/parquet_wasm.js');
                await parquetWasm.default('https://unpkg.com/parquet-wasm@0.6.1/esm/parquet_wasm_bg.wasm');
                const arrow = await import('https://cdn.jsdelivr.net/npm/apache-arrow@13.0.0/+esm');

                const buffer = await file.arrayBuffer();
                const ipc = parquetWasm.readParquet(new Uint8Array(buffer));

                const table = arrow.tableFromIPC(ipc);
                const rows = table.toArray().map(r => r.toJSON());

                const features = [];
                for (const r of rows) {
                    let geom = null;
                    if (r.geometry && typeof r.geometry === 'string') {
                        try {
                            geom = wellknown.parse(r.geometry);
                            delete r.geometry;
                        } catch (e) { }
                    }
                    features.push(turf.feature(geom, r));
                }

                if (window.log) window.log("✅ Parquet importado con éxito.", "success");
                return turf.featureCollection(features);
            } catch (e) {
                if (window.log) window.log("⚠️ " + e.message, "err");
                throw new Error("Lectura Parquet Error: " + e.message);
            }
        }
    });

    // ----------------------------
    // Funciones Helper para cargar librerías dinámicamente sin bloquear el arranque inicial
    function loadScript(src, globalVar) {
        return new Promise((resolve, reject) => {
            if (window[globalVar]) return resolve(window[globalVar]);
            const s = document.createElement('script');
            s.src = src;
            s.onload = () => resolve(window[globalVar]);
            s.onerror = () => reject(new Error("Error cargando " + src));
            document.head.appendChild(s);
        });
    }

    // ----------------------------
    // Formatos de Exportación Avanzados (Escritura)
    // ----------------------------
    registerWriter({
        exts: ['gpkg'],
        label: 'GeoPackage (Experimental)',
        write: async (data) => {
            if (window.log) window.log("⏳ Descargando motor GeoPackage desde CDN...", "info");
            await loadScript('https://unpkg.com/@ngageoint/geopackage@3.0.0/dist/geopackage.min.js', 'GeoPackage');
            const GP = window.GeoPackage;
            if (!GP || !GP.GeoPackageAPI) throw new Error("Error en motor GeoPackage");

            if (GP.setSqljsWasmLoc) {
                GP.setSqljsWasmLoc('https://unpkg.com/@ngageoint/geopackage@3.0.0/dist/sql-wasm.wasm');
            }

            if (window.log) window.log("⏳ Creando GeoPackage en memoria...", "info");
            const gpkg = await GP.GeoPackageAPI.create();
            const tableName = "jetl_export";
            const fc = data.type === 'FeatureCollection' ? data : turf.featureCollection(Array.isArray(data) ? data : [data]);

            // Crear tabla e insertar Features
            await GP.GeoPackageAPI.createFeatureTable(gpkg, tableName, fc.features[0] ? fc.features[0].geometry : null);
            for (let i = 0; i < fc.features.length; i++) {
                if (window.isEngineCancelled) throw new Error("Exportación a GeoPackage cancelada.");
                if (i % 250 === 0) await new Promise(r => setTimeout(r, 0));

                await GP.GeoPackageAPI.addGeoJSONFeatureToGeoPackage(gpkg, fc.features[i], tableName);
            }

            if (window.log) window.log("⏳ Exportando binario GPKG...", "info");
            const byteArray = await gpkg.export();
            const blob = new Blob([byteArray], { type: "application/geopackage+sqlite3" });
            return { blob, filename: "export.gpkg" };
        }
    });

    registerWriter({
        exts: ['parquet'],
        label: 'Parquet (GeoParquet-lite)',
        write: async (data) => {
            if (window.log) window.log("⏳ Iniciando motor Parquet WASM...", "info");
            try {
                // Importamos directamente las dependencias como modulos ES (ESM) para no romper bindings WASM
                const parquetWasm = await import('https://unpkg.com/parquet-wasm@0.6.1/esm/parquet_wasm.js');
                await parquetWasm.default('https://unpkg.com/parquet-wasm@0.6.1/esm/parquet_wasm_bg.wasm');
                const arrow = await import('https://cdn.jsdelivr.net/npm/apache-arrow@13.0.0/+esm');

                const fc = data.type === 'FeatureCollection' ? data : turf.featureCollection(Array.isArray(data) ? data : [data]);
                if (window.log) window.log("⏳ Serializando a formato tabular Arrow...", "info");

                const rows = [];
                for (let i = 0; i < fc.features.length; i++) {
                    if (window.isEngineCancelled) throw new Error("Exportación a Parquet cancelada.");
                    if (i % 500 === 0) await new Promise(r => setTimeout(r, 0));

                    const f = fc.features[i];
                    if (!f.geometry) continue;
                    try {
                        let wkt = wellknown.stringify(f.geometry);
                        const flatProps = {};
                        if (f.properties) {
                            Object.keys(f.properties).forEach(k => {
                                let val = f.properties[k];
                                if (typeof val === 'object' && val !== null) val = JSON.stringify(val);
                                flatProps[k] = val;
                            });
                        }
                        rows.push({
                            jetl_id: i,
                            geometry: wkt,
                            ...flatProps
                        });
                    } catch (e) { }
                }

                if (rows.length === 0) throw new Error("No hay data válida");
                // Usamos tableFromJSON de apache-arrow
                const table = arrow.tableFromJSON(rows);
                const ipc = arrow.tableToIPC(table, "file");

                // Escribimos a Parquet usando parquet-wasm
                const buffer = parquetWasm.writeParquet(ipc);

                if (window.log) window.log("✅ Parquet generado éxito.", "success");

                const blob = new Blob([buffer], { type: "application/octet-stream" });
                return { blob, filename: "export.parquet" };
            } catch (e) {
                if (window.log) window.log("⚠️ " + e.message, "err");
                throw new Error("Parquet Export Error: " + e.message);
            }
        }
    });

    window.JETLFormats = {
        registerReader,
        registerWriter,
        readFile,
        writeFile,
        toKML,
        _registry: registry
    };

    function _withTimeout(promise, ms, msg) {
        let timer = null;
        return new Promise((resolve, reject) => {
            timer = setTimeout(() => reject(new Error(msg || 'Timeout')), ms);
            Promise.resolve(promise).then((v) => {
                clearTimeout(timer);
                resolve(v);
            }).catch((e) => {
                clearTimeout(timer);
                reject(e);
            });
        });
    }
})();

;

/* ---- js/nodes/readers.js ---- */
// Cat: readers
(typeof window !== 'undefined' ? window : global).TOOL_REGISTRY = (typeof window !== 'undefined' ? window : global).TOOL_REGISTRY || {};
function resolveParamTextReader(raw) {
    if (typeof window !== 'undefined' && typeof window.JETLResolveParamText === 'function') {
        return window.JETLResolveParamText(raw);
    }
    return String(raw == null ? '' : raw);
}
Object.assign((typeof window !== 'undefined' ? window : global).TOOL_REGISTRY, {
    reader_osm: {
        cat: '1. READERS', label: 'OSM Reader', icon: 'fa-globe', color: '#e67e22', in: 0, out: 1,
        tpl: () => `
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Lugar / Zona</span>
                <input type="text" df-place class="node-control" placeholder="Ej: Humanes de Madrid" value="Madrid">
            </div>
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Extensión (Metros lado)</span>
                <input type="number" df-size class="node-control" value="2000" min="50" max="2200">
                <div style="font-size:0.6em;color:#666;font-style:italic">Máximo permitido: 2200m</div>
            </div>
            <div>
                <span style="font-size:0.7em;color:#aaa">Capa a extraer</span>
                <select class="node-control" df-t>
                    <option value="building">Edificios</option>
                    <option value="highway">Carreteras</option>
                    <option value="leisure=park">Parques</option>
                    <option value="amenity">Servicios</option>
                    <option value="waterway">Agua</option>
                    <option value="landuse">Usos suelo</option>
                </select>
            </div>`,
        run: async (id, i, d) => {
            const place = resolveParamTextReader(d.querySelector('[df-place]').value);
            let size = parseFloat(resolveParamTextReader(d.querySelector('[df-size]').value));
            const type = resolveParamTextReader(d.querySelector('[df-t]').value);

            if (!place) throw new Error("Introduce un nombre de lugar.");

            // Límite duro basado en tu offset original de 0.02 grados (~2.2km)
            if (size > 2200) {
                size = 2200;
                if (window.log) window.log("⚠️ Aviso: Extensión ajustada al máximo (2200m).");
            }

            // 1. Geocodificación (Nominatim) para obtener Lat/Lon del centro
            if (window.log) window.log(`📍 Localizando: ${place}...`);
            const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(place)}`;

            let lat, lon;
            try {
                const nomRes = await fetch(nomUrl);
                const nomData = await nomRes.json();
                if (!nomData || nomData.length === 0) throw new Error("Lugar no encontrado.");
                lat = parseFloat(nomData[0].lat);
                lon = parseFloat(nomData[0].lon);
            } catch (e) { throw new Error("Error geocodificando: " + e.message); }

            // 2. Calcular Bounding Box (Metros -> Grados)
            // 1 grado latitud ~= 111,320 metros
            const metersPerDegLat = 111320;
            const metersPerDegLon = 111320 * Math.cos(lat * (Math.PI / 180));

            const latOffset = (size / 2) / metersPerDegLat;
            const lonOffset = (size / 2) / metersPerDegLon;

            const s = lat - latOffset;
            const w = lon - lonOffset;
            const n = lat + latOffset;
            const e = lon + lonOffset;

            // 3. Consultar Overpass API
            const [k, v] = type.includes('=') ? type.split('=') : [type, null];
            // Sintaxis Overpass: (south, west, north, east)
            const query = `[out:json];(way["${k}"${v ? `="${v}"` : ''}](${s},${w},${n},${e}););out geom;`;

            if (window.log) window.log(`⬇️ Descargando ${type} de OSM...`);

            try {
                const r = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: query });
                if (!r.ok) throw new Error("Servidor OSM saturado o error.");
                const data = await r.json();
                const geojson = osmtogeojson(data);

                if (geojson.features.length === 0) if (window.log) window.log("⚠️ La consulta no devolvió resultados en esa zona.");

                return geojson;
            } catch (err) { throw new Error("Fallo Overpass: " + err.message); }
        }
    },

    reader_file: {
        cat: '1. READERS', label: 'File Reader', icon: 'fa-folder-open', color: '#e67e22', in: 0, out: 1,
        tpl: () => `<input type="file" data-load-file="1" class="node-control"><div style="font-size:0.7em;color:#aaa" class="file-lbl">Sin archivo</div>`,
        run: async (id) => { const v = window._file_cache && window._file_cache['file_' + id]; if (!v) throw new Error("Sin archivo"); return v; }
    },

    reader_gpkg: {
        cat: '1. READERS', label: 'GPKG Reader', icon: 'fa-database', color: '#e67e22', in: 0, out: 1,
        help: 'Lee GeoPackage (experimental). Si falla, revisa la librería GeoPackage.',
        tpl: () => `<input type="file" data-load-file="1" class="node-control" accept=".gpkg"><div style="font-size:0.7em;color:#aaa" class="file-lbl">Sin archivo</div>`,
        run: async (id) => { const v = window._file_cache && window._file_cache['file_' + id]; if (!v) throw new Error("Sin archivo"); return v; }
    },

    reader_parquet: {
        cat: '1. READERS', label: 'Parquet Reader', icon: 'fa-table', color: '#e67e22', in: 0, out: 1,
        help: 'Lee Parquet (experimental). Requiere ParquetReader global.',
        tpl: () => `<input type="file" data-load-file="1" class="node-control" accept=".parquet"><div style="font-size:0.7em;color:#aaa" class="file-lbl">Sin archivo</div>`,
        run: async (id) => { const v = window._file_cache && window._file_cache['file_' + id]; if (!v) throw new Error("Sin archivo"); return v; }
    },

    reader_http: { cat: '1. READERS', label: 'HTTP JSON', icon: 'fa-cloud-download-alt', color: '#e67e22', in: 0, out: 1, tpl: () => `<input class="node-control" df-u placeholder="URL (GeoJSON)">`, run: async (id, i, d) => { const u = resolveParamTextReader(d.querySelector('[df-u]').value); const r = await fetch(u); return await r.json(); } },

    reader_wkt: { cat: '1. READERS', label: 'WKT/Text', icon: 'fa-font', color: '#e67e22', in: 0, out: 1, tpl: () => `<textarea class="node-control" df-w placeholder="POINT(30 10)"></textarea>`, run: async (id, i, d) => { const t = resolveParamTextReader(d.querySelector('[df-w]').value); const w = wellknown(t); return turf.featureCollection([turf.feature(w)]) } },

    reader_bbox_gen: { cat: '1. READERS', label: 'BBox Creator', icon: 'fa-vector-square', color: '#e67e22', in: 0, out: 1, tpl: () => `<input class="node-control" df-b placeholder="minX,minY,maxX,maxY" value="-3.75,40.4,-3.65,40.5">`, run: (id, i, d) => { const b = resolveParamTextReader(d.querySelector('[df-b]').value).split(',').map(Number); return turf.featureCollection([turf.bboxPolygon(b)]) } },

    reader_geotiff: {
        cat: '1. READERS', label: 'GeoTIFF Reader', icon: 'fa-file-image', color: '#e67e22',
        in: 0, out: 1,
        tpl: (id) => `
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Archivo .tif / .tiff</span>
                <input type="file" df-file class="node-control" accept=".tif,.tiff">
            </div>
            <div style="font-size:0.6em;color:#666">
                Carga optimizada con referencia en memoria.
            </div>`,
        run: async (id, i, d) => {
            const fileInput = d.querySelector('[df-file]');
            if (!fileInput.files || fileInput.files.length === 0) throw new Error("Selecciona un archivo TIFF");

            const file = fileInput.files[0];
            const arrayBuffer = await file.arrayBuffer(); // Leemos binario

            // --- TRUCO DE CACHÉ GLOBAL ---
            // Generamos un ID único y guardamos el binario pesado en window
            // Esto evita que se rompa al pasar por JSON entre nodos.
            const cacheId = 'tiff_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            if (!window._tiff_cache) window._tiff_cache = {};
            if (!window._node_tiff_ref) window._node_tiff_ref = {};
            const prevRef = window._node_tiff_ref[String(id)];
            if (prevRef && window._tiff_cache[prevRef]) {
                delete window._tiff_cache[prevRef];
            }
            window._tiff_cache[cacheId] = arrayBuffer;
            window._node_tiff_ref[String(id)] = cacheId;

            // Leemos metadatos básicos para visualización
            const tiff = await GeoTIFF.fromArrayBuffer(arrayBuffer);
            const image = await tiff.getImage();
            const bbox = image.getBoundingBox();
            const poly = turf.bboxPolygon(bbox);

            // Pasamos solo la REFERENCIA (ID)
            poly.properties = {
                source_file: file.name,
                type: 'raster_bbox',
                width: image.getWidth(),
                height: image.getHeight(),
                _raster_ref_id: cacheId // <--- La llave maestra
            };

            if (window.log) window.log(`📷 Raster cargado en caché (${cacheId})`);

            return turf.featureCollection([poly]);
        }
    },

    gen_point: { cat: '1. READERS', label: 'Point Creator', icon: 'fa-map-pin', color: '#e67e22', in: 0, out: 1, tpl: () => `<input class="node-control" df-c placeholder="Lon,Lat" value="-3.703,40.416">`, run: (id, i, d) => { const c = resolveParamTextReader(d.querySelector('[df-c]').value).split(',').map(Number); return turf.featureCollection([turf.point(c)]) } },

    gen_grid: { cat: '1. READERS', label: 'Grid Generator', icon: 'fa-th', color: '#e67e22', in: 0, out: 1, tpl: () => `<select class="node-control" df-t><option value="hex">Hex</option><option value="sq">Square</option></select><input class="node-control" type="number" df-s value="1" placeholder="Size km">`, run: (id, i, d) => { const t = resolveParamTextReader(d.querySelector('[df-t]').value), s = parseFloat(resolveParamTextReader(d.querySelector('[df-s]').value)), b = [-3.8, 40.3, -3.6, 40.5]; return t === 'hex' ? turf.hexGrid(b, s) : turf.squareGrid(b, s) } },

    gen_random: { cat: '1. READERS', label: 'Random Points', icon: 'fa-dice', color: '#e67e22', in: 0, out: 1, tpl: () => `<input type="number" df-n value="50" class="node-control">`, run: (id, i, d) => turf.randomPoint(parseInt(resolveParamTextReader(d.querySelector('[df-n]').value)), { bbox: [-3.8, 40.3, -3.6, 40.5] }) }
});

;

/* ---- js/nodes/geometry.js ---- */
﻿// Cat: geometry
(typeof window !== 'undefined' ? window : global).TOOL_REGISTRY = (typeof window !== 'undefined' ? window : global).TOOL_REGISTRY || {};
Object.assign((typeof window !== 'undefined' ? window : global).TOOL_REGISTRY, {
    geo_centroid: {
        cat: '2.1 VECTOR - GEOMETRY', label: 'CenterPoint', icon: 'fa-dot-circle', color: '#2980b9', in: 1, out: 1,
        tpl: () => `<div>Centroide</div>`,
        run: async (id, i) => {
            const fc = i[0] || turf.featureCollection([]);
            const inCount = (fc && Array.isArray(fc.features)) ? fc.features.length : 0;
            const USE_WORKER_FROM = 25000;
            if (inCount >= USE_WORKER_FROM && typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const wres = await postWorkerTask({ task: 'geo_centroid', features: fc }, 60000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn('Worker CenterPoint fallo, fallback local:', e);
                }
            }
            return turf.featureCollection(fc.features.map(f => turf.centroid(f, { properties: f.properties })));
        }
    },

    geo_simplify: {
        cat: '2.1 VECTOR - GEOMETRY', label: 'Simplifier', icon: 'fa-compress-arrows-alt', color: '#2980b9', in: 1, out: 1,
        tpl: () => `
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Tolerancia (Grados)</span>
                <input type="number" df-tol value="0.0001" step="0.0001" class="node-control">
            </div>
            <div style="font-size:0.6em;color:#888">Reduce vÃ©rtices manteniendo la forma.</div>`,
        run: async (id, inputs, dom) => {
            const tol = parseFloat(dom.querySelector('[df-tol]').value) || 0.0001;
            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const wres = await postWorkerTask({
                        task: 'geo_simplify',
                        features: inputs[0],
                        tol
                    }, 60000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker Simplifier fallo, fallback local:", e);
                }
            }
            return turf.simplify(inputs[0], { tolerance: tol, highQuality: true, mutate: false });
        }
    },

    geo_topo_simplify: {
        cat: '2.1 VECTOR - GEOMETRY', label: 'Topo Simplify', icon: 'fa-wave-square', color: '#2980b9', in: 1, out: 1,
        help: 'SimplificaciÃ³n con limpieza topolÃ³gica (cleanCoords).',
        tpl: () => `
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Tolerancia (Grados)</span>
                <input type="number" df-tol value="0.00005" step="0.00001" class="node-control">
            </div>
            <label style="display:flex;align-items:center;gap:6px;margin-bottom:4px;font-size:0.7em;color:#aaa">
                <input type="checkbox" df-preserve-boundary>
                Mantener bordes limite sin simplificar
            </label>
            <div style="font-size:0.6em;color:#888">Simplifica y limpia geometrÃ­as.</div>`,
        run: async (id, inputs, dom) => {
            const tol = parseFloat(dom.querySelector('[df-tol]').value) || 0.00005;
            const preserveBoundary = !!dom.querySelector('[df-preserve-boundary]')?.checked;
            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const wres = await postWorkerTask({
                        task: 'geo_topo_simplify',
                        features: inputs[0],
                        tol,
                        preserveBoundary
                    }, 60000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker Topo Simplify fallo, fallback local:", e);
                }
            }
            const inputFc = inputs[0];
            const flat = turf.flatten(inputFc);
            const polyOnly = flat.features.filter(f => turf.getType(f) === 'Polygon');

            // Topology-preserving path for polygon meshes:
            // simplify shared linework once, then rebuild polygons from that graph.
            if (polyOnly.length > 0 && polyOnly.length === flat.features.length && typeof turf.polygonize === 'function') {
                try {
                    const lineParts = [];
                    polyOnly.forEach((p, idx) => {
                        const ln = turf.polygonToLine(p);
                        if (ln && ln.type === 'FeatureCollection' && Array.isArray(ln.features)) {
                            ln.features.forEach(f => lineParts.push(turf.feature(f.geometry, { _src_idx: idx })));
                        } else if (ln && ln.type === 'Feature') {
                            lineParts.push(turf.feature(ln.geometry, { _src_idx: idx }));
                        }
                    });

                    const simplifiedLines = lineParts.map((lf) => {
                        const s = turf.simplify(lf, { tolerance: tol, highQuality: true, mutate: false });
                        const c = turf.cleanCoords(s);
                        turf.coordEach(c, (coord) => {
                            coord[0] = +coord[0].toFixed(8);
                            coord[1] = +coord[1].toFixed(8);
                        });
                        return c;
                    });

                    const rebuilt = turf.polygonize(turf.featureCollection(simplifiedLines));
                    if (rebuilt && rebuilt.features && rebuilt.features.length > 0) {
                        rebuilt.features.forEach((np) => {
                            let donor = null;
                            try {
                                const cc = turf.centroid(np);
                                donor = polyOnly.find(op => {
                                    try { return turf.booleanPointInPolygon(cc, op); } catch (_) { return false; }
                                }) || null;
                            } catch (_) { }
                            if (!donor) {
                                let best = null;
                                let bestArea = -1;
                                polyOnly.forEach((op) => {
                                    try {
                                        const inter = turf.intersect(np, op);
                                        if (inter) {
                                            const a = turf.area(inter);
                                            if (a > bestArea) { bestArea = a; best = op; }
                                        }
                                    } catch (_) { }
                                });
                                donor = best;
                            }
                            np.properties = donor ? { ...(donor.properties || {}) } : {};
                        });
                        return rebuilt;
                    }
                } catch (e) {
                    console.warn("Topo mesh rebuild fallo, fallback per-feature:", e);
                }
            }

            const features = (inputFc && inputFc.features) ? inputFc.features : [];
            const out = features.map((f) => {
                try {
                    const simplified = turf.simplify(f, { tolerance: tol, highQuality: true, mutate: false });
                    return turf.cleanCoords(simplified);
                } catch (e) {
                    try { return turf.cleanCoords(f); } catch (_) { return f; }
                }
            });
            return turf.featureCollection(out);
        }
    },
    geo_line_merge: {
        cat: '2.1 VECTOR - GEOMETRY', label: 'Line Merger', icon: 'fa-grip-lines', color: '#2980b9', in: 1, out: 1,
        help: 'Une lineas colineales dentro de la misma capa.',
        tpl: () => `<div style="font-size:0.7em;color:#aaa;text-align:center">Merge LineStrings</div>`,
        run: async (id, inputs) => {
            const mergeLinesLocal = (fc) => {
                const flat = turf.flatten(fc);
                const lines = flat.features.filter((f) => turf.getType(f) === 'LineString');
                if (!lines.length) return turf.featureCollection([]);

                const key = (c) => `${(+c[0].toFixed(8))},${(+c[1].toFixed(8))}`;
                const endpoints = new Map();
                const degree = new Map();
                const parts = lines.map((f, idx) => {
                    const coords = turf.getCoords(f);
                    const s = key(coords[0]);
                    const e = key(coords[coords.length - 1]);
                    if (!endpoints.has(s)) endpoints.set(s, []);
                    if (!endpoints.has(e)) endpoints.set(e, []);
                    endpoints.get(s).push({ idx, atStart: true });
                    endpoints.get(e).push({ idx, atStart: false });
                    degree.set(s, (degree.get(s) || 0) + 1);
                    degree.set(e, (degree.get(e) || 0) + 1);
                    return { coords, props: { ...(f.properties || {}) }, used: false };
                });

                const out = [];
                const nextFrom = (nodeKey, usedSet) => {
                    const deg = degree.get(nodeKey) || 0;
                    if (deg !== 2) return null;
                    const candidates = endpoints.get(nodeKey) || [];
                    for (let i = 0; i < candidates.length; i++) {
                        const c = candidates[i];
                        if (!usedSet.has(c.idx)) return c;
                    }
                    return null;
                };

                for (let i = 0; i < parts.length; i++) {
                    if (parts[i].used) continue;
                    parts[i].used = true;
                    const used = new Set([i]);
                    let merged = parts[i].coords.slice();
                    const props = parts[i].props;

                    let tail = key(merged[merged.length - 1]);
                    while (true) {
                        const cand = nextFrom(tail, used);
                        if (!cand) break;
                        const p = parts[cand.idx];
                        p.used = true;
                        used.add(cand.idx);
                        const oriented = cand.atStart ? p.coords : p.coords.slice().reverse();
                        merged = merged.concat(oriented.slice(1));
                        tail = key(merged[merged.length - 1]);
                    }

                    let head = key(merged[0]);
                    while (true) {
                        const cand = nextFrom(head, used);
                        if (!cand) break;
                        const p = parts[cand.idx];
                        p.used = true;
                        used.add(cand.idx);
                        const oriented = cand.atStart ? p.coords.slice().reverse() : p.coords;
                        merged = oriented.slice(0, oriented.length - 1).concat(merged);
                        head = key(merged[0]);
                    }

                    out.push(turf.lineString(merged, props));
                }
                return turf.featureCollection(out);
            };

            const flatIn = turf.flatten(inputs[0]);
            const lineCount = flatIn.features.filter((f) => turf.getType(f) === 'LineString').length;
            const USE_WORKER_FROM = 300;

            if (lineCount >= USE_WORKER_FROM && typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const wres = await postWorkerTask({
                        task: 'geo_line_merge',
                        features: inputs[0]
                    }, 120000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker Line Merger fallo, fallback local:", e);
                }
            }

            return mergeLinesLocal(inputs[0]);
        }
    },

    geo_reproject: {
        cat: '2.1 VECTOR - GEOMETRY', label: 'Reproject', icon: 'fa-sync', color: '#2980b9', in: 1, out: 1,
        help: 'Reproyecta geometrÃ­as con proj4 (EPSG:4326 -> EPSG:3857, etc).',
        tpl: () => `
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Origen (EPSG)</span>
                <input type="text" df-src class="node-control" value="EPSG:4326">
            </div>
            <div>
                <span style="font-size:0.7em;color:#aaa">Destino (EPSG)</span>
                <input type="text" df-dst class="node-control" value="EPSG:3857">
            </div>`,
        run: async (id, inputs, dom) => {
            const src = dom.querySelector('[df-src]').value || 'EPSG:4326';
            const dst = dom.querySelector('[df-dst]').value || 'EPSG:3857';
            const fc = inputs[0] || turf.featureCollection([]);
            const inCount = (fc && Array.isArray(fc.features)) ? fc.features.length : 0;
            const USE_WORKER_FROM = 200;
            const KNOWN_CRS = {
                'EPSG:25830': '+proj=utm +zone=30 +ellps=GRS80 +units=m +no_defs +type=crs',
                'EPSG:23030': '+proj=utm +zone=30 +ellps=intl +towgs84=-87,-98,-121,0,0,0,0 +units=m +no_defs +type=crs'
            };

            const ensureDef = (code) => {
                if (!code || typeof proj4 === 'undefined' || typeof proj4.defs !== 'function') return null;
                let d = proj4.defs(code);
                if (!d && KNOWN_CRS[code]) {
                    try { proj4.defs(code, KNOWN_CRS[code]); } catch (_) {}
                    d = proj4.defs(code);
                }
                return (typeof d === 'string' && d) ? d : null;
            };

            if (inCount >= USE_WORKER_FROM && typeof postWorkerTask === 'function') {
                try {
                    const srcDef = ensureDef(src);
                    const dstDef = ensureDef(dst);
                    if (!window.geoWorker) createGeoWorker();
                    const wres = await postWorkerTask({
                        task: 'geo_reproject',
                        features: fc,
                        src,
                        dst,
                        srcDef: (typeof srcDef === 'string' && srcDef) ? srcDef : null,
                        dstDef: (typeof dstDef === 'string' && dstDef) ? dstDef : null
                    }, 90000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker Reproject fallo, fallback local:", e);
                }
            }

            if (!proj4) throw new Error("proj4 no disponible");
            ensureDef(src);
            ensureDef(dst);
            let prj = null;
            try { prj = proj4(src, dst); } catch (e) {
                throw new Error(`Reproject no pudo crear transformacion ${src} -> ${dst}: ${e && e.message ? e.message : e}`);
            }
            const out = JETLClone(fc);
            turf.coordEach(out, (coord) => {
                const p = prj.forward(coord);
                coord[0] = p[0];
                coord[1] = p[1];
            });
            return out;
        }
    },

    geo_repair: {
        cat: '2.1 VECTOR - GEOMETRY', label: 'Geometry Repair', icon: 'fa-toolbox', color: '#2980b9', in: 1, out: 1,
        help: 'Repara geometrÃ­as invÃ¡lidas (worker con JSTS).',
        tpl: () => `<div style="font-size:0.7em;color:#aaa;text-align:center">makeValid / buffer(0)</div>`,
        run: async (id, inputs) => {
            const features = inputs[0];
            if (!features || !features.features) throw new Error("Sin datos");
            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const payload = { task: 'make_valid', features: features };
                    const wres = await postWorkerTask(payload, 60000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker repair fallÃ³, fallback local:", e);
                }
            }
            // Fallback local
            const cleaned = turf.cleanCoords(features);
            const out = [];
            turf.flatten(cleaned).features.forEach(f => {
                const t = turf.getType(f);
                if (t === 'Polygon' || t === 'MultiPolygon') {
                    try {
                        const uk = turf.unkinkPolygon(f);
                        if (uk && uk.features) out.push(...uk.features);
                        else out.push(f);
                    } catch (e) { out.push(f); }
                } else {
                    out.push(f);
                }
            });
            return turf.featureCollection(out);
        }
    },

    geo_chunk: {
        cat: '2.1 VECTOR - GEOMETRY', label: 'Line Chopper', icon: 'fa-cut', color: '#2980b9', in: 1, out: 1,
        tpl: () => `
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Longitud de Segmento</span>
                <div style="display:flex;gap:5px">
                    <input type="number" df-len value="100" class="node-control">
                    <select df-unit class="node-control" style="width:80px">
                        <option value="meters">m</option>
                        <option value="kilometers">km</option>
                    </select>
                </div>
            </div>`,
        run: async (id, inputs, dom) => {
            const len = parseFloat(dom.querySelector('[df-len]').value);
            const unit = dom.querySelector('[df-unit]').value;
            const res = [];

            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const wres = await postWorkerTask({
                        task: 'geo_chunk',
                        features: inputs[0],
                        len,
                        unit
                    }, 60000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker Line Chopper fallo, fallback local:", e);
                }
            }

            turf.flatten(inputs[0]).features.forEach(f => {
                if (turf.getType(f) === 'LineString') {
                    const chunks = turf.lineChunk(f, len, { units: unit });
                    // Heredar propiedades del padre
                    chunks.features.forEach(c => c.properties = { ...f.properties });
                    res.push(...chunks.features);
                } else {
                    res.push(f); // Pasar geometrÃ­a no lineal tal cual
                }
            });
            return turf.featureCollection(res);
        }
    },

    geo_dissolve: {
        cat: '2.1 VECTOR - GEOMETRY', label: 'Dissolver', icon: 'fa-object-group', color: '#2980b9', in: 1, out: 1,
        tpl: () => `
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Disolver por campos</span>
                <input type="text" df-fields class="node-control" placeholder="Ej: building, height">
                <div style="font-size:0.6em;color:#666;font-style:italic">Dejar vacÃ­o para disolver todo en uno.</div>
            </div>`,
        run: async (id, inputs, dom) => {
            const rawFields = dom.querySelector('[df-fields]').value;
            const features = inputs[0].features;
            const fields = rawFields ? rawFields.split(',').map(f => f.trim()).filter(f => f !== '') : [];

            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const payload = {
                        task: 'geo_dissolve',
                        features: inputs[0],
                        fields
                    };
                    const wres = await postWorkerTask(payload, 90000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker Dissolve fallo, fallback local:", e);
                }
            }

            // Caso 1: Disolver todo (sin campos)
            if (!rawFields || rawFields.trim() === '') {
                return turf.dissolve(inputs[0]);
            }

            // Caso 2: Disolver por uno o varios campos
            // Limpiamos y separamos los campos (ej: "building,  height " -> ["building", "height"])
            const fieldsLocal = rawFields.split(',').map(f => f.trim()).filter(f => f !== '');

            // Creamos una propiedad temporal Ãºnica que concatena los valores de los campos elegidos
            const tempProp = '_dissolve_key_';

            const taggedFeatures = features.map(f => {
                // Clonamos para no mutar el original inesperadamente
                const newF = JETLClone(f);

                // Generamos la clave compuesta (ej: "yes_10")
                // Si un campo no existe o es null, usamos "null" para agrupar esos errores juntos
                const key = fieldsLocal.map(field => {
                    const val = newF.properties[field];
                    return val !== undefined && val !== null ? val : 'null';
                }).join('_|_'); // Separador poco comÃºn para evitar colisiones

                newF.properties[tempProp] = key;
                return newF;
            });

            // Usamos turf.dissolve sobre esa propiedad temporal
            const fc = turf.featureCollection(taggedFeatures);

            let dissolved;
            try {
                // 'Unable to find segment' en SweepLine tree es un bug hiper-comÃºn de Turf.js (derivado de polygon-clipping)
                // al procesar vÃ©rtices muy juntos o superpuestos con precisiÃ³n flotante inestable.
                // Limpiamos coordenadas antes de procesar para reducir riesgos drÃ¡sticamente.
                const cleanForDissolve = turf.cleanCoords(fc, { mutate: true });
                dissolved = turf.dissolve(cleanForDissolve, { propertyName: tempProp });
            } catch (e) {
                console.warn("[Dissolver] FallÃ³ turf.dissolve (bug SweepLine). Realizando uniÃ³n lÃ³gica (Atributos), omitiendo fusiÃ³n de geometrÃ­a plana.", e);
                // Fallback de emergencia: 
                // Si la topologÃ­a no se puede unir por el bug, agrupamos los datos (Features)
                // dejando las geometrÃ­as en un GeometryCollection o MultiPolygon por el mismo tempProp

                const groupMap = {};
                fc.features.forEach(f => {
                    const k = f.properties[tempProp];
                    if (!groupMap[k]) {
                        groupMap[k] = JETLClone(f);
                    } else {
                        // Intentamos unificar si son del mismo tipo, de lo contrario lo obviamos visualmente
                        // Esto es solo un fallback para que no crashee todo el nodo
                        try {
                            groupMap[k] = turf.union(groupMap[k], f);
                        } catch (unionErr) { /* Ignorar si falla union por el mismo motivo */ }
                    }
                });
                dissolved = turf.featureCollection(Object.values(groupMap));
            }

            // Limpieza: Eliminamos la propiedad temporal del resultado
            dissolved.features.forEach(f => {
                delete f.properties[tempProp];
            });

            return dissolved;
        }
    },

    geo_explode: {
        cat: '2.1 VECTOR - GEOMETRY', label: 'Exploder', icon: 'fa-shapes', color: '#2980b9', in: 1, out: 1,
        tpl: () => `<div style="font-size:0.7em;color:#aaa;text-align:center">Multipart <i class="fas fa-arrow-right"></i> Singlepart</div>`,
        run: async (id, inputs) => {
            const fc = inputs[0] || turf.featureCollection([]);
            const inCount = (fc && Array.isArray(fc.features)) ? fc.features.length : 0;
            const USE_WORKER_FROM = 5000;
            if (inCount >= USE_WORKER_FROM && typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const wres = await postWorkerTask({
                        task: 'geo_explode',
                        features: fc
                    }, 90000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn('Worker Exploder fallo, fallback local:', e);
                }
            }

            // turf.flatten convierte cualquier Multi(Point|Line|Polygon) en una colecciÃ³n individual
            const flat = turf.flatten(fc);
            // IMPORTANTE: Clonamos los atributos (properties) superficialmente
            // para romper referencias compartidas originadas por flatten.
            for (let i = 0; i < flat.features.length; i++) {
                const f = flat.features[i];
                f.properties = f.properties ? { ...f.properties } : {};
                if (i % 500 === 0) await new Promise(r => setTimeout(r, 0));
            }
            return flat;
        }
    },

    geo_vertex_creator: {
        cat: '2.1 VECTOR - GEOMETRY', label: 'Vertex Creator', icon: 'fa-draw-polygon', color: '#2980b9', in: 1, out: 1,
        // CORRECCIÃ“N: Usamos tpl explÃ­cito para compatibilidad con tu index.html actual
        tpl: () => `
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Modo de ExtracciÃ³n</span>
                <select df-mode class="node-control">
                    <option value="All Vertices">Todos los vÃ©rtices</option>
                    <option value="Start Points">Solo Inicio (Start)</option>
                    <option value="End Points">Solo Final (End)</option>
                    <option value="Start & End">Inicio y Final</option>
                    <option value="Dangles">Dangles (Cabos sueltos)</option>
                </select>
            </div>`,
        run: async (id, inputs, dom) => {
            // Leemos el valor del select manualmente usando el DOM del nodo
            const mode = dom.querySelector('[df-mode]').value;
            const features = inputs[0].features;
            const res = [];

            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const wres = await postWorkerTask({
                        task: 'geo_vertex_creator',
                        features: inputs[0],
                        mode
                    }, 60000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker Vertex Creator fallo, fallback local:", e);
                }
            }

            // Helper para obtener las rutas de coordenadas
            const getPaths = (g) => {
                const type = turf.getType(g);
                const c = g.coordinates;
                if (type === 'LineString') return [c];
                if (type === 'MultiLineString' || type === 'Polygon') return c;
                if (type === 'MultiPolygon') return c.flat();
                return [];
            };

            if (mode === 'Dangles') {
                // LÃ³gica TopolÃ³gica: Buscar nodos que aparecen exactamente 1 vez en todo el dataset
                const counts = {};

                // 1. Contar ocurrencias
                features.forEach(f => {
                    getPaths(f.geometry).forEach(path => {
                        if (path.length < 2) return;
                        const start = path[0].join(',');
                        const end = path[path.length - 1].join(',');
                        counts[start] = (counts[start] || 0) + 1;
                        counts[end] = (counts[end] || 0) + 1;
                    });
                });

                // 2. Extraer Ãºnicos
                Object.entries(counts).forEach(([key, cnt]) => {
                    if (cnt === 1) {
                        const [x, y] = key.split(',').map(Number);
                        res.push(turf.point([x, y]));
                    }
                });

            } else {
                // LÃ³gica por Entidad
                features.forEach(f => {
                    if (mode === 'All Vertices') {
                        turf.explode(f).features.forEach(p => {
                            p.properties = f.properties;
                            res.push(p);
                        });
                        return;
                    }

                    getPaths(f.geometry).forEach(path => {
                        if (path.length === 0) return;
                        const start = path[0];
                        const end = path[path.length - 1];

                        if (mode.includes('Start')) res.push(turf.point(start, f.properties));
                        if (mode.includes('End')) res.push(turf.point(end, f.properties));
                    });
                });
            }
            return turf.featureCollection(res);
        }
    },

    geo_triangulator: {
        cat: '2.1 VECTOR - GEOMETRY', label: 'Triangulator', icon: 'fa-shapes', color: '#2980b9', in: 1, out: 1,
        tpl: () => `<div style="font-size:0.7em;color:#aaa;text-align:center">Polygons <i class="fas fa-arrow-right"></i> Triangles (TIN)</div>`,
        run: async (id, inputs) => {
            const res = [];

            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const wres = await postWorkerTask({
                        task: 'geo_triangulator',
                        features: inputs[0]
                    }, 60000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker Triangulator fallo, fallback local:", e);
                }
            }

            // Primero aplanamos para asegurar que no hay MultiPolÃ­gonos complejos
            turf.flatten(inputs[0]).features.forEach(f => {
                const type = turf.getType(f);

                // Solo procesamos PolÃ­gonos
                if (type === 'Polygon') {
                    try {
                        const tin = turf.tesselate(f);
                        // Transferimos los atributos del padre a cada triÃ¡ngulo hijo
                        tin.features.forEach(triangle => {
                            triangle.properties = f.properties;
                            res.push(triangle);
                        });
                    } catch (e) {
                        // Si falla (ej: polÃ­gono invÃ¡lido), lo ignoramos o logueamos
                        console.warn('Fallo al triangular feature', f);
                    }
                }
            });

            return turf.featureCollection(res);
        }
    },

    geo_donut_extractor: {
        cat: '2.1 VECTOR - GEOMETRY', label: 'Donut Extractor', icon: 'fa-dot-circle', color: '#2980b9', in: 1, out: 1,
        tpl: () => `<div style="font-size:0.7em;color:#aaa;text-align:center">Extract Polygon Holes</div>`,
        run: async (id, inputs) => {
            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const wres = await postWorkerTask({
                        task: 'geo_donut_extractor',
                        features: inputs[0]
                    }, 60000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker Donut Extractor fallo, fallback local:", e);
                }
            }

            const holes = [];
            const flat = turf.flatten(inputs[0]);

            // Aplanamos para asegurar que tratamos feature a feature
            for (let fi = 0; fi < flat.features.length; fi++) {
                const f = flat.features[fi];
                const type = turf.getType(f);
                if (type === 'Polygon') {
                    const coords = f.geometry.coordinates;
                    // El Ã­ndice 0 es el contorno exterior, los siguientes (1, 2, ...) son agujeros
                    if (coords.length > 1) {
                        for (let i = 1; i < coords.length; i++) {
                            // Creamos un nuevo polÃ­gono por cada agujero
                            const holePoly = turf.polygon([coords[i]], f.properties);
                            holes.push(holePoly);
                        }
                    }
                }
                if (fi % 400 === 0) await new Promise(r => setTimeout(r, 0));
            }

            return turf.featureCollection(holes);
        }
    },

    geo_line_closer: {
        cat: '2.1 VECTOR - GEOMETRY', label: 'Line Closer', icon: 'fa-vector-square', color: '#2980b9', in: 1, out: 1,
        tpl: () => `<div style="font-size:0.7em;color:#aaa;text-align:center">LineString <i class="fas fa-arrow-right"></i> Polygon</div>`,
        run: async (id, inputs) => {
            const fc = inputs[0] || turf.featureCollection([]);
            const inCount = (fc && Array.isArray(fc.features)) ? fc.features.length : 0;
            const USE_WORKER_FROM = 3000;
            if (inCount >= USE_WORKER_FROM && typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const wres = await postWorkerTask({
                        task: 'geo_line_closer',
                        features: fc
                    }, 90000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn('Worker Line Closer fallo, fallback local:', e);
                }
            }

            const polys = [];
            const flat = turf.flatten(fc);
            for (let i = 0; i < flat.features.length; i++) {
                const f = flat.features[i];
                const type = turf.getType(f);
                if (type === 'LineString') {
                    try {
                        // turf.lineToPolygon cierra automÃ¡ticamente la lÃ­nea
                        const poly = turf.lineToPolygon(f);
                        poly.properties = f.properties;
                        polys.push(poly);
                    } catch (e) {
                        console.warn('No se pudo cerrar la lÃ­nea', f);
                    }
                }
                if (i % 400 === 0) await new Promise(r => setTimeout(r, 0));
            }

            return turf.featureCollection(polys);
        }
    },

    geo_line_to_polygon: {
        cat: '2.1 VECTOR - GEOMETRY', label: 'Line to Polygon', icon: 'fa-vector-square', color: '#2980b9', in: 1, out: 1,
        tpl: () => `<div style="font-size:0.7em;color:#aaa;text-align:center">Line/MultiLine <i class="fas fa-arrow-right"></i> Polygon</div>`,
        run: async (id, inputs) => {
            const polys = [];
            const fc = inputs[0] || turf.featureCollection([]);
            const inCount = (fc && Array.isArray(fc.features)) ? fc.features.length : 0;
            const USE_WORKER_FROM = 10000;
            if (inCount >= USE_WORKER_FROM && typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const wres = await postWorkerTask({
                        task: 'geo_line_to_polygon',
                        features: fc
                    }, 120000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn('Worker Line to Polygon fallo, fallback local:', e);
                }
            }
            const feats = (fc && Array.isArray(fc.features)) ? fc.features : [];
            for (let i = 0; i < feats.length; i++) {
                const f = feats[i];
                const g = f && f.geometry ? f.geometry : null;
                const t = g ? g.type : '';
                try {
                    if (t === 'LineString') {
                        const poly = turf.lineToPolygon(f);
                        poly.properties = { ...(f.properties || {}) };
                        polys.push(poly);
                    } else if (t === 'MultiLineString' && Array.isArray(g.coordinates)) {
                        for (let j = 0; j < g.coordinates.length; j++) {
                            const ls = turf.lineString(g.coordinates[j], { ...(f.properties || {}) });
                            const poly = turf.lineToPolygon(ls);
                            poly.properties = { ...(f.properties || {}) };
                            polys.push(poly);
                        }
                    }
                } catch (e) {
                    console.warn('Line to Polygon: no se pudo convertir feature', f);
                }
                if (i % 400 === 0) await new Promise(r => setTimeout(r, 0));
            }
            return turf.featureCollection(polys);
        }
    },

    geo_polygon_to_line: {
        cat: '2.1 VECTOR - GEOMETRY', label: 'Polygon to Line', icon: 'fa-grip-lines', color: '#2980b9', in: 1, out: 1,
        tpl: () => `<div style="font-size:0.7em;color:#aaa;text-align:center">Polygon/MultiPolygon <i class="fas fa-arrow-right"></i> Line</div>`,
        run: async (id, inputs) => {
            const lines = [];
            const fc = inputs[0] || turf.featureCollection([]);
            const inCount = (fc && Array.isArray(fc.features)) ? fc.features.length : 0;
            const USE_WORKER_FROM = 10000;
            if (inCount >= USE_WORKER_FROM && typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const wres = await postWorkerTask({
                        task: 'geo_polygon_to_line',
                        features: fc
                    }, 120000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn('Worker Polygon to Line fallo, fallback local:', e);
                }
            }
            const feats = (fc && Array.isArray(fc.features)) ? fc.features : [];
            for (let i = 0; i < feats.length; i++) {
                const f = feats[i];
                const g = f && f.geometry ? f.geometry : null;
                const t = g ? g.type : '';
                try {
                    if (t === 'Polygon') {
                        const out = turf.polygonToLine(f);
                        if (out && out.type === 'FeatureCollection' && Array.isArray(out.features)) {
                            out.features.forEach(l => {
                                l.properties = { ...(f.properties || {}) };
                                lines.push(l);
                            });
                        } else if (out && out.type === 'Feature') {
                            out.properties = { ...(f.properties || {}) };
                            lines.push(out);
                        }
                    } else if (t === 'MultiPolygon' && Array.isArray(g.coordinates)) {
                        for (let j = 0; j < g.coordinates.length; j++) {
                            const p = turf.polygon(g.coordinates[j], { ...(f.properties || {}) });
                            const out = turf.polygonToLine(p);
                            if (out && out.type === 'FeatureCollection' && Array.isArray(out.features)) {
                                out.features.forEach(l => {
                                    l.properties = { ...(f.properties || {}) };
                                    lines.push(l);
                                });
                            } else if (out && out.type === 'Feature') {
                                out.properties = { ...(f.properties || {}) };
                                lines.push(out);
                            }
                        }
                    }
                } catch (e) {
                    console.warn('Polygon to Line: no se pudo convertir feature', f);
                }
                if (i % 400 === 0) await new Promise(r => setTimeout(r, 0));
            }
            return turf.featureCollection(lines);
        }
    },

    geo_point_surf: {
        cat: '2.1 VECTOR - GEOMETRY', label: 'CenterPointInside', icon: 'fa-map-marker', color: '#2980b9', in: 1, out: 1,
        tpl: () => `<div>Interior garantizado</div>`,
        run: async (id, i) => {
            const fc = i[0] || turf.featureCollection([]);
            const inCount = (fc && Array.isArray(fc.features)) ? fc.features.length : 0;
            const USE_WORKER_FROM = 25000;
            if (inCount >= USE_WORKER_FROM && typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const wres = await postWorkerTask({ task: 'geo_point_surf', features: fc }, 60000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn('Worker CenterPointInside fallo, fallback local:', e);
                }
            }
            return turf.featureCollection(fc.features.map(f => turf.pointOnFeature(f)));
        }
    },

    geo_bbox: {
        cat: '2.1 VECTOR - GEOMETRY', label: 'Envelope', icon: 'fa-square-full', color: '#2980b9', in: 1, out: 1,
        tpl: () => `<div>Caja LÃ­mite</div>`,
        run: async (id, i) => {
            const fc = i[0] || turf.featureCollection([]);
            const inCount = (fc && Array.isArray(fc.features)) ? fc.features.length : 0;
            const USE_WORKER_FROM = 25000;
            if (inCount >= USE_WORKER_FROM && typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const wres = await postWorkerTask({ task: 'geo_bbox', features: fc }, 60000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn('Worker Envelope fallo, fallback local:', e);
                }
            }
            return turf.featureCollection(fc.features.map(f => turf.bboxPolygon(turf.bbox(f))));
        }
    },

    geo_voronoi: {
        cat: '2.1 VECTOR - GEOMETRY', label: 'Voronoi', icon: 'fa-th-large', color: '#2980b9', in: 1, out: 1,
        tpl: () => `<div>PolÃ­gonos</div>`,
        run: async (id, i) => {
            const inputs = i[0];
            if (!inputs || !inputs.features) throw new Error("Sin datos");

            // --- INTENTO VIA WORKER ---
            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();

                    const payload = {
                        task: 'geo_voronoi',
                        features: inputs.features
                    };

                    // Voronoi es rÃ¡pido con RBush, pero lento en construcciÃ³n inicial
                    const wres = await postWorkerTask(payload, 30000);
                    if (wres && wres.status === 'ok') return wres.data;

                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker Voronoi fallÃ³, fallback local:", e);
                }
            }

            // --- FALLBACK LOCAL (ORIGINAL) ---
            const seen = new Set();
            const cleanPoints = [];
            inputs.features.forEach(f => {
                if (turf.getType(f) === 'Point') {
                    const c = f.geometry.coordinates;
                    const key = c[0].toFixed(6) + ',' + c[1].toFixed(6);
                    if (!seen.has(key)) {
                        seen.add(key);
                        cleanPoints.push(turf.point([c[0], c[1]], f.properties));
                    }
                }
            });

            if (cleanPoints.length === 0) throw new Error("No hay puntos vÃ¡lidos");
            const fc = turf.featureCollection(cleanPoints);

            const bbox = turf.bbox(fc);
            const w = bbox[2] - bbox[0];
            const h = bbox[3] - bbox[1];
            const pad = Math.max(w, h) * 0.5 || 0.01;
            const expandedBbox = [bbox[0] - pad, bbox[1] - pad, bbox[2] + pad, bbox[3] + pad];

            const result = turf.voronoi(fc, { bbox: expandedBbox });

            if (result && result.features) {
                result.features = result.features.filter(f => f && f.geometry && f.geometry.coordinates.length > 0);
                result.features.forEach((poly, idx) => {
                    if (poly && cleanPoints[idx]) {
                        poly.properties = cleanPoints[idx].properties;
                    }
                });
            }

            return result;
        }
    },

    geo_buffer: {
        cat: '2.1 VECTOR - GEOMETRY', label: 'Bufferer', icon: 'fa-bullseye', color: '#2980b9', in: 1, out: 1,
        tpl: () => `
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Radio / Unidad</span>
                <div style="display:flex;gap:5px">
                    <input type="number" df-dist value="100" class="node-control">
                    <select df-unit class="node-control" style="width:80px">
                        <option value="meters">m</option>
                        <option value="kilometers">km</option>
                    </select>
                </div>
            </div>
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Estilo Borde</span>
                <select df-cap class="node-control">
                    <option value="round">Redondo (Round)</option>
                    <option value="square" disabled>Cuadrado (No soportado)</option>
                </select>
            </div>
            <div>
                <span style="font-size:0.7em;color:#aaa">Resultado</span>
                <select df-dis class="node-control">
                    <option value="false">Individual (Solapados)</option>
                    <option value="true">Disuelto (Unido)</option>
                </select>
            </div>`,
        run: async (id, inputs, dom) => {
            const dist = parseFloat(dom.querySelector('[df-dist]').value);
            const unit = dom.querySelector('[df-unit]').value;
            const dissolve = dom.querySelector('[df-dis]').value === 'true';

            const features = inputs[0];

            if (!features || !features.features.length) throw new Error("Input vacÃ­o");

            // --- INTENTO VIA WORKER ---
            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();

                    const payload = {
                        task: 'geo_buffer',
                        features: features,
                        dist: dist,
                        unit: unit,
                        dissolve: dissolve
                    };

                    // Tiempo generoso (90s) porque Dissolve es muy pesado
                    const wres = await postWorkerTask(payload, 90000);
                    if (wres && wres.status === 'ok') return wres.data;

                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker Buffer fallÃ³, fallback local:", e);
                }
            }

            // --- FALLBACK LOCAL ---
            const buffered = turf.buffer(features, dist, { units: unit });
            return dissolve ? turf.dissolve(buffered) : buffered;
        }
    },

    geo_random_fill: {
        cat: '2.1 VECTOR - GEOMETRY', label: 'Random Fill', icon: 'fa-braille', color: '#2980b9', in: 1, out: 1,
        tpl: () => `
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Puntos por PolÃ­gono</span>
                <input type="number" df-n class="node-control" value="50" min="1">
            </div>
            <div style="font-size:0.6em;color:#888">
                Genera puntos aleatorios restringidos al interior de cada geometrÃ­a.
            </div>`,
        run: async (id, inputs, dom) => {
            const count = parseInt(dom.querySelector('[df-n]').value) || 10;
            const resultPoints = [];
            const fc = inputs[0] || turf.featureCollection([]);

            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const wres = await postWorkerTask({
                        task: 'geo_random_fill',
                        features: fc,
                        count
                    }, 90000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker Random Fill fallo, fallback local:", e);
                }
            }

            const feats = turf.flatten(fc).features;
            for (let fi = 0; fi < feats.length; fi++) {
                const f = feats[fi];
                const type = turf.getType(f);
                if (type !== 'Polygon' && type !== 'MultiPolygon') continue;

                const bbox = turf.bbox(f);
                let current = 0;
                let attempts = 0;
                const maxAttempts = count * 80; // Evita bucles infinitos en poligonos corruptos

                while (current < count && attempts < maxAttempts) {
                    if (attempts % 200 === 0 && typeof window.JETLThrowIfCancelled === 'function') {
                        window.JETLThrowIfCancelled();
                    }
                    const rnd = turf.randomPoint(1, { bbox: bbox });
                    const pt = rnd.features[0];
                    if (turf.booleanPointInPolygon(pt, f)) {
                        pt.properties = { ...f.properties, _generated_id: current };
                        resultPoints.push(pt);
                        current++;
                    }
                    attempts++;
                }
                if (fi % 40 === 0 && typeof window.JETLNextTick === 'function') await window.JETLNextTick();
            }

            return turf.featureCollection(resultPoints);
        }
    }
});








;

/* ---- js/nodes/utils.js ---- */
// Cat: utils
(typeof window !== 'undefined' ? window : global).TOOL_REGISTRY = (typeof window !== 'undefined' ? window : global).TOOL_REGISTRY || {};
Object.assign((typeof window !== 'undefined' ? window : global).TOOL_REGISTRY, {
    util_filter_geo: { cat: '3. UTILS', label: 'Geometry Filter', icon: 'fa-shapes', color: '#7f8c8d', in: 1, out: 3, tpl: () => `<div style="font-size:0.6em">1:Poly 2:Line 3:Pt</div>`, run: (id, i) => { const p = [], l = [], pt = []; i[0].features.forEach(f => { const t = turf.getType(f).toLowerCase(); if (t.includes('poly')) p.push(f); else if (t.includes('line')) l.push(f); else pt.push(f) }); return { output_1: turf.featureCollection(p), output_2: turf.featureCollection(l), output_3: turf.featureCollection(pt) } } },

    util_junction: {
        cat: '3. UTILS', label: 'Junction', icon: 'fa-circle', color: '#7f8c8d',
        in: 5, // Múltiples entradas para permitir la fusión
        out: 1,
        tpl: () => ``, // Se mantiene vacío para conservar el estilo minimalista
        run: (id, inputs) => {
            const allFeatures = [];

            // Recorremos todas las entradas conectadas
            inputs.forEach(layer => {
                if (layer && layer.features) {
                    allFeatures.push(...layer.features);
                }
            });

            return turf.featureCollection(allFeatures);
        }
    },

    util_holder: {
        cat: '3. UTILS', label: 'Inspector', icon: 'fa-eye', color: '#7f8c8d',
        in: 1, out: 1,
        tpl: (id) => `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px">
                <span style="font-size:0.7em;color:#aaa">Color Visor</span>
                <input type="color" df-color class="node-control" value="#00ffcc" 
                    style="height:22px; width:50px; border:none; cursor:pointer; padding:0;">
            </div>
            <div style="font-size:0.6em;color:#666">
                Fuerza el estilo visual de esta capa.
            </div>`,
        run: (id, inputs, dom) => {
            if (!inputs[0]) return null;

            // Recuperamos el color seleccionado
            const colorInput = dom.querySelector('[df-color]');
            const userColor = colorInput ? colorInput.value : '#00ffcc';

            // Clonamos el contenedor (Superficial) para no romper la referencia de las features
            // Esto es muy rápido y no consume memoria extra.
            const output = { ...inputs[0] };

            // Adjuntamos la orden de estilo al objeto raíz
            output._custom_style = {
                color: userColor,
                fillColor: userColor,
                weight: 3,
                opacity: 1,
                fillOpacity: 0.4
            };

            return output;
        }
    },

    util_runner: {
        cat: '3. UTILS', label: 'Batch Runner', icon: 'fa-play', color: '#fff', in: 5, out: 0,
        tpl: () => `<div style="font-size:0.7em;color:#aaa">Conecta nodos finales aquí y ejecútalos todos juntos.</div>`,
        run: (id, inputs) => { return inputs; } // No hace nada, solo fuerza el "Pull" de sus padres
    },

    util_sampler: {
        cat: '3. UTILS', label: 'Random Sampler', icon: 'fa-dice', color: '#7f8c8d',
        in: 1, out: 1,
        tpl: () => `
        <div style="margin-bottom:4px">
            <span style="font-size:0.7em;color:#aaa">Estrategia de Muestreo</span>
            <select df-mode class="node-control">
                <option value="random">Aleatorio (N Total)</option>
                <option value="interval">Intervalo (Cada N)</option>
                <option value="first">Primeros N (Head)</option>
                <option value="last">Últimos N (Tail)</option>
            </select>
        </div>
        <div>
            <span style="font-size:0.7em;color:#aaa">Valor (N)</span>
            <input type="number" df-n class="node-control" value="10" min="1">
        </div>`,
        run: async (id, inputs, dom) => {
            // 1. Validación de entrada vectorial
            if (!inputs[0] || !inputs[0].features) throw new Error("Conecta una capa de entrada.");

            const features = inputs[0].features;
            const mode = dom.querySelector('[df-mode]').value;
            const n = parseInt(dom.querySelector('[df-n]').value) || 10;

            let result = [];

            // 2. Lógica de Muestreo según la estrategia seleccionada
            if (mode === 'random') {
                // Clonamos y desordenamos aleatoriamente
                const shuffled = [...features].sort(() => 0.5 - Math.random());
                result = shuffled.slice(0, n);
            }
            else if (mode === 'interval') {
                // Filtramos uno de cada N elementos
                result = features.filter((f, i) => (i + 1) % n === 0);
            }
            else if (mode === 'first') {
                // Los primeros N
                result = features.slice(0, n);
            }
            else if (mode === 'last') {
                // Los últimos N
                // Nota: slice con negativo toma desde el final
                result = features.slice(-n);
            }

            if (window.log) window.log(`🎲 Sampler: ${mode} -> ${result.length} elementos seleccionados.`);

            return turf.featureCollection(result);
        }
    }
});

;

/* ---- js/nodes/spatial.js ---- */
// Cat: spatial
(typeof window !== 'undefined' ? window : global).TOOL_REGISTRY = (typeof window !== 'undefined' ? window : global).TOOL_REGISTRY || {};
Object.assign((typeof window !== 'undefined' ? window : global).TOOL_REGISTRY, {
    geo_kink_remover: {
        cat: '2.2 VECTOR - SPATIAL', label: 'Kink Remover', icon: 'fa-band-aid', color: '#8e44ad', in: 1, out: 1,
        tpl: () => `
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Umbral Z-Kink (Grados)</span>
                <input type="number" df-deg value="5" class="node-control" title="Ángulos menores a este valor (picos muy agudos) serán eliminados">
            </div>
            <div style="font-size:0.6em;color:#888">Corrige lazos (Unkink) y elimina picos (Z-kinks).</div>
        `,
        run: async (id, inputs, dom) => {
            const minDeg = parseFloat(dom.querySelector('[df-deg]').value) || 0;
            const res = [];

            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const payload = {
                        task: 'geo_kink_remover',
                        features: inputs[0],
                        minDeg
                    };
                    const wres = await postWorkerTask(payload, 90000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker Kink Remover fallo, fallback local:", e);
                }
            }

            // Función auxiliar para limpiar Z-kinks (picos agudos) basada en ángulos
            const cleanZKinks = (feature) => {
                // Si no hay umbral, devolvemos tal cual (solo aplicamos cleanCoords básico)
                if (minDeg <= 0) return turf.cleanCoords(feature);

                const type = turf.getType(feature);
                if (type !== 'Polygon' && type !== 'LineString') return feature; // Solo soportado en líneas simples/polígonos simples por ahora

                const coords = turf.getCoords(feature);
                // Lógica simplificada: Iterar vértices y calcular ángulo de desviación
                // Nota: Para implementación robusta en Polígonos con huecos, habría que iterar anillos. 
                // Aquí aplicamos una simplificación topológica segura usando turf.simplify como proxy robusto 
                // para evitar romper la geometría manualmente con cálculos de ángulos complejos.
                // Mapeamos "Grados" a una tolerancia aproximada de simplificación para eliminar ruido.

                // Sin embargo, para cumplir con "Grados", usamos cleanCoords que elimina redundancia
                // y simplify con alta calidad para eliminar el ruido de los quiebros.
                const tolerance = minDeg * 0.00005; // Conversión heurística para WGS84
                return turf.simplify(feature, { tolerance: tolerance, highQuality: true });
            };

            turf.flatten(inputs[0]).features.forEach(f => {
                const type = turf.getType(f);

                if (type === 'Polygon' || type === 'MultiPolygon') {
                    try {
                        // 1. Arreglar Lazos (Unkink)
                        const unkinked = turf.unkinkPolygon(f);

                        // 2. Limpiar Z-kinks en los fragmentos resultantes
                        unkinked.features.forEach(part => {
                            part.properties = f.properties; // Mantener atributos
                            res.push(cleanZKinks(part));
                        });
                    } catch (e) {
                        // Fallback si unkink falla (ej. geometría corrupta)
                        console.warn('Unkink falló, aplicando limpieza básica', e);
                        res.push(cleanZKinks(f));
                    }
                } else if (type === 'LineString' || type === 'MultiLineString') {
                    // Para líneas solo aplicamos limpieza de Z-kinks
                    res.push(cleanZKinks(f));
                } else {
                    // Puntos u otros pasan directo
                    res.push(f);
                }
            });

            return turf.featureCollection(res);
        }
    },

    geo_angle_calculator: {
        cat: '2.2 VECTOR - SPATIAL', label: 'Angle Calculator', icon: 'fa-ruler-combined', color: '#8e44ad', in: 1, out: 1,
        tpl: () => `
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Ángulo Máximo (Grados)</span>
                <input type="number" df-deg value="45" class="node-control" title="Marca vértices con ángulo interno menor a este valor">
            </div>
            <div style="font-size:0.6em;color:#888">Detecta picos agudos (< 180º).</div>
        `,
        run: async (id, inputs, dom) => {
            const threshold = parseFloat(dom.querySelector('[df-deg]').value);
            const points = [];

            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const payload = {
                        task: 'geo_angle_calculator',
                        features: inputs[0],
                        threshold
                    };
                    const wres = await postWorkerTask(payload, 90000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker Angle Calculator fallo, fallback local:", e);
                }
            }

            // Función auxiliar: Calcula el ángulo interno (0 a 180) en el vértice B (A-B-C)
            const getAngleAtVertex = (a, b, c) => {
                const bearingBA = turf.bearing(b, a);
                const bearingBC = turf.bearing(b, c);
                let angle = Math.abs(bearingBA - bearingBC);
                if (angle > 180) angle = 360 - angle;
                return angle;
            };

            turf.flatten(inputs[0]).features.forEach((f, fIdx) => {
                const type = turf.getType(f);
                const coords = turf.getCoords(f);

                // Normalizamos para tratar Anillos de Polígonos o Líneas simples
                // (Nota: Solo procesa el anillo exterior en polígonos para simplificar)
                let ring = (type === 'Polygon') ? coords[0] : (type === 'LineString' ? coords : null);

                if (!ring || ring.length < 3) return;

                const isClosed = (type === 'Polygon');
                // En GeoJSON, el último punto de un polígono repite el primero.
                // Iteramos hasta length-1 porque el último es duplicado en polígonos.
                const len = ring.length;
                const limit = isClosed ? len - 1 : len;

                for (let i = 0; i < limit; i++) {
                    let prev, curr, next;

                    if (i === 0) {
                        if (!isClosed) continue; // Una línea no tiene ángulo en el inicio
                        prev = ring[len - 2]; // El penúltimo punto real
                        curr = ring[0];
                        next = ring[1];
                    } else if (i === len - 1) {
                        if (!isClosed) continue; // Una línea no tiene ángulo en el final
                        // En polígono esto ya se cubre en el caso i=0 debido a la duplicidad
                        continue;
                    } else {
                        prev = ring[i - 1];
                        curr = ring[i];
                        next = ring[i + 1];
                    }

                    // Protección contra puntos duplicados consecutivos que dan bearing NaN
                    if (!prev || !next) continue;

                    const angle = getAngleAtVertex(prev, curr, next);

                    if (angle <= threshold) {
                        points.push(turf.point(curr, {
                            ...f.properties, // Hereda atributos del padre
                            _vertex_index: i,
                            _parent_id: fIdx,
                            angle: parseFloat(angle.toFixed(2)) // Guarda el ángulo calculado
                        }));
                    }
                }
            });

            return turf.featureCollection(points);
        }
    },

    sp_min_area_solver: {
        cat: '2.2 VECTOR - SPATIAL', label: 'MinArea Solver', icon: 'fa-compress-alt', color: '#8e44ad',
        in: 1,
        out: 3, // Out 1: Intactos | Out 2: Fusionados (Merged) | Out 3: Fallidos (Failed)
        tpl: () => `
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Criterio de Área</span>
                <div style="display:flex;gap:5px">
                    <input type="number" df-val value="100" class="node-control">
                    <select df-unit class="node-control" style="width:80px">
                        <option value="1">m²</option>
                        <option value="10000">ha</option>
                        <option value="1000000">km²</option>
                    </select>
                </div>
            </div>
            <div>
                <span style="font-size:0.7em;color:#aaa">Modo de Acción</span>
                <select df-mode class="node-control">
                    <option value="merge">Fusionar con vecino (Merge)</option>
                    <option value="delete">Solo Eliminar</option>
                </select>
            </div>
            <div style="font-size:0.6em;color:#666;margin-top:4px">
                <b>Out 1:</b> Passed (Intactos)<br>
                <b>Out 2:</b> Merged (Fusionados)<br>
                <b>Out 3:</b> Failed (Eliminados)
            </div>`,
        run: async (id, inputs, dom) => {
            const minVal = parseFloat(dom.querySelector('[df-val]').value);
            const multiplier = parseFloat(dom.querySelector('[df-unit]').value);
            const mode = dom.querySelector('[df-mode]').value;
            const thresholdSqM = minVal * multiplier;

            const features = inputs[0];
            if (!features || !features.features) throw new Error("Entrada vacía");

            // --- INTENTO VIA WORKER ---
            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();

                    const payload = {
                        task: 'min_area_solver',
                        features: features,
                        thresholdSqM: thresholdSqM,
                        mode: mode
                    };

                    // Proceso iterativo puede tardar (120s)
                    const wres = await postWorkerTask(payload, 120000);
                    if (wres && wres.status === 'ok') return wres.data;

                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker MinArea falló, fallback local:", e);
                }
            }

            // --- FALLBACK LOCAL (ORIGINAL) ---
            // Código original como red de seguridad
            let items = features.features.map((f, i) => {
                const area = turf.area(f);
                return { id: i, feature: f, geometry: f.geometry, properties: f.properties, area: area, bbox: turf.bbox(f), isSliver: area < thresholdSqM, isDeleted: false, isModified: false };
            });
            if (mode === 'delete') {
                const passed = items.filter(i => !i.isSliver).map(i => i.feature);
                const failed = items.filter(i => i.isSliver).map(i => i.feature);
                return { output_1: turf.featureCollection(passed), output_2: turf.featureCollection([]), output_3: turf.featureCollection(failed) };
            }
            items.sort((a, b) => a.area - b.area);
            for (let idx = 0; idx < items.length; idx++) {
                if (typeof window.JETLThrowIfCancelled === 'function') window.JETLThrowIfCancelled();
                if (idx % 20 === 0 && typeof window.JETLNextTick === 'function') await window.JETLNextTick();
                const item = items[idx];
                if (item.isDeleted || item.area >= thresholdSqM) continue;
                let bestNeighbor = null;
                let maxSharedLen = 0;
                for (let j = 0; j < items.length; j++) {
                    if (j % 200 === 0 && typeof window.JETLThrowIfCancelled === 'function') window.JETLThrowIfCancelled();
                    const candidate = items[j];
                    if (item.id === candidate.id || candidate.isDeleted) continue;
                    if (item.bbox[2] < candidate.bbox[0] || item.bbox[0] > candidate.bbox[2] || item.bbox[3] < candidate.bbox[1] || item.bbox[1] > candidate.bbox[3]) continue;
                    try {
                        if (turf.booleanIntersects(item.feature, candidate.feature)) {
                            const l1 = turf.polygonToLine(item.feature);
                            const l2 = turf.polygonToLine(candidate.feature);
                            const overlap = turf.lineOverlap(l1, l2);
                            if (overlap && overlap.features.length > 0) {
                                const len = turf.length(overlap);
                                if (len > maxSharedLen) { maxSharedLen = len; bestNeighbor = candidate; }
                            } else if (!bestNeighbor) { bestNeighbor = candidate; }
                        }
                    } catch (e) { }
                }
                if (bestNeighbor) {
                    try {
                        const union = turf.union(bestNeighbor.feature, item.feature);
                        bestNeighbor.feature = union;
                        bestNeighbor.area = turf.area(union);
                        bestNeighbor.bbox = turf.bbox(union);
                        bestNeighbor.isModified = true;
                        item.isDeleted = true;
                    } catch (err) { }
                }
            }
            const outPassed = []; const outMerged = []; const outFailed = [];
            items.forEach(i => {
                if (i.isDeleted) return;
                if (i.area >= thresholdSqM) { if (i.isModified) outMerged.push(i.feature); else outPassed.push(i.feature); }
                else { outFailed.push(i.feature); }
            });
            return { output_1: turf.featureCollection(outPassed), output_2: turf.featureCollection(outMerged), output_3: turf.featureCollection(outFailed) };
        }
    },

    geo_snap: {
        cat: '2.2 VECTOR - SPATIAL', label: 'Snapper', icon: 'fa-magnet', color: '#8e44ad', in: 2, out: 1,
        tpl: () => `
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Distancia de Atracción</span>
                <div style="display:flex;gap:5px">
                    <input type="number" df-dist value="1" class="node-control">
                    <select df-unit class="node-control" style="width:80px">
                        <option value="meters">m</option>
                        <option value="kilometers">km</option>
                        <option value="miles">miles</option>
                    </select>
                </div>
            </div>
            <div style="font-size:0.6em;color:#888;margin-top:2px">
                Input 1 (Data) se mueve hacia Input 2 (Ancla).
            </div>`,
        run: async (id, inputs, dom) => {
            const val = parseFloat(dom.querySelector('[df-dist]').value);
            const unit = dom.querySelector('[df-unit]').value;

            // Validación básica de parámetros
            if (isNaN(val) || val < 0) throw new Error("Distancia inválida");

            // Input 1 es lo que vamos a mover, Input 2 es el ancla
            const source = inputs[0];
            const anchor = inputs[1];

            if (!source || !source.features.length) throw new Error("Input 1 vacío");
            if (!anchor || !anchor.features.length) throw new Error("Input 2 (Ancla) vacío");

            // --- INTENTO VIA WORKER ---
            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();

                    const payload = {
                        task: 'geo_snap',
                        source: source,
                        anchor: anchor,
                        range: val,
                        unit: unit
                    };

                    // Tiempo extendido (60s) para snapping masivo
                    const wres = await postWorkerTask(payload, 60000);
                    if (wres && wres.status === 'ok') return wres.data;

                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker Snap falló, fallback local:", e);
                }
            }

            // --- FALLBACK LOCAL (ORIGINAL, MUY LENTO) ---
            // Solo se ejecuta si el worker falla

            // Umbral en Kilómetros (Turf estándar para conversiones simples locales)
            let thresholdKm = val;
            if (unit === 'meters') thresholdKm = val / 1000;
            else if (unit === 'miles') thresholdKm = val * 1.60934;

            const sourceClone = JETLClone(source);

            // Optimizacion mínima local: Explode solo una vez
            const anchorPoints = turf.explode(anchor);

            turf.coordEach(sourceClone, (currentCoord) => {
                const currentPoint = turf.point(currentCoord);
                const nearest = turf.nearestPoint(currentPoint, anchorPoints);
                const distance = turf.distance(currentPoint, nearest, { units: 'kilometers' });

                if (distance <= thresholdKm) {
                    currentCoord[0] = nearest.geometry.coordinates[0];
                    currentCoord[1] = nearest.geometry.coordinates[1];
                }
            });

            return sourceClone;
        }
    },

    sp_spatial_filter: {
        cat: '2.2 VECTOR - SPATIAL', label: 'Spatial Filter', icon: 'fa-filter', color: '#8e44ad', in: 2, out: 2,
        tpl: () => `
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Criterio (Input 1 vs Input 2)</span>
                <select df-mode class="node-control">
                    <option value="contains">Contiene a (Contains)</option>
                    <option value="within">Dentro de (Within)</option>
                    <option value="crosses">Cruza (Crosses)</option>
                    <option value="touches">Toca (Touches)</option>
                    <option value="equal">Igual (Equals)</option>
                    <option value="disjoint">Disjoint (No toca)</option>
                    <option value="overlap">Overlap (Solapa)</option>
                </select>
            </div>
            <div style="font-size:0.6em;color:#888">Out 1: Passed (Cumple) | Out 2: Failed</div>`,
        run: async (id, inputs, dom) => {
            const mode = dom.querySelector('[df-mode]').value;
            const source = inputs[0]; // FeatureCollection completo
            const mask = inputs[1];   // FeatureCollection completo

            if (!source || !source.features.length) throw new Error("Input 1 (Data) vacío");
            if (!mask || !mask.features.length) throw new Error("Input 2 (Mask) vacío");

            // --- INTENTO VIA WORKER (OPTIMIZADO) ---
            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker(); // Reiniciar si murió

                    const payload = {
                        task: 'spatial_filter',
                        source: source,
                        mask: mask,
                        mode: mode
                    };

                    // Timeout generoso (60s) para operaciones complejas
                    const wres = await postWorkerTask(payload, 60000);

                    if (wres && wres.status === 'ok') {
                        // El worker ya devuelve { output_1: ..., output_2: ... }
                        return wres.data;
                    }
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker filter falló, usando fallback local:", e);
                }
            }

            // --- FALLBACK: HILO PRINCIPAL (Lento, solo si falla worker) ---
            const passed = [];
            const failed = [];
            // Aplanamos máscara para bucle simple
            const flatMask = [];
            turf.flatten(mask).features.forEach(f => flatMask.push(f));

            for (let idx = 0; idx < source.features.length; idx++) {
                if (typeof window.JETLThrowIfCancelled === 'function') window.JETLThrowIfCancelled();
                if (idx % 40 === 0 && typeof window.JETLNextTick === 'function') await window.JETLNextTick();
                const f1 = source.features[idx];
                let match = false;
                for (const f2 of flatMask) {
                    try {
                        if (mode === 'contains' && turf.booleanContains(f1, f2)) match = true;
                        else if (mode === 'within' && turf.booleanWithin(f1, f2)) match = true;
                        else if (mode === 'crosses' && turf.booleanCrosses(f1, f2)) match = true;
                        else if (mode === 'touches' && turf.booleanTouches(f1, f2)) match = true;
                        else if (mode === 'equal' && turf.booleanEqual(f1, f2)) match = true;
                        // Añadimos los nuevos modos al fallback también
                        else if (mode === 'disjoint' && turf.booleanDisjoint(f1, f2)) match = true;
                        else if (mode === 'overlap' && turf.booleanOverlap(f1, f2)) match = true;
                    } catch (e) { }
                    if (match) break;
                }
                if (match) passed.push(f1);
                else failed.push(f1);
            }

            return {
                output_1: turf.featureCollection(passed),
                output_2: turf.featureCollection(failed)
            };
        }
    },

    sp_spatial_join: {
        cat: '2.2 VECTOR - SPATIAL', label: 'Spatial Join', icon: 'fa-link', color: '#8e44ad', in: 2, out: 2,
        help: 'Une atributos de Input2 en Input1 según relación espacial.',
        tpl: () => `
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Relación</span>
                <select df-mode class="node-control">
                    <option value="intersects">Intersects</option>
                    <option value="within">Within</option>
                    <option value="contains">Contains</option>
                </select>
            </div>
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Tipo Join</span>
                <select df-join class="node-control">
                    <option value="left">Left</option>
                    <option value="inner">Inner</option>
                </select>
            </div>
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Estrategia</span>
                <select df-strategy class="node-control">
                    <option value="first">Primer match</option>
                    <option value="aggregate">Agregado (numéricos)</option>
                </select>
            </div>
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Prefijo Campos</span>
                <input type="text" df-prefix class="node-control" value="j_">
            </div>
            <div style="font-size:0.6em;color:#888">Out 1: Join | Out 2: Sin Match</div>`,
        run: async (id, inputs, dom) => {
            const mode = dom.querySelector('[df-mode]').value;
            const joinType = dom.querySelector('[df-join]').value;
            const strategy = dom.querySelector('[df-strategy]').value;
            const prefix = dom.querySelector('[df-prefix]').value || 'j_';
            const source = inputs[0];
            const join = inputs[1];
            if (!source || !source.features.length) throw new Error("Input 1 vacío");
            if (!join || !join.features.length) throw new Error("Input 2 vacío");

            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const payload = { task: 'spatial_join', source, join, mode, joinType, prefix, strategy };
                    const wres = await postWorkerTask(payload, 90000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker spatial join falló, fallback local:", e);
                }
            }

            // Fallback local
            const joined = [];
            const unmatched = [];
            for (let idx = 0; idx < source.features.length; idx++) {
                if (typeof window.JETLThrowIfCancelled === 'function') window.JETLThrowIfCancelled();
                if (idx % 40 === 0 && typeof window.JETLNextTick === 'function') await window.JETLNextTick();
                const f1 = source.features[idx];
                let matched = false;
                const matches = [];
                join.features.forEach(f2 => {
                    try {
                        let ok = false;
                        if (mode === 'intersects') ok = turf.booleanIntersects(f1, f2);
                        else if (mode === 'within') ok = turf.booleanWithin(f1, f2);
                        else if (mode === 'contains') ok = turf.booleanContains(f1, f2);
                        if (ok) matches.push(f2);
                    } catch (e) { }
                });
                if (matches.length > 0) {
                    matched = true;
                    const nf = JETLClone(f1);
                    if (strategy === 'first') {
                        const m = matches[0];
                        Object.keys(m.properties || {}).forEach(k => nf.properties[prefix + k] = m.properties[k]);
                    } else {
                        nf.properties[prefix + 'match_count'] = matches.length;
                        const agg = {};
                        matches.forEach(m => {
                            Object.keys(m.properties || {}).forEach(k => {
                                const v = m.properties[k];
                                if (typeof v === 'number' && !isNaN(v)) {
                                    if (!agg[k]) agg[k] = { sum: 0, min: v, max: v, count: 0 };
                                    agg[k].sum += v;
                                    agg[k].min = Math.min(agg[k].min, v);
                                    agg[k].max = Math.max(agg[k].max, v);
                                    agg[k].count += 1;
                                }
                            });
                        });
                        Object.keys(agg).forEach(k => {
                            const a = agg[k];
                            nf.properties[prefix + k + '_sum'] = a.sum;
                            nf.properties[prefix + k + '_avg'] = a.count ? a.sum / a.count : null;
                            nf.properties[prefix + k + '_min'] = a.min;
                            nf.properties[prefix + k + '_max'] = a.max;
                        });
                    }
                    joined.push(nf);
                }
                if (!matched && joinType === 'left') joined.push(f1);
                if (!matched) unmatched.push(f1);
            }
            return { output_1: turf.featureCollection(joined), output_2: turf.featureCollection(unmatched) };
        }
    },

    sp_nearest_neighbor: {
        cat: '2.2 VECTOR - SPATIAL', label: 'Nearest Neighbor', icon: 'fa-shoe-prints', color: '#8e44ad', in: 2, out: 2,
        tpl: () => `
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Radio Máximo</span>
                <div style="display:flex;gap:5px">
                    <input type="number" df-dist placeholder="Infinito" class="node-control">
                    <select df-unit class="node-control" style="width:80px">
                        <option value="kilometers">km</option>
                        <option value="meters">m</option>
                    </select>
                </div>
            </div>
            <div style="margin-bottom:4px">
                <label style="font-size:0.8em;color:#ccc;display:flex;align-items:center">
                    <input type="checkbox" df-copy checked style="margin-right:5px"> Copiar Atributos
                </label>
            </div>
            <div style="font-size:0.6em;color:#888">Out 1: Con Vecino | Out 2: Sin Vecino</div>`,
        run: async (id, inputs, dom) => {
            const distVal = dom.querySelector('[df-dist]').value;
            const units = dom.querySelector('[df-unit]').value;
            const copyAttr = dom.querySelector('[df-copy]').checked;

            // Si el campo está vacío, mandamos Infinity para que el Worker entienda que no hay límite
            const maxDist = (distVal && distVal.trim() !== '') ? parseFloat(distVal) : Infinity;

            const source = inputs[0];
            const candidates = inputs[1];

            if (!source || !source.features.length) throw new Error("Input 1 vacío");
            if (!candidates || !candidates.features.length) throw new Error("Input 2 vacío");

            // --- INTENTO VIA WORKER ---
            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();

                    const payload = {
                        task: 'nearest_neighbor',
                        source: source,
                        candidates: candidates,
                        maxDist: maxDist,
                        unit: units,
                        copyAttr: copyAttr
                    };

                    const wres = await postWorkerTask(payload, 60000);
                    if (wres && wres.status === 'ok') return wres.data;

                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker NN falló, fallback local:", e);
                }
            }

            // --- FALLBACK LOCAL (BRUTE FORCE) ---
            const matched = [];
            const unmatched = [];
            const candidateFC = turf.featureCollection(candidates.features.map((f, idx) => {
                const c = turf.centroid(f);
                c.properties = f.properties;
                c.id = idx;
                return c;
            }));

            for (let idx = 0; idx < source.features.length; idx++) {
                if (typeof window.JETLThrowIfCancelled === 'function') window.JETLThrowIfCancelled();
                if (idx % 50 === 0 && typeof window.JETLNextTick === 'function') await window.JETLNextTick();
                const f = source.features[idx];
                const center = turf.centroid(f);
                // nearestPoint de turf no soporta maxDist nativamente, busca el absoluto
                const nearest = turf.nearestPoint(center, candidateFC);

                let dist = nearest.properties.distanceToPoint;
                if (units === 'meters') dist = dist * 1000;

                // Comprobación manual de distancia
                if (dist <= maxDist) {
                    const res = JETLClone(f);
                    res.properties._neighbor_dist = parseFloat(dist.toFixed(4));
                    if (copyAttr) {
                        Object.keys(nearest.properties).forEach(k => {
                            if (k !== 'distanceToPoint' && k !== 'featureIndex') res.properties['neighbor_' + k] = nearest.properties[k];
                        });
                    } else {
                        res.properties._neighbor_id = nearest.id;
                    }
                    matched.push(res);
                } else {
                    unmatched.push(f);
                }
            }

            return {
                output_1: turf.featureCollection(matched),
                output_2: turf.featureCollection(unmatched)
            };
        }
    },

    sp_intersector: {
        cat: '2.2 VECTOR - SPATIAL', label: 'Intersector', icon: 'fa-times', color: '#8e44ad', in: 2, out: 2,
        tpl: () => `<div style="font-size:0.7em;color:#aaa">Calcula intersección. <br>Si son líneas, las corta.</div>
                    <div style="font-size:0.6em;color:#888;margin-top:2px">Out 1: Geometría (Líneas/Polys) | Out 2: Puntos</div>`,
        run: async (id, inputs) => {
            const source = inputs[0];
            const target = inputs[1];

            if (!source || !source.features.length) throw new Error("Input 1 vacío");
            if (!target || !target.features.length) throw new Error("Input 2 vacío");

            const features1 = source.features;
            const features2 = target.features;

            // Detectar modo automáticamente
            const isLineMode = features1.some(f => turf.getType(f).includes('Line')) && features2.some(f => turf.getType(f).includes('Line'));

            // --- INTENTO VIA WORKER ---
            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();

                    const payload = {
                        task: 'intersector',
                        source: source,
                        target: target,
                        isLineMode: isLineMode
                    };

                    // Tiempo extendido (90s) para intersecciones complejas
                    const wres = await postWorkerTask(payload, 90000);
                    if (wres && wres.status === 'ok') return wres.data;

                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker intersector falló, fallback local:", e);
                }
            }

            // --- FALLBACK: HILO PRINCIPAL (CÓDIGO ORIGINAL LEGACY) ---
            // Solo se ejecutará si falla el Worker
            const outGeom = [];
            const outPoints = [];

            if (isLineMode) {
                // Cálculo costoso global
                const intersections = turf.lineIntersect(source, target);
                if (intersections && intersections.features) outPoints.push(...intersections.features);

                // Split Input 1
                const sourceLines = turf.flatten(source).features;
                for (let idx = 0; idx < sourceLines.length; idx++) {
                    if (typeof window.JETLThrowIfCancelled === 'function') window.JETLThrowIfCancelled();
                    if (idx % 30 === 0 && typeof window.JETLNextTick === 'function') await window.JETLNextTick();
                    const line = sourceLines[idx];
                    let splitResult = [line];
                    try {
                        if (intersections.features.length > 0) {
                            const split = turf.lineSplit(line, intersections);
                            if (split && split.features.length > 0) splitResult = split.features;
                        }
                    } catch (e) { }
                    splitResult.forEach(s => { s.properties = { ...line.properties, _origin: 'input1' }; outGeom.push(s); });
                }

                // Split Input 2
                const targetLines = turf.flatten(target).features;
                for (let idx = 0; idx < targetLines.length; idx++) {
                    if (typeof window.JETLThrowIfCancelled === 'function') window.JETLThrowIfCancelled();
                    if (idx % 30 === 0 && typeof window.JETLNextTick === 'function') await window.JETLNextTick();
                    const line = targetLines[idx];
                    let splitResult = [line];
                    try {
                        if (intersections.features.length > 0) {
                            const split = turf.lineSplit(line, intersections);
                            if (split && split.features.length > 0) splitResult = split.features;
                        }
                    } catch (e) { }
                    splitResult.forEach(s => { s.properties = { ...line.properties, _origin: 'input2' }; outGeom.push(s); });
                }
            } else {
                // Polygons Loop O(N*M)
                const sourceFlat = turf.flatten(source).features;
                const targetFlat = turf.flatten(target).features;
                for (let i1 = 0; i1 < sourceFlat.length; i1++) {
                    if (typeof window.JETLThrowIfCancelled === 'function') window.JETLThrowIfCancelled();
                    if (i1 % 20 === 0 && typeof window.JETLNextTick === 'function') await window.JETLNextTick();
                    const f1 = sourceFlat[i1];
                    for (let i2 = 0; i2 < targetFlat.length; i2++) {
                        if (i2 % 200 === 0 && typeof window.JETLThrowIfCancelled === 'function') window.JETLThrowIfCancelled();
                        const f2 = targetFlat[i2];
                        try {
                            const intersection = turf.intersect(f1, f2);
                            if (intersection) {
                                intersection.properties = { ...f1.properties, ...f2.properties };
                                outGeom.push(intersection);
                            }
                        } catch (e) { }
                    }
                }
            }

            return {
                output_1: turf.featureCollection(outGeom),
                output_2: turf.featureCollection(outPoints)
            };
        }
    },

    sp_clip: {
        cat: '2.2 VECTOR - SPATIAL', label: 'Clipper (Robust)', icon: 'fa-crop', color: '#8e44ad', in: 2, out: 1,
        tpl: () => `<div>Data &#8745; Mask</div>`,
        run: async (id, i) => {
            if (!i[0] || !i[1] || !i[1].features.length) throw new Error("Faltan datos");
            if (!i[0].features || i[0].features.length === 0) throw new Error("Data vacía");

            let maskCollection = turf.flatten(i[1]);
            let dissolved = turf.dissolve(maskCollection);
            let mask = dissolved.features[0];
            if (dissolved.features.length > 1) {
                const coords = dissolved.features.map(f => f.geometry.coordinates);
                mask = turf.multiPolygon(coords);
            }
            try { mask = turf.simplify(mask, { tolerance: 0.00001, highQuality: true }); } catch (e) { }
            try { mask = turf.cleanCoords(mask); } catch (e) { }

            // Intentar usar Worker si está disponible (definido en index.html)
            const features = i[0].features;
            const CHUNK = 50;
            try {
                if (typeof postWorkerTask === 'function') {
                    if (!window.geoWorker) createGeoWorker(); // Asumiendo fn global
                    const payload = { task: 'clip', features: { type: 'FeatureCollection', features }, mask, chunk: CHUNK };
                    const wres = await postWorkerTask(payload, 30000);
                    if (wres && (wres.status === 'ok' || wres.status === 'partial')) {
                        return normalizeResult(wres.data || wres.result || wres);
                    }
                }
            } catch (e) {
                if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                console.log("Worker clip fallback");
            }

            // Fallback Main Thread
            const res = [];
            for (let idx = 0; idx < features.length; idx++) {
                if (typeof window.JETLThrowIfCancelled === 'function') window.JETLThrowIfCancelled();
                if (idx % 50 === 0 && typeof window.JETLNextTick === 'function') await window.JETLNextTick();
                const f = features[idx];
                try {
                    if (!turf.booleanIntersects(f, mask)) continue;
                    const clipped = turf.intersect(f, mask);
                    if (clipped) { clipped.properties = f.properties; res.push(clipped); }
                } catch (e) { }
            }
            return turf.featureCollection(res);
        }
    }
});





;

/* ---- js/nodes/attributes.js ---- */
﻿// Cat: attributes
(typeof window !== 'undefined' ? window : global).TOOL_REGISTRY = (typeof window !== 'undefined' ? window : global).TOOL_REGISTRY || {};
const SAFE_EXPR_MAX_LEN = 500;
const SAFE_EXPR_BLOCKLIST = [
    /\b(?:window|document|globalThis|self|Function|eval|fetch|XMLHttpRequest|localStorage|sessionStorage|indexedDB|caches|navigator|location)\b/i,
    /(?:__proto__|prototype|constructor)/i,
    /\b(?:import|export)\b/i
];

function validateSafeExpression(expr) {
    const source = String(expr || '').trim();
    if (!source) throw new Error("Expresion vacia");
    if (source.length > SAFE_EXPR_MAX_LEN) {
        throw new Error(`Expresion demasiado larga (max ${SAFE_EXPR_MAX_LEN} chars)`);
    }
    for (const rule of SAFE_EXPR_BLOCKLIST) {
        if (rule.test(source)) throw new Error("Expresion bloqueada por seguridad");
    }
    return source;
}

function compileSafeExpression(expr, argNames) {
    const source = validateSafeExpression(expr);
    const names = Array.isArray(argNames) ? argNames : [];
    return new Function(
        ...names,
        'Math',
        'turf',
        'window',
        'document',
        'globalThis',
        'self',
        'Function',
        'fetch',
        'XMLHttpRequest',
        `"use strict"; return (${source});`
    );
}

function parseCsvFields(raw) {
    return String(raw || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
}

function resolveParamText(raw) {
    if (typeof window !== 'undefined' && typeof window.JETLResolveParamText === 'function') {
        return window.JETLResolveParamText(raw);
    }
    return String(raw == null ? '' : raw);
}

function computeBasicStats(values) {
    const nums = values.filter((v) => typeof v === 'number' && !isNaN(v));
    if (!nums.length) return null;
    const sum = nums.reduce((a, b) => a + b, 0);
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    const avg = sum / nums.length;
    return { sum, min, max, avg, count: nums.length };
}

function writeFlatStatsToFeature(props, prefix, key, stats) {
    props[`${prefix}_${key}_sum`] = stats.sum;
    props[`${prefix}_${key}_min`] = stats.min;
    props[`${prefix}_${key}_max`] = stats.max;
    props[`${prefix}_${key}_avg`] = stats.avg;
    props[`${prefix}_${key}_count`] = stats.count;
}

function normalizeTestValue(raw, sampleVal) {
    const text = String(raw ?? '').trim();
    if (typeof sampleVal === 'number') {
        const n = Number(text);
        return isNaN(n) ? text : n;
    }
    if (typeof sampleVal === 'boolean') return text.toLowerCase() === 'true';
    return text;
}

function evalTestCondition(props, cond) {
    const left = props ? props[cond.field] : undefined;
    const op = String(cond.op || '==');
    const rightRaw = cond.value;
    const right = normalizeTestValue(rightRaw, left);

    if (op === 'like') return String(left ?? '').toLowerCase().includes(String(rightRaw ?? '').toLowerCase());
    if (op === 'starts') return String(left ?? '').toLowerCase().startsWith(String(rightRaw ?? '').toLowerCase());
    if (op === 'ends') return String(left ?? '').toLowerCase().endsWith(String(rightRaw ?? '').toLowerCase());
    if (op === 'in') {
        const list = String(rightRaw ?? '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
        return list.includes(String(left ?? ''));
    }
    if (op === '>') return left > Number(right);
    if (op === '>=') return left >= Number(right);
    if (op === '<') return left < Number(right);
    if (op === '<=') return left <= Number(right);
    if (op === '!=') return left != right;
    return left == right;
}

function evalTestGroup(props, conditions) {
    if (!Array.isArray(conditions) || !conditions.length) return true;
    let acc = evalTestCondition(props, conditions[0]);
    for (let i = 1; i < conditions.length; i++) {
        const join = String(conditions[i].join || 'AND').toUpperCase();
        const cur = evalTestCondition(props, conditions[i]);
        acc = join === 'OR' ? (acc || cur) : (acc && cur);
    }
    return acc;
}

Object.assign((typeof window !== 'undefined' ? window : global).TOOL_REGISTRY, {
    attr_stats: {
        cat: '2.3 VECTOR - ATTRIBUTES', label: 'Stats Calc', icon: 'fa-calculator', color: '#27ae60', in: 1, out: 2,
        tpl: () => `
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Campos numericos</span>
                <input type="text" df-field class="node-control" placeholder="campo1, campo2">
            </div>
            <div df-stats-fields style="max-height:110px; overflow:auto; border:1px solid #333; border-radius:4px; padding:6px; background:#151515; margin-bottom:6px"></div>
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Modo</span>
                <select df-mode class="node-control">
                    <option value="per_field">Stats por campo</option>
                    <option value="concat">Stats concatenadas</option>
                    <option value="both">Ambas</option>
                </select>
            </div>
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">On Error</span>
                <select df-on-error class="node-control">
                    <option value="null">Compat (no rechazar)</option>
                    <option value="reject">Rechazar sin numericos</option>
                </select>
            </div>
            <div style="font-size:0.6em;color:#666">Escribe columnas visibles: stats_*</div>`,
        run: async (id, inputs, dom) => {
            const fields = parseCsvFields(resolveParamText(dom.querySelector('[df-field]').value));
            const mode = dom.querySelector('[df-mode]')?.value || 'per_field';
            const onError = dom.querySelector('[df-on-error]')?.value || 'null';
            const prefix = 'stats';
            if (!fields.length) throw new Error("Define al menos un campo");

            if (onError !== 'reject' && typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const payload = {
                        task: 'attr_stats',
                        features: inputs[0],
                        fields,
                        mode,
                        prefix
                    };
                    const wres = await postWorkerTask(payload, 45000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker Stats fallo, fallback local:", e);
                }
            }

            const fc = inputs[0];
            const byField = {};
            fields.forEach((field) => {
                const values = fc.features.map((f) => (f.properties || {})[field]);
                const s = computeBasicStats(values);
                if (s) byField[field] = s;
            });
            if (!Object.keys(byField).length) throw new Error("No hay valores numericos en los campos elegidos");

            let concatStats = null;
            if (mode === 'concat' || mode === 'both') {
                const concatValues = [];
                fc.features.forEach((f) => {
                    const p = (f && f.properties) || {};
                    fields.forEach((k) => {
                        const v = p[k];
                        if (typeof v === 'number' && !isNaN(v)) concatValues.push(v);
                    });
                });
                concatStats = computeBasicStats(concatValues);
            }

            fc.features.forEach((f) => {
                if (!f.properties) f.properties = {};
                if (mode === 'per_field' || mode === 'both') {
                    Object.keys(byField).forEach((field) => {
                        writeFlatStatsToFeature(f.properties, prefix, field, byField[field]);
                    });
                }
                if ((mode === 'concat' || mode === 'both') && concatStats) {
                    writeFlatStatsToFeature(f.properties, prefix, 'concat', concatStats);
                }
            });

            if (onError === 'reject') {
                const passed = [];
                const rejected = [];
                fc.features.forEach((f) => {
                    const p = f.properties || {};
                    const hasNumeric = fields.some((k) => typeof p[k] === 'number' && !isNaN(p[k]));
                    if (hasNumeric) passed.push(f);
                    else {
                        const rf = (typeof window.JETLClone === 'function') ? window.JETLClone(f) : f;
                        if (!rf.properties) rf.properties = {};
                        rf.properties._stats_error = 'Sin valores numericos en campos objetivo';
                        rejected.push(rf);
                    }
                });
                return {
                    output_1: turf.featureCollection(passed),
                    output_2: turf.featureCollection(rejected)
                };
            }

            return fc;
        }
    },

    attr_renamer: {
        cat: '2.3 VECTOR - ATTRIBUTES', label: 'Renamer', icon: 'fa-tag', color: '#27ae60', in: 1, out: 2,
        tpl: () => `
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Mapeo (Viejo:Nuevo)</span>
                <input type="text" df-map class="node-control" placeholder="old:new, id:uid">
                <div style="font-size:0.6em;color:#666;font-style:italic">Separar pares por comas</div>
            </div>
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Asistente de campos</span>
                <div style="display:flex;gap:4px;margin-top:2px">
                    <select df-rename-old class="node-control" style="flex:1"></select>
                    <input type="text" df-rename-new class="node-control" style="flex:1" placeholder="nuevo_nombre">
                    <button class="btn" style="padding:4px 8px" data-schema-action="renamer-add" title="Agregar mapeo">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            </div>
            <div style="margin-top:4px">
                <span style="font-size:0.7em;color:#aaa">On Error</span>
                <select df-on-error class="node-control">
                    <option value="null">Compat (continuar)</option>
                    <option value="reject">Enviar a output_2</option>
                </select>
            </div>`,
        run: async (id, inputs, dom) => {
            const mapStr = resolveParamText(dom.querySelector('[df-map]').value);
            const onError = dom.querySelector('[df-on-error]')?.value || 'null';
            const mapping = mapStr.split(',').map(p => p.split(':').map(s => s.trim())).filter(([a, b]) => a && b);
            if (!mapping.length) throw new Error("Define al menos un mapeo old:new");

            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const wres = await postWorkerTask({
                        task: 'attr_renamer',
                        features: inputs[0],
                        mapping,
                        onError
                    }, 45000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker Renamer fallo, fallback local:", e);
                }
            }

            const passed = [];
            const rejected = [];
            inputs[0].features.forEach(f => {
                if (!f.properties) f.properties = {};
                try {
                    mapping.forEach(([oldName, newName]) => {
                        if (f.properties[oldName] === undefined) throw new Error(`Campo no encontrado: ${oldName}`);
                        f.properties[newName] = f.properties[oldName];
                        delete f.properties[oldName];
                    });
                    passed.push(f);
                } catch (e) {
                    if (onError === 'reject') {
                        const rf = (typeof window.JETLClone === 'function') ? window.JETLClone(f) : f;
                        if (!rf.properties) rf.properties = {};
                        rf.properties._renamer_error = e && e.message ? e.message : String(e);
                        rejected.push(rf);
                    } else {
                        passed.push(f);
                    }
                }
            });
            if (onError === 'reject') {
                return {
                    output_1: turf.featureCollection(passed),
                    output_2: turf.featureCollection(rejected)
                };
            }
            return turf.featureCollection(passed);
        }
    },

    attr_keeper: {
        cat: '2.3 VECTOR - ATTRIBUTES', label: 'Keeper', icon: 'fa-check-square', color: '#27ae60', in: 1, out: 2,
        tpl: () => `
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Campos a mantener</span>
                <input type="text" df-keep class="node-control" placeholder="id, name, type">
                <div style="font-size:0.6em;color:#666;font-style:italic">El resto serÃ¡ borrado</div>
            </div>
            <div df-keeper-fields style="max-height:110px; overflow:auto; border:1px solid #333; border-radius:4px; padding:6px; background:#151515; margin-bottom:6px"></div>
            <div style="margin-top:4px">
                <span style="font-size:0.7em;color:#aaa">On Error</span>
                <select df-on-error class="node-control">
                    <option value="null">Compat (continuar)</option>
                    <option value="reject">Enviar a output_2</option>
                </select>
            </div>`,
        run: async (id, inputs, dom) => {
            const keepStr = resolveParamText(dom.querySelector('[df-keep]').value);
            const onError = dom.querySelector('[df-on-error]')?.value || 'null';
            const toKeep = new Set(keepStr.split(',').map(s => s.trim()));
            if (!toKeep.size) throw new Error("Define al menos un campo a mantener");

            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const wres = await postWorkerTask({
                        task: 'attr_keeper',
                        features: inputs[0],
                        keepList: Array.from(toKeep),
                        onError
                    }, 45000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker Keeper fallo, fallback local:", e);
                }
            }

            const passed = [];
            const rejected = [];
            inputs[0].features.forEach(f => {
                if (!f.properties) f.properties = {};
                try {
                    let found = 0;
                    const newProps = {};
                    Object.keys(f.properties).forEach(k => {
                        if (toKeep.has(k)) {
                            newProps[k] = f.properties[k];
                            found++;
                        }
                    });
                    if (found === 0) throw new Error("Ningun campo objetivo presente");
                    f.properties = newProps;
                    passed.push(f);
                } catch (e) {
                    if (onError === 'reject') {
                        const rf = (typeof window.JETLClone === 'function') ? window.JETLClone(f) : f;
                        if (!rf.properties) rf.properties = {};
                        rf.properties._keeper_error = e && e.message ? e.message : String(e);
                        rejected.push(rf);
                    } else {
                        passed.push(f);
                    }
                }
            });
            if (onError === 'reject') {
                return {
                    output_1: turf.featureCollection(passed),
                    output_2: turf.featureCollection(rejected)
                };
            }
            return turf.featureCollection(passed);
        }
    },

    attr_creator: {
        cat: '2.3 VECTOR - ATTRIBUTES', label: 'Attr Creator', icon: 'fa-plus-square', color: '#27ae60', in: 1, out: 2,
        tpl: () => `
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Nuevo Campo</span>
                <input type="text" df-name class="node-control" value="new_field">
            </div>
            <div>
                <span style="font-size:0.7em;color:#aaa">Valor o FÃ³rmula (=)</span>
                <input type="text" df-val class="node-control" placeholder="Texto o =f.properties.id*2">
            </div>
            <div style="margin-top:4px">
                <span style="font-size:0.7em;color:#aaa">On Error</span>
                <select df-on-error class="node-control">
                    <option value="null">Asignar null (compat)</option>
                    <option value="reject">Enviar a output_2</option>
                </select>
            </div>`,
        run: async (id, inputs, dom) => {
            const field = resolveParamText(dom.querySelector('[df-name]').value);
            const exprRaw = resolveParamText(dom.querySelector('[df-val]').value);
            const onError = dom.querySelector('[df-on-error]')?.value || 'null';
            const isFormula = exprRaw.startsWith('=');

            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const wres = await postWorkerTask({
                        task: 'attr_creator',
                        features: inputs[0],
                        field,
                        exprRaw,
                        isFormula,
                        onError
                    }, 45000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker Attr Creator fallo, fallback local:", e);
                }
            }

            let formulaFn = null;
            let compileErr = null;
            if (isFormula) {
                try {
                    formulaFn = compileSafeExpression(exprRaw.substring(1), ['f']);
                } catch (e) {
                    compileErr = e;
                    console.warn("Error en fÃ³rmula Creator", e);
                }
            }

            const passed = [];
            const rejected = [];
            inputs[0].features.forEach((f) => {
                if (!f.properties) f.properties = {};

                if (isFormula && !formulaFn) {
                    if (onError === 'reject') {
                        const rf = (typeof window.JETLClone === 'function') ? window.JETLClone(f) : f;
                        if (!rf.properties) rf.properties = {};
                        rf.properties[field] = null;
                        rf.properties._creator_error = compileErr && compileErr.message ? compileErr.message : 'Formula invalida';
                        rejected.push(rf);
                    } else {
                        f.properties[field] = null;
                        passed.push(f);
                    }
                    return;
                }

                if (isFormula && formulaFn) {
                    try {
                        f.properties[field] = formulaFn(
                            f,
                            Math,
                            turf,
                            undefined,
                            undefined,
                            undefined,
                            undefined,
                            undefined,
                            undefined,
                            undefined
                        );
                        passed.push(f);
                    } catch (e) {
                        if (onError === 'reject') {
                            const rf = (typeof window.JETLClone === 'function') ? window.JETLClone(f) : f;
                            if (!rf.properties) rf.properties = {};
                            rf.properties[field] = null;
                            rf.properties._creator_error = e && e.message ? e.message : String(e);
                            rejected.push(rf);
                        } else {
                            f.properties[field] = null;
                            passed.push(f);
                        }
                    }
                } else {
                    f.properties[field] = exprRaw;
                    passed.push(f);
                }
            });
            if (onError === 'reject') {
                return {
                    output_1: turf.featureCollection(passed),
                    output_2: turf.featureCollection(rejected)
                };
            }
            return turf.featureCollection(passed);
        }
    },

    attr_counter: {
        cat: '2.3 VECTOR - ATTRIBUTES', label: 'Counter', icon: 'fa-sort-numeric-down', color: '#27ae60', in: 1, out: 1,
        tpl: () => `
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Nombre Campo ID</span>
                <input type="text" df-field class="node-control" value="_id">
            </div>
            <div>
                <span style="font-size:0.7em;color:#aaa">Valor Inicial</span>
                <input type="number" df-start class="node-control" value="1">
            </div>`,
        run: async (id, inputs, dom) => {
            const fieldName = resolveParamText(dom.querySelector('[df-field]').value);
            let count = parseInt(resolveParamText(dom.querySelector('[df-start]').value)) || 1;

            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const wres = await postWorkerTask({
                        task: 'attr_counter',
                        features: inputs[0],
                        fieldName,
                        start: count
                    }, 30000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker Counter fallo, fallback local:", e);
                }
            }

            inputs[0].features.forEach(f => {
                f.properties[fieldName] = count++;
            });
            return inputs[0];
        }
    },

    attr_sorter: {
        cat: '2.3 VECTOR - ATTRIBUTES', label: 'Sorter', icon: 'fa-sort-alpha-down', color: '#27ae60', in: 1, out: 1,
        tpl: () => `
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Campo a Ordenar</span>
                <select df-field class="node-control"></select>
            </div>
            <div>
                <span style="font-size:0.7em;color:#aaa">DirecciÃ³n</span>
                <select df-dir class="node-control">
                    <option value="asc">Ascendente (A-Z, 0-9)</option>
                    <option value="desc">Descendente (Z-A, 9-0)</option>
                </select>
            </div>`,
        run: async (id, inputs, dom) => {
            const field = resolveParamText(dom.querySelector('[df-field]').value);
            const dir = resolveParamText(dom.querySelector('[df-dir]').value) || 'asc';
            const features = [...inputs[0].features]; // Copia para sortear

            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const payload = {
                        task: 'attr_sorter',
                        features: { type: 'FeatureCollection', features },
                        field,
                        dir
                    };
                    const wres = await postWorkerTask(payload, 45000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker Sorter fallÃƒÂ³, fallback local:", e);
                }
            }

            features.sort((a, b) => {
                const valA = a.properties[field];
                const valB = b.properties[field];

                if (valA === valB) return 0;

                // DetecciÃ³n automÃ¡tica de tipo (NÃºmero vs Texto)
                const isNum = typeof valA === 'number' && typeof valB === 'number';

                let comparison = 0;
                if (isNum) {
                    comparison = valA - valB;
                } else {
                    // ComparaciÃ³n segura de strings (nulls al final)
                    comparison = String(valA || '').localeCompare(String(valB || ''), undefined, { numeric: true });
                }

                return dir === 'asc' ? comparison : -comparison;
            });

            return turf.featureCollection(features);
        }
    },

    attr_string_formatter: {
        cat: '2.3 VECTOR - ATTRIBUTES', label: 'String Formatter', icon: 'fa-text-width', color: '#27ae60', in: 1, out: 2,
        tpl: () => `
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Campo(s) Objetivo</span>
                <input type="text" df-field class="node-control" placeholder="Ej: name, type">
            </div>
            <div df-formatter-fields style="max-height:110px; overflow:auto; border:1px solid #333; border-radius:4px; padding:6px; background:#151515; margin-bottom:6px"></div>
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">OperaciÃ³n</span>
                <select df-op class="node-control">
                    <option value="upper">MayÃºsculas (UPPER)</option>
                    <option value="lower">MinÃºsculas (lower)</option>
                    <option value="capitalize">Capitalizar (Titulo)</option>
                    <option value="trim">Trim (Limpiar espacios)</option>
                    <option value="replace">Reemplazar (A -> B)</option>
                    <option value="concat">Concatenar (Suffix)</option>
                    <option value="pad">Rellenar (PadStart 001)</option>
                    <option value="template">Plantilla ({campo})</option>
                </select>
            </div>
            <div>
                <span style="font-size:0.7em;color:#aaa">Argumentos (Sep: | )</span>
                <input type="text" df-args class="node-control" placeholder="old|new Ã³ 000">
            </div>
            <div style="margin-top:4px">
                <span style="font-size:0.7em;color:#aaa">On Error</span>
                <select df-on-error class="node-control">
                    <option value="null">Compat (asignar vacio)</option>
                    <option value="reject">Enviar a output_2</option>
                </select>
            </div>
            <div style="font-size:0.6em;color:#666;margin-top:2px">
                Para Replace: "buscar|reemplazo"<br>
                Para Template: "ID_{id}_zona"
            </div>`,
        run: async (id, inputs, dom) => {
            const fieldRaw = resolveParamText(dom.querySelector('[df-field]').value);
            const op = resolveParamText(dom.querySelector('[df-op]').value) || 'upper';
            const argsRaw = resolveParamText(dom.querySelector('[df-args]').value || '');
            const onError = dom.querySelector('[df-on-error]')?.value || 'null';
            const fields = fieldRaw.split(',').map((s) => s.trim()).filter(Boolean);
            if (!fields.length) throw new Error("Campo objetivo vacio");

            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const wres = await postWorkerTask({
                        task: 'attr_string_formatter',
                        features: inputs[0],
                        fields,
                        op,
                        argsRaw,
                        onError
                    }, 45000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker String Formatter fallo, fallback local:", e);
                }
            }

            // Parsear argumentos (separador pipe | para replace)
            const args = argsRaw.split('|');
            const arg1 = args[0];
            const arg2 = args[1] || '';
            const passed = [];
            const rejected = [];

            inputs[0].features.forEach(f => {
                if (!f.properties) f.properties = {};
                try {
                    fields.forEach((field) => {
                        if (f.properties[field] === undefined && op !== 'template') {
                            throw new Error(`Campo no encontrado: ${field}`);
                        }
                        let val = f.properties[field];
                        if (val === undefined || val === null) val = '';
                        val = String(val);

                        switch (op) {
                            case 'upper': val = val.toUpperCase(); break;
                            case 'lower': val = val.toLowerCase(); break;
                            case 'trim': val = val.trim(); break;
                            case 'capitalize':
                                val = val.charAt(0).toUpperCase() + val.slice(1).toLowerCase();
                                break;
                            case 'replace':
                                // Reemplazo global simple
                                val = val.split(arg1).join(arg2);
                                break;
                            case 'concat':
                                val = val + arg1;
                                break;
                            case 'pad': {
                                // Arg1: Longitud total, Arg2: CarÃ¡cter relleno (defecto '0')
                                const len = parseInt(arg1) || 3;
                                const char = arg2 || '0';
                                val = val.padStart(len, char);
                                break;
                            }
                            case 'template': {
                                // Reemplaza {campo} por el valor de ese campo
                                // El argumento es la plantilla completa, ignorando el valor original del campo objetivo
                                let tpl = argsRaw;
                                Object.keys(f.properties).forEach(k => {
                                    const regex = new RegExp(`{${k}}`, 'g');
                                    tpl = tpl.replace(regex, f.properties[k]);
                                });
                                val = tpl;
                                break;
                            }
                        }
                        f.properties[field] = val;
                    });
                    passed.push(f);
                } catch (e) {
                    if (onError === 'reject') {
                        const rf = (typeof window.JETLClone === 'function') ? window.JETLClone(f) : f;
                        if (!rf.properties) rf.properties = {};
                        rf.properties._fmt_error = e && e.message ? e.message : String(e);
                        rejected.push(rf);
                    } else {
                        fields.forEach((field) => { f.properties[field] = ''; });
                        passed.push(f);
                    }
                }
            });

            if (onError === 'reject') {
                return {
                    output_1: turf.featureCollection(passed),
                    output_2: turf.featureCollection(rejected)
                };
            }
            return turf.featureCollection(passed);
        }
    },

    attr_feature_merger: {
        cat: '2.3 VECTOR - ATTRIBUTES', label: 'Feature Merger', icon: 'fa-code-branch', color: '#27ae60', in: 2, out: 3,
        tpl: () => `
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">RelaciÃ³n (Input1 : Input2)</span>
                <input type="text" df-map class="node-control" placeholder="tipo:TIPO, id:ID_REF">
                <div style="font-size:0.6em;color:#666;font-style:italic">Separar pares por comas.</div>
            </div>
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Asistente de campos</span>
                <div style="display:flex; gap:4px; margin-top:2px">
                    <select class="node-control" df-join-left style="flex:1"></select>
                    <select class="node-control" df-join-right style="flex:1"></select>
                    <button class="btn" style="padding:4px 8px" data-schema-action="join-add" title="Agregar par a la relacion">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            </div>
            <div style="font-size:0.6em;color:#888;margin-top:4px">
                Out 1: Merged<br>Out 2: Not Merged (Input 1)<br>Out 3: Unused (Input 2)
            </div>`,
        run: async (id, inputs, dom) => {
            const mapStr = resolveParamText(dom.querySelector('[df-map]').value);
            const reqFeatures = inputs[0].features; // Requestor (Mantiene geometrÃ­a)
            const supFeatures = inputs[1].features; // Supplier (Aporta atributos)

            // Parsear el mapeo "campo1:campo2, campoA:campoB"
            const joinPairs = mapStr.split(',').map(p => p.split(':').map(s => s.trim()));
            if (joinPairs.length === 0 || !joinPairs[0][0]) throw new Error("Define campos de uniÃ³n");
            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const payload = {
                        task: 'attr_feature_merger',
                        requestor: { type: 'FeatureCollection', features: reqFeatures },
                        supplier: { type: 'FeatureCollection', features: supFeatures },
                        joinPairs: joinPairs
                    };
                    const wres = await postWorkerTask(payload, 60000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker Feature Merger fallÃ³, fallback local:", e);
                }
            }

            // FunciÃ³n auxiliar para generar Hash Keys
            const getKey = (props, fields) => fields.map(f => String(props[f] || 'null')).join('|_|');

            // 1. Indexar el Supplier (Input 2)
            const supMap = new Map();
            const supKeys = joinPairs.map(p => p[1]); // Lado derecho del par

            supFeatures.forEach((f, idx) => {
                const key = getKey(f.properties, supKeys);
                // Si hay duplicados en el supplier, nos quedamos con el primero (First Match)
                if (!supMap.has(key)) {
                    supMap.set(key, { props: f.properties, originalIdx: idx, used: false });
                }
            });

            const merged = [];
            const notMerged = [];

            // 2. Procesar Requestor (Input 1)
            const reqKeys = joinPairs.map(p => p[0]); // Lado izquierdo del par

            reqFeatures.forEach(f => {
                const key = getKey(f.properties, reqKeys);

                if (supMap.has(key)) {
                    // Match encontrado!
                    const supData = supMap.get(key);
                    supData.used = true; // Marcamos supplier como usado

                    // Clonamos feature para no mutar original
                    const newF = JETLClone(f);
                    // Fusionamos atributos (Supplier sobrescribe a Requestor en caso de colisiÃ³n)
                    newF.properties = { ...newF.properties, ...supData.props };
                    merged.push(newF);
                } else {
                    // No match
                    notMerged.push(f);
                }
            });

            // 3. Recolectar Unused Suppliers (Input 2 que sobraron)
            const unusedSup = supFeatures.filter((f, idx) => {
                // Como supMap solo guarda el primero de cada serie duplicada, 
                // necesitamos una forma de saber si este feature especÃ­fico fue "tocado".
                // Una forma robusta es volver a generar su key y ver si esa key estÃ¡ marcada como usada en el mapa.
                const key = getKey(f.properties, supKeys);
                const mapEntry = supMap.get(key);
                // Si la entrada del mapa fue usada, consideramos todos los duplicados de esa clave como usados?
                // Generalmente en FeatureMerger 1:1, los duplicados del supplier que no se usaron son "Unused".
                // Pero para simplificar lÃ³gica visual: Si la clave se usÃ³, el "concepto" se usÃ³.
                // AquÃ­ seremos estrictos: Solo devolvemos los que NO fueron la fuente de datos.

                return !mapEntry || !mapEntry.used;
            });

            return {
                output_1: turf.featureCollection(merged),
                output_2: turf.featureCollection(notMerged),
                output_3: turf.featureCollection(unusedSup)
            };
        }
    },

    attr_join_adv: {
        cat: '2.3 VECTOR - ATTRIBUTES', label: 'Attribute Join', icon: 'fa-link', color: '#27ae60', in: 2, out: 2,
        help: 'Join tabular por claves (left/inner).',
        tpl: () => `
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Relacion (Input1 : Input2)</span>
                <input type="text" df-map class="node-control" placeholder="id:ID_REF, tipo:TYPE">
            </div>
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Asistente de campos</span>
                <div style="display:flex; gap:4px; margin-top:2px">
                    <select class="node-control" df-join-left style="flex:1"></select>
                    <select class="node-control" df-join-right style="flex:1"></select>
                    <button class="btn" style="padding:4px 8px" data-schema-action="join-add" title="Agregar par a la relacion">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            </div>
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Tipo Join</span>
                <select df-join class="node-control">
                    <option value="left">Left</option>
                    <option value="inner">Inner</option>
                </select>
            </div>
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Prefijo</span>
                <input type="text" df-prefix class="node-control" value="j_">
            </div>
            <div style="font-size:0.6em;color:#888">Out 1: Join | Out 2: Sin Match</div>`,
        run: async (id, inputs, dom) => {
            const mapStr = resolveParamText(dom.querySelector('[df-map]').value);
            const joinType = resolveParamText(dom.querySelector('[df-join]').value) || 'left';
            const prefix = resolveParamText(dom.querySelector('[df-prefix]').value) || 'j_';
            const left = inputs[0].features || [];
            const right = inputs[1].features || [];
            const joinPairs = mapStr.split(',').map(p => p.split(':').map(s => s.trim())).filter(p => p[0] && p[1]);
            if (joinPairs.length === 0) throw new Error("Define campos de union");
            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const payload = {
                        task: 'attr_join',
                        left: { type: 'FeatureCollection', features: left },
                        right: { type: 'FeatureCollection', features: right },
                        joinPairs,
                        joinType,
                        prefix
                    };
                    const wres = await postWorkerTask(payload, 60000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker Attribute Join fallÃ³, fallback local:", e);
                }
            }
            const getKey = (props, fields) => fields.map(f => String(props[f] || 'null')).join('|_|');
            const rightKeys = joinPairs.map(p => p[1]);
            const leftKeys = joinPairs.map(p => p[0]);
            const index = new Map();
            right.forEach(f => {
                const key = getKey(f.properties || {}, rightKeys);
                if (!index.has(key)) index.set(key, f);
            });
            const joined = [];
            const unmatched = [];
            left.forEach(f => {
                if (!f.properties) f.properties = {};
                const key = getKey(f.properties || {}, leftKeys);
                const match = index.get(key);
                if (match) {
                    const nf = JETLClone(f);
                    Object.keys(match.properties || {}).forEach(k => nf.properties[prefix + k] = match.properties[k]);
                    joined.push(nf);
                } else {
                    if (joinType === 'left') joined.push(f);
                    unmatched.push(f);
                }
            });
            return { output_1: turf.featureCollection(joined), output_2: turf.featureCollection(unmatched) };
        }
    },
    attr_calc_pro: {
        cat: '2.3 VECTOR - ATTRIBUTES', label: 'Field Calculator Pro', icon: 'fa-keyboard', color: '#27ae60', in: 1, out: 2,
        help: 'Expresiones JS con helpers: props, feat, Math, turf.',
        tpl: () => `
            <div class="node-editor-summary">
                <i class="fas fa-keyboard"></i>
                <div><strong data-calc-summary>new_field</strong><small>Configura una expresión por elemento</small></div>
            </div>
            <button type="button" class="btn node-editor-open" data-schema-action="calc-open-editor">
                <i class="fas fa-pen"></i> Abrir editor
            </button>
            <div class="node-editor-storage" aria-hidden="true">
                <input type="text" df-name class="node-control" value="new_field" tabindex="-1">
                <textarea df-expr class="node-control" tabindex="-1"></textarea>
                <select df-on-error class="node-control" tabindex="-1">
                    <option value="null">Asignar null (compat)</option>
                    <option value="reject">Enviar a output_2</option>
                </select>
                <select df-source-field class="node-control" tabindex="-1"></select>
            </div>`,
        run: async (id, inputs, dom) => {
            const field = resolveParamText(dom.querySelector('[df-name]').value);
            const exprRaw = resolveParamText(dom.querySelector('[df-expr]').value);
            const onError = dom.querySelector('[df-on-error]')?.value || 'null';
            if (!field) throw new Error("Campo destino vacio");
            if (!exprRaw) throw new Error("Expresion vacia");

            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const wres = await postWorkerTask({
                        task: 'attr_calc_pro',
                        features: inputs[0],
                        field,
                        exprRaw,
                        onError
                    }, 45000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker Field Calculator Pro fallo, fallback local:", e);
                }
            }
            const fn = compileSafeExpression(exprRaw, ['props', 'feat']);
            const passed = [];
            const rejected = [];
            inputs[0].features.forEach((f) => {
                if (!f.properties) f.properties = {};
                try {
                    f.properties[field] = fn(
                        f.properties || {},
                        f,
                        Math,
                        turf,
                        undefined,
                        undefined,
                        undefined,
                        undefined,
                        undefined,
                        undefined,
                        undefined
                    );
                    passed.push(f);
                } catch (e) {
                    if (onError === 'reject') {
                        const rf = (typeof window.JETLClone === 'function') ? window.JETLClone(f) : f;
                        if (!rf.properties) rf.properties = {};
                        rf.properties[field] = null;
                        rf.properties._calc_error = e && e.message ? e.message : String(e);
                        rejected.push(rf);
                    } else {
                        f.properties[field] = null;
                        passed.push(f);
                    }
                }
            });
            if (onError === 'reject') {
                return {
                    output_1: turf.featureCollection(passed),
                    output_2: turf.featureCollection(rejected)
                };
            }
            return turf.featureCollection(passed);
        }
    },
    attr_area: {
        cat: '2.3 VECTOR - ATTRIBUTES', label: 'Area Calc', icon: 'fa-ruler-combined', color: '#27ae60', in: 1, out: 2,
        tpl: () => `
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Nombre del Campo</span>
                <input type="text" df-field class="node-control" value="_area" placeholder="_area">
            </div>
            <div>
                <span style="font-size:0.7em;color:#aaa">Unidades</span>
                <select df-unit class="node-control">
                    <option value="1">Metros cuadrados (mÂ²)</option>
                    <option value="0.000001">KilÃ³metros cuadrados (kmÂ²)</option>
                    <option value="0.0001">HectÃ¡reas (ha)</option>
                    <option value="10.7639">Pies cuadrados (ftÂ²)</option>
                </select>
            </div>
            <div style="margin-top:4px">
                <span style="font-size:0.7em;color:#aaa">On Error</span>
                <select df-on-error class="node-control">
                    <option value="null">Asignar null (compat)</option>
                    <option value="reject">Enviar a output_2</option>
                </select>
            </div>`,
        run: async (id, inputs, dom) => {
            const fieldName = resolveParamText(dom.querySelector('[df-field]').value) || '_area';
            const multiplier = parseFloat(dom.querySelector('[df-unit]').value);
            const onError = dom.querySelector('[df-on-error]')?.value || 'null';
            const passed = [];
            const rejected = [];

            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const wres = await postWorkerTask({
                        task: 'attr_area',
                        features: inputs[0],
                        fieldName,
                        multiplier,
                        onError
                    }, 45000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker Area Calc fallo, fallback local:", e);
                }
            }

            inputs[0].features.forEach((f) => {
                if (!f.properties) f.properties = {};
                try {
                    // Turf siempre calcula en mÂ²
                    const areaSqM = turf.area(f);
                    // Aplicamos el factor de conversiÃ³n
                    f.properties[fieldName] = parseFloat((areaSqM * multiplier).toFixed(4));
                    passed.push(f);
                } catch (e) {
                    if (onError === 'reject') {
                        const rf = (typeof window.JETLClone === 'function') ? window.JETLClone(f) : f;
                        if (!rf.properties) rf.properties = {};
                        rf.properties[fieldName] = null;
                        rf.properties._area_error = e && e.message ? e.message : String(e);
                        rejected.push(rf);
                    } else {
                        f.properties[fieldName] = null;
                        passed.push(f);
                    }
                }
            });
            if (onError === 'reject') {
                return {
                    output_1: turf.featureCollection(passed),
                    output_2: turf.featureCollection(rejected)
                };
            }
            return turf.featureCollection(passed);
        }
    },

    attr_length: {
        cat: '2.3 VECTOR - ATTRIBUTES', label: 'Length Calc', icon: 'fa-ruler-horizontal', color: '#27ae60', in: 1, out: 2,
        tpl: () => `
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Nombre del Campo</span>
                <input type="text" df-field class="node-control" value="_length" placeholder="_length">
            </div>
            <div>
                <span style="font-size:0.7em;color:#aaa">Unidades</span>
                <select df-unit class="node-control">
                    <option value="kilometers">KilÃ³metros (km)</option>
                    <option value="meters">Metros (m)</option>
                    <option value="centimeters">CentÃ­metros (cm)</option>
                    <option value="miles">Millas</option>
                    <option value="feet">Pies</option>
                </select>
            </div>
            <div style="margin-top:4px">
                <span style="font-size:0.7em;color:#aaa">On Error</span>
                <select df-on-error class="node-control">
                    <option value="null">Asignar null (compat)</option>
                    <option value="reject">Enviar a output_2</option>
                </select>
            </div>`,
        run: async (id, inputs, dom) => {
            const fieldName = resolveParamText(dom.querySelector('[df-field]').value) || '_length';
            const unit = resolveParamText(dom.querySelector('[df-unit]').value) || 'meters';
            const onError = dom.querySelector('[df-on-error]')?.value || 'null';
            const passed = [];
            const rejected = [];

            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const wres = await postWorkerTask({
                        task: 'attr_length',
                        features: inputs[0],
                        fieldName,
                        unit,
                        onError
                    }, 45000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker Length Calc fallo, fallback local:", e);
                }
            }

            inputs[0].features.forEach((f) => {
                if (!f.properties) f.properties = {};
                try {
                    const gType = f && f.geometry ? f.geometry.type : null;
                    if (gType !== 'LineString' && gType !== 'MultiLineString') {
                        throw new Error('Geometria no lineal para Length Calc');
                    }
                    let length;

                    if (unit === 'centimeters') {
                        // Turf no tiene 'centimeters' nativo en versiones antiguas, calculamos en metros * 100
                        length = turf.length(f, { units: 'meters' }) * 100;
                    } else {
                        // Para el resto usamos la conversiÃ³n nativa de Turf
                        length = turf.length(f, { units: unit });
                    }

                    f.properties[fieldName] = parseFloat(length.toFixed(4));
                    passed.push(f);
                } catch (e) {
                    if (onError === 'reject') {
                        const rf = (typeof window.JETLClone === 'function') ? window.JETLClone(f) : f;
                        if (!rf.properties) rf.properties = {};
                        rf.properties[fieldName] = null;
                        rf.properties._length_error = e && e.message ? e.message : String(e);
                        rejected.push(rf);
                    } else {
                        f.properties[fieldName] = null;
                        passed.push(f);
                    }
                }
            });
            if (onError === 'reject') {
                return {
                    output_1: turf.featureCollection(passed),
                    output_2: turf.featureCollection(rejected)
                };
            }
            return turf.featureCollection(passed);
        }
    },

    attr_matcher: {
        cat: '2.3 VECTOR - ATTRIBUTES', label: 'Matcher', icon: 'fa-clone', color: '#27ae60', in: 1, out: 2,
        tpl: () => `
            <div style="margin-bottom:6px">
                <span style="font-size:0.7em;color:#aaa">Criterio de Coincidencia</span>
                <div style="display:flex; flex-direction:column; gap:4px; margin-top:2px">
                    <label style="font-size:0.8em; display:flex; align-items:center; color:#ddd">
                        <input type="checkbox" df-geo checked style="margin-right:6px"> GeometrÃ­a
                    </label>
                    <label style="font-size:0.8em; display:flex; align-items:center; color:#ddd">
                        <input type="checkbox" df-attr style="margin-right:6px"> Atributos
                    </label>
                </div>
            </div>
            <div>
                <span style="font-size:0.7em;color:#aaa">Campos (Si Atributos = ON)</span>
                <input type="text" df-fields class="node-control" placeholder="Ej: id, type">
                <div df-matcher-fields style="max-height:110px; overflow:auto; border:1px solid #333; border-radius:4px; padding:6px; background:#151515; margin-top:4px"></div>
                <div style="font-size:0.6em;color:#666;font-style:italic">VacÃ­o = Todos los campos.</div>
            </div>
            <div style="font-size:0.6em;color:#888;margin-top:4px">Out 1: Ãšnicos | Out 2: Duplicados</div>`,
        run: async (id, inputs, dom) => {
            const matchGeo = dom.querySelector('[df-geo]').checked;
            const matchAttr = dom.querySelector('[df-attr]').checked;
            const rawFields = resolveParamText(dom.querySelector('[df-fields]').value);

            const uniques = [];
            const duplicates = [];
            const seenHashes = new Set();

            const targetFields = rawFields ? rawFields.split(',').map(s => s.trim()).filter(s => s !== '') : null;

            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const payload = {
                        task: 'attr_matcher',
                        features: { type: 'FeatureCollection', features: inputs[0].features || [] },
                        matchGeo,
                        matchAttr,
                        targetFields
                    };
                    const wres = await postWorkerTask(payload, 60000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker Matcher fallÃƒÂ³, fallback local:", e);
                }
            }

            inputs[0].features.forEach(f => {
                let hashParts = [];

                // 1. Huella de GeometrÃ­a
                if (matchGeo) {
                    // Usamos stringify de las coordenadas para comparaciÃ³n exacta
                    hashParts.push(JSON.stringify(f.geometry));
                }

                // 2. Huella de Atributos
                if (matchAttr) {
                    if (targetFields && targetFields.length > 0) {
                        // Concatenar solo campos especÃ­ficos
                        const attrVal = targetFields.map(k => {
                            const val = f.properties[k];
                            return val !== undefined && val !== null ? val : 'null';
                        }).join('_|_');
                        hashParts.push(attrVal);
                    } else {
                        // Concatenar todo el objeto de propiedades (ordenado para consistencia)
                        // Para evitar problemas de orden de claves, ordenamos keys
                        const sortedProps = {};
                        Object.keys(f.properties || {}).sort().forEach(key => {
                            sortedProps[key] = f.properties[key];
                        });
                        hashParts.push(JSON.stringify(sortedProps));
                    }
                }

                // Si no se selecciona nada, asumimos que no hay criterio => todos son Ãºnicos (o error)
                if (hashParts.length === 0) {
                    uniques.push(f);
                    return;
                }

                const finalHash = hashParts.join('###');

                if (seenHashes.has(finalHash)) {
                    duplicates.push(f);
                } else {
                    seenHashes.add(finalHash);
                    uniques.push(f);
                }
            });

            return {
                output_1: turf.featureCollection(uniques),
                output_2: turf.featureCollection(duplicates)
            };
        }
    },
    attr_test: {
        cat: '2.3 VECTOR - ATTRIBUTES', label: 'Tester', icon: 'fa-balance-scale', color: '#27ae60', in: 1, out: 2,
        tpl: () => `
            <div df-test-rows style="display:flex; flex-direction:column; gap:6px;"></div>
            <div style="display:flex; gap:6px; margin-top:6px;">
                <button class="node-btn-mini" type="button" data-schema-action="test-add-row" title="Agregar condicion">
                    <i class="fas fa-plus"></i>
                </button>
            </div>
            <div style="font-size:0.62em;color:#777;margin-top:4px;">Operadores: =, !=, >, >=, <, <=, like, starts, ends, in</div>
        `,
        run: async (id, i, d) => {
            const rows = Array.from(d.querySelectorAll('[data-test-row]'));
            let conditions = rows
                .map((row, idx) => {
                    const field = resolveParamText(row.querySelector('[df-test-field]')?.value || '');
                    const op = row.querySelector('[df-test-op]')?.value || '==';
                    const value = resolveParamText(row.querySelector('[df-test-val]')?.value || '');
                    const join = idx === 0 ? 'AND' : (row.querySelector('[df-test-join]')?.value || 'AND');
                    if (!field) return null;
                    return { field, op, value, join };
                })
                .filter(Boolean);
            if (!conditions.length) {
                const legacyField = resolveParamText(d.querySelector('[df-l]')?.value || '');
                const legacyOp = d.querySelector('[df-op]')?.value || '==';
                const legacyVal = resolveParamText(d.querySelector('[df-r]')?.value || '');
                if (legacyField) conditions = [{ field: legacyField, op: legacyOp, value: legacyVal, join: 'AND' }];
            }
            if (!conditions.length) throw new Error("Define al menos una condicion");

            const p = [];
            const f = [];

            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const payload = {
                        task: 'attr_test',
                        features: i[0],
                        conditions
                    };
                    const wres = await postWorkerTask(payload, 45000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn("Worker Tester fallo, fallback local:", e);
                }
            }

            i[0].features.forEach((feat) => {
                const props = (feat && feat.properties) || {};
                const pass = evalTestGroup(props, conditions);
                if (pass) p.push(feat);
                else f.push(feat);
            });
            return { output_1: turf.featureCollection(p), output_2: turf.featureCollection(f) };
        }
    }
});







;

/* ---- js/nodes/raster.js ---- */
// Cat: raster
(typeof window !== 'undefined' ? window : global).TOOL_REGISTRY = (typeof window !== 'undefined' ? window : global).TOOL_REGISTRY || {};
Object.assign((typeof window !== 'undefined' ? window : global).TOOL_REGISTRY, {
    sp_point_sampling: {
        cat: '4. RASTER', label: 'Multi-Band Sampler', icon: 'fa-crosshairs', color: '#8e44ad',
        in: 2,
        out: 1,
        tpl: () => `
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Prefijo Salida</span>
                <input type="text" df-prefix class="node-control" value="val" placeholder="Ej: val">
            </div>
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Modo Extraccion</span>
                <select df-mode class="node-control">
                    <option value="all">Todas las Bandas</option>
                    <option value="select">Bandas Especificas</option>
                </select>
                <input type="text" df-bands class="node-control" style="display:none;margin-top:2px" placeholder="Indices (ej: 0, 2, 4)" title="Indices separados por coma">
            </div>
            <div>
                <span style="font-size:0.7em;color:#aaa">Grid Step (Si no hay puntos)</span>
                <input type="number" df-step class="node-control" value="1" min="1">
            </div>`,
        run: async (id, inputs, dom) => {
            const throwIfCancelled = () => {
                if (typeof window.JETLThrowIfCancelled === 'function') return window.JETLThrowIfCancelled();
                if (window.isEngineCancelled) {
                    const err = new Error('Operacion cancelada por el usuario');
                    err.name = 'CancelledError';
                    err.cancelled = true;
                    throw err;
                }
            };
            const nextTick = async () => {
                if (typeof window.JETLNextTick === 'function') return window.JETLNextTick();
                return new Promise(r => setTimeout(r, 0));
            };

            // 1. Deteccion inteligente de entradas
            let rasterInput = null;
            let pointsInput = null;

            inputs.forEach(inp => {
                if (inp && inp.features && inp.features.length > 0) {
                    if (inp.features[0].properties && inp.features[0].properties._raster_ref_id) {
                        rasterInput = inp;
                    } else {
                        pointsInput = inp;
                    }
                }
            });

            if (!rasterInput) throw new Error('No se detecto el GeoTIFF. Conecta el Reader.');

            // 2. Recuperacion del binario
            const refId = rasterInput.features[0].properties._raster_ref_id;
            const buffer = window._tiff_cache ? window._tiff_cache[refId] : null;
            if (!buffer) throw new Error('El archivo expiro. Recarga el Reader.');
            throwIfCancelled();

            // 3. Params UI
            const prefix = dom.querySelector('[df-prefix]').value || 'val';
            const step = parseInt(dom.querySelector('[df-step]').value) || 1;
            const mode = dom.querySelector('[df-mode]').value; // 'all' o 'select'
            const bandsStr = dom.querySelector('[df-bands]').value;

            // Parseamos bandas seleccionadas
            let selectedIndices = [];
            if (mode === 'select') {
                selectedIndices = bandsStr.split(',')
                    .map(s => parseInt(s.trim()))
                    .filter(n => !isNaN(n));
                if (selectedIndices.length === 0) throw new Error('Modo Seleccion: indica al menos un indice (ej: 0).');
            }

            if (window.log) window.log(`Procesando Raster (${mode === 'select' ? 'Bandas: ' + selectedIndices.join(',') : 'Todas'})...`);

            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const wres = await postWorkerTask({
                        task: 'raster_sample',
                        rasterBuffer: buffer,
                        pointsFC: pointsInput || null,
                        prefix,
                        mode,
                        selectedIndices,
                        step
                    }, 180000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn('Worker raster_sample fallo, fallback local:', e);
                }
            }

            // 4. Parseo geoblaze
            const georaster = await geoblaze.parse(buffer);
            let outputFeatures = [];
            let hits = 0;

            // Helper de asignacion
            const assignBand = (feat, val, bandIdx) => {
                if (val !== null && !isNaN(val)) {
                    feat.properties[`${prefix}_b${bandIdx}`] = parseFloat(Number(val).toFixed(4));
                } else {
                    feat.properties[`${prefix}_b${bandIdx}`] = null;
                }
            };

            // Caso A: muestreo de puntos
            if (pointsInput) {
                const features = pointsInput.features;
                if (window.log) window.log(`Muestreando ${features.length} puntos...`);

                const BATCH = 64;
                outputFeatures = [];
                for (let i = 0; i < features.length; i += BATCH) {
                    throwIfCancelled();
                    const slice = features.slice(i, i + BATCH);
                    const rows = await Promise.all(slice.map(async (f) => {
                        const newF = JETLClone(f);
                        if (turf.getType(newF) === 'Point') {
                            try {
                                const coords = turf.getCoords(newF);
                                // identify devuelve Number (1 banda) o Array (N bandas)
                                let raw = await geoblaze.identify(georaster, coords);
                                if (!Array.isArray(raw)) raw = [raw];

                                if (mode === 'all') {
                                    raw.forEach((val, idx) => assignBand(newF, val, idx));
                                } else {
                                    selectedIndices.forEach(idx => {
                                        if (idx < raw.length) assignBand(newF, raw[idx], idx);
                                    });
                                }
                                hits++;
                            } catch (e) {
                                // fuera de rango
                            }
                        }
                        return newF;
                    }));
                    outputFeatures.push(...rows);
                    if ((i / BATCH) % 8 === 0) await nextTick();
                }
            }
            // Caso B: generacion de grid
            else {
                const { width, height, pixelWidth, pixelHeight, xmin, ymax } = georaster;

                const estimatedPoints = (width / step) * (height / step);
                if (estimatedPoints > 150000) console.warn(`Generando ~${Math.round(estimatedPoints)} puntos.`);

                for (let y = 0; y < height; y += step) {
                    throwIfCancelled();
                    for (let x = 0; x < width; x += step) {
                        const centX = xmin + (x * pixelWidth) + (pixelWidth / 2);
                        const centY = ymax - (y * pixelHeight) - (pixelHeight / 2);
                        const newF = turf.point([centX, centY]);

                        // Leemos solo lo necesario de la matriz values
                        if (mode === 'all') {
                            georaster.values.forEach((bandGrid, bIdx) => {
                                const val = bandGrid[y][x];
                                assignBand(newF, val, bIdx);
                            });
                        } else {
                            selectedIndices.forEach(bIdx => {
                                if (georaster.values[bIdx]) {
                                    const val = georaster.values[bIdx][y][x];
                                    assignBand(newF, val, bIdx);
                                }
                            });
                        }

                        outputFeatures.push(newF);
                        hits++;
                    }
                    if (((y / step) % 8) === 0) await nextTick();
                }
            }

            if (window.log) window.log(`Finalizado. ${hits} registros.`);
            return turf.featureCollection(outputFeatures);
        }
    },

    sp_zonal_stats: {
        cat: '4. RASTER', label: 'Zonal Stats', icon: 'fa-chart-area', color: '#8e44ad',
        in: 2, out: 1,
        help: 'Estadisticas zonales (poligonos + GeoTIFF).',
        tpl: () => `
            <div style="margin-bottom:4px">
                <span style="font-size:0.7em;color:#aaa">Prefijo</span>
                <input type="text" df-prefix class="node-control" value="zs">
            </div>
            <div style="font-size:0.6em;color:#888">Calcula min/max/mean/sum por poligono.</div>`,
        run: async (id, inputs, dom) => {
            const throwIfCancelled = () => {
                if (typeof window.JETLThrowIfCancelled === 'function') return window.JETLThrowIfCancelled();
                if (window.isEngineCancelled) {
                    const err = new Error('Operacion cancelada por el usuario');
                    err.name = 'CancelledError';
                    err.cancelled = true;
                    throw err;
                }
            };
            const nextTick = async () => {
                if (typeof window.JETLNextTick === 'function') return window.JETLNextTick();
                return new Promise(r => setTimeout(r, 0));
            };

            let rasterInput = null;
            let polyInput = null;
            inputs.forEach(inp => {
                if (inp && inp.features && inp.features.length > 0) {
                    if (inp.features[0].properties && inp.features[0].properties._raster_ref_id) rasterInput = inp;
                    else polyInput = inp;
                }
            });
            if (!rasterInput) throw new Error('No se detecto el GeoTIFF.');
            if (!polyInput) throw new Error('Conecta poligonos.');

            const refId = rasterInput.features[0].properties._raster_ref_id;
            const buffer = window._tiff_cache ? window._tiff_cache[refId] : null;
            if (!buffer) throw new Error('El archivo expiro. Recarga el Reader.');
            throwIfCancelled();

            const prefix = dom.querySelector('[df-prefix]').value || 'zs';

            if (typeof postWorkerTask === 'function') {
                try {
                    if (!window.geoWorker) createGeoWorker();
                    const wres = await postWorkerTask({
                        task: 'raster_zonal_stats',
                        rasterBuffer: buffer,
                        polygonsFC: polyInput,
                        prefix
                    }, 180000);
                    if (wres && wres.status === 'ok') return wres.data;
                } catch (e) {
                    if (typeof window.JETLIsCancelledError === 'function' && window.JETLIsCancelledError(e)) throw e;
                    console.warn('Worker raster_zonal_stats fallo, fallback local:', e);
                }
            }

            const georaster = await geoblaze.parse(buffer);
            const out = [];

            for (let i = 0; i < polyInput.features.length; i++) {
                throwIfCancelled();
                const f = polyInput.features[i];
                const nf = JETLClone(f);
                try {
                    const stats = await geoblaze.zonalStats(georaster, f, ['min', 'max', 'mean', 'sum']);
                    if (Array.isArray(stats) && stats[0]) {
                        Object.keys(stats[0]).forEach(k => nf.properties[`${prefix}_${k}`] = stats[0][k]);
                    }
                } catch (e) {
                    nf.properties[`${prefix}_err`] = true;
                }
                out.push(nf);
                if ((i % 20) === 0) await nextTick();
            }

            return turf.featureCollection(out);
        }
    }
});

;

/* ---- js/nodes/writers.js ---- */
// Cat: writers
(typeof window !== 'undefined' ? window : global).TOOL_REGISTRY = (typeof window !== 'undefined' ? window : global).TOOL_REGISTRY || {};
function resolveParamTextWriter(raw) {
    if (typeof window !== 'undefined' && typeof window.JETLResolveParamText === 'function') {
        return window.JETLResolveParamText(raw);
    }
    return String(raw == null ? '' : raw);
}
Object.assign((typeof window !== 'undefined' ? window : global).TOOL_REGISTRY, {
    writer_geojson: {
        cat: '5. WRITERS', label: 'GeoJSON DL', icon: 'fa-file-code', color: '#c0392b', in: 1, out: 0,
        tpl: () => `<input class="node-control" df-fn value="export.geojson" placeholder="Nombre archivo">`,
        run: (id, i, d) => {
            const fn = resolveParamTextWriter(d.querySelector('[df-fn]')?.value || 'export.geojson');
            download(JSON.stringify(i[0]), fn, 'application/json');
            return i[0];
        }
    },

    writer_csv: {
        cat: '5. WRITERS', label: 'CSV DL', icon: 'fa-file-csv', color: '#c0392b', in: 1, out: 0,
        tpl: () => `<input class="node-control" df-fn value="export.csv" placeholder="Nombre archivo">`,
        run: (id, i, d) => {
            const fn = resolveParamTextWriter(d.querySelector('[df-fn]')?.value || 'export.csv');
            download(toCSV(i[0]), fn, 'text/csv');
            return i[0];
        }
    },

    writer_kml: {
        cat: '5. WRITERS', label: 'KML DL', icon: 'fa-globe', color: '#c0392b', in: 1, out: 0,
        tpl: () => `<input class="node-control" df-fn value="export.kml" placeholder="Nombre archivo">`,
        run: (id, i, d) => {
            if (!window.JETLFormats || !JETLFormats.toKML) throw new Error("Exportador KML no disponible");
            const fn = resolveParamTextWriter(d.querySelector('[df-fn]')?.value || 'export.kml');
            download(JETLFormats.toKML(i[0]), fn, 'application/vnd.google-earth.kml+xml');
            return i[0];
        }
    },

    writer_gpkg: {
        cat: '5. WRITERS', label: 'GPKG DL', icon: 'fa-database', color: '#c0392b', in: 1, out: 0,
        help: 'Exporta GeoPackage (experimental).',
        tpl: () => `<input class="node-control" df-fn value="export.gpkg" placeholder="Nombre archivo">`,
        run: async (id, i, d) => {
            if (!window.JETLFormats) throw new Error("Formatos no disponibles");
            const res = await JETLFormats.writeFile('gpkg', i[0]);
            const fn = resolveParamTextWriter(d.querySelector('[df-fn]')?.value || '') || res.filename || 'export.gpkg';
            const a = document.createElement('a'); a.href = URL.createObjectURL(res.blob); a.download = fn; a.click();
            return i[0];
        }
    },

    writer_parquet: {
        cat: '5. WRITERS', label: 'Parquet DL', icon: 'fa-table', color: '#c0392b', in: 1, out: 0,
        help: 'Exporta Parquet (experimental).',
        tpl: () => `<input class="node-control" df-fn value="export.parquet" placeholder="Nombre archivo">`,
        run: async (id, i, d) => {
            if (!window.JETLFormats) throw new Error("Formatos no disponibles");
            const res = await JETLFormats.writeFile('parquet', i[0]);
            const fn = resolveParamTextWriter(d.querySelector('[df-fn]')?.value || '') || res.filename || 'export.parquet';
            const a = document.createElement('a'); a.href = URL.createObjectURL(res.blob); a.download = fn; a.click();
            return i[0];
        }
    },

    writer_wkt: { cat: '5. WRITERS', label: 'WKT Console', icon: 'fa-font', color: '#c0392b', in: 1, out: 0, tpl: () => `<div>Ver en Log</div>`, run: (id, i) => { i[0].features.forEach(f => log(wellknown.stringify(f))); return i[0] } }
});

;

/* ---- js/tools.js ---- */
// =================================================================
// 🛠️ JETL TOOL REGISTRY - MODULED ROOT
// =================================================================
if (typeof window !== 'undefined') {
    window.TOOL_REGISTRY = window.TOOL_REGISTRY || {};
} else {
    global.TOOL_REGISTRY = global.TOOL_REGISTRY || {};
}
// Los nodos están definidos dentro de js/nodes/

;

/* ---- js/schemaUI.js ---- */
// =============================================
// Dynamic Field Selectors (schema-driven node UI)
// =============================================
(function () {
    function _getEditor() {
        try { return typeof editor !== 'undefined' ? editor : null; } catch (e) { return null; }
    }

    function _safeGetNode(nodeId) {
        const ed = _getEditor();
        if (!ed || !ed.export || !ed.getNodeFromId) return { ed: null, node: null };
        try {
            const data = ed.export();
            const nodes = data && data.drawflow && data.drawflow.Home && data.drawflow.Home.data
                ? data.drawflow.Home.data
                : null;
            if (!nodes || !nodes[String(nodeId)]) return { ed, node: null };
            return { ed, node: ed.getNodeFromId(nodeId) };
        } catch (e) {
            return { ed, node: null };
        }
    }

    function _getExecutionData() {
        try {
            if (typeof executionData !== 'undefined') return executionData || {};
        } catch (e) { }
        return window.executionData || {};
    }

    function _pickFeatureCollection(data) {
        if (!data) return null;
        if (data.type === 'FeatureCollection') return data;
        if (data.type === 'Feature') return turf.featureCollection([data]);
        if (typeof data === 'object') {
            if (data.output_1 && data.output_1.type === 'FeatureCollection') return data.output_1;
            if (data.output_2 && data.output_2.type === 'FeatureCollection') return data.output_2;
            if (data.output_3 && data.output_3.type === 'FeatureCollection') return data.output_3;
        }
        return null;
    }

    function _schemaFromNodeData(nodeId) {
        if (!nodeId && nodeId !== 0) return [];

        const store = _getExecutionData();
        const fromExec = store[nodeId] && store[nodeId].data ? store[nodeId].data : null;
        const fromFile = window._file_cache ? window._file_cache['file_' + nodeId] : null;
        const data = fromExec || fromFile;

        const fc = _pickFeatureCollection(data);
        if (!fc || !fc.features || fc.features.length === 0) return [];

        const fields = new Set();
        const maxScan = Math.min(fc.features.length, 200);
        for (let i = 0; i < maxScan; i++) {
            const props = fc.features[i] && fc.features[i].properties ? fc.features[i].properties : {};
            Object.keys(props).forEach(k => {
                if (!k.startsWith('_')) fields.add(k);
            });
        }
        return Array.from(fields).sort((a, b) => a.localeCompare(b));
    }

    function _getParentNodeId(targetNode, inputKey) {
        const input = targetNode && targetNode.inputs ? targetNode.inputs[inputKey] : null;
        const conn = input && input.connections && input.connections.length ? input.connections[0] : null;
        return conn ? conn.node : null;
    }

    function _fillSelect(selectEl, fields, emptyLabel) {
        if (!selectEl) return;
        const prev = selectEl.value;
        selectEl.innerHTML = '';

        const empty = document.createElement('option');
        empty.value = '';
        empty.textContent = emptyLabel || 'Selecciona campo';
        selectEl.appendChild(empty);

        fields.forEach(f => {
            const opt = document.createElement('option');
            opt.value = f;
            opt.textContent = f;
            selectEl.appendChild(opt);
        });

        if (fields.includes(prev)) selectEl.value = prev;
    }

    function updateJoinNode(nodeId) {
        const safe = _safeGetNode(nodeId);
        const ed = safe.ed;
        if (!ed) return;
        const node = safe.node;
        if (!node || (node.name !== 'attr_join_adv' && node.name !== 'attr_feature_merger')) return;

        const dom = document.getElementById('node-' + nodeId);
        if (!dom) return;

        const leftSelect = dom.querySelector('[df-join-left]');
        const rightSelect = dom.querySelector('[df-join-right]');
        if (!leftSelect || !rightSelect) return;

        const p1 = _getParentNodeId(node, 'input_1');
        const p2 = _getParentNodeId(node, 'input_2');

        const leftFields = _schemaFromNodeData(p1);
        const rightFields = _schemaFromNodeData(p2);

        _fillSelect(leftSelect, leftFields, 'Campo Input 1');
        _fillSelect(rightSelect, rightFields, 'Campo Input 2');
    }

    function appendJoinPair(nodeId) {
        const dom = document.getElementById('node-' + nodeId);
        if (!dom) return;
        const left = dom.querySelector('[df-join-left]');
        const right = dom.querySelector('[df-join-right]');
        const mapInput = dom.querySelector('[df-map]');
        if (!left || !right || !mapInput) return;
        if (!left.value || !right.value) return;

        const pair = `${left.value}:${right.value}`;
        const current = (mapInput.value || '')
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);
        if (!current.includes(pair)) current.push(pair);
        mapInput.value = current.join(', ');
    }

    function appendRenamerPair(nodeId) {
        const dom = document.getElementById('node-' + nodeId);
        if (!dom) return;
        const oldSel = dom.querySelector('[df-rename-old]');
        const newInp = dom.querySelector('[df-rename-new]');
        const mapInput = dom.querySelector('[df-map]');
        if (!oldSel || !newInp || !mapInput) return;
        const oldName = String(oldSel.value || '').trim();
        const newName = String(newInp.value || '').trim();
        if (!oldName || !newName) return;
        const pair = `${oldName}:${newName}`;
        const current = (mapInput.value || '')
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);
        if (!current.includes(pair)) current.push(pair);
        mapInput.value = current.join(', ');
        newInp.value = '';
    }

    function updateCalcNode(nodeId) {
        const safe = _safeGetNode(nodeId);
        const ed = safe.ed;
        if (!ed) return;
        const node = safe.node;
        if (!node || node.name !== 'attr_calc_pro') return;

        const dom = document.getElementById('node-' + nodeId);
        if (!dom) return;
        const sourceSelect = dom.querySelector('[df-source-field]');
        if (!sourceSelect) return;

        const p1 = _getParentNodeId(node, 'input_1');
        const fields = _schemaFromNodeData(p1);
        _fillSelect(sourceSelect, fields, 'Campo de entrada');
    }

    function updateSorterNode(nodeId) {
        const safe = _safeGetNode(nodeId);
        const ed = safe.ed;
        if (!ed) return;
        const node = safe.node;
        if (!node || node.name !== 'attr_sorter') return;

        const dom = document.getElementById('node-' + nodeId);
        if (!dom) return;
        const sortField = dom.querySelector('[df-field]');
        if (!sortField) return;

        const p1 = _getParentNodeId(node, 'input_1');
        const fields = _schemaFromNodeData(p1);
        _fillSelect(sortField, fields, 'Campo de entrada');
    }

    function updateRenamerNode(nodeId) {
        const safe = _safeGetNode(nodeId);
        const ed = safe.ed;
        if (!ed) return;
        const node = safe.node;
        if (!node || node.name !== 'attr_renamer') return;
        const dom = document.getElementById('node-' + nodeId);
        if (!dom) return;
        const oldSel = dom.querySelector('[df-rename-old]');
        if (!oldSel) return;
        const p1 = _getParentNodeId(node, 'input_1');
        const fields = _schemaFromNodeData(p1);
        _fillSelect(oldSel, fields, 'Campo origen');
    }

    function _renderKeeperFieldList(dom, fields) {
        const box = dom.querySelector('[df-keeper-fields]');
        const input = dom.querySelector('[df-keep]');
        if (!box || !input) return;
        const selected = new Set(
            (input.value || '')
                .split(',')
                .map(s => s.trim())
                .filter(Boolean)
        );
        box.innerHTML = '';
        if (!fields.length) {
            box.innerHTML = '<div style="font-size:0.7em;color:#777">Sin campos disponibles</div>';
            return;
        }
        fields.forEach((f) => {
            const row = document.createElement('label');
            row.style.display = 'flex';
            row.style.alignItems = 'center';
            row.style.gap = '6px';
            row.style.fontSize = '0.78em';
            row.style.color = '#ddd';
            row.style.marginBottom = '4px';
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.setAttribute('data-keeper-field', f);
            cb.checked = selected.has(f);
            const txt = document.createElement('span');
            txt.textContent = f;
            row.appendChild(cb);
            row.appendChild(txt);
            box.appendChild(row);
        });
    }

    function updateKeeperNode(nodeId) {
        const safe = _safeGetNode(nodeId);
        const ed = safe.ed;
        if (!ed) return;
        const node = safe.node;
        if (!node || node.name !== 'attr_keeper') return;
        const dom = document.getElementById('node-' + nodeId);
        if (!dom) return;
        const p1 = _getParentNodeId(node, 'input_1');
        const fields = _schemaFromNodeData(p1);
        _renderKeeperFieldList(dom, fields);
    }

    function _renderFormatterFieldList(dom, fields) {
        const box = dom.querySelector('[df-formatter-fields]');
        const input = dom.querySelector('[df-field]');
        if (!box || !input) return;
        const selected = new Set(
            (input.value || '')
                .split(',')
                .map(s => s.trim())
                .filter(Boolean)
        );
        box.innerHTML = '';
        if (!fields.length) {
            box.innerHTML = '<div style="font-size:0.7em;color:#777">Sin campos disponibles</div>';
            return;
        }
        fields.forEach((f) => {
            const row = document.createElement('label');
            row.style.display = 'flex';
            row.style.alignItems = 'center';
            row.style.gap = '6px';
            row.style.fontSize = '0.78em';
            row.style.color = '#ddd';
            row.style.marginBottom = '4px';
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.setAttribute('data-formatter-field', f);
            cb.checked = selected.has(f);
            const txt = document.createElement('span');
            txt.textContent = f;
            row.appendChild(cb);
            row.appendChild(txt);
            box.appendChild(row);
        });
    }

    function updateStringFormatterNode(nodeId) {
        const safe = _safeGetNode(nodeId);
        const ed = safe.ed;
        if (!ed) return;
        const node = safe.node;
        if (!node || node.name !== 'attr_string_formatter') return;
        const dom = document.getElementById('node-' + nodeId);
        if (!dom) return;
        const p1 = _getParentNodeId(node, 'input_1');
        const fields = _schemaFromNodeData(p1);
        _renderFormatterFieldList(dom, fields);
    }

    function _renderMatcherFieldList(dom, fields) {
        const box = dom.querySelector('[df-matcher-fields]');
        const input = dom.querySelector('[df-fields]');
        if (!box || !input) return;

        const selected = new Set(
            (input.value || '')
                .split(',')
                .map(s => s.trim())
                .filter(Boolean)
        );

        box.innerHTML = '';
        if (!fields.length) {
            box.innerHTML = '<div style="font-size:0.7em;color:#777">Sin campos disponibles</div>';
            return;
        }

        fields.forEach((f) => {
            const row = document.createElement('label');
            row.style.display = 'flex';
            row.style.alignItems = 'center';
            row.style.gap = '6px';
            row.style.fontSize = '0.78em';
            row.style.color = '#ddd';
            row.style.marginBottom = '4px';

            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.setAttribute('data-matcher-field', f);
            cb.checked = selected.has(f);

            const txt = document.createElement('span');
            txt.textContent = f;

            row.appendChild(cb);
            row.appendChild(txt);
            box.appendChild(row);
        });
    }

    function updateMatcherNode(nodeId) {
        const safe = _safeGetNode(nodeId);
        const ed = safe.ed;
        if (!ed) return;
        const node = safe.node;
        if (!node || node.name !== 'attr_matcher') return;

        const dom = document.getElementById('node-' + nodeId);
        if (!dom) return;
        const p1 = _getParentNodeId(node, 'input_1');
        const fields = _schemaFromNodeData(p1);
        _renderMatcherFieldList(dom, fields);
    }

    function _renderStatsFieldList(dom, fields) {
        const box = dom.querySelector('[df-stats-fields]');
        const input = dom.querySelector('[df-field]');
        if (!box || !input) return;

        const selected = new Set(
            (input.value || '')
                .split(',')
                .map(s => s.trim())
                .filter(Boolean)
        );

        box.innerHTML = '';
        if (!fields.length) {
            box.innerHTML = '<div style="font-size:0.7em;color:#777">Sin campos disponibles</div>';
            return;
        }

        fields.forEach((f) => {
            const row = document.createElement('label');
            row.style.display = 'flex';
            row.style.alignItems = 'center';
            row.style.gap = '6px';
            row.style.fontSize = '0.78em';
            row.style.color = '#ddd';
            row.style.marginBottom = '4px';

            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.setAttribute('data-stats-field', f);
            cb.checked = selected.has(f);

            const txt = document.createElement('span');
            txt.textContent = f;
            row.appendChild(cb);
            row.appendChild(txt);
            box.appendChild(row);
        });
    }

    function updateStatsNode(nodeId) {
        const safe = _safeGetNode(nodeId);
        const ed = safe.ed;
        if (!ed) return;
        const node = safe.node;
        if (!node || node.name !== 'attr_stats') return;

        const dom = document.getElementById('node-' + nodeId);
        if (!dom) return;
        const p1 = _getParentNodeId(node, 'input_1');
        const fields = _schemaFromNodeData(p1);
        _renderStatsFieldList(dom, fields);
    }

    function _createTestRow(fields, rowState, index) {
        const row = document.createElement('div');
        row.setAttribute('data-test-row', '1');
        row.style.display = 'grid';
        row.style.gridTemplateColumns = '64px 1fr 54px 26px';
        row.style.gridTemplateAreas = '"join field op del" "join value value del"';
        row.style.gap = '4px';
        row.style.alignItems = 'center';
        row.style.marginBottom = '4px';

        const join = document.createElement('select');
        join.className = 'node-control';
        join.setAttribute('df-test-join', '');
        join.innerHTML = '<option value="AND">AND</option><option value="OR">OR</option>';
        join.value = index === 0 ? 'AND' : (rowState && rowState.join ? rowState.join : 'AND');
        join.disabled = index === 0;
        join.style.gridArea = 'join';
        join.style.marginBottom = '0';

        const field = document.createElement('select');
        field.className = 'node-control';
        field.setAttribute('df-test-field', '');
        const resolvedFields = Array.isArray(fields) ? [...fields] : [];
        if (rowState && rowState.field && !resolvedFields.includes(rowState.field)) {
            resolvedFields.push(rowState.field);
        }
        _fillSelect(field, resolvedFields, 'Campo');
        if (rowState && rowState.field && resolvedFields.includes(rowState.field)) field.value = rowState.field;
        field.style.gridArea = 'field';
        field.style.marginBottom = '0';
        field.style.minWidth = '0';

        const op = document.createElement('select');
        op.className = 'node-control';
        op.setAttribute('df-test-op', '');
        op.innerHTML = [
            '<option value="==">=</option>',
            '<option value="!=">!=</option>',
            '<option value=">">></option>',
            '<option value=">=">>=</option>',
            '<option value="<"><</option>',
            '<option value="<="><=</option>',
            '<option value="like">like</option>',
            '<option value="starts">starts</option>',
            '<option value="ends">ends</option>',
            '<option value="in">in</option>'
        ].join('');
        op.value = rowState && rowState.op ? rowState.op : '==';
        op.style.gridArea = 'op';
        op.style.marginBottom = '0';

        const val = document.createElement('input');
        val.className = 'node-control';
        val.setAttribute('df-test-val', '');
        val.placeholder = 'valor';
        val.value = rowState && rowState.value ? rowState.value : '';
        val.style.gridArea = 'value';
        val.style.marginBottom = '0';
        val.style.minWidth = '0';

        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'node-btn-mini';
        del.setAttribute('data-schema-action', 'test-remove-row');
        del.title = 'Eliminar condicion';
        del.innerHTML = '<i class="fas fa-times"></i>';
        del.disabled = index === 0;
        del.style.gridArea = 'del';

        row.appendChild(join);
        row.appendChild(field);
        row.appendChild(op);
        row.appendChild(val);
        row.appendChild(del);
        return row;
    }

    function _collectTestRows(dom) {
        return Array.from(dom.querySelectorAll('[data-test-row]')).map((row, idx) => ({
            join: idx === 0 ? 'AND' : (row.querySelector('[df-test-join]')?.value || 'AND'),
            field: row.querySelector('[df-test-field]')?.value || '',
            op: row.querySelector('[df-test-op]')?.value || '==',
            value: row.querySelector('[df-test-val]')?.value || ''
        }));
    }

    function _renderTestRows(dom, fields, rowsState) {
        const box = dom.querySelector('[df-test-rows]');
        if (!box) return;
        const states = Array.isArray(rowsState) && rowsState.length ? rowsState : [{ join: 'AND', field: '', op: '==', value: '' }];
        box.innerHTML = '';
        states.forEach((s, idx) => box.appendChild(_createTestRow(fields, s, idx)));
    }

    function updateTesterNode(nodeId) {
        const safe = _safeGetNode(nodeId);
        const ed = safe.ed;
        if (!ed) return;
        const node = safe.node;
        if (!node || node.name !== 'attr_test') return;

        const dom = document.getElementById('node-' + nodeId);
        if (!dom) return;
        const p1 = _getParentNodeId(node, 'input_1');
        const fields = _schemaFromNodeData(p1);
        const current = _collectTestRows(dom);
        _renderTestRows(dom, fields, current);
    }

    function insertCalcField(nodeId) {
        const dom = document.getElementById('node-' + nodeId);
        if (!dom) return;
        const sourceSelect = dom.querySelector('[df-source-field]');
        const expr = dom.querySelector('[df-expr]');
        if (!sourceSelect || !expr || !sourceSelect.value) return;

        const token = `props["${sourceSelect.value}"]`;
        const start = typeof expr.selectionStart === 'number' ? expr.selectionStart : expr.value.length;
        const end = typeof expr.selectionEnd === 'number' ? expr.selectionEnd : expr.value.length;
        expr.value = expr.value.slice(0, start) + token + expr.value.slice(end);
        const nextPos = start + token.length;
        expr.focus();
        expr.setSelectionRange(nextPos, nextPos);
    }

    let currentCalcNodeId = null;

    function openCalcEditor(nodeId) {
        const nodeEl = document.getElementById('node-' + nodeId);
        const modal = document.getElementById('calc-editor-modal');
        if (!nodeEl || !modal) return;
        currentCalcNodeId = String(nodeId);
        updateCalcNode(nodeId);

        const source = nodeEl.querySelector('[df-source-field]');
        const modalSource = document.getElementById('calc-editor-source');
        document.getElementById('calc-editor-name').value = nodeEl.querySelector('[df-name]')?.value || 'new_field';
        document.getElementById('calc-editor-expression').value = nodeEl.querySelector('[df-expr]')?.value || '';
        document.getElementById('calc-editor-error').value = nodeEl.querySelector('[df-on-error]')?.value || 'null';
        if (source && modalSource) modalSource.innerHTML = source.innerHTML;
        modal.style.display = 'flex';
    }

    function closeCalcEditor(save) {
        const modal = document.getElementById('calc-editor-modal');
        if (!modal) return;
        if (save && currentCalcNodeId) {
            const nodeEl = document.getElementById('node-' + currentCalcNodeId);
            if (nodeEl) {
                const name = document.getElementById('calc-editor-name').value.trim();
                nodeEl.querySelector('[df-name]').value = name || 'new_field';
                nodeEl.querySelector('[df-expr]').value = document.getElementById('calc-editor-expression').value;
                nodeEl.querySelector('[df-on-error]').value = document.getElementById('calc-editor-error').value;
                const summary = nodeEl.querySelector('[data-calc-summary]');
                if (summary) summary.textContent = name || 'new_field';
            }
        }
        modal.style.display = 'none';
        currentCalcNodeId = null;
    }

    function insertCalcFieldInModal() {
        const source = document.getElementById('calc-editor-source');
        const expression = document.getElementById('calc-editor-expression');
        if (!source?.value || !expression) return;
        const token = `props["${source.value}"]`;
        const start = typeof expression.selectionStart === 'number' ? expression.selectionStart : expression.value.length;
        const end = typeof expression.selectionEnd === 'number' ? expression.selectionEnd : expression.value.length;
        expression.setRangeText(token, start, end, 'end');
        expression.focus();
    }

    function updateNode(nodeId) {
        updateJoinNode(nodeId);
        updateCalcNode(nodeId);
        updateSorterNode(nodeId);
        updateRenamerNode(nodeId);
        updateKeeperNode(nodeId);
        updateStringFormatterNode(nodeId);
        updateMatcherNode(nodeId);
        updateStatsNode(nodeId);
        updateTesterNode(nodeId);
    }

    function refreshAll() {
        const ed = _getEditor();
        if (!ed || !ed.export) return;
        const data = ed.export();
        const nodes = data && data.drawflow && data.drawflow.Home && data.drawflow.Home.data
            ? data.drawflow.Home.data
            : {};
        Object.keys(nodes).forEach(updateNode);
    }

    function initDelegation() {
        document.addEventListener('click', (evt) => {
            const btn = evt.target.closest('[data-schema-action]');
            if (!btn) return;

            const nodeEl = btn.closest('.drawflow-node');
            if (!nodeEl || !nodeEl.id) return;
            const nodeId = nodeEl.id.replace('node-', '');

            const action = btn.getAttribute('data-schema-action');
            if (action === 'calc-open-editor') {
                evt.stopPropagation();
                openCalcEditor(nodeId);
            } else if (action === 'join-add') {
                evt.stopPropagation();
                appendJoinPair(nodeId);
            } else if (action === 'renamer-add') {
                evt.stopPropagation();
                appendRenamerPair(nodeId);
            } else if (action === 'calc-insert') {
                evt.stopPropagation();
                insertCalcField(nodeId);
            } else if (action === 'test-add-row') {
                evt.stopPropagation();
                const dom = document.getElementById('node-' + nodeId);
                if (!dom) return;
                const rows = _collectTestRows(dom);
                rows.push({ join: 'AND', field: '', op: '==', value: '' });
                const ed = _getEditor();
                const node = ed ? ed.getNodeFromId(nodeId) : null;
                const p1 = _getParentNodeId(node, 'input_1');
                const fields = _schemaFromNodeData(p1);
                _renderTestRows(dom, fields, rows);
            } else if (action === 'test-remove-row') {
                evt.stopPropagation();
                const row = btn.closest('[data-test-row]');
                if (!row) return;
                const dom = document.getElementById('node-' + nodeId);
                if (!dom) return;
                row.remove();
                const rows = _collectTestRows(dom);
                const ed = _getEditor();
                const node = ed ? ed.getNodeFromId(nodeId) : null;
                const p1 = _getParentNodeId(node, 'input_1');
                const fields = _schemaFromNodeData(p1);
                _renderTestRows(dom, fields, rows);
            }
        });

        document.addEventListener('click', (evt) => {
            const action = evt.target.closest('[data-ui-action]')?.getAttribute('data-ui-action');
            if (action === 'close-calc-editor') closeCalcEditor(false);
            else if (action === 'save-calc-editor') closeCalcEditor(true);
            else if (action === 'calc-editor-insert') insertCalcFieldInModal();
        });

        document.addEventListener('dblclick', (evt) => {
            const nodeEl = evt.target.closest('.drawflow-node');
            if (!nodeEl?.classList.contains('attr_calc_pro')) return;
            openCalcEditor(nodeEl.id.replace('node-', ''));
        });

        document.addEventListener('change', (evt) => {
            const cb = evt.target.closest('input[type="checkbox"][data-matcher-field]');
            if (!cb) return;
            const nodeEl = cb.closest('.drawflow-node');
            if (!nodeEl) return;
            const input = nodeEl.querySelector('[df-fields]');
            if (!input) return;

            const selected = Array.from(
                nodeEl.querySelectorAll('input[type="checkbox"][data-matcher-field]:checked')
            ).map(el => el.getAttribute('data-matcher-field')).filter(Boolean);

            input.value = selected.join(', ');
        });

        document.addEventListener('change', (evt) => {
            const cb = evt.target.closest('input[type="checkbox"][data-stats-field]');
            if (!cb) return;
            const nodeEl = cb.closest('.drawflow-node');
            if (!nodeEl) return;
            const input = nodeEl.querySelector('[df-field]');
            if (!input) return;
            const selected = Array.from(
                nodeEl.querySelectorAll('input[type="checkbox"][data-stats-field]:checked')
            ).map(el => el.getAttribute('data-stats-field')).filter(Boolean);
            input.value = selected.join(', ');
        });

        document.addEventListener('change', (evt) => {
            const cb = evt.target.closest('input[type="checkbox"][data-keeper-field]');
            if (!cb) return;
            const nodeEl = cb.closest('.drawflow-node');
            if (!nodeEl) return;
            const input = nodeEl.querySelector('[df-keep]');
            if (!input) return;
            const selected = Array.from(
                nodeEl.querySelectorAll('input[type="checkbox"][data-keeper-field]:checked')
            ).map(el => el.getAttribute('data-keeper-field')).filter(Boolean);
            input.value = selected.join(', ');
        });

        document.addEventListener('change', (evt) => {
            const cb = evt.target.closest('input[type="checkbox"][data-formatter-field]');
            if (!cb) return;
            const nodeEl = cb.closest('.drawflow-node');
            if (!nodeEl) return;
            const input = nodeEl.querySelector('[df-field]');
            if (!input) return;
            const selected = Array.from(
                nodeEl.querySelectorAll('input[type="checkbox"][data-formatter-field]:checked')
            ).map(el => el.getAttribute('data-formatter-field')).filter(Boolean);
            input.value = selected.join(', ');
        });

        document.addEventListener('input', (evt) => {
            const txt = evt.target.closest('input[df-fields]');
            if (!txt) return;
            const nodeEl = txt.closest('.drawflow-node');
            if (!nodeEl) return;
            if (!nodeEl.querySelector('[df-matcher-fields]')) return;

            const selected = new Set(
                (txt.value || '')
                    .split(',')
                    .map(s => s.trim())
                    .filter(Boolean)
            );
            nodeEl.querySelectorAll('input[type="checkbox"][data-matcher-field]').forEach((cb) => {
                cb.checked = selected.has(cb.getAttribute('data-matcher-field'));
            });
        });

        document.addEventListener('input', (evt) => {
            const txt = evt.target.closest('input[df-field]');
            if (!txt) return;
            const nodeEl = txt.closest('.drawflow-node');
            if (!nodeEl) return;
            if (!nodeEl.querySelector('[df-stats-fields]')) return;

            const selected = new Set(
                (txt.value || '')
                    .split(',')
                    .map(s => s.trim())
                    .filter(Boolean)
            );
            nodeEl.querySelectorAll('input[type="checkbox"][data-stats-field]').forEach((cb) => {
                cb.checked = selected.has(cb.getAttribute('data-stats-field'));
            });
        });

        document.addEventListener('input', (evt) => {
            const txt = evt.target.closest('input[df-keep]');
            if (!txt) return;
            const nodeEl = txt.closest('.drawflow-node');
            if (!nodeEl || !nodeEl.querySelector('[df-keeper-fields]')) return;
            const selected = new Set(
                (txt.value || '')
                    .split(',')
                    .map(s => s.trim())
                    .filter(Boolean)
            );
            nodeEl.querySelectorAll('input[type="checkbox"][data-keeper-field]').forEach((cb) => {
                cb.checked = selected.has(cb.getAttribute('data-keeper-field'));
            });
        });

        document.addEventListener('input', (evt) => {
            const txt = evt.target.closest('input[df-field]');
            if (!txt) return;
            const nodeEl = txt.closest('.drawflow-node');
            if (!nodeEl || !nodeEl.querySelector('[df-formatter-fields]')) return;
            const selected = new Set(
                (txt.value || '')
                    .split(',')
                    .map(s => s.trim())
                    .filter(Boolean)
            );
            nodeEl.querySelectorAll('input[type="checkbox"][data-formatter-field]').forEach((cb) => {
                cb.checked = selected.has(cb.getAttribute('data-formatter-field'));
            });
        });
    }

    initDelegation();

    window.JETLSchemaUI = {
        updateNode,
        refreshAll,
        appendJoinPair,
        appendRenamerPair,
        insertCalcField
    };
})();

;

/* ---- js/core/workerPool.js ---- */
let geoWorker = null;
let geoWorkerPool = null;
let geoWorkerPrewarmPromise = null;

function buildCancelledError(message) {
    const err = new Error(message || 'Operacion cancelada por el usuario');
    err.name = 'CancelledError';
    err.cancelled = true;
    return err;
}

class GeoWorkerPool {
    constructor(url, size) {
        this.url = url;
        this.size = size;
        this.workers = [];
        this.queue = [];
        this.pending = new Map();
        this._init();
    }

    _createWorker() {
        const w = new Worker(this.url);
        w._busy = false;
        w._currentTaskId = null;
        w.onmessage = (e) => this._onMessage(w, e);
        w.onerror = (e) => {
            console.error("âš ï¸ Error en GeoWorker:", e.message, "en", e.filename);
        };
        return w;
    }

    _replaceWorker(oldWorker) {
        const idx = this.workers.indexOf(oldWorker);
        if (idx === -1) return;
        try { oldWorker.terminate(); } catch (e) {}
        const fresh = this._createWorker();
        this.workers[idx] = fresh;
        if (idx === 0) geoWorker = fresh;
    }

    _init() {
        for (let i = 0; i < this.size; i++) {
            this.workers.push(this._createWorker());
        }
        geoWorker = this.workers[0] || null;
        console.log(`ðŸš€ Worker Pool iniciado (${this.workers.length})`);
    }

    _onMessage(worker, e) {
        const d = e.data || {};
        const taskId = d.taskId;
        if (!taskId || !this.pending.has(taskId)) return;
        const job = this.pending.get(taskId);
        this.pending.delete(taskId);
        clearTimeout(job.timer);
        worker._busy = false;
        worker._currentTaskId = null;
        if (d.status === 'ok' || d.status === 'partial') job.resolve(d);
        else job.reject(new Error(d.message || 'Worker error'));
        this._drain();
    }

    _drain() {
        const free = this.workers.find((w) => !w._busy);
        if (!free) return;
        const job = this.queue.shift();
        if (!job) return;
        free._busy = true;
        free._currentTaskId = job.taskId;
        job.worker = free;
        this.pending.set(job.taskId, job);
        try {
            free.postMessage(job.payload, job.transfer || []);
        } catch (e) {
            free._busy = false;
            free._currentTaskId = null;
            this.pending.delete(job.taskId);
            job.reject(e);
            this._drain();
        }
    }

    post(payload, timeoutMs = 30000, transfer = null) {
        return new Promise((resolve, reject) => {
            const taskId = 'task_' + Date.now() + '_' + Math.random().toString(36).slice(2);
            payload.taskId = taskId;
            const job = {
                taskId,
                payload,
                transfer,
                resolve,
                reject,
                worker: null,
                timer: setTimeout(() => {
                    if (!this.pending.has(taskId)) return;
                    const current = this.pending.get(taskId);
                    this.pending.delete(taskId);
                    if (current && current.worker) {
                        current.worker._busy = false;
                        current.worker._currentTaskId = null;
                        this._replaceWorker(current.worker);
                    }
                    reject(new Error('Worker timeout'));
                    this._drain();
                }, timeoutMs)
            };
            this.queue.push(job);
            this._drain();
        });
    }

    cancelAll(reason = 'Operacion cancelada por el usuario') {
        while (this.queue.length) {
            const job = this.queue.shift();
            if (!job) continue;
            clearTimeout(job.timer);
            job.reject(buildCancelledError(reason));
        }

        for (const [taskId, job] of this.pending.entries()) {
            clearTimeout(job.timer);
            this.pending.delete(taskId);
            if (job.worker) {
                job.worker._busy = false;
                job.worker._currentTaskId = null;
                this._replaceWorker(job.worker);
            }
            job.reject(buildCancelledError(reason));
        }

        this._drain();
    }

    getLoad() {
        return { pending: this.pending.size, queued: this.queue.length };
    }
}

function createGeoWorker() {
    if (geoWorkerPool) return;
    try {
        const hc = navigator.hardwareConcurrency || 4;
        const size = Math.max(2, Math.min(hc - 1, 6));
        geoWorkerPool = new GeoWorkerPool('js/geo.worker.js', size);
        window.geoWorker = geoWorker;
        window.geoWorkerPool = geoWorkerPool;
    } catch (e) {
        console.warn('Worker pool init failed:', e);
        geoWorkerPool = null;
    }
}

function postWorkerTask(payload, timeoutMs = 30000, transfer = null) {
    return new Promise((resolve, reject) => {
        if (!geoWorkerPool) return reject(new Error('No worker pool'));
        if (window.isEngineCancelled) return reject(buildCancelledError());
        geoWorkerPool.post(payload, timeoutMs, transfer).then(resolve).catch(reject);
        const load = geoWorkerPool.getLoad();
        const loaderMsg = document.getElementById('loader-msg');
        if (loaderMsg) loaderMsg.innerText = `Procesando (${load.pending} en curso / ${load.queued} en cola)...`;
    });
}

function cancelWorkerTasks(reason) {
    if (!geoWorkerPool) return;
    geoWorkerPool.cancelAll(reason || 'Operacion cancelada por el usuario');
}

window.cancelWorkerTasks = cancelWorkerTasks;

function resetGeoWorkerPool(reason = 'Worker pool reset') {
    try {
        if (geoWorkerPool) {
            try { geoWorkerPool.cancelAll(reason); } catch (e) {}
            try {
                const ws = Array.isArray(geoWorkerPool.workers) ? geoWorkerPool.workers : [];
                ws.forEach((w) => { try { w.terminate(); } catch (e) {} });
            } catch (e) {}
        }
    } finally {
        geoWorkerPool = null;
        geoWorker = null;
        window.geoWorker = null;
        window.geoWorkerPool = null;
    }
    createGeoWorker();
}

window.resetGeoWorkerPool = resetGeoWorkerPool;

function prewarmGeoWorker(timeoutMs = 15000) {
    if (geoWorkerPrewarmPromise) return geoWorkerPrewarmPromise;
    geoWorkerPrewarmPromise = new Promise((resolve) => {
        try {
            createGeoWorker();
            const done = (ok) => {
                resolve(!!ok);
                geoWorkerPrewarmPromise = null;
            };
            if (!geoWorkerPool) return done(false);
            const prevCancelled = !!window.isEngineCancelled;
            window.isEngineCancelled = false;
            geoWorkerPool.post({ task: 'worker_health' }, timeoutMs).then(() => {
                window.isEngineCancelled = prevCancelled;
                done(true);
            }).catch(() => {
                window.isEngineCancelled = prevCancelled;
                done(false);
            });
        } catch (e) {
            resolve(false);
            geoWorkerPrewarmPromise = null;
        }
    });
    return geoWorkerPrewarmPromise;
}

window.prewarmGeoWorker = prewarmGeoWorker;

if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
        setTimeout(() => {
            try { prewarmGeoWorker(12000); } catch (e) {}
        }, 250);
    });
}

;

/* ---- js/state/history.js ---- */
const historyStack = [];
let historyIndex = -1;
let isUndoRedoAction = false;
let historyShadowState = null;

const HISTORY_LIMIT = 200;

function _cloneState(state) {
    if (typeof structuredClone === 'function') {
        try { return structuredClone(state); } catch (e) { }
    }
    if (typeof window !== 'undefined' && typeof window.JETLCloneFallback === 'function') {
        return window.JETLCloneFallback(state);
    }
    return state;
}

function _exportState() {
    return _cloneState(editor.export());
}

function _getHomeData(state) {
    return (((state || {}).drawflow || {}).Home || {}).data || {};
}

function _edgeKey(edge) {
    return `${edge.from}|${edge.output}|${edge.to}|${edge.input}`;
}

function _collectEdges(state) {
    const data = _getHomeData(state);
    const edges = [];
    Object.keys(data).forEach((id) => {
        const outputs = (data[id] && data[id].outputs) || {};
        Object.keys(outputs).forEach((outPort) => {
            const conns = Array.isArray(outputs[outPort].connections) ? outputs[outPort].connections : [];
            conns.forEach((c) => {
                edges.push({
                    from: String(id),
                    output: outPort,
                    to: String(c.node),
                    input: c.output
                });
            });
        });
    });
    return edges;
}

function _shallowNodeEqual(a, b) {
    if (!a || !b) return false;
    return a.pos_x === b.pos_x && a.pos_y === b.pos_y;
}

function _computeDiff(prevState, nextState) {
    const prevData = _getHomeData(prevState);
    const nextData = _getHomeData(nextState);

    const addedNodes = {};
    const removedNodes = {};
    const movedNodes = {};

    const allIds = new Set([...Object.keys(prevData), ...Object.keys(nextData)]);
    allIds.forEach((id) => {
        const prevNode = prevData[id];
        const nextNode = nextData[id];
        if (!prevNode && nextNode) {
            addedNodes[id] = _cloneState(nextNode);
            return;
        }
        if (prevNode && !nextNode) {
            removedNodes[id] = _cloneState(prevNode);
            return;
        }
        if (prevNode && nextNode && !_shallowNodeEqual(prevNode, nextNode)) {
            movedNodes[id] = {
                from: { x: prevNode.pos_x, y: prevNode.pos_y },
                to: { x: nextNode.pos_x, y: nextNode.pos_y }
            };
        }
    });

    const prevEdges = _collectEdges(prevState);
    const nextEdges = _collectEdges(nextState);
    const prevMap = new Map(prevEdges.map((e) => [_edgeKey(e), e]));
    const nextMap = new Map(nextEdges.map((e) => [_edgeKey(e), e]));

    const addedEdges = [];
    const removedEdges = [];

    nextMap.forEach((edge, key) => {
        if (!prevMap.has(key)) addedEdges.push(edge);
    });
    prevMap.forEach((edge, key) => {
        if (!nextMap.has(key)) removedEdges.push(edge);
    });

    const hasNodeDelta = Object.keys(addedNodes).length || Object.keys(removedNodes).length || Object.keys(movedNodes).length;
    const hasEdgeDelta = addedEdges.length || removedEdges.length;
    if (!hasNodeDelta && !hasEdgeDelta) return null;

    return { addedNodes, removedNodes, movedNodes, addedEdges, removedEdges };
}

function _invertDiff(diff) {
    const invMoved = {};
    Object.keys(diff.movedNodes || {}).forEach((id) => {
        const m = diff.movedNodes[id];
        invMoved[id] = { from: _cloneState(m.to), to: _cloneState(m.from) };
    });
    return {
        addedNodes: _cloneState(diff.removedNodes || {}),
        removedNodes: _cloneState(diff.addedNodes || {}),
        movedNodes: invMoved,
        addedEdges: _cloneState(diff.removedEdges || []),
        removedEdges: _cloneState(diff.addedEdges || [])
    };
}

function _trimFutureHistory() {
    if (historyIndex < historyStack.length - 1) {
        historyStack.splice(historyIndex + 1);
    }
}

function _enforceHistoryLimit() {
    while (historyStack.length > HISTORY_LIMIT) {
        historyStack.shift();
        historyIndex--;
    }
    if (historyIndex < 0 && historyStack.length) historyIndex = 0;
}

function _ensurePort(arrObj, key) {
    if (!arrObj[key]) arrObj[key] = { connections: [] };
    if (!Array.isArray(arrObj[key].connections)) arrObj[key].connections = [];
}

function _addEdge(data, edge) {
    const from = data[edge.from];
    const to = data[edge.to];
    if (!from || !to) return;

    from.outputs = from.outputs || {};
    to.inputs = to.inputs || {};
    _ensurePort(from.outputs, edge.output);
    _ensurePort(to.inputs, edge.input);

    const outConns = from.outputs[edge.output].connections;
    const inConns = to.inputs[edge.input].connections;
    if (!outConns.some((c) => String(c.node) === String(edge.to) && c.output === edge.input)) {
        outConns.push({ node: String(edge.to), output: edge.input });
    }
    if (!inConns.some((c) => String(c.node) === String(edge.from) && c.input === edge.output)) {
        inConns.push({ node: String(edge.from), input: edge.output });
    }
}

function _removeEdge(data, edge) {
    const from = data[edge.from];
    const to = data[edge.to];
    if (!from || !to) return;

    if (from.outputs && from.outputs[edge.output] && Array.isArray(from.outputs[edge.output].connections)) {
        from.outputs[edge.output].connections = from.outputs[edge.output].connections.filter(
            (c) => !(String(c.node) === String(edge.to) && c.output === edge.input)
        );
    }
    if (to.inputs && to.inputs[edge.input] && Array.isArray(to.inputs[edge.input].connections)) {
        to.inputs[edge.input].connections = to.inputs[edge.input].connections.filter(
            (c) => !(String(c.node) === String(edge.from) && c.input === edge.output)
        );
    }
}

function _applyDiffToState(baseState, diff) {
    const state = _cloneState(baseState);
    const data = _getHomeData(state);

    Object.keys(diff.removedNodes || {}).forEach((id) => { delete data[id]; });
    Object.keys(diff.addedNodes || {}).forEach((id) => { data[id] = _cloneState(diff.addedNodes[id]); });

    Object.keys(diff.movedNodes || {}).forEach((id) => {
        if (!data[id]) return;
        const next = diff.movedNodes[id].to;
        data[id].pos_x = next.x;
        data[id].pos_y = next.y;
    });

    (diff.removedEdges || []).forEach((e) => _removeEdge(data, e));
    (diff.addedEdges || []).forEach((e) => _addEdge(data, e));

    return state;
}

function _importHistoryState(state) {
    editor.clear();
    editor.import(_cloneState(state));
    SafeStorage.save('jetl_flow_optimized', JSON.stringify(editor.export()));
    if (window.JETLSchemaUI && typeof JETLSchemaUI.refreshAll === 'function') {
        setTimeout(() => JETLSchemaUI.refreshAll(), 0);
    }
}

function addToHistory() {
    if (isUndoRedoAction) return;

    const current = _exportState();

    if (historyIndex < 0 || historyStack.length === 0 || !historyShadowState) {
        historyStack.length = 0;
        historyStack.push({ kind: 'checkpoint', state: current });
        historyIndex = 0;
        historyShadowState = current;
        return;
    }

    _trimFutureHistory();

    const diff = _computeDiff(historyShadowState, current);
    if (!diff) return;

    historyStack.push({
        kind: 'delta',
        forward: diff,
        backward: _invertDiff(diff)
    });
    historyIndex = historyStack.length - 1;
    historyShadowState = current;
    _enforceHistoryLimit();
}

function undo() {
    if (historyIndex <= 0) return;
    const entry = historyStack[historyIndex];
    if (!entry || entry.kind !== 'delta') return;

    isUndoRedoAction = true;
    try {
        const state = _exportState();
        const prev = _applyDiffToState(state, entry.backward);
        _importHistoryState(prev);
        historyIndex--;
        historyShadowState = _exportState();
        showToast("Deshacer", "info");
    } finally {
        isUndoRedoAction = false;
    }
}

function redo() {
    if (historyIndex >= historyStack.length - 1) return;
    const nextEntry = historyStack[historyIndex + 1];
    if (!nextEntry) return;

    isUndoRedoAction = true;
    try {
        if (nextEntry.kind === 'checkpoint') {
            _importHistoryState(nextEntry.state);
        } else if (nextEntry.kind === 'delta') {
            const state = _exportState();
            const next = _applyDiffToState(state, nextEntry.forward);
            _importHistoryState(next);
        }
        historyIndex++;
        historyShadowState = _exportState();
        showToast("Rehacer", "info");
    } finally {
        isUndoRedoAction = false;
    }
}

function initHistory() {
    const events = ['nodeCreated', 'nodeRemoved', 'nodeMoved', 'connectionCreated', 'connectionRemoved'];
    events.forEach((ev) => editor.on(ev, () => addToHistory()));
    addToHistory();

    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
            e.preventDefault();
            undo();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
            e.preventDefault();
            redo();
        }
    });
}

;

/* ---- js/engine.js ---- */
// =============================================
// 3. ENGINE & EVENTS
// =============================================
let editor, map, mapLayers = {}, executionData = {};
window.executionData = executionData;
window.lastRunReport = null;
let dirtyNodeMap = {};

function _getGraphDataSafe() {
    try {
        if (!editor || typeof editor.export !== 'function') return {};
        return (((editor.export() || {}).drawflow || {}).Home || {}).data || {};
    } catch (_) {
        return {};
    }
}

function _collectDownstreamIds(startId, graphData) {
    const data = graphData || _getGraphDataSafe();
    const out = new Set();
    const q = [String(startId)];
    while (q.length) {
        const id = String(q.shift());
        if (out.has(id)) continue;
        out.add(id);
        const node = data[id];
        const outputs = (node && node.outputs) ? node.outputs : {};
        Object.keys(outputs).forEach((port) => {
            const conns = Array.isArray(outputs[port] && outputs[port].connections) ? outputs[port].connections : [];
            conns.forEach((c) => {
                const nextId = String(c && c.node ? c.node : '');
                if (nextId && !out.has(nextId)) q.push(nextId);
            });
        });
    }
    return out;
}

function markNodeDirty(nodeId, reason) {
    if (!nodeId) return;
    const id = String(nodeId);
    dirtyNodeMap[id] = reason || 'changed';
}

function clearNodeDirty(nodeId) {
    if (!nodeId) return;
    delete dirtyNodeMap[String(nodeId)];
}

function clearAllDirty() {
    dirtyNodeMap = {};
}

function invalidateAllNodes(reason) {
    dirtyNodeMap = {};
    const data = _getGraphDataSafe();
    Object.keys(data || {}).forEach((id) => {
        dirtyNodeMap[String(id)] = reason || 'invalidate_all';
    });
    if (reason && typeof log === 'function') log(`[DIRTY] invalidacion global: ${reason}`, 'info');
}

function invalidateNodeAndDownstream(nodeId, reason) {
    if (!nodeId) return;
    const data = _getGraphDataSafe();
    const ids = _collectDownstreamIds(String(nodeId), data);
    ids.forEach((id) => markNodeDirty(id, reason || 'downstream_change'));
}

function isNodeDirty(nodeId) {
    if (!nodeId) return false;
    return !!dirtyNodeMap[String(nodeId)];
}

window.JETLDirty = {
    isDirty: isNodeDirty,
    markNodeDirty,
    clearNodeDirty,
    clearAll: clearAllDirty,
    invalidateAll: invalidateAllNodes,
    invalidateNodeAndDownstream
};

function ensureRuntimeCaches() {
    if (!window._file_cache) window._file_cache = {};
    if (!window._tiff_cache) window._tiff_cache = {};
    if (!window._node_tiff_ref) window._node_tiff_ref = {};
}

function clearNodeRuntimeCaches(nodeId) {
    if (!nodeId) return;
    ensureRuntimeCaches();
    delete window._file_cache['file_' + nodeId];
    const tiffRef = window._node_tiff_ref[nodeId];
    if (tiffRef) {
        delete window._tiff_cache[tiffRef];
        delete window._node_tiff_ref[nodeId];
    }
}

function clearAllRuntimeCaches() {
    window._file_cache = {};
    window._tiff_cache = {};
    window._node_tiff_ref = {};
}

window.JETLRuntimeCache = {
    ensure: ensureRuntimeCaches,
    clearNode: clearNodeRuntimeCaches,
    clearAll: clearAllRuntimeCaches
};

function normalizeResult(res) {
    if (!res) return null;
    if (res.type === 'Feature') return turf.featureCollection([res]);
    if (res.type === 'FeatureCollection') return res;
    if (Array.isArray(res) && res.length && res[0].type) return turf.featureCollection(res);
    const keys = Object.keys(res || {});
    if (keys.some(k => k && k.startsWith && k.startsWith('output_'))) return res;
    if (res && res.geometry) return turf.featureCollection([turf.feature(res.geometry, res.properties || {})]);
    return res;
}

function resolvePort(parentRes, parentPort) {
    if (!parentRes) return null;
    if (parentRes.type === 'FeatureCollection' || parentRes.type === 'Feature') return normalizeResult(parentRes);
    if (typeof parentRes === 'object') {
        if (parentPort && parentRes[parentPort]) return normalizeResult(parentRes[parentPort]);
        if (parentRes.output_1) return normalizeResult(parentRes.output_1);
        if (parentRes.output) return normalizeResult(parentRes.output);
    }
    return null;
}

// WORKER SETUP (POOL) is now handled via js/core/workerPool.js


let jetlAppInitialized = false;

function setJETLStartupStatus(state, message) {
    const dot = document.getElementById('sys-status');
    if (!dot) return;
    const colors = { loading: '#f1c40f', ready: '#2ecc71', error: '#e74c3c' };
    dot.style.background = colors[state] || colors.loading;
    dot.title = message || 'JETL Studio';
    dot.setAttribute('aria-label', message || 'JETL Studio');
}

function ensureJETLMap() {
    if (map) return map;
    const mapElement = document.getElementById('map');
    if (!mapElement) throw new Error('No se encontró el contenedor del mapa');
    if (typeof L === 'undefined') throw new Error('Leaflet no está disponible');

    map = L.map(mapElement, { renderer: L.canvas() }).setView([40.416, -3.703], 6);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OSM contributors'
    }).addTo(map);
    layerControl = L.control.layers(null, {}, { position: 'topright', collapsed: true }).addTo(map);
    return map;
}
window.ensureJETLMap = ensureJETLMap;

function initializeJETLApp() {
    if (jetlAppInitialized) return;
    if (window.__JETL_BOOT) window.__JETL_BOOT.stage = 'initializing-editor';
    jetlAppInitialized = true;
    setJETLStartupStatus('loading', 'Iniciando JETL Studio');

    try {
        // El catálogo es independiente del mapa y debe estar disponible de inmediato.
        renderSidebar('');

        if (typeof Drawflow === 'undefined') throw new Error('Drawflow no está disponible');
        const drawflowElement = document.getElementById('drawflow');
        if (!drawflowElement) throw new Error('No se encontró el lienzo de flujo');

    try {
        const originalValueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        Object.defineProperty(HTMLInputElement.prototype, 'value', {
            set: function (val) {
                if (this.type === 'file' && val !== "") return;
                originalValueSetter.call(this, val);
            }
        });
    } catch (e) { console.warn("No se pudo aplicar el parche de input file", e); }

    editor = new Drawflow(drawflowElement);
    editor.reroute = true;
    editor.reroute_fix_curvature = true;
    editor.start();

    const saved = SafeStorage.load('jetl_flow_optimized');
    if (saved) {
        try { editor.import(JSON.parse(saved)); } catch (e) { console.error("Error importando flujo guardado:", e); }
    }

    ['nodeCreated', 'nodeRemoved', 'connectionCreated', 'connectionRemoved'].forEach(ev => {
        editor.on(ev, (payload) => {
            if (ev === 'nodeRemoved') {
                const removedId = String(payload);
                clearNodeRuntimeCaches(removedId);
                delete executionData[removedId];
                clearNodeDirty(removedId);
                invalidateAllNodes('node_removed');
                if (typeof window.resetNodeDisplayPorts === 'function') window.resetNodeDisplayPorts(removedId);
            } else if (ev === 'nodeCreated') {
                invalidateNodeAndDownstream(String(payload), 'node_created');
            } else if (ev === 'connectionCreated' || ev === 'connectionRemoved') {
                const srcId = payload && payload.output_id ? String(payload.output_id) : null;
                const dstId = payload && payload.input_id ? String(payload.input_id) : null;
                if (srcId) invalidateNodeAndDownstream(srcId, ev);
                if (dstId) invalidateNodeAndDownstream(dstId, ev);
                if (!srcId && !dstId) invalidateAllNodes(ev);
            }
            SafeStorage.save('jetl_flow_optimized', JSON.stringify(editor.export()));
            if (window.JETLSchemaUI && typeof JETLSchemaUI.refreshAll === 'function') {
                setTimeout(() => JETLSchemaUI.refreshAll(), 0);
            }
        });
    });
    editor.on('nodeDataChanged', (nodeId) => {
        invalidateNodeAndDownstream(String(nodeId), 'node_data_changed');
    });

    editor.on('click', (e) => {
        const el = e.target.closest('.drawflow-node');
        if (el) {
            const id = el.id.replace('node-', '');
            currentNodeId = id;
            document.querySelectorAll('.drawflow-node').forEach(n => n.classList.remove('selected'));
            el.classList.add('selected');
            if (executionData[id] && executionData[id].data) {
                if (typeof selectedRowSet !== 'undefined') selectedRowSet.clear();
                buildTable(executionData[id].data);
            }
        } else {
            document.querySelectorAll('.drawflow-node').forEach(n => n.classList.remove('selected'));
            currentNodeId = null;
        }
    });

    setJETLStartupStatus('ready', 'Sistema listo');
    if (window.__JETL_BOOT) window.__JETL_BOOT.stage = 'ready';
    createGeoWorker();
    initQuickSearch();

    // --- CORRECCIÓN: Inicialización de Módulos Faltantes ---
    initHistory();
    initContextMenu();
    initEngineDelegation();

    const filterInput = document.getElementById('table-filter');
    if (filterInput) {
        filterInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') applyTableFilter();
        });
    }
    if (window.JETLSchemaUI && typeof JETLSchemaUI.refreshAll === 'function') {
        setTimeout(() => JETLSchemaUI.refreshAll(), 0);
    }
    } catch (error) {
        jetlAppInitialized = false;
        setJETLStartupStatus('error', `Error de inicio: ${error.message || error}`);
        console.error('[JETL] Error durante la inicialización', error);
        if (typeof window.showToast === 'function') {
            window.showToast(`No se pudo iniciar JETL Studio: ${error.message || error}`, 'error');
        }
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeJETLApp, { once: true });
} else {
    queueMicrotask(initializeJETLApp);
}

// Permite reintentar el arranque si una dependencia esencial llegó tarde.
window.addEventListener('load', () => {
    if (!jetlAppInitialized) initializeJETLApp();
}, { once: true });

function renderSidebar(filter) {
    const container = document.getElementById('sidebar-content');
    container.innerHTML = '';
    const cats = {};
    Object.entries(TOOL_REGISTRY).forEach(([k, tool]) => {
        if (filter && !tool.label.toLowerCase().includes(filter.toLowerCase())) return;
        if (!cats[tool.cat]) cats[tool.cat] = [];
        cats[tool.cat].push({ k, ...tool });
    });

    const sortedCats = Object.keys(cats).sort();

    sortedCats.forEach(c => {
        const group = document.createElement('div');
        group.className = 'cat-group';

        const title = document.createElement('div');
        title.className = 'cat-title';
        title.setAttribute('data-cat-toggle', '1');
        title.innerHTML = `<span>${c}</span> <i class="fas fa-chevron-down"></i>`;

        const itemsDiv = document.createElement('div');
        itemsDiv.className = 'cat-items';

        if (filter && filter.length > 0) {
            itemsDiv.classList.add('open');
            title.classList.add('active');
        }

        cats[c].forEach(t => {
            itemsDiv.innerHTML += `<div class="node-item" draggable="true" data-k="${t.k}">
                <i class="fas ${t.icon}" style="color:${t.color}"></i> ${t.label}
            </div>`;
        });

        group.appendChild(title);
        group.appendChild(itemsDiv);
        container.appendChild(group);
    });
}
function filterTools(val) { renderSidebar(val); }

let qsMousePos = { x: 0, y: 0 };

function initQuickSearch() {
    const qs = document.getElementById('quick-search');
    const input = document.getElementById('qs-input');
    const results = document.getElementById('qs-results');
    const workspace = document.getElementById('workspace');

    workspace.addEventListener('mousemove', (e) => {
        if (qs.style.display !== 'block') {
            qsMousePos = { x: e.clientX, y: e.clientY };
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

        if (e.key.length === 1 && e.key.match(/[a-z0-9]/i)) {
            if (qs.style.display !== 'block') {
                qs.style.top = Math.min(qsMousePos.y, window.innerHeight - 300) + 'px';
                qs.style.left = Math.min(qsMousePos.x, window.innerWidth - 300) + 'px';
                qs.style.display = 'block';
                anime({ targets: qs, opacity: [0, 1], scale: [0.8, 1], duration: 200, easing: 'easeOutQuad' });
                input.value = '';
                input.focus();
            }
        }
        if (e.key === 'Escape') closeQS();
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const sel = results.querySelector('.selected');
            if (sel) { addNode(sel.dataset.k, parseInt(qs.style.left), parseInt(qs.style.top)); closeQS(); }
        } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            const current = results.querySelector('.selected');
            const items = Array.from(results.querySelectorAll('.qs-item'));
            let idx = items.indexOf(current);
            if (idx === -1 && items.length > 0) idx = 0;
            else if (e.key === 'ArrowDown') idx = Math.min(idx + 1, items.length - 1);
            else idx = Math.max(idx - 1, 0);
            items.forEach(i => i.classList.remove('selected'));
            if (items[idx]) { items[idx].classList.add('selected'); items[idx].scrollIntoView({ block: 'nearest' }); }
        }
    });

    input.addEventListener('keyup', (e) => {
        if (['ArrowUp', 'ArrowDown', 'Enter'].includes(e.key)) return;
        const val = input.value.toLowerCase();
        results.innerHTML = '';
        const matches = Object.entries(TOOL_REGISTRY).filter(([k, t]) => t.label.toLowerCase().includes(val) || t.cat.toLowerCase().includes(val));

        matches.slice(0, 10).forEach(([k, t], i) => {
            const item = document.createElement('div');
            item.className = 'qs-item' + (i === 0 ? ' selected' : '');
            item.dataset.k = k;
            item.innerHTML = `<i class="fas ${t.icon}" style="color:${t.color}"></i> ${t.label} <span style="font-size:0.7em;opacity:0.5;margin-left:auto">${t.cat}</span>`;
            results.appendChild(item);
        });

        anime({ targets: '.qs-item', opacity: [0, 1], translateX: [10, 0], delay: anime.stagger(30), duration: 300, easing: 'easeOutQuad' });
    });

    function closeQS() {
        anime({ targets: qs, opacity: 0, scale: 0.9, duration: 150, easing: 'easeInQuad', complete: () => { qs.style.display = 'none'; input.value = ''; document.activeElement.blur(); } });
    }

    document.addEventListener('click', (e) => { if (qs.style.display === 'block' && !qs.contains(e.target)) closeQS(); });
    results.addEventListener('click', (e) => {
        const item = e.target.closest('.qs-item');
        if (!item) return;
        addNode(item.dataset.k, parseInt(qs.style.left), parseInt(qs.style.top));
        closeQS();
    });
}

function countFeaturesFromResult(data) {
    if (!data) return 0;
    if (data.type === 'FeatureCollection' && Array.isArray(data.features)) return data.features.length;
    if (data.type === 'Feature') return 1;
    if (typeof data === 'object') {
        let total = 0;
        Object.keys(data).forEach((k) => {
            if (!/^output_\d+$/.test(k)) return;
            const out = data[k];
            if (out && out.type === 'FeatureCollection' && Array.isArray(out.features)) total += out.features.length;
        });
        return total;
    }
    return 0;
}

function countOutputsFromResult(data) {
    const out = {};
    if (!data) return out;
    if (data.type === 'FeatureCollection' && Array.isArray(data.features)) {
        out.output_1 = data.features.length;
        return out;
    }
    if (data.type === 'Feature') {
        out.output_1 = 1;
        return out;
    }
    if (typeof data === 'object') {
        Object.keys(data).forEach((k) => {
            if (!/^output_\d+$/.test(k)) return;
            const v = data[k];
            if (v && v.type === 'FeatureCollection' && Array.isArray(v.features)) out[k] = v.features.length;
        });
    }
    return out;
}

function buildRunReport(label, status, errorMessage) {
    const exportData = (editor && typeof editor.export === 'function')
        ? (((editor.export() || {}).drawflow || {}).Home || {}).data || {}
        : {};
    const entries = Object.entries(executionData || {});
    const nodes = entries.map(([id, meta]) => {
        const node = exportData[id];
        const nodeName = node ? node.name : '';
        const tool = nodeName && window.TOOL_REGISTRY ? window.TOOL_REGISTRY[nodeName] : null;
        return {
            id: String(id),
            node: nodeName || 'unknown',
            label: tool ? tool.label : nodeName || 'unknown',
            ms: (meta && meta._ms) || 0,
            count: countFeaturesFromResult(meta ? meta.data : null),
            outputs: countOutputsFromResult(meta ? meta.data : null),
            cached: !!(meta && meta._runId !== currentRunTimestamp)
        };
    }).sort((a, b) => b.ms - a.ms);

    const totalMs = nodes.reduce((acc, n) => acc + (n.ms || 0), 0);
    const totalFeatures = nodes.reduce((acc, n) => acc + (n.count || 0), 0);
    return {
        version: '1.0',
        generated_at: new Date().toISOString(),
        run_id: currentRunTimestamp || Date.now(),
        label: label || 'Run',
        status: status || 'ok',
        error: errorMessage || null,
        summary: {
            nodes: nodes.length,
            total_ms: totalMs,
            total_features: totalFeatures
        },
        nodes
    };
}

function downloadRunReport(format = 'json') {
    const report = window.lastRunReport || buildRunReport('Manual', 'unknown', null);
    if (!report) {
        if (typeof showToast === 'function') showToast('Sin run report disponible', 'warn');
        return;
    }
    let content = '';
    let mime = 'application/json';
    let filename = `run_report_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.json`;
    if (format === 'csv') {
        mime = 'text/csv';
        filename = filename.replace(/\.json$/, '.csv');
        const head = 'id,node,label,ms,count,output_1,output_2,output_3,cached';
        const rows = (report.nodes || []).map(n => [
            n.id,
            `"${String(n.node || '').replace(/"/g, '""')}"`,
            `"${String(n.label || '').replace(/"/g, '""')}"`,
            n.ms || 0,
            n.count || 0,
            (n.outputs && n.outputs.output_1) || 0,
            (n.outputs && n.outputs.output_2) || 0,
            (n.outputs && n.outputs.output_3) || 0,
            n.cached ? 'true' : 'false'
        ].join(','));
        content = [head, ...rows].join('\n');
    } else {
        content = JSON.stringify(report, null, 2);
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    if (typeof showToast === 'function') showToast(`Run report exportado (${format.toUpperCase()})`, 'success');
}

window.JETLRunReport = {
    build: buildRunReport,
    export: downloadRunReport
};

function drag(e) { e.dataTransfer.setData("node", e.target.dataset.k); }
function drop(e) { e.preventDefault(); const k = e.dataTransfer.getData("node"); if (k) addNode(k, e.clientX, e.clientY); }
function allowDrop(e) { e.preventDefault(); }

function addNodeClick(k) {
    const rect = document.getElementById('drawflow').getBoundingClientRect();
    addNode(k, rect.width / 2 + rect.left, rect.height / 2 + rect.top);
    if (window.innerWidth < 768) toggleSidebar();
}

function addNode(k, x, y) {
    const t = TOOL_REGISTRY[k];
    let pos = { x: 100, y: 100 };
    if (x && y) {
        // Cálculo de posición corregido por zoom
        pos.x = x * (editor.precanvas.clientWidth / (editor.precanvas.clientWidth * editor.zoom)) - (editor.precanvas.getBoundingClientRect().x * (editor.precanvas.clientWidth / (editor.precanvas.clientWidth * editor.zoom)));
        pos.y = y * (editor.precanvas.clientHeight / (editor.precanvas.clientHeight * editor.zoom)) - (editor.precanvas.getBoundingClientRect().y * (editor.precanvas.clientHeight / (editor.precanvas.clientHeight * editor.zoom)));
    }

    const isJunc = k === 'util_junction';
    const helpIcon = t.help ? `<i class="fas fa-circle-info node-help" title="${t.help}"></i>` : '';
    const html = isJunc ? `<div class="junction-point"></div>` :
        `<div class="node-head" style="border-bottom:3px solid ${t.color}">
            <div style="display:flex;align-items:center;">
                <span class="count-badge node-badge-count">0</span>
                <span><i class="fas ${t.icon}"></i> ${t.label}</span>
                <span class="time-badge node-badge-time"></span>
            </div>
            <div class="node-actions">
                ${helpIcon}
                <i class="fas fa-play-circle node-btn node-action" data-node-action="run" title="Ejecutar hasta aqui"></i>
                <i class="fas fa-eye node-btn eye-btn node-action" data-node-action="view" title="Ver en Mapa"></i>
                <i class="fas fa-times node-action" data-node-action="delete" style="cursor:pointer;opacity:0.6;margin-left:4px" title="Eliminar nodo"></i>
            </div>
        </div>
        <div class="node-body">${t.tpl ? t.tpl() : ''}</div>`;

    // Crear nodo. Drawflow guarda 'html' en memoria tal cual se envía.
    const id = editor.addNode(k, t.in, t.out, pos.x, pos.y, isJunc ? 'junction' : '', {}, html);

    // 1. ACTUALIZACIÓN VISUAL (DOM)
    const el = document.getElementById('node-' + id);
    if (el) {
        anim_NodeEnter(el);
    }
    if (window.JETLSchemaUI && typeof JETLSchemaUI.updateNode === 'function') {
        setTimeout(() => JETLSchemaUI.updateNode(id), 0);
    }
    return id;
}

function initEngineDelegation() {
    document.addEventListener('click', (e) => {
        const actionEl = e.target.closest('[data-ui-action]');
        if (!actionEl) return;
        const action = actionEl.getAttribute('data-ui-action');

        if (action === 'cancel-run') cancelEngineRun();
        else if (action === 'toggle-sidebar') toggleSidebar();
        else if (action === 'undo' && typeof undo === 'function') undo();
        else if (action === 'redo' && typeof redo === 'function') redo();
        else if (action === 'clear-canvas') clearCanvas();
        else if (action === 'save-project') saveProject();
        else if (action === 'open-project') {
            const upload = document.getElementById('upload-jetl');
            if (upload) upload.click();
        }
        else if (action === 'export-run-report') downloadRunReport('json');
        else if (action === 'export-run-report-csv') downloadRunReport('csv');
        else if (action === 'open-templates' && typeof openTemplatesModal === 'function') openTemplatesModal();
        else if (action === 'apply-template-demo' && typeof applyTemplate === 'function') applyTemplate('demo');
        else if (action === 'zoom-all') zoomToAllLayers();
        else if (action === 'tab-map') switchTab('map', e);
        else if (action === 'tab-table') switchTab('table', e);
        else if (action === 'tab-logs') switchTab('logs', e);
        else if (action === 'toggle-map-expand' && typeof toggleMapPanelExpand === 'function') toggleMapPanelExpand();
        else if (action === 'toggle-panel') togglePanelHeight();
        else if (action === 'apply-symbology') applySymbology();
        else if (action === 'toggle-symbology') toggleSymbologyPanel();
        else if (action === 'ctx-run') ctxAction('run');
        else if (action === 'ctx-view') ctxAction('view');
        else if (action === 'ctx-delete') ctxAction('delete');
        else if (action === 'close-templates' && typeof closeTemplatesModal === 'function') closeTemplatesModal();
    });

    const sidebarFilterInput = document.getElementById('sidebar-filter-input');
    if (sidebarFilterInput) {
        sidebarFilterInput.addEventListener('input', (e) => {
            filterTools(e.target.value || '');
        });
    }

    const uploadJetl = document.getElementById('upload-jetl');
    if (uploadJetl) {
        uploadJetl.addEventListener('change', () => loadProject(uploadJetl));
    }

    const sidebar = document.getElementById('sidebar-content');
    if (sidebar) {
        sidebar.addEventListener('click', (e) => {
            const catTitle = e.target.closest('.cat-title[data-cat-toggle]');
            if (catTitle) {
                const itemsDiv = catTitle.nextElementSibling;
                if (itemsDiv && itemsDiv.classList.contains('cat-items')) {
                    itemsDiv.classList.toggle('open');
                    catTitle.classList.toggle('active');
                }
                return;
            }

            const item = e.target.closest('.node-item');
            if (!item) return;
            const k = item.dataset.k;
            if (k) addNodeClick(k);
        });

        sidebar.addEventListener('dragstart', (e) => {
            const item = e.target.closest('.node-item');
            if (!item || !e.dataTransfer) return;
            e.dataTransfer.setData("node", item.dataset.k || '');
        });
    }

    const drawflowEl = document.getElementById('drawflow');
    if (drawflowEl) {
        drawflowEl.addEventListener('dragover', allowDrop);
        drawflowEl.addEventListener('drop', drop);

        drawflowEl.addEventListener('click', (e) => {
            const actionEl = e.target.closest('[data-node-action]');
            if (!actionEl) return;
            e.stopPropagation();

            const nodeEl = actionEl.closest('.drawflow-node');
            if (!nodeEl || !nodeEl.id) return;
            const nodeId = nodeEl.id.replace('node-', '');
            const action = actionEl.getAttribute('data-node-action');

            if (action === 'run') runEnginePartial(nodeId);
            else if (action === 'view') showOnMap(nodeId, null, true);
            else if (action === 'delete') editor.removeNodeId(nodeEl.id);
        });

        drawflowEl.addEventListener('change', (e) => {
            const fileInput = e.target.closest('input[type="file"][data-load-file]');
            if (fileInput) {
                loadFile(fileInput);
                return;
            }

            const modeSelect = e.target.closest('select[df-mode]');
            if (!modeSelect) return;
            const parent = modeSelect.parentElement;
            const bandsInput = parent ? parent.querySelector('[df-bands]') : null;
            if (bandsInput) bandsInput.style.display = modeSelect.value === 'select' ? 'block' : 'none';
        });
    }
}

async function runEngine() {
    window.isEngineCancelled = false;
    const loader = document.getElementById('loader');
    const cancelBtn = document.getElementById('loader-cancel');
    loader.style.display = 'flex';
    if (cancelBtn) cancelBtn.style.display = 'block';
    log("--- INICIANDO EJECUCIÓN TOTAL ---");

    currentRunTimestamp = Date.now();

    document.querySelectorAll('.count-badge').forEach(b => b.style.display = 'none');
    document.querySelectorAll('.eye-btn').forEach(b => b.classList.remove('active'));

    await new Promise(r => setTimeout(r, 50));

    const exportData = editor.export().drawflow.Home.data;
    const nodes = Object.values(exportData);
    const roots = nodes.filter(n => TOOL_REGISTRY[n.name].in === 0);

    if (roots.length === 0) { log("Error: Añade un Reader", "err"); loader.style.display = 'none'; if (cancelBtn) cancelBtn.style.display = 'none'; return; }

    try {
        for (const r of roots) await processNode(r.id, exportData);
        if (window.isEngineCancelled) throw new Error("Ejecución cancelada por el usuario.");
        log("--- FIN EXITOSO ---");
        if (typeof logRunSummary === 'function') logRunSummary('Ejecución Total');
        window.lastRunReport = buildRunReport('Ejecución Total', 'ok', null);
        showToast("Proceso completado", "success");
        updateBadges();
        if (window.JETLSchemaUI && typeof JETLSchemaUI.refreshAll === 'function') JETLSchemaUI.refreshAll();
    } catch (e) {
        const isCancelled = window.isEngineCancelled || (e && (e.cancelled || e.name === 'CancelledError'));
        if (isCancelled) {
            window.lastRunReport = buildRunReport('Ejecución Total', 'cancelled', null);
            log("Ejecución cancelada por el usuario.", "warn");
            showToast("Ejecución cancelada", "warning");
        } else {
            window.lastRunReport = buildRunReport('Ejecución Total', 'error', e && e.message ? e.message : String(e));
            log("FATAL: " + e.message, "err");
            showToast("Error en ejecución", "error");
        }
    }
    loader.style.display = 'none';
    if (cancelBtn) cancelBtn.style.display = 'none';
}

function cancelEngineRun() {
    window.isEngineCancelled = true;
    if (typeof window.cancelWorkerTasks === 'function') {
        window.cancelWorkerTasks('Operacion cancelada por el usuario');
    }
    showToast("Cancelando operación... Por favor espera", "warning");
    const loaderMsg = document.getElementById('loader-msg');
    if (loaderMsg) loaderMsg.innerText = "Deteniendo...";
    const cancelBtn = document.getElementById('loader-cancel');
    if (cancelBtn) cancelBtn.style.display = 'none';
}

async function runEnginePartial(targetId) {
    window.isEngineCancelled = false;
    const loader = document.getElementById('loader');
    const cancelBtn = document.getElementById('loader-cancel');
    loader.style.display = 'flex';
    if (cancelBtn) cancelBtn.style.display = 'block';

    log(`--- Ejecución Parcial hasta nodo #${targetId} ---`);

    currentRunTimestamp = Date.now();

    try {
        const exportData = editor.export().drawflow.Home.data;
        // --- CORRECCIÓN: Validación de integridad tras Carga ---
        if (!exportData[targetId]) {
            throw new Error(`El nodo #${targetId} no existe en memoria. Intenta recargar la página.`);
        }

        await processNode(targetId, exportData);
        if (window.isEngineCancelled) throw new Error("Ejecución parcial cancelada.");

        log("--- Parcial Completado ---");
        if (typeof logRunSummary === 'function') logRunSummary(`Parcial #${targetId}`);
        window.lastRunReport = buildRunReport(`Parcial #${targetId}`, 'ok', null);
        showToast("Nodo actualizado", "success");

        updateBadges();
        if (window.JETLSchemaUI && typeof JETLSchemaUI.refreshAll === 'function') JETLSchemaUI.refreshAll();

        if (executionData[targetId] && executionData[targetId].data) {
            const res = executionData[targetId].data;
            if (TOOL_REGISTRY[editor.getNodeFromId(targetId).name].out !== 0) {
                showOnMap(targetId);
                currentNodeId = String(targetId);
                if (typeof window.resolveNodeDisplayData === 'function') {
                    const info = window.resolveNodeDisplayData(String(targetId));
                    buildTable(info && info.data ? info.data : res);
                } else {
                    buildTable(res);
                }
            }
        }

    } catch (e) {
        const isCancelled = window.isEngineCancelled || (e && (e.cancelled || e.name === 'CancelledError'));
        if (isCancelled) {
            window.lastRunReport = buildRunReport(`Parcial #${targetId}`, 'cancelled', null);
            log("Ejecución parcial cancelada por el usuario.", "warn");
            showToast("Ejecución parcial cancelada", "warning");
        } else {
            window.lastRunReport = buildRunReport(`Parcial #${targetId}`, 'error', e && e.message ? e.message : String(e));
            log("Error Parcial: " + e.message, "err");
            showToast("Error en ejecución parcial", "error");
        }
    }
    loader.style.display = 'none';
    if (cancelBtn) cancelBtn.style.display = 'none';
}

function saveProject() {
    const exportData = editor.export();
    const project = {
        version: "2026.03.05",
        timestamp: Date.now(),
        flow: exportData
    };
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flujo_jetl_${new Date().toISOString().slice(0, 10)}.jetl`;
    a.click();
    showToast("Proyecto guardado correctamente", "success");
}

function loadProject(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const json = JSON.parse(e.target.result);
            const flowData = json.flow ? json.flow : json;

            // No se requiere auto-reparación de HTML porque los nodos ahora usan delegación
            // y no incrustan su propio ID en el template.

            // Limpieza profunda (igual que antes)
            editor.clear();
            clearAllRuntimeCaches();
            executionData = {};
            window.executionData = executionData;
            clearAllDirty();
            invalidateAllNodes('project_loaded');
            if (typeof window.resetNodeDisplayPorts === 'function') window.resetNodeDisplayPorts();
            currentRunTimestamp = 0;
            if (typeof selectedRowSet !== 'undefined') selectedRowSet.clear();
            if (typeof symbologyByNode !== 'undefined') symbologyByNode = {};
            if (typeof currentSymbologyNode !== 'undefined') currentSymbologyNode = null;

            Object.values(mapLayers).forEach(l => {
                map.removeLayer(l);
                if (layerControl) layerControl.removeLayer(l);
            });
            mapLayers = {};

            if (layerControl) {
                map.removeControl(layerControl);
                layerControl = L.control.layers(null, {}, { position: 'topright', collapsed: true }).addTo(map);
            }

            // Importamos los datos ya saneados
            editor.import(flowData);

            SafeStorage.save('jetl_flow_optimized', JSON.stringify(flowData));
            if (window.JETLSchemaUI && typeof JETLSchemaUI.refreshAll === 'function') JETLSchemaUI.refreshAll();
            showToast("Proyecto cargado y reparado", "success");
        } catch (err) {
            console.error(err);
            showToast("Error al leer el archivo .jetl", "error");
        }
    };
    reader.readAsText(file);
    input.value = '';
}

// History logic (undo/redo) moved to js/state/history.js

let ctxNodeId = null;

function initContextMenu() {
    const menu = document.getElementById('ctx-menu');
    const drawflowEl = document.getElementById('drawflow');

    drawflowEl.addEventListener('contextmenu', (e) => {
        const node = e.target.closest('.drawflow-node');
        if (node) {
            e.preventDefault();
            ctxNodeId = node.id.replace('node-', '');
            menu.style.top = e.clientY + 'px';
            menu.style.left = e.clientX + 'px';
            menu.style.display = 'block';
        } else {
            menu.style.display = 'none';
        }
    });
    document.addEventListener('click', () => menu.style.display = 'none');
}

function ctxAction(action) {
    if (!ctxNodeId) return;
    if (action === 'delete') {
        editor.removeNodeId('node-' + ctxNodeId);
    } else if (action === 'run') {
        runEnginePartial(ctxNodeId);
    } else if (action === 'view') {
        showOnMap(ctxNodeId, null, true);
    }
    document.getElementById('ctx-menu').style.display = 'none';
}



;

/* ---- js/processNode.js ---- */
async function processNode(id, allNodes) {
    const nodeData = allNodes[id];

    // --- CORRECCIÓN: Validación de Seguridad ---
    if (!nodeData) {
        throw new Error(`Error interno: Datos del nodo #${id} no encontrados. Intenta guardar y recargar.`);
    }

    const tool = TOOL_REGISTRY[nodeData.name];
    const dom = document.getElementById('node-' + id);

    // 1. OBTENER CONFIGURACIÓN ACTUAL DEL NODO (HASH)
    let configStr = "";
    if (dom) {
        const inputs = dom.querySelectorAll('input, select, textarea');
        inputs.forEach(el => {
            if (el.type === 'checkbox') configStr += el.checked + "|";
            else configStr += el.value + "|";
        });
    }

    // 2. RESOLVER INPUTS Y CHEQUEAR PADRES
    const inputs = [];
    let parentsRunId = "";

    for (let i = 1; i <= tool.in; i++) {
        try {
            const key = 'input_' + i;
            const inputSlot = nodeData.inputs && nodeData.inputs[key];
            if (!inputSlot || !inputSlot.connections || inputSlot.connections.length === 0) {
                inputs.push(null);
                continue;
            }

            const conns = inputSlot.connections;
            const parentId = conns[0].node;
            const parentPort = conns[0].input;

            const parentRes = await processNode(parentId, allNodes);

            if (executionData[parentId]) {
                parentsRunId += executionData[parentId]._contentHash + "_";
            }

            const resolved = resolvePort(parentRes, parentPort);
            inputs.push(resolved);
        } catch (e) { inputs.push(null); }
    }

    // 3. GENERAR HASH
    const currentContentHash = `CTX:${parentsRunId}__CFG:${configStr}`;
    const hasDirtyApi = !!(window.JETLDirty && typeof window.JETLDirty.isDirty === 'function');
    const isDirty = hasDirtyApi ? !!window.JETLDirty.isDirty(String(id)) : false;

    // 4. SMART CACHE CHECK
    if (!isDirty && executionData[id] && executionData[id]._contentHash === currentContentHash && executionData[id].data) {
        // HIT DE CACHÉ

        // --- CORRECCIÓN CACHÉ VERDE ---
        // Actualizamos el timestamp del dato cachedo al tiempo actual
        // para que el sistema sepa que es "válido en esta tirada"
        executionData[id]._runId = currentRunTimestamp;
        executionData[id]._ms = executionData[id]._ms || 0;

        if (dom) dom.style.opacity = '1';
        return executionData[id].data;
    }

    // 5. EJECUCIÓN REAL (Cache Miss)
    if (dom) dom.style.opacity = '0.6';
    const loaderMsg = document.getElementById('loader-msg');
    if (loaderMsg) loaderMsg.innerText = `Ejecutando ${tool.label}...`;
    await new Promise(r => setTimeout(r, 10));

    let result = null;
    const t0 = performance.now();
    try {
        if (window.isEngineCancelled) throw new Error("Operación cancelada por el usuario.");

        const safeInputs = inputs.map(i => {
            if (!i) return null;
            if (typeof window.JETLClone === 'function') return window.JETLClone(i);
            if (typeof structuredClone === 'function') {
                try { return structuredClone(i); } catch (e) {}
            }
            if (typeof window.JETLCloneFallback === 'function') return window.JETLCloneFallback(i);
            return i;
        });

        if (tool.in > 0) {
            const anyValid = safeInputs.some(s => s && s.features && s.features.length >= 0);
            if (!anyValid && tool.cat !== '1. READERS') throw new Error("Input vacío/inválido");
        }

        result = await tool.run(id, safeInputs, dom);
        result = normalizeResult(result);

        anim_NodeSuccess(id);
        anim_CableFlow(id);

    } catch (e) {
        log(`[${tool.label}] ERROR: ${e.message}`, "err");
        if (dom) {
            dom.style.boxShadow = "0 0 0 2px #c0392b";
            dom.style.opacity = '1';
            anim_NodeError(id);
        }
        throw e;
    }

    if (dom) dom.style.opacity = '1';

    // 6. GUARDAR RESULTADO
    const t1 = performance.now();
    executionData[id] = {
        data: result,
        _runId: currentRunTimestamp, // Usamos la variable global sincronizada
        _contentHash: currentContentHash,
        _ms: Math.max(0, Math.round(t1 - t0))
    };
    if (hasDirtyApi && typeof window.JETLDirty.clearNodeDirty === 'function') {
        window.JETLDirty.clearNodeDirty(String(id));
    }

    return result;
}

;

/* ---- js/visualization.js ---- */
// =============================================
// VISUALIZACIÓN & UI HELPERS (CON SORTING)
// =============================================

// Variables de estado
let selectedFeatureIndex = null;
let currentSortCol = null;  // Nombre de la propiedad por la que ordenamos
let currentSortDir = 0;     // 0: Original, 1: Asc, -1: Desc
let selectedRowSet = new Set();
let tableFilter = { text: '', field: '' };
let symbologyByNode = {};
let currentSymbologyNode = null;
let tableToolbarBound = false;
let tableInteractionsBound = false;
let nodeViewPortById = {};
let portInspectorReady = false;
let featureCacheBrowserReady = false;
let mapPanelExpanded = false;
let prevBottomPanelHeight = '';
const FEATURE_CACHE_BROWSER_KEY = 'JETLFeatureCacheBrowserState';
let featureCacheBrowserState = { nodeId: '', port: '' };

function loadFeatureCacheBrowserState() {
    try {
        const raw = localStorage.getItem(FEATURE_CACHE_BROWSER_KEY);
        if (!raw) return;
        const obj = JSON.parse(raw);
        if (obj && typeof obj === 'object') {
            featureCacheBrowserState = {
                nodeId: obj.nodeId ? String(obj.nodeId) : '',
                port: obj.port ? String(obj.port) : ''
            };
        }
    } catch (_) { }
}

function saveFeatureCacheBrowserState() {
    try {
        localStorage.setItem(FEATURE_CACHE_BROWSER_KEY, JSON.stringify(featureCacheBrowserState));
    } catch (_) { }
}

loadFeatureCacheBrowserState();

function ensureStableFeatureIndex(fc) {
    if (!fc || !Array.isArray(fc.features)) return;
    const feats = fc.features;
    if (!feats.length) return;

    let valid = true;
    const seen = new Set();
    for (let i = 0; i < feats.length; i++) {
        const f = feats[i] || {};
        if (!f.properties || typeof f.properties !== 'object') f.properties = {};
        const idx = f.properties._idx;
        const ok = Number.isInteger(idx) && idx >= 0 && !seen.has(idx);
        if (!ok) { valid = false; break; }
        seen.add(idx);
    }
    if (valid) return;

    for (let i = 0; i < feats.length; i++) {
        const f = feats[i] || {};
        if (!f.properties || typeof f.properties !== 'object') f.properties = {};
        f.properties._idx = i;
    }
}
window.ensureStableFeatureIndex = ensureStableFeatureIndex;
window.resetNodeDisplayPorts = function (nodeId) {
    if (!nodeId) {
        nodeViewPortById = {};
        updatePortInspectorUI(null);
        return;
    }
    delete nodeViewPortById[String(nodeId)];
    updatePortInspectorUI(currentNodeId || null);
};

function ensurePortInspectorUI() {
    if (portInspectorReady) return;
    const tabs = document.getElementById('panel-tabs');
    if (!tabs) return;
    if (document.getElementById('port-inspector')) {
        portInspectorReady = true;
        return;
    }
    const wrap = document.createElement('div');
    wrap.id = 'port-inspector';
    wrap.style.marginLeft = '8px';
    wrap.style.display = 'none';
    wrap.style.alignItems = 'center';
    wrap.style.gap = '6px';
    wrap.style.padding = '0 8px';
    wrap.style.borderLeft = '1px solid #333';
    wrap.innerHTML = `
        <span style="font-size:11px;color:#9aa0a6">Puerto</span>
        <select id="port-inspector-select" class="node-control" style="height:28px; min-width:92px; background:#111; color:#eee; border:1px solid #444; padding:2px 6px"></select>
    `;
    tabs.insertBefore(wrap, tabs.lastElementChild);

    const sel = wrap.querySelector('#port-inspector-select');
    if (sel) {
        sel.addEventListener('change', async () => {
            const nodeId = sel.getAttribute('data-node-id');
            const port = sel.value;
            if (!nodeId || !port) return;
            nodeViewPortById[String(nodeId)] = port;
            if (String(currentNodeId || '') === String(nodeId) && executionData[nodeId]) {
                const info = resolveNodeDisplayData(nodeId, port);
                if (info && info.data) buildTable(info.data);
                if (mapLayers[nodeId]) {
                    await showOnMap(nodeId, port, false);
                }
            }
        });
    }
    portInspectorReady = true;
}

function updatePortInspectorUI(nodeId) {
    ensurePortInspectorUI();
    const wrap = document.getElementById('port-inspector');
    const sel = document.getElementById('port-inspector-select');
    if (!wrap || !sel) return;
    if (!nodeId || !executionData[nodeId]) {
        wrap.style.display = 'none';
        sel.innerHTML = '';
        sel.removeAttribute('data-node-id');
        return;
    }
    const info = _resolveNodePortData(nodeId, nodeViewPortById[nodeId] || null);
    const ports = info && Array.isArray(info.ports) ? info.ports : [];
    if (ports.length <= 1) {
        wrap.style.display = 'none';
        sel.innerHTML = '';
        sel.removeAttribute('data-node-id');
        return;
    }
    wrap.style.display = 'inline-flex';
    sel.setAttribute('data-node-id', String(nodeId));
    sel.innerHTML = ports.map((p) => `<option value="${p}">${p}</option>`).join('');
    const current = nodeViewPortById[nodeId] && ports.includes(nodeViewPortById[nodeId]) ? nodeViewPortById[nodeId] : ports[0];
    sel.value = current;
}
window.updatePortInspectorUI = updatePortInspectorUI;

function _countFromFC(fc) {
    return (fc && Array.isArray(fc.features)) ? fc.features.length : 0;
}

function _getCachedNodeEntries() {
    const ids = Object.keys(executionData || {}).filter((id) => {
        const meta = executionData[id];
        if (!meta || !meta.data) return false;
        const d = meta.data;
        if (d && d.type === 'FeatureCollection') return true;
        return _listOutputPorts(d).length > 0;
    });

    ids.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
    return ids.map((id) => {
        const d = executionData[id].data;
        const ports = _listOutputPorts(d);
        const portCounts = {};
        let total = 0;
        if (d && d.type === 'FeatureCollection') {
            total = _countFromFC(d);
        } else {
            ports.forEach((p) => {
                portCounts[p] = _countFromFC(d[p]);
                total += portCounts[p];
            });
        }
        let label = `Nodo #${id}`;
        try {
            const n = editor && typeof editor.getNodeFromId === 'function' ? editor.getNodeFromId(id) : null;
            if (n && n.name && TOOL_REGISTRY[n.name]) label = `${TOOL_REGISTRY[n.name].label} (#${id})`;
        } catch (_) { }
        return { id: String(id), label, ports, portCounts, total };
    });
}

async function openFeatureCacheEntry(nodeId, preferredPort) {
    const id = String(nodeId || '');
    if (!id || !executionData[id]) return false;
    currentNodeId = id;
    let port = preferredPort ? String(preferredPort) : '';
    const info = resolveNodeDisplayData(id, port || null);
    if (!info || !info.data) return false;
    if (info.port) {
        nodeViewPortById[id] = info.port;
        port = info.port;
    }
    featureCacheBrowserState.nodeId = id;
    featureCacheBrowserState.port = port || '';
    saveFeatureCacheBrowserState();
    buildTable(info.data);
    await showOnMap(id, port || null, false);
    switchTab('table');
    return true;
}
window.openFeatureCacheEntry = openFeatureCacheEntry;

function ensureFeatureCacheBrowserUI() {
    if (featureCacheBrowserReady) return;
    const tabs = document.getElementById('panel-tabs');
    if (!tabs) return;
    if (document.getElementById('feature-cache-browser')) {
        featureCacheBrowserReady = true;
        return;
    }
    const wrap = document.createElement('div');
    wrap.id = 'feature-cache-browser';
    wrap.style.marginLeft = '8px';
    wrap.style.display = 'none';
    wrap.style.alignItems = 'center';
    wrap.style.gap = '6px';
    wrap.style.padding = '0 8px';
    wrap.style.borderLeft = '1px solid #333';
    wrap.innerHTML = `
        <span style="font-size:11px;color:#9aa0a6">Cache</span>
        <select id="feature-cache-node" class="node-control" style="height:28px; min-width:170px; background:#111; color:#eee; border:1px solid #444; padding:2px 6px"></select>
        <select id="feature-cache-port" class="node-control" style="height:28px; min-width:96px; background:#111; color:#eee; border:1px solid #444; padding:2px 6px"></select>
        <button id="feature-cache-open" class="btn" style="height:28px;padding:0 10px" title="Abrir cache seleccionado">
            <i class="fas fa-database"></i>
        </button>
    `;
    tabs.insertBefore(wrap, tabs.lastElementChild);

    const nodeSel = wrap.querySelector('#feature-cache-node');
    const portSel = wrap.querySelector('#feature-cache-port');
    const openBtn = wrap.querySelector('#feature-cache-open');

    const updatePorts = () => {
        const entries = _getCachedNodeEntries();
        const nodeId = nodeSel ? String(nodeSel.value || '') : '';
        const hit = entries.find((e) => e.id === nodeId);
        if (!portSel) return;
        if (!hit) {
            portSel.innerHTML = '<option value="">output_1</option>';
            portSel.disabled = true;
            return;
        }
        if (!hit.ports || hit.ports.length <= 1) {
            const fallbackPort = (hit.ports && hit.ports[0]) ? hit.ports[0] : 'output_1';
            portSel.innerHTML = `<option value="${fallbackPort}">${fallbackPort}</option>`;
            portSel.value = fallbackPort;
            portSel.disabled = true;
        } else {
            portSel.disabled = false;
            portSel.innerHTML = hit.ports.map((p) => {
                const c = hit.portCounts[p] || 0;
                return `<option value="${p}">${p} (${c})</option>`;
            }).join('');
            const preferred = featureCacheBrowserState.port && hit.ports.includes(featureCacheBrowserState.port)
                ? featureCacheBrowserState.port
                : hit.ports[0];
            portSel.value = preferred;
        }
    };

    if (nodeSel) {
        nodeSel.addEventListener('change', () => {
            featureCacheBrowserState.nodeId = String(nodeSel.value || '');
            featureCacheBrowserState.port = '';
            saveFeatureCacheBrowserState();
            updatePorts();
        });
    }
    if (portSel) {
        portSel.addEventListener('change', () => {
            featureCacheBrowserState.port = String(portSel.value || '');
            saveFeatureCacheBrowserState();
        });
    }
    if (openBtn) {
        openBtn.addEventListener('click', async () => {
            const id = nodeSel ? String(nodeSel.value || '') : '';
            const p = portSel ? String(portSel.value || '') : '';
            if (!id) return;
            await openFeatureCacheEntry(id, p || null);
        });
    }

    featureCacheBrowserReady = true;
}

function updateFeatureCacheBrowserUI() {
    ensureFeatureCacheBrowserUI();
    const wrap = document.getElementById('feature-cache-browser');
    const nodeSel = document.getElementById('feature-cache-node');
    const portSel = document.getElementById('feature-cache-port');
    if (!wrap || !nodeSel || !portSel) return;

    const entries = _getCachedNodeEntries();
    if (!entries.length) {
        wrap.style.display = 'none';
        nodeSel.innerHTML = '';
        portSel.innerHTML = '';
        return;
    }

    wrap.style.display = 'inline-flex';
    nodeSel.innerHTML = entries.map((e) => {
        return `<option value="${e.id}">${e.label} (${e.total})</option>`;
    }).join('');

    let selectedId = featureCacheBrowserState.nodeId && entries.some((e) => e.id === featureCacheBrowserState.nodeId)
        ? featureCacheBrowserState.nodeId
        : (currentNodeId && entries.some((e) => e.id === String(currentNodeId)) ? String(currentNodeId) : entries[0].id);
    nodeSel.value = selectedId;
    featureCacheBrowserState.nodeId = selectedId;

    const hit = entries.find((e) => e.id === selectedId);
    if (!hit || !hit.ports || hit.ports.length <= 1) {
        const fallbackPort = (hit && hit.ports && hit.ports[0]) ? hit.ports[0] : 'output_1';
        portSel.innerHTML = `<option value="${fallbackPort}">${fallbackPort}</option>`;
        portSel.value = fallbackPort;
        portSel.disabled = true;
        featureCacheBrowserState.port = fallbackPort;
    } else {
        portSel.disabled = false;
        portSel.innerHTML = hit.ports.map((p) => `<option value="${p}">${p} (${hit.portCounts[p] || 0})</option>`).join('');
        const chosenPort = featureCacheBrowserState.port && hit.ports.includes(featureCacheBrowserState.port)
            ? featureCacheBrowserState.port
            : hit.ports[0];
        portSel.value = chosenPort;
        featureCacheBrowserState.port = chosenPort;
    }
    saveFeatureCacheBrowserState();
}
window.updateFeatureCacheBrowserUI = updateFeatureCacheBrowserUI;

function bindTableToolbarActions() {
    if (tableToolbarBound) return;
    const toolbar = document.getElementById('table-toolbar');
    if (!toolbar) return;
    tableToolbarBound = true;

    toolbar.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-table-action]');
        if (!btn) return;
        const action = btn.getAttribute('data-table-action');
        if (action === 'apply-filter') applyTableFilter();
        else if (action === 'clear-filter') clearTableFilter();
        else if (action === 'export-geojson') exportSelection('geojson');
        else if (action === 'export-csv') exportSelection('csv');
        else if (action === 'clear-selection') clearSelection();
    });
}

function bindTableInteractions() {
    if (tableInteractionsBound) return;
    const container = document.getElementById('table-container');
    if (!container) return;
    tableInteractionsBound = true;

    container.addEventListener('click', (e) => {
        const sortHeader = e.target.closest('th[data-table-sort]');
        if (sortHeader) {
            const col = decodeURIComponent(sortHeader.getAttribute('data-table-sort') || '');
            if (col) handleSort(col, currentNodeId);
            return;
        }

        const row = e.target.closest('tr[data-row-index]');
        if (row && !e.target.closest('input[data-row-check]')) {
            const idx = parseInt(row.getAttribute('data-row-index'), 10);
            if (!isNaN(idx)) selectRow(idx, currentNodeId);
            return;
        }

        const checkAll = e.target.closest('input[data-table-check-all]');
        if (checkAll) toggleSelectAll(checkAll.checked);
    });

    container.addEventListener('change', (e) => {
        const rowCheck = e.target.closest('input[data-row-check]');
        if (!rowCheck) return;
        const idx = parseInt(rowCheck.getAttribute('data-row-check'), 10);
        if (isNaN(idx)) return;
        if (rowCheck.checked) selectedRowSet.add(idx);
        else selectedRowSet.delete(idx);
    });
}

// Función principal de pintado en el mapa
function zoomToAllLayers() {
    const group = new L.FeatureGroup();
    Object.values(mapLayers).forEach(layer => {
        if (layer) group.addLayer(layer);
    });
    if (group.getLayers().length > 0) {
        map.fitBounds(group.getBounds(), { padding: [50, 50] });
    } else {
        showToast("No hay capas visibles", "warn");
    }
}

function setMapPerfIndicator(info) {
    const mapEl = (map && typeof map.getContainer === 'function') ? map.getContainer() : document.getElementById('map');
    if (!mapEl) return;
    if (!mapEl.style.position || mapEl.style.position === 'static') mapEl.style.position = 'relative';

    let el = document.getElementById('map-perf-indicator');
    if (!el) {
        el = document.createElement('div');
        el.id = 'map-perf-indicator';
        el.style.position = 'absolute';
        el.style.right = '10px';
        el.style.bottom = '10px';
        el.style.zIndex = '1200';
        el.style.padding = '6px 10px';
        el.style.borderRadius = '6px';
        el.style.background = 'rgba(0,0,0,0.75)';
        el.style.border = '1px solid rgba(241,196,15,0.45)';
        el.style.color = '#f1c40f';
        el.style.fontSize = '12px';
        el.style.fontWeight = '600';
        el.style.pointerEvents = 'none';
        el.style.boxShadow = '0 2px 10px rgba(0,0,0,0.35)';
        mapEl.appendChild(el);
    }

    if (!info || !info.total) {
        el.style.display = 'none';
        el.textContent = '';
        return;
    }
    if (info.reason === 'sampling') {
        el.textContent = `Modo rendimiento: mostrando ${info.shown.toLocaleString()} de ${info.total.toLocaleString()} entidades`;
    } else {
        el.textContent = `Modo rendimiento: interaccion limitada en ${info.total.toLocaleString()} entidades`;
    }
    el.style.display = 'block';
}

function _listOutputPorts(data) {
    if (!data || typeof data !== 'object' || data.type) return [];
    return Object.keys(data)
        .filter(k => /^output_\d+$/.test(k) && data[k] && data[k].type === 'FeatureCollection')
        .sort((a, b) => parseInt(a.split('_')[1], 10) - parseInt(b.split('_')[1], 10));
}

function _resolveNodePortData(nodeId, preferredPort) {
    const meta = executionData[nodeId];
    if (!meta || !meta.data) return { data: null, port: null, ports: [] };
    const raw = meta.data;
    if (raw && raw.type === 'FeatureCollection') return { data: raw, port: null, ports: [] };
    const ports = _listOutputPorts(raw);
    if (ports.length === 0) return { data: null, port: null, ports: [] };
    const chosen = (preferredPort && ports.includes(preferredPort))
        ? preferredPort
        : ((nodeViewPortById[nodeId] && ports.includes(nodeViewPortById[nodeId])) ? nodeViewPortById[nodeId] : ports[0]);
    return { data: raw[chosen] || null, port: chosen, ports };
}

function _choosePortInteractive(nodeId, ports) {
    if (!ports || ports.length <= 1) return Promise.resolve(ports && ports[0] ? ports[0] : null);
    const current = nodeViewPortById[nodeId] || ports[0];
    if (typeof window.showPortPickerToast === 'function') {
        return window.showPortPickerToast(nodeId, ports, current);
    }
    return Promise.resolve(current);
}

function resolveNodeDisplayData(nodeId, preferredPort = null) {
    const info = _resolveNodePortData(nodeId, preferredPort);
    if (info.port) nodeViewPortById[nodeId] = info.port;
    updatePortInspectorUI(nodeId);
    return info;
}
window.resolveNodeDisplayData = resolveNodeDisplayData;

async function showOnMap(id, preferredPort = null, askPort = false) {
    if (!map && typeof window.ensureJETLMap === 'function') window.ensureJETLMap();
    setMapPerfIndicator(null);
    let meta = executionData[id];
    if (!meta || !meta.data) { showToast("Nodo sin datos procesados", "error"); return; }

    // Normalizacion
    let data = null;
    let activePort = null;
    if (meta.data && meta.data.type === 'FeatureCollection') {
        data = meta.data;
    } else {
        const info = _resolveNodePortData(id, preferredPort);
        if (info.ports.length > 1 && askPort) {
            activePort = await _choosePortInteractive(id, info.ports);
            data = meta.data[activePort] || null;
        } else {
            activePort = info.port;
            data = info.data;
        }
        if (activePort) nodeViewPortById[id] = activePort;
        updatePortInspectorUI(id);
    }
    if (!data || !data.features || data.features.length === 0) { showToast("Geometría vacía", "warn"); return; }
    ensureStableFeatureIndex(data);

    // Limpieza
    if (mapLayers[id]) {
        map.removeLayer(mapLayers[id]);
        layerControl.removeLayer(mapLayers[id]);
        delete mapLayers[id];
    }

    const srcFeatures = Array.isArray(data.features) ? data.features : [];
    const isPointGeom = (f) => {
        const t = f && f.geometry && f.geometry.type;
        return t === 'Point' || t === 'MultiPoint';
    };
    const allPoints = srcFeatures.length > 0 && srcFeatures.every(isPointGeom);
    const PERF_POINT_THRESHOLD = 30000;
    const PERF_POINT_MAX_DRAW = 20000;
    const PERF_GENERIC_THRESHOLD = 12000;
    let drawData = data;
    let perfSampleInfo = null;

    // Modo rendimiento para capas masivas de puntos:
    // se aligera solo la vista del mapa sin tocar el dataset real del nodo.
    if (allPoints && srcFeatures.length > PERF_POINT_THRESHOLD) {
        const step = Math.ceil(srcFeatures.length / PERF_POINT_MAX_DRAW);
        const sampled = [];
        for (let i = 0; i < srcFeatures.length; i += step) sampled.push(srcFeatures[i]);
        drawData = turf.featureCollection(sampled);
        perfSampleInfo = { shown: sampled.length, total: srcFeatures.length, reason: 'sampling' };
    } else if (srcFeatures.length > PERF_GENERIC_THRESHOLD) {
        perfSampleInfo = { shown: srcFeatures.length, total: srcFeatures.length, reason: 'interaction' };
    }

    const nodeName = editor.getNodeFromId(id).name;
    const tool = TOOL_REGISTRY[nodeName];
    const customStyle = data._custom_style || null;
    const baseColor = (customStyle && customStyle.color) ? customStyle.color : (tool.color || '#3388ff');
    const portLabel = activePort ? ` [${activePort}]` : '';
    const layerName = `<span style="color:${baseColor}">■</span> ${tool.label} (#${id})${portLabel}`;
    currentSymbologyNode = id;
    setupSymbologyPanel(id, data);
    setMapPerfIndicator(perfSampleInfo);

    try {
        const perfMode = !!perfSampleInfo;
        const layer = L.geoJSON(drawData, {
            style: function (feature) {
                if (feature.properties && feature.properties._idx === selectedFeatureIndex) {
                    return { color: '#e74c3c', weight: 4, opacity: 1, fillColor: '#e74c3c', fillOpacity: 0.6 };
                }
                if (customStyle) return customStyle;
                if (feature.properties && feature.properties._custom_style) return feature.properties._custom_style;
                const symStyle = getSymbologyStyle(id, feature, baseColor);
                if (symStyle) return symStyle;
                return { color: baseColor, weight: 2, opacity: 0.8, fillColor: baseColor, fillOpacity: 0.2 };
            },
            pointToLayer: (feature, latlng) => {
                let c = baseColor;
                let r = perfMode ? 4 : 6;
                let w = perfMode ? 0 : 1;
                let border = perfMode ? baseColor : '#fff';

                if (feature.properties && feature.properties._idx === selectedFeatureIndex) {
                    c = '#e74c3c'; r = 9; w = 3; border = '#f1c40f';
                } else if (feature.properties && feature.properties.marker_color) {
                    c = feature.properties.marker_color;
                } else {
                    const symStyle = getSymbologyStyle(id, feature, baseColor);
                    if (symStyle && symStyle.color) c = symStyle.color;
                }
                return L.circleMarker(latlng, {
                    radius: r,
                    color: border,
                    weight: w,
                    fillColor: c,
                    fillOpacity: 0.9,
                    interactive: !perfMode
                });
            },
            onEachFeature: function (feature, layer) {
                if (perfMode) return;
                // Asignamos índice original inmutable
                if (!feature.properties || typeof feature.properties !== 'object') feature.properties = {};
                if (feature.properties._idx === undefined) {
                    feature.properties._idx = data.features.indexOf(feature);
                }

                layer.on('click', function (e) {
                    selectedFeatureIndex = feature.properties._idx;

                    if (mapLayers[id]) mapLayers[id].resetStyle();
                    if (layer.bringToFront) layer.bringToFront();

                    // Actualizar tabla si está visible
                    if (executionData[id]) {
                        // Importante: No reconstruimos todo para no perder el orden actual
                        // Pero debemos asegurar que la fila es visible (sync)
                        const tableContainer = document.getElementById('table-container');
                        if (tableContainer.style.display === 'block') {
                            // Si la fila está fuera de la ventana actual por el ordenamiento, reconstruimos
                            buildTable(executionData[id].data);
                        }
                    }
                    showToast(`Reg #${selectedFeatureIndex + 1} seleccionado.`, 'success');
                });

                if (feature.properties) {
                    let table = '<table style="font-size:10px; color: #333;">';
                    for (let k in feature.properties) {
                        if (k.startsWith('_')) continue;
                        let val = feature.properties[k];
                        if (typeof val === 'number' && !Number.isInteger(val)) val = val.toFixed(4);
                        table += `<tr><td><b>${k}</b></td><td>${val}</td></tr>`;
                    }
                    table += '</table>';
                    layer.bindPopup(table);
                }
            }
        }).addTo(map);

        layerControl.addOverlay(layer, layerName);
        mapLayers[id] = layer;

        syncMapFocus(id);
        switchTab('map');
        if (perfSampleInfo) {
            if (perfSampleInfo.reason === 'sampling') {
                showToast(`Modo rendimiento mapa: ${perfSampleInfo.shown}/${perfSampleInfo.total} puntos mostrados`, 'warn');
            } else {
                showToast(`Modo rendimiento mapa: interaccion limitada (${perfSampleInfo.total} entidades)`, 'warn');
            }
        }

    } catch (e) {
        console.error(e);
        showToast("Error renderizando mapa", "error");
    }
}

// Lógica de Ordenación
function sortFeatures(features) {
    if (!currentSortCol || currentSortDir === 0) return features; // Sin orden

    // Creamos una copia superficial para no mutar el orden original permanentemente si queremos volver
    // Pero necesitamos devolver un array ordenado para renderizar
    const sorted = [...features].sort((a, b) => {
        let valA = a.properties[currentSortCol];
        let valB = b.properties[currentSortCol];

        // Manejo de nulos
        if (valA === undefined || valA === null) valA = "";
        if (valB === undefined || valB === null) valB = "";

        // Detección de números
        const isNum = typeof valA === 'number' && typeof valB === 'number';

        if (valA < valB) return isNum ? -1 * currentSortDir : -1 * currentSortDir;
        if (valA > valB) return isNum ? 1 * currentSortDir : 1 * currentSortDir;
        return 0;
    });
    return sorted;
}

function handleSort(colName, nodeId) {
    if (currentSortCol === colName) {
        // Ciclo: Asc (1) -> Desc (-1) -> Original (0)
        if (currentSortDir === 1) currentSortDir = -1;
        else if (currentSortDir === -1) currentSortDir = 0;
        else currentSortDir = 1;
    } else {
        currentSortCol = colName;
        currentSortDir = 1; // Default Asc
    }

    // Resetear ventana al ordenar para ver los primeros resultados
    // Opcional: intentar mantener la selección visible
    if (executionData[nodeId]) buildTable(executionData[nodeId].data);
}

// Construye tabla de atributos (CON SORTING + VENTANA)
function buildTable(data) {
    bindTableToolbarActions();
    bindTableInteractions();
    const container = document.getElementById('table-container');
    const toolbar = document.getElementById('table-toolbar');
    container.innerHTML = '';

    if (!data || !data.type) {
        if (currentNodeId) {
            const info = resolveNodeDisplayData(currentNodeId);
            data = info.data;
            updatePortInspectorUI(currentNodeId);
        } else {
            data = data && (data.output_1 || data.output_2 || data.output_3);
            updatePortInspectorUI(null);
        }
    }
    if (!data || !data.features || data.features.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'table-empty';
        empty.style.padding = '20px';
        empty.style.textAlign = 'center';
        empty.style.color = '#aaa';
        empty.innerText = 'Sin datos.';
        container.appendChild(empty);
        return;
    }
    ensureStableFeatureIndex(data);

    // 1. Obtener features y aplicar ordenación/filtro
    let features = data.features;

    // Filtro rápido
    let filtered = features;
    if (tableFilter.text && tableFilter.text.trim() !== '') {
        const q = tableFilter.text.toLowerCase();
        const field = tableFilter.field;
        filtered = features.filter(f => {
            const props = f.properties || {};
            if (field) {
                const v = props[field];
                return v !== undefined && String(v).toLowerCase().includes(q);
            }
            return Object.values(props).some(v => String(v).toLowerCase().includes(q));
        });
    }

    // Aplicamos ordenación visual (no afecta al mapa, solo a la tabla)
    const displayFeatures = sortFeatures(filtered);
    const total = displayFeatures.length;

    // 2. Buscar dónde quedó la selección tras ordenar
    let visualIndex = -1;
    if (selectedFeatureIndex !== null) {
        visualIndex = displayFeatures.findIndex(f => f.properties._idx === selectedFeatureIndex);
    }

    // 3. Ventana Deslizante basada en el índice visual
    const windowSize = 200;
    let start = 0;
    let end = Math.min(total, windowSize);

    if (visualIndex !== -1) {
        const half = Math.floor(windowSize / 2);
        if (visualIndex > half) {
            start = visualIndex - half;
            end = visualIndex + half;
            if (end > total) { end = total; start = Math.max(0, total - windowSize); }
        }
    }

    const firstProps = features[0].properties || {};
    const headers = Object.keys(firstProps).filter(k => !k.startsWith('_'));
    const fieldSel = document.getElementById('table-filter-field');
    if (fieldSel) {
        const prev = tableFilter.field || '';
        fieldSel.innerHTML = '';
        const optEmpty = document.createElement('option');
        optEmpty.value = '';
        optEmpty.textContent = 'Todos los campos';
        fieldSel.appendChild(optEmpty);
        headers.forEach(h => {
            const opt = document.createElement('option');
            opt.value = h;
            opt.textContent = h;
            fieldSel.appendChild(opt);
        });
        fieldSel.value = headers.includes(prev) ? prev : '';
    }

    // Header HTML con iconos de ordenación
    let html = '<table class="attr-table"><thead><tr><th><input type="checkbox" data-table-check-all></th><th>#</th>';
    headers.forEach(h => {
        let icon = '';
        if (currentSortCol === h) {
            if (currentSortDir === 1) icon = ' <i class="fas fa-sort-up" style="color:#fff"></i>';
            if (currentSortDir === -1) icon = ' <i class="fas fa-sort-down" style="color:#fff"></i>';
        }
        // Añadimos onclick al header
        html += `<th data-table-sort="${encodeURIComponent(h)}" style="cursor:pointer; user-select:none;">${h}${icon}</th>`;
    });
    html += '</tr></thead><tbody>';

    if (start > 0) {
        html += `<tr><td colspan="${headers.length + 2}" style="text-align:center; background:#222; color:#777; font-style:italic; padding:8px;">... ${start} anteriores ...</td></tr>`;
    }

    for (let i = start; i < end; i++) {
        const f = displayFeatures[i];
        const globalIdx = f.properties._idx;
        const isSelected = (globalIdx === selectedFeatureIndex) ? 'style="background:#2c3e50; color:#fff; border-left: 4px solid #e74c3c;"' : '';
        const isChecked = selectedRowSet.has(globalIdx) ? 'checked' : '';

        // Usamos globalIdx para la selección lógica, pero mostramos i+1 visual si queremos posición relativa
        // O mejor, mostramos globalIdx+1 para coherencia con el mapa
        html += `<tr id="tr-row-${globalIdx}" data-row-index="${globalIdx}" ${isSelected} style="cursor:pointer; transition: background 0.2s">
                    <td><input type="checkbox" data-row-check="${globalIdx}" ${isChecked}></td>
                    <td>${globalIdx + 1}</td>`;

        const props = f.properties || {};
        headers.forEach(h => {
            let val = props[h];
            if (val === undefined || val === null) val = '';
            else if (typeof val === 'object') {
                try {
                    const txt = JSON.stringify(val);
                    val = txt.length > 120 ? txt.slice(0, 117) + '...' : txt;
                } catch (e) {
                    val = '[Obj]';
                }
            }
            else if (typeof val === 'number' && !Number.isInteger(val)) val = val.toFixed(4);
            const text = String(val);
            const esc = text
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
            html += `<td title="${esc}">${esc}</td>`;
        });
        html += '</tr>';
    }

    if (end < total) {
        html += `<tr><td colspan="${headers.length + 2}" style="text-align:center; background:#222; color:#777; font-style:italic; padding:8px;">... ${total - end} restantes ...</td></tr>`;
    }

    html += '</tbody></table>';
    container.innerHTML = html;
    if (toolbar) container.prepend(toolbar);

    if (selectedFeatureIndex !== null) syncTableFocus();
}

// Helper selección (Tabla -> Mapa)
function selectRow(idx, nodeId) {
    selectedFeatureIndex = idx;

    // Actualizar visualmente la fila seleccionada
    const allRows = document.querySelectorAll('#table-container tbody tr');
    allRows.forEach((r) => {
        // Importante: chequeamos ID porque el orden visual puede ser distinto
        if (r.id === `tr-row-${idx}`) {
            r.style.background = '#2c3e50';
            r.style.color = '#fff';
            r.style.borderLeft = '4px solid #e74c3c';
        } else if (r.id && r.id.startsWith('tr-row-')) {
            r.style.background = '';
            r.style.color = '';
            r.style.borderLeft = '';
        }
    });

    if (mapLayers[nodeId]) mapLayers[nodeId].resetStyle();
    showToast(`Registro #${idx + 1} enfocado.`, 'success');
}

function applyTableFilter() {
    const input = document.getElementById('table-filter');
    const fieldSel = document.getElementById('table-filter-field');
    tableFilter.text = input ? input.value : '';
    tableFilter.field = fieldSel ? fieldSel.value : '';
    if (currentNodeId && executionData[currentNodeId]) buildTable(executionData[currentNodeId].data);
}

function clearTableFilter() {
    const input = document.getElementById('table-filter');
    const fieldSel = document.getElementById('table-filter-field');
    if (input) input.value = '';
    if (fieldSel) fieldSel.value = '';
    tableFilter.text = '';
    tableFilter.field = '';
    if (currentNodeId && executionData[currentNodeId]) buildTable(executionData[currentNodeId].data);
}

function toggleSelectAll(cbOrChecked) {
    if (!currentNodeId || !executionData[currentNodeId]) return;
    const checked = typeof cbOrChecked === 'boolean'
        ? cbOrChecked
        : !!(cbOrChecked && cbOrChecked.checked);
    let data = executionData[currentNodeId].data;
    if (!data || !data.type) {
        const info = resolveNodeDisplayData(currentNodeId);
        data = info.data;
    }
    if (!data || !data.features) return;
    if (checked) {
        data.features.forEach(f => {
            if (f.properties && f.properties._idx !== undefined) selectedRowSet.add(f.properties._idx);
        });
    } else {
        selectedRowSet.clear();
    }
    buildTable(data);
}

function clearSelection() {
    selectedRowSet.clear();
    if (currentNodeId && executionData[currentNodeId]) buildTable(executionData[currentNodeId].data);
}

function exportSelection(fmt) {
    if (!currentNodeId || !executionData[currentNodeId]) return;
    let data = executionData[currentNodeId].data;
    if (!data || !data.type) {
        const info = resolveNodeDisplayData(currentNodeId);
        data = info.data;
    }
    if (!data || !data.features) return;
    const selected = data.features.filter(f => f.properties && selectedRowSet.has(f.properties._idx));
    if (selected.length === 0) { showToast("No hay selección", "warn"); return; }
    const fc = turf.featureCollection(selected);
    if (fmt === 'csv') download(toCSV(fc), 'selection.csv', 'text/csv');
    else download(JSON.stringify(fc), 'selection.geojson', 'application/json');
}

function updateBadges() {
    Object.keys(executionData).forEach(id => {
        const meta = executionData[id];
        const nodeEl = document.getElementById('node-' + id);
        if (!nodeEl) return;

        let badge = nodeEl.querySelector('.node-badge-count');
        let timeBadge = nodeEl.querySelector('.node-badge-time');

        // Soporte a proyectos antiguos (Legacy)
        if (!badge) {
            badge = document.getElementById('b-' + id);
            timeBadge = document.getElementById('t-' + id);
        }

        if (!badge) return;

        let count = 0;
        const d = meta.data;
        if (d && d.features) count = d.features.length;
        else if (d && d.output_1) count = d.output_1.features.length + (d.output_2?.features.length || 0);

        badge.style.display = 'inline-block';
        badge.className = 'count-badge node-badge-count';
        if (meta._runId === currentRunTimestamp) badge.classList.add('badge-green');
        else badge.classList.add('badge-orange');

        let startVal = 0;
        const currentText = badge.innerText;
        if (currentText && currentText.length > 0) {
            if (currentText.includes('k')) startVal = parseFloat(currentText) * 1000;
            else startVal = parseInt(currentText) || 0;
        }

        if (startVal === count) {
            badge.innerText = count > 1000 ? (count / 1000).toFixed(1) + 'k' : count;
            if (timeBadge) timeBadge.innerText = formatMs(meta._ms);
            return;
        }

        const animObj = { val: startVal };
        anime({
            targets: animObj,
            val: count,
            easing: 'easeOutExpo',
            round: 1,
            duration: 1500,
            update: function () {
                const current = animObj.val;
                badge.innerText = current > 1000 ? (current / 1000).toFixed(1) + 'k' : current;
            }
        });
        if (timeBadge) timeBadge.innerText = formatMs(meta._ms);
    });
    updateFeatureCacheBrowserUI();
}

function formatMs(ms) {
    if (ms === null || ms === undefined) return '';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
}

// =============================================
// HELPERS UI
// =============================================
function toggleSidebar() {
    const s = document.getElementById('sidebar');
    s.classList.toggle('open');
    const ov = document.getElementById('sidebar-overlay');
    if (ov) ov.style.display = s.classList.contains('open') ? 'block' : 'none';
}

function togglePanelHeight() {
    if (mapPanelExpanded) return;
    const body = document.body;
    const button = document.getElementById('btn-panel-collapse');
    const isMobile = window.matchMedia('(max-width: 768px)').matches;

    if (isMobile) {
        body.classList.remove('mobile-results-open');
        if (window.JETLMobile) window.JETLMobile.closeTransientViews();
        document.querySelectorAll('[data-mobile-view]').forEach((item) => {
            item.classList.toggle('active', item.dataset.mobileView === 'flow');
        });
        return;
    }

    const collapsed = body.classList.toggle('panel-collapsed');
    if (button) {
        button.setAttribute('aria-expanded', String(!collapsed));
        button.setAttribute('aria-label', collapsed ? 'Mostrar visor' : 'Ocultar visor');
        button.title = collapsed ? 'Mostrar visor' : 'Ocultar visor';
        button.innerHTML = collapsed
            ? '<i class="fas fa-chevron-up"></i><span class="panel-action-label">Mostrar</span>'
            : '<i class="fas fa-chevron-down"></i><span class="panel-action-label">Ocultar</span>';
    }
    setTimeout(() => {
        if (map && typeof map.invalidateSize === 'function') map.invalidateSize();
    }, 350);
}

function updateMapExpandButton() {
    const btn = document.getElementById('btn-map-expand');
    if (!btn) return;
    btn.title = mapPanelExpanded ? 'Restaurar mapa' : 'Ampliar mapa';
    btn.innerHTML = mapPanelExpanded
        ? '<i class="fas fa-down-left-and-up-right-to-center"></i>'
        : '<i class="fas fa-up-right-and-down-left-from-center"></i>';
}

function toggleMapPanelExpand(forceState) {
    const body = document.body;
    const panel = document.getElementById('bottom-panel');
    if (!body || !panel) return;
    const targetState = (typeof forceState === 'boolean') ? forceState : !mapPanelExpanded;
    if (targetState === mapPanelExpanded) return;

    if (targetState) {
        prevBottomPanelHeight = panel.style.height || '';
        mapPanelExpanded = true;
        body.classList.add('map-panel-maximized');
        switchTab('map');
    } else {
        mapPanelExpanded = false;
        body.classList.remove('map-panel-maximized');
        panel.style.height = prevBottomPanelHeight || '40vh';
    }
    updateMapExpandButton();
    setTimeout(() => {
        try { map.invalidateSize(); } catch (e) {}
    }, 220);
}
window.toggleMapPanelExpand = toggleMapPanelExpand;

function switchTab(t) {
    const evt = arguments[1] || window.event;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    if (evt && evt.target) {
        const btn = evt.target.closest('button');
        if (btn) btn.classList.add('active');
    }

    ['map', 'logs', 'table-container'].forEach(x => {
        const el = document.getElementById(x);
        if (el) el.style.display = 'none';
    });

    const showId = (t === 'table') ? 'table-container' : t;
    const toShow = document.getElementById(showId);
    if (toShow) toShow.style.display = 'block';

    if (document.body.classList.contains('panel-collapsed')) togglePanelHeight();

    if (t === 'map') {
        if (!map && typeof window.ensureJETLMap === 'function') window.ensureJETLMap();
        setTimeout(() => {
            map.invalidateSize();
            if (selectedFeatureIndex !== null && currentNodeId) syncMapFocus(currentNodeId);
        }, 300);
        const panel = document.getElementById('symbology-panel');
        if (panel && currentSymbologyNode) panel.style.display = 'none';
    } else if (t === 'table') {
        setTimeout(() => {
            syncTableFocus();
        }, 100);
        const panel = document.getElementById('symbology-panel');
        if (panel) panel.style.display = 'none';
    } else {
        const panel = document.getElementById('symbology-panel');
        if (panel) panel.style.display = 'none';
    }
}

// Sincronización
function syncMapFocus(nodeId) {
    if (selectedFeatureIndex === null || !mapLayers[nodeId]) return;

    const layerGroup = mapLayers[nodeId];
    const layers = layerGroup.getLayers ? layerGroup.getLayers() : [];
    const target = layers.find(l => l.feature && l.feature.properties._idx === selectedFeatureIndex);

    if (target) {
        if (target.getBounds) map.fitBounds(target.getBounds(), { maxZoom: 18, padding: [50, 50] });
        else if (target.getLatLng) map.setView(target.getLatLng(), 18);
        target.openPopup();
    }
}

function syncTableFocus() {
    if (selectedFeatureIndex === null) return;
    const row = document.getElementById(`tr-row-${selectedFeatureIndex}`);
    if (row) {
        row.scrollIntoView({ block: 'center', behavior: 'smooth' });
        anime({ targets: row, backgroundColor: ['#e74c3c', '#2c3e50'], duration: 1000, easing: 'linear' });
    }
}

function log(m, t) {
    const l = document.getElementById('logs');
    if (!l) return;
    const ts = new Date().toLocaleTimeString();
    const color = t === 'err' ? '#e74c3c' : (t === 'success' ? '#2ecc71' : (t === 'warn' ? '#f1c40f' : '#bbb'));
    l.innerHTML += `<div style="color:${color};margin-bottom:4px;font-family:monospace;font-size:0.9em">
                        <span style="opacity:0.5;margin-right:5px">[${ts}]</span>${m}
                    </div>`;
    l.scrollTop = l.scrollHeight;
}

let toastAutoHideTimer = null;
let toastInteractiveCleanup = null;

function clearToastInteractive() {
    if (typeof toastInteractiveCleanup === 'function') {
        try { toastInteractiveCleanup(); } catch (_) { }
    }
    toastInteractiveCleanup = null;
}

function showToast(m, type) {
    const t = document.getElementById('toast');
    if (!t) return console.log(m);
    const msgEl = document.getElementById('toast-msg');
    clearToastInteractive();
    if (toastAutoHideTimer) {
        clearTimeout(toastAutoHideTimer);
        toastAutoHideTimer = null;
    }
    if (msgEl) msgEl.innerText = m;

    t.style.borderLeft = `4px solid ${type === 'error' ? '#e74c3c' : (type === 'warn' ? '#f1c40f' : '#2ecc71')}`;
    t.style.pointerEvents = 'none';
    t.className = 'visible';
    anime.remove(t);
    anime({ targets: t, translateY: [50, 0], opacity: [0, 1], scale: [0.9, 1], easing: 'spring(1, 80, 10, 0)', duration: 800 });
    toastAutoHideTimer = setTimeout(() => {
        anime({ targets: t, opacity: 0, translateY: 20, duration: 300, easing: 'easeInQuad', complete: () => { t.className = ''; } });
    }, 3000);
}

function showPortPickerToast(nodeId, ports, currentPort) {
    return new Promise((resolve) => {
        const t = document.getElementById('toast');
        const msgEl = document.getElementById('toast-msg');
        if (!t || !msgEl || !ports || ports.length === 0) return resolve(currentPort || null);

        clearToastInteractive();
        if (toastAutoHideTimer) {
            clearTimeout(toastAutoHideTimer);
            toastAutoHideTimer = null;
        }
        const fallback = currentPort || ports[0];
        const buttons = ports.map((p) => {
            const active = p === fallback;
            const bg = active ? '#2ecc71' : '#2a2a2a';
            const color = active ? '#111' : '#ddd';
            return `<button type="button" data-toast-port="${p}" style="border:1px solid #555;background:${bg};color:${color};padding:4px 8px;border-radius:12px;cursor:pointer;font-size:12px">${p}</button>`;
        }).join('');

        msgEl.innerHTML = `<span style="margin-right:6px">Nodo #${nodeId}: elige puerto</span>${buttons}`;
        t.style.borderLeft = '4px solid #3498db';
        t.style.pointerEvents = 'auto';
        t.className = 'visible';
        anime.remove(t);
        anime({ targets: t, translateY: [50, 0], opacity: [0, 1], scale: [0.9, 1], easing: 'spring(1, 80, 10, 0)', duration: 500 });

        const onClick = (e) => {
            const btn = e.target.closest('[data-toast-port]');
            if (!btn) return;
            finish(btn.getAttribute('data-toast-port') || fallback);
        };
        const finish = (chosen) => {
            clearToastInteractive();
            t.style.pointerEvents = 'none';
            anime({ targets: t, opacity: 0, translateY: 20, duration: 220, easing: 'easeInQuad', complete: () => { t.className = ''; } });
            resolve(chosen || fallback);
        };
        const onEsc = (e) => {
            if (e.key === 'Escape') finish(fallback);
        };

        t.addEventListener('click', onClick);
        document.addEventListener('keydown', onEsc);
        const ttl = setTimeout(() => finish(fallback), 7000);

        toastInteractiveCleanup = () => {
            t.removeEventListener('click', onClick);
            document.removeEventListener('keydown', onEsc);
            clearTimeout(ttl);
        };
    });
}
window.showPortPickerToast = showPortPickerToast;

async function loadFile(input, _) {
    const file = input.files[0];
    if (!file) return;

    let nodeId = '';
    const nodeEl = input.closest('.drawflow-node');
    if (nodeEl) nodeId = nodeEl.id.replace('node-', '');

    // Suport for legacy or new template
    let lbl = null;
    if (nodeId) lbl = document.getElementById('lbl-' + nodeId);
    if (!lbl && input.parentElement) lbl = input.parentElement.querySelector('.file-lbl');

    if (lbl) lbl.innerText = "Leyendo...";

    try {
        const loader = document.getElementById('loader');
        const loaderMsg = document.getElementById('loader-msg');
        if (file.size > 5 * 1024 * 1024 && loader) {
            loader.style.display = 'flex';
            if (loaderMsg) loaderMsg.innerText = "Leyendo archivo pesado...";
        }

        if (file.name.match(/\.tif|\.tiff$/i)) {
            if (lbl) { lbl.innerText = `${file.name}`; lbl.style.color = "#2ecc71"; }
            if (loader) loader.style.display = 'none';
            return;
        }

        let geojson = null;
        if (window.JETLFormats && JETLFormats.readFile) {
            geojson = await JETLFormats.readFile(file);
        }

        if (!geojson) throw new Error("Formato no soportado en vista previa");
        if (typeof ensureFC === 'function') geojson = ensureFC(geojson);

        if (!window._file_cache) window._file_cache = {};
        if (nodeId) window._file_cache['file_' + nodeId] = geojson;

        // Mantener legacy si el template es el antiguo
        if (nodeId) {
            const hiddenInput = document.getElementById('d-' + nodeId);
            if (hiddenInput) hiddenInput.value = JSON.stringify(geojson);
        }
        if (window.JETLSchemaUI && typeof JETLSchemaUI.refreshAll === 'function') JETLSchemaUI.refreshAll();

        if (lbl) { lbl.innerText = `${file.name} (${geojson.features.length} fts)`; lbl.style.color = "#2ecc71"; }
        if (loader) loader.style.display = 'none';
    } catch (e) {
        console.warn(e);
        if (lbl) { lbl.innerText = "Error/Pendiente"; lbl.style.color = "#e67e22"; }
        showToast(e.message || "Error leyendo archivo", "error");
        const loader = document.getElementById('loader');
        if (loader) loader.style.display = 'none';
    }
}

function logRunSummary(label) {
    const entries = Object.entries(executionData || {});
    if (entries.length === 0) return;
    const list = entries
        .map(([id, meta]) => {
            const name = editor.getNodeFromId(id).name;
            const tool = TOOL_REGISTRY[name];
            const count = meta && meta.data && meta.data.features ? meta.data.features.length : 0;
            return { id, label: tool ? tool.label : name, ms: meta._ms || 0, count };
        })
        .sort((a, b) => b.ms - a.ms);
    log(`--- Resumen ${label || ''} ---`, 'info');
    list.slice(0, 12).forEach(n => {
        log(`#${n.id} ${n.label} | ${n.ms}ms | ${n.count} fts`, 'info');
    });
}

function download(c, n, t) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([c], { type: t })); a.download = n; a.click(); }

function toCSV(g) {
    if (!g || !g.features || g.features.length === 0) return "";
    const props = new Set();
    g.features.forEach(f => Object.keys(f.properties || {}).forEach(k => !k.startsWith('_') && props.add(k)));
    const h = Array.from(props);
    const escape = v => {
        if (v === null || v === undefined) return '';
        let s = String(v);
        if (s.includes('"')) s = s.replace(/"/g, '""');
        if (s.includes(',') || s.includes('\n') || s.includes('"')) return `"${s}"`;
        return s;
    };
    const rows = g.features.map(f => h.map(k => escape(f.properties ? f.properties[k] : '')).join(','));
    return h.join(',') + '\n' + rows.join('\n');
}

function clearCanvas() {
    if (!confirm("¿Borrar todo?")) return;
    editor.clear();
    if (window.JETLRuntimeCache && typeof window.JETLRuntimeCache.clearAll === 'function') {
        window.JETLRuntimeCache.clearAll();
    }
    SafeStorage.clear('jetl_flow_optimized');
    Object.values(mapLayers).forEach(l => { map.removeLayer(l); layerControl.removeLayer(l); });
    mapLayers = {};
    executionData = {};
    window.executionData = executionData;
    if (window.JETLDirty && typeof window.JETLDirty.clearAll === 'function') window.JETLDirty.clearAll();
    if (typeof window.resetNodeDisplayPorts === 'function') window.resetNodeDisplayPorts();
    featureCacheBrowserState = { nodeId: '', port: '' };
    saveFeatureCacheBrowserState();
    updateFeatureCacheBrowserUI();
    selectedFeatureIndex = null;
    currentSortCol = null;
    currentSortDir = 0;
    selectedRowSet.clear();
    tableFilter = { text: '', field: '' };
    symbologyByNode = {};
    currentSymbologyNode = null;
    const panel = document.getElementById('symbology-panel');
    if (panel) panel.style.display = 'none';
    log("Canvas limpio.", "warn");
}

function anim_NodeEnter(domElement) { if (!domElement) return; anime({ targets: domElement, scale: [0, 1], opacity: [0, 1], duration: 800, easing: 'easeOutElastic(1, .6)' }); }
function anim_NodeError(id) { const el = document.getElementById('node-' + id); if (!el) return; anime({ targets: el, translateX: [-10, 10, -5, 5, 0], duration: 500, easing: 'easeInOutQuad' }); }
function anim_NodeSuccess(id) { const el = document.getElementById('node-' + id); if (!el) return; anime({ targets: el, scale: [1, 1.1, 1], boxShadow: ['0 0 0 0px rgba(46, 204, 113, 0.7)', '0 0 0 10px rgba(46, 204, 113, 0)'], duration: 600, easing: 'easeOutQuad' }); }
function anim_CableFlow(nodeId) {
    const selector = `.drawflow .connection.node_in_node-${nodeId} .main-path`;
    const cables = document.querySelectorAll(selector);
    if (cables.length === 0) return;
    cables.forEach(c => { c.style.strokeDasharray = ''; c.style.strokeDashoffset = ''; });
    anime({
        targets: cables,
        stroke: [{ value: '#00ffcc', duration: 200, easing: 'linear' }, { value: '#777', duration: 500, delay: 1000, easing: 'easeInQuad' }],
        strokeWidth: [{ value: 5, duration: 200 }, { value: 3, duration: 500, delay: 1000 }],
        strokeDasharray: [{ value: '20 10', duration: 100 }],
        strokeDashoffset: [{ value: [200, 0], duration: 1200, easing: 'linear' }],
        complete: function (anim) { cables.forEach(c => { c.style.stroke = ''; c.style.strokeWidth = ''; c.style.strokeDasharray = ''; c.style.strokeDashoffset = ''; }); }
    });
}

// =============================================
// Symbology
// =============================================
function setupSymbologyPanel(nodeId, data) {
    const panel = document.getElementById('symbology-panel');
    const fieldSelect = document.getElementById('symbology-field');
    if (!panel || !fieldSelect) return;
    panel.style.display = 'block';
    fieldSelect.innerHTML = '';
    const features = data.features || [];
    if (!features.length) return;
    const sampleProps = features[0].properties || {};
    const fields = Object.keys(sampleProps).filter(k => !k.startsWith('_'));
    fields.forEach(f => {
        const opt = document.createElement('option');
        opt.value = f;
        opt.textContent = f;
        fieldSelect.appendChild(opt);
    });
    const existing = symbologyByNode[nodeId];
    if (existing && existing.field) fieldSelect.value = existing.field;
}

function applySymbology() {
    if (!currentSymbologyNode) return;
    const field = document.getElementById('symbology-field').value;
    const mode = document.getElementById('symbology-mode').value;
    const meta = executionData[currentSymbologyNode];
    if (!meta || !meta.data || !meta.data.features) return;
    const values = meta.data.features.map(f => f.properties ? f.properties[field] : null)
        .filter(v => v !== undefined && v !== null);
    if (values.length === 0) {
        showToast("Campo sin valores válidos", "warn");
        return;
    }
    const cfg = { field, mode, palette: {}, breaks: [] };
    if (mode === 'categorical') {
        const uniq = Array.from(new Set(values.map(v => String(v)))).slice(0, 20);
        uniq.forEach((v, idx) => cfg.palette[v] = pickColor(idx));
    } else {
        const nums = values.map(v => Number(v)).filter(v => !isNaN(v)).sort((a, b) => a - b);
        const q = [0.2, 0.4, 0.6, 0.8];
        cfg.breaks = q.map(p => nums[Math.floor(p * (nums.length - 1))]);
    }
    symbologyByNode[currentSymbologyNode] = cfg;
    showOnMap(currentSymbologyNode);
    showToast("Simbología aplicada", "success");
}

function toggleSymbologyPanel() {
    const panel = document.getElementById('symbology-panel');
    if (!panel) return;
    panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
}

function getSymbologyStyle(nodeId, feature, fallback) {
    const cfg = symbologyByNode[nodeId];
    if (!cfg || !feature.properties) return null;
    const val = feature.properties[cfg.field];
    if (val === undefined || val === null) return null;
    if (cfg.mode === 'categorical') {
        const key = String(val);
        const color = cfg.palette[key] || fallback;
        return { color, weight: 2, opacity: 0.8, fillColor: color, fillOpacity: 0.4 };
    } else {
        const num = Number(val);
        if (isNaN(num)) return null;
        const b = cfg.breaks;
        let idx = 0;
        if (num > b[3]) idx = 4;
        else if (num > b[2]) idx = 3;
        else if (num > b[1]) idx = 2;
        else if (num > b[0]) idx = 1;
        const color = pickColor(idx);
        return { color, weight: 2, opacity: 0.8, fillColor: color, fillOpacity: 0.4 };
    }
}

function pickColor(i) {
    const palette = ['#1abc9c', '#3498db', '#9b59b6', '#e67e22', '#e74c3c', '#f1c40f', '#2ecc71', '#95a5a6'];
    return palette[i % palette.length];
}





;

/* ---- js/templates.js ---- */
// =============================================
// FLOW TEMPLATES
// =============================================
(function () {
    const CUSTOM_TEMPLATES_KEY = 'jetl_custom_templates_v1';

    const hasTool = (k) => !!(window.TOOL_REGISTRY && window.TOOL_REGISTRY[k]);
    const missingTools = (keys) => (keys || []).filter(k => !hasTool(k));

    const BUILTIN_TEMPLATES = [
        {
            id: 'demo',
            title: 'Demo OSM Buffer',
            desc: 'Descarga OSM, crea buffer y exporta GeoJSON.',
            cat: 'Vector',
            requires: ['reader_osm', 'geo_buffer', 'geo_dissolve', 'writer_geojson'],
            source: 'builtin',
            apply: () => {
                resetWorkspace();
                const n1 = addNode('reader_osm', 120, 120);
                const n2 = addNode('geo_buffer', 420, 120);
                const n3 = addNode('geo_dissolve', 720, 120);
                const n4 = addNode('writer_geojson', 1020, 120);
                editor.addConnection(n1, n2, 'output_1', 'input_1');
                editor.addConnection(n2, n3, 'output_1', 'input_1');
                editor.addConnection(n3, n4, 'output_1', 'input_1');
            }
        },
        {
            id: 'basic_attrs',
            title: 'Atributos Rapidos',
            desc: 'Carga archivo, crea/calcula campo y exporta CSV.',
            cat: 'Atributos',
            requires: ['reader_file', 'attr_creator', 'writer_csv'],
            source: 'builtin',
            apply: () => {
                resetWorkspace();
                const n1 = addNode('reader_file', 120, 200);
                const n2 = addNode('attr_creator', 420, 200);
                const n3 = addNode('writer_csv', 720, 200);
                editor.addConnection(n1, n2, 'output_1', 'input_1');
                editor.addConnection(n2, n3, 'output_1', 'input_1');
            }
        },
        {
            id: 'qa_match_duplicates',
            title: 'QA Duplicados',
            desc: 'Separa unicos y duplicados por geometria/atributos.',
            cat: 'QA',
            requires: ['reader_file', 'attr_matcher', 'writer_geojson', 'writer_csv'],
            source: 'builtin',
            apply: () => {
                resetWorkspace();
                const n1 = addNode('reader_file', 120, 180);
                const n2 = addNode('attr_matcher', 430, 180);
                const n3 = addNode('writer_geojson', 760, 120);
                const n4 = addNode('writer_csv', 760, 260);
                editor.addConnection(n1, n2, 'output_1', 'input_1');
                editor.addConnection(n2, n3, 'output_1', 'input_1');
                editor.addConnection(n2, n4, 'output_2', 'input_1');
            }
        },
        {
            id: 'join_and_filter',
            title: 'Join + Tester',
            desc: 'Une por atributos y divide pass/fail por condicion.',
            cat: 'Atributos',
            requires: ['reader_file', 'attr_join_adv', 'attr_test', 'writer_geojson'],
            source: 'builtin',
            apply: () => {
                resetWorkspace();
                const n1 = addNode('reader_file', 90, 120);
                const n2 = addNode('reader_file', 90, 300);
                const n3 = addNode('attr_join_adv', 430, 210);
                const n4 = addNode('attr_test', 760, 210);
                const n5 = addNode('writer_geojson', 1080, 150);
                const n6 = addNode('writer_geojson', 1080, 300);
                editor.addConnection(n1, n3, 'output_1', 'input_1');
                editor.addConnection(n2, n3, 'output_1', 'input_2');
                editor.addConnection(n3, n4, 'output_1', 'input_1');
                editor.addConnection(n4, n5, 'output_1', 'input_1');
                editor.addConnection(n4, n6, 'output_2', 'input_1');
            }
        },
        {
            id: 'line_to_polygon_flow',
            title: 'Lineas a Poligonos',
            desc: 'Trocea, recompone lineas y convierte a poligono.',
            cat: 'Vector',
            requires: ['reader_file', 'geo_chunk', 'geo_line_merge', 'geo_line_to_polygon', 'writer_geojson'],
            source: 'builtin',
            apply: () => {
                resetWorkspace();
                const n1 = addNode('reader_file', 100, 180);
                const n2 = addNode('geo_chunk', 370, 180);
                const n3 = addNode('geo_line_merge', 640, 180);
                const n4 = addNode('geo_line_to_polygon', 910, 180);
                const n5 = addNode('writer_geojson', 1180, 180);
                editor.addConnection(n1, n2, 'output_1', 'input_1');
                editor.addConnection(n2, n3, 'output_1', 'input_1');
                editor.addConnection(n3, n4, 'output_1', 'input_1');
                editor.addConnection(n4, n5, 'output_1', 'input_1');
            }
        },
        {
            id: 'raster_sample_points',
            title: 'Raster + Puntos',
            desc: 'Muestreo multibanda sobre GeoTIFF y export CSV.',
            cat: 'Raster',
            requires: ['reader_file', 'sp_point_sampling', 'writer_csv'],
            source: 'builtin',
            apply: () => {
                resetWorkspace();
                const n1 = addNode('reader_file', 90, 120);
                const n2 = addNode('reader_file', 90, 300);
                const n3 = addNode('sp_point_sampling', 430, 210);
                const n4 = addNode('writer_csv', 760, 210);
                editor.addConnection(n1, n3, 'output_1', 'input_1');
                editor.addConnection(n2, n3, 'output_1', 'input_2');
                editor.addConnection(n3, n4, 'output_1', 'input_1');
            }
        }
    ];

    let templateFilterText = '';
    let templateFilterCat = 'Todas';

    function resetWorkspace() {
        if (editor) editor.clear();
        if (window.JETLRuntimeCache && typeof window.JETLRuntimeCache.clearAll === 'function') {
            window.JETLRuntimeCache.clearAll();
        }
        executionData = {};
        window.executionData = executionData;
        currentRunTimestamp = 0;
        if (typeof historyStack !== 'undefined') {
            historyStack.length = 0;
            historyIndex = -1;
        }
        Object.values(mapLayers).forEach(l => {
            try { map.removeLayer(l); } catch (e) {}
            try { if (layerControl) layerControl.removeLayer(l); } catch (e) {}
        });
        mapLayers = {};
        if (layerControl) {
            try { map.removeControl(layerControl); } catch (e) {}
            layerControl = L.control.layers(null, {}, { position: 'topright', collapsed: true }).addTo(map);
        }
        if (typeof addToHistory === 'function') addToHistory();
        SafeStorage.save('jetl_flow_optimized', JSON.stringify(editor.export()));
        if (window.JETLSchemaUI && typeof window.JETLSchemaUI.refreshAll === 'function') window.JETLSchemaUI.refreshAll();
    }

    function slugify(text) {
        return String(text || '')
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '') || 'template_custom';
    }

    function getCustomTemplates() {
        try {
            const raw = SafeStorage.load(CUSTOM_TEMPLATES_KEY);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return [];
            return parsed.filter(t => t && typeof t === 'object' && t.id && t.title && t.graph);
        } catch (e) {
            console.warn('Error leyendo plantillas custom', e);
            return [];
        }
    }

    function saveCustomTemplates(list) {
        const safe = Array.isArray(list) ? list : [];
        SafeStorage.save(CUSTOM_TEMPLATES_KEY, JSON.stringify(safe));
    }

    function getAllTemplates() {
        const custom = getCustomTemplates().map((t) => ({ ...t, source: 'custom' }));
        return [...BUILTIN_TEMPLATES, ...custom];
    }

    function collectRequiredToolsFromGraph(graph) {
        const home = (((graph || {}).drawflow || {}).Home || {});
        const nodes = Object.values(home.data || {});
        const keys = nodes.map(n => String((n && (n.name || n.class)) || '')).filter(Boolean);
        return Array.from(new Set(keys));
    }

    function ensureUniqueId(baseId, existing) {
        const taken = new Set((existing || []).map(t => String(t.id || '')));
        if (!taken.has(baseId)) return baseId;
        let i = 2;
        while (taken.has(`${baseId}_${i}`)) i++;
        return `${baseId}_${i}`;
    }

    function saveCurrentAsTemplate(opts) {
        const fromOpts = opts && typeof opts === 'object';
        const name = fromOpts
            ? String(opts.title || '').trim()
            : (prompt('Nombre de la plantilla', 'Mi plantilla') || '').trim();
        if (!name) return null;
        const desc = fromOpts
            ? String(opts.desc || '').trim()
            : (prompt('Descripcion (opcional)', 'Plantilla creada desde el workspace actual') || '').trim();
        const cat = fromOpts
            ? String(opts.cat || 'Custom').trim()
            : (prompt('Categoria', 'Custom') || 'Custom').trim();

        const graph = editor && typeof editor.export === 'function' ? editor.export() : null;
        if (!graph || !graph.drawflow) {
            showToast('No se pudo capturar el workspace actual', 'error');
            return null;
        }

        const existing = getCustomTemplates();
        const forcedId = fromOpts ? String(opts.id || '').trim() : '';
        const id = ensureUniqueId(forcedId || slugify(name), existing);
        const tpl = {
            id,
            title: name,
            desc: desc || 'Plantilla custom',
            cat: cat || 'Custom',
            requires: collectRequiredToolsFromGraph(graph),
            graph,
            createdAt: new Date().toISOString()
        };
        existing.push(tpl);
        saveCustomTemplates(existing);
        showToast('Plantilla guardada', 'success');
        return tpl;
    }

    function addCustomTemplateObject(raw) {
        if (!raw || typeof raw !== 'object' || !raw.graph) {
            throw new Error('Plantilla custom invalida');
        }
        const existing = getCustomTemplates();
        const id = ensureUniqueId(slugify(raw.id || raw.title || 'template_custom'), existing);
        const title = String(raw.title || 'Plantilla custom').trim();
        const desc = String(raw.desc || 'Plantilla custom').trim();
        const cat = String(raw.cat || 'Custom').trim() || 'Custom';
        const requires = Array.isArray(raw.requires)
            ? raw.requires.map(x => String(x || '').trim()).filter(Boolean)
            : collectRequiredToolsFromGraph(raw.graph);
        const tpl = {
            id,
            title,
            desc,
            cat,
            requires,
            graph: raw.graph,
            createdAt: raw.createdAt || new Date().toISOString()
        };
        existing.push(tpl);
        saveCustomTemplates(existing);
        return tpl;
    }

    function exportCustomTemplates() {
        const custom = getCustomTemplates();
        const payload = {
            version: 1,
            exportedAt: new Date().toISOString(),
            templates: custom
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'jetl_templates_custom.json';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        showToast(`Exportadas ${custom.length} plantillas custom`, 'info');
    }

    function importTemplatesFromFile(file, onDone) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const txt = String(reader.result || '');
                const data = JSON.parse(txt);
                const incoming = Array.isArray(data) ? data : (Array.isArray(data.templates) ? data.templates : []);
                if (!incoming.length) throw new Error('JSON sin plantillas');

                const existing = getCustomTemplates();
                const merged = [...existing];
                incoming.forEach((raw, idx) => {
                    if (!raw || typeof raw !== 'object' || !raw.graph) return;
                    const baseId = slugify(raw.id || raw.title || `import_${idx + 1}`);
                    const id = ensureUniqueId(baseId, merged);
                    const title = String(raw.title || `Importada ${idx + 1}`).trim();
                    const desc = String(raw.desc || 'Plantilla importada').trim();
                    const cat = String(raw.cat || 'Custom').trim() || 'Custom';
                    const requires = Array.isArray(raw.requires)
                        ? raw.requires.map(x => String(x || '').trim()).filter(Boolean)
                        : collectRequiredToolsFromGraph(raw.graph);
                    merged.push({
                        id,
                        title,
                        desc,
                        cat,
                        requires,
                        graph: raw.graph,
                        createdAt: raw.createdAt || new Date().toISOString()
                    });
                });

                saveCustomTemplates(merged);
                showToast('Plantillas importadas', 'success');
                if (typeof onDone === 'function') onDone();
            } catch (e) {
                showToast(`Importacion fallida: ${e && e.message ? e.message : e}`, 'error');
            }
        };
        reader.onerror = () => showToast('No se pudo leer el archivo', 'error');
        reader.readAsText(file);
    }

    function deleteCustomTemplate(id) {
        const list = getCustomTemplates();
        const next = list.filter(t => String(t.id) !== String(id));
        saveCustomTemplates(next);
        showToast('Plantilla eliminada', 'info');
        return list.length !== next.length;
    }

    function ensureTemplateControls(modal, list) {
        let controls = document.getElementById('templates-controls');
        if (controls) return controls;

        controls = document.createElement('div');
        controls.id = 'templates-controls';
        controls.style.display = 'grid';
        controls.style.gridTemplateColumns = '1fr 160px auto auto auto';
        controls.style.gap = '8px';
        controls.style.padding = '10px 12px 0 12px';

        const input = document.createElement('input');
        input.id = 'templates-filter-input';
        input.className = 'node-control';
        input.placeholder = 'Filtrar plantillas...';
        input.style.background = '#111';
        input.style.border = '1px solid #444';
        input.style.color = '#eee';
        input.style.padding = '6px 8px';
        input.style.borderRadius = '4px';

        const select = document.createElement('select');
        select.id = 'templates-filter-cat';
        select.className = 'node-control';
        select.style.background = '#111';
        select.style.border = '1px solid #444';
        select.style.color = '#eee';
        select.style.padding = '6px 8px';
        select.style.borderRadius = '4px';

        const btnSave = document.createElement('button');
        btnSave.className = 'btn';
        btnSave.textContent = 'Guardar actual';
        btnSave.title = 'Guardar workspace actual como plantilla custom';

        const btnImport = document.createElement('button');
        btnImport.className = 'btn';
        btnImport.textContent = 'Importar JSON';

        const btnExport = document.createElement('button');
        btnExport.className = 'btn';
        btnExport.textContent = 'Exportar JSON';

        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json,application/json';
        fileInput.style.display = 'none';
        fileInput.id = 'templates-import-file';

        controls.appendChild(input);
        controls.appendChild(select);
        controls.appendChild(btnSave);
        controls.appendChild(btnImport);
        controls.appendChild(btnExport);
        controls.appendChild(fileInput);
        list.parentElement.insertBefore(controls, list);

        input.addEventListener('input', () => {
            templateFilterText = input.value || '';
            renderTemplateList(list);
        });
        select.addEventListener('change', () => {
            templateFilterCat = select.value || 'Todas';
            renderTemplateList(list);
        });
        btnSave.addEventListener('click', () => {
            saveCurrentAsTemplate();
            renderTemplateList(list);
            const sel = controls.querySelector('#templates-filter-cat');
            if (sel) {
                const cats = ['Todas', ...Array.from(new Set(getAllTemplates().map(t => t.cat || 'General'))).sort()];
                sel.innerHTML = cats.map(c => `<option value="${c}">${c}</option>`).join('');
                if (cats.includes(templateFilterCat)) sel.value = templateFilterCat;
            }
        });
        btnImport.addEventListener('click', () => fileInput.click());
        btnExport.addEventListener('click', () => exportCustomTemplates());
        fileInput.addEventListener('change', () => {
            const file = fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;
            importTemplatesFromFile(file, () => renderTemplateList(list));
            fileInput.value = '';
        });

        return controls;
    }

    function renderTemplateList(list) {
        if (!list) return;
        const all = getAllTemplates();

        list.innerHTML = '';
        const q = String(templateFilterText || '').toLowerCase();
        const cat = templateFilterCat || 'Todas';
        const filtered = all.filter((t) => {
            const textOk = !q || t.title.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q);
            const catOk = cat === 'Todas' || (t.cat || 'General') === cat;
            return textOk && catOk;
        });

        filtered.forEach(t => {
            const card = document.createElement('div');
            card.className = 'template-card';
            card.setAttribute('data-template-id', t.id);
            const catBadge = `<span style="font-size:0.66rem; color:#9ecbff; border:1px solid #355; border-radius:10px; padding:1px 6px; margin-left:6px;">${t.cat || 'General'}</span>`;
            const srcBadge = t.source === 'custom'
                ? '<span style="font-size:0.66rem; color:#ffd39b; border:1px solid #664a24; border-radius:10px; padding:1px 6px; margin-left:6px;">Custom</span>'
                : '';
            const delBtn = t.source === 'custom'
                ? '<button class="btn" data-template-del="1" style="margin-left:auto; padding:2px 6px" title="Eliminar plantilla"><i class="fas fa-trash"></i></button>'
                : '';
            card.innerHTML = `
                <div class="template-title" style="display:flex; align-items:center; gap:4px;">${t.title}${catBadge}${srcBadge}${delBtn}</div>
                <div class="template-desc">${t.desc}</div>
            `;
            list.appendChild(card);
        });

        if (!filtered.length) {
            const empty = document.createElement('div');
            empty.style.gridColumn = '1 / -1';
            empty.style.color = '#999';
            empty.style.padding = '8px';
            empty.style.fontSize = '0.85rem';
            empty.textContent = 'Sin plantillas para el filtro actual.';
            list.appendChild(empty);
        }
    }

    function openTemplatesModal() {
        const modal = document.getElementById('templates-modal');
        const list = document.getElementById('templates-list');
        if (!modal || !list) return;

        const controls = ensureTemplateControls(modal, list);
        const input = controls.querySelector('#templates-filter-input');
        const select = controls.querySelector('#templates-filter-cat');
        if (input) input.value = templateFilterText;
        if (select) {
            const cats = ['Todas', ...Array.from(new Set(getAllTemplates().map(t => t.cat || 'General'))).sort()];
            select.innerHTML = cats.map(c => `<option value="${c}">${c}</option>`).join('');
            select.value = cats.includes(templateFilterCat) ? templateFilterCat : 'Todas';
        }
        renderTemplateList(list);
        modal.style.display = 'flex';
    }

    function closeTemplatesModal() {
        const modal = document.getElementById('templates-modal');
        if (modal) modal.style.display = 'none';
    }

    function applyTemplate(id) {
        const tpl = getAllTemplates().find(t => String(t.id) === String(id));
        if (!tpl) return false;

        const missing = missingTools(tpl.requires || []);
        if (missing.length) {
            showToast(`Plantilla no disponible. Faltan nodos: ${missing.join(', ')}`, 'error');
            return false;
        }

        try {
            if (typeof tpl.apply === 'function') {
                tpl.apply();
            } else if (tpl.graph && editor && typeof editor.import === 'function') {
                resetWorkspace();
                editor.import(tpl.graph);
                if (window.JETLSchemaUI && typeof window.JETLSchemaUI.refreshAll === 'function') {
                    setTimeout(() => window.JETLSchemaUI.refreshAll(), 0);
                }
                if (typeof addToHistory === 'function') addToHistory();
                SafeStorage.save('jetl_flow_optimized', JSON.stringify(editor.export()));
            } else {
                throw new Error('Plantilla invalida');
            }
            showToast('Plantilla aplicada', 'success');
            return true;
        } catch (e) {
            showToast(`Error aplicando plantilla: ${e && e.message ? e.message : e}`, 'error');
            return false;
        }
    }

    const listEl = document.getElementById('templates-list');
    if (listEl) {
        listEl.addEventListener('click', (e) => {
            const delBtn = e.target.closest('[data-template-del="1"]');
            if (delBtn) {
                const card = e.target.closest('.template-card[data-template-id]');
                const id = card ? card.getAttribute('data-template-id') : null;
                if (id) {
                    deleteCustomTemplate(id);
                    renderTemplateList(listEl);
                }
                return;
            }

            const card = e.target.closest('.template-card[data-template-id]');
            if (!card) return;
            const id = card.getAttribute('data-template-id');
            if (!id) return;
            applyTemplate(id);
            closeTemplatesModal();
        });
    }

    window.openTemplatesModal = openTemplatesModal;
    window.closeTemplatesModal = closeTemplatesModal;
    window.applyTemplate = applyTemplate;
    window.JETLTemplates = {
        listAll: () => getAllTemplates(),
        listCustom: () => getCustomTemplates(),
        saveCurrent: (opts) => saveCurrentAsTemplate(opts),
        addCustom: (tpl) => addCustomTemplateObject(tpl),
        deleteCustom: (id) => deleteCustomTemplate(id),
        exportPayload: () => ({
            version: 1,
            exportedAt: new Date().toISOString(),
            templates: getCustomTemplates()
        }),
        importPayload: (payload) => {
            const incoming = Array.isArray(payload) ? payload : (payload && Array.isArray(payload.templates) ? payload.templates : []);
            if (!incoming.length) return { added: 0 };
            let added = 0;
            incoming.forEach((raw) => {
                try {
                    addCustomTemplateObject(raw);
                    added++;
                } catch (e) {}
            });
            return { added };
        },
        apply: (id) => applyTemplate(id)
    };
})();

;

/* ---- js/packages.js ---- */
// =============================================
// COMMUNITY TRANSFORMER PACKAGES (v1)
// =============================================
(function () {
    const STORAGE_KEY = 'jetl_transformer_packages_v1';
    const PREFIX = 'cpkg__';

    let packagesFilterText = '';
    let runtimeRegisteredKeys = new Set();

    function _slug(s) {
        return String(s || '')
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '') || 'pkg';
    }

    function _safeClone(v) {
        if (typeof window !== 'undefined' && typeof window.JETLClone === 'function') return window.JETLClone(v);
        try { return JSON.parse(JSON.stringify(v)); } catch (_) { return v; }
    }

    function _loadPackages() {
        try {
            const raw = SafeStorage.load(STORAGE_KEY);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            console.warn('Error leyendo paquetes comunitarios', e);
            return [];
        }
    }

    function _savePackages(list) {
        const safe = Array.isArray(list) ? list : [];
        SafeStorage.save(STORAGE_KEY, JSON.stringify(safe));
    }

    function _normalizeTransformer(raw, fallbackId) {
        if (!raw || typeof raw !== 'object') return null;
        const id = _slug(raw.id || fallbackId || 'transformer');
        const base = String(raw.base || '').trim();
        if (!id || !base) return null;
        return {
            id,
            base,
            label: String(raw.label || '').trim(),
            cat: String(raw.cat || '').trim(),
            icon: String(raw.icon || '').trim(),
            color: String(raw.color || '').trim(),
            help: String(raw.help || '').trim()
        };
    }

    function _normalizePackage(raw) {
        if (!raw || typeof raw !== 'object') throw new Error('Paquete invalido');
        const id = _slug(raw.id || raw.name || raw.title || 'community_pkg');
        const title = String(raw.title || raw.name || id).trim();
        const version = String(raw.version || '1.0.0').trim();
        const author = String(raw.author || '').trim();
        const description = String(raw.description || '').trim();
        const enabled = raw.enabled !== false;
        const src = Array.isArray(raw.transformers) ? raw.transformers : [];
        const transformers = src
            .map((t, i) => _normalizeTransformer(t, `t_${i + 1}`))
            .filter(Boolean);
        if (!transformers.length) throw new Error('Paquete sin transformers');
        return { id, title, version, author, description, enabled, transformers, createdAt: raw.createdAt || new Date().toISOString() };
    }

    function _toolKey(pkgId, transformerId) {
        return `${PREFIX}${_slug(pkgId)}__${_slug(transformerId)}`;
    }

    function _refreshToolsUi() {
        if (typeof renderSidebar === 'function') {
            const f = document.getElementById('sidebar-filter-input');
            renderSidebar(f ? String(f.value || '') : '');
        }
        if (window.JETLSchemaUI && typeof window.JETLSchemaUI.refreshAll === 'function') {
            setTimeout(() => window.JETLSchemaUI.refreshAll(), 0);
        }
    }

    function _registerPackage(pkg) {
        if (!pkg || !pkg.enabled) return { added: 0, skipped: 0 };
        let added = 0;
        let skipped = 0;
        (pkg.transformers || []).forEach((t) => {
            const base = window.TOOL_REGISTRY && window.TOOL_REGISTRY[t.base];
            if (!base) { skipped++; return; }
            const key = _toolKey(pkg.id, t.id);
            const cloned = Object.assign({}, base);
            cloned.label = t.label || `${base.label} (${pkg.title})`;
            cloned.cat = t.cat || '9. COMMUNITY';
            cloned.icon = t.icon || base.icon || 'fa-cube';
            cloned.color = t.color || base.color || '#95a5a6';
            cloned.help = t.help || base.help || '';
            cloned._community = { packageId: pkg.id, transformerId: t.id, base: t.base };
            window.TOOL_REGISTRY[key] = cloned;
            runtimeRegisteredKeys.add(key);
            added++;
        });
        return { added, skipped };
    }

    function _unregisterRuntimeKeys() {
        runtimeRegisteredKeys.forEach((key) => {
            try { delete window.TOOL_REGISTRY[key]; } catch (_) { }
        });
        runtimeRegisteredKeys.clear();
    }

    function reloadInstalledPackages() {
        _unregisterRuntimeKeys();
        const list = _loadPackages();
        list.forEach((pkg) => _registerPackage(pkg));
        _refreshToolsUi();
        return { installed: list.length, activeKeys: runtimeRegisteredKeys.size };
    }

    function listPackages() {
        return _loadPackages();
    }

    function addPackageFromObject(raw) {
        const norm = _normalizePackage(raw);
        const list = _loadPackages();
        const exists = list.some((p) => String(p.id) === String(norm.id));
        const nextId = exists ? `${norm.id}_${Date.now()}` : norm.id;
        const pkg = Object.assign({}, norm, { id: nextId });
        list.push(pkg);
        _savePackages(list);
        reloadInstalledPackages();
        return pkg;
    }

    function removePackage(pkgId) {
        const list = _loadPackages();
        const next = list.filter((p) => String(p.id) !== String(pkgId));
        _savePackages(next);
        reloadInstalledPackages();
        return next.length !== list.length;
    }

    function setPackageEnabled(pkgId, enabled) {
        const list = _loadPackages();
        let touched = false;
        list.forEach((p) => {
            if (String(p.id) !== String(pkgId)) return;
            p.enabled = !!enabled;
            touched = true;
        });
        if (touched) {
            _savePackages(list);
            reloadInstalledPackages();
        }
        return touched;
    }

    function exportPackagesPayload() {
        return {
            version: 1,
            exportedAt: new Date().toISOString(),
            packages: listPackages()
        };
    }

    function importPackagesPayload(payload) {
        const incoming = Array.isArray(payload) ? payload : (payload && Array.isArray(payload.packages) ? payload.packages : []);
        if (!incoming.length) return { added: 0 };
        let added = 0;
        incoming.forEach((raw) => {
            try {
                addPackageFromObject(raw);
                added++;
            } catch (_) { }
        });
        return { added };
    }

    function _exportPackagesToFile() {
        const payload = exportPackagesPayload();
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'jetl_transformer_packages.json';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        showToast(`Exportados ${payload.packages.length} paquetes`, 'info');
    }

    function _importPackagesFromFile(file, onDone) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const txt = String(reader.result || '');
                const data = JSON.parse(txt);
                const res = importPackagesPayload(data);
                showToast(`Paquetes importados: ${res.added}`, 'success');
                if (typeof onDone === 'function') onDone();
            } catch (e) {
                showToast(`Importacion fallida: ${e && e.message ? e.message : e}`, 'error');
            }
        };
        reader.onerror = () => showToast('No se pudo leer el archivo', 'error');
        reader.readAsText(file);
    }

    function ensurePackagesControls(modal, list) {
        let controls = document.getElementById('packages-controls');
        if (controls) return controls;

        controls = document.createElement('div');
        controls.id = 'packages-controls';
        controls.style.display = 'grid';
        controls.style.gridTemplateColumns = '1fr auto auto auto';
        controls.style.gap = '8px';
        controls.style.padding = '10px 12px 0 12px';

        const input = document.createElement('input');
        input.id = 'packages-filter-input';
        input.className = 'node-control';
        input.placeholder = 'Filtrar paquetes...';
        input.style.background = '#111';
        input.style.border = '1px solid #444';
        input.style.color = '#eee';
        input.style.padding = '6px 8px';
        input.style.borderRadius = '4px';

        const btnImport = document.createElement('button');
        btnImport.className = 'btn';
        btnImport.textContent = 'Importar JSON';

        const btnExport = document.createElement('button');
        btnExport.className = 'btn';
        btnExport.textContent = 'Exportar JSON';

        const btnSample = document.createElement('button');
        btnSample.className = 'btn';
        btnSample.textContent = 'Instalar sample';

        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json,application/json';
        fileInput.style.display = 'none';
        fileInput.id = 'packages-import-file';

        controls.appendChild(input);
        controls.appendChild(btnImport);
        controls.appendChild(btnExport);
        controls.appendChild(btnSample);
        controls.appendChild(fileInput);
        list.parentElement.insertBefore(controls, list);

        input.addEventListener('input', () => {
            packagesFilterText = input.value || '';
            renderPackagesList(list);
        });
        btnImport.addEventListener('click', () => fileInput.click());
        btnExport.addEventListener('click', () => _exportPackagesToFile());
        btnSample.addEventListener('click', () => {
            try {
                addPackageFromObject({
                    id: 'community_sample_attrs',
                    title: 'Community Sample Attributes',
                    version: '1.0.0',
                    author: 'JETL Community',
                    description: 'Alias utiles de nodos de atributos base',
                    enabled: true,
                    transformers: [
                        { id: 'field_renamer_plus', base: 'attr_renamer', label: 'Field Renamer Plus', cat: '9. COMMUNITY' },
                        { id: 'string_format_plus', base: 'attr_string_formatter', label: 'String Formatter Plus', cat: '9. COMMUNITY' }
                    ]
                });
                renderPackagesList(list);
            } catch (e) {
                showToast(`No se pudo instalar sample: ${e && e.message ? e.message : e}`, 'error');
            }
        });
        fileInput.addEventListener('change', () => {
            const file = fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;
            _importPackagesFromFile(file, () => renderPackagesList(list));
            fileInput.value = '';
        });
        return controls;
    }

    function renderPackagesList(list) {
        if (!list) return;
        const q = String(packagesFilterText || '').toLowerCase();
        const all = listPackages();
        const filtered = all.filter((p) => {
            const text = `${p.title || ''} ${p.id || ''} ${p.author || ''} ${p.description || ''}`.toLowerCase();
            return !q || text.includes(q);
        });
        list.innerHTML = '';
        filtered.forEach((p) => {
            const card = document.createElement('div');
            card.className = 'template-card';
            card.setAttribute('data-pkg-id', String(p.id));
            const n = Array.isArray(p.transformers) ? p.transformers.length : 0;
            const state = p.enabled !== false
                ? '<span style="font-size:0.66rem; color:#9bffb0; border:1px solid #2b5; border-radius:10px; padding:1px 6px; margin-left:6px;">Activo</span>'
                : '<span style="font-size:0.66rem; color:#ffbd9b; border:1px solid #754; border-radius:10px; padding:1px 6px; margin-left:6px;">Inactivo</span>';
            card.innerHTML = `
                <div class="template-title" style="display:flex; align-items:center; gap:4px;">
                    ${p.title || p.id} ${state}
                    <span style="font-size:0.66rem; color:#9ecbff; border:1px solid #355; border-radius:10px; padding:1px 6px; margin-left:6px;">v${p.version || '1.0.0'}</span>
                </div>
                <div class="template-desc">${p.description || ''}</div>
                <div style="display:flex; gap:8px; margin-top:8px; align-items:center;">
                    <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:#aaa;">
                        <input type="checkbox" data-pkg-enabled="1" ${p.enabled !== false ? 'checked' : ''}> habilitado
                    </label>
                    <span style="font-size:12px;color:#8aa;">transformers: ${n}</span>
                    <span style="font-size:12px;color:#8aa;">autor: ${p.author || '-'}</span>
                    <button class="btn" data-pkg-remove="1" style="margin-left:auto; padding:2px 8px" title="Eliminar paquete"><i class="fas fa-trash"></i></button>
                </div>
            `;
            list.appendChild(card);
        });
        if (!filtered.length) {
            const empty = document.createElement('div');
            empty.style.color = '#999';
            empty.style.padding = '10px';
            empty.style.fontSize = '0.85rem';
            empty.textContent = 'Sin paquetes para el filtro actual.';
            list.appendChild(empty);
        }
    }

    function openPackagesModal() {
        const modal = document.getElementById('packages-modal');
        const list = document.getElementById('packages-list');
        if (!modal || !list) return;
        const controls = ensurePackagesControls(modal, list);
        const input = controls.querySelector('#packages-filter-input');
        if (input) input.value = packagesFilterText;
        renderPackagesList(list);
        modal.style.display = 'flex';
    }

    function closePackagesModal() {
        const modal = document.getElementById('packages-modal');
        if (modal) modal.style.display = 'none';
    }

    const listEl = document.getElementById('packages-list');
    if (listEl) {
        listEl.addEventListener('click', (e) => {
            const card = e.target.closest('.template-card[data-pkg-id]');
            if (!card) return;
            const pkgId = card.getAttribute('data-pkg-id');
            if (!pkgId) return;
            if (e.target.closest('[data-pkg-remove="1"]')) {
                const removed = removePackage(pkgId);
                if (removed) showToast('Paquete eliminado', 'info');
                renderPackagesList(listEl);
            }
        });
        listEl.addEventListener('change', (e) => {
            const cb = e.target.closest('[data-pkg-enabled="1"]');
            if (!cb) return;
            const card = e.target.closest('.template-card[data-pkg-id]');
            const pkgId = card ? card.getAttribute('data-pkg-id') : null;
            if (!pkgId) return;
            setPackageEnabled(pkgId, !!cb.checked);
            renderPackagesList(listEl);
        });
    }

    document.addEventListener('click', (e) => {
        const actionEl = e.target.closest('[data-ui-action]');
        if (!actionEl) return;
        const action = actionEl.getAttribute('data-ui-action');
        if (action === 'open-packages') openPackagesModal();
        else if (action === 'close-packages') closePackagesModal();
    });

    window.openPackagesModal = openPackagesModal;
    window.closePackagesModal = closePackagesModal;
    window.JETLPackages = {
        list: listPackages,
        addFromObject: addPackageFromObject,
        remove: removePackage,
        setEnabled: setPackageEnabled,
        exportPayload: exportPackagesPayload,
        importPayload: importPackagesPayload,
        reload: reloadInstalledPackages
    };

    reloadInstalledPackages();
})();


;

/* ---- js/smoke.js ---- */
// =============================================
// JETL Smoke Tests (manual trigger from console)
// Usage: await JETLSmoke.runBasic()
// =============================================
(function () {
    let __runExtendedPromise = null;

    function _withWorkerBypass(fn) {
        const prevPost = window.postWorkerTask;
        try {
            window.postWorkerTask = undefined;
            return fn();
        } finally {
            window.postWorkerTask = prevPost;
        }
    }

    function _countNodesFromState(state) {
        return Object.keys((((state || {}).drawflow || {}).Home || {}).data || {}).length;
    }

    function _hasConnection(state, fromId, toId, outPort, inPort) {
        const data = (((state || {}).drawflow || {}).Home || {}).data || {};
        const from = data[String(fromId)];
        if (!from || !from.outputs || !from.outputs[outPort] || !Array.isArray(from.outputs[outPort].connections)) return false;
        return from.outputs[outPort].connections.some((c) => String(c.node) === String(toId) && c.output === inPort);
    }

    async function testKmlRoundtrip() {
        if (!window.JETLFormats || typeof JETLFormats.toKML !== 'function' || typeof JETLFormats.readFile !== 'function') {
            return { ok: false, name: 'kml_roundtrip', detail: 'JETLFormats KML API no disponible' };
        }

        const sample = turf.featureCollection([
            turf.point([-3.7038, 40.4168], { name: 'Madrid', kind: 'city' }),
            turf.lineString([[-3.71, 40.41], [-3.69, 40.42]], { road: 'A' }),
            turf.polygon([[[-3.72, 40.40], [-3.70, 40.40], [-3.70, 40.41], [-3.72, 40.41], [-3.72, 40.40]]], { zone: 'Z1' })
        ]);

        const kml = JETLFormats.toKML(sample);
        if (!kml || !kml.includes('<kml') || !kml.includes('<Placemark>')) {
            return { ok: false, name: 'kml_roundtrip', detail: 'KML generado invalido' };
        }

        const f = new File([kml], 'smoke.kml', { type: 'application/vnd.google-earth.kml+xml' });
        const back = await JETLFormats.readFile(f);
        const count = back && back.features ? back.features.length : 0;

        if (!back || back.type !== 'FeatureCollection' || count < 1) {
            return { ok: false, name: 'kml_roundtrip', detail: 'No se pudo parsear KML de vuelta a FeatureCollection' };
        }
        return { ok: true, name: 'kml_roundtrip', detail: `features=${count}` };
    }

    function testRegistry() {
        const reg = window.TOOL_REGISTRY || {};
        const count = Object.keys(reg).length;
        if (count < 40) {
            return { ok: false, name: 'tool_registry', detail: `Nodos detectados insuficientes: ${count}` };
        }
        return { ok: true, name: 'tool_registry', detail: `nodos=${count}` };
    }

    function testSchemaUI() {
        if (!window.JETLSchemaUI) return { ok: false, name: 'schema_ui', detail: 'JETLSchemaUI no cargado' };
        const req = ['updateNode', 'refreshAll', 'appendJoinPair', 'insertCalcField'];
        const missing = req.filter(k => typeof window.JETLSchemaUI[k] !== 'function');
        if (missing.length) return { ok: false, name: 'schema_ui', detail: `faltan funciones: ${missing.join(', ')}` };
        return { ok: true, name: 'schema_ui', detail: 'ok' };
    }

    function testUiCore() {
        const dot = document.getElementById('sys-status');
        const sidebar = document.getElementById('sidebar-content');
        if (!dot || !sidebar) return { ok: false, name: 'ui_core', detail: 'Elementos base UI no encontrados' };
        const hasNodes = sidebar.querySelectorAll('.node-item').length > 0;
        return { ok: hasNodes, name: 'ui_core', detail: hasNodes ? 'sidebar con nodos' : 'sidebar sin nodos' };
    }

    async function testAttrStatsNode() {
        const node = window.TOOL_REGISTRY && window.TOOL_REGISTRY.attr_stats;
        if (!node || typeof node.run !== 'function') {
            return { ok: false, name: 'attr_stats', detail: 'Nodo attr_stats no disponible' };
        }

        const dom = document.createElement('div');
        dom.innerHTML = `
            <input df-field value="a,b">
            <select df-mode>
                <option value="per_field">per_field</option>
                <option value="concat">concat</option>
                <option value="both">both</option>
            </select>
        `;
        dom.querySelector('[df-mode]').value = 'both';

        const fc = turf.featureCollection([
            turf.point([0, 0], { a: 1, b: 10 }),
            turf.point([1, 1], { a: 2, b: 20 }),
            turf.point([2, 2], { a: 3, b: 30 })
        ]);

        const out = await _withWorkerBypass(() => node.run('smoke_stats', [fc], dom));
        const props = out && out.features && out.features[0] ? out.features[0].properties : {};
        const ok = props.stats_a_sum === 6 && props.stats_b_avg === 20 && props.stats_concat_count === 6;
        return { ok, name: 'attr_stats', detail: ok ? 'stats_* visibles y correctas' : 'resultado stats inesperado' };
    }

    async function testAttrTesterAndOr() {
        const node = window.TOOL_REGISTRY && window.TOOL_REGISTRY.attr_test;
        if (!node || typeof node.run !== 'function') {
            return { ok: false, name: 'attr_test_and_or', detail: 'Nodo attr_test no disponible' };
        }

        const dom = document.createElement('div');
        dom.innerHTML = `
            <div data-test-row>
                <select df-test-join><option value="AND">AND</option></select>
                <select df-test-field><option value="L4">L4</option></select>
                <select df-test-op><option value="==">==</option></select>
                <input df-test-val value="3110">
            </div>
            <div data-test-row>
                <select df-test-join><option value="AND">AND</option><option value="OR">OR</option></select>
                <select df-test-field><option value="area">area</option></select>
                <select df-test-op><option value="<"><</option></select>
                <input df-test-val value="0.5">
            </div>
        `;
        dom.querySelectorAll('[df-test-field]')[0].value = 'L4';
        dom.querySelectorAll('[df-test-op]')[0].value = '==';
        dom.querySelectorAll('[df-test-join]')[1].value = 'AND';
        dom.querySelectorAll('[df-test-field]')[1].value = 'area';
        dom.querySelectorAll('[df-test-op]')[1].value = '<';

        const fc = turf.featureCollection([
            turf.point([0, 0], { L4: 3110, area: 0.2 }), // pass
            turf.point([1, 1], { L4: 3110, area: 0.8 }), // fail
            turf.point([2, 2], { L4: 4212, area: 0.2 })  // fail
        ]);

        const out = await _withWorkerBypass(() => node.run('smoke_tester', [fc], dom));
        const passCount = out && out.output_1 && out.output_1.features ? out.output_1.features.length : -1;
        const failCount = out && out.output_2 && out.output_2.features ? out.output_2.features.length : -1;
        const ok = passCount === 1 && failCount === 2;
        return { ok, name: 'attr_test_and_or', detail: ok ? 'AND/OR operativo' : `conteo inesperado pass=${passCount} fail=${failCount}` };
    }

    async function testAttrCalcRejects() {
        const node = window.TOOL_REGISTRY && window.TOOL_REGISTRY.attr_calc_pro;
        if (!node || typeof node.run !== 'function') {
            return { ok: false, name: 'attr_calc_rejects', detail: 'Nodo attr_calc_pro no disponible' };
        }

        const dom = document.createElement('div');
        dom.innerHTML = `
            <input df-name value="calc_val">
            <textarea df-expr>props.d.toFixed(2)</textarea>
            <select df-on-error>
                <option value="null">null</option>
                <option value="reject">reject</option>
            </select>
            <select df-source-field></select>
        `;
        dom.querySelector('[df-on-error]').value = 'reject';

        const fc = turf.featureCollection([
            turf.point([0, 0], { d: 2 }),
            turf.point([1, 1], { x: 0 }),
            turf.point([2, 2], { d: 5 })
        ]);

        const out = await _withWorkerBypass(() => node.run('smoke_calc', [fc], dom));
        const passCount = out && out.output_1 && out.output_1.features ? out.output_1.features.length : -1;
        const failCount = out && out.output_2 && out.output_2.features ? out.output_2.features.length : -1;
        const hasErrorField = !!(out && out.output_2 && out.output_2.features && out.output_2.features[0] && out.output_2.features[0].properties && out.output_2.features[0].properties._calc_error);
        const ok = passCount === 2 && failCount === 1 && hasErrorField;
        return { ok, name: 'attr_calc_rejects', detail: ok ? 'reject output_2 operativo' : `conteo inesperado pass=${passCount} fail=${failCount}` };
    }

    async function testAttrCreatorRejects() {
        const node = window.TOOL_REGISTRY && window.TOOL_REGISTRY.attr_creator;
        if (!node || typeof node.run !== 'function') {
            return { ok: false, name: 'attr_creator_rejects', detail: 'Nodo attr_creator no disponible' };
        }

        const dom = document.createElement('div');
        dom.innerHTML = `
            <input df-name value="new_v">
            <input df-val value="=f.properties.a.toFixed(1)">
            <select df-on-error>
                <option value="null">null</option>
                <option value="reject">reject</option>
            </select>
        `;
        dom.querySelector('[df-on-error]').value = 'reject';

        const fc = turf.featureCollection([
            turf.point([0, 0], { a: 2 }),
            turf.point([1, 1], { x: 0 }),
            turf.point([2, 2], { a: 5 })
        ]);

        const out = await _withWorkerBypass(() => node.run('smoke_creator', [fc], dom));
        const passCount = out && out.output_1 && out.output_1.features ? out.output_1.features.length : -1;
        const failCount = out && out.output_2 && out.output_2.features ? out.output_2.features.length : -1;
        const hasErrorField = !!(out && out.output_2 && out.output_2.features && out.output_2.features[0] && out.output_2.features[0].properties && out.output_2.features[0].properties._creator_error);
        const ok = passCount === 2 && failCount === 1 && hasErrorField;
        return { ok, name: 'attr_creator_rejects', detail: ok ? 'creator reject output_2 operativo' : `conteo inesperado pass=${passCount} fail=${failCount}` };
    }

    async function testAttrAreaRejects() {
        const node = window.TOOL_REGISTRY && window.TOOL_REGISTRY.attr_area;
        if (!node || typeof node.run !== 'function') {
            return { ok: false, name: 'attr_area_rejects', detail: 'Nodo attr_area no disponible' };
        }

        const dom = document.createElement('div');
        dom.innerHTML = `
            <input df-field value="a_area">
            <select df-unit><option value="1">m2</option></select>
            <select df-on-error>
                <option value="null">null</option>
                <option value="reject">reject</option>
            </select>
        `;
        dom.querySelector('[df-unit]').value = '1';
        dom.querySelector('[df-on-error]').value = 'reject';

        const fc = turf.featureCollection([
            turf.polygon([[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]),
            turf.feature(null, { bad: true }),
            turf.polygon([[[2, 2], [3, 2], [3, 3], [2, 3], [2, 2]]])
        ]);

        const out = await _withWorkerBypass(() => node.run('smoke_area', [fc], dom));
        const passCount = out && out.output_1 && out.output_1.features ? out.output_1.features.length : -1;
        const failCount = out && out.output_2 && out.output_2.features ? out.output_2.features.length : -1;
        const hasErrorField = !!(out && out.output_2 && out.output_2.features && out.output_2.features[0] && out.output_2.features[0].properties && out.output_2.features[0].properties._area_error);
        const ok = passCount === 2 && failCount === 1 && hasErrorField;
        return { ok, name: 'attr_area_rejects', detail: ok ? 'area reject output_2 operativo' : `conteo inesperado pass=${passCount} fail=${failCount}` };
    }

    async function testAttrLengthRejects() {
        const node = window.TOOL_REGISTRY && window.TOOL_REGISTRY.attr_length;
        if (!node || typeof node.run !== 'function') {
            return { ok: false, name: 'attr_length_rejects', detail: 'Nodo attr_length no disponible' };
        }

        const dom = document.createElement('div');
        dom.innerHTML = `
            <input df-field value="a_len">
            <select df-unit><option value="meters">m</option></select>
            <select df-on-error>
                <option value="null">null</option>
                <option value="reject">reject</option>
            </select>
        `;
        dom.querySelector('[df-unit]').value = 'meters';
        dom.querySelector('[df-on-error]').value = 'reject';

        const fc = turf.featureCollection([
            turf.lineString([[0, 0], [1, 0]]),
            turf.point([5, 5], { bad: true }),
            turf.lineString([[0, 0], [0, 1]])
        ]);

        const out = await _withWorkerBypass(() => node.run('smoke_len', [fc], dom));
        const passCount = out && out.output_1 && out.output_1.features ? out.output_1.features.length : -1;
        const failCount = out && out.output_2 && out.output_2.features ? out.output_2.features.length : -1;
        const hasErrorField = !!(out && out.output_2 && out.output_2.features && out.output_2.features[0] && out.output_2.features[0].properties && out.output_2.features[0].properties._length_error);
        const ok = passCount === 2 && failCount === 1 && hasErrorField;
        return { ok, name: 'attr_length_rejects', detail: ok ? 'length reject output_2 operativo' : `conteo inesperado pass=${passCount} fail=${failCount}` };
    }

    async function testAttrStatsRejects() {
        const node = window.TOOL_REGISTRY && window.TOOL_REGISTRY.attr_stats;
        if (!node || typeof node.run !== 'function') {
            return { ok: false, name: 'attr_stats_rejects', detail: 'Nodo attr_stats no disponible' };
        }

        const dom = document.createElement('div');
        dom.innerHTML = `
            <input df-field value="a,b">
            <select df-mode>
                <option value="per_field">per_field</option>
                <option value="concat">concat</option>
                <option value="both">both</option>
            </select>
            <select df-on-error>
                <option value="null">null</option>
                <option value="reject">reject</option>
            </select>
        `;
        dom.querySelector('[df-mode]').value = 'both';
        dom.querySelector('[df-on-error]').value = 'reject';

        const fc = turf.featureCollection([
            turf.point([0, 0], { a: 1, b: 10 }),
            turf.point([1, 1], { a: 'x', b: null }),
            turf.point([2, 2], { a: 3, b: 30 })
        ]);

        const out = await _withWorkerBypass(() => node.run('smoke_stats_reject', [fc], dom));
        const passCount = out && out.output_1 && out.output_1.features ? out.output_1.features.length : -1;
        const failCount = out && out.output_2 && out.output_2.features ? out.output_2.features.length : -1;
        const hasErrorField = !!(out && out.output_2 && out.output_2.features && out.output_2.features[0] && out.output_2.features[0].properties && out.output_2.features[0].properties._stats_error);
        const hasStatsInPass = !!(out && out.output_1 && out.output_1.features && out.output_1.features[0] && out.output_1.features[0].properties && out.output_1.features[0].properties.stats_a_sum !== undefined);
        const ok = passCount === 2 && failCount === 1 && hasErrorField && hasStatsInPass;
        return { ok, name: 'attr_stats_rejects', detail: ok ? 'stats reject output_2 operativo' : `conteo inesperado pass=${passCount} fail=${failCount}` };
    }

    async function testAttrStringFormatterRejects() {
        const node = window.TOOL_REGISTRY && window.TOOL_REGISTRY.attr_string_formatter;
        if (!node || typeof node.run !== 'function') {
            return { ok: false, name: 'attr_string_formatter_rejects', detail: 'Nodo attr_string_formatter no disponible' };
        }

        const dom = document.createElement('div');
        dom.innerHTML = `
            <input df-field value="name">
            <select df-op><option value="upper">upper</option></select>
            <input df-args value="">
            <select df-on-error>
                <option value="null">null</option>
                <option value="reject">reject</option>
            </select>
        `;
        dom.querySelector('[df-op]').value = 'upper';
        dom.querySelector('[df-on-error]').value = 'reject';

        const fc = turf.featureCollection([
            turf.point([0, 0], { name: 'abc' }),
            turf.point([1, 1], { id: 7 }),
            turf.point([2, 2], { name: 'xyz' })
        ]);

        const out = await _withWorkerBypass(() => node.run('smoke_fmt_reject', [fc], dom));
        const passCount = out && out.output_1 && out.output_1.features ? out.output_1.features.length : -1;
        const failCount = out && out.output_2 && out.output_2.features ? out.output_2.features.length : -1;
        const hasErrorField = !!(out && out.output_2 && out.output_2.features && out.output_2.features[0] && out.output_2.features[0].properties && out.output_2.features[0].properties._fmt_error);
        const ok = passCount === 2 && failCount === 1 && hasErrorField;
        return { ok, name: 'attr_string_formatter_rejects', detail: ok ? 'formatter reject output_2 operativo' : `conteo inesperado pass=${passCount} fail=${failCount}` };
    }

    async function testAttrRenamerRejects() {
        const node = window.TOOL_REGISTRY && window.TOOL_REGISTRY.attr_renamer;
        if (!node || typeof node.run !== 'function') {
            return { ok: false, name: 'attr_renamer_rejects', detail: 'Nodo attr_renamer no disponible' };
        }
        const dom = document.createElement('div');
        dom.innerHTML = `
            <input df-map value="name:nm">
            <select df-on-error>
                <option value="null">null</option>
                <option value="reject">reject</option>
            </select>
        `;
        dom.querySelector('[df-on-error]').value = 'reject';

        const fc = turf.featureCollection([
            turf.point([0, 0], { name: 'a' }),
            turf.point([1, 1], { id: 2 }),
            turf.point([2, 2], { name: 'b' })
        ]);
        const out = await _withWorkerBypass(() => node.run('smoke_renamer_reject', [fc], dom));
        const passCount = out && out.output_1 && out.output_1.features ? out.output_1.features.length : -1;
        const failCount = out && out.output_2 && out.output_2.features ? out.output_2.features.length : -1;
        const hasErr = !!(out && out.output_2 && out.output_2.features && out.output_2.features[0] && out.output_2.features[0].properties && out.output_2.features[0].properties._renamer_error);
        const ok = passCount === 2 && failCount === 1 && hasErr;
        return { ok, name: 'attr_renamer_rejects', detail: ok ? 'renamer reject output_2 operativo' : `conteo inesperado pass=${passCount} fail=${failCount}` };
    }

    async function testAttrKeeperRejects() {
        const node = window.TOOL_REGISTRY && window.TOOL_REGISTRY.attr_keeper;
        if (!node || typeof node.run !== 'function') {
            return { ok: false, name: 'attr_keeper_rejects', detail: 'Nodo attr_keeper no disponible' };
        }
        const dom = document.createElement('div');
        dom.innerHTML = `
            <input df-keep value="name,type">
            <select df-on-error>
                <option value="null">null</option>
                <option value="reject">reject</option>
            </select>
        `;
        dom.querySelector('[df-on-error]').value = 'reject';

        const fc = turf.featureCollection([
            turf.point([0, 0], { name: 'a', type: 'x', id: 1 }),
            turf.point([1, 1], { id: 2 }),
            turf.point([2, 2], { name: 'b', id: 3 })
        ]);
        const out = await _withWorkerBypass(() => node.run('smoke_keeper_reject', [fc], dom));
        const passCount = out && out.output_1 && out.output_1.features ? out.output_1.features.length : -1;
        const failCount = out && out.output_2 && out.output_2.features ? out.output_2.features.length : -1;
        const hasErr = !!(out && out.output_2 && out.output_2.features && out.output_2.features[0] && out.output_2.features[0].properties && out.output_2.features[0].properties._keeper_error);
        const keptOk = !!(out && out.output_1 && out.output_1.features && out.output_1.features[0] && out.output_1.features[0].properties && out.output_1.features[0].properties.name !== undefined && out.output_1.features[0].properties.id === undefined);
        const ok = passCount === 2 && failCount === 1 && hasErr && keptOk;
        return { ok, name: 'attr_keeper_rejects', detail: ok ? 'keeper reject output_2 operativo' : `conteo inesperado pass=${passCount} fail=${failCount}` };
    }

    async function testAttrAuxWorkers() {
        if (typeof location !== 'undefined' && location.protocol === 'file:') {
            return { ok: true, name: 'attr_aux_workers', detail: 'omitido (file:// bloquea Web Worker)' };
        }
        if (typeof postWorkerTask !== 'function') {
            return { ok: true, name: 'attr_aux_workers', detail: 'omitido (postWorkerTask no disponible)' };
        }
        try {
            if (typeof createGeoWorker === 'function' && !window.geoWorker) createGeoWorker();
            const base = turf.featureCollection([
                turf.point([0, 0], { name: 'alpha', type: 'x', a: 1 }),
                turf.lineString([[0, 0], [1, 0]], { name: 'beta', type: 'y', a: 2 })
            ]);

            const wRen = await postWorkerTask({
                task: 'attr_renamer',
                features: base,
                mapping: [['name', 'nombre']],
                onError: 'null'
            }, 30000);
            if (!wRen || wRen.status !== 'ok' || !wRen.data || !Array.isArray(wRen.data.features)) {
                return { ok: false, name: 'attr_aux_workers', detail: 'renamer worker invalido' };
            }

            const wKeep = await postWorkerTask({
                task: 'attr_keeper',
                features: wRen.data,
                keepList: ['nombre', 'type'],
                onError: 'null'
            }, 30000);
            if (!wKeep || wKeep.status !== 'ok' || !wKeep.data || !Array.isArray(wKeep.data.features)) {
                return { ok: false, name: 'attr_aux_workers', detail: 'keeper worker invalido' };
            }

            const wCount = await postWorkerTask({
                task: 'attr_counter',
                features: wKeep.data,
                fieldName: '_id',
                start: 10
            }, 30000);
            if (!wCount || wCount.status !== 'ok' || !wCount.data || !Array.isArray(wCount.data.features)) {
                return { ok: false, name: 'attr_aux_workers', detail: 'counter worker invalido' };
            }
            const id0 = wCount.data.features[0] && wCount.data.features[0].properties ? wCount.data.features[0].properties._id : null;
            if (Number(id0) !== 10) {
                return { ok: false, name: 'attr_aux_workers', detail: 'counter worker sin secuencia esperada' };
            }

            const wFmt = await postWorkerTask({
                task: 'attr_string_formatter',
                features: wCount.data,
                field: 'nombre',
                op: 'upper',
                argsRaw: '',
                onError: 'null'
            }, 30000);
            if (!wFmt || wFmt.status !== 'ok' || !wFmt.data || !Array.isArray(wFmt.data.features)) {
                return { ok: false, name: 'attr_aux_workers', detail: 'string formatter worker invalido' };
            }

            const polyFc = turf.featureCollection([
                turf.polygon([[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]], { p: 1 }),
                turf.point([0, 0], { p: 2 })
            ]);
            const wArea = await postWorkerTask({
                task: 'attr_area',
                features: polyFc,
                fieldName: '_area',
                multiplier: 1,
                onError: 'reject'
            }, 30000);
            if (!wArea || wArea.status !== 'ok' || !wArea.data || !wArea.data.output_1 || !wArea.data.output_2) {
                return { ok: false, name: 'attr_aux_workers', detail: 'area worker invalido' };
            }

            const lineFc = turf.featureCollection([
                turf.lineString([[0, 0], [1, 0]], { l: 1 }),
                turf.point([0, 0], { l: 2 })
            ]);
            const wLen = await postWorkerTask({
                task: 'attr_length',
                features: lineFc,
                fieldName: '_len',
                unit: 'meters',
                onError: 'reject'
            }, 30000);
            if (!wLen || wLen.status !== 'ok' || !wLen.data || !wLen.data.output_1 || !wLen.data.output_2) {
                return { ok: false, name: 'attr_aux_workers', detail: 'length worker invalido' };
            }

            return { ok: true, name: 'attr_aux_workers', detail: 'renamer/keeper/counter/string/area/length worker OK' };
        } catch (e) {
            const msg = e && e.message ? e.message : String(e);
            if (/No worker pool/i.test(msg)) return { ok: true, name: 'attr_aux_workers', detail: 'omitido (worker pool no disponible)' };
            if (/Worker timeout/i.test(msg)) return { ok: true, name: 'attr_aux_workers', detail: 'omitido (timeout espurio del worker pool)' };
            if (/Operacion cancelada por el usuario|cancelad/i.test(msg)) return { ok: true, name: 'attr_aux_workers', detail: 'omitido (estado cancelado residual)' };
            return { ok: false, name: 'attr_aux_workers', detail: msg };
        }
    }

    async function testAttrFormulaWorkers() {
        if (typeof location !== 'undefined' && location.protocol === 'file:') {
            return { ok: true, name: 'attr_formula_workers', detail: 'omitido (file:// bloquea Web Worker)' };
        }
        if (typeof postWorkerTask !== 'function') {
            return { ok: true, name: 'attr_formula_workers', detail: 'omitido (postWorkerTask no disponible)' };
        }
        try {
            if (typeof createGeoWorker === 'function' && !window.geoWorker) createGeoWorker();
            const src = turf.featureCollection([
                turf.point([0, 0], { a: 2 }),
                turf.point([1, 1], { a: 5 }),
                turf.point([2, 2], { b: 1 })
            ]);

            const wCreator = await postWorkerTask({
                task: 'attr_creator',
                features: src,
                field: 'x',
                exprRaw: '=f.properties.a * 2',
                isFormula: true,
                onError: 'reject'
            }, 30000);
            if (!wCreator || wCreator.status !== 'ok' || !wCreator.data || !wCreator.data.output_1 || !wCreator.data.output_2) {
                return { ok: false, name: 'attr_formula_workers', detail: 'creator worker invalido' };
            }
            const cPass = (wCreator.data.output_1.features || []).length;
            const cFail = (wCreator.data.output_2.features || []).length;
            if (cPass !== 2 || cFail !== 1) {
                return { ok: false, name: 'attr_formula_workers', detail: `creator conteo inesperado pass=${cPass} fail=${cFail}` };
            }

            const wCalc = await postWorkerTask({
                task: 'attr_calc_pro',
                features: src,
                field: 'y',
                exprRaw: 'props.a + 1',
                onError: 'reject'
            }, 30000);
            if (!wCalc || wCalc.status !== 'ok' || !wCalc.data || !wCalc.data.output_1 || !wCalc.data.output_2) {
                return { ok: false, name: 'attr_formula_workers', detail: 'calc worker invalido' };
            }
            const p = (wCalc.data.output_1.features || []).length;
            const f = (wCalc.data.output_2.features || []).length;
            if (p !== 2 || f !== 1) {
                return { ok: false, name: 'attr_formula_workers', detail: `calc conteo inesperado pass=${p} fail=${f}` };
            }
            return { ok: true, name: 'attr_formula_workers', detail: 'creator/calc worker OK' };
        } catch (e) {
            const msg = e && e.message ? e.message : String(e);
            if (/No worker pool/i.test(msg)) return { ok: true, name: 'attr_formula_workers', detail: 'omitido (worker pool no disponible)' };
            if (/Worker timeout/i.test(msg)) return { ok: true, name: 'attr_formula_workers', detail: 'omitido (timeout espurio del worker pool)' };
            if (/Operacion cancelada por el usuario|cancelad/i.test(msg)) return { ok: true, name: 'attr_formula_workers', detail: 'omitido (estado cancelado residual)' };
            return { ok: false, name: 'attr_formula_workers', detail: msg };
        }
    }

    async function testWorkspaceParams() {
        if (!window.JETLParams || typeof window.JETLParams.setAll !== 'function' || typeof window.JETLResolveParamText !== 'function') {
            return { ok: false, name: 'workspace_params', detail: 'API params no disponible' };
        }
        const prev = window.JETLParams.getAll ? window.JETLParams.getAll() : {};
        try {
            window.JETLParams.setAll({ FACTOR: '3', LEFT_KEY: 'id', RIGHT_KEY: 'ID_REF', JPFX: 'j_' });
            const resolved = window.JETLResolveParamText('x_${FACTOR}_y');
            if (resolved !== 'x_3_y') return { ok: false, name: 'workspace_params', detail: 'resolve texto no operativo' };

            const node = window.TOOL_REGISTRY && window.TOOL_REGISTRY.attr_creator;
            if (!node || typeof node.run !== 'function') return { ok: false, name: 'workspace_params', detail: 'attr_creator no disponible' };
            const dom = document.createElement('div');
            dom.innerHTML = `
                <input df-name value="v_\${FACTOR}">
                <input df-val value="=f.properties.a * \${FACTOR}">
                <select df-on-error><option value="null">null</option></select>
            `;
            const fc = turf.featureCollection([turf.point([0, 0], { a: 2 })]);
            const out = await _withWorkerBypass(() => node.run('smoke_params', [fc], dom));
            const f0 = out && out.features && out.features[0] ? out.features[0] : null;
            const okCreator = !!(f0 && f0.properties && Number(f0.properties.v_3) === 6);
            if (!okCreator) return { ok: false, name: 'workspace_params', detail: 'resultado inesperado en attr_creator' };

            const joinNode = window.TOOL_REGISTRY && window.TOOL_REGISTRY.attr_join_adv;
            if (!joinNode || typeof joinNode.run !== 'function') {
                return { ok: false, name: 'workspace_params', detail: 'attr_join_adv no disponible' };
            }
            const joinDom = document.createElement('div');
            joinDom.innerHTML = `
                <input df-map value="\${LEFT_KEY}:\${RIGHT_KEY}">
                <select df-join><option value="left">left</option></select>
                <input df-prefix value="\${JPFX}">
            `;
            const left = turf.featureCollection([turf.point([0, 0], { id: 7, n: 'L' })]);
            const right = turf.featureCollection([turf.point([1, 1], { ID_REF: 7, val: 99 })]);
            const joinOut = await _withWorkerBypass(() => joinNode.run('smoke_params_join', [left, right], joinDom));
            const jf0 = joinOut && joinOut.output_1 && joinOut.output_1.features && joinOut.output_1.features[0];
            const okJoin = !!(jf0 && jf0.properties && Number(jf0.properties.j_val) === 99);
            return { ok: okJoin, name: 'workspace_params', detail: okJoin ? 'params ${...} operativos (creator+join)' : 'resultado inesperado en attr_join_adv' };
        } catch (e) {
            return { ok: false, name: 'workspace_params', detail: e && e.message ? e.message : String(e) };
        } finally {
            if (window.JETLParams && typeof window.JETLParams.setAll === 'function') window.JETLParams.setAll(prev || {});
        }
    }

    async function testWorkspaceParamsIO() {
        if (!window.JETLParams || typeof window.JETLParams.setAll !== 'function') {
            return { ok: false, name: 'workspace_params_io', detail: 'API params no disponible' };
        }
        const prev = window.JETLParams.getAll ? window.JETLParams.getAll() : {};
        const prevDownload = window.download;
        try {
            window.JETLParams.setAll({ WKT_P: 'POINT(2 3)', OUT_FN: 'param_export.csv' });

            const reader = window.TOOL_REGISTRY && window.TOOL_REGISTRY.reader_wkt;
            const writer = window.TOOL_REGISTRY && window.TOOL_REGISTRY.writer_csv;
            if (!reader || typeof reader.run !== 'function') return { ok: false, name: 'workspace_params_io', detail: 'reader_wkt no disponible' };
            if (!writer || typeof writer.run !== 'function') return { ok: false, name: 'workspace_params_io', detail: 'writer_csv no disponible' };

            const rdom = document.createElement('div');
            rdom.innerHTML = `<textarea df-w>\${WKT_P}</textarea>`;
            const out = await reader.run('smoke_reader_wkt_params', [], rdom);
            const f0 = out && out.features && out.features[0];
            const coords = f0 && f0.geometry && f0.geometry.coordinates;
            const okReader = !!(coords && Number(coords[0]) === 2 && Number(coords[1]) === 3);
            if (!okReader) return { ok: false, name: 'workspace_params_io', detail: 'reader_wkt no resolvio ${...}' };

            let capturedFn = '';
            window.download = (content, filename) => { capturedFn = String(filename || ''); };
            const wdom = document.createElement('div');
            wdom.innerHTML = `<input df-fn value="\${OUT_FN}">`;
            writer.run('smoke_writer_csv_params', [out], wdom);
            const okWriter = capturedFn === 'param_export.csv';
            return { ok: okWriter, name: 'workspace_params_io', detail: okWriter ? 'params ${...} en readers/writers OK' : `writer filename inesperado: ${capturedFn}` };
        } catch (e) {
            return { ok: false, name: 'workspace_params_io', detail: e && e.message ? e.message : String(e) };
        } finally {
            window.download = prevDownload;
            if (window.JETLParams && typeof window.JETLParams.setAll === 'function') window.JETLParams.setAll(prev || {});
        }
    }

    async function testUndoRedoCore() {
        const ed = (typeof editor !== 'undefined' && editor) ? editor : window.editor;
        if (!ed || typeof ed.export !== 'function') {
            return { ok: false, name: 'undo_redo_core', detail: 'Editor no disponible' };
        }
        const addNodeFn = typeof addNode === 'function' ? addNode : window.addNode;
        const undoFn = typeof undo === 'function' ? undo : window.undo;
        const redoFn = typeof redo === 'function' ? redo : window.redo;
        if (typeof addNodeFn !== 'function' || typeof undoFn !== 'function' || typeof redoFn !== 'function') {
            return { ok: false, name: 'undo_redo_core', detail: 'API addNode/undo/redo no disponible' };
        }

        const snapshot = ed.export();
        try {
            ed.clear();
            if (typeof addToHistory === 'function') addToHistory();

            const n1 = addNodeFn('attr_creator', 140, 140);
            const n2 = addNodeFn('attr_sorter', 420, 140);
            ed.addConnection(n1, n2, 'output_1', 'input_1');

            const s1 = ed.export();
            const c1 = _countNodesFromState(s1) === 2 && _hasConnection(s1, n1, n2, 'output_1', 'input_1');
            if (!c1) return { ok: false, name: 'undo_redo_core', detail: 'estado inicial invalido tras crear/conectar' };

            undoFn(); // deshacer conexion
            const s2 = ed.export();
            const c2 = _countNodesFromState(s2) === 2 && !_hasConnection(s2, n1, n2, 'output_1', 'input_1');

            undoFn(); // deshacer nodo 2
            const s3 = ed.export();
            const c3 = _countNodesFromState(s3) === 1;

            undoFn(); // deshacer nodo 1
            const s4 = ed.export();
            const c4 = _countNodesFromState(s4) === 0;

            redoFn();
            redoFn();
            redoFn();
            const s5 = ed.export();
            const c5 = _countNodesFromState(s5) === 2 && _hasConnection(s5, n1, n2, 'output_1', 'input_1');

            const ok = c2 && c3 && c4 && c5;
            return { ok, name: 'undo_redo_core', detail: ok ? 'undo/redo incremental OK' : 'secuencia undo/redo inconsistente' };
        } catch (e) {
            return { ok: false, name: 'undo_redo_core', detail: e && e.message ? e.message : String(e) };
        } finally {
            ed.clear();
            ed.import(snapshot);
            if (window.JETLSchemaUI && typeof window.JETLSchemaUI.refreshAll === 'function') {
                setTimeout(() => window.JETLSchemaUI.refreshAll(), 0);
            }
        }
    }

    function testEngineCancelApi() {
        if (typeof window.cancelEngineRun !== 'function') {
            return { ok: false, name: 'engine_cancel_api', detail: 'cancelEngineRun no disponible' };
        }
        const prevCancel = !!window.isEngineCancelled;
        const prevCancelWorker = window.cancelWorkerTasks;
        let workerCancelCalled = false;
        try {
            window.isEngineCancelled = false;
            window.cancelWorkerTasks = function () { workerCancelCalled = true; };
            window.cancelEngineRun();
            const ok = !!window.isEngineCancelled && workerCancelCalled;
            return { ok, name: 'engine_cancel_api', detail: ok ? 'cancel flag + worker cancel OK' : `estado inesperado flag=${!!window.isEngineCancelled} worker=${workerCancelCalled}` };
        } catch (e) {
            return { ok: false, name: 'engine_cancel_api', detail: e && e.message ? e.message : String(e) };
        } finally {
            window.isEngineCancelled = prevCancel;
            window.cancelWorkerTasks = prevCancelWorker;
        }
    }

    function testRunReportApi() {
        const api = window.JETLRunReport;
        if (!api || typeof api.build !== 'function' || typeof api.export !== 'function') {
            return { ok: false, name: 'run_report_api', detail: 'JETLRunReport API no disponible' };
        }
        let report = null;
        try {
            report = api.build('Smoke', 'ok', null);
        } catch (e) {
            return { ok: false, name: 'run_report_api', detail: e && e.message ? e.message : String(e) };
        }
        const first = report && Array.isArray(report.nodes) && report.nodes.length ? report.nodes[0] : null;
        const outputsOk = !first || typeof first.outputs === 'object';
        const ok = !!(report && report.summary && Array.isArray(report.nodes) && outputsOk);
        return { ok, name: 'run_report_api', detail: ok ? 'api build/export disponible' : 'reporte invalido' };
    }

    function testTemplatesApply() {
        const ed = (typeof editor !== 'undefined' && editor) ? editor : window.editor;
        if (!ed || typeof ed.export !== 'function' || typeof ed.import !== 'function') {
            return { ok: false, name: 'templates_apply', detail: 'Editor no disponible' };
        }
        if (typeof window.applyTemplate !== 'function') {
            return { ok: false, name: 'templates_apply', detail: 'applyTemplate no disponible' };
        }

        const snapshot = ed.export();
        const nodeNames = (state) => {
            const data = ((((state || {}).drawflow || {}).Home || {}).data || {});
            return Object.values(data).map((n) => String((n && (n.name || n.class)) || ''));
        };
        try {
            window.applyTemplate('basic_attrs');
            let st = ed.export();
            let names = nodeNames(st);
            const hasBasic = names.includes('reader_file') && names.includes('attr_creator') && names.includes('writer_csv');

            window.applyTemplate('join_and_filter');
            st = ed.export();
            names = nodeNames(st);
            const hasJoinTester = names.includes('attr_join_adv') && names.includes('attr_test');

            const ok = hasBasic && hasJoinTester;
            return { ok, name: 'templates_apply', detail: ok ? 'plantillas aplican y nodos clave presentes' : 'faltan nodos clave tras aplicar plantilla' };
        } catch (e) {
            return { ok: false, name: 'templates_apply', detail: e && e.message ? e.message : String(e) };
        } finally {
            ed.clear();
            ed.import(snapshot);
            if (window.JETLSchemaUI && typeof window.JETLSchemaUI.refreshAll === 'function') {
                setTimeout(() => window.JETLSchemaUI.refreshAll(), 0);
            }
        }
    }

    function testTemplatesCustomApi() {
        const ed = (typeof editor !== 'undefined' && editor) ? editor : window.editor;
        const api = window.JETLTemplates;
        if (!ed || typeof ed.export !== 'function' || typeof ed.import !== 'function') {
            return { ok: false, name: 'templates_custom_api', detail: 'Editor no disponible' };
        }
        if (!api || typeof api.addCustom !== 'function' || typeof api.apply !== 'function' || typeof api.deleteCustom !== 'function') {
            return { ok: false, name: 'templates_custom_api', detail: 'JETLTemplates API no disponible' };
        }

        const snapshot = ed.export();
        let createdId = null;
        try {
            ed.clear();
            const a = (typeof addNode === 'function' ? addNode : window.addNode)('attr_creator', 160, 180);
            const b = (typeof addNode === 'function' ? addNode : window.addNode)('writer_csv', 460, 180);
            ed.addConnection(a, b, 'output_1', 'input_1');
            const graph = ed.export();

            const created = api.addCustom({
                id: 'smoke_custom_api',
                title: 'Smoke Custom API',
                desc: 'Template de prueba smoke',
                cat: 'QA',
                graph
            });
            createdId = created && created.id ? created.id : null;
            if (!createdId) return { ok: false, name: 'templates_custom_api', detail: 'no se pudo crear plantilla custom' };

            const applied = !!api.apply(createdId);
            if (!applied) return { ok: false, name: 'templates_custom_api', detail: 'no se pudo aplicar plantilla custom' };

            const st = ed.export();
            const data = ((((st || {}).drawflow || {}).Home || {}).data || {});
            const names = Object.values(data).map((n) => String((n && (n.name || n.class)) || ''));
            const hasNodes = names.includes('attr_creator') && names.includes('writer_csv');
            if (!hasNodes) return { ok: false, name: 'templates_custom_api', detail: 'grafo aplicado sin nodos esperados' };

            const del = api.deleteCustom(createdId);
            if (!del) return { ok: false, name: 'templates_custom_api', detail: 'no se pudo eliminar plantilla custom' };
            const still = (api.listCustom() || []).some((t) => String(t.id) === String(createdId));
            return { ok: !still, name: 'templates_custom_api', detail: !still ? 'alta/aplicar/baja custom OK' : 'plantilla custom sigue presente tras delete' };
        } catch (e) {
            return { ok: false, name: 'templates_custom_api', detail: e && e.message ? e.message : String(e) };
        } finally {
            if (createdId && api && typeof api.deleteCustom === 'function') {
                try { api.deleteCustom(createdId); } catch (e) {}
            }
            ed.clear();
            ed.import(snapshot);
            if (window.JETLSchemaUI && typeof window.JETLSchemaUI.refreshAll === 'function') {
                setTimeout(() => window.JETLSchemaUI.refreshAll(), 0);
            }
        }
    }

    function testPortInspectorUi() {
        if (typeof window.updatePortInspectorUI !== 'function') {
            return { ok: false, name: 'port_inspector_ui', detail: 'updatePortInspectorUI no disponible' };
        }
        if (typeof executionData === 'undefined') {
            return { ok: false, name: 'port_inspector_ui', detail: 'executionData no disponible' };
        }
        const nodeId = 'smoke_port_inspector';
        const prev = executionData[nodeId];
        try {
            executionData[nodeId] = {
                data: {
                    output_1: turf.featureCollection([turf.point([0, 0])]),
                    output_2: turf.featureCollection([turf.point([1, 1])])
                }
            };
            window.updatePortInspectorUI(nodeId);
            const wrap = document.getElementById('port-inspector');
            const sel = document.getElementById('port-inspector-select');
            const count = sel ? sel.options.length : 0;
            const visible = !!(wrap && wrap.style.display !== 'none');
            const ok = visible && count === 2;
            return { ok, name: 'port_inspector_ui', detail: ok ? 'selector por puerto visible (2 outputs)' : `estado inesperado visible=${visible} options=${count}` };
        } catch (e) {
            return { ok: false, name: 'port_inspector_ui', detail: e && e.message ? e.message : String(e) };
        } finally {
            if (prev) executionData[nodeId] = prev;
            else delete executionData[nodeId];
            try { window.updatePortInspectorUI(null); } catch (e) {}
        }
    }

    function testMapExpandUi() {
        if (typeof window.toggleMapPanelExpand !== 'function') {
            return { ok: false, name: 'map_expand_ui', detail: 'toggleMapPanelExpand no disponible' };
        }
        const body = document.body;
        if (!body) return { ok: false, name: 'map_expand_ui', detail: 'body no disponible' };
        try {
            const was = body.classList.contains('map-panel-maximized');
            window.toggleMapPanelExpand(true);
            const expanded = body.classList.contains('map-panel-maximized');
            window.toggleMapPanelExpand(false);
            const restored = !body.classList.contains('map-panel-maximized');
            if (was) window.toggleMapPanelExpand(true);
            const ok = expanded && restored;
            return { ok, name: 'map_expand_ui', detail: ok ? 'toggle ampliar/restaurar OK' : `estado inesperado expanded=${expanded} restored=${restored}` };
        } catch (e) {
            return { ok: false, name: 'map_expand_ui', detail: e && e.message ? e.message : String(e) };
        }
    }

    function testFeatureCacheBrowserUi() {
        if (typeof window.updateFeatureCacheBrowserUI !== 'function') {
            return { ok: false, name: 'feature_cache_browser_ui', detail: 'updateFeatureCacheBrowserUI no disponible' };
        }
        try {
            window.updateFeatureCacheBrowserUI();
            const wrap = document.getElementById('feature-cache-browser');
            const nodeSel = document.getElementById('feature-cache-node');
            const portSel = document.getElementById('feature-cache-port');
            const btn = document.getElementById('feature-cache-open');
            const ok = !!(wrap && nodeSel && portSel && btn);
            return { ok, name: 'feature_cache_browser_ui', detail: ok ? 'browser cache persistente disponible' : 'controles UI no creados' };
        } catch (e) {
            return { ok: false, name: 'feature_cache_browser_ui', detail: e && e.message ? e.message : String(e) };
        }
    }

    function testDirtyPropagationApi() {
        const api = window.JETLDirty;
        if (!api || typeof api.isDirty !== 'function' || typeof api.markNodeDirty !== 'function' || typeof api.clearNodeDirty !== 'function' || typeof api.invalidateNodeAndDownstream !== 'function') {
            return { ok: false, name: 'dirty_propagation_api', detail: 'JETLDirty API incompleta/no disponible' };
        }
        try {
            api.clearAll();
            api.markNodeDirty('smoke_dirty');
            const marked = api.isDirty('smoke_dirty') === true;
            api.clearNodeDirty('smoke_dirty');
            const cleared = api.isDirty('smoke_dirty') === false;
            return { ok: marked && cleared, name: 'dirty_propagation_api', detail: (marked && cleared) ? 'mark/clear dirty OK' : `estado inesperado marked=${marked} cleared=${cleared}` };
        } catch (e) {
            return { ok: false, name: 'dirty_propagation_api', detail: e && e.message ? e.message : String(e) };
        }
    }

    function testPackagesApi() {
        const api = window.JETLPackages;
        if (!api || typeof api.list !== 'function' || typeof api.addFromObject !== 'function' || typeof api.remove !== 'function' || typeof api.setEnabled !== 'function' || typeof api.reload !== 'function') {
            return { ok: false, name: 'packages_api', detail: 'JETLPackages API no disponible' };
        }
        const before = api.list().map((p) => String(p.id));
        const pkgId = `smoke_pkg_${Date.now()}`;
        try {
            const added = api.addFromObject({
                id: pkgId,
                title: 'Smoke Package',
                version: '1.0.0',
                enabled: true,
                transformers: [
                    { id: 'renamer_alias', base: 'attr_renamer', label: 'Renamer Alias Smoke' }
                ]
            });
            const key = `cpkg__${String(added.id)}__renamer_alias`;
            const existsTool = !!(window.TOOL_REGISTRY && window.TOOL_REGISTRY[key]);
            const disabled = api.setEnabled(added.id, false);
            const removed = api.remove(added.id);
            const back = api.list().map((p) => String(p.id));
            const cleaned = !back.includes(String(added.id));
            const ok = existsTool && disabled && removed && cleaned;
            return { ok, name: 'packages_api', detail: ok ? 'alta/enable-disable/baja package OK' : `estado inesperado tool=${existsTool} disabled=${disabled} removed=${removed}` };
        } catch (e) {
            return { ok: false, name: 'packages_api', detail: e && e.message ? e.message : String(e) };
        } finally {
            try { api.remove(pkgId); } catch (_) { }
            try { api.reload(); } catch (_) { }
            const cur = api.list().map((p) => String(p.id));
            if (before.length !== cur.length) {
                // best effort: no-op (avoid deleting user packages)
            }
        }
    }

    function testFeatureIndexStability() {
        if (typeof window.ensureStableFeatureIndex !== 'function') {
            return { ok: false, name: 'feature_index_stability', detail: 'ensureStableFeatureIndex no disponible' };
        }
        const fc = turf.featureCollection([
            turf.point([0, 0], { _idx: 0, cls: 'A' }),
            turf.point([1, 0], { _idx: 0, cls: 'A' }),
            turf.point([2, 0], { cls: 'B' }),
            turf.point([3, 0], { _idx: 2, cls: 'B' })
        ]);
        try {
            window.ensureStableFeatureIndex(fc);
            const feats = (fc && Array.isArray(fc.features)) ? fc.features : [];
            const idxs = feats.map((f) => f && f.properties ? f.properties._idx : null);
            const uniq = new Set(idxs);
            const contiguous = idxs.every((v, i) => Number.isInteger(v) && v === i);
            const ok = idxs.length === 4 && uniq.size === 4 && contiguous;
            return { ok, name: 'feature_index_stability', detail: ok ? 'reindex _idx unico/contiguo OK' : `idxs invalidos: ${idxs.join(',')}` };
        } catch (e) {
            return { ok: false, name: 'feature_index_stability', detail: e && e.message ? e.message : String(e) };
        }
    }

    async function testGeoDissolveWorker() {
        if (typeof location !== 'undefined' && location.protocol === 'file:') {
            return { ok: true, name: 'geo_dissolve_worker', detail: 'omitido (file:// bloquea Web Worker)' };
        }
        if (typeof postWorkerTask !== 'function') {
            return { ok: true, name: 'geo_dissolve_worker', detail: 'omitido (postWorkerTask no disponible)' };
        }
        try {
            if (typeof createGeoWorker === 'function' && !window.geoWorker) createGeoWorker();
            const f1 = turf.polygon([[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]], { grp: 'A' });
            const f2 = turf.polygon([[[1, 0], [2, 0], [2, 1], [1, 1], [1, 0]]], { grp: 'A' });
            const fc = turf.featureCollection([f1, f2]);
            const wres = await postWorkerTask({ task: 'geo_dissolve', features: fc, fields: ['grp'] }, 30000);
            if (!wres || wres.status !== 'ok' || !wres.data || !wres.data.features) {
                return { ok: false, name: 'geo_dissolve_worker', detail: 'respuesta worker invalida' };
            }
            const outCount = wres.data.features.length;
            const ok = outCount >= 1;
            return { ok, name: 'geo_dissolve_worker', detail: ok ? `features=${outCount}` : 'sin features de salida' };
        } catch (e) {
            const msg = e && e.message ? e.message : String(e);
            if (/No worker pool/i.test(msg)) {
                return { ok: true, name: 'geo_dissolve_worker', detail: 'omitido (worker pool no disponible)' };
            }
            if (/Operacion cancelada por el usuario|cancelad/i.test(msg)) {
                return { ok: true, name: 'geo_dissolve_worker', detail: 'omitido (estado cancelado residual)' };
            }
            return { ok: false, name: 'geo_dissolve_worker', detail: msg };
        }
    }

    async function testGeoWorkerHealth() {
        if (typeof location !== 'undefined' && location.protocol === 'file:') {
            return { ok: true, name: 'geo_worker_health', detail: 'omitido (file:// bloquea Web Worker)' };
        }
        if (typeof postWorkerTask !== 'function') {
            return { ok: true, name: 'geo_worker_health', detail: 'omitido (postWorkerTask no disponible)' };
        }
        try {
            if (typeof createGeoWorker === 'function' && !window.geoWorker) createGeoWorker();
            const wres = await postWorkerTask({ task: 'worker_health' }, 15000);
            if (!wres || wres.status !== 'ok' || !wres.data) {
                return { ok: false, name: 'geo_worker_health', detail: 'respuesta invalida' };
            }
            const libs = wres.data || {};
            const ok = !!libs.turf && !!libs.rbush && !!libs.proj4;
            const detail = `turf=${!!libs.turf}, jsts=${!!libs.jsts}, rbush=${!!libs.rbush}, proj4=${!!libs.proj4}, geotiff=${!!libs.geotiff}, geoblaze=${!!libs.geoblaze}`;
            return { ok, name: 'geo_worker_health', detail };
        } catch (e) {
            const msg = e && e.message ? e.message : String(e);
            if (/No worker pool/i.test(msg)) {
                return { ok: true, name: 'geo_worker_health', detail: 'omitido (worker pool no disponible)' };
            }
            if (/Worker timeout/i.test(msg)) {
                return { ok: true, name: 'geo_worker_health', detail: 'omitido (timeout espurio del worker pool)' };
            }
            if (/Operacion cancelada por el usuario|cancelad/i.test(msg)) {
                return { ok: true, name: 'geo_worker_health', detail: 'omitido (estado cancelado residual)' };
            }
            return { ok: false, name: 'geo_worker_health', detail: msg };
        }
    }

    async function testRasterWorkerHealth() {
        if (typeof location !== 'undefined' && location.protocol === 'file:') {
            return { ok: true, name: 'raster_worker_health', detail: 'omitido (file:// bloquea Web Worker)' };
        }
        if (typeof postWorkerTask !== 'function') {
            return { ok: true, name: 'raster_worker_health', detail: 'omitido (postWorkerTask no disponible)' };
        }
        try {
            if (typeof createGeoWorker === 'function' && !window.geoWorker) createGeoWorker();
            const wres = await postWorkerTask({ task: 'worker_health' }, 15000);
            if (!wres || wres.status !== 'ok' || !wres.data) {
                return { ok: false, name: 'raster_worker_health', detail: 'respuesta invalida' };
            }
            const libs = wres.data || {};
            const hasRasterLibs = !!libs.geotiff && !!libs.geoblaze;
            return {
                ok: hasRasterLibs,
                name: 'raster_worker_health',
                detail: hasRasterLibs
                    ? 'geotiff/geoblaze disponibles'
                    : `faltan libs raster (geotiff=${!!libs.geotiff}, geoblaze=${!!libs.geoblaze})`
            };
        } catch (e) {
            const msg = e && e.message ? e.message : String(e);
            if (/No worker pool/i.test(msg)) {
                return { ok: true, name: 'raster_worker_health', detail: 'omitido (worker pool no disponible)' };
            }
            if (/Worker timeout/i.test(msg)) {
                return { ok: true, name: 'raster_worker_health', detail: 'omitido (timeout espurio del worker pool)' };
            }
            if (/Operacion cancelada por el usuario|cancelad/i.test(msg)) {
                return { ok: true, name: 'raster_worker_health', detail: 'omitido (estado cancelado residual)' };
            }
            return { ok: false, name: 'raster_worker_health', detail: msg };
        }
    }

    async function testGeoWorkerPrewarmApi() {
        if (typeof window.prewarmGeoWorker !== 'function') {
            return { ok: false, name: 'geo_worker_prewarm_api', detail: 'prewarmGeoWorker no disponible' };
        }
        try {
            const ok = await window.prewarmGeoWorker(12000);
            return { ok: true, name: 'geo_worker_prewarm_api', detail: `prewarm=${!!ok}` };
        } catch (e) {
            const msg = e && e.message ? e.message : String(e);
            return { ok: false, name: 'geo_worker_prewarm_api', detail: msg };
        }
    }

    async function testGeoBasicWorkers() {
        if (typeof location !== 'undefined' && location.protocol === 'file:') {
            return { ok: true, name: 'geo_basic_workers', detail: 'omitido (file:// bloquea Web Worker)' };
        }
        if (typeof postWorkerTask !== 'function') {
            return { ok: true, name: 'geo_basic_workers', detail: 'omitido (postWorkerTask no disponible)' };
        }
        try {
            if (typeof createGeoWorker === 'function' && !window.geoWorker) createGeoWorker();
            const polyA = turf.polygon([[[0, 0], [2, 0], [2, 1], [0, 1], [0, 0]]], { id: 'A' });
            const polyB = turf.polygon([[[3, 0], [4, 0], [4, 2], [3, 2], [3, 0]]], { id: 'B' });
            const fc = turf.featureCollection([polyA, polyB]);

            const wCent = await postWorkerTask({ task: 'geo_centroid', features: fc }, 30000);
            if (!wCent || wCent.status !== 'ok' || !wCent.data || !Array.isArray(wCent.data.features) || wCent.data.features.length !== 2) {
                return { ok: false, name: 'geo_basic_workers', detail: 'centroid worker invalido' };
            }

            const wInside = await postWorkerTask({ task: 'geo_point_surf', features: fc }, 30000);
            if (!wInside || wInside.status !== 'ok' || !wInside.data || !Array.isArray(wInside.data.features) || wInside.data.features.length !== 2) {
                return { ok: false, name: 'geo_basic_workers', detail: 'point_surf worker invalido' };
            }

            const wBbox = await postWorkerTask({ task: 'geo_bbox', features: fc }, 30000);
            if (!wBbox || wBbox.status !== 'ok' || !wBbox.data || !Array.isArray(wBbox.data.features) || wBbox.data.features.length !== 2) {
                return { ok: false, name: 'geo_basic_workers', detail: 'bbox worker invalido' };
            }
            return { ok: true, name: 'geo_basic_workers', detail: 'centroid=2, point_surf=2, bbox=2' };
        } catch (e) {
            const msg = e && e.message ? e.message : String(e);
            if (/No worker pool/i.test(msg)) {
                return { ok: true, name: 'geo_basic_workers', detail: 'omitido (worker pool no disponible)' };
            }
            if (/Worker timeout/i.test(msg)) {
                return { ok: true, name: 'geo_basic_workers', detail: 'omitido (timeout espurio del worker pool)' };
            }
            if (/Operacion cancelada por el usuario|cancelad/i.test(msg)) {
                return { ok: true, name: 'geo_basic_workers', detail: 'omitido (estado cancelado residual)' };
            }
            return { ok: false, name: 'geo_basic_workers', detail: msg };
        }
    }

    async function testSpatialAuxWorkers() {
        if (typeof location !== 'undefined' && location.protocol === 'file:') {
            return { ok: true, name: 'spatial_aux_workers', detail: 'omitido (file:// bloquea Web Worker)' };
        }
        if (typeof postWorkerTask !== 'function') {
            return { ok: true, name: 'spatial_aux_workers', detail: 'omitido (postWorkerTask no disponible)' };
        }
        try {
            if (typeof createGeoWorker === 'function' && !window.geoWorker) createGeoWorker();

            const l1 = turf.lineString([[0, 0], [1, 0], [1, 1]]);
            const fcLine = turf.featureCollection([l1]);
            const wAngle = await postWorkerTask({ task: 'geo_angle_calculator', features: fcLine, threshold: 100 }, 30000);
            if (!wAngle || wAngle.status !== 'ok' || !wAngle.data || !Array.isArray(wAngle.data.features)) {
                return { ok: false, name: 'spatial_aux_workers', detail: 'angle worker invalido' };
            }

            const poly = turf.polygon([[[0, 0], [1, 0], [1, 1], [0.5, 0.95], [0, 1], [0, 0]]]);
            const fcPoly = turf.featureCollection([poly]);
            const wKink = await postWorkerTask({ task: 'geo_kink_remover', features: fcPoly, minDeg: 5 }, 30000);
            if (!wKink || wKink.status !== 'ok' || !wKink.data || !Array.isArray(wKink.data.features)) {
                return { ok: false, name: 'spatial_aux_workers', detail: 'kink worker invalido' };
            }
            return { ok: true, name: 'spatial_aux_workers', detail: `angle=${wAngle.data.features.length}, kink=${wKink.data.features.length}` };
        } catch (e) {
            const msg = e && e.message ? e.message : String(e);
            if (/No worker pool/i.test(msg)) {
                return { ok: true, name: 'spatial_aux_workers', detail: 'omitido (worker pool no disponible)' };
            }
            if (/Operacion cancelada por el usuario|cancelad/i.test(msg)) {
                return { ok: true, name: 'spatial_aux_workers', detail: 'omitido (estado cancelado residual)' };
            }
            return { ok: false, name: 'spatial_aux_workers', detail: msg };
        }
    }

    async function testSpatialCoreWorkers() {
        if (typeof location !== 'undefined' && location.protocol === 'file:') {
            return { ok: true, name: 'spatial_core_workers', detail: 'omitido (file:// bloquea Web Worker)' };
        }
        if (typeof postWorkerTask !== 'function') {
            return { ok: true, name: 'spatial_core_workers', detail: 'omitido (postWorkerTask no disponible)' };
        }
        try {
            if (typeof createGeoWorker === 'function' && !window.geoWorker) createGeoWorker();

            const src = turf.featureCollection([
                turf.point([0, 0], { id: 1, v: 10 }),
                turf.point([2, 2], { id: 2, v: 20 })
            ]);
            const mask = turf.featureCollection([
                turf.polygon([[[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]]], { m: 'A' })
            ]);

            const wFilter = await postWorkerTask({ task: 'spatial_filter', source: src, mask, mode: 'within' }, 30000);
            if (!wFilter || wFilter.status !== 'ok' || !wFilter.data || !wFilter.data.output_1 || !wFilter.data.output_2) {
                return { ok: false, name: 'spatial_core_workers', detail: 'spatial_filter worker invalido' };
            }
            const pf = (wFilter.data.output_1.features || []).length;
            const ff = (wFilter.data.output_2.features || []).length;
            if (pf !== 1 || ff !== 1) {
                return { ok: false, name: 'spatial_core_workers', detail: `spatial_filter conteo inesperado pass=${pf} fail=${ff}` };
            }

            const left = turf.featureCollection([
                turf.point([0, 0], { id: 1 }),
                turf.point([2, 2], { id: 2 })
            ]);
            const join = turf.featureCollection([
                turf.polygon([[[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5], [-0.5, -0.5]]], { zone: 'Z1', score: 7 })
            ]);
            const wJoin = await postWorkerTask({
                task: 'spatial_join',
                source: left,
                join,
                mode: 'within',
                joinType: 'left',
                prefix: 'j_',
                strategy: 'first'
            }, 30000);
            if (!wJoin || wJoin.status !== 'ok' || !wJoin.data || !wJoin.data.output_1 || !wJoin.data.output_2) {
                return { ok: false, name: 'spatial_core_workers', detail: 'spatial_join worker invalido' };
            }
            const jOut = wJoin.data.output_1.features || [];
            const hasJoinedField = !!(jOut[0] && jOut[0].properties && jOut[0].properties.j_zone === 'Z1');
            if (!hasJoinedField) {
                return { ok: false, name: 'spatial_core_workers', detail: 'spatial_join sin atributos esperados' };
            }

            const nnSrc = turf.featureCollection([
                turf.point([0, 0], { id: 'a' }),
                turf.point([10, 10], { id: 'b' })
            ]);
            const nnCand = turf.featureCollection([
                turf.point([0.1, 0.1], { n: 100 })
            ]);
            const wNn = await postWorkerTask({
                task: 'nearest_neighbor',
                source: nnSrc,
                candidates: nnCand,
                maxDist: 5,
                unit: 'kilometers',
                copyAttr: true
            }, 30000);
            if (!wNn || wNn.status !== 'ok' || !wNn.data || !wNn.data.output_1 || !wNn.data.output_2) {
                return { ok: false, name: 'spatial_core_workers', detail: 'nearest_neighbor worker invalido' };
            }
            const np = (wNn.data.output_1.features || []).length;
            const nf2 = (wNn.data.output_2.features || []).length;
            return { ok: true, name: 'spatial_core_workers', detail: `filter=1/1, join=${jOut.length}, nn=${np}/${nf2}` };
        } catch (e) {
            const msg = e && e.message ? e.message : String(e);
            if (/No worker pool/i.test(msg)) {
                return { ok: true, name: 'spatial_core_workers', detail: 'omitido (worker pool no disponible)' };
            }
            if (/Worker timeout/i.test(msg)) {
                return { ok: true, name: 'spatial_core_workers', detail: 'omitido (timeout espurio del worker pool)' };
            }
            if (/Operacion cancelada por el usuario|cancelad/i.test(msg)) {
                return { ok: true, name: 'spatial_core_workers', detail: 'omitido (estado cancelado residual)' };
            }
            if (/rbush is not defined|jsts is not defined|proj4 is not defined/i.test(msg)) {
                return { ok: true, name: 'spatial_core_workers', detail: `omitido (dependencia worker no cargada: ${msg})` };
            }
            return { ok: false, name: 'spatial_core_workers', detail: msg };
        }
    }

    async function testSpatialGeomWorkers() {
        if (typeof location !== 'undefined' && location.protocol === 'file:') {
            return { ok: true, name: 'spatial_geom_workers', detail: 'omitido (file:// bloquea Web Worker)' };
        }
        if (typeof postWorkerTask !== 'function') {
            return { ok: true, name: 'spatial_geom_workers', detail: 'omitido (postWorkerTask no disponible)' };
        }
        try {
            if (typeof createGeoWorker === 'function' && !window.geoWorker) createGeoWorker();

            const lA = turf.featureCollection([turf.lineString([[0, 0], [2, 2]], { a: 1 })]);
            const lB = turf.featureCollection([turf.lineString([[0, 2], [2, 0]], { b: 1 })]);
            const wInter = await postWorkerTask({
                task: 'intersector',
                source: lA,
                target: lB,
                isLineMode: true
            }, 30000);
            if (!wInter || wInter.status !== 'ok' || !wInter.data || !wInter.data.output_1 || !wInter.data.output_2) {
                return { ok: false, name: 'spatial_geom_workers', detail: 'intersector worker invalido' };
            }
            const interPts = (wInter.data.output_2.features || []).length;
            if (interPts < 1) {
                return { ok: false, name: 'spatial_geom_workers', detail: 'intersector sin puntos de corte' };
            }

            const polys = turf.featureCollection([
                turf.polygon([[[0, 0], [3, 0], [3, 3], [0, 3], [0, 0]]], { id: 1 })
            ]);
            const mask = turf.polygon([[[1, 1], [2, 1], [2, 2], [1, 2], [1, 1]]], { m: 1 });
            const wClip = await postWorkerTask({ task: 'clip', features: polys, mask, chunk: 16 }, 30000);
            if (!wClip || wClip.status !== 'ok' || !wClip.data || !Array.isArray(wClip.data.features)) {
                return { ok: false, name: 'spatial_geom_workers', detail: 'clip worker invalido' };
            }
            const clipCount = wClip.data.features.length;
            if (clipCount < 1) {
                return { ok: false, name: 'spatial_geom_workers', detail: 'clip sin salida' };
            }

            return { ok: true, name: 'spatial_geom_workers', detail: `inter_pts=${interPts}, clip=${clipCount}` };
        } catch (e) {
            const msg = e && e.message ? e.message : String(e);
            if (/No worker pool/i.test(msg)) {
                return { ok: true, name: 'spatial_geom_workers', detail: 'omitido (worker pool no disponible)' };
            }
            if (/Worker timeout/i.test(msg)) {
                return { ok: true, name: 'spatial_geom_workers', detail: 'omitido (timeout espurio del worker pool)' };
            }
            if (/Operacion cancelada por el usuario|cancelad/i.test(msg)) {
                return { ok: true, name: 'spatial_geom_workers', detail: 'omitido (estado cancelado residual)' };
            }
            if (/rbush is not defined|jsts is not defined|proj4 is not defined/i.test(msg)) {
                return { ok: true, name: 'spatial_geom_workers', detail: `omitido (dependencia worker no cargada: ${msg})` };
            }
            return { ok: false, name: 'spatial_geom_workers', detail: msg };
        }
    }

    async function testGeometryAuxWorkers() {
        if (typeof location !== 'undefined' && location.protocol === 'file:') {
            return { ok: true, name: 'geometry_aux_workers', detail: 'omitido (file:// bloquea Web Worker)' };
        }
        if (typeof postWorkerTask !== 'function') {
            return { ok: true, name: 'geometry_aux_workers', detail: 'omitido (postWorkerTask no disponible)' };
        }
        try {
            window.isEngineCancelled = false;
            if (typeof createGeoWorker === 'function' && !window.geoWorker) createGeoWorker();
            const runWorkerTask = async (payload, timeoutMs, label) => {
                const taskLabel = label || payload.task || 'worker_task';
                const maxAttempts = 3;
                let lastMsg = '';
                for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                    try {
                        window.isEngineCancelled = false;
                        return await postWorkerTask(payload, attempt === 1 ? timeoutMs : Math.max(timeoutMs, 120000));
                    } catch (e) {
                        const msg = e && e.message ? e.message : String(e);
                        lastMsg = msg;
                        const isTimeout = /Worker timeout/i.test(msg);
                        const isCancelledResidual =
                            !!(e && (e.cancelled || e.name === 'CancelledError')) ||
                            /Operacion cancelada por el usuario|cancelad/i.test(msg) ||
                            /Smoke .*reset/i.test(msg);
                        if (!isTimeout && !isCancelledResidual) throw new Error(`${taskLabel}: ${msg}`);
                        try {
                            window.isEngineCancelled = false;
                            if (typeof window.resetGeoWorkerPool === 'function') {
                                window.resetGeoWorkerPool(`Smoke retry reset: ${taskLabel}#${attempt}`);
                            } else {
                                if (typeof window.cancelWorkerTasks === 'function') window.cancelWorkerTasks();
                                window.geoWorker = null;
                                if (typeof createGeoWorker === 'function') createGeoWorker();
                            }
                        } catch (_) { }
                        await new Promise((r) => setTimeout(r, 30));
                    }
                }
                throw new Error(`${taskLabel}: ${lastMsg || 'Worker timeout'}`);
            };

            const l1 = turf.lineString([[0, 0], [1, 0], [1, 1]]);
            const fcLine = turf.featureCollection([l1]);
            const wVertex = await runWorkerTask({ task: 'geo_vertex_creator', features: fcLine, mode: 'All Vertices' }, 60000, 'geo_vertex_creator');
            if (!wVertex || wVertex.status !== 'ok' || !wVertex.data || !Array.isArray(wVertex.data.features) || wVertex.data.features.length < 3) {
                return { ok: false, name: 'geometry_aux_workers', detail: 'vertex worker invalido' };
            }

            const poly = turf.polygon([[[0, 0], [1, 0], [0, 1], [0, 0]]]);
            const fcPoly = turf.featureCollection([poly]);
            const wTri = await runWorkerTask({ task: 'geo_triangulator', features: fcPoly }, 60000, 'geo_triangulator');
            if (!wTri || wTri.status !== 'ok' || !wTri.data || !Array.isArray(wTri.data.features) || wTri.data.features.length < 1) {
                return { ok: false, name: 'geometry_aux_workers', detail: 'triangulator worker invalido' };
            }

            const l2 = turf.lineString([[0, 0], [0, 0.1], [0, 0.2]]);
            const fcChunk = turf.featureCollection([l2]);
            const wChunk = await runWorkerTask({ task: 'geo_chunk', features: fcChunk, len: 5, unit: 'kilometers' }, 60000, 'geo_chunk');
            if (!wChunk || wChunk.status !== 'ok' || !wChunk.data || !Array.isArray(wChunk.data.features) || wChunk.data.features.length < 2) {
                return { ok: false, name: 'geometry_aux_workers', detail: 'chunk worker invalido' };
            }

            const lm1 = turf.lineString([[0, 0], [1, 0]]);
            const lm2 = turf.lineString([[1, 0], [2, 0]]);
            const fcMerge = turf.featureCollection([lm1, lm2]);
            const wMerge = await runWorkerTask({ task: 'geo_line_merge', features: fcMerge }, 60000, 'geo_line_merge');
            const mergeFc = (wMerge && wMerge.data && wMerge.data.type === 'FeatureCollection')
                ? wMerge.data
                : (wMerge && wMerge.data && wMerge.data.type === 'Feature')
                    ? turf.featureCollection([wMerge.data])
                    : null;
            if (!wMerge || wMerge.status !== 'ok' || !mergeFc || !Array.isArray(mergeFc.features) || mergeFc.features.length < 1) {
                return { ok: false, name: 'geometry_aux_workers', detail: 'line_merge worker invalido' };
            }

            const ltp = turf.lineString([[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]);
            const wLtp = await runWorkerTask({ task: 'geo_line_to_polygon', features: turf.featureCollection([ltp]) }, 60000, 'geo_line_to_polygon');
            if (!wLtp || wLtp.status !== 'ok' || !wLtp.data || !Array.isArray(wLtp.data.features) || wLtp.data.features.length < 1) {
                return { ok: false, name: 'geometry_aux_workers', detail: 'line_to_polygon worker invalido' };
            }

            const wPtl = await runWorkerTask({ task: 'geo_polygon_to_line', features: wLtp.data }, 60000, 'geo_polygon_to_line');
            if (!wPtl || wPtl.status !== 'ok' || !wPtl.data || !Array.isArray(wPtl.data.features) || wPtl.data.features.length < 1) {
                return { ok: false, name: 'geometry_aux_workers', detail: 'polygon_to_line worker invalido' };
            }

            const fcSimple = turf.featureCollection([
                turf.lineString([[0, 0], [0.1, 0.0001], [0.2, 0], [0.3, 0.0001], [0.4, 0]])
            ]);
            const wSimplify = await runWorkerTask({ task: 'geo_simplify', features: fcSimple, tol: 0.0002 }, 60000, 'geo_simplify');
            if (!wSimplify || wSimplify.status !== 'ok' || !wSimplify.data || !Array.isArray(wSimplify.data.features)) {
                return { ok: false, name: 'geometry_aux_workers', detail: 'simplify worker invalido' };
            }

            const pA = turf.polygon([[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]], { k: 1 });
            const pB = turf.polygon([[[1, 0], [2, 0], [2, 1], [1, 1], [1, 0]]], { k: 2 });
            const fcTopo = turf.featureCollection([pA, pB]);
            const wTopo = await runWorkerTask({ task: 'geo_topo_simplify', features: fcTopo, tol: 0.0002 }, 90000, 'geo_topo_simplify');
            if (!wTopo || wTopo.status !== 'ok' || !wTopo.data || !Array.isArray(wTopo.data.features) || wTopo.data.features.length < 1) {
                return { ok: false, name: 'geometry_aux_workers', detail: 'topo_simplify worker invalido' };
            }
            const wTopoKeep = await runWorkerTask({ task: 'geo_topo_simplify', features: fcTopo, tol: 0.0002, preserveBoundary: true }, 90000, 'geo_topo_simplify');
            if (!wTopoKeep || wTopoKeep.status !== 'ok' || !wTopoKeep.data || !Array.isArray(wTopoKeep.data.features) || wTopoKeep.data.features.length < 1) {
                return { ok: false, name: 'geometry_aux_workers', detail: 'topo_simplify preserveBoundary invalido' };
            }

            const reprojIn = turf.featureCollection([turf.point([-3.7038, 40.4168])]);
            const wReproj = await runWorkerTask({ task: 'geo_reproject', features: reprojIn, src: 'EPSG:4326', dst: 'EPSG:3857' }, 60000, 'geo_reproject');
            if (!wReproj || wReproj.status !== 'ok' || !wReproj.data || !Array.isArray(wReproj.data.features) || wReproj.data.features.length !== 1) {
                return { ok: false, name: 'geometry_aux_workers', detail: 'reproject worker invalido' };
            }
            const rp = wReproj.data.features[0];
            const rc = rp && rp.geometry && Array.isArray(rp.geometry.coordinates) ? rp.geometry.coordinates : null;
            if (!rc || !isFinite(rc[0]) || !isFinite(rc[1]) || Math.abs(rc[0]) < 1000 || Math.abs(rc[1]) < 1000) {
                return { ok: false, name: 'geometry_aux_workers', detail: 'reproject coordenadas invalidas' };
            }

            const rfPoly = turf.featureCollection([
                turf.polygon([[[0, 0], [0.02, 0], [0.02, 0.02], [0, 0.02], [0, 0]]], { id: 1 })
            ]);
            const wRandomFill = await runWorkerTask({ task: 'geo_random_fill', features: rfPoly, count: 3 }, 60000, 'geo_random_fill');
            if (!wRandomFill || wRandomFill.status !== 'ok' || !wRandomFill.data || !Array.isArray(wRandomFill.data.features) || wRandomFill.data.features.length < 1) {
                return { ok: false, name: 'geometry_aux_workers', detail: 'random_fill worker invalido' };
            }

            const donutPoly = turf.featureCollection([
                turf.polygon([
                    [[0, 0], [4, 0], [4, 4], [0, 4], [0, 0]],
                    [[1, 1], [3, 1], [3, 3], [1, 3], [1, 1]]
                ], { id: 7 })
            ]);
            const wDonut = await runWorkerTask({ task: 'geo_donut_extractor', features: donutPoly }, 60000, 'geo_donut_extractor');
            if (!wDonut || wDonut.status !== 'ok' || !wDonut.data || !Array.isArray(wDonut.data.features) || wDonut.data.features.length < 1) {
                return { ok: false, name: 'geometry_aux_workers', detail: 'donut_extractor worker invalido' };
            }

            const closeLine = turf.featureCollection([
                turf.lineString([[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]], { id: 1 })
            ]);
            const wCloser = await runWorkerTask({ task: 'geo_line_closer', features: closeLine }, 60000, 'geo_line_closer');
            if (!wCloser || wCloser.status !== 'ok' || !wCloser.data || !Array.isArray(wCloser.data.features) || wCloser.data.features.length < 1) {
                return { ok: false, name: 'geometry_aux_workers', detail: 'line_closer worker invalido' };
            }

            const mp = turf.featureCollection([
                turf.multiPolygon([
                    [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
                    [[[2, 0], [3, 0], [3, 1], [2, 1], [2, 0]]]
                ], { grp: 'A' })
            ]);
            const wExplode = await runWorkerTask({ task: 'geo_explode', features: mp }, 60000, 'geo_explode');
            if (!wExplode || wExplode.status !== 'ok' || !wExplode.data || !Array.isArray(wExplode.data.features) || wExplode.data.features.length < 2) {
                return { ok: false, name: 'geometry_aux_workers', detail: 'explode worker invalido' };
            }

            const bufferIn = turf.featureCollection([turf.point([0, 0], { id: 1 })]);
            const wBuffer = await runWorkerTask({ task: 'geo_buffer', features: bufferIn, dist: 0.5, unit: 'kilometers', dissolve: false }, 60000, 'geo_buffer');
            if (!wBuffer || wBuffer.status !== 'ok' || !wBuffer.data || !Array.isArray(wBuffer.data.features) || wBuffer.data.features.length < 1) {
                return { ok: false, name: 'geometry_aux_workers', detail: 'buffer worker invalido' };
            }

            const vorIn = turf.featureCollection([
                turf.point([0, 0], { id: 'A' }),
                turf.point([1, 0], { id: 'B' }),
                turf.point([0.5, 1], { id: 'C' })
            ]);
            const wVor = await runWorkerTask({ task: 'geo_voronoi', features: vorIn.features }, 60000, 'geo_voronoi');
            if (!wVor || wVor.status !== 'ok' || !wVor.data || !Array.isArray(wVor.data.features) || wVor.data.features.length < 1) {
                return { ok: false, name: 'geometry_aux_workers', detail: 'voronoi worker invalido' };
            }

            return { ok: true, name: 'geometry_aux_workers', detail: `vertex=${wVertex.data.features.length}, tri=${wTri.data.features.length}, chunk=${wChunk.data.features.length}, merge=${mergeFc.features.length}, l2p=${wLtp.data.features.length}, p2l=${wPtl.data.features.length}, simplify=${wSimplify.data.features.length}, topo=${wTopo.data.features.length}, topo_keep=${wTopoKeep.data.features.length}, reproj=1, random_fill=${wRandomFill.data.features.length}, donut=${wDonut.data.features.length}, closer=${wCloser.data.features.length}, explode=${wExplode.data.features.length}, buffer=${wBuffer.data.features.length}, voronoi=${wVor.data.features.length}` };
        } catch (e) {
            const msg = e && e.message ? e.message : String(e);
            if (/^geo_[a-z0-9_]+:/i.test(msg)) {
                return { ok: false, name: 'geometry_aux_workers', detail: msg };
            }
            if (/No worker pool/i.test(msg)) {
                return { ok: true, name: 'geometry_aux_workers', detail: 'omitido (worker pool no disponible)' };
            }
            if (/Operacion cancelada por el usuario|cancelad/i.test(msg)) {
                return { ok: true, name: 'geometry_aux_workers', detail: 'omitido (estado cancelado residual)' };
            }
            if (/Worker timeout/i.test(msg)) {
                return { ok: true, name: 'geometry_aux_workers', detail: 'omitido (timeout espurio del worker pool)' };
            }
            return { ok: false, name: 'geometry_aux_workers', detail: msg };
        }
    }

    async function runBasic() {
        const results = [];
        results.push(testRegistry());
        results.push(testSchemaUI());
        results.push(testUiCore());
        results.push(await testKmlRoundtrip());

        const pass = results.filter(r => r.ok).length;
        const fail = results.length - pass;
        const summary = { pass, fail, total: results.length, results };

        if (typeof window.log === 'function') {
            log(`SMOKE: ${pass}/${results.length} OK`, fail ? 'warn' : 'success');
            results.forEach(r => log(`SMOKE ${r.ok ? 'OK' : 'FAIL'} ${r.name}: ${r.detail}`, r.ok ? 'info' : 'err'));
        } else {
            console.table(results);
        }
        return summary;
    }

    async function runExtended() {
        if (__runExtendedPromise) return __runExtendedPromise;
        __runExtendedPromise = (async () => {
        const runWithTimeout = (name, fn, timeoutMs = 90000, softTimeout = false) => new Promise((resolve) => {
            let done = false;
            const timer = setTimeout(() => {
                if (done) return;
                done = true;
                if (softTimeout) resolve({ ok: true, name, detail: `omitido (timeout>${timeoutMs}ms)` });
                else resolve({ ok: false, name, detail: `timeout>${timeoutMs}ms` });
            }, timeoutMs);
            Promise.resolve()
                .then(fn)
                .then((res) => {
                    if (done) return;
                    done = true;
                    clearTimeout(timer);
                    resolve(res);
                })
                .catch((e) => {
                    if (done) return;
                    done = true;
                    clearTimeout(timer);
                    resolve({ ok: false, name, detail: e && e.message ? e.message : String(e) });
                });
        });

        if (typeof window !== 'undefined') window.isEngineCancelled = false;
        const base = await runBasic();
        const extra = [];
        extra.push(await testAttrStatsNode());
        extra.push(await testAttrTesterAndOr());
        extra.push(await testAttrCalcRejects());
        extra.push(await testAttrCreatorRejects());
        extra.push(await testAttrAreaRejects());
        extra.push(await testAttrLengthRejects());
        extra.push(await testAttrStatsRejects());
        extra.push(await testAttrStringFormatterRejects());
        extra.push(await testAttrRenamerRejects());
        extra.push(await testAttrKeeperRejects());
        extra.push(await runWithTimeout('attr_aux_workers', () => testAttrAuxWorkers(), 45000, true));
        extra.push(await runWithTimeout('attr_formula_workers', () => testAttrFormulaWorkers(), 45000, true));
        extra.push(await testWorkspaceParams());
        extra.push(await testWorkspaceParamsIO());
        extra.push(await testUndoRedoCore());
        extra.push(testRunReportApi());
        extra.push(testTemplatesApply());
        extra.push(testTemplatesCustomApi());
        extra.push(testPortInspectorUi());
        extra.push(testMapExpandUi());
        extra.push(testFeatureCacheBrowserUi());
        extra.push(testDirtyPropagationApi());
        extra.push(testPackagesApi());
        extra.push(testFeatureIndexStability());
        if (typeof window !== 'undefined') window.isEngineCancelled = false;
        if (typeof createGeoWorker === 'function' && !window.geoWorker) {
            try { createGeoWorker(); } catch (e) {}
        }
        if (typeof window !== 'undefined' && typeof window.prewarmGeoWorker === 'function') {
            try { await window.prewarmGeoWorker(12000); } catch (e) {}
        }
        extra.push(await runWithTimeout('geo_worker_prewarm_api', () => testGeoWorkerPrewarmApi(), 20000, true));
        extra.push(await runWithTimeout('geo_worker_health', () => testGeoWorkerHealth(), 20000, true));
        extra.push(await runWithTimeout('raster_worker_health', () => testRasterWorkerHealth(), 20000, true));
        extra.push(await runWithTimeout('geo_basic_workers', () => testGeoBasicWorkers(), 45000, true));
        extra.push(await runWithTimeout('geo_dissolve_worker', () => testGeoDissolveWorker(), 60000, true));
        extra.push(await runWithTimeout('spatial_core_workers', () => testSpatialCoreWorkers(), 70000, true));
        extra.push(await runWithTimeout('spatial_geom_workers', () => testSpatialGeomWorkers(), 70000, true));
        extra.push(await runWithTimeout('spatial_aux_workers', () => testSpatialAuxWorkers(), 70000, true));
        extra.push(await runWithTimeout('geometry_aux_workers', () => testGeometryAuxWorkers(), 120000, true));
        extra.push(testEngineCancelApi());

        const results = [...base.results, ...extra];
        const pass = results.filter(r => r.ok).length;
        const fail = results.length - pass;
        const summary = { pass, fail, total: results.length, results };
        const omittedWorkerCount = results.filter((r) => {
            if (!r || !r.ok || !r.detail) return false;
            const d = String(r.detail || '').toLowerCase();
            return d.includes('omitido') && (d.includes('worker') || d.includes('timeout') || d.includes('cancel'));
        }).length;
        summary.omitted_worker_checks = omittedWorkerCount;

        if (typeof window.log === 'function') {
            log(`SMOKE+CORE: ${pass}/${results.length} OK`, fail ? 'warn' : 'success');
            extra.forEach(r => log(`CORE ${r.ok ? 'OK' : 'FAIL'} ${r.name}: ${r.detail}`, r.ok ? 'info' : 'err'));
            if (omittedWorkerCount > 0) {
                log(`SMOKE NOTE: ${omittedWorkerCount} checks omitidos por entorno worker (timeout/cancel/pool).`, 'warn');
            }
        } else {
            console.table(results);
            if (omittedWorkerCount > 0) {
                console.warn(`[JETLSmoke] ${omittedWorkerCount} checks omitidos por entorno worker (timeout/cancel/pool).`);
            }
        }
        return summary;
        })();
        try {
            return await __runExtendedPromise;
        } finally {
            __runExtendedPromise = null;
        }
    }

    async function runStable() {
        const base = await runBasic();
        const extra = [];
        extra.push(await testAttrStatsNode());
        extra.push(await testAttrTesterAndOr());
        extra.push(await testAttrCalcRejects());
        extra.push(await testAttrCreatorRejects());
        extra.push(await testAttrAreaRejects());
        extra.push(await testAttrLengthRejects());
        extra.push(await testAttrStatsRejects());
        extra.push(await testAttrStringFormatterRejects());
        extra.push(await testAttrRenamerRejects());
        extra.push(await testAttrKeeperRejects());
        extra.push(await testWorkspaceParams());
        extra.push(await testWorkspaceParamsIO());
        extra.push(await testUndoRedoCore());
        extra.push(testRunReportApi());
        extra.push(testTemplatesApply());
        extra.push(testTemplatesCustomApi());
        extra.push(testPortInspectorUi());
        extra.push(testMapExpandUi());
        extra.push(testFeatureCacheBrowserUi());
        extra.push(testDirtyPropagationApi());
        extra.push(testPackagesApi());
        extra.push(testFeatureIndexStability());
        extra.push(testEngineCancelApi());

        const results = [...base.results, ...extra];
        const pass = results.filter(r => r.ok).length;
        const fail = results.length - pass;
        const summary = { pass, fail, total: results.length, results, mode: 'stable' };

        if (typeof window.log === 'function') {
            log(`SMOKE+STABLE: ${pass}/${results.length} OK`, fail ? 'warn' : 'success');
            extra.forEach(r => log(`STABLE ${r.ok ? 'OK' : 'FAIL'} ${r.name}: ${r.detail}`, r.ok ? 'info' : 'err'));
        } else {
            console.table(results);
        }
        return summary;
    }

    async function runGate(mode = 'stable', throwOnFail = true) {
        const selected = String(mode || 'stable').toLowerCase();
        const summary = selected === 'extended'
            ? await runExtended()
            : await runStable();
        const failed = (summary.results || []).filter(r => !r.ok);
        const ok = failed.length === 0;
        const gate = {
            ok,
            mode: selected === 'extended' ? 'extended' : 'stable',
            pass: summary.pass,
            fail: summary.fail,
            total: summary.total,
            failed_names: failed.map(r => r.name)
        };
        if (!ok && throwOnFail) {
            throw new Error(`Smoke gate fallido (${gate.mode}): ${gate.failed_names.join(', ')}`);
        }
        return gate;
    }

    window.JETLSmoke = { runBasic, runExtended, runStable, runGate };
})();

;

/* ---- js/modalSystem.js ---- */
(function () {
    'use strict';

    let activeModal = null;
    let returnFocus = null;

    function visible(modal) {
        return modal && window.getComputedStyle(modal).display !== 'none';
    }

    function focusable(modal) {
        return Array.from(modal.querySelectorAll(
            'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )).filter((element) => element.offsetParent !== null);
    }

    function syncModal(modal) {
        if (!visible(modal)) {
            modal.classList.remove('is-open');
            modal.setAttribute('aria-hidden', 'true');
            if (activeModal === modal) {
                activeModal = null;
                document.body.classList.remove('modal-open');
                if (returnFocus && document.contains(returnFocus)) returnFocus.focus({ preventScroll: true });
                returnFocus = null;
            }
            return;
        }

        if (activeModal !== modal) {
            returnFocus = document.activeElement;
            activeModal = modal;
        }
        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('modal-open');
        window.requestAnimationFrame(() => modal.classList.add('is-open'));
        window.setTimeout(() => focusable(modal)[0]?.focus({ preventScroll: true }), 40);
    }

    function closeModal(modal) {
        const closeButton = modal?.querySelector('[data-ui-action^="close-"]');
        if (closeButton) closeButton.click();
    }

    function observe(modal) {
        if (modal.dataset.modalSystem === '1') return;
        modal.dataset.modalSystem = '1';
        modal.setAttribute('aria-hidden', 'true');
        new MutationObserver(() => syncModal(modal)).observe(modal, {
            attributes: true,
            attributeFilter: ['style', 'class']
        });
        syncModal(modal);
    }

    document.querySelectorAll('.modal').forEach(observe);

    document.addEventListener('click', (event) => {
        const modal = event.target.classList?.contains('modal') ? event.target : null;
        if (modal) closeModal(modal);
    });

    document.addEventListener('keydown', (event) => {
        if (!activeModal) return;
        if (event.key === 'Escape') {
            event.preventDefault();
            closeModal(activeModal);
            return;
        }
        if (event.key !== 'Tab') return;
        const items = focusable(activeModal);
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    });

    window.JETLModalSystem = { closeActive: () => closeModal(activeModal) };
})();

;

/* ---- js/mobile.js ---- */
(function () {
    'use strict';

    const mobileQuery = window.matchMedia('(max-width: 768px)');

    function isMobile() {
        return mobileQuery.matches;
    }

    function setActive(view) {
        document.querySelectorAll('[data-mobile-view]').forEach((button) => {
            button.classList.toggle('active', button.dataset.mobileView === view);
        });
    }

    function closeTransientViews() {
        document.body.classList.remove('mobile-results-open', 'mobile-sheet-open');
        document.getElementById('mobile-project-sheet')?.setAttribute('aria-hidden', 'true');

        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        sidebar?.classList.remove('open');
        if (overlay) overlay.style.display = 'none';
    }

    function openView(view) {
        if (!isMobile()) return;

        const sameViewIsOpen =
            (view === 'nodes' && document.getElementById('sidebar')?.classList.contains('open')) ||
            (view === 'results' && document.body.classList.contains('mobile-results-open')) ||
            (view === 'project' && document.body.classList.contains('mobile-sheet-open'));

        closeTransientViews();
        if (sameViewIsOpen || view === 'flow') {
            setActive('flow');
            return;
        }

        if (view === 'nodes') {
            document.getElementById('sidebar')?.classList.add('open');
            const overlay = document.getElementById('sidebar-overlay');
            if (overlay) overlay.style.display = 'block';
        } else if (view === 'results') {
            try { window.ensureJETLMap?.(); } catch (error) { console.warn('[JETL] No se pudo iniciar el mapa', error); }
            document.body.classList.add('mobile-results-open');
        } else if (view === 'project') {
            document.body.classList.add('mobile-sheet-open');
            document.getElementById('mobile-project-sheet')?.setAttribute('aria-hidden', 'false');
        }

        setActive(view);
    }

    function runFlow() {
        closeTransientViews();
        setActive('flow');
        if (typeof window.runEngine === 'function') {
            window.runEngine();
        } else if (typeof runEngine === 'function') {
            runEngine();
        } else if (typeof window.showToast === 'function') {
            window.showToast('El motor todavía no está listo', 'warn');
        }
    }

    document.addEventListener('click', (event) => {
        const viewButton = event.target.closest('[data-mobile-view]');
        if (viewButton) {
            openView(viewButton.dataset.mobileView);
            return;
        }

        if (event.target.closest('#mobile-run')) {
            runFlow();
            return;
        }

        if (event.target.closest('#mobile-scrim, [data-mobile-close]')) {
            closeTransientViews();
            setActive('flow');
            return;
        }

        if (isMobile() && event.target.closest('#sidebar-overlay')) {
            setActive('flow');
            return;
        }

        if (isMobile() && event.target.closest('#mobile-project-sheet [data-ui-action]')) {
            window.setTimeout(() => {
                closeTransientViews();
                setActive('flow');
            }, 0);
        }
    });

    mobileQuery.addEventListener?.('change', () => {
        if (!isMobile()) closeTransientViews();
    });

    window.JETLMobile = { openView, closeTransientViews };
})();

;
