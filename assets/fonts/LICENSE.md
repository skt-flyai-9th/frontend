# Pretendard — 폰트 라이선스

이 패키지에 포함된 `Pretendard-*.otf` 5종(Regular 400 · Medium 500 · SemiBold 600 · Bold 700 · Black 900)은
**SIL Open Font License 1.1** 로 배포되는 오픈소스 폰트입니다.

- 프로젝트: Pretendard (orioncactus)
- 라이선스: SIL OFL 1.1 — 상업적 사용·임베딩·재배포 가능, 폰트 파일 자체의 판매만 금지
- 전문: https://scripts.sil.org/OFL

## 사용 규칙 (이 프로젝트)

1. **self-host 필수.** CDN 참조를 쓰지 않습니다 — 오프라인·해외망 환경에서 폰트가 깨지고, 첫 렌더에 FOUT이 발생합니다. `tokens/fonts.css` 의 `@font-face` 를 그대로 사용하세요.
2. **웹 배포 시 서브셋 권장.** OTF 원본은 용량이 큽니다. 프로덕션에서는 WOFF2 변환 + 한글 서브셋(KS X 1001 + 자주 쓰는 확장)으로 교체하되, `font-family: "Pretendard"` 이름과 웨이트 5종은 유지하세요.
3. **웨이트 5종만 사용.** 400/500/600/700/900. 다른 웨이트를 가져오거나 브라우저 합성(`font-weight` 보간, fake bold)에 의존하지 않습니다.
4. **폴백 스택 고정.** `"Pretendard", -apple-system, BlinkMacSystemFont, system-ui, sans-serif` (`tokens/typography.css` 의 `--font-sans`).
5. **앱 스토어 제출용 SVG** (`assets/logo.svg`, `app-icon.svg`, `splash.svg`)는 Pretendard를 폰트명으로 참조합니다. 제출 전 텍스트를 아웃라인으로 변환하세요.
