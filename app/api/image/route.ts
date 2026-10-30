function publicURL(value: string): URL {
  const u = new URL(value);
  const h = u.hostname.toLowerCase();
  if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password || u.port || !h.includes('.') || /^[\d.]+$/.test(h) || h.includes(':') || /(^|\.)(localhost|local|internal|invalid|test)$/.test(h) || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) throw new Error('URL não permitida');
  return u;
}
export async function GET(request: Request) {
  try {
    let url = publicURL(new URL(request.url).searchParams.get('url') || '');
    let upstream: Response | undefined;
    for (let i = 0; i < 4; i++) {
      upstream = await fetch(url.toString(), { headers: { 'User-Agent': 'Mozilla/5.0 OfertaStudio/1.0', 'Accept': 'image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8' }, redirect: 'manual', signal: AbortSignal.timeout(20000) });
      if ([301,302,303,307,308].includes(upstream.status)) {
        url = publicURL(new URL(upstream.headers.get('location') || '', url).toString());
        upstream = undefined;
      } else break;
    }
    if (!upstream?.ok) return new Response('Não foi possível carregar a imagem.', {status:502});
    let type = (upstream.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (['png','jpeg','jpg','webp','gif'].includes(type)) type = 'image/' + (type==='jpg'?'jpeg':type);
    if (!['image/png','image/jpeg','image/webp','image/gif','image/avif','image/svg+xml'].includes(type)) return new Response('O endereço precisa apontar para uma imagem.', {status:415});
    const max = 15 * 1024 * 1024;
    if (Number(upstream.headers.get('content-length') || 0) > max) return new Response('Imagem maior que 15 MB.',{status:413});
    const reader = upstream.body?.getReader();
    if (!reader) return new Response('Imagem vazia.',{status:502});
    const chunks: Uint8Array[] = []; let length = 0;
    while (true) { const {done,value} = await reader.read(); if (done) break; length += value.byteLength; if (length>max) { await reader.cancel(); return new Response('Imagem maior que 15 MB.',{status:413}); } chunks.push(value); }
    const bytes = new Uint8Array(length); let offset = 0; for (const chunk of chunks) { bytes.set(chunk,offset); offset += chunk.length; }
    return new Response(bytes, {headers:{'Content-Type':type,'Cache-Control':'private, max-age=3600','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"}});
  } catch (error) { console.error('Image proxy:', error); return new Response('Não foi possível acessar esta imagem. Confira a URL ou envie o arquivo.', {status:400}); }
}
