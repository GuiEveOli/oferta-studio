import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const ctx=vm.createContext({structuredClone,console,document:{querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){}},window:{addEventListener(){}},crypto:{randomUUID:()=>Math.random().toString(36)}});
for(const file of ['public/offers-data.js','public/presets.js','public/paid-media-layout.js','public/paid-media-text.js'])vm.runInContext(fs.readFileSync(file,'utf8'),ctx);
ctx.OfferData=ctx.window.OfferData;let source=fs.readFileSync('public/studio.js','utf8');vm.runInContext(fs.readFileSync('public/presets.js','utf8'),ctx);vm.runInContext(source.slice(0,source.lastIndexOf('\nrender();')),ctx);vm.runInContext(fs.readFileSync('public/paid-media.js','utf8'),ctx);
const PM=ctx.window.PaidMedia,C=ctx.window.PAID_MEDIA_PRESETS,P=PM.state;
assert.deepEqual(Array.from(P.packs,p=>p.count),[2,3,2]);assert.equal(P.packs.length*Object.keys(C.formats).length,9);
assert.deepEqual(Object.values(C.formats).map(f=>[f.width,f.height]),[[1080,1080],[1080,1920],[1200,628]]);
const normal={id:'a',sku:'100',name:'Produto normal',image:'/normal.png',offerKind:'normal',price:12.99,showClub:false};const club={...normal,id:'b',name:'Produto clube',showClub:true,offerKind:'club',price:10.99};const take={...normal,offerKind:'takePay',takeQty:3,payQty:2};
for(const [format,c] of Object.entries(C.formats))for(let count=1;count<=6;count++){
 const slots=C.getSlots(c,count);assert.equal(slots.length,count);
 slots.forEach((slot,i)=>{assert.ok(slot.x>=0&&slot.y>=0&&slot.x+slot.width<=c.width&&slot.y+slot.height<=c.height);for(const p of [normal,club,take]){const nodes=PM.slotNodes(p,format,slot,i);assert.ok(nodes.some(n=>n.role==='image'&&n.src===p.image));assert.equal(nodes.some(n=>n.role==='badge'),p.showClub);assert.equal(nodes.some(n=>n.role==='legal'),p.offerKind==='takePay');nodes.forEach(n=>{assert.equal(n.slot,i);assert.ok(n.x>=slot.x&&n.y>=slot.y&&n.x+n.width<=slot.x+slot.width+.01&&n.y+n.height<=slot.y+slot.height+.01)})}})
}
const p=P.packs[0];p.slots[0]={...normal};PM.refreshSlot(p,0);assert.equal(Object.values(p.boards).filter(b=>b.nodes.some(n=>n.text===normal.name)).length,3);
const feedName=p.boards.feed.nodes.find(n=>n.role==='name'),storyName=p.boards.stories.nodes.find(n=>n.role==='name');const storyX=storyName.x;feedName.x=99;feedName.fill='#112233';assert.equal(storyName.x,storyX);p.slots[0]={...club};PM.refreshSlot(p,0);assert.equal(p.boards.feed.nodes.find(n=>n.role==='name').x,99);assert.equal(p.boards.feed.nodes.find(n=>n.role==='name').fill,'#112233');assert.ok(Object.values(p.boards).every(b=>b.nodes.some(n=>n.role==='badge')&&b.nodes.some(n=>n.text===club.name)));assert.equal(P.packs[1].boards.feed.nodes.length,0);
p.slots[1]={...take};PM.refreshSlot(p,1);assert.ok(Object.values(p.boards).every(b=>b.nodes.some(n=>n.slot===1&&n.text==='LEVE 3\nPAGUE 2')&&b.nodes.some(n=>n.slot===1&&n.role==='legal')));p.slots[0]=null;PM.refreshSlot(p,0);assert.ok(Object.values(p.boards).every(b=>!b.nodes.some(n=>n.slot===0)&&b.nodes.some(n=>n.slot===1)));
const site=vm.runInContext('S',ctx);assert.equal(site.boards.length,0);assert.equal(site.report,null);assert.equal(site.workspace,'site');assert.ok(vm.runInContext("shell('teste')",ctx).includes('Banners Site'));
console.log('Paid media checks passed: 2/3/2 packs, nine dimensions, 18 count/format layouts, card contents, shared slot replacements, per-format position/color retention, isolated packs and site workspace, badge/legal rules and slot clearing.');
const L=ctx.window.PaidMediaLayout;
const b=p.boards.feed;p.slots[0]={...normal};PM.refreshSlot(p,0);const original=JSON.parse(JSON.stringify(b)),storySnapshot=JSON.stringify(p.boards.stories),otherPack=JSON.stringify(P.packs[1]);
const first=b.nodes[0];const x=first.x,y=first.y,w=first.width;
assert.equal(L.apply(C.formats.feed,b,p.count,{x:119,y:489}),true);assert.equal(first.x,x+100);assert.equal(first.y,y+100);assert.equal(first.width,w);
assert.equal(L.apply(C.formats.feed,b,p.count,{scale:50}),true);assert.ok(Math.abs(first.width-w*.5)<.001);assert.equal(L.frame(C.formats.feed,b).width,1029*.5);assert.equal(JSON.stringify(p.boards.stories),storySnapshot);
L.apply(C.formats.feed,b,p.count,{direction:'column'});const slots=L.slots(C.formats.feed,b,p.count);assert.equal(slots[0].x,slots[1].x);assert.ok(slots[1].y>slots[0].y);assert.equal(JSON.stringify(P.packs[1]),otherPack);
const modified=JSON.stringify(b);assert.equal(L.apply(C.formats.feed,b,p.count,{scale:0}),false);assert.equal(JSON.stringify(b),modified);
const savedX=b.nodes.find(n=>n.role==='name').x;p.slots[0]={...club};PM.refreshSlot(p,0);assert.equal(b.nodes.find(n=>n.role==='name').x,savedX);assert.equal(b.nodes.find(n=>n.role==='badge').x,PM.slotNodes(club,'feed',slots[0],0).find(n=>n.role==='badge').x);
console.log('Group layout checks passed: translated/scaled nodes and panel, vertical slots, per-format/pack isolation, invalid scale rejection, preserved slot replacement and new badge geometry.');
assert.ok(PM.slotNodes(take,'feed',C.getSlots(C.formats.feed,2)[0],0).find(n=>n.role==='price').text==='LEVE 3\nPAGUE 2');assert.equal(PM.slotNodes(normal,'feed',C.getSlots(C.formats.feed,2)[0],0).find(n=>n.role==='name').fontWeight,350);
const flow=PM.slotNodes({...club,name:'Curto'},'feed',{x:0,y:0,width:629,height:377},0),T=ctx.window.PaidMediaText;
const measure=(n)=>({width:n.role==='name'?80:150,height:n.role==='name'?(n.text==='Curto'?30:90):50,fontSize:n.fontSize});T.compact(flow,{x:0,y:0,width:629,height:377},measure,8);
const title=flow.find(n=>n.role==='name'),price=flow.find(n=>n.role==='price'),badge=flow.find(n=>n.role==='badge');assert.equal(title.height,30);assert.equal(title.width,80);assert.equal(price.y,title.y+30+8);assert.equal(badge.y,price.y+50+8);
const shortY=price.y;title.text='Nome com três linhas';T.compact(flow,{x:0,y:0,width:629,height:377},measure,8);assert.equal(price.y,shortY+30);assert.equal(badge.y,price.y+price.height+8);const once=JSON.stringify(flow);T.compact(flow,{x:0,y:0,width:629,height:377},measure,8);assert.equal(JSON.stringify(flow),once);
price.flowOffsetY=12;T.compact(flow,{x:0,y:0,width:629,height:377},measure,8);assert.equal(price.y,title.y+title.height+20);assert.equal(badge.y,price.y+price.height+8);
console.log('Text flow checks passed: Semilight weight, two-line mechanic, tight content dimensions, short/long name reflow, adjacent badge, stable repeated layout and preserved manual offset.');

for(const [format,c] of Object.entries(C.formats))for(const count of [2,3])for(const slot of C.getSlots(c,count)){for(const product of [normal,club,take,{...club,name:'Nome com três linhas'}]){const nodes=PM.slotNodes(product,format,slot,0);const measure=n=>({width:n.width,height:n.role==='name'?(product.name==='Nome com três linhas'?60:20):30,fontSize:n.fontSize});T.compact(nodes,slot,measure);const image=nodes.find(n=>n.role==='image'),infos=nodes.filter(n=>['name','price','badge','legal'].includes(n.role));const center=(Math.min(...infos.map(n=>n.y))+Math.max(...infos.map(n=>n.y+n.height)))/2;assert.ok(Math.abs(center-(slot.y+slot.height/2))<.00001);assert.ok(Math.abs(image.y+image.height/2-center)<.00001);const once=JSON.stringify(nodes);T.compact(nodes,slot,measure);assert.equal(JSON.stringify(nodes),once)}}
console.log('Centering checks passed: shared image/information center for two/three products, every format, short/long names, badge, legal and idempotent reflow.');
// Per-pack presets must feed every geometry consumer without modifying global formats.
const special=P.packs[1],baseFeed=JSON.stringify(C.formats.feed);
for(const [f,expected] of Object.entries({feed:[510,98,516,888],stories:[496,514,552,946]})){
 const board=special.boards[f],frame=L.frame(C.formats[f],board),slots=L.slots(C.formats[f],board,3);
 assert.deepEqual([frame.x,frame.y,frame.width,frame.height],expected);assert.equal(frame.direction,'column');assert.equal(board.panel,'#ffffff');
 assert.equal(slots.length,3);assert.ok(slots.every(s=>s.x===frame.x&&s.width===frame.width));assert.equal(slots[1].y,slots[0].y+slots[0].height);
 special.slots[0]={...club};PM.refreshSlot(special,0,false);assert.ok(board.nodes.every(n=>n.x>=frame.x&&n.x+n.width<=frame.x+frame.width+.01));
 const other=JSON.stringify(special.boards[f==='feed'?'stories':'feed']);assert.ok(L.apply(C.formats[f],board,3,{x:frame.x-10,scale:80}));assert.equal(L.frame(C.formats[f],board).width,frame.width*.8);assert.equal(JSON.stringify(special.boards[f==='feed'?'stories':'feed']),other);
 delete board.layout;assert.equal(L.frame(C.formats[f],board).width,expected[2]);
}
assert.equal(JSON.stringify(C.formats.feed),baseFeed);assert.equal(L.frame(C.formats.feed,P.packs[2].boards.feed).direction,'row');assert.equal(L.frame(C.formats.landscape,special.boards.landscape).x,619);
console.log('Pack 2 presets verified: reference panel positions, three vertical slots, white panel, product placement, independent scale edits, reset and unchanged other packs/formats.');
