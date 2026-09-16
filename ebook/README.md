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
