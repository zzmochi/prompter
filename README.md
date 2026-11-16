# Prompter Studio

純前端的韓文活動提詞機 PPTX 產生器。依照 [AGENTS.md](./AGENTS.md) 規格製作。

## 操作

1. 在網站選擇一份 `.docx` 主腳本及所需的歌詞 `.docx`／`.txt`，或透過支援的瀏覽器授權整個活動資料夾。
2. 選擇 iPad／Windows、顯示比例、演出日期與活動名稱。
3. 點選「分析腳本」，檢查章節、講者、歌曲匹配與投影片摘要。
4. 點選「確認並生成 PPTX」。如已授權資料夾寫入，將保存到 `Output/`；否則透過瀏覽器下載。

瀏覽器中的內容解析與 PPTX 生成均在本機進行，不送出腳本或歌詞到外部服務。

## GitHub Pages

將本專案內容放在儲存庫根目錄，在 GitHub → Settings → Pages 選擇 **Deploy from a branch**、`main`、`/(root)`。`index.html` 即為進入點，無須建置、後端或 API Key。

## 核心限制

- `.doc` 舊版二進位 Word 格式**不支援直接轉換**：請另存為 `.docx` 後再匯入，避免腳本遺失。
- 以規則辨識章節與講者；各活動的腳本格式不同，特殊格式可能需要擴充分類器。模糊內容優先保留，可能連同不需要的舞台備註一起輸出。
- 歌曲需要明確的 `SONG: 歌名`／`노래: 歌名` 標記，並有歌名對得上的歌詞檔；不會自動搜尋或補寫歌詞。
- PPTX 使用 `Malgun Gothic`；播放設備應安裝該字型。文字實際大小可能受 PowerPoint 字型替代與版本影響，正式演出前必須檢查。
- 比例選擇是顯示比例預設值，並不能直接偵測播放設備。
- 沒有資料夾讀取權限時，版本號使用同一瀏覽器的本機儲存紀錄遞增；清除瀏覽器資料、改用其他瀏覽器或設備後，無法保證與先前下載的檔案續號。請優先使用已授權的活動資料夾。
- 瀏覽器若不支援 File System Access API，仍可選擇檔案並下載結果，但無法自動寫入 `Output/`。
- 解析摘要與版型估算為規則式實作，不等同逐頁人工檢查。

## 檔案結構

- `js/document-parser.js`：DOCX／TXT 讀取。
- `js/script-classifier.js`：講者、章節、舞台提示及製作資訊分類。
- `js/lyrics-matcher.js`：來源歌名與歌詞文件比對。
- `js/slide-layout.js`：文字分頁和裝置參數。
- `js/pptx-generator.js`：黑底提詞 PPTX 輸出。
- `js/file-versioning.js`：檔名、版本與輸出資料夾。
- `js/main.js`：UI 流程與使用者互動。
- `vendor/`：JSZip 與 PptxGenJS 的瀏覽器版函式庫，隨專案提供，避免在執行時依賴 CDN。

## 授權與函式庫

第三方函式庫由原專案授權：
- [JSZip](https://github.com/Stuk/jszip) — MIT 或 GPLv3，專案使用 MIT 條款。
- [PptxGenJS](https://github.com/gitbrent/PptxGenJS) — MIT。

兩者均已打包為瀏覽器端程式，未內含使用者個人資料。
