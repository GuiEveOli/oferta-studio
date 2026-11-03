/* Textos usam largura máxima para quebra e caixa real para seleção/fluxo.
 * measure recebe (node, alturaMáxima) e devolve width/height/fontSize.
 * O bloco de informações e a imagem compartilham o centro vertical do slot.
 * flowOffsetY guarda os ajustes manuais sem reintroduzir espaço vazio. */
window.PaidMediaText = {
  compact(nodes,slot,measure,gap=8){
    const textNodes=nodes.filter(n=>n.type==='text');
    for(const n of textNodes){n.wrapWidth??=n.width;n.maxTextHeight??=n.height;const size=measure(n,n.maxTextHeight);n.width=size.width;n.height=size.height;n.fontSize=size.fontSize}
    const name=nodes.find(n=>n.role==='name');if(!name)return;
    const image=nodes.find(n=>n.role==='image');
    if(image)image.y=slot.y+(slot.height-image.height)/2;
    name.y=0;
    const spacing=gap*Math.min(slot.width/629,slot.height/377);let bottom=name.y+name.height;
    for(const role of ['price','badge','legal']){const n=nodes.find(n=>n.role===role);if(!n)continue;n.y=bottom+spacing+(n.flowOffsetY||0);bottom=n.y+n.height}
    const information=nodes.filter(n=>['name','price','badge','legal'].includes(n.role));
    const top=Math.min(...information.map(n=>n.y)),base=Math.max(...information.map(n=>n.y+n.height));
    const center=image?image.y+image.height/2:slot.y+slot.height/2,shift=center-(top+base)/2;
    information.forEach(n=>n.y+=shift);
  }
};
