const METRICS={
 ipad:{dialogue:{min:96,max:115},speaker:115,title:130,subtitle:120,lyrics:{min:88,max:115},next:{min:72,max:100}},
 windows:{dialogue:{min:60,max:80},speaker:70,title:88,subtitle:80,lyrics:{min:70,max:80},next:{min:66,max:66}}
};
export const deviceMetrics=device=>METRICS[device]||METRICS.ipad;
export function slideDimensions(ratio){const [w,h]=ratio.split(':').map(Number);return {w:13.333333,h:13.333333*h/w};}
function estimatedUnits(s){let total=0;for(const c of [...s]) total+=/[\u1100-\u11ff\u3130-\u318f\uac00-\ud7a3\u3000-\u9fff]/.test(c)?1: /[MW@#%]/.test(c)?.83:/[\s.,:;!'`|]/.test(c)?.28:.56;return total;}
function safeWrap(text,maxUnits){
 const chunks=text.split(/(\s+)/).filter(x=>x!=='');let result=[],line='';
 function push(){if(line){result.push(line.replace(/\s+$/,''));line='';}}
 for(const token of chunks){if(/^\s+$/.test(token)&&!line)continue;
   if(estimatedUnits(line+token)<=maxUnits){line+=token;continue;}
   if(/^\s+$/.test(token)){push();continue;}
   push();
   if(estimatedUnits(token)<=maxUnits){line=token;continue;}
   // For scripts without spaces, split at grapheme boundaries without changing characters.
   let piece='';for(const ch of [...token]){if(piece&&estimatedUnits(piece+ch)>maxUnits){result.push(piece);piece='';}piece+=ch;}line=piece;
 }push();return result;
}
function paginateText(text,style,availableW,maxLines=4){
 const candidates=[];for(let size=style.max;size>=style.min;size-=1){
   // Arial/Malgun Gothic estimated average glyph width ~font pt * 0.92; inch = 72pt.
   const units=availableW*72/size*.96;
   const lines=safeWrap(text,Math.max(3,units));
   candidates.push({size,lines});
   if(lines.length<=maxLines)return [{text:lines.join('\n'),size,lines:lines.length}];
 }
 // If text cannot fit at min font, preserve the full original sequence across pages.
 const size=style.min,maxUnits=Math.max(3,availableW*72/size*.96);const lines=safeWrap(text,maxUnits);
 const pages=[];for(let i=0;i<lines.length;i+=maxLines){const group=lines.slice(i,i+maxLines);pages.push({text:group.join('\n'),size,lines:group.length});}
 return pages;
}
export function layoutSlides(parsed,lyrics,device='ipad',ratio='4:3'){
 const dims=slideDimensions(ratio),m=deviceMetrics(device),slides=[],warnings=[...parsed.warnings,...lyrics.warnings];
 const safeWidth=dims.w*.89;
 const maxLines=dims.h<=7.6?3:4;
 let speaker=null,lastIndex=-1;
 function addDialogue(text,who=null,type='dialogue'){
   const font=type==='lyrics'?m.lyrics:m.dialogue;
   const pages=paginateText(text,font,safeWidth,maxLines);
   for(const p of pages){slides.push({type,text:p.text,speaker:who,size:p.size,lines:p.lines,cues:[],sourceIndex:lastIndex});}
 }
 function addCue(text){
   const cue= /^\(.*\)$/.test(text)?text:`(${text.replace(/^\[|\]$/g,'')})`;
   const last=slides.at(-1);
   if(last&&last.type==='dialogue' && last.cues.length===0){last.cues.push(cue);}else slides.push({type:'cue',text:cue,speaker:null});
 }
 for(let i=0;i<parsed.entries.length;i++){
   const item=parsed.entries[i];lastIndex=i;
   if(item.type==='ignored')continue;
   if(item.type==='section'){slides.push({type:'section',heading:item.heading,subtitle:item.subtitle||''});speaker=null;continue;}
   if(item.type==='song'){
     speaker=null;const matched=lyrics.matches.get(i);
     if(!matched)continue;
     const initial=slides.length;
     // Each lyric paragraph stays in order; no repeated text removed.
     for(const line of matched.lines)addDialogue(line,null,'lyrics');
     const next=parsed.entries.slice(i+1).find(x=>x.type==='section'||x.type==='song');
     if(next && slides.length>initial){const title=next.type==='section'?next.heading:next.text;slides[slides.length-1].next=`>> NEXT: ${title}`;}
     else warnings.push(`歌曲「${item.text}」後面無法確認下一個環節，因此不加入 NEXT。`);
     continue;
   }
   if(item.type==='cue'){addCue(item.text);continue;}
   if(item.type==='answer'){
     slides.push({type:'answer',text:item.text,speaker:item.speaker||null});continue;
   }
   if(item.type==='dialogue'){
     const who=item.speaker??null;
     const last=slides.at(-1);
     // Explicit speaker boundaries are ALWAYS honored. This implementation uses one source paragraph per slide,
     // which preserves turn order even if other formatting makes speaker groups ambiguous.
     speaker=who;
     addDialogue(item.text,speaker,'dialogue');
   }
 }
 return {slides,warnings,dims,metrics:m};
}
