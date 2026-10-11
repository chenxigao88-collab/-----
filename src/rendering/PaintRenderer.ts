import type {AssetManager} from './AssetManager';

/** Authored transparent PNG art. Transforms animate sprites without drawing geometry. */
export class PaintRenderer {
  constructor(private art:AssetManager){}
  draw(ctx:CanvasRenderingContext2D,id:string,x:number,y:number,width:number,height=width,angle=0,alpha=1){
    const {image,frame}=this.art.paint(id);
    ctx.save();ctx.globalAlpha*=Math.max(0,Math.min(1,alpha));ctx.translate(Math.round(x),Math.round(y));ctx.rotate(angle);
    ctx.drawImage(image,...frame.rect,-width/2,-height/2,width,height);ctx.restore();
  }
}
