/* ---- js/vendor/drawflow.min.js ---- */
!function(e,t){"object"==typeof exports&&"object"==typeof module?module.exports=t():"function"==typeof define&&define.amd?define([],t):"object"==typeof exports?exports.Drawflow=t():e.Drawflow=t()}("undefined"!=typeof self?self:this,(function(){return function(e){var t={};function n(i){if(t[i])return t[i].exports;var s=t[i]={i:i,l:!1,exports:{}};return e[i].call(s.exports,s,s.exports,n),s.l=!0,s.exports}return n.m=e,n.c=t,n.d=function(e,t,i){n.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:i})},n.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},n.t=function(e,t){if(1&t&&(e=n(e)),8&t)return e;if(4&t&&"object"==typeof e&&e&&e.__esModule)return e;var i=Object.create(null);if(n.r(i),Object.defineProperty(i,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var s in e)n.d(i,s,function(t){return e[t]}.bind(null,s));return i},n.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return n.d(t,"a",t),t},n.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},n.p="",n(n.s=0)}([function(e,t,n){"use strict";n.r(t),n.d(t,"default",(function(){return i}));class i{constructor(e,t=null,n=null){this.events={},this.container=e,this.precanvas=null,this.nodeId=1,this.ele_selected=null,this.node_selected=null,this.drag=!1,this.reroute=!1,this.reroute_fix_curvature=!1,this.curvature=.5,this.reroute_curvature_start_end=.5,this.reroute_curvature=.5,this.reroute_width=6,this.drag_point=!1,this.editor_selected=!1,this.connection=!1,this.connection_ele=null,this.connection_selected=null,this.canvas_x=0,this.canvas_y=0,this.pos_x=0,this.pos_x_start=0,this.pos_y=0,this.pos_y_start=0,this.mouse_x=0,this.mouse_y=0,this.line_path=5,this.first_click=null,this.force_first_input=!1,this.draggable_inputs=!0,this.useuuid=!1,this.parent=n,this.noderegister={},this.render=t,this.drawflow={drawflow:{Home:{data:{}}}},this.module="Home",this.editor_mode="edit",this.zoom=1,this.zoom_max=1.6,this.zoom_min=.5,this.zoom_value=.1,this.zoom_last_value=1,this.evCache=new Array,this.prevDiff=-1}start(){this.container.classList.add("parent-drawflow"),this.container.tabIndex=0,this.precanvas=document.createElement("div"),this.precanvas.classList.add("drawflow"),this.container.appendChild(this.precanvas),this.container.addEventListener("mouseup",this.dragEnd.bind(this)),this.container.addEventListener("mousemove",this.position.bind(this)),this.container.addEventListener("mousedown",this.click.bind(this)),this.container.addEventListener("touchend",this.dragEnd.bind(this)),this.container.addEventListener("touchmove",this.position.bind(this)),this.container.addEventListener("touchstart",this.click.bind(this)),this.container.addEventListener("contextmenu",this.contextmenu.bind(this)),this.container.addEventListener("keydown",this.key.bind(this)),this.container.addEventListener("wheel",this.zoom_enter.bind(this)),this.container.addEventListener("input",this.updateNodeValue.bind(this)),this.container.addEventListener("dblclick",this.dblclick.bind(this)),this.container.onpointerdown=this.pointerdown_handler.bind(this),this.container.onpointermove=this.pointermove_handler.bind(this),this.container.onpointerup=this.pointerup_handler.bind(this),this.container.onpointercancel=this.pointerup_handler.bind(this),this.container.onpointerout=this.pointerup_handler.bind(this),this.container.onpointerleave=this.pointerup_handler.bind(this),this.load()}pointerdown_handler(e){this.evCache.push(e)}pointermove_handler(e){for(var t=0;t<this.evCache.length;t++)if(e.pointerId==this.evCache[t].pointerId){this.evCache[t]=e;break}if(2==this.evCache.length){var n=Math.abs(this.evCache[0].clientX-this.evCache[1].clientX);this.prevDiff>100&&(n>this.prevDiff&&this.zoom_in(),n<this.prevDiff&&this.zoom_out()),this.prevDiff=n}}pointerup_handler(e){this.remove_event(e),this.evCache.length<2&&(this.prevDiff=-1)}remove_event(e){for(var t=0;t<this.evCache.length;t++)if(this.evCache[t].pointerId==e.pointerId){this.evCache.splice(t,1);break}}load(){for(var e in this.drawflow.drawflow[this.module].data)this.addNodeImport(this.drawflow.drawflow[this.module].data[e],this.precanvas);if(this.reroute)for(var e in this.drawflow.drawflow[this.module].data)this.addRerouteImport(this.drawflow.drawflow[this.module].data[e]);for(var e in this.drawflow.drawflow[this.module].data)this.updateConnectionNodes("node-"+e);const t=this.drawflow.drawflow;let n=1;Object.keys(t).map((function(e,i){Object.keys(t[e].data).map((function(e,t){parseInt(e)>=n&&(n=parseInt(e)+1)}))})),this.nodeId=n}removeReouteConnectionSelected(){this.dispatch("connectionUnselected",!0),this.reroute_fix_curvature&&this.connection_selected.parentElement.querySelectorAll(".main-path").forEach((e,t)=>{e.classList.remove("selected")})}click(e){if(this.dispatch("click",e),"fixed"===this.editor_mode){if("parent-drawflow"!==e.target.classList[0]&&"drawflow"!==e.target.classList[0])return!1;this.ele_selected=e.target.closest(".parent-drawflow"),e.preventDefault()}else"view"===this.editor_mode?(null!=e.target.closest(".drawflow")||e.target.matches(".parent-drawflow"))&&(this.ele_selected=e.target.closest(".parent-drawflow"),e.preventDefault()):(this.first_click=e.target,this.ele_selected=e.target,0===e.button&&this.contextmenuDel(),null!=e.target.closest(".drawflow_content_node")&&(this.ele_selected=e.target.closest(".drawflow_content_node").parentElement));switch(this.ele_selected.classList[0]){case"drawflow-node":null!=this.node_selected&&(this.node_selected.classList.remove("selected"),this.node_selected!=this.ele_selected&&this.dispatch("nodeUnselected",!0)),null!=this.connection_selected&&(this.connection_selected.classList.remove("selected"),this.removeReouteConnectionSelected(),this.connection_selected=null),this.node_selected!=this.ele_selected&&this.dispatch("nodeSelected",this.ele_selected.id.slice(5)),this.node_selected=this.ele_selected,this.node_selected.classList.add("selected"),this.draggable_inputs?"SELECT"!==e.target.tagName&&(this.drag=!0):"INPUT"!==e.target.tagName&&"TEXTAREA"!==e.target.tagName&&"SELECT"!==e.target.tagName&&!0!==e.target.hasAttribute("contenteditable")&&(this.drag=!0);break;case"output":this.connection=!0,null!=this.node_selected&&(this.node_selected.classList.remove("selected"),this.node_selected=null,this.dispatch("nodeUnselected",!0)),null!=this.connection_selected&&(this.connection_selected.classList.remove("selected"),this.removeReouteConnectionSelected(),this.connection_selected=null),this.drawConnection(e.target);break;case"parent-drawflow":case"drawflow":null!=this.node_selected&&(this.node_selected.classList.remove("selected"),this.node_selected=null,this.dispatch("nodeUnselected",!0)),null!=this.connection_selected&&(this.connection_selected.classList.remove("selected"),this.removeReouteConnectionSelected(),this.connection_selected=null),this.editor_selected=!0;break;case"main-path":null!=this.node_selected&&(this.node_selected.classList.remove("selected"),this.node_selected=null,this.dispatch("nodeUnselected",!0)),null!=this.connection_selected&&(this.connection_selected.classList.remove("selected"),this.removeReouteConnectionSelected(),this.connection_selected=null),this.connection_selected=this.ele_selected,this.connection_selected.classList.add("selected");const t=this.connection_selected.parentElement.classList;t.length>1&&(this.dispatch("connectionSelected",{output_id:t[2].slice(14),input_id:t[1].slice(13),output_class:t[3],input_class:t[4]}),this.reroute_fix_curvature&&this.connection_selected.parentElement.querySelectorAll(".main-path").forEach((e,t)=>{e.classList.add("selected")}));break;case"point":this.drag_point=!0,this.ele_selected.classList.add("selected");break;case"drawflow-delete":this.node_selected&&this.removeNodeId(this.node_selected.id),this.connection_selected&&this.removeConnection(),null!=this.node_selected&&(this.node_selected.classList.remove("selected"),this.node_selected=null,this.dispatch("nodeUnselected",!0)),null!=this.connection_selected&&(this.connection_selected.classList.remove("selected"),this.removeReouteConnectionSelected(),this.connection_selected=null)}"touchstart"===e.type?(this.pos_x=e.touches[0].clientX,this.pos_x_start=e.touches[0].clientX,this.pos_y=e.touches[0].clientY,this.pos_y_start=e.touches[0].clientY,this.mouse_x=e.touches[0].clientX,this.mouse_y=e.touches[0].clientY):(this.pos_x=e.clientX,this.pos_x_start=e.clientX,this.pos_y=e.clientY,this.pos_y_start=e.clientY),["input","output","main-path"].includes(this.ele_selected.classList[0])&&e.preventDefault(),this.dispatch("clickEnd",e)}position(e){if("touchmove"===e.type)var t=e.touches[0].clientX,n=e.touches[0].clientY;else t=e.clientX,n=e.clientY;if(this.connection&&this.updateConnection(t,n),this.editor_selected&&(i=this.canvas_x+-(this.pos_x-t),s=this.canvas_y+-(this.pos_y-n),this.dispatch("translate",{x:i,y:s}),this.precanvas.style.transform="translate("+i+"px, "+s+"px) scale("+this.zoom+")"),this.drag){e.preventDefault();var i=(this.pos_x-t)*this.precanvas.clientWidth/(this.precanvas.clientWidth*this.zoom),s=(this.pos_y-n)*this.precanvas.clientHeight/(this.precanvas.clientHeight*this.zoom);this.pos_x=t,this.pos_y=n,this.ele_selected.style.top=this.ele_selected.offsetTop-s+"px",this.ele_selected.style.left=this.ele_selected.offsetLeft-i+"px",this.drawflow.drawflow[this.module].data[this.ele_selected.id.slice(5)].pos_x=this.ele_selected.offsetLeft-i,this.drawflow.drawflow[this.module].data[this.ele_selected.id.slice(5)].pos_y=this.ele_selected.offsetTop-s,this.updateConnectionNodes(this.ele_selected.id)}if(this.drag_point){i=(this.pos_x-t)*this.precanvas.clientWidth/(this.precanvas.clientWidth*this.zoom),s=(this.pos_y-n)*this.precanvas.clientHeight/(this.precanvas.clientHeight*this.zoom);this.pos_x=t,this.pos_y=n;var o=this.pos_x*(this.precanvas.clientWidth/(this.precanvas.clientWidth*this.zoom))-this.precanvas.getBoundingClientRect().x*(this.precanvas.clientWidth/(this.precanvas.clientWidth*this.zoom)),l=this.pos_y*(this.precanvas.clientHeight/(this.precanvas.clientHeight*this.zoom))-this.precanvas.getBoundingClientRect().y*(this.precanvas.clientHeight/(this.precanvas.clientHeight*this.zoom));this.ele_selected.setAttributeNS(null,"cx",o),this.ele_selected.setAttributeNS(null,"cy",l);const e=this.ele_selected.parentElement.classList[2].slice(9),c=this.ele_selected.parentElement.classList[1].slice(13),d=this.ele_selected.parentElement.classList[3],a=this.ele_selected.parentElement.classList[4];let r=Array.from(this.ele_selected.parentElement.children).indexOf(this.ele_selected)-1;if(this.reroute_fix_curvature){r-=this.ele_selected.parentElement.querySelectorAll(".main-path").length-1,r<0&&(r=0)}const h=e.slice(5),u=this.drawflow.drawflow[this.module].data[h].outputs[d].connections.findIndex((function(e,t){return e.node===c&&e.output===a}));this.drawflow.drawflow[this.module].data[h].outputs[d].connections[u].points[r]={pos_x:o,pos_y:l};const p=this.ele_selected.parentElement.classList[2].slice(9);this.updateConnectionNodes(p)}"touchmove"===e.type&&(this.mouse_x=t,this.mouse_y=n),this.dispatch("mouseMove",{x:t,y:n})}dragEnd(e){if("touchend"===e.type)var t=this.mouse_x,n=this.mouse_y,i=document.elementFromPoint(t,n);else t=e.clientX,n=e.clientY,i=e.target;if(this.drag&&(this.pos_x_start==t&&this.pos_y_start==n||this.dispatch("nodeMoved",this.ele_selected.id.slice(5))),this.drag_point&&(this.ele_selected.classList.remove("selected"),this.pos_x_start==t&&this.pos_y_start==n||this.dispatch("rerouteMoved",this.ele_selected.parentElement.classList[2].slice(14))),this.editor_selected&&(this.canvas_x=this.canvas_x+-(this.pos_x-t),this.canvas_y=this.canvas_y+-(this.pos_y-n),this.editor_selected=!1),!0===this.connection)if("input"===i.classList[0]||this.force_first_input&&(null!=i.closest(".drawflow_content_node")||"drawflow-node"===i.classList[0])){if(!this.force_first_input||null==i.closest(".drawflow_content_node")&&"drawflow-node"!==i.classList[0])s=i.parentElement.parentElement.id,o=i.classList[1];else{if(null!=i.closest(".drawflow_content_node"))var s=i.closest(".drawflow_content_node").parentElement.id;else var s=i.id;if(0===Object.keys(this.getNodeFromId(s.slice(5)).inputs).length)var o=!1;else var o="input_1"}var l=this.ele_selected.parentElement.parentElement.id,c=this.ele_selected.classList[1];if(l!==s&&!1!==o){if(0===this.container.querySelectorAll(".connection.node_in_"+s+".node_out_"+l+"."+c+"."+o).length){this.connection_ele.classList.add("node_in_"+s),this.connection_ele.classList.add("node_out_"+l),this.connection_ele.classList.add(c),this.connection_ele.classList.add(o);var d=s.slice(5),a=l.slice(5);this.drawflow.drawflow[this.module].data[a].outputs[c].connections.push({node:d,output:o}),this.drawflow.drawflow[this.module].data[d].inputs[o].connections.push({node:a,input:c}),this.updateConnectionNodes("node-"+a),this.updateConnectionNodes("node-"+d),this.dispatch("connectionCreated",{output_id:a,input_id:d,output_class:c,input_class:o})}else this.dispatch("connectionCancel",!0),this.connection_ele.remove();this.connection_ele=null}else this.dispatch("connectionCancel",!0),this.connection_ele.remove(),this.connection_ele=null}else this.dispatch("connectionCancel",!0),this.connection_ele.remove(),this.connection_ele=null;this.drag=!1,this.drag_point=!1,this.connection=!1,this.ele_selected=null,this.editor_selected=!1,this.dispatch("mouseUp",e)}contextmenu(e){if(this.dispatch("contextmenu",e),e.preventDefault(),"fixed"===this.editor_mode||"view"===this.editor_mode)return!1;if(this.precanvas.getElementsByClassName("drawflow-delete").length&&this.precanvas.getElementsByClassName("drawflow-delete")[0].remove(),this.node_selected||this.connection_selected){var t=document.createElement("div");t.classList.add("drawflow-delete"),t.innerHTML="x",this.node_selected&&this.node_selected.appendChild(t),this.connection_selected&&this.connection_selected.parentElement.classList.length>1&&(t.style.top=e.clientY*(this.precanvas.clientHeight/(this.precanvas.clientHeight*this.zoom))-this.precanvas.getBoundingClientRect().y*(this.precanvas.clientHeight/(this.precanvas.clientHeight*this.zoom))+"px",t.style.left=e.clientX*(this.precanvas.clientWidth/(this.precanvas.clientWidth*this.zoom))-this.precanvas.getBoundingClientRect().x*(this.precanvas.clientWidth/(this.precanvas.clientWidth*this.zoom))+"px",this.precanvas.appendChild(t))}}contextmenuDel(){this.precanvas.getElementsByClassName("drawflow-delete").length&&this.precanvas.getElementsByClassName("drawflow-delete")[0].remove()}key(e){if(this.dispatch("keydown",e),"fixed"===this.editor_mode||"view"===this.editor_mode)return!1;("Delete"===e.key||"Backspace"===e.key&&e.metaKey)&&(null!=this.node_selected&&"INPUT"!==this.first_click.tagName&&"TEXTAREA"!==this.first_click.tagName&&!0!==this.first_click.hasAttribute("contenteditable")&&this.removeNodeId(this.node_selected.id),null!=this.connection_selected&&this.removeConnection())}zoom_enter(e,t){e.ctrlKey&&(e.preventDefault(),e.deltaY>0?this.zoom_out():this.zoom_in())}zoom_refresh(){this.dispatch("zoom",this.zoom),this.canvas_x=this.canvas_x/this.zoom_last_value*this.zoom,this.canvas_y=this.canvas_y/this.zoom_last_value*this.zoom,this.zoom_last_value=this.zoom,this.precanvas.style.transform="translate("+this.canvas_x+"px, "+this.canvas_y+"px) scale("+this.zoom+")"}zoom_in(){this.zoom<this.zoom_max&&(this.zoom+=this.zoom_value,this.zoom_refresh())}zoom_out(){this.zoom>this.zoom_min&&(this.zoom-=this.zoom_value,this.zoom_refresh())}zoom_reset(){1!=this.zoom&&(this.zoom=1,this.zoom_refresh())}createCurvature(e,t,n,i,s,o){var l=e,c=t,d=n,a=i,r=s;switch(o){case"open":if(e>=n)var h=l+Math.abs(d-l)*r,u=d-Math.abs(d-l)*(-1*r);else h=l+Math.abs(d-l)*r,u=d-Math.abs(d-l)*r;return" M "+l+" "+c+" C "+h+" "+c+" "+u+" "+a+" "+d+"  "+a;case"close":if(e>=n)h=l+Math.abs(d-l)*(-1*r),u=d-Math.abs(d-l)*r;else h=l+Math.abs(d-l)*r,u=d-Math.abs(d-l)*r;return" M "+l+" "+c+" C "+h+" "+c+" "+u+" "+a+" "+d+"  "+a;case"other":if(e>=n)h=l+Math.abs(d-l)*(-1*r),u=d-Math.abs(d-l)*(-1*r);else h=l+Math.abs(d-l)*r,u=d-Math.abs(d-l)*r;return" M "+l+" "+c+" C "+h+" "+c+" "+u+" "+a+" "+d+"  "+a;default:return" M "+l+" "+c+" C "+(h=l+Math.abs(d-l)*r)+" "+c+" "+(u=d-Math.abs(d-l)*r)+" "+a+" "+d+"  "+a}}drawConnection(e){var t=document.createElementNS("http://www.w3.org/2000/svg","svg");this.connection_ele=t;var n=document.createElementNS("http://www.w3.org/2000/svg","path");n.classList.add("main-path"),n.setAttributeNS(null,"d",""),t.classList.add("connection"),t.appendChild(n),this.precanvas.appendChild(t);var i=e.parentElement.parentElement.id.slice(5),s=e.classList[1];this.dispatch("connectionStart",{output_id:i,output_class:s})}updateConnection(e,t){const n=this.precanvas,i=this.zoom;let s=n.clientWidth/(n.clientWidth*i);s=s||0;let o=n.clientHeight/(n.clientHeight*i);o=o||0;var l=this.connection_ele.children[0],c=this.ele_selected.offsetWidth/2+(this.ele_selected.getBoundingClientRect().x-n.getBoundingClientRect().x)*s,d=this.ele_selected.offsetHeight/2+(this.ele_selected.getBoundingClientRect().y-n.getBoundingClientRect().y)*o,a=e*(this.precanvas.clientWidth/(this.precanvas.clientWidth*this.zoom))-this.precanvas.getBoundingClientRect().x*(this.precanvas.clientWidth/(this.precanvas.clientWidth*this.zoom)),r=t*(this.precanvas.clientHeight/(this.precanvas.clientHeight*this.zoom))-this.precanvas.getBoundingClientRect().y*(this.precanvas.clientHeight/(this.precanvas.clientHeight*this.zoom)),h=this.curvature,u=this.createCurvature(c,d,a,r,h,"openclose");l.setAttributeNS(null,"d",u)}addConnection(e,t,n,i){var s=this.getModuleFromNodeId(e);if(s===this.getModuleFromNodeId(t)){var o=this.getNodeFromId(e),l=!1;for(var c in o.outputs[n].connections){var d=o.outputs[n].connections[c];d.node==t&&d.output==i&&(l=!0)}if(!1===l){if(this.drawflow.drawflow[s].data[e].outputs[n].connections.push({node:t.toString(),output:i}),this.drawflow.drawflow[s].data[t].inputs[i].connections.push({node:e.toString(),input:n}),this.module===s){var a=document.createElementNS("http://www.w3.org/2000/svg","svg"),r=document.createElementNS("http://www.w3.org/2000/svg","path");r.classList.add("main-path"),r.setAttributeNS(null,"d",""),a.classList.add("connection"),a.classList.add("node_in_node-"+t),a.classList.add("node_out_node-"+e),a.classList.add(n),a.classList.add(i),a.appendChild(r),this.precanvas.appendChild(a),this.updateConnectionNodes("node-"+e),this.updateConnectionNodes("node-"+t)}this.dispatch("connectionCreated",{output_id:e,input_id:t,output_class:n,input_class:i})}}}updateConnectionNodes(e){const t="node_in_"+e,n="node_out_"+e;this.line_path;const i=this.container,s=this.precanvas,o=this.curvature,l=this.createCurvature,c=this.reroute_curvature,d=this.reroute_curvature_start_end,a=this.reroute_fix_curvature,r=this.reroute_width,h=this.zoom;let u=s.clientWidth/(s.clientWidth*h);u=u||0;let p=s.clientHeight/(s.clientHeight*h);p=p||0;const f=i.querySelectorAll("."+n);Object.keys(f).map((function(t,n){if(null===f[t].querySelector(".point")){var m=i.querySelector("#"+e),g=f[t].classList[1].replace("node_in_",""),_=i.querySelector("#"+g).querySelectorAll("."+f[t].classList[4])[0],w=_.offsetWidth/2+(_.getBoundingClientRect().x-s.getBoundingClientRect().x)*u,v=_.offsetHeight/2+(_.getBoundingClientRect().y-s.getBoundingClientRect().y)*p,y=m.querySelectorAll("."+f[t].classList[3])[0],C=y.offsetWidth/2+(y.getBoundingClientRect().x-s.getBoundingClientRect().x)*u,x=y.offsetHeight/2+(y.getBoundingClientRect().y-s.getBoundingClientRect().y)*p;const n=l(C,x,w,v,o,"openclose");f[t].children[0].setAttributeNS(null,"d",n)}else{const n=f[t].querySelectorAll(".point");let o="";const m=[];n.forEach((t,a)=>{if(0===a&&n.length-1==0){var f=i.querySelector("#"+e),g=((x=t).getBoundingClientRect().x-s.getBoundingClientRect().x)*u+r,_=(x.getBoundingClientRect().y-s.getBoundingClientRect().y)*p+r,w=(L=f.querySelectorAll("."+t.parentElement.classList[3])[0]).offsetWidth/2+(L.getBoundingClientRect().x-s.getBoundingClientRect().x)*u,v=L.offsetHeight/2+(L.getBoundingClientRect().y-s.getBoundingClientRect().y)*p,y=l(w,v,g,_,d,"open");o+=y,m.push(y);f=t;var C=t.parentElement.classList[1].replace("node_in_",""),x=(E=i.querySelector("#"+C)).querySelectorAll("."+t.parentElement.classList[4])[0];g=(R=E.querySelectorAll("."+t.parentElement.classList[4])[0]).offsetWidth/2+(R.getBoundingClientRect().x-s.getBoundingClientRect().x)*u,_=R.offsetHeight/2+(R.getBoundingClientRect().y-s.getBoundingClientRect().y)*p,w=(f.getBoundingClientRect().x-s.getBoundingClientRect().x)*u+r,v=(f.getBoundingClientRect().y-s.getBoundingClientRect().y)*p+r,y=l(w,v,g,_,d,"close");o+=y,m.push(y)}else if(0===a){var L;f=i.querySelector("#"+e),g=((x=t).getBoundingClientRect().x-s.getBoundingClientRect().x)*u+r,_=(x.getBoundingClientRect().y-s.getBoundingClientRect().y)*p+r,w=(L=f.querySelectorAll("."+t.parentElement.classList[3])[0]).offsetWidth/2+(L.getBoundingClientRect().x-s.getBoundingClientRect().x)*u,v=L.offsetHeight/2+(L.getBoundingClientRect().y-s.getBoundingClientRect().y)*p,y=l(w,v,g,_,d,"open");o+=y,m.push(y);f=t,g=((x=n[a+1]).getBoundingClientRect().x-s.getBoundingClientRect().x)*u+r,_=(x.getBoundingClientRect().y-s.getBoundingClientRect().y)*p+r,w=(f.getBoundingClientRect().x-s.getBoundingClientRect().x)*u+r,v=(f.getBoundingClientRect().y-s.getBoundingClientRect().y)*p+r,y=l(w,v,g,_,c,"other");o+=y,m.push(y)}else if(a===n.length-1){var E,R;f=t,C=t.parentElement.classList[1].replace("node_in_",""),x=(E=i.querySelector("#"+C)).querySelectorAll("."+t.parentElement.classList[4])[0],g=(R=E.querySelectorAll("."+t.parentElement.classList[4])[0]).offsetWidth/2+(R.getBoundingClientRect().x-s.getBoundingClientRect().x)*u,_=R.offsetHeight/2+(R.getBoundingClientRect().y-s.getBoundingClientRect().y)*p,w=(f.getBoundingClientRect().x-s.getBoundingClientRect().x)*(s.clientWidth/(s.clientWidth*h))+r,v=(f.getBoundingClientRect().y-s.getBoundingClientRect().y)*(s.clientHeight/(s.clientHeight*h))+r,y=l(w,v,g,_,d,"close");o+=y,m.push(y)}else{f=t,g=((x=n[a+1]).getBoundingClientRect().x-s.getBoundingClientRect().x)*(s.clientWidth/(s.clientWidth*h))+r,_=(x.getBoundingClientRect().y-s.getBoundingClientRect().y)*(s.clientHeight/(s.clientHeight*h))+r,w=(f.getBoundingClientRect().x-s.getBoundingClientRect().x)*(s.clientWidth/(s.clientWidth*h))+r,v=(f.getBoundingClientRect().y-s.getBoundingClientRect().y)*(s.clientHeight/(s.clientHeight*h))+r,y=l(w,v,g,_,c,"other");o+=y,m.push(y)}}),a?m.forEach((e,n)=>{f[t].children[n].setAttributeNS(null,"d",e)}):f[t].children[0].setAttributeNS(null,"d",o)}}));const m=i.querySelectorAll("."+t);Object.keys(m).map((function(t,n){if(null===m[t].querySelector(".point")){var h=i.querySelector("#"+e),f=m[t].classList[2].replace("node_out_",""),g=i.querySelector("#"+f).querySelectorAll("."+m[t].classList[3])[0],_=g.offsetWidth/2+(g.getBoundingClientRect().x-s.getBoundingClientRect().x)*u,w=g.offsetHeight/2+(g.getBoundingClientRect().y-s.getBoundingClientRect().y)*p,v=(h=h.querySelectorAll("."+m[t].classList[4])[0]).offsetWidth/2+(h.getBoundingClientRect().x-s.getBoundingClientRect().x)*u,y=h.offsetHeight/2+(h.getBoundingClientRect().y-s.getBoundingClientRect().y)*p;const n=l(_,w,v,y,o,"openclose");m[t].children[0].setAttributeNS(null,"d",n)}else{const n=m[t].querySelectorAll(".point");let o="";const h=[];n.forEach((t,a)=>{if(0===a&&n.length-1==0){var f=i.querySelector("#"+e),m=((C=t).getBoundingClientRect().x-s.getBoundingClientRect().x)*u+r,g=(C.getBoundingClientRect().y-s.getBoundingClientRect().y)*p+r,_=(E=f.querySelectorAll("."+t.parentElement.classList[4])[0]).offsetWidth/2+(E.getBoundingClientRect().x-s.getBoundingClientRect().x)*u,w=E.offsetHeight/2+(E.getBoundingClientRect().y-s.getBoundingClientRect().y)*p,v=l(m,g,_,w,d,"close");o+=v,h.push(v);f=t;var y=t.parentElement.classList[2].replace("node_out_",""),C=(L=i.querySelector("#"+y)).querySelectorAll("."+t.parentElement.classList[3])[0];m=(x=L.querySelectorAll("."+t.parentElement.classList[3])[0]).offsetWidth/2+(x.getBoundingClientRect().x-s.getBoundingClientRect().x)*u,g=x.offsetHeight/2+(x.getBoundingClientRect().y-s.getBoundingClientRect().y)*p,_=(f.getBoundingClientRect().x-s.getBoundingClientRect().x)*u+r,w=(f.getBoundingClientRect().y-s.getBoundingClientRect().y)*p+r,v=l(m,g,_,w,d,"open");o+=v,h.push(v)}else if(0===a){var x;f=t,y=t.parentElement.classList[2].replace("node_out_",""),C=(L=i.querySelector("#"+y)).querySelectorAll("."+t.parentElement.classList[3])[0],m=(x=L.querySelectorAll("."+t.parentElement.classList[3])[0]).offsetWidth/2+(x.getBoundingClientRect().x-s.getBoundingClientRect().x)*u,g=x.offsetHeight/2+(x.getBoundingClientRect().y-s.getBoundingClientRect().y)*p,_=(f.getBoundingClientRect().x-s.getBoundingClientRect().x)*u+r,w=(f.getBoundingClientRect().y-s.getBoundingClientRect().y)*p+r,v=l(m,g,_,w,d,"open");o+=v,h.push(v);f=t,_=((C=n[a+1]).getBoundingClientRect().x-s.getBoundingClientRect().x)*u+r,w=(C.getBoundingClientRect().y-s.getBoundingClientRect().y)*p+r,m=(f.getBoundingClientRect().x-s.getBoundingClientRect().x)*u+r,g=(f.getBoundingClientRect().y-s.getBoundingClientRect().y)*p+r,v=l(m,g,_,w,c,"other");o+=v,h.push(v)}else if(a===n.length-1){var L,E;f=t,y=t.parentElement.classList[1].replace("node_in_",""),C=(L=i.querySelector("#"+y)).querySelectorAll("."+t.parentElement.classList[4])[0],_=(E=L.querySelectorAll("."+t.parentElement.classList[4])[0]).offsetWidth/2+(E.getBoundingClientRect().x-s.getBoundingClientRect().x)*u,w=E.offsetHeight/2+(E.getBoundingClientRect().y-s.getBoundingClientRect().y)*p,m=(f.getBoundingClientRect().x-s.getBoundingClientRect().x)*u+r,g=(f.getBoundingClientRect().y-s.getBoundingClientRect().y)*p+r,v=l(m,g,_,w,d,"close");o+=v,h.push(v)}else{f=t,_=((C=n[a+1]).getBoundingClientRect().x-s.getBoundingClientRect().x)*u+r,w=(C.getBoundingClientRect().y-s.getBoundingClientRect().y)*p+r,m=(f.getBoundingClientRect().x-s.getBoundingClientRect().x)*u+r,g=(f.getBoundingClientRect().y-s.getBoundingClientRect().y)*p+r,v=l(m,g,_,w,c,"other");o+=v,h.push(v)}}),a?h.forEach((e,n)=>{m[t].children[n].setAttributeNS(null,"d",e)}):m[t].children[0].setAttributeNS(null,"d",o)}}))}dblclick(e){null!=this.connection_selected&&this.reroute&&this.createReroutePoint(this.connection_selected),"point"===e.target.classList[0]&&this.removeReroutePoint(e.target)}createReroutePoint(e){this.connection_selected.classList.remove("selected");const t=this.connection_selected.parentElement.classList[2].slice(9),n=this.connection_selected.parentElement.classList[1].slice(13),i=this.connection_selected.parentElement.classList[3],s=this.connection_selected.parentElement.classList[4];this.connection_selected=null;const o=document.createElementNS("http://www.w3.org/2000/svg","circle");o.classList.add("point");var l=this.pos_x*(this.precanvas.clientWidth/(this.precanvas.clientWidth*this.zoom))-this.precanvas.getBoundingClientRect().x*(this.precanvas.clientWidth/(this.precanvas.clientWidth*this.zoom)),c=this.pos_y*(this.precanvas.clientHeight/(this.precanvas.clientHeight*this.zoom))-this.precanvas.getBoundingClientRect().y*(this.precanvas.clientHeight/(this.precanvas.clientHeight*this.zoom));o.setAttributeNS(null,"cx",l),o.setAttributeNS(null,"cy",c),o.setAttributeNS(null,"r",this.reroute_width);let d=0;if(this.reroute_fix_curvature){const t=e.parentElement.querySelectorAll(".main-path").length;var a=document.createElementNS("http://www.w3.org/2000/svg","path");if(a.classList.add("main-path"),a.setAttributeNS(null,"d",""),e.parentElement.insertBefore(a,e.parentElement.children[t]),1===t)e.parentElement.appendChild(o);else{const n=Array.from(e.parentElement.children).indexOf(e);d=n,e.parentElement.insertBefore(o,e.parentElement.children[n+t+1])}}else e.parentElement.appendChild(o);const r=t.slice(5),h=this.drawflow.drawflow[this.module].data[r].outputs[i].connections.findIndex((function(e,t){return e.node===n&&e.output===s}));void 0===this.drawflow.drawflow[this.module].data[r].outputs[i].connections[h].points&&(this.drawflow.drawflow[this.module].data[r].outputs[i].connections[h].points=[]),this.reroute_fix_curvature?(d>0||this.drawflow.drawflow[this.module].data[r].outputs[i].connections[h].points!==[]?this.drawflow.drawflow[this.module].data[r].outputs[i].connections[h].points.splice(d,0,{pos_x:l,pos_y:c}):this.drawflow.drawflow[this.module].data[r].outputs[i].connections[h].points.push({pos_x:l,pos_y:c}),e.parentElement.querySelectorAll(".main-path").forEach((e,t)=>{e.classList.remove("selected")})):this.drawflow.drawflow[this.module].data[r].outputs[i].connections[h].points.push({pos_x:l,pos_y:c}),this.dispatch("addReroute",r),this.updateConnectionNodes(t)}removeReroutePoint(e){const t=e.parentElement.classList[2].slice(9),n=e.parentElement.classList[1].slice(13),i=e.parentElement.classList[3],s=e.parentElement.classList[4];let o=Array.from(e.parentElement.children).indexOf(e);const l=t.slice(5),c=this.drawflow.drawflow[this.module].data[l].outputs[i].connections.findIndex((function(e,t){return e.node===n&&e.output===s}));if(this.reroute_fix_curvature){const t=e.parentElement.querySelectorAll(".main-path").length;e.parentElement.children[t-1].remove(),o-=t,o<0&&(o=0)}else o--;this.drawflow.drawflow[this.module].data[l].outputs[i].connections[c].points.splice(o,1),e.remove(),this.dispatch("removeReroute",l),this.updateConnectionNodes(t)}registerNode(e,t,n=null,i=null){this.noderegister[e]={html:t,props:n,options:i}}getNodeFromId(e){var t=this.getModuleFromNodeId(e);return JSON.parse(JSON.stringify(this.drawflow.drawflow[t].data[e]))}getNodesFromName(e){var t=[];const n=this.drawflow.drawflow;return Object.keys(n).map((function(i,s){for(var o in n[i].data)n[i].data[o].name==e&&t.push(n[i].data[o].id)})),t}addNode(e,t,n,i,s,o,l,c,d=!1){if(this.useuuid)var a=this.getUuid();else a=this.nodeId;const r=document.createElement("div");r.classList.add("parent-node");const h=document.createElement("div");h.innerHTML="",h.setAttribute("id","node-"+a),h.classList.add("drawflow-node"),""!=o&&h.classList.add(...o.split(" "));const u=document.createElement("div");u.classList.add("inputs");const p=document.createElement("div");p.classList.add("outputs");const f={};for(var m=0;m<t;m++){const e=document.createElement("div");e.classList.add("input"),e.classList.add("input_"+(m+1)),f["input_"+(m+1)]={connections:[]},u.appendChild(e)}const g={};for(m=0;m<n;m++){const e=document.createElement("div");e.classList.add("output"),e.classList.add("output_"+(m+1)),g["output_"+(m+1)]={connections:[]},p.appendChild(e)}const _=document.createElement("div");if(_.classList.add("drawflow_content_node"),!1===d)_.innerHTML=c;else if(!0===d)_.appendChild(this.noderegister[c].html.cloneNode(!0));else if(3===parseInt(this.render.version)){let e=this.render.h(this.noderegister[c].html,this.noderegister[c].props,this.noderegister[c].options);e.appContext=this.parent,this.render.render(e,_)}else{let e=new this.render({parent:this.parent,render:e=>e(this.noderegister[c].html,{props:this.noderegister[c].props}),...this.noderegister[c].options}).$mount();_.appendChild(e.$el)}Object.entries(l).forEach((function(e,t){if("object"==typeof e[1])!function e(t,n,i){if(null===t)t=l[n];else t=t[n];null!==t&&Object.entries(t).forEach((function(n,s){if("object"==typeof n[1])e(t,n[0],i+"-"+n[0]);else for(var o=_.querySelectorAll("[df-"+i+"-"+n[0]+"]"),l=0;l<o.length;l++)o[l].value=n[1],o[l].isContentEditable&&(o[l].innerText=n[1])}))}(null,e[0],e[0]);else for(var n=_.querySelectorAll("[df-"+e[0]+"]"),i=0;i<n.length;i++)n[i].value=e[1],n[i].isContentEditable&&(n[i].innerText=e[1])})),h.appendChild(u),h.appendChild(_),h.appendChild(p),h.style.top=s+"px",h.style.left=i+"px",r.appendChild(h),this.precanvas.appendChild(r);var w={id:a,name:e,data:l,class:o,html:c,typenode:d,inputs:f,outputs:g,pos_x:i,pos_y:s};return this.drawflow.drawflow[this.module].data[a]=w,this.dispatch("nodeCreated",a),this.useuuid||this.nodeId++,a}addNodeImport(e,t){const n=document.createElement("div");n.classList.add("parent-node");const i=document.createElement("div");i.innerHTML="",i.setAttribute("id","node-"+e.id),i.classList.add("drawflow-node"),""!=e.class&&i.classList.add(...e.class.split(" "));const s=document.createElement("div");s.classList.add("inputs");const o=document.createElement("div");o.classList.add("outputs"),Object.keys(e.inputs).map((function(n,i){const o=document.createElement("div");o.classList.add("input"),o.classList.add(n),s.appendChild(o),Object.keys(e.inputs[n].connections).map((function(i,s){var o=document.createElementNS("http://www.w3.org/2000/svg","svg"),l=document.createElementNS("http://www.w3.org/2000/svg","path");l.classList.add("main-path"),l.setAttributeNS(null,"d",""),o.classList.add("connection"),o.classList.add("node_in_node-"+e.id),o.classList.add("node_out_node-"+e.inputs[n].connections[i].node),o.classList.add(e.inputs[n].connections[i].input),o.classList.add(n),o.appendChild(l),t.appendChild(o)}))}));for(var l=0;l<Object.keys(e.outputs).length;l++){const e=document.createElement("div");e.classList.add("output"),e.classList.add("output_"+(l+1)),o.appendChild(e)}const c=document.createElement("div");if(c.classList.add("drawflow_content_node"),!1===e.typenode)c.innerHTML=e.html;else if(!0===e.typenode)c.appendChild(this.noderegister[e.html].html.cloneNode(!0));else if(3===parseInt(this.render.version)){let t=this.render.h(this.noderegister[e.html].html,this.noderegister[e.html].props,this.noderegister[e.html].options);t.appContext=this.parent,this.render.render(t,c)}else{let t=new this.render({parent:this.parent,render:t=>t(this.noderegister[e.html].html,{props:this.noderegister[e.html].props}),...this.noderegister[e.html].options}).$mount();c.appendChild(t.$el)}Object.entries(e.data).forEach((function(t,n){if("object"==typeof t[1])!function t(n,i,s){if(null===n)n=e.data[i];else n=n[i];null!==n&&Object.entries(n).forEach((function(e,i){if("object"==typeof e[1])t(n,e[0],s+"-"+e[0]);else for(var o=c.querySelectorAll("[df-"+s+"-"+e[0]+"]"),l=0;l<o.length;l++)o[l].value=e[1],o[l].isContentEditable&&(o[l].innerText=e[1])}))}(null,t[0],t[0]);else for(var i=c.querySelectorAll("[df-"+t[0]+"]"),s=0;s<i.length;s++)i[s].value=t[1],i[s].isContentEditable&&(i[s].innerText=t[1])})),i.appendChild(s),i.appendChild(c),i.appendChild(o),i.style.top=e.pos_y+"px",i.style.left=e.pos_x+"px",n.appendChild(i),this.precanvas.appendChild(n)}addRerouteImport(e){const t=this.reroute_width,n=this.reroute_fix_curvature,i=this.container;Object.keys(e.outputs).map((function(s,o){Object.keys(e.outputs[s].connections).map((function(o,l){const c=e.outputs[s].connections[o].points;void 0!==c&&c.forEach((l,d)=>{const a=e.outputs[s].connections[o].node,r=e.outputs[s].connections[o].output,h=i.querySelector(".connection.node_in_node-"+a+".node_out_node-"+e.id+"."+s+"."+r);if(n&&0===d)for(var u=0;u<c.length;u++){var p=document.createElementNS("http://www.w3.org/2000/svg","path");p.classList.add("main-path"),p.setAttributeNS(null,"d",""),h.appendChild(p)}const f=document.createElementNS("http://www.w3.org/2000/svg","circle");f.classList.add("point");var m=l.pos_x,g=l.pos_y;f.setAttributeNS(null,"cx",m),f.setAttributeNS(null,"cy",g),f.setAttributeNS(null,"r",t),h.appendChild(f)})}))}))}updateNodeValue(e){for(var t=e.target.attributes,n=0;n<t.length;n++)if(t[n].nodeName.startsWith("df-")){for(var i=t[n].nodeName.slice(3).split("-"),s=this.drawflow.drawflow[this.module].data[e.target.closest(".drawflow_content_node").parentElement.id.slice(5)].data,o=0;o<i.length-1;o+=1)null==s[i[o]]&&(s[i[o]]={}),s=s[i[o]];s[i[i.length-1]]=e.target.value,e.target.isContentEditable&&(s[i[i.length-1]]=e.target.innerText),this.dispatch("nodeDataChanged",e.target.closest(".drawflow_content_node").parentElement.id.slice(5))}}updateNodeDataFromId(e,t){var n=this.getModuleFromNodeId(e);if(this.drawflow.drawflow[n].data[e].data=t,this.module===n){const n=this.container.querySelector("#node-"+e);Object.entries(t).forEach((function(e,i){if("object"==typeof e[1])!function e(i,s,o){if(null===i)i=t[s];else i=i[s];null!==i&&Object.entries(i).forEach((function(t,s){if("object"==typeof t[1])e(i,t[0],o+"-"+t[0]);else for(var l=n.querySelectorAll("[df-"+o+"-"+t[0]+"]"),c=0;c<l.length;c++)l[c].value=t[1],l[c].isContentEditable&&(l[c].innerText=t[1])}))}(null,e[0],e[0]);else for(var s=n.querySelectorAll("[df-"+e[0]+"]"),o=0;o<s.length;o++)s[o].value=e[1],s[o].isContentEditable&&(s[o].innerText=e[1])}))}}addNodeInput(e){var t=this.getModuleFromNodeId(e);const n=this.getNodeFromId(e),i=Object.keys(n.inputs).length;if(this.module===t){const t=document.createElement("div");t.classList.add("input"),t.classList.add("input_"+(i+1));this.container.querySelector("#node-"+e+" .inputs").appendChild(t),this.updateConnectionNodes("node-"+e)}this.drawflow.drawflow[t].data[e].inputs["input_"+(i+1)]={connections:[]}}addNodeOutput(e){var t=this.getModuleFromNodeId(e);const n=this.getNodeFromId(e),i=Object.keys(n.outputs).length;if(this.module===t){const t=document.createElement("div");t.classList.add("output"),t.classList.add("output_"+(i+1));this.container.querySelector("#node-"+e+" .outputs").appendChild(t),this.updateConnectionNodes("node-"+e)}this.drawflow.drawflow[t].data[e].outputs["output_"+(i+1)]={connections:[]}}removeNodeInput(e,t){var n=this.getModuleFromNodeId(e);const i=this.getNodeFromId(e);this.module===n&&this.container.querySelector("#node-"+e+" .inputs .input."+t).remove();const s=[];Object.keys(i.inputs[t].connections).map((function(n,o){const l=i.inputs[t].connections[o].node,c=i.inputs[t].connections[o].input;s.push({id_output:l,id:e,output_class:c,input_class:t})})),s.forEach((e,t)=>{this.removeSingleConnection(e.id_output,e.id,e.output_class,e.input_class)}),delete this.drawflow.drawflow[n].data[e].inputs[t];const o=[],l=this.drawflow.drawflow[n].data[e].inputs;Object.keys(l).map((function(e,t){o.push(l[e])})),this.drawflow.drawflow[n].data[e].inputs={};const c=t.slice(6);let d=[];if(o.forEach((t,i)=>{t.connections.forEach((e,t)=>{d.push(e)}),this.drawflow.drawflow[n].data[e].inputs["input_"+(i+1)]=t}),d=new Set(d.map(e=>JSON.stringify(e))),d=Array.from(d).map(e=>JSON.parse(e)),this.module===n){this.container.querySelectorAll("#node-"+e+" .inputs .input").forEach((e,t)=>{const n=e.classList[1].slice(6);parseInt(c)<parseInt(n)&&(e.classList.remove("input_"+n),e.classList.add("input_"+(n-1)))})}d.forEach((t,i)=>{this.drawflow.drawflow[n].data[t.node].outputs[t.input].connections.forEach((i,s)=>{if(i.node==e){const o=i.output.slice(6);if(parseInt(c)<parseInt(o)){if(this.module===n){const n=this.container.querySelector(".connection.node_in_node-"+e+".node_out_node-"+t.node+"."+t.input+".input_"+o);n.classList.remove("input_"+o),n.classList.add("input_"+(o-1))}i.points?this.drawflow.drawflow[n].data[t.node].outputs[t.input].connections[s]={node:i.node,output:"input_"+(o-1),points:i.points}:this.drawflow.drawflow[n].data[t.node].outputs[t.input].connections[s]={node:i.node,output:"input_"+(o-1)}}}})}),this.updateConnectionNodes("node-"+e)}removeNodeOutput(e,t){var n=this.getModuleFromNodeId(e);const i=this.getNodeFromId(e);this.module===n&&this.container.querySelector("#node-"+e+" .outputs .output."+t).remove();const s=[];Object.keys(i.outputs[t].connections).map((function(n,o){const l=i.outputs[t].connections[o].node,c=i.outputs[t].connections[o].output;s.push({id:e,id_input:l,output_class:t,input_class:c})})),s.forEach((e,t)=>{this.removeSingleConnection(e.id,e.id_input,e.output_class,e.input_class)}),delete this.drawflow.drawflow[n].data[e].outputs[t];const o=[],l=this.drawflow.drawflow[n].data[e].outputs;Object.keys(l).map((function(e,t){o.push(l[e])})),this.drawflow.drawflow[n].data[e].outputs={};const c=t.slice(7);let d=[];if(o.forEach((t,i)=>{t.connections.forEach((e,t)=>{d.push({node:e.node,output:e.output})}),this.drawflow.drawflow[n].data[e].outputs["output_"+(i+1)]=t}),d=new Set(d.map(e=>JSON.stringify(e))),d=Array.from(d).map(e=>JSON.parse(e)),this.module===n){this.container.querySelectorAll("#node-"+e+" .outputs .output").forEach((e,t)=>{const n=e.classList[1].slice(7);parseInt(c)<parseInt(n)&&(e.classList.remove("output_"+n),e.classList.add("output_"+(n-1)))})}d.forEach((t,i)=>{this.drawflow.drawflow[n].data[t.node].inputs[t.output].connections.forEach((i,s)=>{if(i.node==e){const o=i.input.slice(7);if(parseInt(c)<parseInt(o)){if(this.module===n){const n=this.container.querySelector(".connection.node_in_node-"+t.node+".node_out_node-"+e+".output_"+o+"."+t.output);n.classList.remove("output_"+o),n.classList.remove(t.output),n.classList.add("output_"+(o-1)),n.classList.add(t.output)}i.points?this.drawflow.drawflow[n].data[t.node].inputs[t.output].connections[s]={node:i.node,input:"output_"+(o-1),points:i.points}:this.drawflow.drawflow[n].data[t.node].inputs[t.output].connections[s]={node:i.node,input:"output_"+(o-1)}}}})}),this.updateConnectionNodes("node-"+e)}removeNodeId(e){this.removeConnectionNodeId(e);var t=this.getModuleFromNodeId(e.slice(5));this.module===t&&this.container.querySelector("#"+e).remove(),delete this.drawflow.drawflow[t].data[e.slice(5)],this.dispatch("nodeRemoved",e.slice(5))}removeConnection(){if(null!=this.connection_selected){var e=this.connection_selected.parentElement.classList;this.connection_selected.parentElement.remove();var t=this.drawflow.drawflow[this.module].data[e[2].slice(14)].outputs[e[3]].connections.findIndex((function(t,n){return t.node===e[1].slice(13)&&t.output===e[4]}));this.drawflow.drawflow[this.module].data[e[2].slice(14)].outputs[e[3]].connections.splice(t,1);var n=this.drawflow.drawflow[this.module].data[e[1].slice(13)].inputs[e[4]].connections.findIndex((function(t,n){return t.node===e[2].slice(14)&&t.input===e[3]}));this.drawflow.drawflow[this.module].data[e[1].slice(13)].inputs[e[4]].connections.splice(n,1),this.dispatch("connectionRemoved",{output_id:e[2].slice(14),input_id:e[1].slice(13),output_class:e[3],input_class:e[4]}),this.connection_selected=null}}removeSingleConnection(e,t,n,i){var s=this.getModuleFromNodeId(e);if(s===this.getModuleFromNodeId(t)){if(this.drawflow.drawflow[s].data[e].outputs[n].connections.findIndex((function(e,n){return e.node==t&&e.output===i}))>-1){this.module===s&&this.container.querySelector(".connection.node_in_node-"+t+".node_out_node-"+e+"."+n+"."+i).remove();var o=this.drawflow.drawflow[s].data[e].outputs[n].connections.findIndex((function(e,n){return e.node==t&&e.output===i}));this.drawflow.drawflow[s].data[e].outputs[n].connections.splice(o,1);var l=this.drawflow.drawflow[s].data[t].inputs[i].connections.findIndex((function(t,i){return t.node==e&&t.input===n}));return this.drawflow.drawflow[s].data[t].inputs[i].connections.splice(l,1),this.dispatch("connectionRemoved",{output_id:e,input_id:t,output_class:n,input_class:i}),!0}return!1}return!1}removeConnectionNodeId(e){const t="node_in_"+e,n="node_out_"+e,i=this.container.querySelectorAll("."+n);for(var s=i.length-1;s>=0;s--){var o=i[s].classList,l=this.drawflow.drawflow[this.module].data[o[1].slice(13)].inputs[o[4]].connections.findIndex((function(e,t){return e.node===o[2].slice(14)&&e.input===o[3]}));this.drawflow.drawflow[this.module].data[o[1].slice(13)].inputs[o[4]].connections.splice(l,1);var c=this.drawflow.drawflow[this.module].data[o[2].slice(14)].outputs[o[3]].connections.findIndex((function(e,t){return e.node===o[1].slice(13)&&e.output===o[4]}));this.drawflow.drawflow[this.module].data[o[2].slice(14)].outputs[o[3]].connections.splice(c,1),i[s].remove(),this.dispatch("connectionRemoved",{output_id:o[2].slice(14),input_id:o[1].slice(13),output_class:o[3],input_class:o[4]})}const d=this.container.querySelectorAll("."+t);for(s=d.length-1;s>=0;s--){o=d[s].classList,c=this.drawflow.drawflow[this.module].data[o[2].slice(14)].outputs[o[3]].connections.findIndex((function(e,t){return e.node===o[1].slice(13)&&e.output===o[4]}));this.drawflow.drawflow[this.module].data[o[2].slice(14)].outputs[o[3]].connections.splice(c,1);l=this.drawflow.drawflow[this.module].data[o[1].slice(13)].inputs[o[4]].connections.findIndex((function(e,t){return e.node===o[2].slice(14)&&e.input===o[3]}));this.drawflow.drawflow[this.module].data[o[1].slice(13)].inputs[o[4]].connections.splice(l,1),d[s].remove(),this.dispatch("connectionRemoved",{output_id:o[2].slice(14),input_id:o[1].slice(13),output_class:o[3],input_class:o[4]})}}getModuleFromNodeId(e){var t;const n=this.drawflow.drawflow;return Object.keys(n).map((function(i,s){Object.keys(n[i].data).map((function(n,s){n==e&&(t=i)}))})),t}addModule(e){this.drawflow.drawflow[e]={data:{}},this.dispatch("moduleCreated",e)}changeModule(e){this.dispatch("moduleChanged",e),this.module=e,this.precanvas.innerHTML="",this.canvas_x=0,this.canvas_y=0,this.pos_x=0,this.pos_y=0,this.mouse_x=0,this.mouse_y=0,this.zoom=1,this.zoom_last_value=1,this.precanvas.style.transform="",this.import(this.drawflow,!1)}removeModule(e){this.module===e&&this.changeModule("Home"),delete this.drawflow.drawflow[e],this.dispatch("moduleRemoved",e)}clearModuleSelected(){this.precanvas.innerHTML="",this.drawflow.drawflow[this.module]={data:{}}}clear(){this.precanvas.innerHTML="",this.drawflow={drawflow:{Home:{data:{}}}}}export(){const e=JSON.parse(JSON.stringify(this.drawflow));return this.dispatch("export",e),e}import(e,t=!0){this.clear(),this.drawflow=JSON.parse(JSON.stringify(e)),this.load(),t&&this.dispatch("import","import")}on(e,t){return"function"!=typeof t?(console.error("The listener callback must be a function, the given type is "+typeof t),!1):"string"!=typeof e?(console.error("The event name must be a string, the given type is "+typeof e),!1):(void 0===this.events[e]&&(this.events[e]={listeners:[]}),void this.events[e].listeners.push(t))}removeListener(e,t){if(!this.events[e])return!1;const n=this.events[e].listeners,i=n.indexOf(t);i>-1&&n.splice(i,1)}dispatch(e,t){if(void 0===this.events[e])return!1;this.events[e].listeners.forEach(e=>{e(t)})}getUuid(){for(var e=[],t=0;t<36;t++)e[t]="0123456789abcdef".substr(Math.floor(16*Math.random()),1);return e[14]="4",e[19]="0123456789abcdef".substr(3&e[19]|8,1),e[8]=e[13]=e[18]=e[23]="-",e.join("")}}}]).default}));

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
