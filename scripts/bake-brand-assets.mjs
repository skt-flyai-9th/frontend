/**
 * 로고·앱아이콘 JPG 를 앱에 넣을 PNG 로 굽습니다.
 * 크롬 캔버스로 처리합니다 — 새 의존성을 안 늘리려고.
 *
 *  1) 흰 배경을 투명으로 (밝기 → 알파). 검정 잉크만 남습니다.
 *  2) 잉크 바깥 여백을 잘라냅니다 (원본은 여백이 절반 이상입니다).
 *  3) 쓰임새별 규격으로 저장합니다.
 */
import fs from 'fs';
import puppeteer from 'puppeteer-core';
/** 크롬 경로. 없으면 `puppeteer-core` 와 함께 설치된 크롬을 지정하세요. */
const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
// 원본은 저장소 안에 함께 둡니다 — 다른 크기로 다시 구울 일이 생깁니다.
const SRC = new URL('../assets/brand/', import.meta.url).pathname.replace(/^\//, '');
const OUT = new URL('../assets/', import.meta.url).pathname.replace(/^\//, '');

const b64 = (p) => 'data:image/jpeg;base64,' + fs.readFileSync(p).toString('base64');
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const page = await b.newPage();
await page.setContent('<html><body></body></html>');

const bake = async (dataUri, opts) =>
  page.evaluate(async (uri, o) => {
    const img = new Image();
    img.src = uri;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height);
    const px = d.data;

    // 밝기 → 알파. 흰색(255)은 완전 투명, 검정(0)은 완전 불투명.
    // 안티에일리어싱 된 가장자리도 자연스럽게 반투명으로 남습니다.
    let minX = c.width, minY = c.height, maxX = -1, maxY = -1;
    for (let y = 0; y < c.height; y++) {
      for (let x = 0; x < c.width; x++) {
        const i = (y * c.width + x) << 2;
        const lum = (px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114);
        const a = Math.max(0, Math.min(255, Math.round(255 - lum)));
        px[i] = 0; px[i + 1] = 0; px[i + 2] = 0; px[i + 3] = a;
        if (a > 24) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
      }
    }
    g.putImageData(d, 0, 0);
    if (maxX < 0) return null;

    // 잉크 영역만 잘라내기
    const iw = maxX - minX + 1, ih = maxY - minY + 1;
    const cut = document.createElement('canvas');
    cut.width = iw; cut.height = ih;
    cut.getContext('2d').drawImage(c, minX, minY, iw, ih, 0, 0, iw, ih);

    // 목표 규격으로 그리기
    const out = document.createElement('canvas');
    out.width = o.w; out.height = o.h;
    const og = out.getContext('2d');
    og.imageSmoothingEnabled = true;
    og.imageSmoothingQuality = 'high';
    if (o.bg) { og.fillStyle = o.bg; og.fillRect(0, 0, o.w, o.h); }
    // 안전영역 안에 비율 유지로 가운데 맞춤
    const boxW = o.w * (o.inset ?? 1), boxH = o.h * (o.inset ?? 1);
    const s = Math.min(boxW / iw, boxH / ih);
    const dw = iw * s, dh = ih * s;
    og.drawImage(cut, (o.w - dw) / 2, (o.h - dh) / 2, dw, dh);
    return { url: out.toDataURL('image/png'), ink: `${iw}x${ih}` };
  }, dataUri, opts);

const save = (name, res) => {
  fs.writeFileSync(`${OUT}/${name}`, Buffer.from(res.url.split(',')[1], 'base64'));
  console.log(`  ${name.padEnd(24)} 잉크 ${res.ink}`);
};

const logo = b64(`${SRC}/logo-source.jpg`);
const mark = b64(`${SRC}/appicon-source.jpg`);

console.log('── 인앱 로고 (가로형 워드마크, 투명)');
// 높이 32 로 쓰는 곳이 가장 크므로 3배(96)보다 넉넉하게 굽습니다.
save('logo-wordmark.png', await bake(logo, { w: 1200, h: 300 }));

console.log('\n── 앱 아이콘');
// 스토어 아이콘: 1024 정사각 · 흰 배경 · 마크가 72%
save('icon.png', await bake(mark, { w: 1024, h: 1024, bg: '#FFFFFF', inset: 0.72 }));
// 안드로이드 적응형 아이콘 앞면: 투명 · 마크가 안전영역(66%) 안
save('adaptive-icon.png', await bake(mark, { w: 1024, h: 1024, inset: 0.6 }));
// 스플래시: app.json imageWidth 200 · 투명 워드마크
save('splash-icon.png', await bake(logo, { w: 1200, h: 300 }));

await b.close();
