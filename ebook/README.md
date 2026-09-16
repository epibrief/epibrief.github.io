# 웹북 템플릿

`template.html` 하나가 책 전체입니다. 서버·라이브러리 없음.

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
