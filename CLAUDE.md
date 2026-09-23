# 에피브리프(EpiBrief) 작업 지침

## 답변 마무리 규칙 (필수)
- 매 답변 끝에 **공유 페이지** 목록을 항상 붙인다. 작업으로 바뀐 페이지는 앞에 ✔ 표시.
- 형식:

  **공유 페이지**
  - 제작 도구: https://epibrief.github.io/
  - 발간 예시: https://epibrief.github.io/issues/
  - 구독 신청: https://epibrief.github.io/subscribe.html
  - 기관 소식지: https://epibrief.github.io/local/?org=suwon
  - 발행 권한 신청: https://epibrief.github.io/apply.html
  - 관리: https://epibrief.github.io/admin/ (관리자 키 필요, 화면에 키를 적지 않음)
  - 새 발간본이 생기면 그 호의 주소도 추가 (예: https://epibrief.github.io/issues/injury-2026-01.html)

## 배포
- 저장소: epibrief/epibrief.github.io, main 브랜치가 곧 배포본 (GitHub Pages).
- 푸시 후 반영까지 최대 10분, 사용자 브라우저는 강력 새로고침(Windows Ctrl+Shift+R / Mac Cmd+Shift+R) 필요.
- 원격에 다른 세션 커밋이 있을 수 있으니 푸시 전 `git fetch origin main && git merge origin/main`.

## 구조
- `index.html` 제작 도구(단일 파일), `local/` 기관 소식지, `apply.html` 발행 권한 신청, `admin/` 관리,
  `issues/` 발간 예시(렌더 스크립트 산출물), `samples/*.json` 발간 예시 원고.
- 네 화면(`/`, `local/`, `apply.html`, `admin/`)은 같은 메뉴 막대를 각자 품고 있다. 메뉴를 고치면 네 군데를 함께 고친다.
- `data/sources.json` 소스 DB → `scripts/build_outbreak_feed.py`(GitHub Actions 매일 KST 05:00) → `data/feed.json`.
- 소스 형식: rss / query(뉴스검색, must) / epmc / who_api / who_pub / page(page_re, link_fmt, title_fmt, limit, filter).
- 발간본 추가: `samples/<kind>-<yyyy>-<nn>.json` 작성 → `python3 scripts/render_newsletter_issues.py` → index.html의 SAMPLE_FILE 갱신.

## 발행 권한 (3단)
- 체험(trial) 등록 즉시 사용 · '체험 중' 띠 / 인증(verified) 신청→승인 / 정지(suspended) 읽기만.
- 기관명 코드(kdca·seoul 등 43개)는 `epibrief.reserved`로 잠금. 승인된 신청이 있어야 등록된다.
- 서버 함수는 `supabase/sql/2026-09-23-발행권한.sql`에 그대로 두었다. 고칠 때 이 파일도 함께 고친다.
- 구독자 명단은 보관하지 않는다. 구독 신청은 기관 담당자 메일함으로 바로 간다.

## 저작권 원칙
- 저장·게재는 제목·출처·링크·발행일·짧은 발췌까지만. 본문·초록 전문 저장 금지.
- AI 없이 만드는 기본 초안은 발췌를 첫 문장 인용(따옴표+출처)으로만 표시.

## 커밋
- 메시지 끝에 Co-Authored-By / Claude-Session 줄 유지. 모델 이름은 저장소 파일에 넣지 않는다.
