import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const c=vm.createContext({structuredClone,console,document:{querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){}},window:{addEventListener(){}},crypto:{randomUUID:()=>Math.random().toString(36)}});
vm.runInContext(fs.readFileSync('public/offers-data.js','utf8'),c);c.OfferData=c.window.OfferData;const source=fs.readFileSync('public/studio.js','utf8');vm.runInContext(fs.readFileSync('public/presets.js','utf8'),c);vm.runInContext(source.slice(0,source.lastIndexOf('\nrender();')),c);
const run=s=>vm.runInContext(s,c),get=s=>JSON.parse(run('JSON.stringify('+s+')'));
run("renderProperties=renderBoardList=drawStage=toast=()=>{};loadImage=()=>{throw new Error('Layout must not load images')};const p={id:'p',sku:'1',name:'Produto',price:10,image:'/a.png'}");
for(const format of ['vertical','panoramic','mini'])for(const count of [2,3]){
 run(`S.format='${format}';S.boards=[makeBoard(p)];S.active=0;`);
 if(count===3)run("current().nodes.splice(current().nodes.findIndex(n=>n.role==='ctaBand'),0,{...current().nodes.find(n=>n.role==='productImage'),id:'third',src:'/third.png'})");
 const srcs=get("current().nodes.filter(n=>n.role==='productImage').map(n=>[n.id,n.src])"),other=get("current().nodes.filter(n=>n.role!=='productImage')"),compositions=new Set();
 for(const id of get('IMAGE_LAYOUTS.map(x=>x[0])')){
  const before=get('current().nodes');run(`setProductLayout('${id}')`);
  let images=get("current().nodes.filter(n=>n.role==='productImage')");assert.deepEqual(images.map(n=>[n.id,n.src]),srcs);assert.deepEqual(get("current().nodes.filter(n=>n.role!=='productImage')"),other);
  const [w,h]=get('[boardFormat(current()).width,boardFormat(current()).height]');for(const n of images)assert.ok(n.x>=0&&n.y>=0&&n.x+n.width<=w&&n.y+n.height<=h,`${format}/${count}/${id} outside artboard`);
  compositions.add(JSON.stringify(images.map(n=>[n.x,n.y,n.width,n.height])));
  run("historyGo('undo')");assert.deepEqual(get('current().nodes'),before);run("historyGo('redo')");assert.equal(get('current().imageLayout'),id);
 }
 assert.equal(compositions.size,6);
}
run("S.format='mini';S.boards=[makeBoard(p)];S.active=0;setProductLayout('stack')");
const stacked=get("current().nodes.filter(n=>n.role==='productImage')");await run('setImageSpacing(45)');const spaced=get("current().nodes.filter(n=>n.role==='productImage')");assert.equal(spaced[0].x,stacked[0].x);assert.equal(spaced[1].x,stacked[1].x);assert.ok(spaced[0].y<stacked[0].y&&spaced[1].y>stacked[1].y);
run('setProductScale(140);setImageCount(3)');assert.equal(get('current().imageLayout'),'stack');assert.equal(get('current().imageScale'),140);assert.equal(get("current().nodes.filter(n=>n.role==='productImage').length"),3);run('setImageCount(1)');assert.ok(!get('imageSection(current())').includes('image-layout-grid'));run('setImageCount(2)');assert.equal(get('current().imageLayout'),'stack');assert.equal((get('imageSection(current())').match(/class="image-layout-choice /g)||[]).length,6);
console.log('Image layouts verified: 36 format/count/composition combinations, bounds, distinct layouts, image identity, unrelated elements, undo/redo, stack spacing, scale retention, count changes and six lightweight buttons.');
