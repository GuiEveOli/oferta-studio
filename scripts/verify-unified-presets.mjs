import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const c=vm.createContext({window:{}});vm.runInContext(fs.readFileSync('public/presets.js','utf8'),c);const W=c.window,P=W.OFERTA_PRESETS;
assert.equal(W.OFFER_BRANDS,P.brands);assert.equal(W.PAID_MEDIA_PRESETS,P.paidMedia);assert.equal(W.BANNER_TEMPLATE_PRESETS,P.banners.shared);
const original=JSON.stringify(P.banners.shared);P.banners.byBrand.komprao.layouts.mini={price:{y:132}};
assert.equal(W.resolveBannerPresets('komprao').layouts.mini.price.y,132);assert.equal(W.resolveBannerPresets('komprao').layouts.mini.price.width,369);assert.equal(W.resolveBannerPresets('superkoch').layouts.mini.price.y,125);assert.equal(JSON.stringify(P.banners.shared),original);
const html=fs.readFileSync('public/studio.html','utf8');assert.equal((html.match(/src="\/presets.js"/g)||[]).length,1);assert.ok(!/src="\/(banner-presets|paid-media-presets|brands|style-presets)\.js"/.test(html));assert.ok(html.indexOf('/presets.js')<html.indexOf('/studio.js'));
for(const old of ['banner-presets','paid-media-presets','brands','style-presets'])assert.ok(!fs.existsSync('public/'+old+'.js'));
assert.equal(P.imageLayouts.length,6);for(const p of P.imageLayouts)for(const n of [2,3])assert.equal(p.slots[n].length,n);
console.log('Unified presets verified: single entrypoint, nested brand override inheritance/isolation, six image compositions, compatibility bindings and no duplicate preset files.');
