import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const code=readFileSync(new URL('../public/studio.js',import.meta.url),'utf8');
const context=vm.createContext({structuredClone,document:{querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){}},window:{addEventListener(){}},crypto:{randomUUID:()=>Math.random().toString(36)},console});
vm.runInContext(readFileSync(new URL('../public/presets.js',import.meta.url),'utf8'),context);
vm.runInContext(readFileSync(new URL('../public/presets.js',import.meta.url),'utf8'),context);
vm.runInContext(code.slice(0,code.lastIndexOf('\nrender();')),context);
const run=code=>vm.runInContext(code,context);
const nodes=[{id:'a',x:40,y:90,width:100,height:60,rotation:0},{id:'b',x:180,y:160,width:70,height:120,rotation:30},{id:'c',x:510,y:430,width:90,height:50,rotation:-15},{id:'locked',x:12,y:20,width:30,height:40,locked:true},{id:'hidden',x:70,y:80,width:60,height:40,hidden:true}];
function setup(){run(`S.boards=[{id:'board',nodes:${JSON.stringify(nodes)},product:{},theme:{}}];S.active=0;S.history.set('board',[]);S.future.set('board',[]);S.alignReference='selection';setModelSelection(['a','b','c','locked','hidden'])`)}
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
for(const dir of ['left','center','right','top','middle','bottom']){setup();run(`alignSelection('${dir}')`);const boxes=JSON.parse(run('JSON.stringify(selectedModels().map(nodeBounds))'));const coordinate=b=>dir==='center'?(b.left+b.right)/2:dir==='middle'?(b.top+b.bottom)/2:b[dir];boxes.forEach(b=>near(coordinate(b),coordinate(boxes[0])));assert.equal(run("S.history.get('board').length"),1);assert.equal(run("current().nodes.find(n=>n.id==='locked').x"),12);assert.equal(run("current().nodes.find(n=>n.id==='hidden').y"),80)}
for(const axis of ['x','y']){setup();const before=JSON.parse(run('JSON.stringify(selectedModels())'));run(`distributeSelection('${axis}')`);const after=JSON.parse(run('JSON.stringify(selectedModels())'));const boxes=JSON.parse(run('JSON.stringify(selectedModels().map(nodeBounds))')).sort((a,b)=>axis==='x'?a.left-b.left:a.top-b.top);near(axis==='x'?boxes[1].left-boxes[0].right:boxes[1].top-boxes[0].bottom,axis==='x'?boxes[2].left-boxes[1].right:boxes[2].top-boxes[1].bottom);assert.deepEqual(after[0],before[0]);assert.deepEqual(after[2],before[2]);run("historyGo('undo')");assert.equal(run('JSON.stringify(current().nodes)'),JSON.stringify(nodes));run("historyGo('redo')");assert.equal(run('selectedModels().length'),0)}
setup();run("S.alignReference='artboard';alignSelection('center')");JSON.parse(run('JSON.stringify(selectedModels().map(nodeBounds))')).forEach(b=>near((b.left+b.right)/2,360));
setup();run('selectAllNodes()');assert.equal(run('S.selectedNodes.length'),3);run('deleteSelection()');assert.equal(run('current().nodes.length'),2);run("historyGo('undo')");assert.equal(run('current().nodes.length'),5);
setup();run("setModelSelection(['a','b']);distributeSelection('x')");assert.equal(run("S.history.get('board').length"),0);
console.log('Selection checks passed: rotated bounds, six alignments, artboard alignment, equal gaps, fixed endpoints, undo/redo and locked/hidden protection.');
