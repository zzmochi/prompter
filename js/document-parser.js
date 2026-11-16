/** DOCX parser: reads actual OOXML body order (including table rows and cells). */
export async function parseDocument(file) {
  const name=file.name || '';
  if (/\.doc$/i.test(name)) throw new Error(`${name} 是舊版 .doc，無法可靠地在瀏覽器解析。請先用 Word 另存為 .docx。`);
  if (/\.txt$/i.test(name)) return (await file.text()).replace(/\r\n?/g,'\n').split('\n');
  if (!/\.docx$/i.test(name)) throw new Error(`不支援的檔案格式：${name}`);
  const zip=await window.JSZip.loadAsync(await file.arrayBuffer());
  const documentFile=zip.file('word/document.xml');
  if (!documentFile) throw new Error(`${name} 缺少 word/document.xml，可能不是有效的 DOCX。`);
  const xml= new DOMParser().parseFromString(await documentFile.async('string'), 'application/xml');
  if (xml.getElementsByTagName('parsererror').length) throw new Error(`${name} 的 Word XML 格式無效。`);
  const body=[...xml.getElementsByTagName('*')].find(n=>n.localName==='body');
  if (!body) throw new Error(`${name} 找不到 Word 文件正文。`);
  const lines=[];
  const children=n=>[...n.children];
  function paragraph(n) {
    let s='';
    const walk=x=>{
      if(x.localName==='t' || x.localName==='instrText') { if(x.localName==='t') s+=x.textContent; return; }
      if(x.localName==='tab') { s+='\t'; return; }
      if(x.localName==='br'||x.localName==='cr') { s+='\n'; return; }
      for(const child of children(x)) walk(child);
    };
    walk(n);return s;
  }
  function visit(n){
    if(n.localName==='p'){ const text=paragraph(n); for(const line of text.split('\n')) lines.push(line); return; }
    // Table elements may contain nested tables and cell paragraphs.
    if(n.localName==='tbl'||n.localName==='tr'||n.localName==='tc'||n.localName==='sdt'||n.localName==='sdtContent') for(const c of children(n)) visit(c);
  }
  for(const c of children(body)) visit(c);
  return lines;
}
