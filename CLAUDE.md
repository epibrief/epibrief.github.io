# 에피브리프(EpiBrief) 작업 지침

## 답변 마무리 규칙 (필수)
- 매 답변 끝에 **공유 페이지** 목록을 항상 붙인다. 작업으로 바뀐 페이지는 앞에 ✔ 표시.
- 형식:

  **공유 페이지**
  - 제작 도구: https://epibrief.github.io/
  - 발간한 뉴스레터: https://epibrief.github.io/issues/
  - 구독 신청: https://epibrief.github.io/subscribe.html
  - 지자체 소식지: https://epibrief.github.io/local/?org=suwon
  - 지자체 관리자: https://epibrief.github.io/local/admin.html (관리자 키 필요, 화면에 키를 적지 않음)
  - 새 발간본이 생기면 그 호의 주소도 추가 (예: https://epibrief.github.io/issues/injury-2026-01.html)

## 배포
- 저장소: epibrief/epibrief.github.io, main 브랜치가 곧 배포본 (GitHub Pages).
- 푸시 후 반영까지 최대 10분, 사용자 브라우저는 강력 새로고침(Windows Ctrl+Shift+R / Mac Cmd+Shift+R) 필요.
- 원격에 다른 세션 커밋이 있을 수 있으니 푸시 전 `git fetch origin main && git merge origin/main`.

## 구조
- `index.html` 새 제작 화면 — 홈 / 뉴스레터 만들기 / 발간물 보기 / 내 작업. 예시 선택 → 내용 바꾸기 → 확인하고 내보내기 3단계.
  - `assets/templates.js` 예시 6종, `assets/render.js` 공용 렌더러(미리보기·예시 카드·내보내기가 함께 씀), `assets/app.js` 화면 로직, `assets/app.css` 도구 서식.
  - 작업본은 `localStorage['epibrief-works-v1']`. 블록 형식: notice / list / contact / schedule / question / evidence.
- `brief.html` 전 버전 전문 브리프 제작 도구(소스 선택·AI 초안). 「더 보기 → 고급 도구」에서 연결.
- `local/` 지자체 소식지 + 기관 공동 저장, `issues/` 발간본(렌더 스크립트 산출물), `samples/*.json` 발간본 원고.
- `data/sources.json` 소스 DB → `scripts/build_outbreak_feed.py`(GitHub Actions 매일 KST 05:00) → `data/feed.json`.
- 소스 형식: rss / query(뉴스검색, must) / epmc / who_api / who_pub / page(page_re, link_fmt, title_fmt, limit, filter).
- 발간본 추가: `samples/<kind>-<yyyy>-<nn>.json` 작성 → `python3 scripts/render_newsletter_issues.py` → index.html의 SAMPLE_FILE 갱신.

## 화면 원칙 (지시서 반영)
- 첫 화면에 기관 설정·데이터 소스·공동 저장 같은 설정 절차를 두지 않는다. 예시 선택이 첫 행동.
- 없는 실적(조회수·구독자 수·절약 시간)을 만들지 않는다. 내보내기를 발송·게시 완료로 표시하지 않는다.
- PDF를 직접 만들지 않으므로 「PDF 생성 완료」라고 쓰지 않는다. 게시 링크는 실제 주소가 있을 때만 켠다.
- 구독은 기관이 자기 양식 주소를 넣는 방식. 접수 경로가 없으면 숨기거나 「구독 준비 중」.
- 예시에는 실제 기관처럼 보이는 발행자·로고를 쓰지 않고, 일정·연락처는 자리표시자로 둔다.
- PHSM은 별도 전문 양식으로 유지한다. 자료 유형과 원문 확인 상태를 각각 표시하고, 연구설계 이름만으로 확실성 등급을 매기지 않는다.

## 저작권 원칙
- 저장·게재는 제목·출처·링크·발행일·짧은 발췌까지만. 본문·초록 전문 저장 금지.
- AI 없이 만드는 기본 초안은 발췌를 첫 문장 인용(따옴표+출처)으로만 표시.

## 커밋
- 메시지 끝에 Co-Authored-By / Claude-Session 줄 유지. 모델 이름은 저장소 파일에 넣지 않는다.
