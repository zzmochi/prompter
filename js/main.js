import {parseDocument} from './document-parser.js';
import {classify} from './script-classifier.js';
import {matchLyrics} from './lyrics-matcher.js';
import {layoutSlides} from './slide-layout.js';
import {generatePptx} from './pptx-generator.js';
import {getOutputDir,listOutputFiles,nextFilename,saveBlob,cachedOutputNames,rememberOutputName} from './file-versioning.js';
const $=id=>document.getElementById(id);
const state={scriptFiles:[],lyricsFiles:[],projectHandle:null,device:'ipad',analysis:null,outputDir:null};
const notice=(message,type='')=>{const n=$('notice');n.textContent=message;n.className=`notice ${type}`;};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function uniqueFiles(files){const names=new Set();return files.filter(f=>{const key=f.name+'|'+f.size+'|'+f.lastModified;if(names.has(key))return false;names.add(key);return true;});}
function showFiles(){const scripts=state.scriptFiles,lyrics=state.lyricsFiles;
 if(!scripts.length&&!lyrics.length){$('fileList').innerHTML='<div class="empty">▤ 尚未選取腳本</div>';return;}
 $('fileList').innerHTML=[...scripts.map(f=>`<div class="file">${esc(f.name)}<span>腳本</span></div>`),...lyrics.map(f=>`<div class="file">${esc(f.name)}<span>歌詞</span></div>`)].join('');
 $('review').classList.add('hidden');state.analysis=null;
}
function chooseDevice(device){state.device=device;document.querySelectorAll('.device').forEach(b=>{const active=b.dataset.device===device;b.classList.toggle('active',active);b.setAttribute('aria-pressed',active);});$('ratio').value=device==='ipad'?'4:3':'16:9';$('review').classList.add('hidden');}
document.querySelectorAll('.device').forEach(b=>b.addEventListener('click',()=>chooseDevice(b.dataset.device)));
$('scriptInput').addEventListener('change',e=>{state.scriptFiles=uniqueFiles([...e.target.files]);state.projectHandle=null;state.outputDir=null;showFiles();notice('');});
$('lyricsInput').addEventListener('change',e=>{state.lyricsFiles=uniqueFiles([...state.lyricsFiles,...e.target.files]);showFiles();notice('');});
$('pickFolder').addEventListener('click',async()=>{
 if(!window.showDirectoryPicker){notice('目前瀏覽器不支援資料夾直接存取，請使用「選擇腳本」與「加入歌詞檔」。','error');return;}
 try{
   const folder=await showDirectoryPicker({mode:'readwrite'}),all=[];
   async function walk(dir,path='',depth=0){if(depth>5)return;for await(const [name,handle] of dir.entries()){
     if(handle.kind==='directory'){if(name==='Output'||name.startsWith('.'))continue;await walk(handle,path+name+'/',depth+1);}
     else if(/\.(docx?|txt)$/i.test(name)){const file=await handle.getFile();all.push({file,path:path+name});}
   }}
   await walk(folder);
   const scriptCandidates=all.filter(x=>/\.docx?$/i.test(x.file.name)&&!/(^|\/)lyrics?\//i.test(x.path));
   const lyricCandidates=all.filter(x=>/(^|\/)lyrics?\//i.test(x.path));
   // Prefer Script/ directory; avoid silently choosing amongst multiple plausible scripts.
   const preferred=scriptCandidates.filter(x=>/(^|\/)scripts?\//i.test(x.path));
   const available=preferred.length?preferred:scriptCandidates;
   if(available.length!==1){state.scriptFiles=[];notice(`找到 ${available.length} 份可能的主腳本。請使用「選擇腳本」指定其中一份，避免誤判。`,'error');}
   else {state.scriptFiles=[available[0].file];notice('已讀取活動資料夾。');}
   state.lyricsFiles=lyricCandidates.map(x=>x.file);state.projectHandle=folder;state.outputDir=null;showFiles();
 }catch(err){if(err.name!=='AbortError')notice(`無法讀取資料夾：${err.message}`,'error');}
});
async function analyze(){
 try{
   $('analyze').disabled=true;notice('正在本機解析文件與估算投影片…');
   if(state.scriptFiles.length!==1)throw new Error('請只選擇一份主腳本；歌詞請另外加入。');
   const lines=await parseDocument(state.scriptFiles[0]);
   const parsed=classify(lines,state.scriptFiles[0].name);
   const lyrics=await matchLyrics(parsed,state.lyricsFiles);
   const layout=layoutSlides(parsed,lyrics,state.device,$('ratio').value);
   const outDir=state.projectHandle?await getOutputDir(state.projectHandle):null;
   state.outputDir=outDir;
   const existing=await listOutputFiles(outDir);
   const filename=nextFilename($('eventDate').value,$('eventName').value,[...existing,...cachedOutputNames($('eventDate').value,$('eventName').value)]);
   state.analysis={parsed,lyrics,layout,filename};
   $('stats').innerHTML=[['章節',parsed.entries.filter(x=>x.type==='section').length],['講者',parsed.speakers.length],['歌曲',parsed.songs.length],['預計投影片',layout.slides.length]].map(([label,value])=>`<div class="stat"><strong>${value}</strong><span>${label}</span></div>`).join('');
   const outline=[...parsed.entries.filter(x=>x.type==='section').map(x=>`<div class="outline-item">▣ ${esc(x.text)}</div>`),...parsed.speakers.map(x=>`<div class="outline-item">● ${esc(x)}</div>`)];
   $('outline').innerHTML=outline.join('')||'<div class="outline-item">未辨識到明確的章節與講者</div>';
   const matched=parsed.songs.map(song=>{const obj=lyrics.matches.get(song.index);return `<div class="warning ${obj?'':'warn'}">${obj?'✓':'!'} ${esc(song.title)} — ${obj?esc(obj.fileName):'尚無匹配歌詞'}</div>`;});
   const warns=layout.warnings.map(x=>`<div class="warning warn">⚠ ${esc(x)}</div>`);
   $('warnings').innerHTML=[...matched,...warns].join('')||'<div class="warning">沒有額外警示</div>';
   $('outputName').textContent=filename;
   $('review').classList.remove('hidden');$('review').scrollIntoView({behavior:'smooth',block:'start'});
   notice(`分析完成：預計 ${layout.slides.length} 張投影片。`,'success');
 }catch(err){state.analysis=null;$('review').classList.add('hidden');notice(err.message||String(err),'error');}
 finally{$('analyze').disabled=false;}
}
$('analyze').addEventListener('click',analyze);$('reanalyze').addEventListener('click',analyze);
$('generate').addEventListener('click',async()=>{
 const btn=$('generate');
 try{
   btn.disabled=true;btn.textContent='正在生成 PPTX…';
   if(!state.analysis)throw new Error('請先分析腳本。');
   if(state.analysis.filename!==nextFilename($('eventDate').value,$('eventName').value,[...await listOutputFiles(state.outputDir),...cachedOutputNames($('eventDate').value,$('eventName').value)]))throw new Error('檔名或既有版本已變更，請重新分析。');
   if(state.analysis.layout.slides.length===0)throw new Error('沒有可產生的投影片。');
   const blob=await generatePptx(state.analysis.layout.slides,state.device,$('ratio').value);
   const result=await saveBlob(blob,state.analysis.filename,state.outputDir);
   rememberOutputName($('eventDate').value,$('eventName').value,state.analysis.filename);
   notice(`${result}：${state.analysis.filename}`,'success');
   $('review').classList.add('hidden');state.analysis=null;
 }catch(err){notice(`產生失敗：${err.message}`,'error');}
 finally{btn.disabled=false;btn.textContent='確認並生成 PPTX ↓';}
});
$('eventDate').value=new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10);
for(const id of ['eventDate','eventName','ratio'])$(id).addEventListener('change',()=>{$('review').classList.add('hidden');state.analysis=null;});
