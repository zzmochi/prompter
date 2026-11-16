export function eventCode(date){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw new Error('請輸入正確的演出日期。');
 const [y,m,d]=date.split('-').map(Number),dt=new Date(Date.UTC(y,m-1,d));
 if(dt.getUTCFullYear()!==y||dt.getUTCMonth()!==m-1||dt.getUTCDate()!==d)throw new Error('演出日期無效。');
 return date.slice(2).replaceAll('-','');
}
export function fileBase(date,name){
 const cleaned=name.trim().replace(/[\\/:*?"<>|\x00-\x1f]/g,'').replace(/\s+/g,'');
 if(!cleaned)throw new Error('請輸入藝人與活動名稱。');
 return `${eventCode(date)}_${cleaned}_prompter_`;
}
export function nextFilename(date,name,filenames=[]){
 const base=fileBase(date,name),versions=filenames.map(f=>String(f)).filter(f=>f.startsWith(base))
 .map(f=>f.slice(base.length).match(/^v(\d+)\.pptx$/i)).filter(Boolean).map(m=>Number(m[1]));
 return `${base}v${Math.max(0,...versions)+1}.pptx`;
}
export function cachedOutputNames(date,name){
  try { const key=`prompter:versions:${fileBase(date,name)}`;return JSON.parse(localStorage.getItem(key)||'[]'); }
  catch{return [];}
}
export function rememberOutputName(date,name,filename){
  try {const key=`prompter:versions:${fileBase(date,name)}`;const values=new Set(cachedOutputNames(date,name));values.add(filename);localStorage.setItem(key,JSON.stringify([...values]));}
  catch{/* If browser storage is disabled, downloads still function. */}
}
export async function getOutputDir(projectHandle){
 if(!projectHandle)return null;
 return projectHandle.getDirectoryHandle('Output',{create:true});
}
export async function listOutputFiles(outputHandle){
 if(!outputHandle)return [];
 const names=[];for await(const [name,handle] of outputHandle.entries())if(handle.kind==='file')names.push(name);return names;
}
export async function saveBlob(blob,fileName,outputHandle){
 if(outputHandle){
   const existing=await listOutputFiles(outputHandle);
   if(existing.includes(fileName))throw new Error('檔案已存在，請重新分析以取得新版本號；不會覆蓋既有檔案。');
   const file=await outputHandle.getFileHandle(fileName,{create:true});
   const writer=await file.createWritable();await writer.write(blob);await writer.close();
   return '已儲存至活動專案的 Output/ 資料夾';
 }
 const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=fileName;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
 return '已啟動瀏覽器下載；實際儲存位置由瀏覽器設定決定';
}
