/* 소식지 렌더러 — 예시 카드, 편집 미리보기, 내보내기가 모두 이 한 벌을 씁니다.
   붙여넣은 글은 항상 글자로만 다룹니다(HTML을 실행하지 않습니다). */
(function (w) {
  'use strict';

  var esc = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };
  /* http/https 만 링크로 인정합니다 */
  function safeUrl(u) {
    var t = String(u || '').trim();
    return /^https?:\/\//i.test(t) ? t : '';
  }
  function ymd(d) {
    var t = String(d || '').trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t.replace(/-/g, '.') + '.' : t;
  }
  function has(x) { return !!(x && String(x).trim()); }
  function lines(arr) { return (arr || []).filter(has); }

  var SRC_TYPES = ['기관 발표', '학술논문', '프리프린트', '언론보도'];

  function sampleMark(b, o) {
    return (o.marks && b.sample) ? '<span class="samplemark">예시 내용</span>' : '';
  }

  /* ── 블록별 본문 ───────────────────────────────── */
  function blockBody(b, o) {
    var h = '';
    if (b.type === 'notice') {
      if (has(b.body)) h += '<div class="blk-body">' + esc(b.body) + '</div>';
      var u = safeUrl(b.srcUrl);
      if (has(b.srcName) || u) {
        h += '<div class="blk-src">출처 · <b>' + esc(b.srcName || '출처 미기재') + '</b>' +
          (u ? ' <a href="' + esc(u) + '" target="_blank" rel="noopener">' + esc(u) + '</a>' : '') + '</div>';
      }
    } else if (b.type === 'list') {
      var it = lines(b.items);
      if (it.length) h += '<div class="sec"><ul>' + it.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>';
    } else if (b.type === 'contact') {
      var ct = lines(b.items);
      if (ct.length) h += '<div class="sec"><ul>' + ct.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>';
    } else if (b.type === 'schedule') {
      var rows = (b.rows || []).filter(function (r) { return has(r.what) || has(r.when); });
      if (rows.length) {
        h += '<table class="sched"><thead><tr><th>내용</th><th>때</th><th>곳</th><th>안내</th></tr></thead><tbody>' +
          rows.map(function (r) {
            var mark = (o.marks && r.todo) ? '<span class="todo">다시 확인</span>' : '';
            return '<tr><td>' + esc(r.what) + mark + '</td><td class="when">' + esc(r.when) +
              '</td><td>' + esc(r.where) + '</td><td>' + esc(r.note) + '</td></tr>';
          }).join('') + '</tbody></table>';
      }
    } else if (b.type === 'question') {
      if (has(b.body)) h += '<div class="qbox">' + esc(b.body) + '</div>';
    } else if (b.type === 'evidence') {
      h += (b.items || []).filter(function (s) { return has(s.title); }).map(function (s) {
        var u = safeUrl(s.url);
        var chips = '<div class="chips">' +
          '<span class="chip chip-type">' + esc(s.srcType || '자료 유형 미지정') + '</span>' +
          '<span class="chip ' + (s.checked ? 'chip-ok' : 'chip-no') + '">' +
          (s.checked ? '원문 확인함' : '원문 미확인') + '</span></div>';
        var dl = '';
        if (has(s.who)) dl += '<dt>대상</dt><dd>' + esc(s.who) + '</dd>';
        if (has(s.design)) dl += '<dt>설계</dt><dd>' + esc(s.design) + '</dd>';
        if (has(s.result)) dl += '<dt>결과</dt><dd>' + esc(s.result) + '</dd>';
        if (has(s.limit)) dl += '<dt>한계</dt><dd>' + esc(s.limit) + '</dd>';
        return '<div class="evid"><h5>' + esc(s.title) + '</h5>' + chips +
          (dl ? '<dl>' + dl + '</dl>' : '') +
          (u ? '<div class="link">원문 · <a href="' + esc(u) + '" target="_blank" rel="noopener">' + esc(u) + '</a></div>'
             : '<div class="link">원문 · <span class="todo">주소 입력</span></div>') + '</div>';
      }).join('');
    }
    return h;
  }

  /* ── 구독 안내 ─────────────────────────────────── */
  function subscribeBox(doc) {
    var s = doc.sub || {};
    var u = safeUrl(s.url);
    if (s.mode === 'external' && u) {
      return '<aside class="subscribe"><div class="sub-text">' +
        '<div class="sub-title">' + esc(s.label || '이 소식지 받아보기') + '</div>' +
        (has(s.note) ? '<div class="sub-note">' + esc(s.note) + '</div>' : '') +
        '<a class="sub-btn" href="' + esc(u) + '" target="_blank" rel="noopener">구독 신청하러 가기</a>' +
        '</div></aside>';
    }
    if (s.mode === 'soon') {
      return '<aside class="subscribe"><div class="sub-text">' +
        '<div class="sub-title">구독 준비 중</div>' +
        '<div class="sub-note">구독 접수 경로가 아직 없습니다. 준비되면 이 자리에 신청 링크가 표시됩니다.</div>' +
        '</div></aside>';
    }
    return '';
  }

  /* ── 소식지 한 장 ──────────────────────────────── */
  function paper(doc, opts) {
    var o = opts || {};
    if (o.marks === undefined) o.marks = true;
    var blocks = (doc.blocks || []).filter(function (b) { return !b.hidden; });
    var org = doc.org || {};
    var head =
      '<header class="nl-head" data-blk="_head">' +
        '<div class="nl-topline"><span>' + esc(doc.kindName || '소식지') + '</span>' +
          '<span class="issue">' + esc(doc.issue || '') +
          (has(doc.issue) && has(doc.date) ? ' · ' : '') + esc(ymd(doc.date)) + '</span></div>' +
        (safeUrl(org.logo) || /^data:image\//.test(org.logo || '')
          ? '<img class="nl-logo" src="' + esc(org.logo) + '" alt="' + esc(org.name || '') + ' 로고">' : '') +
        '<div class="nl-kicker">' + esc(org.name || '기관 이름을 입력해 주세요') +
          (has(org.dept) ? ' · ' + esc(org.dept) : '') + '</div>' +
        '<h1 class="nl-title">' + esc(doc.title || '소식지 이름을 입력해 주세요') + '</h1>' +
        (has(doc.titleEn) ? '<div class="nl-title-en">' + esc(doc.titleEn) + '</div>' : '') +
        (has(doc.lead) ? '<p class="nl-lead">' + esc(doc.lead) + '</p>' : '') +
      '</header>';

    var toc = blocks.filter(function (b) { return has(b.title); });
    var brief = toc.length < 2 ? '' :
      '<div class="brief"><div class="brief-label">이번 호에는</div><ol class="issues">' +
      toc.map(function (b, i) {
        return '<li><a href="#b-' + esc(b.id) + '"><span class="no">' + (i + 1) + '</span>' +
          '<span class="it">' + esc(b.title) + '</span></a></li>';
      }).join('') + '</ol></div>';

    var body = blocks.map(function (b, i) {
      var inner = blockBody(b, o);
      if (!has(b.title) && !inner) return '';
      return '<section class="topic" id="b-' + esc(b.id) + '" data-blk="' + esc(b.id) + '">' +
        '<div class="topic-head"><span class="topic-no">' + (i + 1) + '</span>' +
        '<h2>' + esc(b.title || '제목 없음') + sampleMark(b, o) + '</h2></div>' + inner + '</section>';
    }).join('');

    var foot = '<div class="foot-note">' +
      '<div class="cover">' +
        '<b>발행</b> ' + esc(org.name || '기관 이름 미입력') + (has(org.dept) ? ' ' + esc(org.dept) : '') +
        (has(org.editor) ? ' <b>담당</b> ' + esc(org.editor) : '') +
        (has(org.contact) ? ' <b>문의</b> ' + esc(org.contact) : '') +
      '</div>' +
      (has(org.credit) ? '<div class="credit">' + esc(org.credit) + '</div>' : '') +
      (safeUrl(doc.feedbackUrl)
        ? '<div class="credit">도움이 되었나요? <a href="' + esc(safeUrl(doc.feedbackUrl)) + '" target="_blank" rel="noopener">의견 보내기</a></div>' : '') +
      (doc.demo ? '<div class="credit">EpiBrief 제공 · 예시 뉴스레터입니다. 기관명·일정·연락처는 실제 자료가 아닙니다.</div>' : '') +
      '</div>';

    var cls = 'paper t-' + esc(doc.tpl || 'brief') + ' k-' + esc(doc.kind || 'local');
    return '<article class="' + cls + '"' + (o.id ? ' id="' + esc(o.id) + '"' : '') + '>' +
      head + brief + body + subscribeBox(doc) + foot + '</article>';
  }

  /* ── 채워야 할 곳 ──────────────────────────────── */
  function missing(doc) {
    var out = [], org = doc.org || {};
    if (!has(org.name)) out.push({ blk: '_head', what: '기관 이름이 비어 있습니다.' });
    if (!has(doc.title)) out.push({ blk: '_head', what: '소식지 이름이 비어 있습니다.' });
    (doc.blocks || []).forEach(function (b) {
      if (b.sample) out.push({ blk: b.id, what: '「' + (b.title || '제목 없음') + '」이 아직 예시 내용입니다.' });
      if (b.type === 'schedule') {
        (b.rows || []).forEach(function (r) {
          if (r.todo) out.push({ blk: b.id, what: '일정 「' + (r.what || '이름 없음') + '」의 날짜·장소를 다시 확인해 주세요.' });
        });
      }
      if (b.type === 'evidence') {
        (b.items || []).forEach(function (s) {
          if (has(s.title) && !safeUrl(s.url)) out.push({ blk: b.id, what: '근거 「' + s.title + '」에 원문 주소가 없습니다.' });
          if (has(s.title) && !s.checked) out.push({ blk: b.id, what: '근거 「' + s.title + '」은 원문 미확인 상태입니다.' });
        });
      }
    });
    return out;
  }

  /* ── 글자만 뽑기(메일 일반 텍스트용) ───────────── */
  function plainText(doc) {
    var org = doc.org || {}, L = [];
    L.push(doc.title || '');
    L.push([org.name, org.dept].filter(has).join(' ') + '  ' + [doc.issue, ymd(doc.date)].filter(has).join(' · '));
    if (has(doc.lead)) L.push('\n' + doc.lead);
    (doc.blocks || []).forEach(function (b, i) {
      L.push('\n' + (i + 1) + '. ' + (b.title || ''));
      if (b.type === 'notice') {
        if (has(b.body)) L.push(b.body);
        if (has(b.srcName) || safeUrl(b.srcUrl)) L.push('출처 · ' + (b.srcName || '') + ' ' + (safeUrl(b.srcUrl) || ''));
      } else if (b.type === 'question') { if (has(b.body)) L.push(b.body); }
      else if (b.type === 'list' || b.type === 'contact') {
        lines(b.items).forEach(function (x) { L.push('· ' + x); });
      } else if (b.type === 'schedule') {
        (b.rows || []).forEach(function (r) {
          if (!has(r.what) && !has(r.when)) return;
          L.push('· ' + [r.what, r.when, r.where, r.note].filter(has).join(' / '));
        });
      } else if (b.type === 'evidence') {
        (b.items || []).forEach(function (s) {
          if (!has(s.title)) return;
          L.push('· ' + s.title + ' [' + (s.srcType || '유형 미지정') + ' / ' + (s.checked ? '원문 확인함' : '원문 미확인') + ']');
          ['who:대상', 'design:설계', 'result:결과', 'limit:한계'].forEach(function (p) {
            var k = p.split(':')[0], lab = p.split(':')[1];
            if (has(s[k])) L.push('   ' + lab + ' · ' + s[k]);
          });
          if (safeUrl(s.url)) L.push('   원문 · ' + safeUrl(s.url));
        });
      }
    });
    var s = doc.sub || {};
    if (s.mode === 'external' && safeUrl(s.url)) L.push('\n' + (s.label || '이 소식지 받아보기') + ' · ' + safeUrl(s.url));
    L.push('\n발행 · ' + [org.name, org.dept, org.editor, org.contact].filter(has).join(' / '));
    return L.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  /* ── 네트워크 없이 열리는 단일 HTML ────────────── */
  function standalone(doc, cssText) {
    var body = paper(doc, { marks: false });
    return '<!DOCTYPE html>\n<html lang="ko"><head><meta charset="UTF-8">\n' +
      '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
      '<title>' + esc(doc.title || '소식지') + (has(doc.issue) ? ' — ' + esc(doc.issue) : '') + '</title>\n' +
      '<style>\n' +
      '/* 글꼴은 기기에 있는 것만 씁니다(인터넷 없이 열어도 서식이 유지됩니다) */\n' +
      ':root{--sans:"Pretendard","Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",system-ui,sans-serif;' +
      '--serif:"Nanum Myeongjo","Apple SD Gothic Neo","Batang",serif;}\n' +
      'body{margin:0;background:#eef1f5;padding:26px 14px 60px;}\n' +
      '@media (max-width:640px){body{padding:0;}}\n' +
      cssText + '\n</style>\n</head>\n<body>\n' + body + '\n</body></html>\n';
  }

  w.EpiRender = {
    esc: esc, safeUrl: safeUrl, ymd: ymd,
    paper: paper, missing: missing, plainText: plainText, standalone: standalone,
    SRC_TYPES: SRC_TYPES
  };
})(window);
