/* 에피브리프 — 예시 고르기 → 내용 바꾸기 → 확인하고 내보내기 */
(function () {
  'use strict';
  var R = window.EpiRender, T = window.EpiTemplates;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = R.esc, KEY = 'epibrief-works-v1';

  var S = { works: [], cur: null, open: null, feed: null, feedErr: false, undo: null, mobile: 'edit' };

  /* ── 저장 ───────────────────────────────── */
  function loadWorks() {
    try { var r = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(r) ? r : []; }
    catch (e) { return []; }
  }
  function setSave(ok, t) {
    var el = $('#saveState'); if (!el) return;
    if (ok) { el.className = 'dot'; el.textContent = '이 브라우저에 저장됨 · ' + (t || nowHM()); }
    else { el.className = 'dot err'; el.textContent = '저장하지 못했습니다 · 눌러서 작업본 내려받기'; }
  }
  function saveWorks() {
    try { localStorage.setItem(KEY, JSON.stringify(S.works)); setSave(true); return true; }
    catch (e) { setSave(false); return false; }
  }
  function nowHM() {
    var d = new Date(); return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  }
  function today() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function when(ts) {
    if (!ts) return '';
    var d = new Date(ts);
    return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }) + ' ' +
      d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  }
  var tmr = null;
  function touch(structure) {
    if (!S.cur) return;
    S.cur.updatedAt = Date.now();
    clearTimeout(tmr);
    tmr = setTimeout(function () { saveWorks(); }, 350);
    if (structure) renderBlocks();
    renderPreview();
  }

  /* ── 알림 ───────────────────────────────── */
  var toastT = null;
  function toast(msg, actLabel, act) {
    var box = $('#toast'), b = $('#toastAct');
    $('#toastMsg').textContent = msg;
    b.hidden = !actLabel;
    if (actLabel) { b.textContent = actLabel; b.onclick = function () { box.hidden = true; act(); }; }
    box.hidden = false;
    clearTimeout(toastT);
    toastT = setTimeout(function () { box.hidden = true; }, actLabel ? 9000 : 3200);
  }

  /* ── 문서 ───────────────────────────────── */
  function lastOrg() {
    for (var i = 0; i < S.works.length; i++) { if (S.works[i].org && S.works[i].org.name) return JSON.parse(JSON.stringify(S.works[i].org)); }
    return null;
  }
  function newDoc(tplId) {
    var t = T.byId(tplId); if (!t) return null;
    var d = t.make();
    d.v = 1; d.tplId = tplId;
    d.id = 'w' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    d.date = today();
    d.sub = { mode: 'none', url: '', label: '', note: '' };
    d.feedbackUrl = ''; d.publishedUrl = '';
    var o = lastOrg(); if (o) d.org = o;
    d.createdAt = Date.now(); d.updatedAt = Date.now();
    S.works.unshift(d); saveWorks();
    return d;
  }
  function cloneDoc(id) {
    var src = byId(id); if (!src) return null;
    var d = JSON.parse(JSON.stringify(src));
    d.id = 'w' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    d.date = today(); d.publishedUrl = '';
    d.createdAt = Date.now(); d.updatedAt = Date.now();
    (d.blocks || []).forEach(function (b) {
      b.id = T.uid();
      if (b.type === 'schedule') (b.rows || []).forEach(function (r) { r.todo = true; });
    });
    S.works.unshift(d); saveWorks();
    return d;
  }
  function byId(id) { for (var i = 0; i < S.works.length; i++) if (S.works[i].id === id) return S.works[i]; return null; }
  function blk(bid) { var bs = (S.cur && S.cur.blocks) || []; for (var i = 0; i < bs.length; i++) if (bs[i].id === bid) return bs[i]; return null; }
  function doneCount(d) {
    var bs = d.blocks || [], n = 0; bs.forEach(function (b) { if (!b.sample) n++; });
    return n + ' / ' + bs.length;
  }

  /* ── 라우팅 ─────────────────────────────── */
  function go(h) { location.hash = h; }
  function route() {
    var h = (location.hash || '').replace(/^#\/?/, '');
    var p = h.split('/').filter(Boolean);
    var name = p[0] || 'home', id = p[1];
    if (name === 'edit' || name === 'check' || name === 'done') {
      var d = byId(id);
      if (!d) { go('/works'); return; }
      S.cur = d;
    }
    show(name);
    if (name === 'home') renderHome();
    if (name === 'new') renderTpls();
    if (name === 'edit') openEditor();
    if (name === 'check') openCheck();
    if (name === 'works') renderWorks();
    if (name === 'issues') renderIssues();
    window.scrollTo(0, 0);
  }
  function show(name) {
    $$('.view').forEach(function (v) { v.hidden = v.id !== 'v-' + name; });
    $$('.mainnav a').forEach(function (a) {
      var on = a.getAttribute('data-route') === name ||
        (name === 'edit' || name === 'check' || name === 'done') && a.getAttribute('data-route') === 'new';
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }

  /* ── 홈 ─────────────────────────────────── */
  function renderHome() {
    var r = $('#homeResume'), w = S.works[0];
    if (w) {
      r.innerHTML = '<a class="resume" href="#/edit/' + esc(w.id) + '">' +
        '<div class="k">작성 중인 소식지 이어서 만들기</div>' +
        '<div class="t">' + esc(w.title || '제목 없음') + '</div>' +
        '<div class="m">마지막 저장 ' + esc(when(w.updatedAt)) + ' · 내가 채운 항목 ' + esc(doneCount(w)) + '</div></a>';
    } else r.innerHTML = '';
    var list = $('#homeWorks');
    if (!S.works.length) { list.innerHTML = '<p class="empty">첫 소식지를 만들어 보세요.</p>'; return; }
    list.innerHTML = '<div class="worklist">' + S.works.slice(0, 5).map(workCard).join('') + '</div>';
  }
  function workCard(w) {
    return '<div class="work" data-w="' + esc(w.id) + '">' +
      '<p class="t">' + esc(w.title || '제목 없음') + '</p>' +
      '<p class="m">' + esc(w.kindName || '') + ' · ' + esc(w.issue || '') +
      ' · 마지막 저장 ' + esc(when(w.updatedAt)) + ' · 내가 채운 항목 ' + esc(doneCount(w)) + '</p>' +
      '<div class="btnrow">' +
        '<a class="btn sm" href="#/edit/' + esc(w.id) + '">이어서 만들기</a>' +
        '<button class="btn sm" data-act="clone" data-w="' + esc(w.id) + '">지난 호로 새 호 만들기</button>' +
        '<button class="btn sm" data-act="export" data-w="' + esc(w.id) + '">파일로 내보내기</button>' +
        '<button class="btn sm warn" data-act="del" data-w="' + esc(w.id) + '">삭제</button>' +
      '</div></div>';
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act][data-w]'); if (!b) return;
    var id = b.getAttribute('data-w'), act = b.getAttribute('data-act');
    if (act === 'clone') {
      var d = cloneDoc(id);
      toast('새 작업본을 만들었습니다. 지난 호는 그대로 있습니다. 일정은 「다시 확인」으로 표시했습니다.');
      go('/edit/' + d.id);
    }
    if (act === 'export') exportWork(byId(id));
    if (act === 'del') {
      var i = S.works.map(function (x) { return x.id; }).indexOf(id);
      if (i < 0) return;
      var removed = S.works.splice(i, 1)[0];
      saveWorks(); renderHome(); renderWorks();
      toast('「' + (removed.title || '제목 없음') + '」을 지웠습니다.', '되돌리기', function () {
        S.works.splice(i, 0, removed); saveWorks(); renderHome(); renderWorks();
      });
    }
  });

  /* ── ① 예시 카드 ────────────────────────── */
  var tplsDone = false;
  function renderTpls() {
    if (tplsDone) return; tplsDone = true;
    var box = $('#tplList');
    box.innerHTML = T.list.map(function (t) {
      return '<article class="tpl">' +
        '<div class="shot" data-shot="' + esc(t.id) + '"><div class="scaler">' +
          R.paper(T.demoDoc(t), { marks: false }) + '</div></div>' +
        '<div class="info"><h3>' + esc(t.name) + '</h3>' +
          '<div class="who">' + esc(t.who) + ' · ' + esc(t.reader) + '</div>' +
          '<p class="desc">' + esc(t.desc) + '</p>' +
          '<div class="btnrow"><button class="btn sm" data-big="' + esc(t.id) + '">크게 보기</button>' +
          '<button class="btn pri sm" data-pick="' + esc(t.id) + '">이 예시로 만들기</button></div>' +
        '</div></article>';
    }).join('');
    $$('.tpl .shot').forEach(function (sh) {
      var sc = $('.scaler', sh), s = (sh.clientWidth) / 840;
      sc.style.transform = 'scale(' + s + ')';
    });
    box.addEventListener('click', function (e) {
      var p = e.target.closest('[data-pick]'), g = e.target.closest('[data-big]');
      if (p) { var d = newDoc(p.getAttribute('data-pick')); go('/edit/' + d.id); }
      if (g) bigView(g.getAttribute('data-big'));
    });
  }
  function bigView(id) {
    var t = T.byId(id), w = window.open('', '_blank');
    if (!w) { toast('팝업이 막혀 있습니다. 브라우저에서 팝업을 허용해 주세요.'); return; }
    fetch('paper.css').then(function (r) { return r.text(); }).then(function (css) {
      w.document.write(R.standalone(T.demoDoc(t), css));
      w.document.close();
    }).catch(function () { w.close(); toast('예시를 크게 열지 못했습니다.'); });
  }

  /* ── ② 편집 ─────────────────────────────── */
  function openEditor() {
    var d = S.cur;
    $('#editTplName').textContent = '· ' + (d.kindName || '');
    saveWorks();
    fillDoc(); renderBlocks(); renderPreview();
    setMobile(S.mobile);
  }
  function fillDoc() {
    var d = S.cur, o = d.org || (d.org = {});
    $('#oName').value = o.name || ''; $('#oDept').value = o.dept || '';
    $('#oEditor').value = o.editor || ''; $('#oContact').value = o.contact || '';
    $('#oCredit').value = o.credit || '';
    $('#dTitle').value = d.title || ''; $('#dIssue').value = d.issue || '';
    $('#dDate').value = /^\d{4}-\d{2}-\d{2}$/.test(d.date || '') ? d.date : '';
    $('#dLead').value = d.lead || '';
    var s = d.sub || (d.sub = { mode: 'none' });
    $('#subMode').value = s.mode || 'none'; $('#subUrl').value = s.url || '';
    $('#subLabel').value = s.label || ''; $('#subNote').value = s.note || '';
    $('#subExt').hidden = s.mode !== 'external';
    $('#fbUrl').value = d.feedbackUrl || '';
    $('#orgBox').open = !(o.name);
  }
  var FIELDS = [['#oName', 'org.name'], ['#oDept', 'org.dept'], ['#oEditor', 'org.editor'],
    ['#oContact', 'org.contact'], ['#oCredit', 'org.credit'],
    ['#dTitle', 'title'], ['#dIssue', 'issue'], ['#dDate', 'date'], ['#dLead', 'lead'],
    ['#subUrl', 'sub.url'], ['#subLabel', 'sub.label'], ['#subNote', 'sub.note'], ['#fbUrl', 'feedbackUrl']];
  FIELDS.forEach(function (f) {
    var el = $(f[0]); if (!el) return;
    el.addEventListener('input', function () {
      if (!S.cur) return;
      var p = f[1].split('.');
      if (p.length === 2) { S.cur[p[0]] = S.cur[p[0]] || {}; S.cur[p[0]][p[1]] = el.value; }
      else S.cur[p[0]] = el.value;
      touch();
    });
  });
  $('#subMode').addEventListener('change', function () {
    if (!S.cur) return;
    S.cur.sub.mode = this.value; $('#subExt').hidden = this.value !== 'external'; touch();
  });
  $('#oLogo').addEventListener('change', function () {
    var f = this.files && this.files[0]; if (!f || !S.cur) return;
    if (f.size > 200 * 1024) { toast('로고는 200KB 이하만 넣을 수 있습니다.'); this.value = ''; return; }
    if (!/^image\/(png|jpeg|webp)$/.test(f.type)) { toast('PNG·JPG·WEBP 이미지만 넣을 수 있습니다.'); this.value = ''; return; }
    var fr = new FileReader();
    fr.onload = function () { S.cur.org.logo = String(fr.result); touch(); toast('로고를 넣었습니다.'); };
    fr.readAsDataURL(f);
  });
  $('#oLogoClear').addEventListener('click', function () { if (S.cur) { S.cur.org.logo = ''; $('#oLogo').value = ''; touch(); } });

  /* 블록 목록 */
  var TYPE_NAME = { notice: '소식', list: '목록', schedule: '일정', contact: '문의', question: '질문', evidence: '근거' };
  function renderBlocks() {
    var d = S.cur, box = $('#blocks');
    box.innerHTML = (d.blocks || []).map(function (b, i) {
      var on = S.open === b.id;
      return '<section class="blk' + (on ? ' on' : '') + '" data-id="' + esc(b.id) + '">' +
        '<div class="bh"><span class="ty">' + esc(TYPE_NAME[b.type] || b.type) + '</span>' +
        '<span class="nm">' + esc(b.title || '제목 없음') + (b.sample ? ' <span class="tagline">예시</span>' : '') + '</span>' +
        '<button class="iconbtn" data-b="edit" aria-expanded="' + on + '">' + (on ? '접기' : '수정') + '</button>' +
        '<button class="iconbtn" data-b="up" ' + (i === 0 ? 'disabled' : '') + ' aria-label="위로">↑</button>' +
        '<button class="iconbtn" data-b="down" ' + (i === d.blocks.length - 1 ? 'disabled' : '') + ' aria-label="아래로">↓</button>' +
        '<button class="iconbtn" data-b="del" aria-label="삭제">삭제</button></div>' +
        (on ? '<div class="body">' + blockForm(b) + '</div>' : '') + '</section>';
    }).join('');
  }
  function ta(k, v, ph, h) {
    return '<textarea data-k="' + k + '"' + (h ? ' style="min-height:' + h + 'px"' : '') +
      ' placeholder="' + esc(ph || '') + '">' + esc(v || '') + '</textarea>';
  }
  function tx(k, v, ph, i) {
    return '<input type="text" data-k="' + k + '"' + (i === undefined ? '' : ' data-i="' + i + '"') +
      ' value="' + esc(v || '') + '" placeholder="' + esc(ph || '') + '">';
  }
  function blockForm(b) {
    var h = '<label class="f">제목</label>' + tx('title', b.title, '제목');
    if (b.type === 'notice') {
      h += '<label class="f">내용</label>' + ta('body', b.body, '주민·독자에게 전할 내용을 적어 주세요', 130);
      h += '<label class="f">출처 이름</label>' + tx('srcName', b.srcName, '예: 질병관리청');
      h += '<label class="f">원문 주소</label>' + tx('srcUrl', b.srcUrl, 'https://');
    } else if (b.type === 'question') {
      h += '<label class="f">이번 호에서 답할 질문</label>' + ta('body', b.body, '정책 질문을 한 문장으로', 100);
    } else if (b.type === 'list' || b.type === 'contact') {
      h += '<label class="f">항목</label>';
      h += (b.items || []).map(function (x, i) {
        return '<div class="subrow"><div class="rh"><span>' + (i + 1) + '번</span>' +
          '<button class="iconbtn" data-act="delItem" data-i="' + i + '">삭제</button></div>' +
          tx('item', x, '한 줄로 적어 주세요', i) + '</div>';
      }).join('');
      h += '<div class="btnrow"><button class="btn sm" data-act="addItem">항목 추가</button></div>';
    } else if (b.type === 'schedule') {
      h += '<p class="hint" style="margin-top:8px">확인하지 않은 일정은 「다시 확인」으로 표시됩니다. 날짜를 바꾸면 표시가 사라집니다.</p>';
      h += (b.rows || []).map(function (r, i) {
        return '<div class="subrow"><div class="rh"><span>' + (i + 1) + '번' +
          (r.todo ? ' <span class="tagline">다시 확인</span>' : '') + '</span>' +
          '<button class="iconbtn" data-act="delRow" data-i="' + i + '">삭제</button></div>' +
          '<label class="f">내용</label>' + tx('what', r.what, '예: 어르신 건강교실', i) +
          '<div class="rowline"><div><label class="f">때</label>' + tx('when', r.when, '예: 9월 22일 오후 2시', i) + '</div>' +
          '<div><label class="f">곳</label>' + tx('where', r.where, '예: 보건소 2층', i) + '</div></div>' +
          '<label class="f">안내</label>' + tx('note', r.note, '대상·신청 방법', i) + '</div>';
      }).join('');
      h += '<div class="btnrow"><button class="btn sm" data-act="addRow">일정 줄 추가</button></div>';
    } else if (b.type === 'evidence') {
      h += '<p class="hint" style="margin-top:8px">자료 유형과 원문 확인 상태를 각각 표시합니다. 연구설계 이름만으로 확실성 등급을 매기지 않습니다.</p>';
      h += (b.items || []).map(function (s, i) {
        var opts = R.SRC_TYPES.map(function (o) {
          return '<option value="' + esc(o) + '"' + (s.srcType === o ? ' selected' : '') + '>' + esc(o) + '</option>';
        }).join('');
        return '<div class="subrow"><div class="rh"><span>근거 ' + (i + 1) + '</span>' +
          '<button class="iconbtn" data-act="delEv" data-i="' + i + '">삭제</button></div>' +
          '<label class="f">제목</label>' + tx('title', s.title, '연구·자료 제목', i) +
          '<div class="rowline"><div><label class="f">자료 유형</label>' +
            '<select data-k="srcType" data-i="' + i + '">' + opts + '</select></div>' +
          '<div><label class="f">원문 확인</label><label style="display:flex;align-items:center;gap:8px;min-height:44px">' +
            '<input type="checkbox" data-k="checked" data-i="' + i + '"' + (s.checked ? ' checked' : '') +
            ' style="width:20px;height:20px;min-height:0"> 원문을 직접 확인했습니다</label></div></div>' +
          '<label class="f">대상</label>' + tx('who', s.who, '연구 대상', i) +
          '<label class="f">설계</label>' + tx('design', s.design, '관찰연구 · 무작위배정 · 모형 등', i) +
          '<label class="f">결과</label>' + tx('result', s.result, '분모와 기간을 함께 적습니다', i) +
          '<label class="f">한계</label>' + tx('limit', s.limit, '표본·기간·교란요인 등', i) +
          '<label class="f">원문 주소</label>' + tx('url', s.url, 'https://', i) + '</div>';
      }).join('');
      h += '<div class="btnrow"><button class="btn sm" data-act="addEv">근거 추가</button></div>';
    }
    return h;
  }
  /* 블록 조작 */
  $('#blocks').addEventListener('click', function (e) {
    var sec = e.target.closest('.blk'); if (!sec) return;
    var b = blk(sec.getAttribute('data-id')); if (!b) return;
    var d = S.cur, idx = d.blocks.indexOf(b);
    var act = e.target.closest('[data-b]') && e.target.closest('[data-b]').getAttribute('data-b');
    var sub = e.target.closest('[data-act]') && e.target.closest('[data-act]').getAttribute('data-act');
    if (act === 'edit') { S.open = (S.open === b.id) ? null : b.id; renderBlocks(); return; }
    if (act === 'up' && idx > 0) { d.blocks.splice(idx - 1, 0, d.blocks.splice(idx, 1)[0]); touch(true); return; }
    if (act === 'down' && idx < d.blocks.length - 1) { d.blocks.splice(idx + 1, 0, d.blocks.splice(idx, 1)[0]); touch(true); return; }
    if (act === 'del') {
      d.blocks.splice(idx, 1); if (S.open === b.id) S.open = null; touch(true);
      toast('「' + (b.title || '제목 없음') + '」을 지웠습니다.', '되돌리기', function () {
        d.blocks.splice(idx, 0, b); touch(true);
      });
      return;
    }
    if (!sub) return;
    var i = e.target.closest('[data-act]').getAttribute('data-i');
    if (sub === 'addItem') { b.items = b.items || []; b.items.push(''); }
    if (sub === 'delItem') b.items.splice(+i, 1);
    if (sub === 'addRow') { b.rows = b.rows || []; b.rows.push({ what: '', when: '', where: '', note: '' }); }
    if (sub === 'delRow') b.rows.splice(+i, 1);
    if (sub === 'addEv') { b.items = b.items || []; b.items.push({ title: '', who: '', design: '', result: '', limit: '', url: '', srcType: '학술논문', checked: false }); }
    if (sub === 'delEv') b.items.splice(+i, 1);
    b.sample = false; touch(true);
  });
  function onBlockInput(e) {
    var el = e.target, k = el.getAttribute('data-k'); if (!k) return;
    var sec = el.closest('.blk'); if (!sec) return;
    var b = blk(sec.getAttribute('data-id')); if (!b) return;
    var i = el.getAttribute('data-i');
    var val = el.type === 'checkbox' ? el.checked : el.value;
    if (i === null) b[k] = val;
    else if (k === 'item') b.items[+i] = val;
    else if (b.type === 'schedule') { b.rows[+i][k] = val; if (k === 'when') b.rows[+i].todo = false; }
    else b.items[+i][k] = val;
    b.sample = false;
    var nm = $('.nm', sec); if (nm) nm.textContent = b.title || '제목 없음';
    touch();
  }
  $('#blocks').addEventListener('input', onBlockInput);
  $('#blocks').addEventListener('change', onBlockInput);

  function openBlock(id) {
    S.open = id; renderBlocks();
    var el = $('.blk[data-id="' + id + '"]');
    if (el) { el.scrollIntoView({ block: 'center' }); var f = $('input,textarea', el); if (f) f.focus(); }
  }
  $('#addNotice').addEventListener('click', function () { addBlock({ type: 'notice', title: '새 소식', body: '', srcName: '', srcUrl: '', sample: false }); });
  $('#addSchedule').addEventListener('click', function () {
    addBlock({ type: 'schedule', title: '일정', rows: [{ what: '', when: '', where: '', note: '' }], sample: false });
  });
  function addBlock(b) {
    if (!S.cur) return;
    b.id = T.uid(); S.cur.blocks.push(b); S.open = b.id; touch(true);
    var el = $('.blk[data-id="' + b.id + '"]'); if (el) el.scrollIntoView({ block: 'center' });
  }

  /* 미리보기 */
  function renderPreview() {
    if (!S.cur) return;
    var sc = $('#paperScale'); if (!sc || $('#v-edit').hidden) { if ($('#v-check').hidden === false) renderCheckPreview(); return; }
    sc.innerHTML = R.paper(S.cur, { marks: true });
    fit($('#paperBox'), sc);
  }
  function fit(box, sc) {
    if (!box || !sc) return;
    /* 좁은 화면에서는 휴대폰 폭으로 그려야 글씨가 읽힙니다 */
    var narrow = window.matchMedia('(max-width:900px)').matches;
    var art = sc.querySelector('.paper');
    var wide = art && art.classList.contains('t-brief') ? 770 : 880;
    var target = (box.classList.contains('w-mobile') || (narrow && box.id === 'paperBox')) ? 390 : wide;
    sc.style.width = target + 'px';
    var avail = box.clientWidth - 28;
    var s = Math.min(1, avail / target);
    sc.style.transform = 'scale(' + s + ')';
    sc.style.marginLeft = Math.max(0, Math.round((avail - target * s) / 2)) + 'px';
    var h0 = sc.offsetHeight;
    sc.style.marginBottom = (-(h0 - h0 * s)) + 'px';
    var maxH = Math.max(320, Math.round(window.innerHeight * 0.74));
    box.style.height = Math.min(Math.ceil(h0 * s) + 4, maxH) + 'px';
    box.style.overflowY = 'auto';
    box.style.overflowX = 'hidden';   /* 축소한 종이는 레이아웃 폭이 그대로라 가로로 넘칩니다 */
  }
  window.addEventListener('resize', function () {
    if (!$('#v-edit').hidden) fit($('#paperBox'), $('#paperScale'));
    if (!$('#v-check').hidden) fit($('#checkBox'), $('#checkScale'));
    $$('.tpl .shot').forEach(function (sh) { $('.scaler', sh).style.transform = 'scale(' + (sh.clientWidth / 840) + ')'; });
  });
  /* 완성본을 누르면 해당 편집 항목으로 */
  function previewClick(e) {
    var a = e.target.closest('a'); if (a) e.preventDefault();
    var el = e.target.closest('[data-blk]'); if (!el) return;
    var id = el.getAttribute('data-blk');
    if (id === '_head') { $('#orgBox').open = true; $('#oName').focus(); $('#orgBox').scrollIntoView({ block: 'center' }); }
    else openBlock(id);
    if (window.matchMedia('(max-width:900px)').matches) setMobile('edit');
  }
  $('#paperScale').addEventListener('click', previewClick);

  /* 모바일 편집/미리보기 */
  function setMobile(m) {
    S.mobile = m;
    var sp = $('#editSplit');
    sp.classList.toggle('m-edit', m === 'edit');
    sp.classList.toggle('m-view', m === 'view');
    $('#mEdit').setAttribute('aria-pressed', m === 'edit');
    $('#mView').setAttribute('aria-pressed', m === 'view');
    if (m === 'view') setTimeout(function () { fit($('#paperBox'), $('#paperScale')); }, 20);
  }
  $('#mEdit').addEventListener('click', function () { setMobile('edit'); });
  $('#mView').addEventListener('click', function () { setMobile('view'); });
  $('#toCheck').addEventListener('click', function () { go('/check/' + S.cur.id); });
  $('#toCheck2').addEventListener('click', function () { go('/check/' + S.cur.id); });

  /* ── 공개 자료에서 가져오기 ─────────────── */
  var PREF = { local: ['chronic', 'climate', 'injury', 'outbreak'], phsm: ['phsm'], epi: ['outbreak', 'phsm'],
    campus: ['chronic', 'injury'], hospital: ['chronic', 'injury'], research: ['phsm', 'chronic', 'climate', 'injury', 'outbreak'] };
  $('#addFeed').addEventListener('click', function () {
    $('#feedModal').hidden = false; $('#feedQ').value = '';
    if (S.feed || S.feedErr) { drawFeed(); return; }
    $('#feedStat').textContent = '자료를 불러오는 중입니다…';
    fetch('data/feed.json').then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (j) { S.feed = (j && j.items) || []; drawFeed(); })
      .catch(function () { S.feedErr = true; drawFeed(); });
  });
  $('#feedClose').addEventListener('click', function () { $('#feedModal').hidden = true; });
  $('#feedModal').addEventListener('click', function (e) { if (e.target === this) this.hidden = true; });
  $('#feedQ').addEventListener('input', drawFeed);
  function drawFeed() {
    var stat = $('#feedStat'), list = $('#feedList');
    if (S.feedErr) {
      stat.innerHTML = '<span class="note" style="display:block">자료를 불러오지 못했습니다. 인터넷 연결을 확인하시거나, 아래 「직접 넣기」를 써 주세요. (자료가 0건인 것과는 다릅니다.)</span>';
      list.innerHTML = ''; return;
    }
    var q = ($('#feedQ').value || '').trim().toLowerCase();
    var pref = PREF[(S.cur && S.cur.kind) || 'local'] || [];
    var items = (S.feed || []).filter(function (it) {
      if (!q) return true;
      return ((it.title || '') + ' ' + (it.sourceName || '') + ' ' + (it.origin || '')).toLowerCase().indexOf(q) >= 0;
    });
    items.sort(function (a, b) {
      var pa = pref.indexOf(a.kind), pb = pref.indexOf(b.kind);
      pa = pa < 0 ? 9 : pa; pb = pb < 0 ? 9 : pb;
      if (pa !== pb) return pa - pb;
      return (b.date || '').localeCompare(a.date || '');
    });
    var top = items.slice(0, 24);
    stat.textContent = items.length
      ? '조건에 맞는 자료 ' + items.length + '건 가운데 ' + top.length + '건을 보여 드립니다. 전체 문헌을 빠짐없이 검토한 목록은 아닙니다.'
      : '조건에 맞는 자료가 0건입니다. 검색어를 바꾸거나 아래 「직접 넣기」를 써 주세요.';
    list.innerHTML = top.map(function (it, i) {
      var news = /뉴스/.test(it.via || '');
      var why = pref.indexOf(it.kind) >= 0 ? '이 예시에서 자주 쓰는 분야' : '검색어와 맞음';
      return '<div class="feeditem"><div class="t">' + esc(it.title || '') + '</div>' +
        '<div class="m">' + esc(it.origin || it.sourceName || '출처 미상') +
        ' · ' + esc(it.date || '날짜 미상') +
        ' <span class="via' + (news ? ' news' : '') + '">' + esc(it.via || '경로 미상') + '</span>' +
        (news ? ' <span class="via news">공식 발표 원문이 아닙니다</span>' : '') + '</div>' +
        '<div class="why">추천 이유 · ' + esc(why) + '</div>' +
        '<div class="btnrow" style="margin-top:8px"><button class="btn sm" data-feed="' + i + '">이 자료로 소식 만들기</button></div></div>';
    }).join('');
    list._top = top;
  }
  $('#feedList').addEventListener('click', function (e) {
    var b = e.target.closest('[data-feed]'); if (!b) return;
    var it = ($('#feedList')._top || [])[+b.getAttribute('data-feed')]; if (!it) return;
    addBlock({ type: 'notice', title: it.title || '가져온 자료', body: quoteOf(it.excerpt, it.title, it.origin),
      srcName: it.origin || it.sourceName || '', srcUrl: it.link || '', sample: false });
    $('#feedModal').hidden = true;
    toast('소식으로 담았습니다. 요약은 직접 써 주세요.');
  });
  $('#mAdd').addEventListener('click', function () {
    var t = $('#mTitle').value.trim();
    if (!t) { toast('제목을 넣어 주세요.'); return; }
    addBlock({ type: 'notice', title: t, body: '', srcName: $('#mSrc').value.trim(), srcUrl: $('#mUrl').value.trim(), sample: false });
    $('#mTitle').value = ''; $('#mSrc').value = ''; $('#mUrl').value = '';
    $('#feedModal').hidden = true; toast('소식으로 담았습니다.');
  });
  /* 발췌는 첫 문장만 따옴표로 — 본문 복사가 아님을 형식으로 드러냅니다 */
  function quoteOf(ex, title, origin) {
    var t = String(ex || '').replace(/\s+/g, ' ').trim();
    if (!t) return '';
    if (title && t.indexOf(String(title).trim()) === 0) t = t.slice(String(title).trim().length).replace(/^[\s\-—:·|]+/, '');
    if (!t || t.length < 12 || t === String(origin || '').trim()) return '';
    var m = t.match(/^.{20,}?(?:다\.|[.!?])(?=\s|$)/);
    var one = m ? m[0] : t;
    if (one.length > 120) one = one.slice(0, 118).replace(/\s+\S*$/, '') + '…';
    return '“' + one + '”\n\n(원문을 확인하고 우리 기관 독자에게 맞게 다시 써 주세요.)';
  }

  /* ── ③ 확인하고 내보내기 ────────────────── */
  function openCheck() {
    var d = S.cur;
    $('#pubUrl').value = d.publishedUrl || '';
    $('#exLink').disabled = !R.safeUrl(d.publishedUrl);
    var miss = R.missing(d);
    $('#missList').innerHTML = miss.length
      ? miss.map(function (m) {
          return '<div class="note" style="margin:6px 0">' + esc(m.what) +
            ' <button class="btn sm" data-jump="' + esc(m.blk) + '" style="margin-left:6px">고치러 가기</button></div>';
        }).join('')
      : '<div class="note ok">채워야 할 곳이 없습니다.</div>';
    renderCheckPreview();
  }
  function renderCheckPreview() {
    var sc = $('#checkScale'); if (!sc) return;
    sc.innerHTML = R.paper(S.cur, { marks: false });
    fit($('#checkBox'), sc);
  }
  $('#missList').addEventListener('click', function (e) {
    var b = e.target.closest('[data-jump]'); if (!b) return;
    var id = b.getAttribute('data-jump');
    S.open = (id === '_head') ? null : id;
    go('/edit/' + S.cur.id);
    setTimeout(function () {
      if (id === '_head') { $('#orgBox').open = true; $('#oName').focus(); }
      else { var el = $('.blk[data-id="' + id + '"]'); if (el) el.scrollIntoView({ block: 'center' }); }
    }, 60);
  });
  $('#backEdit').addEventListener('click', function () { go('/edit/' + S.cur.id); });
  $('#pubUrl').addEventListener('input', function () {
    S.cur.publishedUrl = this.value.trim();
    $('#exLink').disabled = !R.safeUrl(S.cur.publishedUrl);
    touch();
  });
  $$('#v-check [data-w]').forEach(function (b) {
    b.addEventListener('click', function () {
      $$('#v-check [data-w]').forEach(function (x) { x.setAttribute('aria-pressed', x === b); });
      $('#checkBox').classList.toggle('w-mobile', b.getAttribute('data-w') === 'mobile');
      fit($('#checkBox'), $('#checkScale'));
    });
  });
  function printDoc() {
    var area = $('#printArea');
    area.innerHTML = R.paper(S.cur, { marks: false });
    document.body.classList.add('printing');
    setTimeout(function () { window.print(); }, 60);
  }
  window.addEventListener('afterprint', function () { document.body.classList.remove('printing'); $('#printArea').innerHTML = ''; });
  $('#viewPrint').addEventListener('click', printDoc);
  $('#exPrint').addEventListener('click', function () {
    printDoc();
    toast('브라우저 인쇄 창에서 「PDF로 저장」을 고르시면 됩니다. 이 도구가 PDF 파일을 직접 만들지는 않습니다.');
  });
  $('#exMail').addEventListener('click', function () {
    var h = window.NLEmail.docHtml(S.cur), t = R.plainText(S.cur);
    window.NLEmail.copyPair(h, t).then(function (msg) {
      if (msg) { toast(msg); go('/done/' + S.cur.id); }
      else {
        var blob = new Blob([h], { type: 'text/html;charset=utf-8' });
        dl(blob, fname(S.cur, 'mail') + '.html');
        toast('복사가 막혀 있어 메일 본문 파일로 내려받았습니다.');
      }
    });
  });
  $('#exHtml').addEventListener('click', function () {
    fetch('paper.css').then(function (r) { return r.text(); }).then(function (css) {
      dl(new Blob([R.standalone(S.cur, css)], { type: 'text/html;charset=utf-8' }), fname(S.cur, '') + '.html');
      toast('「' + (S.cur.title || '소식지') + '」을 ' + fname(S.cur, '') + '.html 로 내려받았습니다. 인터넷 없이 열어도 서식이 유지됩니다.');
      go('/done/' + S.cur.id);
    }).catch(function () { toast('파일을 만들지 못했습니다. 새로고침 뒤 다시 시도해 주세요.'); });
  });
  $('#exLink').addEventListener('click', function () {
    var u = R.safeUrl(S.cur.publishedUrl); if (!u) return;
    navigator.clipboard.writeText(u).then(function () { toast('게시 링크를 복사했습니다.'); },
      function () { toast('복사하지 못했습니다. 주소를 직접 선택해 복사해 주세요.'); });
  });
  /* 일부 브라우저가 한글 파일이름을 통째로 버리고 확장자까지 잃어버리므로,
     파일이름은 영문·숫자로만 짓고 소식지 이름은 안내 문구로 알려 줍니다. */
  function fname(d, suffix) {
    var stem = 'epibrief-' + (d.tplId || 'news') + '-' + (d.date || today()) + '-' + String(d.id || '').slice(-4);
    return stem.replace(/[^A-Za-z0-9._-]/g, '') + (suffix ? '-' + suffix : '');
  }
  function dl(blob, name) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  function exportWork(d) {
    if (!d) return;
    dl(new Blob([JSON.stringify(d, null, 1)], { type: 'application/json;charset=utf-8' }), fname(d, 'draft') + '.json');
    toast('작업본을 ' + fname(d, 'draft') + '.json 으로 내려받았습니다. 다른 담당자에게 그대로 넘기시면 됩니다.');
  }
  $('#expJson').addEventListener('click', function () { exportWork(S.cur); });
  $('#expJson2').addEventListener('click', function () { exportWork(S.cur); });
  $('#saveState').addEventListener('click', function () { if (this.className.indexOf('err') >= 0) exportWork(S.cur); });
  function importWork() { $('#fileIn').value = ''; $('#fileIn').click(); }
  $('#impJson').addEventListener('click', importWork);
  $('#worksImport').addEventListener('click', importWork);
  $('#fileIn').addEventListener('change', function () {
    var f = this.files && this.files[0]; if (!f) return;
    var fr = new FileReader();
    fr.onload = function () {
      try {
        var d = JSON.parse(String(fr.result));
        if (!d || !d.blocks) throw new Error('형식');
        d.id = 'w' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        d.updatedAt = Date.now();
        S.works.unshift(d); saveWorks();
        toast('작업본을 불러왔습니다.');
        go('/edit/' + d.id);
      } catch (e) { toast('작업본 파일이 아닙니다.'); }
    };
    fr.readAsText(f);
  });

  /* ── 완료 ───────────────────────────────── */
  $('#doneNext').addEventListener('click', function () {
    var d = cloneDoc(S.cur.id);
    toast('지난 호를 그대로 옮겼습니다. 일정은 「다시 확인」으로 표시했습니다.');
    go('/edit/' + d.id);
  });
  $('#doneWorks').addEventListener('click', function () { go('/works'); });
  $('#doneBack').addEventListener('click', function () { go('/check/' + S.cur.id); });

  /* ── 발간물 ─────────────────────────────── */
  var issuesDone = false;
  function renderIssues() {
    if (issuesDone) return; issuesDone = true;
    var box = $('#issueList');
    box.innerHTML = '<p class="empty">발간물 목록을 불러오는 중입니다…</p>';
    fetch('issues/manifest.json').then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (j) {
        var rows = (j && j.issues) || [];
        if (!rows.length) { box.innerHTML = '<p class="empty">아직 발간물이 없습니다.</p>'; return; }
        box.innerHTML = rows.map(function (x) {
          return '<a class="issuecard" href="issues/' + esc(x.file) + '"><span class="bar"></span><span>' +
            '<span class="tagline">' + esc(x.kindName || '') + '</span>' +
            '<div class="t" style="font-weight:800;font-size:1.06rem;margin:6px 0 3px">' + esc(x.title || '') + '</div>' +
            '<div class="m" style="font-size:.86rem;color:var(--muted)">' + esc(x.issue || '') + ' · ' + esc(x.date || '') +
            (x.org ? ' · ' + esc(x.org) : '') + '</div></span></a>';
        }).join('');
      })
      .catch(function () { box.innerHTML = '<div class="note">발간물 목록을 불러오지 못했습니다.</div>'; });
  }

  /* ── 내 작업 ────────────────────────────── */
  function renderWorks() {
    var box = $('#workList');
    box.innerHTML = S.works.length ? S.works.map(workCard).join('')
      : '<p class="empty">첫 소식지를 만들어 보세요.</p>';
  }
  $('#switchTpl').addEventListener('click', function () {
    toast('지금 작업본은 「내 작업」에 그대로 남습니다.');
    go('/new');
  });
  $('#worksNew').addEventListener('click', function () { go('/new'); });
  $('#goPick').addEventListener('click', function () { go('/new'); });
  $('#goWorks').addEventListener('click', function () { go('/works'); });

  /* ── 시작 ───────────────────────────────── */
  S.works = loadWorks();
  window.addEventListener('hashchange', route);
  if (!location.hash) location.replace('#/home');
  route();
  window.EpiApp = S;
})();
