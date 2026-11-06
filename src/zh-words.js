// 中文指令 (zh-TW fork): turns a request typed or spoken in Chinese into the English the command
// rules (command.js) and Needle read: 「陰影加25」→ "shadows up 25", 「暖一點」→ "warmer a bit",
// 「跟上一張一樣」→ "same as the previous photo". English passes through unchanged, and mixed requests
// work too. Order matters: longer and more specific words are replaced before the single characters
// inside them (飽和度 before 和, 亮部 before 亮, 紅點 before 紅).
const CN = { 零: 0, 〇: 0, 一: 1, 二: 2, 兩: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
const NUM = '[零〇一二兩三四五六七八九十百]';
// 二十五 → 25, 一百 → 100, 十二 → 12.
function cnInt(s) {
  let total = 0, cur = 0;
  for (const ch of s) {
    if (ch in CN) cur = CN[ch];
    else if (ch === '十') { total += (cur || 1) * 10; cur = 0; }
    else if (ch === '百') { total += (cur || 1) * 100; cur = 0; }
  }
  return total + cur;
}
const cnDigits = (s) => [...s].map((c) => CN[c] ?? '').join('');
const num = (n) => (/^\d+$/.test(n) ? n : String(cnInt(n)));

const w = (en) => ` ${en} `;
const RULES = [
  // Punctuation and full-width characters.
  [/[，、。；]/g, ', '], [/[＋]/g, '+'], [/[－—]/g, '-'], [/[％]/g, '%'], [/[．]/g, '.'],
  [/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xfee0)],
  // Problems ("too dark") and looks, before the words inside them.
  [/天空(?:太|過|好|很)?白|天空過曝|天空死白|死白|過曝的天空|爆掉/g, w('blown sky')],
  [/曝光不足|太暗|偏暗|太黑|好暗|很暗|暗暗的/g, w('too dark')],
  [/曝光過度|過曝|太亮|偏亮|好亮|很亮/g, w('too bright')],
  [/太飽和|過飽和|太艷|太豔|太鮮豔|太鮮艷|顏色太重|太濃/g, w('too saturated')],
  [/太暖|太黃|偏黃|太橘|偏橘|發黃/g, w('too warm')],
  [/太冷|太藍|偏藍|偏冷|發藍/g, w('too cold')],
  [/色溫\s*再?\s*(?:低|降低|調低|往下|減少|減|降)/g, w('cooler')],
  [/色溫\s*再?\s*(?:高|提高|調高|往上|增加|加)/g, w('warmer')],
  [/灰灰的|灰濛濛|沒精神|平淡|悶悶的|很悶|太悶/g, w('dull')],
  [/去朦朧|去霧|除霧/g, w('dehaze')],
  [/壓暗四角|四角壓暗|四周壓暗|壓四角/g, w('vignette')],
  [/背景模糊|模糊背景|背景虛化|虛化背景|淺景深|散景|人像模式/g, w('blur the background')],
  [/耶穌光|光芒|光束|陽光灑落/g, w('sun rays')],
  [/起霧|霧氣|霧感|大氣感|大氣/g, w('atmosphere')],
  [/磨皮|美膚|修膚|膚質|皮膚/g, w('skin')],
  [/重新對焦|失焦|對焦/g, w('refocus')],
  [/黃金時刻|夕陽|日落|暖陽|金黃/g, w('golden hour')],
  [/黑白|單色|灰階/g, w('b&w')],
  [/彩色|恢復顏色/g, w('color')],
  [/柔和|霧面|低對比|平一點|平一些/g, w('softer')],
  [/有層次|立體|更跳|跳一點|有衝擊|衝擊感|搶眼/g, w('pop')],
  [/鮮豔|鮮艷|色彩豐富/g, w('vivid')],
  [/低飽和|褪色|莫蘭迪|清淡/g, w('muted')],
  [/自動|優化|美化|修一下|變好看/g, w('enhance')],
  [/提亮|調亮/g, w('brighter')],
  [/壓暗|調暗/g, w('darker')],
  // Whole requests (they hold 一 and 第N張, so before the numbers).
  [/重來|從頭來|全部重設|全部還原|還原全部|回到原圖|還原原圖|恢復原圖|原圖/g, w('start over')],
  [/拉直|轉正|擺正|地平線|水平線|歪掉|歪了|歪/g, w('straighten')],
  [/(?:跟|和|與|同)?\s*(?:上一張|前一張)(?:照片)?\s*(?:一樣|相同)/g, w('same as the previous photo')],
  [/(?:跟|和|與|同)?\s*下一張(?:照片)?\s*(?:一樣|相同)/g, w('same as the next photo')],
  [new RegExp(`(?:跟|和|與|同)?\\s*第\\s*(${NUM}+|\\d+)\\s*張(?:照片)?\\s*(?:一樣|相同)`, 'g'), (_, n) => w(`same as photo ${num(n)}`)],
  [/(?:貼上|套用|複製|拷貝|用)?\s*(?:上一張|前一張)(?:照片)?的?(?:編輯|設定|參數|調色|風格|效果)?/g, w('paste the edits from the previous photo')],
  [/(?:貼上|套用|複製|拷貝|用)?\s*下一張(?:照片)?的?(?:編輯|設定|參數|調色|風格|效果)?/g, w('paste the edits from the next photo')],
  [new RegExp(`(?:貼上|套用|複製|拷貝|用)\\s*第\\s*(${NUM}+|\\d+)\\s*張(?:照片)?的?(?:編輯|設定|參數|調色|風格|效果)?`, 'g'), (_, n) => w(`paste the edits from photo ${num(n)}`)],
  [new RegExp(`第\\s*(${NUM}+|\\d+)\\s*張(?:照片)?`, 'g'), (_, n) => w(`photo ${num(n)}`)],
  [/貼上編輯|貼上設定|貼上/g, w('paste edits')],
  // Amounts, then numbers (decimals like 零點五 first; 一點 means "a bit", not one point).
  [new RegExp(`(${NUM}+)點([零〇一二三四五六七八九]+)`, 'g'), (_, a, b) => w(`${cnInt(a)}.${cnDigits(b)}`)],
  [/一點點|一丁點|一點|一些|一下下|稍微|有一點|有點|微微|輕微|略微|略/g, w('a bit')],
  [/非常|超級|十分|大幅|強烈|很多|多很多|超|很/g, w('a lot')],
  [/一下|一起|一致|一樣/g, ' '],
  [/半格|半檔|半級/g, w('0.5 stop')],
  [new RegExp(`${NUM}+`, 'g'), (m) => w(String(cnInt(m)))],
  [/負\s*(?=\d)/g, '-'], [/正\s*(?=\d)/g, '+'],
  [/(\d+(?:\.\d+)?)\s*(?:格|檔|級)/g, '$1 stops'],
  [/(\d+(?:\.\d+)?)\s*點/g, '$1 points'],
  // Controls (Lightroom's Chinese names and everyday ones).
  [/細節飽和度|自然飽和度|自然飽和|鮮豔度|鮮艷度/g, w('vibrance')],
  [/飽和度|飽和/g, w('saturation')],
  [/曝光度|曝光/g, w('exposure')],
  [/對比度|對比/g, w('contrast')],
  [/亮部|高光/g, w('highlights')],
  [/陰影|暗部/g, w('shadows')],
  [/白平衡/g, w('white balance')],
  [/白色色階|白色|白場/g, w('whites')],
  [/黑色色階|黑色|黑場/g, w('blacks')],
  [/色溫/g, w('temperature')],
  [/色調/g, w('tint')],
  [/紋理|質感/g, w('texture')],
  [/清晰度/g, w('clarity')],
  [/朦朧/g, w('haze')],
  [/暈映|暗角/g, w('vignette')],
  [/顆粒|底片感|膠片感/g, w('grain')],
  [/銳利化|銳利度|銳化|鋭化|銳利|鋭利|清楚/g, w('sharpen')],
  [/色彩雜色|彩色雜訊|色彩雜訊/g, w('color noise')],
  [/紅點|彩色斑點|色斑點/g, w('color speckles')],
  [/雜色減少|降噪|去噪|雜訊|噪點|雜色/g, w('noise reduction')],
  [/鏡頭模糊|模糊/g, w('lens blur')],
  [/增強/g, w('enhance')],
  [/明亮度/g, w('luminance')],
  [/亮度/g, w('exposure')],
  [/色相/g, w('hue')],
  [/羽化/g, w('feather')],
  [/中點/g, w('midpoint')],
  [/圓度/g, w('roundness')],
  [/粗糙度/g, w('roughness')],
  [/半徑/g, w('radius')],
  [/遮色/g, w('masking')],
  [/總量|數量/g, w('amount')],
  [/大小|尺寸/g, w('size')],
  [/天空/g, w('sky')],
  [/背景/g, w('background')],
  // Colours (the colour mixer).
  [/洋紅色?|品紅色?|桃紅色?/g, w('magenta')],
  [/紅色?/g, w('red')],
  [/橘色|橙色|橘|橙/g, w('orange')],
  [/黃色?/g, w('yellow')],
  [/淺綠色|青色|水藍色?|青/g, w('aqua')],
  [/綠色?/g, w('green')],
  [/藍色?/g, w('blue')],
  [/紫色?|薰衣草色?/g, w('purple')],
  // Directions and settings.
  [/調到|調成|設為|設成|設定為|設定成|改成|改為|變成/g, w('to')],
  [/重設|歸零/g, w('reset')],
  [/去掉|移除|拿掉|不要|關掉|取消/g, w('remove')],
  [/增加|提高|拉高|調高|提升|加強|往上/g, w('up')],
  [/降低|減少|拉低|調低|往下|減弱/g, w('down')],
  [/多/g, w('more')],
  [/少/g, w('less')],
  [/更|再/g, w('more')],
  [/加/g, w('up')],
  [/減|降/g, w('down')],
  [/高/g, w('higher')],
  [/低/g, w('lower')],
  [/溫暖|暖/g, w('warmer')],
  [/冷|涼/g, w('cooler')],
  [/亮/g, w('brighter')],
  [/暗/g, w('darker')],
  [/柔/g, w('softer')],
  // Joining words, once the words that contain them are gone.
  [/然後|接著|再來/g, ', then '],
  [/而且|並且|同時|還有|以及|和|跟|與|及/g, ' and '],
  // Filler.
  [/請|幫我|幫忙|麻煩|給我|我想要|我要|想要|可以|把|讓|使|這張|整張|照片|畫面|整體|的|了|吧|喔|哦|啊|呀|嗎|呢|點/g, ' '],
];

const HAN = /[㐀-鿿＀-￯　-〿]/;
export function toEnglish(text) {
  if (typeof text !== 'string' || !HAN.test(text)) return text;
  let t = text;
  for (const [re, to] of RULES) t = t.replace(re, to);
  return t.replace(/\s+([,;])/g, '$1').replace(/\s+/g, ' ').trim();
}
