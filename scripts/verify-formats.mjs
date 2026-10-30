import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const c=vm.createContext({console,document:{querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){},createElement:()=>({})},window:{addEventListener(){}},crypto:{randomUUID:()=>Math.random().toString(36)}});
vm.runInContext(fs.readFileSync('public/offers-data.js','utf8'),c);c.OfferData=c.window.OfferData;
const source=fs.readFileSync('public/studio.js','utf8');vm.runInContext(source.slice(0,source.lastIndexOf('\nrender();')),c);
const run=code=>vm.runInContext(code,c),get=code=>JSON.parse(run('JSON.stringify('+code+')'));
run(`renderProperties=drawStage=renderBoardList=()=>{};const product={id:'p',sku:'1',name:'Produto de teste',price:16.99,image:'/test.png',offerKind:'club'};`);
for(const [format,width,height] of [['vertical',720,1281],['panoramic',1512,720],['mini',720,288]]){
 run(`S.format='${format}';S.boards=[makeBoard(product)];S.active=0;`);
 assert.deepEqual(get('[boardFormat(current()).width,boardFormat(current()).height]'),[width,height]);
 assert.equal(get("current().nodes.filter(n=>n.role==='productImage').length"),2);
 assert.equal(get("new Set(current().nodes.map(n=>n.id)).size"),get('current().nodes.length'));
 for(const model of ['price','takePay','percentage']){
  run(`current().offer.model='${model}';syncOfferNodes(current());`);
  for(const n of get('current().nodes')){assert.ok(n.x>=0&&n.y>=0&&n.x+n.width<=width&&n.y+n.height<=height,`${format}/${model}/${n.role} outside artboard`)}
 }
 for(const count of [1,2,3]){const boxes=get(`productBoxes('${format}',${count})`);assert.equal(boxes.length,count);for(const [x,y,w,h] of boxes)assert.ok(x>=0&&y>=0&&x+w<=width&&y+h<=height)}
 run(`setModelSelection(current().nodes.filter(n=>n.role==='name'||n.role==='productImage').map(n=>n.id));S.alignReference='artboard';alignSelection('right');`);
 for(const n of get('selectedModels()'))assert.equal(n.x+n.width,width);
}
// The same renderer powers previews and downloaded images. Verify full-size dimensions at scale 1.
run(`class MockCanvas{constructor(canvas,opts){this.options=opts;this.objects=[]}getContext(){return {}}setViewportTransform(){}add(o){this.objects.push(o)}renderAll(){}};fabric={StaticCanvas:MockCanvas,Rect:class{constructor(opts){Object.assign(this,opts)}},Gradient:class{constructor(opts){Object.assign(this,opts)}}};sceneNode=async n=>n;`);
for(const [format,width,height] of [['vertical',720,1281],['panoramic',1512,720],['mini',720,288]]){
 run(`S.format='${format}';S.boards=[makeBoard(product)];`);
 const result=await run(`createScene({replaceChildren(){}},current(),1,false)`);await result.ready;
 assert.equal(result.stage.options.width,width);assert.equal(result.stage.options.height,height);assert.equal(result.stage.options.enableRetinaScaling,false);
 if(format==='panoramic'){assert.equal(result.stage.backgroundColor,'#f6f7f8');assert.equal(result.stage.objects[0].width,920)}
}
console.log('Format checks passed: layout bounds for all offer models, 1–3 product slots, artboard alignment, exact export dimensions and panoramic panel.');
