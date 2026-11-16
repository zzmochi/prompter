import {parseDocument} from './document-parser.js';
import {normalizedSongTitle} from './script-classifier.js';
export async function matchLyrics(parsed, files){
 const usable=files.filter(f=>/\.(docx|txt)$/i.test(f.name));
 const headers=[];
 for(const file of usable){
   const lines=await parseDocument(file);
   headers.push({file,lines,title:lines.find(x=>x.trim())||''});
 }
 const matches=new Map(),warnings=[];
 for(const song of parsed.songs){
   const target=normalizedSongTitle(song.title);
   const found=headers.filter(x=>normalizedSongTitle(x.file.name)===target || normalizedSongTitle(x.title)===target);
   if(found.length!==1){warnings.push(`歌曲「${song.title}」${found.length?'匹配多個歌詞檔案':'找不到明確匹配的歌詞檔案'}；不會憑空生成歌詞。`);continue;}
   const chosen=found[0];const lines=chosen.lines.filter(x=>x.trim().length>0);
   // A matching first line is the document's song heading, not a lyric.
   if(lines.length>1 && normalizedSongTitle(lines[0])===target)lines.shift();
   matches.set(song.index,{title:song.title,lines,fileName:chosen.file.name});
 }
 return {matches,warnings};
}
