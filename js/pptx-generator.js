import {deviceMetrics,slideDimensions} from './slide-layout.js';
const C={black:'000000',white:'FFFFFF',orange:'FF9A38',blue:'79C8FF',yellow:'FFE24A',darkBlue:'244DB3'};
export async function generatePptx(slides,device,ratio){
 if(!window.PptxGenJS)throw new Error('PPTX 產生函式庫尚未載入。');
 const p=new window.PptxGenJS(),d=slideDimensions(ratio),m=deviceMetrics(device);
 p.defineLayout({name:'PROMPTER_CUSTOM',width:d.w,height:d.h});p.layout='PROMPTER_CUSTOM';p.author='Prompter Studio';p.subject='Live show teleprompter';p.title='演出提詞機';p.lang='ko-KR';
 p.theme={headFontFace:'Malgun Gothic',bodyFontFace:'Malgun Gothic',lang:'ko-KR'};
 const add=(slide,text,opt={})=>slide.addText(String(text),{
   fontFace:'Malgun Gothic',bold:true,margin:0,breakLine:false,vertAlign:'mid',align:'center',
   color:C.white,fit:'shrink',...opt
 });
 const blank=()=>{const s=p.addSlide();s.background={color:C.black};return s;};
 const shrink=(size,txt,maxW,maxH)=>Math.min(size, Math.max(22,Math.floor(Math.min(maxW*72/(Math.max(1,[...txt].length)*.75),maxH*72/1.25))));
 const speakerH=Math.min(1.55,d.h*.18);
 for(const item of slides){
   const s=blank();const pad=d.w*.05;
   if(item.type==='section'){
     const heading=item.heading||'';const sub=item.subtitle||'';
     const y=sub?d.h*.27:d.h*.36;
     const mainSize=Math.min(m.title,Math.max(32,Math.floor(d.w*.9*72/(Math.max(1,[...heading].length)*.77))));
     add(s,heading,{x:pad,y,w:d.w-2*pad,h:d.h*.20,fontSize:mainSize,color:C.darkBlue});
     if(sub){const subSize=Math.min(m.subtitle,Math.max(28,Math.floor(d.w*.9*72/(Math.max(1,[...sub].length)*.75))));add(s,sub,{x:pad,y:y+d.h*.23,w:d.w-2*pad,h:d.h*.22,fontSize:subSize,color:C.yellow});}
     continue;
   }
   if(item.type==='cue'||item.type==='answer'){
     const white=item.type==='answer';const size=shrink(device==='ipad'?94:72,item.text,d.w*.9,d.h*.45);
     add(s,item.text,{x:pad,y:d.h*.31,w:d.w-2*pad,h:d.h*.36,color:white?C.white:C.yellow,fontSize:size});continue;
   }
   if(item.type!=='dialogue'&&item.type!=='lyrics')continue;
   const hasSpeaker=Boolean(item.speaker);const hasCue=Boolean(item.cues?.length);const hasNext=Boolean(item.next);
   if(hasSpeaker){
     const size=Math.min(m.speaker,Math.floor((d.w*.88*72)/(Math.max(1,[...item.speaker].length+2)*.7)));
     add(s,`[${item.speaker}]`,{x:pad,y:d.h*.115,w:d.w-2*pad,h:speakerH,fontSize:Math.max(26,size),color:/^(MC|HOST|사회자|진행자)$/i.test(item.speaker)?C.orange:C.blue});
   }
   const boxTop=hasSpeaker?d.h*.37:d.h*.18;
   const bottomLimit=hasCue||hasNext?d.h*.72:d.h*.89;
   const boxHeight=bottomLimit-boxTop;
   const lineCount=item.lines||item.text.split('\n').length;
   let size=item.size;
   size=Math.min(size,Math.floor(boxHeight*72/(Math.max(1,lineCount)*1.14)));
   const opts={x:pad,y:boxTop,w:d.w-2*pad,h:boxHeight,fontSize:Math.max(26,size),breakLine:false,lineSpacingMultiple:1.04,color:C.white};
   add(s,item.text,opts);
   if(hasCue){const cue=item.cues.join('\n');const cueSize=Math.min(device==='ipad'?68:48,Math.max(22,Math.floor(d.w*.9*72/(Math.max(1,[...cue].length)*.75))));
     add(s,cue,{x:pad,y:d.h*.80,w:d.w-2*pad,h:d.h*.12,color:C.yellow,fontSize:cueSize});
   }
   if(hasNext){const nextSize=Math.min(m.next.max,Math.max(m.next.min,Math.floor(d.w*.63*72/(Math.max(1,[...item.next].length)*.64))));
     add(s,item.next,{x:d.w*.36,y:d.h*.86,w:d.w*.59,h:d.h*.105,align:'right',fontSize:nextSize,color:C.yellow});
   }
 }
 return p.write({outputType:'blob'});
}
