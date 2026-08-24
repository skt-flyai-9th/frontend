# 여기 있는 otf 파일은 자리표시용 빈 파일입니다

Metro 번들러가 `require()` 경로를 정적으로 검사하기 때문에, 파일이 없으면 **빌드가 실패**합니다.
그래서 실제 폰트 대신 빈 파일을 넣어 두었습니다.

## 진짜 폰트로 바꾸는 법

1. https://github.com/orioncactus/pretendard 에서 다운로드
2. 아래 5개 파일을 **같은 이름으로 덮어쓰기**
   - Pretendard-Regular.otf
   - Pretendard-Medium.otf
   - Pretendard-SemiBold.otf
   - Pretendard-Bold.otf
   - Pretendard-Black.otf
3. `src/design/fonts.ts` 의 `USE_CUSTOM_FONTS` 를 `true` 로 변경

**순서를 지켜 주세요.** 파일을 넣기 전에 true 로 바꾸면 앱이 폰트를 못 찾습니다.

라이선스: SIL Open Font License 1.1 — 상업적 사용 가능. 영상 자막에도 쓸 수 있습니다.
