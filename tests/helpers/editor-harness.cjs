// Executes the unmodified editor script with a DOM and real Skia Canvas rendering.
// Layout dimensions, pointer capture, clocks, and FontFace are explicit adapters;
// this is workflow integration coverage, not a browser layout/compatibility test.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { JSDOM, VirtualConsole } = require('jsdom');
const { createCanvas, Image, GlobalFonts } = require('@napi-rs/canvas');
const opentype = require('opentype.js');
const html = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

function createEditor({ viewportSize = 600, focusPreference, storageUnavailable = false } = {}) {
  const errors = [], warnings = [], downloads = [], previews = [], fontKeys = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(error.message));
  const dom = new JSDOM(html, { url:'https://aksarafontmaker.netlify.app/', runScripts:'outside-only', virtualConsole });
  const w = dom.window, d = w.document;
  if (storageUnavailable) Object.defineProperty(w,'localStorage',{get(){throw new Error('Preference storage unavailable');}});
  else if (focusPreference !== undefined) w.localStorage.setItem('aksara:focus-mode',focusPreference ? '1':'0');
  w.console.error = (...args) => errors.push(args.map(String).join(' '));
  w.console.warn = (...args) => warnings.push(args.map(String).join(' '));
  const canvases = new WeakMap(), captures = new Map(), timers = new Map();
  let time = 1000, nextTimer = 0, frame = null;
  function backing(element) {
    let canvas = canvases.get(element);
    if (!canvas) { canvas=createCanvas(Math.max(1,element.width),Math.max(1,element.height));canvases.set(element,canvas); }
    return canvas;
  }
  const proto=w.HTMLCanvasElement.prototype;
  for (const dimension of ['width','height']) {
    const original=Object.getOwnPropertyDescriptor(proto,dimension);
    Object.defineProperty(proto,dimension,{configurable:true,get:original.get,set(value){original.set.call(this,value);const canvas=canvases.get(this);if(canvas) canvas[dimension]=Math.max(1,original.get.call(this));}});
  }
  proto.getContext=function(type){assert.equal(type,'2d');return backing(this).getContext('2d');};
  w.Blob=Blob;w.Image=Image;w.opentype=opentype;
  w.document.fonts=new Set();
  w.FontFace=class {
    constructor(family,buffer){this.family=family;this.buffer=buffer;}
    async load(){
      this.parsed=opentype.parse(this.buffer);
      const key=GlobalFonts.register(Buffer.from(this.buffer),this.family);
      assert.ok(key,'generated font must be accepted by the native font parser');
      fontKeys.push(key);previews.push(this);return this;
    }
  };
  w.URL.createObjectURL=blob=>{const url='blob:aksara/'+downloads.length;downloads.push({url,blob});return url;};
  w.URL.revokeObjectURL=()=>{};
  w.HTMLAnchorElement.prototype.click=function(){const record=downloads.find(item=>item.url===this.href);if(record) record.filename=this.download;};
  w.Date.now=()=>time;
  w.setTimeout=(callback,delay)=>{const id=++nextTimer;timers.set(id,{callback,delay});return id;};
  w.clearTimeout=id=>timers.delete(id);
  w.requestAnimationFrame=callback=>{frame=callback;return 1;};
  w.ResizeObserver=class {observe(){} disconnect(){}};
  w.Element.prototype.setPointerCapture=function(id){captures.set(id,this);};
  w.Element.prototype.hasPointerCapture=function(id){return captures.get(id)===this;};
  w.Element.prototype.releasePointerCapture=function(id){if(captures.get(id)===this) captures.delete(id);};
  Object.defineProperty(w.navigator,'platform',{value:'MacIntel'});
  const viewport=d.getElementById('canvasViewport'),shell=d.getElementById('artboardShell');
  Object.defineProperties(viewport,{clientWidth:{get:()=>viewportSize},clientHeight:{get:()=>viewportSize}});
  viewport.getBoundingClientRect=()=>({left:100,top:100,width:viewportSize,height:viewportSize,right:100+viewportSize,bottom:100+viewportSize});
  function boardRect(){
    const size=parseFloat(shell.style.width) ? parseFloat(shell.style.width)-22 : viewportSize-62;
    const left=142+Math.max(0,(viewportSize-size-62)/2)-viewport.scrollLeft;
    const top=142+Math.max(0,(viewportSize-size-62)/2)-viewport.scrollTop;
    return {left,top,width:size,height:size,right:left+size,bottom:top+size};
  }
  for (const id of ['canvasWrap','guidesCanvas','refCanvas','inkCanvas']) d.getElementById(id).getBoundingClientRect=boardRect;
  w.eval(script);
  const get=selector=>{const el=d.querySelector(selector);assert.ok(el,'element '+selector);return el;};
  async function settle(){if(frame){const callback=frame;frame=null;callback(time);}await Promise.resolve();await new Promise(resolve=>setImmediate(resolve));}
  async function click(selector){const el=get(selector);assert.ok(!el.disabled,'control is enabled: '+selector);el.click();await settle();}
  async function input(selector,value,event='input'){const el=get(selector);el.value=String(value);el.dispatchEvent(new w.Event(event,{bubbles:true}));await settle();}
  async function key(key,options={}){(options.target?get(options.target):d.activeElement||d.body).dispatchEvent(new w.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true,...options}));await settle();}
  async function keyUp(key){d.activeElement.dispatchEvent(new w.KeyboardEvent('keyup',{key,bubbles:true}));await settle();}
  function point(x,y){const r=boardRect();return {clientX:r.left+x*r.width/1000,clientY:r.top+(800-y)*r.width/1000};}
  async function pointer(type,x,y,options={}){
    const id=options.pointerId||1,target=captures.get(id)||get('#inkCanvas');
    const event=new w.MouseEvent(type,{bubbles:true,cancelable:true,button:0,buttons:type==='pointerup'?0:1,...point(x,y),...options});
    Object.defineProperty(event,'pointerId',{value:id});target.dispatchEvent(event);
    if(type==='pointerup'||type==='pointercancel') captures.delete(id);
    await settle();
  }
  async function dot(x,y,dragTo){time+=500;await pointer('pointerdown',x,y);if(dragTo)await pointer('pointermove',...dragTo);await pointer('pointerup',...(dragTo||[x,y]));}
  async function stroke(points){time+=500;await pointer('pointerdown',...points[0]);for(const p of points.slice(1))await pointer('pointermove',...p);await pointer('pointerup',...points.at(-1));}
  async function flushTimers(maxDelay=500){
    for(let pass=0;pass<10;pass++){
      const selected=[...timers].filter(([,timer])=>timer.delay<=maxDelay);if(!selected.length)break;
      for(const [id,timer] of selected){if(timers.delete(id)) timer.callback();}
      await settle();
    }
  }
  async function download(selector='#downloadBtn'){const before=downloads.length;await click(selector);await flushTimers();assert.equal(downloads.length,before+1,errors.join('\n'));const item=downloads.at(-1);item.buffer=await item.blob.arrayBuffer();item.font=opentype.parse(item.buffer);return item;}
  async function chooseFile(buffer,name='scan.png',type='image/png'){
    const input=get('#refFileInput'),file=new w.File([buffer],name,{type});
    Object.defineProperty(input,'files',{configurable:true,value:[file]});input.dispatchEvent(new w.Event('change',{bubbles:true}));await settle();
  }
  async function upload(buffer,name='scan.png',type='image/png'){
    await chooseFile(buffer,name,type);
    for(let n=0;n<100;n++){await new Promise(resolve=>setTimeout(resolve,5));await settle();if(get('#refStatus').textContent==='Image loaded')return;}
    throw Error('reference upload did not complete: '+errors.join('\n'));
  }
  function pixels(id){const canvas=backing(get('#'+id));return canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;}
  function painted(id){const data=pixels(id);let count=0;for(let n=3;n<data.length;n+=4) if(data[n])count++;return count;}
  function close(){for(const key of fontKeys)GlobalFonts.remove(key);w.close();}
  return {window:w,document:d,get,click,input,key,keyUp,dot,stroke,pointer,settle,flushTimers,download,upload,chooseFile,painted,previews,downloads,errors,warnings,close,backing,viewport};
}
module.exports={createEditor,createCanvas,opentype};
