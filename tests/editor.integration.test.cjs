const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createEditor, createCanvas } = require('./helpers/editor-harness.cjs');
const glyph=(font,ch)=>font.charToGlyph(ch);
const commands=(font,ch)=>JSON.parse(JSON.stringify(glyph(font,ch).path.commands));
async function penTriangle(e){await e.click('[data-mode="pen"]');await e.dot(100,100);await e.dot(300,650);await e.dot(500,100);await e.click('#closePathBtn');}

test('vertical toolbar keeps artboard beside tools and settings out of the canvas header',async t=>{
  const e=createEditor();t.after(e.close);
  assert.equal(e.document.querySelector('.editor-toolbar'),null);
  for(const selector of ['#modeGroup','#panToggle','#undoBtn','#redoBtn','#clearBtn','#uploadRefBtn']) assert.ok(e.get(selector).closest('.tool-rail'),selector);
  for(const selector of ['#widthInput','#weightGroup','#penActionsGroup','#refControls']) assert.ok(e.get(selector).closest('.inspector'),selector);
  assert.ok(e.get('#currentCharLabel').closest('.canvas-chrome'));
  assert.equal(e.document.querySelector('.editor-heading'),null);
  assert.ok(e.get('#progressLabel').closest('.charpanel'));
  for(const button of e.document.querySelectorAll('.tool-rail button')){assert.ok(button.getAttribute('aria-label'));assert.ok(button.dataset.tooltip);assert.equal(button.querySelector('.tool-name,.tool-shortcut,.rail-name'),null);}
  const tool=e.get('[data-mode="pen"]');tool.focus();await e.key('Escape');assert.equal(tool.classList.contains('tooltip-dismissed'),true);tool.blur();assert.equal(tool.classList.contains('tooltip-dismissed'),false);
  assert.equal(e.get('#undoBtn').disabled,true);assert.equal(e.get('#refControls').style.display,'none');
  await e.click('[data-mode="freehand"]');assert.notEqual(e.get('#weightGroup').style.display,'none');
  await e.click('[data-mode="pen"]');assert.equal(e.get('#weightGroup').style.display,'none');assert.notEqual(e.get('#penActionsGroup').style.display,'none');
  assert.deepEqual(e.errors,[]);
});
test('pen drawing -> live preview -> actual named OpenType download',async t=>{
  const e=createEditor();t.after(e.close);await penTriangle(e);await e.flushTimers();
  assert.match(e.get('#progressLabel').textContent,/1\s*\/\s*62/);assert.ok(e.painted('inkCanvas')>1000);assert.ok(e.previews.length>0);
  await e.input('#fontNameInput','Studio Aksara');await e.input('#previewInput','000');await e.input('#previewSize',92);
  assert.equal(e.get('#previewOutput').textContent,'000');assert.equal(e.get('#previewOutput').style.fontSize,'92px');
  const item=await e.download();assert.equal(item.filename,'studio-aksara.otf');
  assert.equal(item.font.unitsPerEm,1000);assert.equal(item.font.numGlyphs,64);assert.ok(commands(item.font,'0').length>=4);assert.equal(commands(item.font,'A').length,0);
  assert.equal(item.font.names.fontFamily.en,'Studio Aksara');assert.deepEqual(e.errors,[]);assert.deepEqual(e.warnings,[]);
});
test('freehand, weight, glyph navigation, undo/redo and clear reach valid exported outlines',async t=>{
  const e=createEditor();t.after(e.close);
  await e.click('[data-char="A"]');await e.click('[data-mode="freehand"]');await e.click('[data-weight="bold"]');
  await e.stroke([[100,100],[200,650],[300,100],[250,350],[150,350]]);
  const original=await e.download();assert.ok(commands(original.font,'A').length>6);assert.equal(glyph(original.font,'A').advanceWidth,620);
  await e.click('#undoBtn');assert.match(e.get('#progressLabel').textContent,/0\s*\/\s*62/);assert.equal(e.painted('inkCanvas'),0);
  await e.click('#redoBtn');assert.match(e.get('#progressLabel').textContent,/1\s*\/\s*62/);
  await e.click('#nextBtn');assert.equal(e.get('#currentCharLabel').textContent,'B');await e.click('#prevBtn');assert.equal(e.get('#currentCharLabel').textContent,'A');
  await e.input('#widthInput',740,'change');const wide=await e.download();assert.equal(glyph(wide.font,'A').advanceWidth,740);
  await e.click('#clearBtn');assert.equal(e.painted('inkCanvas'),0);await e.click('#undoBtn');assert.deepEqual(commands((await e.download()).font,'A'),commands(wide.font,'A'));
  assert.deepEqual(e.errors,[]);assert.deepEqual(e.warnings,[]);
});
test('zoom, pan, grid/guides and layer visibility never modify downloaded outlines',async t=>{
  const e=createEditor();t.after(e.close);await penTriangle(e);const before=commands((await e.download()).font,'0');
  await e.click('#zoomInBtn');await e.click('#zoomInBtn');assert.equal(e.get('#canvasZoomLabel').textContent,'150%');
  await e.click('#panToggle');await e.stroke([[300,300],[200,250]]);assert.ok(e.viewport.scrollLeft!==0||e.viewport.scrollTop!==0);
  await e.click('#gridToggle');await e.click('#guidesToggle');assert.equal(e.painted('guidesCanvas'),0);
  await e.click('#drawingVisBtn');assert.equal(e.painted('inkCanvas'),0);const hidden=await e.download();assert.deepEqual(commands(hidden.font,'0'),before);
  await e.click('#drawingVisBtn');await e.click('#fitCanvasBtn');assert.equal(e.get('#canvasZoomLabel').textContent,'100%');assert.equal(e.viewport.scrollLeft,0);
  assert.deepEqual(commands((await e.download()).font,'0'),before);assert.deepEqual(e.errors,[]);
});
test('reference upload, opacity, fit, per-glyph visibility and removal stay independent of outlines',async t=>{
  const e=createEditor();t.after(e.close);const scan=createCanvas(40,40),ctx=scan.getContext('2d');ctx.fillStyle='#000';ctx.fillRect(5,5,30,30);
  await e.upload(scan.toBuffer('image/png'));assert.equal(e.get('#refControls').style.display,'');assert.equal(e.get('#refEmpty').hidden,true);assert.ok(e.painted('refCanvas')>0);
  await e.input('#refOpacity',65);assert.equal(e.get('#refOpacityValue').textContent,'65%');
  await e.click('#lockRefBtn');assert.equal(e.get('#lockRefBtn').getAttribute('aria-pressed'),'true');await e.click('#lockRefBtn');
  await e.click('#toggleRefBtn');assert.equal(e.painted('refCanvas'),0);await e.click('#toggleRefBtn');await e.click('#fitRefBtn');assert.ok(e.painted('refCanvas')>0);
  await e.click('#nextBtn');assert.equal(e.painted('refCanvas'),0);await e.click('#prevBtn');assert.ok(e.painted('refCanvas')>0);
  await penTriangle(e);const before=commands((await e.download()).font,'0');await e.click('#removeRefBtn');assert.equal(e.get('#refControls').style.display,'none');assert.equal(e.get('#refEmpty').hidden,false);assert.equal(e.painted('refCanvas'),0);
  assert.deepEqual(commands((await e.download()).font,'0'),before);assert.deepEqual(e.errors,[]);
});
test('anchor inspector edits and undo change actual exported geometry correctly',async t=>{
  const e=createEditor();t.after(e.close);await penTriangle(e);const original=commands((await e.download()).font,'0');
  await e.click('[data-mode="select"]');await e.dot(300,300);await e.dot(100,100);
  assert.equal(e.get('#anchorControls').hidden,false);assert.equal(e.get('#anchorTitle').textContent,'Anchor 1');
  await e.input('[data-anchor-field="x"]',125,'change');assert.notDeepEqual(commands((await e.download()).font,'0'),original);
  await e.click('#undoBtn');assert.deepEqual(commands((await e.download()).font,'0'),original);
  await e.dot(300,300);await e.dot(100,100);await e.click('[data-anchor-mode="smooth"]');
  assert.equal(e.get('[data-anchor-mode="smooth"]').getAttribute('aria-pressed'),'true');
  await e.click('[data-anchor-mode="independent"]');const incoming=e.get('[data-anchor-field="inX"]').value;
  await e.input('[data-anchor-field="outX"]',100,'change');await e.input('[data-anchor-field="outY"]',0,'change');
  assert.equal(e.get('[data-anchor-field="inX"]').value,incoming);assert.ok(commands((await e.download()).font,'0').length>=4);
  assert.deepEqual(e.errors,[]);
});
test('Move and resize transform a selected shape while layer locks and visibility block drawing',async t=>{
  const e=createEditor();t.after(e.close);await penTriangle(e);
  await e.click('[data-mode="move"]');await e.dot(300,300);await e.stroke([[300,300],[350,350]]);
  const moved=commands((await e.download()).font,'0');assert.ok(moved.some(c=>c.x===150&&c.y===150));
  await e.stroke([[550,150],[700,100]]);const resized=commands((await e.download()).font,'0');assert.notDeepEqual(resized,moved);
  await e.click('#drawingLockBtn');await e.click('[data-mode="freehand"]');await e.stroke([[100,200],[400,500]]);
  assert.deepEqual(commands((await e.download()).font,'0'),resized);
  await e.click('#drawingLockBtn');await e.click('#drawingVisBtn');await e.stroke([[100,200],[400,500]]);
  assert.deepEqual(commands((await e.download()).font,'0'),resized);
  assert.deepEqual(e.errors,[]);
});
test('unfinished pen paths can be edited, resumed, closed, undone and cancelled through the relocated controls',async t=>{
  const e=createEditor();t.after(e.close);await e.click('[data-mode="pen"]');
  await e.dot(100,100);await e.dot(300,600,[350,650]);await e.dot(500,100);
  await e.click('[data-mode="select"]');assert.equal(e.get('#anchorControls').hidden,false);
  await e.input('[data-anchor-field="x"]',520,'change');await e.click('[data-mode="pen"]');await e.click('#closePathBtn');
  assert.match(e.get('#progressLabel').textContent,/1\s*\/\s*62/);assert.ok(commands((await e.download()).font,'0').length>=4);
  await e.click('#undoBtn');assert.equal(e.get('[data-mode="pen"]').getAttribute('aria-pressed'),'true');assert.equal(e.get('#closePathBtn').disabled,false);
  await e.click('#cancelPathBtn');assert.equal(e.get('#closePathBtn').disabled,true);assert.equal(e.get('#cancelPathBtn').disabled,true);
  await e.click('#downloadBtn');assert.match(e.get('#statusLine').textContent,/Draw at least one/);
  assert.deepEqual(e.errors,[]);
});
test('invalid reference files report an error and preserve the previously loaded image',async t=>{
  const e=createEditor();t.after(e.close);const scan=createCanvas(16,16);scan.getContext('2d').fillRect(0,0,16,16);
  await e.upload(scan.toBuffer('image/png'));const before=e.painted('refCanvas');
  await e.chooseFile(Buffer.from('not an image'),'notes.txt','text/plain');assert.match(e.get('#statusLine').textContent,/Choose an image file/);assert.equal(e.painted('refCanvas'),before);
  await e.chooseFile(Buffer.from('invalid png bytes'),'broken.png','image/png');
  for(let n=0;n<100&&!e.get('#statusLine').textContent.includes("Couldn't load");n++) await new Promise(resolve=>setTimeout(resolve,5));
  assert.match(e.get('#statusLine').textContent,/Couldn't load/);assert.equal(e.painted('refCanvas'),before);assert.deepEqual(e.errors,[]);
});
test('nested pen contours export a genuine counter (hole) in the generated font',async t=>{
  const e=createEditor();t.after(e.close);await e.click('[data-mode="pen"]');
  for(const point of [[100,100],[100,700],[500,700],[500,100]])await e.dot(...point);await e.click('#closePathBtn');
  for(const point of [[200,250],[200,550],[400,550],[400,250]])await e.dot(...point);await e.click('#closePathBtn');
  const result=await e.download(),raster=createCanvas(800,900),ctx=raster.getContext('2d');glyph(result.font,'0').getPath(0,800,1000).draw(ctx);
  assert.ok(ctx.getImageData(150,400,1,1).data[3]>200,'outer stroke is filled');
  assert.equal(ctx.getImageData(300,400,1,1).data[3],0,'counter stays transparent');assert.deepEqual(e.errors,[]);
});
test('reference moves only when unlocked and hiding it clears the selection',async t=>{
  const e=createEditor();t.after(e.close);const image=createCanvas(40,40);image.getContext('2d').fillRect(8,8,24,24);await e.upload(image.toBuffer('image/png'));
  const snapshot=()=>e.backing(e.get('#refCanvas')).toBuffer('image/png');const before=snapshot();
  await e.click('#lockRefBtn');await e.click('[data-mode="move"]');await e.dot(250,350);await e.stroke([[250,350],[300,400]]);assert.deepEqual(snapshot(),before);
  await e.click('#lockRefBtn');await e.dot(250,350);await e.stroke([[250,350],[300,400]]);assert.notDeepEqual(snapshot(),before);
  await e.click('#toggleRefBtn');assert.equal(e.painted('refCanvas'),0);assert.equal(e.painted('inkCanvas'),0,'hidden reference has no remaining transform overlay');
  assert.deepEqual(e.errors,[]);
});
test('Grid toggle visibly changes canvas pixels independently of Guides',async t=>{
  const e=createEditor();t.after(e.close);await e.click('#guidesToggle');
  const canvas=e.backing(e.get('#guidesCanvas')),ctx=canvas.getContext('2d');
  const initial=Buffer.from(ctx.getImageData(0,0,canvas.width,canvas.height).data);
  let coverage=0,peakAlpha=0;
  for(let n=3;n<initial.length;n+=4){if(initial[n])coverage++;peakAlpha=Math.max(peakAlpha,initial[n]);}
  assert.ok(coverage>canvas.width*canvas.height*.025,'enabled grid must cover visible line intervals, not nearly invisible dots');
  assert.ok(peakAlpha>=50,'grid must have enough opacity to distinguish it from white');
  await e.click('#gridToggle');assert.equal(e.get('#gridToggle').getAttribute('aria-pressed'),'false');assert.equal(e.get('#gridState').textContent,'Off');assert.equal(e.painted('guidesCanvas'),0);
  await e.click('#gridToggle');assert.equal(e.get('#gridState').textContent,'On');assert.deepEqual(Buffer.from(ctx.getImageData(0,0,canvas.width,canvas.height).data),initial);
  await e.click('#guidesToggle');const withBoth=canvas.toBuffer('image/png');await e.click('#gridToggle');
  assert.ok(e.painted('guidesCanvas')>0,'height and advance guides remain when grid is off');assert.notDeepEqual(canvas.toBuffer('image/png'),withBoth);
  assert.deepEqual(e.errors,[]);
});
test('Focus mode collapses the full header while keeping branding, navigation and valid font export',async t=>{
  const e=createEditor();t.after(e.close);assert.equal(e.get('#projectHeader').hidden,false);assert.equal(e.get('#focusToggleBtn').getAttribute('aria-expanded'),'true');
  await e.input('#fontNameInput','Focus Studio');await penTriangle(e);const before=commands((await e.download()).font,'0');
  await e.click('#zoomInBtn');await e.click('#zoomInBtn');await e.click('#focusToggleBtn');
  assert.equal(e.get('#projectHeader').hidden,true);assert.equal(e.window.getComputedStyle(e.get('#projectHeader')).display,'none');
  assert.equal(e.get('#focusBrand').hidden,false);assert.match(e.get('#focusBrand img').alt,/Aksara/);assert.equal(e.get('#focusExportGroup').hidden,false);
  assert.equal(e.get('#focusToggleBtn').getAttribute('aria-expanded'),'false');assert.equal(e.window.localStorage.getItem('aksara:focus-mode'),'1');
  assert.equal(e.get('#fontNameInput').value,'Focus Studio');assert.equal(e.get('#canvasZoomLabel').textContent,'150%');
  await e.click('#nextBtn');assert.equal(e.get('#currentCharLabel').textContent,'1');await e.click('#prevBtn');
  const result=await e.download('#railDownloadBtn');assert.equal(result.filename,'focus-studio.otf');assert.deepEqual(commands(result.font,'0'),before);
  await e.click('#focusToggleBtn');assert.equal(e.get('#projectHeader').hidden,false);assert.equal(e.get('#focusExportGroup').hidden,true);
  assert.equal(e.get('#fontNameInput').value,'Focus Studio');assert.equal(e.window.localStorage.getItem('aksara:focus-mode'),'0');assert.deepEqual(e.errors,[]);
});
test('Focus preference restores on startup and unavailable storage does not block the editor',async t=>{
  const remembered=createEditor({focusPreference:true});t.after(remembered.close);
  assert.equal(remembered.get('#projectHeader').hidden,true);assert.equal(remembered.get('#focusBrand').hidden,false);
  await remembered.click('#railDownloadBtn');assert.match(remembered.get('#statusLine').textContent,/Draw at least one/);
  assert.equal(remembered.get('#statusLine').closest('#projectHeader'),null,'status remains visible outside the collapsed header');
  const restricted=createEditor({storageUnavailable:true});t.after(restricted.close);assert.equal(restricted.get('#projectHeader').hidden,false);
  await restricted.click('#focusToggleBtn');assert.equal(restricted.get('#projectHeader').hidden,true);await restricted.click('#focusToggleBtn');assert.equal(restricted.get('#projectHeader').hidden,false);
  assert.deepEqual(remembered.errors,[]);assert.deepEqual(restricted.errors,[]);
});
test('Focus mode never reflows the canvas during an active drawing gesture',async t=>{
  const e=createEditor();t.after(e.close);await e.click('[data-mode="freehand"]');await e.pointer('pointerdown',100,100);
  await e.click('#focusToggleBtn');assert.equal(e.get('#projectHeader').hidden,false);
  await e.pointer('pointermove',300,600);await e.pointer('pointerup',300,600);await e.click('#focusToggleBtn');assert.equal(e.get('#projectHeader').hidden,true);
  assert.ok(commands((await e.download('#railDownloadBtn')).font,'0').length>4);assert.deepEqual(e.errors,[]);
});
test('an unfinished path survives collapsing and restoring the project header',async t=>{
  const e=createEditor();t.after(e.close);await e.click('[data-mode="pen"]');await e.dot(100,100);await e.dot(300,650,[350,650]);
  await e.click('#focusToggleBtn');await e.dot(500,100);await e.click('#focusToggleBtn');await e.click('#closePathBtn');
  assert.match(e.get('#progressLabel').textContent,/1\s*\/\s*62/);assert.ok(commands((await e.download()).font,'0').length>=4);assert.deepEqual(e.errors,[]);
});
test('header and focused export controls share busy state and do not start duplicate downloads',async t=>{
  const e=createEditor({focusPreference:true});t.after(e.close);await penTriangle(e);await e.click('#railDownloadBtn');
  assert.equal(e.get('#downloadBtn').disabled,true);assert.equal(e.get('#railDownloadBtn').disabled,true);assert.equal(e.get('#railDownloadBtn').getAttribute('aria-busy'),'true');
  e.get('#downloadBtn').click();e.get('#railDownloadBtn').click();await e.flushTimers();
  assert.equal(e.downloads.length,1);assert.equal(e.get('#downloadBtn').disabled,false);assert.equal(e.get('#railDownloadBtn').disabled,false);assert.deepEqual(e.errors,[]);
});


test('Character set collapse preserves unfinished paths, zoom, navigation, history and export',async t=>{
  const e=createEditor();t.after(e.close);
  await e.click('[data-mode="pen"]');await e.dot(100,100);await e.dot(300,650);
  await e.click('#zoomInBtn');await e.click('#charPanelToggle');
  assert.equal(e.get('#charPanelContent').hidden,true);
  assert.equal(e.get('#charPanelToggle').getAttribute('aria-expanded'),'false');
  assert.equal(e.get('#canvasZoomLabel').textContent,'125%');
  await e.dot(500,100);await e.click('#closePathBtn');
  const before=commands((await e.download()).font,'0');
  await e.click('#charPanelToggle');assert.equal(e.get('#charPanelContent').hidden,false);
  await e.click('#undoBtn');assert.equal(e.get('#closePathBtn').disabled,false);await e.click('#redoBtn');
  assert.deepEqual(commands((await e.download()).font,'0'),before);
  await e.click('#charPanelToggle');await e.click('#nextBtn');assert.equal(e.get('#currentCharLabel').textContent,'1');
  await e.click('#prevBtn');assert.deepEqual(commands((await e.download()).font,'0'),before);
  assert.deepEqual(e.errors,[]);
});
test('Character set cannot reflow the editor during a live pointer gesture',async t=>{
  const e=createEditor();t.after(e.close);await e.click('[data-mode="freehand"]');
  await e.pointer('pointerdown',100,100);await e.click('#charPanelToggle');
  assert.equal(e.get('#charPanelContent').hidden,false);
  await e.pointer('pointermove',200,500);await e.pointer('pointerup',300,100);
  assert.ok(commands((await e.download()).font,'0').length>0);
  await e.click('#charPanelToggle');assert.equal(e.get('#charPanelContent').hidden,true);
  assert.deepEqual(e.errors,[]);
});
test('inspector follows reference and anchor context without dropping values or geometry',async t=>{
  const e=createEditor();t.after(e.close);
  assert.equal(e.get('.reference-panel').hidden,true);assert.equal(e.get('.anchor-panel').hidden,true);
  await penTriangle(e);const before=commands((await e.download()).font,'0');
  await e.click('[data-mode="select"]');await e.dot(300,300);await e.dot(100,100);
  assert.equal(e.get('.anchor-panel').hidden,false);
  await e.click('[data-mode="move"]');await e.key('Escape');assert.equal(e.get('.anchor-panel').hidden,true);
  const scan=createCanvas(20,20);scan.getContext('2d').fillRect(0,0,20,20);await e.upload(scan.toBuffer('image/png'));
  assert.equal(e.get('.reference-panel').hidden,false);await e.input('#refOpacity',65);
  await e.click('#nextBtn');assert.equal(e.get('.reference-panel').hidden,false);assert.equal(e.get('#refOpacityValue').textContent,'40%');
  await e.click('#prevBtn');assert.equal(e.get('.reference-panel').hidden,false);assert.equal(e.get('#refOpacityValue').textContent,'65%');
  await e.click('#removeRefBtn');assert.equal(e.get('.reference-panel').hidden,true);
  assert.deepEqual(commands((await e.download()).font,'0'),before);assert.deepEqual(e.errors,[]);
});
