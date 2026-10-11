export interface SpriteFrame { rect: [number, number, number, number]; size: [number, number]; pivot: [number, number];clipSpans?:[number,number,number][];flipX?:boolean }
export interface Atlas { file: string; width: number; height: number; frames: Record<string, SpriteFrame> }
export interface ArtMetadata { hero: Atlas; actions: Atlas; objects:Atlas; weapons?:Atlas;gunfu?:Atlas;gunfuMovement?:Atlas;gunfuRoutine?:Atlas[];characters?:Record<string,Atlas[]>;reactions?:Atlas[] }
export class AssetManager {
  room!: HTMLImageElement; hero!: HTMLImageElement; actions!: HTMLImageElement; objects!: HTMLImageElement;
  metadata!: ArtMetadata;
  weapons?:HTMLImageElement;
  adventure!:HTMLImageElement;adventureMetadata!:Atlas;
  ultimate!:HTMLImageElement;ultimateMetadata!:Atlas;
  ultimateEffects!:HTMLImageElement;ultimateEffectsMetadata!:Atlas;
  gunfu?:HTMLImageElement;gunfuMovement?:HTMLImageElement;
  private routine=new Map<string,{frame:SpriteFrame;image:HTMLImageElement}>();
  private effects=new Map<string,{frame:SpriteFrame;image:HTMLImageElement|HTMLCanvasElement}>();
  private painted=new Map<string,{frame:SpriteFrame;image:HTMLImageElement|HTMLCanvasElement}>();
  private chapter=new Map<string,{frame:SpriteFrame;image:HTMLImageElement}>();
  chapterRooms:HTMLImageElement[]=[];
  async load() {
    const base = `${import.meta.env.BASE_URL}art/`;
    const response = await fetch(`${base}atlas.json`);
    if (!response.ok) throw new Error(`图集元数据加载失败 ${response.status}`);
    this.metadata = await response.json() as ArtMetadata;
    const [room, hero, actions, objects] = await Promise.all([this.image(`${base}room.png`), this.image(`${base}${this.metadata.hero.file}`), this.image(`${base}${this.metadata.actions.file}`), this.image(`${base}${this.metadata.objects.file}`)]);
    this.room = room; this.hero = hero; this.actions = actions; this.objects = objects;
    for(const file of ['weapon-paint-v1.json','combat-paint-v1.json','violet-melee-v1.json','violet-moon-effects-v1.json','violet-moon-body-v1.json','violet-moon-colossus-v2.json']){
      const response=await fetch(`${base}${file}`);if(!response.ok)throw new Error(`绘制素材索引加载失败: ${file}`);
      const atlas=await response.json() as Atlas,image=await this.image(`${base}${atlas.file}`);this.validate(atlas,image);
      for(const [id,frame]of Object.entries(atlas.frames)){
        this.painted.set(id,this.isolate(image,frame));
      }
    }
    this.chapterRooms=await Promise.all(['outer','forge','inner'].map(kind=>this.image(`${base}chapter-${kind}-room-v1.png`)));
    for(const kind of ['shield','dancer','cantor','parasite','boss','props']){const response=await fetch(`${base}chapter-${kind}-v1.json`);if(!response.ok)throw new Error('回廊新图集加载失败');const atlas=await response.json() as Atlas,image=await this.image(`${base}${atlas.file}`);this.validate(atlas,image);for(const [id,frame]of Object.entries(atlas.frames))this.chapter.set(id,{frame,image});}
    const adventureResponse=await fetch(`${base}adventure-atlas-v1.json`);if(!adventureResponse.ok)throw new Error('探索图集索引加载失败');
    this.adventureMetadata=await adventureResponse.json() as Atlas;this.adventure=await this.image(`${base}${this.adventureMetadata.file}`);this.validate(this.adventureMetadata,this.adventure);
    const ultimateResponse=await fetch(`${base}violet-ultimate-cut-v3.json`);if(!ultimateResponse.ok)throw new Error('紫鸢特写图集加载失败');
    this.ultimateMetadata=await ultimateResponse.json() as Atlas;this.ultimate=await this.image(`${base}${this.ultimateMetadata.file}`);this.validate(this.ultimateMetadata,this.ultimate);
    const effectsResponse=await fetch(`${base}violet-ultimate-effects-v2.json`);if(!effectsResponse.ok)throw new Error('紫鸢大招特效图集加载失败');
    this.ultimateEffectsMetadata=await effectsResponse.json() as Atlas;this.ultimateEffects=await this.image(`${base}${this.ultimateEffectsMetadata.file}`);this.validate(this.ultimateEffectsMetadata,this.ultimateEffects);
    for(const kind of ['blade','guns']){
      const response=await fetch(`${base}violet-ultimate-${kind}-v2.json`);if(!response.ok)throw new Error('紫鸢大招动作图集加载失败');
      const atlas=await response.json() as Atlas,image=await this.image(`${base}${atlas.file}`);this.validate(atlas,image);
      for(const [id,frame]of Object.entries(atlas.frames))this.routine.set(id,{frame,image});
    }
    if(this.metadata.weapons){this.weapons=await this.image(`${base}${this.metadata.weapons.file}`);this.validate(this.metadata.weapons,this.weapons);}
    if(this.metadata.gunfu){this.gunfu=await this.image(`${base}${this.metadata.gunfu.file}`);this.validate(this.metadata.gunfu,this.gunfu);}
    if(this.metadata.gunfuMovement){this.gunfuMovement=await this.image(`${base}${this.metadata.gunfuMovement.file}`);this.validate(this.metadata.gunfuMovement,this.gunfuMovement);}
    // Side dashes share one set of silhouettes and a fixed foot anchor.
    for(const atlas of [this.metadata.gunfuMovement,...(this.metadata.characters?.violet??[])]){
      if(!atlas)continue;
      for(let i=0;i<4;i++){
        const left=atlas.frames[`violet_dash_left_${i}`];
        if(left)atlas.frames[`violet_dash_right_${i}`]={...left,flipX:true};
        for(const facing of ['down','up']){
          const frame=atlas.frames[`violet_dash_${facing}_${i}`];
          if(frame)frame.pivot=[facing==='down'?19:24,frame.size[1]];
        }
        const slide=atlas.frames[`gunfu_slide_right_${i}`];
        if(slide)slide.pivot=[22,slide.size[1]];
        if(slide)atlas.frames[`gunfu_slide_left_${i}`]={...slide,flipX:true};
      }
    }
    for(const atlas of this.metadata.gunfuRoutine??[]){const image=await this.image(`${base}${atlas.file}`);this.validate(atlas,image);for(const [id,frame] of Object.entries(atlas.frames))this.routine.set(id,{frame,image});}
    for(const atlases of Object.values(this.metadata.characters??{}))for(const atlas of atlases){
      const image=await this.image(`${base}${atlas.file}`);this.validate(atlas,image);
      if(atlas.file==='violet-kneel-turn.png'){
        const alias=(id:string,source:string)=>{const original=atlas.frames[source],w=Math.round(original.rect[2]*.23),h=Math.round(original.rect[3]*.23);atlas.frames[id]={...original,size:[w,h],pivot:[Math.round(original.pivot[0]*w/original.size[0]),h]};};
        for(const facing of ['down','left','right'])for(let frame=0;frame<2;frame++)alias(`violet_play_${facing}_${frame}`,`violet_turnshot_${facing}_${frame+2}`);
        alias('violet_play_stand','violet_turnshot_down_0');alias('violet_play_back','violet_turnshot_down_1');
      }
      for(const [id,frame] of Object.entries(atlas.frames))this.routine.set(id,{frame,image});
    }
    for(const atlas of this.metadata.reactions??[]){const image=await this.image(`${base}${atlas.file}`);this.validate(atlas,image);for(const [id,frame]of Object.entries(atlas.frames))this.effects.set(id,this.isolate(image,frame));}
    this.validate(this.metadata.hero, hero); this.validate(this.metadata.actions, actions); this.validate(this.metadata.objects, objects);
  }
  effect(id:string){const effect=this.effects.get(id);if(!effect)throw new Error(`缺少反应动画帧: ${id}`);return effect;}
  paint(id:string){const sprite=this.painted.get(id);if(!sprite)throw new Error(`缺少绘制素材: ${id}`);return sprite;}
  private isolate(image:HTMLImageElement,frame:SpriteFrame):{image:HTMLImageElement|HTMLCanvasElement;frame:SpriteFrame}{
    if(!frame.clipSpans)return {image,frame};
    const [sx,sy,sw,sh]=frame.rect,cut=document.createElement('canvas');cut.width=sw;cut.height=sh;const c=cut.getContext('2d')!;
    for(const [x,y,length]of frame.clipSpans)c.drawImage(image,sx+x,sy+y,length,1,x,y,length,1);
    return {frame:{...frame,rect:[0,0,sw,sh],clipSpans:undefined},image:cut};
  }
  private image(url: string): Promise<HTMLImageElement> { const image = new Image(); image.src = url; return image.decode().then(() => image).catch(() => { throw new Error(`图片无法解码：${url}`); }); }
  private validate(atlas: Atlas, image: HTMLImageElement) {
    if (image.naturalWidth !== atlas.width || image.naturalHeight !== atlas.height) throw new Error(`图集尺寸不符: ${atlas.file}`);
    for (const [key, frame] of Object.entries(atlas.frames)) {
      const [x,y,w,h] = frame.rect;
      if (x < 0 || y < 0 || w <= 0 || h <= 0 || x+w > atlas.width || y+h > atlas.height) throw new Error(`图集矩形越界: ${key}`);
    }
  }
  frame(id: string, hero = false) { const frame = this.painted.get(id)?.frame??this.chapter.get(id)?.frame??(hero ? this.routine.get(id)?.frame??this.metadata.hero.frames[id] ?? this.metadata.actions.frames[id]??this.metadata.gunfu?.frames[id]??this.metadata.gunfuMovement?.frames[id] : this.metadata.objects.frames[id]??this.metadata.weapons?.frames[id]); if (!frame) throw new Error(`缺少精灵帧: ${id}`); return frame; }
  sheet(id: string, hero: boolean) { return this.painted.get(id)?.image??this.chapter.get(id)?.image??(hero ? this.routine.get(id)?.image??(this.metadata.gunfu?.frames[id]?this.gunfu!:this.metadata.gunfuMovement?.frames[id]?this.gunfuMovement!:id.startsWith('run_') ? this.hero : this.actions) : this.metadata.weapons?.frames[id]?this.weapons!:this.objects); }
}


