const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
function editor() {
  const context = { selectedObject: null, inProgressPen: null, Math, JSON };
  vm.createContext(context);
  for (const name of ['anchorMode', 'setAnchorMode', 'moveAnchorHandle', 'deepCopyAnchors', 'reversePenAnchors', 'insertAnchorAtT', 'updateTransformDrag', 'prepareAnchorHistory', 'commitAnchorEdit']) {
    const source = script.slice(script.indexOf('  function ' + name + '(')).match(/^  function [\s\S]*?\n  }/)[0];
    vm.runInContext(source, context);
  }
  return context;
}
const plain = v => JSON.parse(JSON.stringify(v));
const length = v => Math.hypot(...v);
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} ≠ ${b}`);

test('smooth handles stay aligned while preserving different lengths', () => {
  const c = editor(), a = { handleIn: [-30, 0], handleOut: [90, 0], handleMode: 'smooth' };
  c.moveAnchorHandle(a, true, [0, 120], false);
  near(length(a.handleIn), 30);
  near(a.handleIn[0], 0); near(a.handleIn[1], -30);
  assert.deepEqual(plain(a.handleOut), [0, 120]);
});
test('symmetric mode mirrors both direction and length', () => {
  const c = editor(), a = { handleIn: [-30, 0], handleOut: [30, 0], handleMode: 'symmetric' };
  c.moveAnchorHandle(a, false, [-40, 60], false);
  assert.deepEqual(plain(a.handleOut), [40, -60]);
});
test('Alt separates a handle permanently, including the next drag', () => {
  const c = editor(), a = { handleIn: [-30, 0], handleOut: [30, 0], handleMode: 'symmetric' };
  c.moveAnchorHandle(a, true, [60, 25], true);
  c.moveAnchorHandle(a, true, [75, 45], false);
  assert.equal(a.handleMode, 'independent');
  assert.deepEqual(plain(a.handleIn), [-30, 0]);
});
test('corner conversion removes handles, smooth conversion recreates both', () => {
  const c = editor(), anchors = [{x:0,y:0}, {x:100,y:100,handleIn:[-10,0],handleOut:[10,0]}, {x:200,y:0}];
  c.setAnchorMode(anchors, 1, 'corner');
  assert.equal(anchors[1].handleIn, null); assert.equal(anchors[1].handleOut, null);
  c.setAnchorMode(anchors, 1, 'smooth');
  assert.ok(length(anchors[1].handleIn) > 0); assert.ok(length(anchors[1].handleOut) > 0);
  assert.equal(c.anchorMode(anchors[1]), 'smooth');
});
test('legacy asymmetric anchors infer smooth or independent continuity', () => {
  const c = editor();
  assert.equal(c.anchorMode({handleIn:[-20,0],handleOut:[80,0]}), 'smooth');
  assert.equal(c.anchorMode({handleIn:[-20,10],handleOut:[80,0]}), 'independent');
});
test('transform copies and direction reversal preserve anchor mode', () => {
  const c = editor(), anchors = [{x:2,y:3,handleIn:[-10,5],handleOut:[30,0],handleMode:'independent'}];
  const copy = c.deepCopyAnchors(anchors); copy[0].handleIn[0] = 900;
  assert.equal(anchors[0].handleIn[0], -10);
  assert.equal(copy[0].handleMode, 'independent');
  assert.equal(c.reversePenAnchors(anchors)[0].handleMode, 'independent');
});
test('Shift constrains handle drag to 45 degree increments', () => {
  const c = editor(), a = {x:0,y:0,handleIn:[-30,0],handleOut:[30,0],handleMode:'symmetric'};
  Object.assign(c, { selectedObject:{type:'pen',mark:{anchors:[a]}}, dragState:{mode:'handle-drag',anchorIndex:0,isOutHandle:true,oppositeLength:30}, glyphs:{A:{ref:{}}}, activeChar:'A', shiftDown:true, altDown:false, pxToUnitX:x=>x, pxToUnitY:y=>y, scheduleLiveRebuild(){} });
  c.updateTransformDrag([100,80]);
  near(a.handleOut[0], a.handleOut[1]); near(length(a.handleOut), Math.hypot(100,80));
});
test('Alt-dragging a corner creates two handles without moving its anchor', () => {
  const c = editor(), a = {x:100,y:100};
  Object.assign(c, { selectedObject:{type:'pen',mark:{anchors:[a]}}, dragState:{mode:'anchor-convert',anchorIndex:0}, glyphs:{A:{ref:{}}}, activeChar:'A', shiftDown:false, pxToUnitX:x=>x, pxToUnitY:y=>y, scheduleLiveRebuild(){} });
  c.updateTransformDrag([160,120]);
  assert.equal(a.x,100); assert.equal(a.y,100);
  assert.deepEqual(plain(a.handleIn),[-60,-20]); assert.deepEqual(plain(a.handleOut),[60,20]);
});
test('open path history retains snapshots before and after anchor edits', () => {
  const c = editor(), open = {anchors:[{x:10,y:20,handleIn:null,handleOut:null}]}, saved=[];
  Object.assign(c,{inProgressPen:open,selectedObject:{mark:open},activeChar:'A',history:{A:[{marks:[],inProgress:null}]},historyIndex:{A:0},deepCopyPath:plain,pushHistory(ch,snapshot){saved.push(snapshot)},scheduleLiveRebuild(){},refreshAnchorPanel(){}});
  c.prepareAnchorHistory(); open.anchors[0].x=70; c.commitAnchorEdit();
  assert.equal(saved[0].anchors[0].x,10); assert.equal(saved[1].anchors[0].x,70);
});
test('inserting an anchor preserves the cubic curve and re-infers continuity', () => {
  const c = editor(), anchors=[{x:0,y:0,handleIn:[-10,0],handleOut:[100,0],handleMode:'symmetric'},{x:200,y:100,handleIn:[-100,0],handleOut:[30,0],handleMode:'symmetric'},{x:0,y:200}];
  const old=plain(anchors);
  function cubic(a,b,t){const p=a.handleOut||[0,0],q=b.handleIn||[0,0],u=1-t;return [0,1].map(i=>u*u*u*a[i?'y':'x']+3*u*u*t*(a[i?'y':'x']+p[i])+3*u*t*t*(b[i?'y':'x']+q[i])+t*t*t*b[i?'y':'x']);}
  c.insertAnchorAtT(anchors,0,.4);
  for(let i=0;i<=20;i++){const t=i/20,expected=cubic(old[0],old[1],t),actual=t<=.4?cubic(anchors[0],anchors[1],t/.4):cubic(anchors[1],anchors[2],(t-.4)/.6);near(actual[0],expected[0]);near(actual[1],expected[1]);}
  assert.equal(anchors[0].handleMode,undefined); assert.equal(anchors[2].handleMode,undefined);
});
