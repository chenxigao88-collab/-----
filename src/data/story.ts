export interface StoryLine {speaker:string;text:string;portrait?:'violet'|'ember'|'knight'|'lamp'}
export interface StoryScene {title:string;lines:StoryLine[]}
export function storyScene(id:string,violet:boolean):StoryScene {
  const hero=violet?'紫鸢':'余烬',portrait=violet?'violet' as const:'ember' as const;
  const scenes:Record<string,StoryScene>={
    intro:{title:'第一章 · 最后一盏归途灯',lines:[
      {speaker:'灰烬城',text:'十二年前，熔炉事故封住了内城。如今，废城的钟又响了，紫晶正沿回廊向外蔓延。',portrait:'lamp'},
      {speaker:violet?'旧日的留言':'余烬的回忆',text:violet?'“小鸢，灯还亮着。走错路的时候，就看它。”——那是师父接她回家时常说的话。':'最后一道封门落下时，灰冠队长还站在门的另一边。他说：先带大家走。',portrait:'lamp'},
      {speaker:hero,text:violet?'师父，等我。……这次我可不会走错路。':'十二年了。这一次，我会把留在里面的人带回来。',portrait}
    ]},
    'region-2':{title:'熔铸工坊',lines:[{speaker:'维修记录',text:'事故后的第七天。外庭撤离完毕，内城仍有灯亮着。三处泄压装置已锁死，炉门不得开启。',portrait:'lamp'},{speaker:hero,text:violet?'他们没有立刻离开……先找到三处装置。':'这份记录，比当年的撤离命令晚了七天。有人一直守着这里。',portrait}]},
    'region-3':{title:'晶蚀内城',lines:[{speaker:'旧街道',text:'钟声响起，窗后的影子又做了一遍十二年前的动作。炉心把最后一夜，留在了结晶里。',portrait:'lamp'},{speaker:hero,text:violet?'如果这些只是留下的声音……师父，你还听得见吗？':'城里的人早该回家了。有人必须让这一夜结束。',portrait}]},
    'camp-1':{title:'刻在灯上的小鸟',lines:[{speaker:'紫鸢',text:violet?'欸？这个歪歪的小鸟……是我画的。师父竟然真的刻上去了。':'师父总说，我画的小鸟像一颗会飞的土豆。可他还是刻在了灯上。',portrait:'violet'},{speaker:'旧火行商',text:'灯沿着回廊一盏盏亮起。我替过路人修好它们，免得有人找不到回家的路。',portrait:'lamp'}]},
    'camp-2':{title:'迟到的练习课',lines:[{speaker:'训练录音',text:'“握稳一点，收势别急。小鸢，转完那一圈，先看脚下。”',portrait:'lamp'},{speaker:'紫鸢',text:'过了这么久，还要管我。……好啦，这次站稳了。',portrait:'violet'},{speaker:'旧火行商',text:'把三处泄压阀修好，才能开炉门。此处可休息，也能留下续行记录。',portrait:'lamp'}]},
    'camp-3':{title:'这次换我来接你',lines:[{speaker:'遗留记录',text:'留言写入时间：事故当夜。发信人最后一次进入炉心，携带归途灯一盏。',portrait:'lamp'},{speaker:hero,text:violet?'原来你一直在带大家回家。师父，这次换我来接你。':'那一夜已经过去了。队长，我来接最后一班岗。',portrait}]},
    'memory-1':{title:'刻鸟灯罩',lines:[{speaker:'旧物',text:'灯罩内侧有一只刻歪的小鸟，旁边是小小的一行字：小鸢，走亮一点的路。',portrait:'lamp'},{speaker:hero,text:violet?'还说我画得不好看……明明一直带着。':'这盏灯曾送很多孩子回家。让它再亮一程吧。',portrait}]},
    'memory-2':{title:'最后一张维修单',lines:[{speaker:'工坊档案',text:'供暖还在运行，疏散队仍未归来。若钟声重新响起，请修好三处泄压阀，别让炉心继续加压。',portrait:'lamp'},{speaker:hero,text:'维修单背面写满了换班人的名字，没有一个被划掉。',portrait}]},
    'memory-3':{title:'未归的餐桌',lines:[{speaker:'旧日街角',text:'两份工作餐已经冷了。餐券上写着：等你下班，一起去接小鸢。',portrait:'lamp'},{speaker:hero,text:violet?'我后来长大了，也学会自己回家了。你们不用再等我。':'外城已经有人重新开了食堂。明天，那里还会有人等着下班的人。',portrait}]},
    'boss-intro':{title:'灰冠骑士 · 最后的守门人',lines:[{speaker:'灰冠骑士',text:'守住门。……灯不能熄。还有人，没有回来。',portrait:'knight'},{speaker:hero,text:violet?'我认识这把剑。你和师父一起留在了这里，是吗？':'队长，外城已经安全。最后一班岗，可以结束了。',portrait},{speaker:'灰冠骑士',text:'炉门，不得开启。',portrait:'knight'}]},
    'boss-defeat':{title:'最后一班岗',lines:[{speaker:'灰冠骑士',text:'那把剑……他把剑，留给你了。外面的孩子……都回家了吗？',portrait:'knight'},{speaker:hero,text:violet?'都回去了。他们长大了。我也长大了。你守住了那道门。':'都回去了。外城还有灯，还有人等着下班的家人。你守住了。',portrait},{speaker:'灰冠骑士',text:'那就好。灯……可以熄了。',portrait:'knight'}]},
    ending:{title:'天亮之后',lines:[{speaker:'炉心',text:'泄压完成，钟声停下。结晶里保存的声音依次消散，最后留下一句普通的叮嘱。',portrait:'lamp'},{speaker:'师父',text:'“回去的时候，走亮一点的路。”',portrait:'lamp'},{speaker:hero,text:violet?'紫鸢提起最后一盏灯，走出回廊。灯已经熄灭，外庭却亮了起来。天亮了。':'余烬卸下封门上的旧锁。第一缕晨光穿过回廊，再没有人守在门的另一边。',portrait},{speaker:'停炉记录',text:'事故前，有人从地下运来了一枚不属于灰烬城的晶核。它的来源，仍在更深处。',portrait:'lamp'}]}
  };
  return scenes[id]??{title:'归途遗物',lines:[{speaker:'旧物',text:'刻鸟灯罩、换班牌与未送出的餐券，记着这座城里普通人的名字。',portrait:'lamp'}]};
}
