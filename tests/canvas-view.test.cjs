const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
function source(name) {
  const start = script.indexOf('  function ' + name + '(');
  assert.ok(start >= 0, name);
  const rest = script.slice(start), line = rest.split('\n')[0];
  return line.endsWith('}') ? line : rest.slice(0, rest.indexOf('\n  }') + 4);
}
function editor() {
  const controls = new Map();
  const c = {
    Math, Object, RULER_GUTTER:22, MAX_CANVAS_SIDE:2560, ASCENDER:800, emScale:1,
    canvasZoom:1, canvasFitSize:538, ZOOM_LEVELS:[1,1.25,1.5,2,3,4],
    isDrawing:false, isPlacingAnchor:false, isClosingPath:false, dragState:null, panState:null,
    canvasPanActive:false, spaceDown:false, selectedObject:null, selectedAnchorIndex:null, inProgressPen:null,
    document:{getElementById(id){ if(!controls.has(id)) controls.set(id,{textContent:'',disabled:false,setAttribute(){}}); return controls.get(id); }},
    getComputedStyle:()=>({paddingLeft:'20px'}), window:{devicePixelRatio:2},
  };
  let board = 538, redraws = 0;
  const viewport = {
    clientWidth:600,clientHeight:600,scrollLeft:0,scrollTop:0,
    classList:{toggle(){},remove(){}},getBoundingClientRect:()=>({left:100,top:50}),
    hasPointerCapture:()=>false,
  };
  c.canvasViewport=viewport; c.canvasStage={};
  c.artboardShell={style:{set width(value){board=parseFloat(value)-22;},get width(){return (board+22)+'px';}}};
  c.canvasWrap={getBoundingClientRect:()=>({
    left:100+42+Math.max(0,(viewport.clientWidth-board-62)/2)-viewport.scrollLeft,
    top:50+42+Math.max(0,(viewport.clientHeight-board-62)/2)-viewport.scrollTop,
    width:board,height:board,
  })};
  c.resizeCanvases=()=>{c.emScale=board/1000;redraws++;};
  c.stats=()=>({board,redraws,controls});
  vm.createContext(c);
  for(const name of ['clamp','unitToPxX','unitToPxY','pxToUnitX','pxToUnitY','eventToUnit','canvasFitDimension','canvasInteractionActive','nextCanvasZoom','refreshCanvasViewControls','layoutCanvasView','setCanvasZoom','updateCanvasFit','setupCanvasResolution','nearestCanvasPoint','activeAnchor','hitTestAnchor','hitTestHandleDot','hitTestEditPoint']) vm.runInContext(source(name),c);
  return c;
}
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} ≠ ${b}`);
function viewportCenterInUnits(c){
  const r=c.canvasWrap.getBoundingClientRect(),v=c.canvasViewport,p=v.getBoundingClientRect();
  return [(p.left+v.clientWidth/2-r.left)/r.width*1000,800-(p.top+v.clientHeight/2-r.top)/r.height*1000];
}
test('Fit keeps the square board and external rulers inside portrait and landscape viewports',()=>{
  const c=editor();
  assert.equal(c.canvasFitDimension(600,400,20),338);
  assert.equal(c.canvasFitDimension(320,500,12),274);
  assert.equal(c.canvasFitDimension(180,180,12),134);
});
test('all zoom levels round-trip glyph coordinates without scale drift',()=>{
  const c=editor();
  for(const zoom of c.ZOOM_LEVELS){
    c.emScale=538*zoom/1000;
    for(const [x,y] of [[0,800],[620,700],[250,0],[1000,-200]]){
      near(c.pxToUnitX(c.unitToPxX(x)),x); near(c.pxToUnitY(c.unitToPxY(y)),y);
    }
  }
});
test('zoom preserves the font position at viewport center and does not mutate glyphs/history',()=>{
  const c=editor();c.resizeCanvases();
  c.glyphs={A:{width:620,marks:[{type:'pen',anchors:[{x:100,y:700,handleOut:[50,-20]}]}]}};
  c.history={A:[{marks:[]}]}; const before=JSON.stringify([c.glyphs,c.history]);
  const point=viewportCenterInUnits(c);
  for(const zoom of [2,4,1.5,3,1]){
    c.setCanvasZoom(zoom); const after=viewportCenterInUnits(c);near(after[0],point[0]);near(after[1],point[1]);
  }
  assert.equal(JSON.stringify([c.glyphs,c.history]),before);
});
test('Fit resets scroll and returns the artboard to its available size',()=>{
  const c=editor();c.setCanvasZoom(4);c.canvasViewport.scrollLeft=900;c.canvasViewport.scrollTop=700;
  c.setCanvasZoom(1,true);assert.equal(c.canvasViewport.scrollLeft,0);assert.equal(c.canvasViewport.scrollTop,0);
  assert.equal(c.stats().board,538);assert.equal(c.canvasZoom,1);
});
test('zoom limits disable controls and prevent stepping beyond 100–400%',()=>{
  const c=editor();c.refreshCanvasViewControls();assert.equal(c.nextCanvasZoom(-1),1);
  assert.equal(c.stats().controls.get('zoomOutBtn').disabled,true);
  c.setCanvasZoom(4);assert.equal(c.nextCanvasZoom(1),4);
  assert.equal(c.stats().controls.get('zoomInBtn').disabled,true);
});
test('zoom does not interrupt a live stroke, anchor placement, closing drag, transform, or pan',()=>{
  for(const flag of ['isDrawing','isPlacingAnchor','isClosingPath','dragState','panState']){
    const c=editor();c[flag]=true;c.setCanvasZoom(2);assert.equal(c.canvasZoom,1);assert.equal(c.stats().redraws,0);
  }
});
test('responsive resizing keeps zoom while recomputing Fit and preserving the view center',()=>{
  const c=editor();c.setCanvasZoom(2);c.canvasViewport.clientWidth=420;c.canvasViewport.clientHeight=500;
  const center=viewportCenterInUnits(c);c.updateCanvasFit();assert.equal(c.canvasFitSize,358);assert.equal(c.canvasZoom,2);
  const after=viewportCenterInUnits(c);near(after[0],center[0]);near(after[1],center[1]);
});
test('high-DPI backing buffers are bounded independently of font coordinate scale',()=>{
  const c=editor();c.setCanvasZoom(4);c.window.devicePixelRatio=3;let transform;
  const canvas={getContext:()=>({setTransform:(...args)=>{transform=args;}})};
  const width=c.setupCanvasResolution(canvas);assert.equal(width,2152);assert.ok(canvas.width<=2560);assert.ok(canvas.height<=2560);
  near(transform[0],2560/2152);near(c.emScale,2152/1000);
});
test('nearest point wins when multiple anchors share the hit radius',()=>{
  const c=editor();const points=[{x:0,y:0,anchorIndex:0},{x:6,y:0,anchorIndex:1}];
  assert.equal(c.nearestCanvasPoint([5,0],points,9).anchorIndex,1);
  assert.equal(c.nearestCanvasPoint([30,0],points,9),null);
});
test('only visible handles of the active anchor can be selected',()=>{
  const c=editor();c.emScale=1;c.selectedObject={type:'pen',showAnchors:true,mark:{anchors:[{x:100,y:100,handleOut:[20,0]},{x:200,y:100,handleOut:[20,0]}]}};
  assert.equal(c.hitTestHandleDot([120,700]),null);
  c.selectedAnchorIndex=1;assert.equal(c.hitTestHandleDot([120,700]),null);
  assert.equal(c.hitTestHandleDot([220,700]).anchorIndex,1);
});
test('a nearby handle cannot steal a click that is closer to its anchor',()=>{
  const c=editor();c.selectedAnchorIndex=0;c.selectedObject={type:'pen',showAnchors:true,mark:{anchors:[{x:100,y:100,handleOut:[6,0]}]}};
  assert.equal(c.hitTestEditPoint([100,700]).kind,'anchor');
  assert.equal(c.hitTestEditPoint([106,700]).kind,'handle');
});
test('handle hit radius stays in screen pixels at every zoom level',()=>{
  const c=editor();c.selectedAnchorIndex=0;c.selectedObject={type:'pen',showAnchors:true,mark:{anchors:[{x:100,y:100,handleOut:[100,0]}]}};
  for(const zoom of c.ZOOM_LEVELS){
    c.emScale=538*zoom/1000;const x=c.unitToPxX(200),y=c.unitToPxY(100);
    assert.ok(c.hitTestHandleDot([x+7,y]));assert.equal(c.hitTestHandleDot([x+9,y]),null);
  }
});
function installPointerHandlers(c){
  for(const [type,name] of [['pointerdown','panDown'],['pointermove','panMove']]){
    const body=script.split("canvasViewport.addEventListener('"+type+"', function(e){")[1].split('\n  }, true);')[0];
    vm.runInContext('function '+name+'(e){'+body+'}',c);
  }
  vm.runInContext(source('finishCanvasPan'),c);
  c.canvasViewport.focus=()=>{};c.canvasViewport.setPointerCapture=()=>{};
  c.canvasViewport.classList.add=()=>{};
}
function pointer(overrides={}){
  return {button:0,pointerId:7,clientX:300,clientY:200,prevented:false,stopped:false,
    preventDefault(){this.prevented=true;},stopPropagation(){this.stopped=true;},...overrides};
}
test('middle mouse and Space-drag capture panning before drawing receives input',()=>{
  for(const mode of ['middle','space','toggle']){
    const c=editor();installPointerHandlers(c);c.spaceDown=mode==='space';c.canvasPanActive=mode==='toggle';
    c.canvasViewport.scrollLeft=200;c.canvasViewport.scrollTop=180;
    c.glyphs={A:{marks:[]}};c.inProgressPen={anchors:[{x:100,y:100}]};const before=JSON.stringify([c.glyphs,c.inProgressPen]);
    const down=pointer({button:mode==='middle'?1:0});c.panDown(down);
    assert.equal(down.prevented,true);assert.equal(down.stopped,true);assert.ok(c.panState);
    const move=pointer({clientX:260,clientY:170});c.panMove(move);
    assert.equal(c.canvasViewport.scrollLeft,240);assert.equal(c.canvasViewport.scrollTop,210);assert.equal(move.stopped,true);
    c.finishCanvasPan(pointer());assert.equal(c.panState,null);assert.equal(JSON.stringify([c.glyphs,c.inProgressPen]),before);
  }
});
test('ordinary drawing input and active strokes are never captured as a pan',()=>{
  const c=editor();installPointerHandlers(c);let e=pointer();c.panDown(e);assert.equal(e.stopped,false);assert.equal(c.panState,null);
  c.canvasPanActive=true;c.isDrawing=true;e=pointer();c.panDown(e);assert.equal(e.stopped,false);assert.equal(c.panState,null);
});
test('another pointer cannot move or finish an existing pan',()=>{
  const c=editor();installPointerHandlers(c);c.panDown(pointer({button:1}));
  c.panMove(pointer({pointerId:9,clientX:900}));assert.equal(c.canvasViewport.scrollLeft,0);
  c.finishCanvasPan(pointer({pointerId:9}));assert.ok(c.panState);c.finishCanvasPan(pointer());assert.equal(c.panState,null);
});
function installKeyboard(c){
  const body=script.split("document.addEventListener('keydown', function(e){")[1].split('\n  });')[0];
  c.navigator={platform:'MacIntel'};vm.runInContext('function keyboard(e){'+body+'}',c);
}
function keyEvent(key,tag='BODY',extras={}){
  return {key,target:{tagName:tag,isContentEditable:false,closest:()=>null},prevented:false,
    preventDefault(){this.prevented=true;},...extras};
}
test('text, number/select fields and native button Space retain their keyboard behavior',()=>{
  const c=editor();installKeyboard(c);
  for(const tag of ['INPUT','TEXTAREA','SELECT','BUTTON']){
    const e=keyEvent(' ',tag);c.keyboard(e);assert.equal(e.prevented,false);assert.equal(c.spaceDown,false);
  }
  const commandPlus=keyEvent('+','BODY',{metaKey:true});c.keyboard(commandPlus);assert.equal(commandPlus.prevented,false);assert.equal(c.canvasZoom,1);
});
test('canvas keyboard zoom and Fit use the same coordinate-preserving controls',()=>{
  const c=editor();installKeyboard(c);let e=keyEvent('+');c.keyboard(e);assert.equal(c.canvasZoom,1.25);assert.equal(e.prevented,true);
  c.keyboard(keyEvent('0'));assert.equal(c.canvasZoom,1);assert.equal(c.canvasViewport.scrollLeft,0);
  c.keyboard(keyEvent(' '));assert.equal(c.spaceDown,true);
});

test('pointer-to-font conversion stays correct after zoom and viewport scrolling',()=>{
  const c=editor();c.inkCanvas=c.canvasWrap;
  for(const zoom of [1,2,4]){
    c.setCanvasZoom(zoom);c.canvasViewport.scrollLeft=170;c.canvasViewport.scrollTop=130;
    const r=c.canvasWrap.getBoundingClientRect();
    const result=c.eventToUnit({clientX:r.left+c.unitToPxX(620),clientY:r.top+c.unitToPxY(500)});
    near(result[0],620);near(result[1],500);
  }
});
test('Escape exits persistent pan without deselecting or changing the active shape',()=>{
  const c=editor();installPointerHandlers(c);installKeyboard(c);c.canvasPanActive=true;c.spaceDown=true;
  c.selectedObject={type:'pen',mark:{anchors:[{x:100,y:200}]}};const before=JSON.stringify(c.selectedObject);
  c.panDown(pointer());c.keyboard(keyEvent('Escape'));
  assert.equal(c.canvasPanActive,false);assert.equal(c.spaceDown,false);assert.equal(c.panState,null);
  assert.equal(JSON.stringify(c.selectedObject),before);
});
