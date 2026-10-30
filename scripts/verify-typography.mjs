import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const c=vm.createContext({console,document:{querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){}},window:{addEventListener(){}},crypto:{randomUUID:()=>Math.random().toString(36)}});
vm.runInContext(fs.readFileSync('public/offers-data.js','utf8'),c);c.OfferData=c.window.OfferData;
const source=fs.readFileSync('public/studio.js','utf8');vm.runInContext(source.slice(0,source.lastIndexOf('\nrender();')),c);
const run=code=>vm.runInContext(code,c),get=code=>JSON.parse(run('JSON.stringify('+code+')'));
run(`renderProperties=renderBoardList=drawStage=toast=()=>{};const p={id:'p',name:'Produto',price:16.99,sku:'0078079',image:'/test.png',offerKind:'club'};`);
for(const format of ['vertical','panoramic','mini'])for(const model of ['price','takePay','percentage']){
 run(`S.format='${format}';constBoard=makeBoard(p);constBoard.offer.model='${model}';syncOfferNodes(constBoard);S.boards=[constBoard];S.active=0;`);
 for(const n of get("current().nodes.filter(n=>['text','price','discount'].includes(n.type))")){assert.equal(n.fontFamily,'Cocogoose Pro');assert.ok([350,400,700].includes(n.fontWeight));}
}
run("setModelSelection([current().nodes.find(n=>n.role==='name').id])");
for(const [key,value] of [['fontWeight',350],['lineHeight',1.35],['letterSpacing',2.5],['underline',true]]){
 c.testValue=value;
 run(`updateProperty({dataset:{node:'${key}'},type:'${typeof value==='boolean'?'checkbox':'number'}',value:testValue,checked:testValue},true)`);
 assert.equal(get(`nodeById().${key}`),value);
 run("historyGo('undo');setModelSelection([current().nodes.find(n=>n.role==='name').id]);historyGo('redo');setModelSelection([current().nodes.find(n=>n.role==='name').id])");
 assert.equal(get(`nodeById().${key}`),value);
}
assert.equal(get("fabricTypography({fontFamily:'Cocogoose Pro',fontWeight:350,fontSize:50,letterSpacing:2.5}).charSpacing"),50);
run("fabric={Shadow:class{constructor(options){Object.assign(this,options)}},Textbox:class{constructor(text,options){this.options=options}}}");
const options=get('textObject("Nome",nodeById()).options');assert.equal(options.lineHeight,1.35);assert.equal(options.underline,true);assert.equal(options.fontWeight,350);
run("S.boards=[];for(const format of ['vertical','panoramic','mini']){S.format=format;S.boards.push(makeBoard(p))}");
assert.equal(get("creativeFilename(S.boards[0],'png')"),'Vertical 1 - 0078079.png');
assert.equal(get("creativeFilename(S.boards[1],'jpg')"),'Panorâmico 2 - 0078079.jpg');
assert.equal(get("creativeFilename(S.boards[2],'webp')"),'Mini 3 - 0078079.webp');
console.log('Typography checks passed: Cocogoose in all presets and mechanics, spacing/weight/underline undo and redo, Fabric typography and stable export filenames.');
