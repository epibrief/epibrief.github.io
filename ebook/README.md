# 웹북 템플릿

`template.html` 하나가 책 전체입니다. 서버·라이브러리 없음.

## 누구나 만들기: 웹 제작기
`https://epibrief.github.io/ebook/maker.html`

마크다운 원고를 붙여넣으면 미리보기가 뜨고, `책 HTML 내려받기`로 파일 하나를 받습니다.
`코드로 잠그기`를 켜면 브라우저 안에서 암호화해 잠긴 책을 내려받습니다. 설치·로그인 없음.
이 주소를 그대로 나눠 주면 다른 사람도 자기 책을 만들 수 있습니다.

| 원고 표기 | 결과 |
|---|---|
| `# 제목` | 새 챕터 (표지·차례 자동) |
| `## 소제목` / `---` | 새 쪽 |
| `**굵게**`, `> 인용`, `- 목록`, `\| 표 \|`, ```` ``` ````, `![](주소)` | 그대로 |
| `youtube: 영상ID` 또는 유튜브 주소 한 줄 | 누르면 재생되는 영상 |
| `::: 한 줄` | 메모 상자 |

제작기는 같은 폴더의 `template.html`을 읽어 책을 만들므로, 두 파일을 함께 올려야 합니다.

### 세미나·강연 정리
행사 영상을 요약과 질의응답으로 정리할 때 쓰는 표기입니다.

| 원고 표기 | 결과 |
|---|---|
| `발표자: 이름 \| 소속 \| 시간` | 발표자 정보칸 (뒤는 생략 가능) |
| `핵심: 한 줄` | 눈에 띄는 결론 상자 |
| `Q: 질문` 다음 줄 `A: 답변` | 질의응답 카드. 끝에 `-- 이름` 을 붙이면 말한 사람 표시 |
| `12:30 내용` (줄 맨 앞이 시각) | 시간 목차. 누르면 영상이 그 지점부터 재생 |
| 문장 속 `(37:20)` | 글 안에서도 시간을 누르면 그 지점으로 |

시간을 쓰려면 그 쪽(또는 앞쪽)에 `youtube:` 로 영상이 하나 있어야 합니다.
예시 원고: `ebook/drafts/seminar-demo.md`

### 발행 (깃허브 없이 주소 만들기)
제작기의 **발행하기**에 발행 코드를 넣으면 주소가 나옵니다. 독자는 깃허브를 볼 일이 없습니다.

- 주소 형태: `https://epibrief.github.io/ebook/b/?book-xxxx`
- 책 파일은 수파베이스 저장소(`korea-now` 프로젝트, 버킷 `webbook`)에 올라가고, `ebook/b/index.html`이 받아서 보여줍니다
- 같은 브라우저에서 다시 발행하면 같은 주소가 새 내용으로 바뀝니다 (수정 토큰은 브라우저에만 저장)
- 발행 코드 관리: 수파베이스 → Table Editor → `webbook_codes` (`active`를 끄면 그 코드로는 못 올림)
- 서버 함수: `supabase/functions/webbook-publish/`

## 쓰는 법
1. `template.html`을 복사해 새 이름으로 저장 (예: `book1.html`)
2. `<div id="deck">` 안의 `<section class="s">` 블록을 쪽 단위로 고치기
3. 커밋하면 `https://epibrief.github.io/ebook/book1.html` 로 열림

## 쪽 종류
| class | 쓰임 |
|---|---|
| `s cover` | 책 표지·맺음 |
| `s open alt` | 챕터 표지 (`.chnum` 번호가 차례 링크와 연결) |
| `s` | 본문 |

## 부품
`h3` 소제목, `.prose p` 본문, `blockquote` 인용, `.note` 메모, `table`, `pre` 코드, `figure` 사진, `.vwrap[data-v=유튜브ID]` 영상

## 동작
← → 스페이스, 스와이프, 하단 드롭다운(자동 생성), `#p번호` 주소, 읽던 쪽 기억, PDF 단추(브라우저 인쇄)

## PDF
오른쪽 위 `PDF ▾` 메뉴.
- **PDF 내려받기**: 같은 이름의 `.pdf` (예: `book1.html` → `book1.pdf`)
- **인쇄로 PDF 저장**: 브라우저 인쇄 창 (Mac ⌘P / Windows Ctrl+P → "PDF로 저장")
- **이 쪽 링크 복사**: 지금 보는 쪽 주소

PDF 파일은 `ebook/*.html` 을 푸시하면 깃허브 액션(`.github/workflows/ebook-pdf.yml`)이 자동으로 만들어 커밋합니다.
로컬에서 직접 만들려면:

```
npm i --no-save playwright && npx playwright install chromium
node scripts/build_ebook_pdf.mjs            # ebook/ 전체
node scripts/build_ebook_pdf.mjs book1.html # 하나만
```

## 공유
| 방법 | 주소 |
|---|---|
| 책 전체 | `https://epibrief.github.io/ebook/book1.html` |
| 특정 쪽 | `https://epibrief.github.io/ebook/book1.html#p12` (메뉴 → 이 쪽 링크 복사) |
| PDF 직접 | `https://epibrief.github.io/ebook/book1.pdf` |

카톡·유튜브 설명란에 주소만 붙이면 됩니다. 미리보기 그림을 넣으려면 `<head>`에 `og:image` 를 추가하세요.

## 잠그기 (코드 입력해야 열리는 책)
서버 없이, 본문과 PDF를 코드로 암호화해서 올립니다. 코드 없이는 소스 보기로도 못 읽습니다.

```
# 1. 원고는 ebook/drafts/ 에 둡니다 (깃에 안 올라감)
cp ebook/template.html ebook/drafts/book1.html   # Windows: copy ebook\template.html ebook\drafts\book1.html
# 2. PDF 만들기 (선택)
node scripts/build_ebook_pdf.mjs ebook/drafts/book1.html
# 3. 잠그기
node scripts/lock_ebook.mjs ebook/drafts/book1.html "코드"
# → ebook/book1.html, ebook/book1.pdf.enc 생성. 이 둘만 커밋
```

- 코드를 바꾸려면 3번을 다시 실행
- 한 번 코드를 넣은 브라우저는 다시 묻지 않음
- 예시: `sample-locked.html` (코드 `1234`)
- 한계: 코드를 아는 사람이 남에게 알려주는 건 못 막습니다. 사람별 계정·결제 확인이 필요하면 서버리스 함수 방식으로
