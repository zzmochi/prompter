/* Deterministic script classification. Never invent, translate, or rewrite dialogue. */
const URL=/https?:\/\/|www\.|(?:^|\s)\S+\.(?:com|net|org)\b/i;
const TECH=/^(?:[▶▷►]|\s*(?:LED|BGM|VCR|SE|SFX|CAM|CAMERA|LIGHT|LIGHTING|STAFF|STAGE|CUE)\s*[:：\-])|(?:조명|스태프|카메라|마이크 체크|음향|영상 송출|무대 전환|소품 리스트|대형 화면|스크린 송출|현장 스크린|화면에 표시)/i;
const ACTION=/(?:박수|웃음|환호|포즈|리액션|손하트|인사|춤|댄스|환영|호응|제스처|고개|손 흔|기립|무대 위|무대 중앙|자유답변|자유 답변|自由回答|자유回答)/i;
const SCREEN=/(?:보기|선택지|화면용|스크린용|LED용|대형 스크린|대형화면|현장 화면|화면 표기|보기 선택)/i;
const SECTION=/^(?:#\s*\d+[.\-]?\s*)?(?:MENT|GAME|TALK|INTERVIEW|OPENING|ENDING|EVENT|CORNER|코너|오프닝|엔딩|토크|인터뷰)(?:\b|\s|\d|[.#:\-])/i;
const SONG=/^(?:#\s*\d+[.\-]?\s*)?(?:SONG|MUSIC|노래|곡명|무대곡|공연곡|노래 제목|LIVE SONG)\s*(?:[:：\-]|\s)\s*(.+)$/i;
const DECORATED_SONG=/^[〈《「『<“\"]([^〉》」』>”\"]+)[〉》」』>”\"](?:\s*[—–-]\s*[^\n]*)?\s*$/;
const SPEAKER=/^\[([^\]\n]{1,45})\]\s*(.*)$/;
const SPEAKER_COLON=/^((?:MC|HOST|사회자|진행자|[가-힣A-Za-z0-9_ ]{2,40}))\s*[:：]\s*(.*)$/i;
const META=/^(?:DATE|PLACE|ARTIST|LOCATION|VENUE|TIME|CAST|STAFF|PRODUCER|DIRECTOR|TITLE|일시|시간|장소|담당자|출연진|준비물|소품|스태프|의상|리허설|대기실|촬영|촬영팀|담당|비고)\s*(?:[:：\t]|\s+|$)/i;
const DATE_VALUE=/^(?:\d{2,4}[.\-/]\s*\d{1,2}[.\-/]\s*\d{1,2}|\d{1,2}:\d{2}\b)/;
const SEP=/^[\s\-—–_=*·•─━]{3,}$/;
const OPTIONS=/^(?:[①②③④⑤]|(?:[A-Ea-e][.)])\s*|보기\s*\d+\s*[:：])/;
const FIXED=/^(?:\(|\[)\s*(?:자유\s*답변|自由回答|자유回答|멤버\s*\S+|정답\s*[:：].+|답변\s*[:：].+)(?:\)|\])$/i;
const SPEAKER_WORD=/^(?:MC|HOST|사회자|진행자|[가-힣A-Za-z][가-힣A-Za-z0-9 _-]{0,24})$/i;
const trim=s=>String(s).replace(/\u00a0/g,' ').trim();
function sectionParts(text){
 const m=text.match(/^(.*?)(\s*\[[^\]]+\])\s*$/);
 return m ? {heading:m[1].trim(),subtitle:m[2].trim()}:{heading:text,subtitle:''};
}
function aliases(header){
 return header.split(/\s*(?:\/|\||,|＆|&)\s*/).map(trim).filter(x=>x && x.length<=45);
}
function looksLikeSingerLabel(text, names){
 if(names.has(text))return true;
 // Explicit generic performer labels count, but arbitrary one-word dialogue does not.
 return /^(?:ARTIST|MEMBER|멤버)(?:\s*\d+|\s+[A-Za-z가-힣0-9_-]+)?$/i.test(text);
}
export function classify(lines,sourceName=''){
 const entries=[],warnings=[],sections=[],speakers=new Set(),songs=[];
 const array=lines.map(trim);const artistNames=new Set();
 let activeSpeaker=null,bodyStarted=false,pendingHeaderArtist=false;
 const add=(type,text,extra={})=>{entries.push({type,text,...extra});};
 const recordSpeaker=name=>{activeSpeaker=name;speakers.add(name);bodyStarted=true;};
 for(let i=0;i<array.length;i++){
   const text=array[i];if(!text)continue;
   if(SEP.test(text)||URL.test(text)||TECH.test(text)){add('ignored',text);continue;}
   if(pendingHeaderArtist && !bodyStarted){
     if(!META.test(text)&&!SECTION.test(text)&&!SONG.test(text)){
       for(const name of aliases(text))artistNames.add(name);
       add('ignored',text);pendingHeaderArtist=false;continue;
     }
     pendingHeaderArtist=false;
   }
   // Strip event cover-sheet metadata (including tab-separated DOCX table cells).
   if(META.test(text)){
     const artist=text.match(/^ARTIST\s*(?:[:：\t]|\s+)\s*(.+)$/i);
     if(artist)for(const name of aliases(artist[1]))artistNames.add(name);
     else if(/^ARTIST\s*$/i.test(text))pendingHeaderArtist=true;
     add('ignored',text);continue;
   }
   if(!bodyStarted && DATE_VALUE.test(text)){add('ignored',text);continue;}
   const songMatch=text.match(SONG);
   const decorated=text.match(DECORATED_SONG);
   if(songMatch||decorated){
     const title=trim(songMatch? songMatch[1]:decorated[1]);
     if(title){songs.push({title,index:entries.length});add('song',title);bodyStarted=true;activeSpeaker=null;continue;}
   }
   if(SECTION.test(text)){
     const part=sectionParts(text);sections.push(part.heading);add('section',text,part);bodyStarted=true;activeSpeaker=null;continue;
   }
   const br=text.match(SPEAKER);
   if(br){
     const name=trim(br[1]),rest=trim(br[2]);
     if(ACTION.test(name)||/^자유/i.test(name)){add('cue',text);continue;}
     if(name.length>26 || SCREEN.test(name)){add('cue',text);continue;}
     if(!rest&&entries.length&&entries.at(-1).type==='section'&&!entries.at(-1).subtitle){entries.at(-1).subtitle=text;continue;}
     if(name&&(rest||SPEAKER_WORD.test(name)||looksLikeSingerLabel(name,artistNames))){
       recordSpeaker(name);
       if(rest)add('dialogue',rest,{speaker:name});
       continue;
     }
   }
   const colon=text.match(SPEAKER_COLON);
   if(colon&&!SCREEN.test(text)&&!/^(?:NEXT|Q|A|문제|선택|보기|정답|답변|게임|멘트)$/i.test(colon[1])){
     recordSpeaker(trim(colon[1]));
     if(trim(colon[2]))add('dialogue',trim(colon[2]),{speaker:activeSpeaker});
     continue;
   }
   // Event cover-sheet often ends with a bare 'MC' cell. Ignore it before the
   // first recognizable body element; treat subsequent bare MC as speaker labels.
   if(/^(?:MC|HOST|사회자|진행자)$/i.test(text)){
     if(bodyStarted){recordSpeaker(text);}else add('ignored',text);
     continue;
   }
   if(bodyStarted && looksLikeSingerLabel(text,artistNames)){
     recordSpeaker(text);continue;
   }
   if(SCREEN.test(text)||OPTIONS.test(text)){add('ignored',text);continue;}
   if(FIXED.test(text)){add('answer',text.replace(/^\[/,'(').replace(/\]$/,')'),{speaker:activeSpeaker});continue;}
   if(/^\([^)]*\)$/.test(text)||/^\[[^\]]+\]$/.test(text)){
     add('cue',text,{speaker:activeSpeaker});continue;
   }
   if(/^\s*(?:Q[. :：]|질문\s*[:：]|문제\s*[:：])/i.test(text)){
     add('dialogue',text,{speaker:activeSpeaker||null});bodyStarted=true;continue;
   }
   // Preserve unknown prose verbatim rather than silently discard it.
   add('dialogue',text,{speaker:activeSpeaker||null});bodyStarted=true;
 }
 if(!entries.some(x=>x.type==='dialogue'))warnings.push('沒有辨識到明確的台詞，請確認文件結構。');
 if(entries.some(x=>x.type==='dialogue'&&!x.speaker))warnings.push('部分台詞沒有明確 Speaker，將以無講者標籤顯示，不推測姓名。');
 return {sourceName,entries,sections,speakers:[...speakers],songs,warnings};
}
/** Strict comparable song key; removes descriptive wrappers, not the title itself. */
export function normalizedSongTitle(s){
 let value=trim(s).normalize('NFKC').toLocaleLowerCase().replace(/\.(docx?|txt)$/i,'');
 value=value.replace(/^\s*(?:(?:song|music|lyrics|lyric|노래|곡명|무대곡|공연곡|노래 제목)\s*[:：-]\s*)/i,'');
 const wrapped=value.match(/^[〈《「『<“\"]([^〉》」』>”\"]+)[〉》」』>”\"]/);
 if(wrapped)value=wrapped[1];
 else value=value.replace(/\s*[—–]\s*(?:가상\s*오리지널\s*곡|original\s*(?:song|track)|오리지널\s*곡)\s*$/i,'');
 value=value.replace(/(?:[\s_\-]*(?:가사|歌詞|lyrics?|lyric))\s*$/i,'');
 return value.replace(/[\s\-_.()[\]{}'"「」『』〈〉《》]/g,'');
}
