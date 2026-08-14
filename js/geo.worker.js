const GEO_WORKER_LIBS = { turf: false, jsts: false, rbush: false, proj4: false, geotiff: false, geoblaze: false };

try {
    importScripts('vendor/turf.min.js');
    GEO_WORKER_LIBS.turf = true;
} catch (e) {
    console.error('[geo.worker] import turf failed', e);
}
try {
    importScripts('vendor/jsts.min.js');
    GEO_WORKER_LIBS.jsts = true;
} catch (e) {
    console.error('[geo.worker] import jsts failed', e);
}
try {
    importScripts('vendor/rbush.min.js');
    GEO_WORKER_LIBS.rbush = true;
} catch (e) {
    console.error('[geo.worker] import rbush failed', e);
}
try {
    importScripts('vendor/proj4.js');
    GEO_WORKER_LIBS.proj4 = true;
} catch (e) {
    console.error('[geo.worker] import proj4 failed', e);
}
try {
    importScripts('vendor/geotiff.js');
    GEO_WORKER_LIBS.geotiff = true;
} catch (e) {
    console.error('[geo.worker] import geotiff failed', e);
}
try {
    importScripts('vendor/geoblaze.web.min.js');
    GEO_WORKER_LIBS.geoblaze = true;
} catch (e) {
    console.error('[geo.worker] import geoblaze failed', e);
}
console.log(`[geo.worker] libs turf=${GEO_WORKER_LIBS.turf} jsts=${GEO_WORKER_LIBS.jsts} rbush=${GEO_WORKER_LIBS.rbush} proj4=${GEO_WORKER_LIBS.proj4} geotiff=${GEO_WORKER_LIBS.geotiff} geoblaze=${GEO_WORKER_LIBS.geoblaze}`);

function cloneFast(value) {
    if (value === null || value === undefined) return value;
    if (typeof structuredClone === 'function') {
        try { return structuredClone(value); } catch (e) {}
    }
    const refs = new Map();
    const cloneFallback = (v) => {
        if (v === null || v === undefined) return v;
        const t = typeof v;
        if (t !== 'object') return v;
        if (v instanceof Date) return new Date(v.getTime());
        if (v instanceof RegExp) return new RegExp(v.source, v.flags);
        if (v instanceof ArrayBuffer) return v.slice(0);
        if (ArrayBuffer.isView(v)) {
            if (typeof v.slice === 'function') return v.slice(0);
            return new v.constructor(v);
        }
        if (refs.has(v)) return refs.get(v);
        if (Array.isArray(v)) {
            const outArr = new Array(v.length);
            refs.set(v, outArr);
            for (let i = 0; i < v.length; i++) outArr[i] = cloneFallback(v[i]);
            return outArr;
        }
        const out = {};
        refs.set(v, out);
        Object.keys(v).forEach((k) => { out[k] = cloneFallback(v[k]); });
        return out;
    };
    return cloneFallback(value);
}

const SAFE_EXPR_MAX_LEN = 500;
const SAFE_EXPR_BLOCKLIST = [
    /\b(?:window|document|globalThis|self|Function|eval|fetch|XMLHttpRequest|localStorage|sessionStorage|indexedDB|caches|navigator|location)\b/i,
    /(?:__proto__|prototype|constructor)/i,
    /\b(?:import|export)\b/i
];

function validateSafeExpression(expr) {
    const source = String(expr || '').trim();
    if (!source) throw new Error('Expresion vacia');
    if (source.length > SAFE_EXPR_MAX_LEN) throw new Error(`Expresion demasiado larga (max ${SAFE_EXPR_MAX_LEN} chars)`);
    for (let i = 0; i < SAFE_EXPR_BLOCKLIST.length; i++) {
        if (SAFE_EXPR_BLOCKLIST[i].test(source)) throw new Error('Expresion bloqueada por seguridad');
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

const KNOWN_CRS = {
    'EPSG:25830': '+proj=utm +zone=30 +ellps=GRS80 +units=m +no_defs +type=crs',
    'EPSG:23030': '+proj=utm +zone=30 +ellps=intl +towgs84=-87,-98,-121,0,0,0,0 +units=m +no_defs +type=crs'
};

self.onmessage = async function(e) {
    const msg = e.data;
    if (!msg || !msg.task) return;
    if (msg.task === 'worker_health') {
        self.postMessage({ taskId: msg.taskId, status: 'ok', data: { ...GEO_WORKER_LIBS } });
        return;
    }

    // --- TAREA: MIN AREA SOLVER ---
    if (msg.task === 'min_area_solver') {
        try {
            const features = msg.features; 
            const thresholdSqM = msg.thresholdSqM;
            const mode = msg.mode;

            const items = features.features.map((f, i) => {
                const area = turf.area(f);
                const bbox = turf.bbox(f);
                return {
                    id: i, feature: f, bbox: bbox, area: area,
                    isSliver: area < thresholdSqM, isDeleted: false, isModified: false,
                    minX: bbox[0], minY: bbox[1], maxX: bbox[2], maxY: bbox[3]
                };
            });

            if (mode === 'delete') {
                const passed = items.filter(i => !i.isSliver).map(i => i.feature);
                const failed = items.filter(i => i.isSliver).map(i => i.feature);
                self.postMessage({ taskId: msg.taskId, status: 'ok', data: { output_1: turf.featureCollection(passed), output_2: turf.featureCollection([]), output_3: turf.featureCollection(failed) } });
                return;
            }

            const tree = new rbush();
            tree.load(items);
            const queue = [...items].sort((a, b) => a.area - b.area);

            for (let i = 0; i < queue.length; i++) {
                const item = queue[i];
                if (item.isDeleted || item.area >= thresholdSqM) continue;

                const candidates = tree.search({ minX: item.bbox[0], minY: item.bbox[1], maxX: item.bbox[2], maxY: item.bbox[3] });
                let bestNeighbor = null;
                let maxSharedLen = 0;

                for (const candidate of candidates) {
                    if (item.id === candidate.id || candidate.isDeleted) continue;
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
                    } catch(e) {}
                }

                if (bestNeighbor) {
                    try {
                        const union = turf.union(bestNeighbor.feature, item.feature);
                        tree.remove(bestNeighbor);
                        bestNeighbor.feature = union;
                        bestNeighbor.area = turf.area(union);
                        const newBBox = turf.bbox(union);
                        bestNeighbor.bbox = newBBox;
                        bestNeighbor.minX = newBBox[0]; bestNeighbor.minY = newBBox[1];
                        bestNeighbor.maxX = newBBox[2]; bestNeighbor.maxY = newBBox[3];
                        bestNeighbor.isModified = true;
                        tree.insert(bestNeighbor);
                        item.isDeleted = true;
                    } catch(err) {}
                }
                if (i % 20 === 0) await new Promise(r => setTimeout(r, 0));
            }

            const outPassed = []; const outMerged = []; const outFailed = [];
            items.forEach(i => {
                if (i.isDeleted) return;
                if (i.area >= thresholdSqM) { if (i.isModified) outMerged.push(i.feature); else outPassed.push(i.feature); } else { outFailed.push(i.feature); }
            });

            self.postMessage({ taskId: msg.taskId, status: 'ok', data: { output_1: turf.featureCollection(outPassed), output_2: turf.featureCollection(outMerged), output_3: turf.featureCollection(outFailed) } });
        } catch (err) { self.postMessage({ taskId: msg.taskId, status: 'err', message: err.message }); }
    }
    else if (msg.task === 'make_valid') {
        try {
            const features = msg.features;
            const reader = new jsts.io.GeoJSONReader();
            const writer = new jsts.io.GeoJSONWriter();
            const out = [];
            features.features.forEach(f => {
                if (!f || !f.geometry) return;
                try {
                    const g = reader.read(f.geometry);
                    let gg = g;
                    if (g && g.isValid && !g.isValid()) {
                        try { gg = g.buffer(0); } catch(e) { gg = g; }
                    }
                    const gj = writer.write(gg);
                    const nf = turf.feature(gj, f.properties || {});
                    out.push(nf);
                } catch(e) {
                    out.push(f);
                }
            });
            self.postMessage({ taskId: msg.taskId, status: 'ok', data: turf.featureCollection(out) });
        } catch (err) { self.postMessage({ taskId: msg.taskId, status: 'err', message: err.message }); }
    }
    // --- RESTO DE TAREAS (MANTENIDAS COMPRIMIDAS) ---
    else if(msg.task === 'geo_voronoi') { try { const features=msg.features; const seen=new Set(); const cleanPoints=[]; features.forEach(f=>{ const type=turf.getType(f); if(type==='Point'){ const c=turf.getCoords(f); const key=c[0].toFixed(6)+','+c[1].toFixed(6); if(!seen.has(key)){ seen.add(key); cleanPoints.push(turf.point([c[0],c[1]],f.properties)); } } }); if(cleanPoints.length===0)throw new Error("No valid points"); const fc=turf.featureCollection(cleanPoints); const bbox=turf.bbox(fc); const w=bbox[2]-bbox[0]; const h=bbox[3]-bbox[1]; const pad=Math.max(w,h)*0.5||0.01; const expandedBbox=[bbox[0]-pad,bbox[1]-pad,bbox[2]+pad,bbox[3]+pad]; const result=turf.voronoi(fc,{bbox:expandedBbox}); const finalFeatures=[]; if(result&&result.features){ result.features.forEach((poly,idx)=>{ if(poly&&poly.geometry&&poly.geometry.coordinates.length>0){ if(cleanPoints[idx]){ poly.properties=cleanPoints[idx].properties; finalFeatures.push(poly); } } }); } self.postMessage({taskId:msg.taskId,status:'ok',data:turf.featureCollection(finalFeatures)}); } catch(err){ self.postMessage({taskId:msg.taskId,status:'err',message:err.message}); } }
    else if(msg.task === 'geo_snap') { try { const source=msg.source; const anchor=msg.anchor; const range=msg.range; const unit=msg.unit; const anchorPoints=turf.explode(anchor); const tree=new rbush(); const items=anchorPoints.features.map(f=>{const c=f.geometry.coordinates;return{minX:c[0],minY:c[1],maxX:c[0],maxY:c[1],coord:c};}); tree.load(items); let rangeKm=range; if(unit==='meters')rangeKm=range/1000;else if(unit==='miles')rangeKm=range*1.60934; const searchDeg=(rangeKm/40); turf.coordEach(source,(currentCoord)=>{ const candidates=tree.search({minX:currentCoord[0]-searchDeg,minY:currentCoord[1]-searchDeg,maxX:currentCoord[0]+searchDeg,maxY:currentCoord[1]+searchDeg}); if(candidates.length>0){ const from=turf.point(currentCoord); let minDst=Infinity; let bestCoord=null; for(const item of candidates){ const to=turf.point(item.coord); const d=turf.distance(from,to,{units:unit}); if(d<=range&&d<minDst){ minDst=d; bestCoord=item.coord; } } if(bestCoord){ currentCoord[0]=bestCoord[0]; currentCoord[1]=bestCoord[1]; } } }); self.postMessage({taskId:msg.taskId,status:'ok',data:source}); } catch(err){ self.postMessage({taskId:msg.taskId,status:'err',message:err.message}); } }
    else if(msg.task === 'geo_buffer') { try { const features=msg.features; const dist=msg.dist; const unit=msg.unit; const shouldDissolve=msg.dissolve; let buffered=turf.buffer(features,dist,{units:unit}); if(shouldDissolve){ buffered=turf.dissolve(buffered); } self.postMessage({taskId:msg.taskId,status:'ok',data:buffered}); } catch(err){ self.postMessage({taskId:msg.taskId,status:'err',message:err.message}); } }
    else if(msg.task === 'geo_random_fill') { try {
        const fc=msg.features;
        const count=Math.max(1, Number(msg.count)||10);
        if(!fc||!fc.features) throw new Error('Sin datos');
        const flat=turf.flatten(fc);
        const res=[];
        for(let i=0;i<flat.features.length;i++){
            const f=flat.features[i];
            const t=turf.getType(f);
            if(t!=='Polygon'&&t!=='MultiPolygon'){ if(i%80===0) await new Promise(r=>setTimeout(r,0)); continue; }
            const bbox=turf.bbox(f);
            let current=0;
            let attempts=0;
            const maxAttempts=count*80;
            while(current<count && attempts<maxAttempts){
                const rnd=turf.randomPoint(1,{bbox:bbox});
                const pt=rnd.features[0];
                try{
                    if(turf.booleanPointInPolygon(pt,f)){
                        pt.properties={...((f&&f.properties)||{}),_generated_id:current};
                        res.push(pt);
                        current++;
                    }
                }catch(_){}
                attempts++;
                if(attempts%300===0) await new Promise(r=>setTimeout(r,0));
            }
            if(i%80===0) await new Promise(r=>setTimeout(r,0));
        }
        self.postMessage({taskId:msg.taskId,status:'ok',data:turf.featureCollection(res)});
    } catch(err){ self.postMessage({taskId:msg.taskId,status:'err',message:err&&err.message?err.message:String(err)}); } }
    else if(msg.task === 'geo_donut_extractor') { try {
        const fc=msg.features;
        if(!fc||!fc.features) throw new Error('Sin datos');
        const flat=turf.flatten(fc);
        const holes=[];
        for(let i=0;i<flat.features.length;i++){
            const f=flat.features[i];
            const t=turf.getType(f);
            if(t==='Polygon'){
                const coords=(f&&f.geometry&&Array.isArray(f.geometry.coordinates))?f.geometry.coordinates:[];
                if(coords.length>1){
                    for(let j=1;j<coords.length;j++){
                        holes.push(turf.polygon([coords[j]], {...((f&&f.properties)||{})}));
                    }
                }
            }
            if(i%300===0) await new Promise(r=>setTimeout(r,0));
        }
        self.postMessage({taskId:msg.taskId,status:'ok',data:turf.featureCollection(holes)});
    } catch(err){ self.postMessage({taskId:msg.taskId,status:'err',message:err&&err.message?err.message:String(err)}); } }
    else if(msg.task === 'geo_line_closer') { try {
        const fc=msg.features;
        if(!fc||!fc.features) throw new Error('Sin datos');
        const flat=turf.flatten(fc);
        const polys=[];
        for(let i=0;i<flat.features.length;i++){
            const f=flat.features[i];
            if(turf.getType(f)==='LineString'){
                try{
                    const p=turf.lineToPolygon(f);
                    p.properties={...((f&&f.properties)||{})};
                    polys.push(p);
                }catch(_){}
            }
            if(i%400===0) await new Promise(r=>setTimeout(r,0));
        }
        self.postMessage({taskId:msg.taskId,status:'ok',data:turf.featureCollection(polys)});
    } catch(err){ self.postMessage({taskId:msg.taskId,status:'err',message:err&&err.message?err.message:String(err)}); } }
    else if(msg.task === 'geo_explode') { try {
        const fc=msg.features;
        if(!fc||!fc.features) throw new Error('Sin datos');
        const flat=turf.flatten(fc);
        const feats=Array.isArray(flat.features)?flat.features:[];
        for(let i=0;i<feats.length;i++){
            const f=feats[i];
            f.properties=f&&f.properties?{...f.properties}:{};
            if(i%500===0) await new Promise(r=>setTimeout(r,0));
        }
        self.postMessage({taskId:msg.taskId,status:'ok',data:flat});
    } catch(err){ self.postMessage({taskId:msg.taskId,status:'err',message:err&&err.message?err.message:String(err)}); } }
    else if(msg.task === 'geo_centroid') { try {
        const fc=msg.features;
        if(!fc||!fc.features) throw new Error('Sin datos');
        const feats=Array.isArray(fc.features)?fc.features:[];
        const out=[];
        for(let i=0;i<feats.length;i++){
            const f=feats[i];
            try { out.push(turf.centroid(f,{properties:(f&&f.properties)||{}})); } catch(_){}
            if(i%500===0) await new Promise(r=>setTimeout(r,0));
        }
        self.postMessage({taskId:msg.taskId,status:'ok',data:turf.featureCollection(out)});
    } catch(err){ self.postMessage({taskId:msg.taskId,status:'err',message:err&&err.message?err.message:String(err)}); } }
    else if(msg.task === 'geo_point_surf') { try {
        const fc=msg.features;
        if(!fc||!fc.features) throw new Error('Sin datos');
        const feats=Array.isArray(fc.features)?fc.features:[];
        const out=[];
        for(let i=0;i<feats.length;i++){
            const f=feats[i];
            try {
                const p=turf.pointOnFeature(f);
                p.properties={...((f&&f.properties)||{})};
                out.push(p);
            } catch(_){}
            if(i%500===0) await new Promise(r=>setTimeout(r,0));
        }
        self.postMessage({taskId:msg.taskId,status:'ok',data:turf.featureCollection(out)});
    } catch(err){ self.postMessage({taskId:msg.taskId,status:'err',message:err&&err.message?err.message:String(err)}); } }
    else if(msg.task === 'geo_bbox') { try {
        const fc=msg.features;
        if(!fc||!fc.features) throw new Error('Sin datos');
        const feats=Array.isArray(fc.features)?fc.features:[];
        const out=[];
        for(let i=0;i<feats.length;i++){
            const f=feats[i];
            try {
                const b=turf.bbox(f);
                const p=turf.bboxPolygon(b,{properties:{...((f&&f.properties)||{})}});
                out.push(p);
            } catch(_){}
            if(i%500===0) await new Promise(r=>setTimeout(r,0));
        }
        self.postMessage({taskId:msg.taskId,status:'ok',data:turf.featureCollection(out)});
    } catch(err){ self.postMessage({taskId:msg.taskId,status:'err',message:err&&err.message?err.message:String(err)}); } }
    else if(msg.task === 'geo_simplify') { try { const fc=msg.features; const tol=Number(msg.tol)||0.0001; if(!fc||!fc.features) throw new Error('Sin datos'); const out=turf.simplify(fc,{tolerance:tol,highQuality:true,mutate:false}); self.postMessage({taskId:msg.taskId,status:'ok',data:out}); } catch(err){ self.postMessage({taskId:msg.taskId,status:'err',message:err&&err.message?err.message:String(err)}); } }
    else if(msg.task === 'geo_line_merge') { try {
        const fc=msg.features;
        if(!fc||!fc.features) throw new Error('Sin datos');
        const flat=turf.flatten(fc);
        const lines=flat.features.filter(f=>turf.getType(f)==='LineString');
        if(!lines.length){ self.postMessage({taskId:msg.taskId,status:'ok',data:turf.featureCollection([])}); return; }

        const key=(c)=>String(+c[0].toFixed(8))+','+String(+c[1].toFixed(8));
        const endpoints=new Map();
        const degree=new Map();
        const parts=lines.map((f,idx)=>{
            const coords=turf.getCoords(f);
            const s=key(coords[0]);
            const e=key(coords[coords.length-1]);
            if(!endpoints.has(s)) endpoints.set(s,[]);
            if(!endpoints.has(e)) endpoints.set(e,[]);
            endpoints.get(s).push({idx,atStart:true});
            endpoints.get(e).push({idx,atStart:false});
            degree.set(s,(degree.get(s)||0)+1);
            degree.set(e,(degree.get(e)||0)+1);
            return {coords, props:{...((f&&f.properties)||{})}, used:false};
        });

        const nextFrom=(nodeKey, usedSet)=>{
            const deg=degree.get(nodeKey)||0;
            if(deg!==2) return null;
            const candidates=endpoints.get(nodeKey)||[];
            for(let i=0;i<candidates.length;i++){ if(!usedSet.has(candidates[i].idx)) return candidates[i]; }
            return null;
        };

        const out=[];
        for(let i=0;i<parts.length;i++){
            if(parts[i].used) continue;
            parts[i].used=true;
            const used=new Set([i]);
            let merged=parts[i].coords.slice();
            const props=parts[i].props;

            let tail=key(merged[merged.length-1]);
            while(true){
                const cand=nextFrom(tail,used); if(!cand) break;
                const p=parts[cand.idx]; p.used=true; used.add(cand.idx);
                const oriented=cand.atStart?p.coords:p.coords.slice().reverse();
                merged=merged.concat(oriented.slice(1));
                tail=key(merged[merged.length-1]);
            }

            let head=key(merged[0]);
            while(true){
                const cand=nextFrom(head,used); if(!cand) break;
                const p=parts[cand.idx]; p.used=true; used.add(cand.idx);
                const oriented=cand.atStart?p.coords.slice().reverse():p.coords;
                merged=oriented.slice(0,oriented.length-1).concat(merged);
                head=key(merged[0]);
            }

            out.push(turf.lineString(merged,props));
            if(i%300===0) await new Promise(r=>setTimeout(r,0));
        }

        self.postMessage({taskId:msg.taskId,status:'ok',data:turf.featureCollection(out)});
    } catch(err){ self.postMessage({taskId:msg.taskId,status:'err',message:err&&err.message?err.message:String(err)}); } }
    else if(msg.task === 'geo_line_to_polygon') { try {
        const fc=msg.features;
        if(!fc||!fc.features) throw new Error('Sin datos');
        const out=[];
        const feats=Array.isArray(fc.features)?fc.features:[];
        for(let i=0;i<feats.length;i++){
            const f=feats[i];
            const g=f&&f.geometry?f.geometry:null;
            const t=g?g.type:'';
            try {
                if(t==='LineString'){
                    const p=turf.lineToPolygon(f);
                    p.properties={...((f&&f.properties)||{})};
                    out.push(p);
                } else if(t==='MultiLineString'&&Array.isArray(g.coordinates)){
                    for(let j=0;j<g.coordinates.length;j++){
                        const ls=turf.lineString(g.coordinates[j],{...((f&&f.properties)||{})});
                        const p=turf.lineToPolygon(ls);
                        p.properties={...((f&&f.properties)||{})};
                        out.push(p);
                    }
                }
            } catch(_){}
            if(i%400===0) await new Promise(r=>setTimeout(r,0));
        }
        self.postMessage({taskId:msg.taskId,status:'ok',data:turf.featureCollection(out)});
    } catch(err){ self.postMessage({taskId:msg.taskId,status:'err',message:err&&err.message?err.message:String(err)}); } }
    else if(msg.task === 'geo_polygon_to_line') { try {
        const fc=msg.features;
        if(!fc||!fc.features) throw new Error('Sin datos');
        const out=[];
        const feats=Array.isArray(fc.features)?fc.features:[];
        for(let i=0;i<feats.length;i++){
            const f=feats[i];
            const g=f&&f.geometry?f.geometry:null;
            const t=g?g.type:'';
            try {
                if(t==='Polygon'){
                    const l=turf.polygonToLine(f);
                    if(l&&l.type==='FeatureCollection'&&Array.isArray(l.features)){
                        for(let j=0;j<l.features.length;j++){
                            const lf=l.features[j];
                            lf.properties={...((f&&f.properties)||{})};
                            out.push(lf);
                        }
                    } else if(l&&l.type==='Feature'){
                        l.properties={...((f&&f.properties)||{})};
                        out.push(l);
                    }
                } else if(t==='MultiPolygon'&&Array.isArray(g.coordinates)){
                    for(let j=0;j<g.coordinates.length;j++){
                        const p=turf.polygon(g.coordinates[j],{...((f&&f.properties)||{})});
                        const l=turf.polygonToLine(p);
                        if(l&&l.type==='FeatureCollection'&&Array.isArray(l.features)){
                            for(let k=0;k<l.features.length;k++){
                                const lf=l.features[k];
                                lf.properties={...((f&&f.properties)||{})};
                                out.push(lf);
                            }
                        } else if(l&&l.type==='Feature'){
                            l.properties={...((f&&f.properties)||{})};
                            out.push(l);
                        }
                    }
                }
            } catch(_){}
            if(i%400===0) await new Promise(r=>setTimeout(r,0));
        }
        self.postMessage({taskId:msg.taskId,status:'ok',data:turf.featureCollection(out)});
    } catch(err){ self.postMessage({taskId:msg.taskId,status:'err',message:err&&err.message?err.message:String(err)}); } }
    else if(msg.task === 'geo_reproject') { try {
        const fc=cloneFast(msg.features);
        if(!fc||!fc.features) throw new Error('Sin datos');
        if(typeof proj4!=='function') throw new Error('proj4 no disponible en worker');
        const src=msg.src||'EPSG:4326';
        const dst=msg.dst||'EPSG:3857';
        if(typeof proj4.defs==='function'){
            if(typeof msg.srcDef==='string' && msg.srcDef) { try { proj4.defs(src,msg.srcDef); } catch(_){} }
            if(typeof msg.dstDef==='string' && msg.dstDef) { try { proj4.defs(dst,msg.dstDef); } catch(_){} }
            if(!proj4.defs(src) && KNOWN_CRS[src]) { try { proj4.defs(src,KNOWN_CRS[src]); } catch(_){} }
            if(!proj4.defs(dst) && KNOWN_CRS[dst]) { try { proj4.defs(dst,KNOWN_CRS[dst]); } catch(_){} }
        }
        let prj=null;
        try { prj=proj4(src,dst); } catch(e) {
            throw new Error(`Reproject no pudo crear transformacion ${src} -> ${dst}: ${e&&e.message?e.message:String(e)}`);
        }
        const feats=Array.isArray(fc.features)?fc.features:[];
        for(let i=0;i<feats.length;i++){
            const f=feats[i];
            try{
                turf.coordEach(f,(coord)=>{
                    const p=prj.forward(coord);
                    coord[0]=p[0];
                    coord[1]=p[1];
                });
            }catch(_){}
            if(i%200===0) await new Promise(r=>setTimeout(r,0));
        }
        self.postMessage({taskId:msg.taskId,status:'ok',data:fc});
    } catch(err){ self.postMessage({taskId:msg.taskId,status:'err',message:err&&err.message?err.message:String(err)}); } }
    else if(msg.task === 'geo_topo_simplify') { try {
        const fc=msg.features; const tol=Number(msg.tol)||0.00005; const preserveBoundary=!!msg.preserveBoundary;
        if(!fc||!fc.features) throw new Error('Sin datos');
        const flat=turf.flatten(fc);
        const polys=flat.features.filter(f=>turf.getType(f)==='Polygon');

        if(polys.length&&polys.length===flat.features.length&&typeof jsts!=='undefined'){
            try {
                const reader=new jsts.io.GeoJSONReader();
                const writer=new jsts.io.GeoJSONWriter();
                const gf=new jsts.geom.GeometryFactory();
                const boundaries=[];
                let boundaryKeepGeom=null;

                if (preserveBoundary) {
                    const segMap = new Map();
                    const segKey = (a,b) => {
                        const ax = (+a[0]).toFixed(8), ay = (+a[1]).toFixed(8);
                        const bx = (+b[0]).toFixed(8), by = (+b[1]).toFixed(8);
                        return (ax < bx || (ax === bx && ay <= by))
                            ? `${ax},${ay}|${bx},${by}`
                            : `${bx},${by}|${ax},${ay}`;
                    };
                    const pushRing = (ring) => {
                        if (!Array.isArray(ring) || ring.length < 2) return;
                        for (let ri = 0; ri < ring.length - 1; ri++) {
                            const a = ring[ri];
                            const b = ring[ri + 1];
                            if (!a || !b || a.length < 2 || b.length < 2) continue;
                            const k = segKey(a, b);
                            const cur = segMap.get(k);
                            if (cur) cur.count += 1;
                            else segMap.set(k, { count: 1, coords: [[a[0], a[1]], [b[0], b[1]]] });
                        }
                    };
                    for (let pi = 0; pi < polys.length; pi++) {
                        const poly = polys[pi];
                        const rings = (poly && poly.geometry && Array.isArray(poly.geometry.coordinates))
                            ? poly.geometry.coordinates
                            : [];
                        for (let rr = 0; rr < rings.length; rr++) pushRing(rings[rr]);
                        if (pi % 300 === 0) await new Promise(r => setTimeout(r, 0));
                    }

                    const keepLines = [];
                    segMap.forEach((v) => {
                        if (v && v.count === 1 && v.coords) keepLines.push(v.coords);
                    });
                    if (keepLines.length) {
                        const keepGeoms = [];
                        for (let li = 0; li < keepLines.length; li++) {
                            try { keepGeoms.push(reader.read({ type: 'LineString', coordinates: keepLines[li] })); }
                            catch (_) {}
                        }
                        if (keepGeoms.length) boundaryKeepGeom = gf.createGeometryCollection(keepGeoms);
                    }
                }

                for(let i=0;i<polys.length;i++){
                    try {
                        const g=reader.read(polys[i].geometry);
                        const b=g.getBoundary();
                        boundaries.push(b);
                    } catch(_){}
                    if(i%300===0) await new Promise(r=>setTimeout(r,0));
                }

                if(boundaries.length){
                    const gc=gf.createGeometryCollection(boundaries);
                    const noded=jsts.operation.union.UnaryUnionOp.union(gc);
                    const simp=jsts.simplify.TopologyPreservingSimplifier.simplify(noded, tol);
                    let linework = simp;
                    if (preserveBoundary && boundaryKeepGeom) {
                        try {
                            const mergedLines = gf.createGeometryCollection([linework, boundaryKeepGeom]);
                            linework = jsts.operation.union.UnaryUnionOp.union(mergedLines);
                        } catch (_) {}
                    }

                    const polygonizer=new jsts.operation.polygonize.Polygonizer();
                    polygonizer.add(linework);
                    const polyColl=polygonizer.getPolygons();

                    const rebuilt=[];
                    const it=polyColl.iterator();
                    while(it.hasNext()){
                        const pg=it.next();
                        const gj=writer.write(pg);
                        if(gj) rebuilt.push(turf.feature(gj,{}));
                    }

                    if(rebuilt.length){
                        const propIndex = new rbush();
                        const propItems = polys.map((p, k) => {
                            const bb = turf.bbox(p);
                            return { minX: bb[0], minY: bb[1], maxX: bb[2], maxY: bb[3], idx: k };
                        });
                        propIndex.load(propItems);

                        for(let i=0;i<rebuilt.length;i++){
                            const np=rebuilt[i];
                            let donor=null;
                            try {
                                const cc=turf.centroid(np);
                                const xy = cc.geometry.coordinates;
                                const candidates = propIndex.search({ minX: xy[0], minY: xy[1], maxX: xy[0], maxY: xy[1] });
                                for (let c = 0; c < candidates.length; c++) {
                                    const cand = polys[candidates[c].idx];
                                    try { if (turf.booleanPointInPolygon(cc, cand)) { donor = cand; break; } } catch (_) {}
                                }
                                if (!donor && candidates.length) donor = polys[candidates[0].idx];
                            } catch(_){}

                            np.properties=donor?{...((donor&&donor.properties)||{})}:{};
                            if(i%300===0) await new Promise(r=>setTimeout(r,0));
                        }
                        self.postMessage({taskId:msg.taskId,status:'ok',data:turf.featureCollection(rebuilt)});
                        return;
                    }
                }
            } catch(e) {
                // cae a fallback por feature
            }
        }

        const out=[];
        for(let i=0;i<fc.features.length;i++){
            const f=fc.features[i];
            try { const s=turf.simplify(f,{tolerance:tol,highQuality:true,mutate:false}); out.push(turf.cleanCoords(s)); }
            catch(e){ try { out.push(turf.cleanCoords(f)); } catch(_) { out.push(f); } }
            if(i%400===0) await new Promise(r=>setTimeout(r,0));
        }
        self.postMessage({taskId:msg.taskId,status:'ok',data:turf.featureCollection(out)});
    } catch(err){ self.postMessage({taskId:msg.taskId,status:'err',message:err&&err.message?err.message:String(err)}); } }
    else if(msg.task === 'geo_chunk') { try { const fc=msg.features; const len=Number(msg.len)||100; const unit=msg.unit||'meters'; if(!fc||!fc.features) throw new Error('Sin datos'); const out=[]; const flat=turf.flatten(fc); for(let i=0;i<flat.features.length;i++){ const f=flat.features[i]; if(turf.getType(f)==='LineString'){ try { const chunks=turf.lineChunk(f,len,{units:unit}); for(let j=0;j<chunks.features.length;j++){ const c=chunks.features[j]; c.properties={...((f&&f.properties)||{})}; out.push(c); } } catch(e){ out.push(f); } } else out.push(f); if(i%400===0) await new Promise(r=>setTimeout(r,0)); } self.postMessage({taskId:msg.taskId,status:'ok',data:turf.featureCollection(out)}); } catch(err){ self.postMessage({taskId:msg.taskId,status:'err',message:err&&err.message?err.message:String(err)}); } }
    else if(msg.task === 'nearest_neighbor') { try { const source=msg.source.features; const candidates=msg.candidates.features; const maxDist=msg.maxDist; const unit=msg.unit||'kilometers'; const copyAttr=msg.copyAttr; const CHUNK=500; const matched=[]; const unmatched=[]; const tree=new rbush(); const candidateItems=candidates.map((f,idx)=>{const c=turf.centroid(f);const coords=c.geometry.coordinates;return{minX:coords[0],minY:coords[1],maxX:coords[0],maxY:coords[1],feature:f,centroid:c,id:idx};}); tree.load(candidateItems); let searchBufferDeg=0; let isFinite=(maxDist!==Infinity&&maxDist!==null&&maxDist!==undefined); if(isFinite){ let distKm=maxDist; if(unit==='meters')distKm=maxDist/1000;else if(unit==='miles')distKm=maxDist*1.60934; searchBufferDeg=distKm/40; } for(let i=0;i<source.length;i+=CHUNK){ const slice=source.slice(i,i+CHUNK); for(const f of slice){ const center=turf.centroid(f); const cc=center.geometry.coordinates; let bestCandidate=null; let minDistance=Infinity; let potentialCandidates=[]; if(isFinite){ potentialCandidates=tree.search({minX:cc[0]-searchBufferDeg,minY:cc[1]-searchBufferDeg,maxX:cc[0]+searchBufferDeg,maxY:cc[1]+searchBufferDeg}); }else{ potentialCandidates=candidateItems; } for(const item of potentialCandidates){ const d=turf.distance(center,item.centroid,{units:unit}); if(d<=maxDist&&d<minDistance){ minDistance=d; bestCandidate=item; } } if(bestCandidate){ const res=cloneFast(f); res.properties._neighbor_dist=parseFloat(minDistance.toFixed(4)); if(copyAttr){ Object.keys(bestCandidate.feature.properties).forEach(k=>{ if(k!=='distanceToPoint'&&k!=='featureIndex'){ res.properties['neighbor_'+k]=bestCandidate.feature.properties[k]; } }); }else{ res.properties._neighbor_idx=bestCandidate.id; } matched.push(res); }else{ unmatched.push(f); } } if(i+CHUNK<source.length)await new Promise(r=>setTimeout(r,0)); } self.postMessage({taskId:msg.taskId,status:'ok',data:{output_1:turf.featureCollection(matched),output_2:turf.featureCollection(unmatched)}}); } catch(err){ self.postMessage({taskId:msg.taskId,status:'err',message:err.message}); } }
    else if(msg.task === 'intersector') { try { const features1=msg.source.features; const features2=msg.target.features; const isLineMode=msg.isLineMode; const CHUNK=200; const outGeom=[]; const outPoints=[]; const createIndex=(list)=>{const tree=new rbush();const items=list.map((f,i)=>{const b=turf.bbox(f);return{minX:b[0],minY:b[1],maxX:b[2],maxY:b[3],feature:f};});tree.load(items);return tree;}; if(isLineMode){ const tree2=createIndex(features2); for(let i=0;i<features1.length;i+=CHUNK){const slice=features1.slice(i,i+CHUNK);for(const f1 of slice){const b=turf.bbox(f1);const candidates=tree2.search({minX:b[0],minY:b[1],maxX:b[2],maxY:b[3]});let localPoints=[];for(const c of candidates){const pts=turf.lineIntersect(f1,c.feature);if(pts&&pts.features.length){localPoints.push(...pts.features);outPoints.push(...pts.features);}}if(localPoints.length>0){const splitter=turf.featureCollection(localPoints);const split=turf.lineSplit(f1,splitter);split.features.forEach(s=>{s.properties={...f1.properties,_origin:'input1'};outGeom.push(s);});}else{const clone=cloneFast(f1);clone.properties={...f1.properties,_origin:'input1'};outGeom.push(clone);}}await new Promise(r=>setTimeout(r,0));} const tree1=createIndex(features1); for(let i=0;i<features2.length;i+=CHUNK){const slice=features2.slice(i,i+CHUNK);for(const f2 of slice){const b=turf.bbox(f2);const candidates=tree1.search({minX:b[0],minY:b[1],maxX:b[2],maxY:b[3]});let localPoints=[];for(const c of candidates){const pts=turf.lineIntersect(f2,c.feature);if(pts&&pts.features.length)localPoints.push(...pts.features);}if(localPoints.length>0){const splitter=turf.featureCollection(localPoints);const split=turf.lineSplit(f2,splitter);split.features.forEach(s=>{s.properties={...f2.properties,_origin:'input2'};outGeom.push(s);});}else{const clone=cloneFast(f2);clone.properties={...f2.properties,_origin:'input2'};outGeom.push(clone);}}await new Promise(r=>setTimeout(r,0));} }else{ const tree=createIndex(features2); for(let i=0;i<features1.length;i+=CHUNK){const slice=features1.slice(i,i+CHUNK);for(const f1 of slice){const b=turf.bbox(f1);const candidates=tree.search({minX:b[0],minY:b[1],maxX:b[2],maxY:b[3]});for(const item of candidates){const f2=item.feature;try{const intersection=turf.intersect(f1,f2);if(intersection){intersection.properties={...f1.properties,...f2.properties};outGeom.push(intersection);}}catch(e){}}}await new Promise(r=>setTimeout(r,0));} } self.postMessage({taskId:msg.taskId,status:'ok',data:{output_1:turf.featureCollection(outGeom),output_2:turf.featureCollection(outPoints)}}); } catch(err){ self.postMessage({taskId:msg.taskId,status:'err',message:err.message}); } }
    else if(msg.task === 'spatial_filter') { try { const source=msg.source.features; const mask=msg.mask.features; const mode=msg.mode; const CHUNK=500; const passed=[]; const failed=[]; const tree=new rbush(); const maskItems=mask.map((f,i)=>{const b=turf.bbox(f);return{minX:b[0],minY:b[1],maxX:b[2],maxY:b[3],feature:f};}); tree.load(maskItems); for(let i=0;i<source.length;i+=CHUNK){const slice=source.slice(i,i+CHUNK);for(const f1 of slice){let match=false;const b1=turf.bbox(f1);const candidates=tree.search({minX:b1[0],minY:b1[1],maxX:b1[2],maxY:b1[3]});for(const item of candidates){const f2=item.feature;try{if(mode==='contains'&&turf.booleanContains(f1,f2))match=true;else if(mode==='within'&&turf.booleanWithin(f1,f2))match=true;else if(mode==='crosses'&&turf.booleanCrosses(f1,f2))match=true;else if(mode==='touches'&&turf.booleanTouches(f1,f2))match=true;else if(mode==='equal'&&turf.booleanEqual(f1,f2))match=true;else if(mode==='disjoint'&&turf.booleanDisjoint(f1,f2))match=true;else if(mode==='overlap'&&turf.booleanOverlap(f1,f2))match=true;}catch(err){}if(match)break;}if(match)passed.push(f1);else failed.push(f1);}if(i+CHUNK<source.length)await new Promise(r=>setTimeout(r,0));} self.postMessage({taskId:msg.taskId,status:'ok',data:{output_1:turf.featureCollection(passed),output_2:turf.featureCollection(failed)}}); } catch(err){ self.postMessage({taskId:msg.taskId,status:'err',message:err.message}); } }
    else if(msg.task === 'spatial_join') { try { const source=msg.source.features; const join=msg.join.features; const mode=msg.mode; const joinType=msg.joinType; const prefix=msg.prefix||'j_'; const strategy=msg.strategy||'first'; const CHUNK=400; const joined=[]; const unmatched=[]; const tree=new rbush(); const joinItems=join.map(f=>{const b=turf.bbox(f);return{minX:b[0],minY:b[1],maxX:b[2],maxY:b[3],feature:f};}); tree.load(joinItems); for(let i=0;i<source.length;i+=CHUNK){const slice=source.slice(i,i+CHUNK);for(const f1 of slice){let matched=false;const b1=turf.bbox(f1);const candidates=tree.search({minX:b1[0],minY:b1[1],maxX:b1[2],maxY:b1[3]});let matches=[];for(const item of candidates){const f2=item.feature;let ok=false;try{if(mode==='intersects')ok=turf.booleanIntersects(f1,f2);else if(mode==='within')ok=turf.booleanWithin(f1,f2);else if(mode==='contains')ok=turf.booleanContains(f1,f2);}catch(err){}if(ok)matches.push(f2);}if(matches.length>0){matched=true;const nf=cloneFast(f1);if(strategy==='first'){const m=matches[0];const props=m.properties||{};Object.keys(props).forEach(k=>nf.properties[prefix+k]=props[k]);}else{nf.properties[prefix+'match_count']=matches.length;const agg={};for(const m of matches){const props=m.properties||{};Object.keys(props).forEach(k=>{const v=props[k];if(typeof v==='number'&&!isNaN(v)){if(!agg[k])agg[k]={sum:0,min:v,max:v,count:0};agg[k].sum+=v;agg[k].min=Math.min(agg[k].min,v);agg[k].max=Math.max(agg[k].max,v);agg[k].count+=1;}});}Object.keys(agg).forEach(k=>{const a=agg[k];nf.properties[prefix+k+'_sum']=a.sum;nf.properties[prefix+k+'_avg']=a.count?a.sum/a.count:null;nf.properties[prefix+k+'_min']=a.min;nf.properties[prefix+k+'_max']=a.max;});}joined.push(nf);}if(!matched){if(joinType==='left') joined.push(f1);unmatched.push(f1);} }if(i+CHUNK<source.length)await new Promise(r=>setTimeout(r,0));} self.postMessage({taskId:msg.taskId,status:'ok',data:{output_1:turf.featureCollection(joined),output_2:turf.featureCollection(unmatched)}}); } catch(err){ self.postMessage({taskId:msg.taskId,status:'err',message:err.message}); } }
    else if(msg.task === 'attr_feature_merger') { try { const requestor=(msg.requestor&&msg.requestor.features)?msg.requestor.features:[]; const supplier=(msg.supplier&&msg.supplier.features)?msg.supplier.features:[]; const joinPairs=Array.isArray(msg.joinPairs)?msg.joinPairs:[]; if(!joinPairs.length) throw new Error('Define campos de union'); const getKey=(props,fields)=>fields.map(f=>String((props&&props[f])??'null')).join('|_|'); const reqKeys=joinPairs.map(p=>p[0]); const supKeys=joinPairs.map(p=>p[1]); const supMap=new Map(); for(let i=0;i<supplier.length;i++){ const f=supplier[i]; const key=getKey((f&&f.properties)||{},supKeys); if(!supMap.has(key)) supMap.set(key,{props:(f&&f.properties)||{},used:false}); if(i%500===0) await new Promise(r=>setTimeout(r,0)); } const merged=[]; const notMerged=[]; for(let i=0;i<requestor.length;i++){ const f=requestor[i]; const props=(f&&f.properties)||{}; const key=getKey(props,reqKeys); const hit=supMap.get(key); if(hit){ hit.used=true; const nf=cloneFast(f); nf.properties={...(nf.properties||{}),...(hit.props||{})}; merged.push(nf); } else { notMerged.push(f); } if(i%500===0) await new Promise(r=>setTimeout(r,0)); } const unused=[]; for(let i=0;i<supplier.length;i++){ const f=supplier[i]; const key=getKey((f&&f.properties)||{},supKeys); const hit=supMap.get(key); if(!hit||!hit.used) unused.push(f); if(i%500===0) await new Promise(r=>setTimeout(r,0)); } self.postMessage({taskId:msg.taskId,status:'ok',data:{output_1:turf.featureCollection(merged),output_2:turf.featureCollection(notMerged),output_3:turf.featureCollection(unused)}}); } catch(err){ self.postMessage({taskId:msg.taskId,status:'err',message:err&&err.message?err.message:String(err)}); } }
    else if(msg.task === 'attr_join') { try { const left=(msg.left&&msg.left.features)?msg.left.features:[]; const right=(msg.right&&msg.right.features)?msg.right.features:[]; const joinPairs=Array.isArray(msg.joinPairs)?msg.joinPairs:[]; const joinType=msg.joinType||'left'; const prefix=msg.prefix||'j_'; if(!joinPairs.length) throw new Error('Define campos de union'); const getKey=(props,fields)=>fields.map(f=>String((props&&props[f])??'null')).join('|_|'); const rightKeys=joinPairs.map(p=>p[1]); const leftKeys=joinPairs.map(p=>p[0]); const index=new Map(); for(let i=0;i<right.length;i++){ const f=right[i]; const key=getKey((f&&f.properties)||{},rightKeys); if(!index.has(key)) index.set(key,f); if(i%800===0) await new Promise(r=>setTimeout(r,0)); } const joined=[]; const unmatched=[]; for(let i=0;i<left.length;i++){ const f=left[i]; const props=(f&&f.properties)||{}; const key=getKey(props,leftKeys); const match=index.get(key); if(match){ const nf=cloneFast(f); if(!nf.properties) nf.properties={}; const mprops=(match&&match.properties)||{}; Object.keys(mprops).forEach(k=>{ nf.properties[prefix+k]=mprops[k]; }); joined.push(nf); } else { if(joinType==='left') joined.push(f); unmatched.push(f); } if(i%800===0) await new Promise(r=>setTimeout(r,0)); } self.postMessage({taskId:msg.taskId,status:'ok',data:{output_1:turf.featureCollection(joined),output_2:turf.featureCollection(unmatched)}}); } catch(err){ self.postMessage({taskId:msg.taskId,status:'err',message:err&&err.message?err.message:String(err)}); } }
    else if(msg.task === 'attr_sorter') { try { const features=(msg.features&&msg.features.features)?cloneFast(msg.features.features):[]; const field=msg.field||''; const dir=msg.dir==='desc'?'desc':'asc'; features.sort((a,b)=>{ const pA=(a&&a.properties)||{}; const pB=(b&&b.properties)||{}; const valA=pA[field]; const valB=pB[field]; if(valA===valB) return 0; const isNum=(typeof valA==='number'&&typeof valB==='number'); let cmp=0; if(isNum){ cmp=valA-valB; } else { cmp=String(valA||'').localeCompare(String(valB||''),undefined,{numeric:true}); } return dir==='asc'?cmp:-cmp; }); self.postMessage({taskId:msg.taskId,status:'ok',data:turf.featureCollection(features)}); } catch(err){ self.postMessage({taskId:msg.taskId,status:'err',message:err&&err.message?err.message:String(err)}); } }
    else if(msg.task === 'attr_matcher') { try { const features=(msg.features&&msg.features.features)?msg.features.features:[]; const matchGeo=!!msg.matchGeo; const matchAttr=!!msg.matchAttr; const targetFields=Array.isArray(msg.targetFields)&&msg.targetFields.length?msg.targetFields:null; const uniques=[]; const duplicates=[]; const seen=new Set(); for(let i=0;i<features.length;i++){ const f=features[i]; let hashParts=[]; if(matchGeo){ hashParts.push(JSON.stringify((f&&f.geometry)||null)); } if(matchAttr){ const props=(f&&f.properties)||{}; if(targetFields){ const attrVal=targetFields.map(k=>{ const v=props[k]; return (v!==undefined&&v!==null)?v:'null'; }).join('_|_'); hashParts.push(attrVal); } else { const sorted={}; Object.keys(props).sort().forEach(k=>{ sorted[k]=props[k]; }); hashParts.push(JSON.stringify(sorted)); } } if(hashParts.length===0){ uniques.push(f); continue; } const key=hashParts.join('###'); if(seen.has(key)) duplicates.push(f); else { seen.add(key); uniques.push(f); } if(i%1000===0) await new Promise(r=>setTimeout(r,0)); } self.postMessage({taskId:msg.taskId,status:'ok',data:{output_1:turf.featureCollection(uniques),output_2:turf.featureCollection(duplicates)}}); } catch(err){ self.postMessage({taskId:msg.taskId,status:'err',message:err&&err.message?err.message:String(err)}); } }
    else if(msg.task === 'attr_stats') { try { const fc=msg.features; const fields=Array.isArray(msg.fields)&&msg.fields.length?msg.fields:[msg.field]; const mode=msg.mode||'per_field'; const prefix=msg.prefix||'stats'; if(!fc||!fc.features) throw new Error('Sin datos'); const cleanFields=fields.map(f=>String(f||'').trim()).filter(Boolean); if(!cleanFields.length) throw new Error('Define al menos un campo'); const byField={}; for(let fi=0; fi<cleanFields.length; fi++){ const field=cleanFields[fi]; const values=[]; for(let i=0;i<fc.features.length;i++){ const p=(fc.features[i]&&fc.features[i].properties)||{}; const v=p[field]; if(typeof v==='number'&&!isNaN(v)) values.push(v); if(i%1200===0) await new Promise(r=>setTimeout(r,0)); } if(values.length){ const sum=values.reduce((a,b)=>a+b,0); byField[field]={sum,min:Math.min(...values),max:Math.max(...values),avg:sum/values.length,count:values.length}; } } if(!Object.keys(byField).length) throw new Error('No hay valores numericos en los campos elegidos'); let concatStats=null; if(mode==='concat'||mode==='both'){ const concat=[]; for(let i=0;i<fc.features.length;i++){ const p=(fc.features[i]&&fc.features[i].properties)||{}; for(let fi=0; fi<cleanFields.length; fi++){ const v=p[cleanFields[fi]]; if(typeof v==='number'&&!isNaN(v)) concat.push(v); } if(i%1200===0) await new Promise(r=>setTimeout(r,0)); } if(concat.length){ const sum=concat.reduce((a,b)=>a+b,0); concatStats={sum,min:Math.min(...concat),max:Math.max(...concat),avg:sum/concat.length,count:concat.length}; } } const out=cloneFast(fc); const write=(props,key,s)=>{ props[prefix+'_'+key+'_sum']=s.sum; props[prefix+'_'+key+'_min']=s.min; props[prefix+'_'+key+'_max']=s.max; props[prefix+'_'+key+'_avg']=s.avg; props[prefix+'_'+key+'_count']=s.count; }; for(let i=0;i<out.features.length;i++){ if(!out.features[i].properties) out.features[i].properties={}; if(mode==='per_field'||mode==='both'){ const keys=Object.keys(byField); for(let k=0;k<keys.length;k++) write(out.features[i].properties,keys[k],byField[keys[k]]); } if((mode==='concat'||mode==='both')&&concatStats) write(out.features[i].properties,'concat',concatStats); if(i%1200===0) await new Promise(r=>setTimeout(r,0)); } self.postMessage({taskId:msg.taskId,status:'ok',data:out}); } catch(err){ self.postMessage({taskId:msg.taskId,status:'err',message:err&&err.message?err.message:String(err)}); } }
    else if(msg.task === 'attr_test') { try { const fc=msg.features; const conditions=Array.isArray(msg.conditions)&&msg.conditions.length?msg.conditions:[{field:msg.field,op:msg.op,value:msg.value,join:'AND'}]; if(!fc||!fc.features) throw new Error('Sin datos'); const evalCond=(props,c)=>{ const left=props?props[c.field]:undefined; const op=String((c&&c.op)||'=='); const raw=(c&&c.value)!==undefined?c.value:''; const txt=String(raw).trim(); let right=txt; if(typeof left==='number'){ const n=Number(txt); right=isNaN(n)?txt:n; } else if(typeof left==='boolean'){ right=txt.toLowerCase()==='true'; } if(op==='like') return String(left??'').toLowerCase().includes(String(raw??'').toLowerCase()); if(op==='starts') return String(left??'').toLowerCase().startsWith(String(raw??'').toLowerCase()); if(op==='ends') return String(left??'').toLowerCase().endsWith(String(raw??'').toLowerCase()); if(op==='in'){ const list=String(raw??'').split(',').map(s=>s.trim()).filter(Boolean); return list.includes(String(left??'')); } if(op==='>') return left>Number(right); if(op==='>=') return left>=Number(right); if(op==='<') return left<Number(right); if(op==='<=') return left<=Number(right); if(op==='!=') return left!=right; return left==right; }; const evalGroup=(props,arr)=>{ if(!arr.length) return true; let acc=evalCond(props,arr[0]); for(let i=1;i<arr.length;i++){ const join=String(arr[i].join||'AND').toUpperCase(); const cur=evalCond(props,arr[i]); acc=(join==='OR')?(acc||cur):(acc&&cur); } return acc; }; const p=[]; const f=[]; for(let i=0;i<fc.features.length;i++){ const feat=fc.features[i]; const props=(feat&&feat.properties)||{}; const pass=evalGroup(props,conditions); if(pass) p.push(feat); else f.push(feat); if(i%1200===0) await new Promise(x=>setTimeout(x,0)); } self.postMessage({taskId:msg.taskId,status:'ok',data:{output_1:turf.featureCollection(p),output_2:turf.featureCollection(f)}}); } catch(err){ self.postMessage({taskId:msg.taskId,status:'err',message:err&&err.message?err.message:String(err)}); } }
    else if(msg.task === 'attr_creator') { try {
        const fc = msg.features;
        const field = String(msg.field || '').trim();
        const exprRaw = String(msg.exprRaw || '');
        const onError = msg.onError === 'reject' ? 'reject' : 'null';
        const isFormula = !!msg.isFormula;
        if (!fc || !fc.features) throw new Error('Sin datos');
        if (!field) throw new Error('Campo destino vacio');
        let formulaFn = null;
        let compileErr = null;
        if (isFormula) {
            try { formulaFn = compileSafeExpression(exprRaw.substring(1), ['f']); }
            catch (e) { compileErr = e; }
        }
        const passed = [];
        const rejected = [];
        for (let i = 0; i < fc.features.length; i++) {
            const src = fc.features[i];
            const f = cloneFast(src);
            if (!f.properties) f.properties = {};
            if (isFormula && !formulaFn) {
                if (onError === 'reject') {
                    f.properties[field] = null;
                    f.properties._creator_error = compileErr && compileErr.message ? compileErr.message : 'Formula invalida';
                    rejected.push(f);
                } else {
                    f.properties[field] = null;
                    passed.push(f);
                }
                if (i % 1200 === 0) await new Promise(r => setTimeout(r, 0));
                continue;
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
                        f.properties[field] = null;
                        f.properties._creator_error = e && e.message ? e.message : String(e);
                        rejected.push(f);
                    } else {
                        f.properties[field] = null;
                        passed.push(f);
                    }
                }
            } else {
                f.properties[field] = exprRaw;
                passed.push(f);
            }
            if (i % 1200 === 0) await new Promise(r => setTimeout(r, 0));
        }
        if (onError === 'reject') self.postMessage({ taskId: msg.taskId, status: 'ok', data: { output_1: turf.featureCollection(passed), output_2: turf.featureCollection(rejected) } });
        else self.postMessage({ taskId: msg.taskId, status: 'ok', data: turf.featureCollection(passed) });
    } catch(err){ self.postMessage({taskId:msg.taskId,status:'err',message:err&&err.message?err.message:String(err)}); } }
    else if(msg.task === 'attr_calc_pro') { try {
        const fc = msg.features;
        const field = String(msg.field || '').trim();
        const exprRaw = String(msg.exprRaw || '');
        const onError = msg.onError === 'reject' ? 'reject' : 'null';
        if (!fc || !fc.features) throw new Error('Sin datos');
        if (!field) throw new Error('Campo destino vacio');
        if (!exprRaw) throw new Error('Expresion vacia');
        const fn = compileSafeExpression(exprRaw, ['props', 'feat']);
        const passed = [];
        const rejected = [];
        for (let i = 0; i < fc.features.length; i++) {
            const src = fc.features[i];
            const f = cloneFast(src);
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
                    f.properties[field] = null;
                    f.properties._calc_error = e && e.message ? e.message : String(e);
                    rejected.push(f);
                } else {
                    f.properties[field] = null;
                    passed.push(f);
                }
            }
            if (i % 1200 === 0) await new Promise(r => setTimeout(r, 0));
        }
        if (onError === 'reject') self.postMessage({ taskId: msg.taskId, status: 'ok', data: { output_1: turf.featureCollection(passed), output_2: turf.featureCollection(rejected) } });
        else self.postMessage({ taskId: msg.taskId, status: 'ok', data: turf.featureCollection(passed) });
    } catch(err){ self.postMessage({taskId:msg.taskId,status:'err',message:err&&err.message?err.message:String(err)}); } }
    else if(msg.task === 'attr_renamer') { try {
        const fc = msg.features;
        const mapping = Array.isArray(msg.mapping) ? msg.mapping : [];
        const onError = msg.onError === 'reject' ? 'reject' : 'null';
        if (!fc || !fc.features) throw new Error('Sin datos');
        if (!mapping.length) throw new Error('Define al menos un mapeo old:new');
        const passed = [];
        const rejected = [];
        for (let i = 0; i < fc.features.length; i++) {
            const src = fc.features[i];
            const f = cloneFast(src);
            if (!f.properties) f.properties = {};
            try {
                for (let m = 0; m < mapping.length; m++) {
                    const pair = mapping[m];
                    const oldName = pair[0];
                    const newName = pair[1];
                    if (f.properties[oldName] === undefined) throw new Error(`Campo no encontrado: ${oldName}`);
                    f.properties[newName] = f.properties[oldName];
                    delete f.properties[oldName];
                }
                passed.push(f);
            } catch (e) {
                if (onError === 'reject') {
                    f.properties._renamer_error = e && e.message ? e.message : String(e);
                    rejected.push(f);
                } else passed.push(f);
            }
            if (i % 1200 === 0) await new Promise(r => setTimeout(r, 0));
        }
        if (onError === 'reject') self.postMessage({ taskId: msg.taskId, status: 'ok', data: { output_1: turf.featureCollection(passed), output_2: turf.featureCollection(rejected) } });
        else self.postMessage({ taskId: msg.taskId, status: 'ok', data: turf.featureCollection(passed) });
    } catch(err){ self.postMessage({taskId:msg.taskId,status:'err',message:err&&err.message?err.message:String(err)}); } }
    else if(msg.task === 'attr_keeper') { try {
        const fc = msg.features;
        const keepList = Array.isArray(msg.keepList) ? msg.keepList : [];
        const keepSet = new Set(keepList);
        const onError = msg.onError === 'reject' ? 'reject' : 'null';
        if (!fc || !fc.features) throw new Error('Sin datos');
        if (!keepSet.size) throw new Error('Define al menos un campo a mantener');
        const passed = [];
        const rejected = [];
        for (let i = 0; i < fc.features.length; i++) {
            const src = fc.features[i];
            const f = cloneFast(src);
            if (!f.properties) f.properties = {};
            try {
                let found = 0;
                const newProps = {};
                Object.keys(f.properties).forEach((k) => {
                    if (keepSet.has(k)) {
                        newProps[k] = f.properties[k];
                        found++;
                    }
                });
                if (found === 0) throw new Error('Ningun campo objetivo presente');
                f.properties = newProps;
                passed.push(f);
            } catch (e) {
                if (onError === 'reject') {
                    f.properties._keeper_error = e && e.message ? e.message : String(e);
                    rejected.push(f);
                } else passed.push(f);
            }
            if (i % 1200 === 0) await new Promise(r => setTimeout(r, 0));
        }
        if (onError === 'reject') self.postMessage({ taskId: msg.taskId, status: 'ok', data: { output_1: turf.featureCollection(passed), output_2: turf.featureCollection(rejected) } });
        else self.postMessage({ taskId: msg.taskId, status: 'ok', data: turf.featureCollection(passed) });
    } catch(err){ self.postMessage({taskId:msg.taskId,status:'err',message:err&&err.message?err.message:String(err)}); } }
    else if(msg.task === 'attr_counter') { try {
        const fc = cloneFast(msg.features);
        const fieldName = String(msg.fieldName || '_id');
        let count = Number(msg.start);
        if (!isFinite(count)) count = 1;
        if (!fc || !fc.features) throw new Error('Sin datos');
        for (let i = 0; i < fc.features.length; i++) {
            const f = fc.features[i];
            if (!f.properties) f.properties = {};
            f.properties[fieldName] = count++;
            if (i % 1200 === 0) await new Promise(r => setTimeout(r, 0));
        }
        self.postMessage({ taskId: msg.taskId, status: 'ok', data: fc });
    } catch(err){ self.postMessage({taskId:msg.taskId,status:'err',message:err&&err.message?err.message:String(err)}); } }
    else if(msg.task === 'attr_string_formatter') { try {
        const fc = msg.features;
        const fields = Array.isArray(msg.fields)
            ? msg.fields.map((s) => String(s || '').trim()).filter(Boolean)
            : [String(msg.field || '').trim()].filter(Boolean);
        const op = String(msg.op || 'upper');
        const argsRaw = String(msg.argsRaw || '');
        const onError = msg.onError === 'reject' ? 'reject' : 'null';
        if (!fc || !fc.features) throw new Error('Sin datos');
        if (!fields.length) throw new Error('Campo objetivo vacio');
        const args = argsRaw.split('|');
        const arg1 = args[0];
        const arg2 = args[1] || '';
        const passed = [];
        const rejected = [];
        for (let i = 0; i < fc.features.length; i++) {
            const src = fc.features[i];
            const f = cloneFast(src);
            if (!f.properties) f.properties = {};
            try {
                for (let fi = 0; fi < fields.length; fi++) {
                    const field = fields[fi];
                    if (f.properties[field] === undefined && op !== 'template') throw new Error(`Campo no encontrado: ${field}`);
                    let val = f.properties[field];
                    if (val === undefined || val === null) val = '';
                    val = String(val);
                    if (op === 'upper') val = val.toUpperCase();
                    else if (op === 'lower') val = val.toLowerCase();
                    else if (op === 'trim') val = val.trim();
                    else if (op === 'capitalize') val = val.charAt(0).toUpperCase() + val.slice(1).toLowerCase();
                    else if (op === 'replace') val = val.split(arg1).join(arg2);
                    else if (op === 'concat') val = val + arg1;
                    else if (op === 'pad') {
                        const len = parseInt(arg1) || 3;
                        const ch = arg2 || '0';
                        val = val.padStart(len, ch);
                    } else if (op === 'template') {
                        let tpl = argsRaw;
                        Object.keys(f.properties).forEach((k) => {
                            const re = new RegExp(`{${k}}`, 'g');
                            tpl = tpl.replace(re, f.properties[k]);
                        });
                        val = tpl;
                    }
                    f.properties[field] = val;
                }
                passed.push(f);
            } catch (e) {
                if (onError === 'reject') {
                    f.properties._fmt_error = e && e.message ? e.message : String(e);
                    rejected.push(f);
                } else {
                    for (let fi = 0; fi < fields.length; fi++) f.properties[fields[fi]] = '';
                    passed.push(f);
                }
            }
            if (i % 1200 === 0) await new Promise(r => setTimeout(r, 0));
        }
        if (onError === 'reject') self.postMessage({ taskId: msg.taskId, status: 'ok', data: { output_1: turf.featureCollection(passed), output_2: turf.featureCollection(rejected) } });
        else self.postMessage({ taskId: msg.taskId, status: 'ok', data: turf.featureCollection(passed) });
    } catch(err){ self.postMessage({taskId:msg.taskId,status:'err',message:err&&err.message?err.message:String(err)}); } }
    else if(msg.task === 'attr_area') { try {
        const fc = msg.features;
        const fieldName = String(msg.fieldName || '_area');
        const multiplier = Number(msg.multiplier);
        const onError = msg.onError === 'reject' ? 'reject' : 'null';
        if (!fc || !fc.features) throw new Error('Sin datos');
        const passed = [];
        const rejected = [];
        for (let i = 0; i < fc.features.length; i++) {
            const src = fc.features[i];
            const f = cloneFast(src);
            if (!f.properties) f.properties = {};
            try {
                const areaSqM = turf.area(f);
                f.properties[fieldName] = parseFloat((areaSqM * multiplier).toFixed(4));
                passed.push(f);
            } catch (e) {
                if (onError === 'reject') {
                    f.properties[fieldName] = null;
                    f.properties._area_error = e && e.message ? e.message : String(e);
                    rejected.push(f);
                } else {
                    f.properties[fieldName] = null;
                    passed.push(f);
                }
            }
            if (i % 1200 === 0) await new Promise(r => setTimeout(r, 0));
        }
        if (onError === 'reject') self.postMessage({ taskId: msg.taskId, status: 'ok', data: { output_1: turf.featureCollection(passed), output_2: turf.featureCollection(rejected) } });
        else self.postMessage({ taskId: msg.taskId, status: 'ok', data: turf.featureCollection(passed) });
    } catch(err){ self.postMessage({taskId:msg.taskId,status:'err',message:err&&err.message?err.message:String(err)}); } }
    else if(msg.task === 'attr_length') { try {
        const fc = msg.features;
        const fieldName = String(msg.fieldName || '_length');
        const unit = String(msg.unit || 'meters');
        const onError = msg.onError === 'reject' ? 'reject' : 'null';
        if (!fc || !fc.features) throw new Error('Sin datos');
        const passed = [];
        const rejected = [];
        for (let i = 0; i < fc.features.length; i++) {
            const src = fc.features[i];
            const f = cloneFast(src);
            if (!f.properties) f.properties = {};
            try {
                const gType = f && f.geometry ? f.geometry.type : null;
                if (gType !== 'LineString' && gType !== 'MultiLineString') throw new Error('Geometria no lineal para Length Calc');
                let length = 0;
                if (unit === 'centimeters') length = turf.length(f, { units: 'meters' }) * 100;
                else length = turf.length(f, { units: unit });
                f.properties[fieldName] = parseFloat(length.toFixed(4));
                passed.push(f);
            } catch (e) {
                if (onError === 'reject') {
                    f.properties[fieldName] = null;
                    f.properties._length_error = e && e.message ? e.message : String(e);
                    rejected.push(f);
                } else {
                    f.properties[fieldName] = null;
                    passed.push(f);
                }
            }
            if (i % 1200 === 0) await new Promise(r => setTimeout(r, 0));
        }
        if (onError === 'reject') self.postMessage({ taskId: msg.taskId, status: 'ok', data: { output_1: turf.featureCollection(passed), output_2: turf.featureCollection(rejected) } });
        else self.postMessage({ taskId: msg.taskId, status: 'ok', data: turf.featureCollection(passed) });
    } catch(err){ self.postMessage({taskId:msg.taskId,status:'err',message:err&&err.message?err.message:String(err)}); } }
    else if(msg.task === 'geo_dissolve') { try { const fc=msg.features; const fields=Array.isArray(msg.fields)?msg.fields.map(f=>String(f||'').trim()).filter(Boolean):[]; if(!fc||!fc.features) throw new Error('Sin datos'); if(!fields.length){ const out=turf.dissolve(fc); self.postMessage({taskId:msg.taskId,status:'ok',data:out}); return; } const tempProp='_dissolve_key_'; const tagged=fc.features.map((f)=>{ const nf=cloneFast(f); if(!nf.properties) nf.properties={}; const key=fields.map((field)=>{ const v=nf.properties[field]; return v!==undefined&&v!==null?v:'null'; }).join('_|_'); nf.properties[tempProp]=key; return nf; }); const work=turf.featureCollection(tagged); let dissolved=null; try { const clean=turf.cleanCoords(work,{mutate:true}); dissolved=turf.dissolve(clean,{propertyName:tempProp}); } catch(e){ const groupMap={}; work.features.forEach((f)=>{ const k=(f.properties&&f.properties[tempProp])||'null'; if(!groupMap[k]) groupMap[k]=cloneFast(f); else { try { groupMap[k]=turf.union(groupMap[k],f); } catch(err){} } }); dissolved=turf.featureCollection(Object.values(groupMap)); } dissolved.features.forEach((f)=>{ if(f.properties) delete f.properties[tempProp]; }); self.postMessage({taskId:msg.taskId,status:'ok',data:dissolved}); } catch(err){ self.postMessage({taskId:msg.taskId,status:'err',message:err&&err.message?err.message:String(err)}); } }
    else if(msg.task === 'geo_kink_remover') { try { const fc=msg.features; const minDeg=Number(msg.minDeg)||0; if(!fc||!fc.features) throw new Error('Sin datos'); const cleanZ=(feature)=>{ if(minDeg<=0) return turf.cleanCoords(feature); const type=turf.getType(feature); if(type!=='Polygon'&&type!=='LineString') return feature; const tolerance=minDeg*0.00005; return turf.simplify(feature,{tolerance,highQuality:true}); }; const out=[]; const flat=turf.flatten(fc); for(let i=0;i<flat.features.length;i++){ const f=flat.features[i]; const type=turf.getType(f); if(type==='Polygon'||type==='MultiPolygon'){ try { const unk=turf.unkinkPolygon(f); const parts=(unk&&unk.features)?unk.features:[]; if(parts.length){ for(let j=0;j<parts.length;j++){ const part=parts[j]; part.properties=(f&&f.properties)||{}; out.push(cleanZ(part)); } } else out.push(cleanZ(f)); } catch(e){ out.push(cleanZ(f)); } } else if(type==='LineString'||type==='MultiLineString'){ out.push(cleanZ(f)); } else out.push(f); if(i%400===0) await new Promise(r=>setTimeout(r,0)); } self.postMessage({taskId:msg.taskId,status:'ok',data:turf.featureCollection(out)}); } catch(err){ self.postMessage({taskId:msg.taskId,status:'err',message:err&&err.message?err.message:String(err)}); } }
    else if(msg.task === 'geo_angle_calculator') { try { const fc=msg.features; const threshold=Number(msg.threshold); if(!fc||!fc.features) throw new Error('Sin datos'); const points=[]; const getAngle=(a,b,c)=>{ const bearingBA=turf.bearing(b,a); const bearingBC=turf.bearing(b,c); let angle=Math.abs(bearingBA-bearingBC); if(angle>180) angle=360-angle; return angle; }; const flat=turf.flatten(fc); for(let fIdx=0; fIdx<flat.features.length; fIdx++){ const f=flat.features[fIdx]; const type=turf.getType(f); const coords=turf.getCoords(f); const ring=(type==='Polygon')?coords[0]:(type==='LineString'?coords:null); if(!ring||ring.length<3){ if(fIdx%400===0) await new Promise(r=>setTimeout(r,0)); continue; } const isClosed=(type==='Polygon'); const len=ring.length; const limit=isClosed?len-1:len; for(let i=0;i<limit;i++){ let prev,curr,next; if(i===0){ if(!isClosed) continue; prev=ring[len-2]; curr=ring[0]; next=ring[1]; } else if(i===len-1){ if(!isClosed) continue; continue; } else { prev=ring[i-1]; curr=ring[i]; next=ring[i+1]; } if(!prev||!next) continue; const angle=getAngle(prev,curr,next); if(angle<=threshold){ points.push(turf.point(curr,{...(f.properties||{}),_vertex_index:i,_parent_id:fIdx,angle:parseFloat(angle.toFixed(2))})); } } if(fIdx%400===0) await new Promise(r=>setTimeout(r,0)); } self.postMessage({taskId:msg.taskId,status:'ok',data:turf.featureCollection(points)}); } catch(err){ self.postMessage({taskId:msg.taskId,status:'err',message:err&&err.message?err.message:String(err)}); } }
    else if(msg.task === 'geo_vertex_creator') { try { const fc=msg.features; const mode=String(msg.mode||'All Vertices'); if(!fc||!fc.features) throw new Error('Sin datos'); const res=[]; const getPaths=(g)=>{ const type=turf.getType(g); const c=g&&g.coordinates; if(!c) return []; if(type==='LineString') return [c]; if(type==='MultiLineString'||type==='Polygon') return c; if(type==='MultiPolygon') return c.flat(); return []; }; if(mode==='Dangles'){ const counts={}; for(let i=0;i<fc.features.length;i++){ const f=fc.features[i]; const paths=getPaths(f.geometry); for(let p=0;p<paths.length;p++){ const path=paths[p]; if(!path||path.length<2) continue; const start=path[0].join(','); const end=path[path.length-1].join(','); counts[start]=(counts[start]||0)+1; counts[end]=(counts[end]||0)+1; } if(i%500===0) await new Promise(r=>setTimeout(r,0)); } const keys=Object.keys(counts); for(let i=0;i<keys.length;i++){ const k=keys[i]; if(counts[k]===1){ const xy=k.split(',').map(Number); res.push(turf.point([xy[0],xy[1]])); } } } else { for(let i=0;i<fc.features.length;i++){ const f=fc.features[i]; if(mode==='All Vertices'){ const pts=turf.explode(f); for(let j=0;j<pts.features.length;j++){ const p=pts.features[j]; p.properties=(f&&f.properties)||{}; res.push(p); } } else { const paths=getPaths(f.geometry); for(let p=0;p<paths.length;p++){ const path=paths[p]; if(!path||!path.length) continue; const start=path[0]; const end=path[path.length-1]; if(mode.includes('Start')) res.push(turf.point(start,(f&&f.properties)||{})); if(mode.includes('End')) res.push(turf.point(end,(f&&f.properties)||{})); } } if(i%500===0) await new Promise(r=>setTimeout(r,0)); } } self.postMessage({taskId:msg.taskId,status:'ok',data:turf.featureCollection(res)}); } catch(err){ self.postMessage({taskId:msg.taskId,status:'err',message:err&&err.message?err.message:String(err)}); } }
    else if(msg.task === 'geo_triangulator') { try { const fc=msg.features; if(!fc||!fc.features) throw new Error('Sin datos'); const res=[]; const flat=turf.flatten(fc); for(let i=0;i<flat.features.length;i++){ const f=flat.features[i]; if(turf.getType(f)==='Polygon'){ try { const tin=turf.tesselate(f); for(let j=0;j<tin.features.length;j++){ const tri=tin.features[j]; tri.properties=(f&&f.properties)||{}; res.push(tri); } } catch(e){} } if(i%400===0) await new Promise(r=>setTimeout(r,0)); } self.postMessage({taskId:msg.taskId,status:'ok',data:turf.featureCollection(res)}); } catch(err){ self.postMessage({taskId:msg.taskId,status:'err',message:err&&err.message?err.message:String(err)}); } }
    else if(msg.task === 'raster_sample') { try {
        if (typeof geoblaze === 'undefined') throw new Error('geoblaze no disponible en worker');
        const prefix = String(msg.prefix || 'val');
        const mode = msg.mode === 'select' ? 'select' : 'all';
        const selectedIndices = Array.isArray(msg.selectedIndices) ? msg.selectedIndices.map((n) => Number(n)).filter((n) => Number.isInteger(n) && n >= 0) : [];
        const step = Math.max(1, Number(msg.step) || 1);
        const rasterBuffer = msg.rasterBuffer;
        const pointsFC = msg.pointsFC;
        if (!rasterBuffer) throw new Error('Sin raster buffer');
        const georaster = await geoblaze.parse(rasterBuffer);

        const assignBand = (feat, val, bandIdx) => {
            if (!feat.properties) feat.properties = {};
            feat.properties[`${prefix}_b${bandIdx}`] = (val !== null && !isNaN(val))
                ? parseFloat(Number(val).toFixed(4))
                : null;
        };

        const outputFeatures = [];
        if (pointsFC && Array.isArray(pointsFC.features) && pointsFC.features.length) {
            const feats = pointsFC.features;
            for (let i = 0; i < feats.length; i++) {
                const src = feats[i];
                const newF = cloneFast(src);
                if (newF && newF.geometry && newF.geometry.type === 'Point') {
                    try {
                        const coords = newF.geometry.coordinates;
                        let raw = await geoblaze.identify(georaster, coords);
                        if (!Array.isArray(raw)) raw = [raw];
                        if (mode === 'all') {
                            for (let bi = 0; bi < raw.length; bi++) assignBand(newF, raw[bi], bi);
                        } else {
                            for (let si = 0; si < selectedIndices.length; si++) {
                                const bi = selectedIndices[si];
                                if (bi < raw.length) assignBand(newF, raw[bi], bi);
                            }
                        }
                    } catch (_) {}
                }
                outputFeatures.push(newF);
                if (i % 64 === 0) await new Promise(r => setTimeout(r, 0));
            }
        } else {
            const width = georaster.width;
            const height = georaster.height;
            const pixelWidth = georaster.pixelWidth;
            const pixelHeight = georaster.pixelHeight;
            const xmin = georaster.xmin;
            const ymax = georaster.ymax;
            for (let y = 0; y < height; y += step) {
                for (let x = 0; x < width; x += step) {
                    const centX = xmin + (x * pixelWidth) + (pixelWidth / 2);
                    const centY = ymax - (y * pixelHeight) - (pixelHeight / 2);
                    const newF = turf.point([centX, centY], {});
                    if (mode === 'all') {
                        for (let bIdx = 0; bIdx < georaster.values.length; bIdx++) {
                            const bandGrid = georaster.values[bIdx];
                            const val = bandGrid && bandGrid[y] ? bandGrid[y][x] : null;
                            assignBand(newF, val, bIdx);
                        }
                    } else {
                        for (let si = 0; si < selectedIndices.length; si++) {
                            const bIdx = selectedIndices[si];
                            const bandGrid = georaster.values[bIdx];
                            const val = bandGrid && bandGrid[y] ? bandGrid[y][x] : null;
                            assignBand(newF, val, bIdx);
                        }
                    }
                    outputFeatures.push(newF);
                }
                if ((y / step) % 8 === 0) await new Promise(r => setTimeout(r, 0));
            }
        }
        self.postMessage({ taskId: msg.taskId, status: 'ok', data: turf.featureCollection(outputFeatures) });
    } catch(err){ self.postMessage({taskId:msg.taskId,status:'err',message:err&&err.message?err.message:String(err)}); } }
    else if(msg.task === 'raster_zonal_stats') { try {
        if (typeof geoblaze === 'undefined') throw new Error('geoblaze no disponible en worker');
        const prefix = String(msg.prefix || 'zs');
        const rasterBuffer = msg.rasterBuffer;
        const polygonsFC = msg.polygonsFC;
        if (!rasterBuffer) throw new Error('Sin raster buffer');
        if (!polygonsFC || !Array.isArray(polygonsFC.features)) throw new Error('Sin poligonos');
        const georaster = await geoblaze.parse(rasterBuffer);
        const out = [];
        for (let i = 0; i < polygonsFC.features.length; i++) {
            const f = polygonsFC.features[i];
            const nf = cloneFast(f);
            try {
                const stats = await geoblaze.zonalStats(georaster, f, ['min', 'max', 'mean', 'sum']);
                if (Array.isArray(stats) && stats[0]) {
                    if (!nf.properties) nf.properties = {};
                    const s0 = stats[0];
                    Object.keys(s0).forEach((k) => nf.properties[`${prefix}_${k}`] = s0[k]);
                }
            } catch (_) {
                if (!nf.properties) nf.properties = {};
                nf.properties[`${prefix}_err`] = true;
            }
            out.push(nf);
            if (i % 20 === 0) await new Promise(r => setTimeout(r, 0));
        }
        self.postMessage({ taskId: msg.taskId, status: 'ok', data: turf.featureCollection(out) });
    } catch(err){ self.postMessage({taskId:msg.taskId,status:'err',message:err&&err.message?err.message:String(err)}); } }
    else if(msg.task === 'clip'){ try{const features=msg.features;const mask=msg.mask;if(!features||!features.features||!mask)throw new Error('Invalid payload');const res=[];const bbox=turf.bbox(mask);const maskPolyBbox=turf.bboxPolygon(bbox);const CHUNK=msg.chunk||50;const reader=new jsts.io.GeoJSONReader();const writer=new jsts.io.GeoJSONWriter();function jstsIntersectFeature(a,b){try{const ga=reader.read(a.geometry||a);const gb=reader.read(b.geometry||b);const inter=ga.intersection(gb);if(!inter) return null; if(typeof inter.isEmpty==='function' && inter.isEmpty()) return null;const gj=writer.write(inter);if(!gj) return null; return turf.feature(gj,a.properties||{});}catch(e){return null;}} const tree = new rbush();const items = features.features.map((f,idx)=>{const bb=turf.bbox(f);return {minX:bb[0],minY:bb[1],maxX:bb[2],maxY:bb[3],__idx:idx};});tree.load(items); const candItems = tree.search({minX:bbox[0],minY:bbox[1],maxX:bbox[2],maxY:bbox[3]}); const candidateIndices = candItems.map(it=>it.__idx); for(let ci=0; ci<candidateIndices.length; ci+=CHUNK){const sliceIdx = candidateIndices.slice(ci,ci+CHUNK);for(const idx of sliceIdx){const f = features.features[idx];try{const fBbox=turf.bbox(f);const fbPoly=turf.bboxPolygon(fBbox);if(!turf.booleanIntersects(fbPoly,maskPolyBbox)&&!turf.booleanContains(maskPolyBbox,fbPoly)&&!turf.booleanContains(fbPoly,maskPolyBbox)) continue;const type=turf.getType(f);if(type==='Polygon'||type==='MultiPolygon'){let clipped=null;try{clipped=jstsIntersectFeature(f,mask);}catch(e){clipped=null;}if(!clipped){try{clipped=turf.intersect(f,mask);}catch(err){clipped=null;}}if(clipped){clipped.properties=f.properties||{};res.push(clipped);} }else if(type.includes('Point')){try{if(turf.booleanPointInPolygon(f,mask)){res.push(f);}}catch(_){} } }catch(_){} }await new Promise(r=>setTimeout(r,0));} self.postMessage({taskId:msg.taskId,status:'ok',data:turf.featureCollection(res)});}catch(err){self.postMessage({taskId:msg.taskId,status:'err',message:err&&err.message?err.message:String(err)});} }
};
        






