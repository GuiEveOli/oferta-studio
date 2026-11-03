/* Geometria do conjunto em pixels reais. Cada formato mantém seu próprio layout.
 * x/y: canto superior esquerdo; scale: percentual; direction: row ou column. */
window.PaidMediaLayout = {
  resolve(format,board){return board.presetPack?window.PAID_MEDIA_PRESETS.getFormat(format.id,board.presetPack):format},
  get(format, board) {format=this.resolve(format,board);return {direction:format.direction,x:format.panel.x,y:format.panel.y,scale:100,...board.layout}},
  frame(format, board) {
    format=this.resolve(format,board);const l=this.get(format,board),swap=l.direction!==format.direction;
    return {x:l.x,y:l.y,width:format.panel[swap?'height':'width']*l.scale/100,height:format.panel[swap?'width':'height']*l.scale/100,direction:l.direction};
  },
  slots(format,board,count){const r=this.frame(format,board);return window.PAID_MEDIA_PRESETS.getSlots({...format,panel:{x:r.x,y:r.y,width:r.width,height:r.height},direction:r.direction},count)},
  apply(format,board,count,patch){
    format=this.resolve(format,board);const old=this.get(format,board),before=this.slots(format,board,count),oldFrame=this.frame(format,board);
    const next={...old,...patch};
    if(!['row','column'].includes(next.direction)||!Number.isFinite(next.x)||!Number.isFinite(next.y)||!Number.isFinite(next.scale)||next.scale<10||next.scale>200)return false;
    if(next.direction!==old.direction){
      const swap=next.direction!==format.direction,w=format.panel[swap?'height':'width'],h=format.panel[swap?'width':'height'];
      next.scale=Math.min(next.scale,100*format.width/w,100*format.height/h);
      next.x=Math.max(0,Math.min(format.width-w*next.scale/100,oldFrame.x+oldFrame.width/2-w*next.scale/200));
      next.y=Math.max(0,Math.min(format.height-h*next.scale/100,oldFrame.y+oldFrame.height/2-h*next.scale/200));
    }
    board.layout=next;const after=this.slots(format,board,count);
    board.nodes.forEach(n=>{const a=before[n.slot],b=after[n.slot];if(!a||!b)return;const sx=b.width/a.width,sy=b.height/a.height;n.x=b.x+(n.x-a.x)*sx;n.y=b.y+(n.y-a.y)*sy;n.width*=sx;n.height*=sy;if(n.wrapWidth)n.wrapWidth*=sx;if(n.maxTextHeight)n.maxTextHeight*=sy;if(n.flowOffsetY)n.flowOffsetY*=sy;if(n.fontSize)n.fontSize*=Math.min(sx,sy)});
    return true;
  }
};
