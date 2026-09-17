/* 뉴스레터 → 이메일 본문 만들기
   메일 프로그램은 외부 CSS를 읽지 못하므로, 표 구조 + 인라인 서식으로 다시 그립니다.
   발간본 페이지와 에피브리프가 함께 씁니다. */
(function (w) {
  const PALETTE = {
    outbreak: { brand: '#1b3fb0', accent: '#bf560c', soft: '#fdf1e3' },
    phsm:     { brand: '#0d6e6d', accent: '#bf560c', soft: '#fdf1e3' },
    chronic:  { brand: '#146c3a', accent: '#bf560c', soft: '#fdf1e3' },
    climate:  { brand: '#0d5c8c', accent: '#bf560c', soft: '#fdf1e3' },
    injury:   { brand: '#7b1e3c', accent: '#bf560c', soft: '#fdf1e3' }
  };
  const SECS = {
    outbreak: ['발생 상황', '상황 평가', '국내 관련성 · 권고'],
    phsm:     ['연구 · 정책 동향', '핵심 쟁점과 근거', '분과위 시사점 · 토론거리'],
    chronic:  ['주요 동향', '근거 해석', '국내 적용 시사점'],
    climate:  ['기후 · 건강 동향', '감시체계와 근거', '국내 대응 시사점'],
    injury:   ['손상 발생 동향', '감시자료 해석과 근거', '국내 예방·대응 시사점']
  };
  const esc = s => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const FONT = "'Noto Sans KR','Apple SD Gothic Neo','Malgun Gothic',sans-serif";

  function bullets(items, c) {
    return (items || []).map(x =>
      `<tr><td style="padding:0 0 8px 0;font:400 15px/1.75 ${FONT};color:#3d4753">
         <span style="color:${c.accent};font-weight:700">·</span> ${esc(x)}</td></tr>`).join('');
  }

  function section(title, items, c) {
    if (!items || !items.length) return '';
    return `<tr><td style="padding:14px 0 4px 0">
        <div style="font:700 12px/1.4 ${FONT};letter-spacing:.09em;color:${c.accent};
          border-bottom:1px solid ${c.soft};padding-bottom:5px;margin-bottom:9px">${esc(title)}</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${bullets(items, c)}</table>
      </td></tr>`;
  }

  function html(data) {
    const kind = data.kind || 'outbreak';
    const c = PALETTE[kind] || PALETTE.outbreak;
    const secs = SECS[kind] || SECS.outbreak;
    const m = data.meta || {}, d = data.draft || {};
    const dateTxt = (m.date || '').replace(/-/g, '.') + (m.date ? '.' : '');

    const stats = (d.stats || []).length ? `
      <tr><td style="padding:0 0 18px 0">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
          style="border-top:1px solid #dde2e9;border-bottom:1px solid #dde2e9"><tr>
          ${d.stats.slice(0, 4).map(s => `
            <td width="${Math.floor(100 / Math.min(4, d.stats.length))}%" valign="top" style="padding:12px 10px 13px 0">
              <div style="font:800 19px/1.2 ${FONT};color:${c.accent}">${esc(s.v)}</div>
              <div style="font:400 12px/1.45 ${FONT};color:#3d4753;padding-top:3px">${esc(s.l)}</div>
            </td>`).join('')}
        </tr></table>
      </td></tr>` : '';

    const issues = `
      <tr><td style="padding:0 0 22px 0">
        <div style="font:800 12px/1.4 ${FONT};letter-spacing:.11em;color:#6d7885;padding-bottom:8px">목차</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${(d.topics || []).map((t, i) => `
          <tr><td style="padding:9px 0;border-bottom:1px solid #eef1f5">
            <span style="font:800 14px/1.5 ${FONT};color:${c.accent}">${i + 1}</span>
            <span style="font:700 15px/1.5 ${FONT};color:${c.brand};padding-left:6px">${esc(t.name)}</span>
            ${t.tag ? `<span style="font:700 11px/1.4 ${FONT};color:#6d7885;border:1px solid #dde2e9;
              border-radius:3px;padding:1px 6px;margin-left:6px">${esc(t.tag)}</span>` : ''}
            ${t.headline ? `<div style="font:400 14px/1.6 ${FONT};color:#3d4753;padding-top:3px">${esc(t.headline)}</div>` : ''}
            ${(t.sources || []).length ? `<div style="font:700 12px/1.5 ${FONT};color:${c.accent};padding-top:3px">출처 ${esc(t.sources.join(' · '))}</div>` : ''}
          </td></tr>`).join('')}
        </table>
      </td></tr>`;

    const topics = (d.topics || []).map((t, i) => `
      <tr><td style="padding:22px 0 6px 0;border-top:1px solid #dde2e9">
        <div style="font:800 13px/1.4 ${FONT};color:${c.accent}">${i + 1}</div>
        <div style="font:800 20px/1.35 ${FONT};color:${c.brand};padding-top:2px">${esc(t.name)}
          ${t.en ? `<span style="font:400 12px/1.4 ${FONT};color:#6d7885">${esc(t.en)}</span>` : ''}</div>
        ${(t.sources || []).length ? `<div style="font:400 12px/1.5 ${FONT};color:#6d7885;padding-top:4px">출처 <b style="color:${c.accent}">${esc(t.sources.join(' · '))}</b></div>` : ''}
        ${t.headline ? `<div style="font:600 15px/1.6 ${FONT};color:#191f28;border-left:3px solid ${c.accent};
          padding:2px 0 2px 12px;margin-top:10px">${esc(t.headline)}</div>` : ''}
      </td></tr>
      ${section(secs[0], t.situation, c)}
      ${section(secs[1], t.assess, c)}
      ${section(secs[2], t.korea, c)}
      <tr><td style="padding:8px 0 20px 0">
        <div style="font:700 12px/1.5 ${FONT};color:#6d7885;padding-bottom:4px">출처</div>
        ${(t.refs || []).map((r, n) => {
          const cut = String(r || '').lastIndexOf(' — ');           // 제목 안의 ' — '를 피해 마지막 것으로 나눔
          const head = cut < 0 ? r : r.slice(0, cut);
          const link0 = cut < 0 ? '' : r.slice(cut + 3).trim();
          const link = /^https?:\/\//i.test(link0) ? link0 : '';
          return `<div style="font:400 12px/1.6 ${FONT};color:#6d7885;padding-bottom:3px">${n + 1}. ${esc(head)}
            ${link ? `<a href="${esc(link)}" target="_blank" rel="noopener" style="color:${c.accent}">원문</a>` : ''}</div>`;
        }).join('')}
      </td></tr>`).join('');

    const sub = data.subscribe || {};
    const qrAbs = data._qr_abs || '';
    const subscribe = sub.url ? `
      <tr><td style="padding:4px 0 24px 0">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
          style="background:${c.soft};border:1px solid #dde2e9;border-left:4px solid ${c.accent}">
          <tr>
            ${qrAbs ? `<td width="120" valign="top" style="padding:16px 0 16px 16px">
              <img src="${esc(qrAbs)}" width="104" height="104" alt="구독 QR"
                style="display:block;background:#fff;padding:5px;border:1px solid #dde2e9"></td>` : ''}
            <td valign="middle" style="padding:16px">
              <div style="font:800 15px/1.4 ${FONT};color:${c.brand}">${esc(sub.label || '뉴스레터 구독')}</div>
              <div style="font:400 13px/1.6 ${FONT};color:#3d4753;padding:4px 0 10px 0">${esc(sub.note || '')}</div>
              <a href="${esc(sub.url)}" style="display:inline-block;background:${c.brand};color:#fff;
                text-decoration:none;font:700 13px/1 ${FONT};padding:11px 18px;border-radius:6px">구독하고 지난 호 보기</a>
            </td>
          </tr>
        </table>
      </td></tr>` : '';

    return `<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(m.title || '뉴스레터')} ${esc(m.issue || '')}</title></head>
<body style="margin:0;padding:0;background:#eef1f5">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f5;padding:20px 0">
 <tr><td align="center">
  <table role="presentation" width="640" cellpadding="0" cellspacing="0"
    style="width:640px;max-width:100%;background:#ffffff;border:1px solid #dde2e9;border-top:6px solid ${c.brand}">
   <tr><td style="padding:30px 34px 26px 34px">
     <div style="font:700 12px/1.4 ${FONT};letter-spacing:.08em;color:${c.accent}">${esc(m.org || '')}</div>
     <div style="font:800 27px/1.25 ${FONT};color:${c.brand};padding:10px 0 8px 0">${esc(m.title || '')}</div>
     <div style="font:400 12px/1.5 ${FONT};color:#6d7885">${esc(m.issue || '')}${m.issue && dateTxt ? ' · ' : ''}${esc(dateTxt)}${m.editor ? ' · 작성 ' + esc(m.editor) : ''}</div>
     ${d.tagline ? `<div style="font:500 17px/1.6 ${FONT};color:#3d4753;padding-top:14px">${esc(d.tagline)}</div>` : ''}
   </td></tr>
   <tr><td style="padding:0 34px">
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
       ${stats}${issues}
       ${d.intro ? `<tr><td style="padding:0 0 20px 0;font:400 15px/1.8 ${FONT};color:#3d4753;
         border-left:3px solid ${c.soft};padding-left:14px;white-space:pre-line">${esc(d.intro)}</td></tr>` : ''}
       ${topics}
       ${subscribe}
     </table>
   </td></tr>
   <tr><td style="padding:16px 34px 26px 34px;border-top:1px solid #dde2e9">
     <div style="font:400 12px/1.6 ${FONT};color:#6d7885">
       ${m.asOf || m.period ? `자료 기준 ${m.asOf ? esc(m.asOf) : ''}${m.asOf && m.period ? ' · ' : ''}${m.period ? '수집 ' + esc(m.period) : ''}<br>` : ''}
       본 뉴스레터는 각 기관의 공개 자료와 학술 문헌을 정리한 것으로, 원문의 내용이 우선합니다.
       언론 보도로 표시된 항목은 1차 자료 확인 전 참고용입니다.<br>
       ${esc(m.org || '')}${m.editor ? ' · ' + esc(m.editor) : ''}${m.contact ? ' · 문의 ' + esc(m.contact) : ''}
       ${m.prevUrl && /^https?:\/\//i.test(m.prevUrl) ? ` · <a href="${esc(m.prevUrl)}" style="color:#6d7885">이전 호</a>` : ''}</div>
   </td></tr>
  </table>
 </td></tr>
</table>
</body></html>`;
  }

  function text(data) {
    const m = data.meta || {}, d = data.draft || {};
    const lines = [`${m.title || ''} ${m.issue || ''}`.trim(), m.org || '', ''];
    if (d.tagline) lines.push(d.tagline, '');
    (d.topics || []).forEach((t, i) => {
      lines.push(`${i + 1}. ${t.name}${t.tag ? ' [' + t.tag + ']' : ''}`);
      if (t.headline) lines.push('   ' + t.headline);
      (t.summary || []).forEach(s => lines.push('   - ' + s));
      lines.push('');
    });
    return lines.join('\n');
  }

  async function copy(data) {
    const h = html(data), t = text(data);
    try {
      await navigator.clipboard.write([new ClipboardItem({
        'text/html': new Blob([h], { type: 'text/html' }),
        'text/plain': new Blob([t], { type: 'text/plain' })
      })]);
      return '서식 그대로 복사했습니다. 메일 쓰기 창에 붙여넣으세요.';
    } catch (e) {
      await navigator.clipboard.writeText(t);
      return '글자만 복사했습니다(서식 복사는 이 브라우저에서 막혀 있습니다).';
    }
  }

  function download(data) {
    const m = data.meta || {};
    const name = ((m.title || '뉴스레터').replace(/\s+/g, '') + '_' + (m.issue || '').replace(/[^\w가-힣]+/g, '') + '_메일본문.html');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([html(data)], { type: 'text/html;charset=utf-8' }));
    a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  }

  function mailto(data) {
    const m = data.meta || {};
    const subject = `[${m.issue || ''}] ${m.title || ''}`.trim();
    const body = text(data).slice(0, 1500);
    return 'mailto:?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  }

  /* ── 기관 소식지(블록 구성) → 메일 본문 ─────────────────────
     메일 프로그램은 외부 CSS를 읽지 못하므로 표 + 인라인 서식으로 다시 그립니다. */
  const BRAND_X = { local: '#1f6f43', epi: '#1b3fb0', campus: '#4a3a99', hospital: '#0b5c7a', research: '#3f4b5b' };
  function docColors(doc) {
    return PALETTE[doc.kind] || { brand: BRAND_X[doc.kind] || '#1b3fb0', accent: '#bf560c', soft: '#fdf1e3' };
  }
  const _url = u => (/^https?:\/\//i.test(String(u || '').trim()) ? String(u).trim() : '');
  const _has = x => !!(x && String(x).trim());

  function docHtml(doc) {
    const c = docColors(doc), org = doc.org || {};
    const P = t => `<p style="margin:0 0 10px;font:400 15px/1.8 ${FONT};color:#3d4753">${esc(t).replace(/\n/g, '<br>')}</p>`;
    const H = t => `<div style="font:800 17px/1.5 ${FONT};color:${c.brand};margin:22px 0 8px;
      border-bottom:2px solid ${c.soft};padding-bottom:6px">${esc(t)}</div>`;
    const LI = arr => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${bullets(arr, c)}</table>`;
    const SRC = (n, u) => (_has(n) || _url(u))
      ? `<p style="margin:0 0 10px;font:400 13px/1.7 ${FONT};color:#6d7885">출처 · ${esc(n || '출처 미기재')}${
          _url(u) ? ` <a href="${esc(_url(u))}" style="color:${c.accent}">${esc(_url(u))}</a>` : ''}</p>` : '';

    const body = (doc.blocks || []).filter(b => !b.hidden).map(b => {
      let h = H(b.title || '');
      if (b.type === 'notice') { if (_has(b.body)) h += P(b.body); h += SRC(b.srcName, b.srcUrl); }
      else if (b.type === 'question') { if (_has(b.body))
        h += `<div style="border-left:4px solid ${c.brand};background:#f7f9fb;padding:12px 14px;margin:0 0 10px;
          font:400 15px/1.8 ${FONT};color:#191f28">${esc(b.body).replace(/\n/g, '<br>')}</div>`; }
      else if (b.type === 'list' || b.type === 'contact') { h += LI((b.items || []).filter(_has)); }
      else if (b.type === 'schedule') {
        const rows = (b.rows || []).filter(r => _has(r.what) || _has(r.when));
        if (!rows.length) return '';
        h += `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
          style="border-collapse:collapse;margin:0 0 10px">${rows.map(r => `<tr>
          <td style="border-bottom:1px solid #eef1f5;padding:9px 10px 9px 0;font:700 15px/1.6 ${FONT};color:#191f28">${esc(r.what)}</td>
          <td style="border-bottom:1px solid #eef1f5;padding:9px 10px 9px 0;font:400 14px/1.6 ${FONT};color:#3d4753;white-space:nowrap">${esc(r.when)}</td>
          <td style="border-bottom:1px solid #eef1f5;padding:9px 0;font:400 14px/1.6 ${FONT};color:#3d4753">${esc([r.where, r.note].filter(_has).join(' · '))}</td>
          </tr>`).join('')}</table>`;
      } else if (b.type === 'evidence') {
        h += (b.items || []).filter(s => _has(s.title)).map(s => {
          const meta = [['대상', s.who], ['설계', s.design], ['결과', s.result], ['한계', s.limit]]
            .filter(x => _has(x[1]))
            .map(x => `<tr><td style="padding:0 0 4px 0;font:400 14px/1.7 ${FONT};color:#3d4753">
              <b style="color:${c.accent}">${x[0]}</b> · ${esc(x[1])}</td></tr>`).join('');
          return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
            style="border:1px solid #dde2e9;border-radius:8px;margin:0 0 10px">
            <tr><td style="padding:13px 15px">
              <div style="font:800 15px/1.5 ${FONT};color:${c.brand};margin-bottom:5px">${esc(s.title)}</div>
              <div style="font:700 12px/1.6 ${FONT};color:#6d7885;margin-bottom:8px">${esc(s.srcType || '자료 유형 미지정')} · ${
                s.checked ? '원문 확인함' : '원문 미확인'}</div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${meta}</table>
              ${_url(s.url) ? `<div style="font:400 13px/1.7 ${FONT};margin-top:6px">원문 · <a href="${esc(_url(s.url))}"
                style="color:${c.accent}">${esc(_url(s.url))}</a></div>` : ''}
            </td></tr></table>`;
        }).join('');
      }
      return h;
    }).join('');

    const sub = doc.sub || {};
    const subBox = (sub.mode === 'external' && _url(sub.url))
      ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0 0;background:${c.soft};
          border-left:4px solid ${c.accent}"><tr><td style="padding:16px 18px">
          <div style="font:800 15px/1.5 ${FONT};color:${c.brand};margin-bottom:8px">${esc(sub.label || '이 소식지 받아보기')}</div>
          ${_has(sub.note) ? `<div style="font:400 13px/1.7 ${FONT};color:#3d4753;margin-bottom:10px">${esc(sub.note)}</div>` : ''}
          <a href="${esc(_url(sub.url))}" style="display:inline-block;background:${c.brand};color:#fff;text-decoration:none;
            font:800 14px/1.4 ${FONT};padding:12px 18px;border-radius:6px">구독 신청하러 가기</a>
          </td></tr></table>` : '';

    const dateTxt = /^\d{4}-\d{2}-\d{2}$/.test(doc.date || '') ? String(doc.date).replace(/-/g, '.') + '.' : (doc.date || '');
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;background:#eef1f5">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f5;padding:22px 10px">
<tr><td align="center">
<table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background:#fff;border-top:6px solid ${c.brand}">
<tr><td style="padding:28px 28px 34px">
  <div style="font:700 12px/1.5 ${FONT};letter-spacing:.08em;color:#6d7885;text-transform:uppercase">${esc(doc.kindName || '소식지')}</div>
  <div style="font:800 14px/1.6 ${FONT};color:${c.accent};margin-top:10px">${esc([org.name, org.dept].filter(_has).join(' · ') || '기관 이름 미입력')}</div>
  <h1 style="font:800 27px/1.35 ${FONT};color:#191f28;margin:4px 0 6px">${esc(doc.title || '')}</h1>
  <div style="font:400 13px/1.6 ${FONT};color:#6d7885">${esc([doc.issue, dateTxt].filter(_has).join(' · '))}</div>
  ${_has(doc.lead) ? `<p style="font:400 16px/1.75 ${FONT};color:#3d4753;margin:16px 0 0">${esc(doc.lead)}</p>` : ''}
  ${body}
  ${subBox}
  <div style="border-top:1px solid #dde2e9;margin-top:26px;padding-top:12px;font:400 12px/1.7 ${FONT};color:#6d7885">
    발행 · ${esc([org.name, org.dept, org.editor, org.contact].filter(_has).join(' / ') || '발행 정보 미입력')}
    ${_has(org.credit) ? '<br>' + esc(org.credit) : ''}
  </div>
</td></tr></table>
</td></tr></table>
</body></html>`;
  }

  /* 서식 + 글자를 함께 클립보드에 올립니다 */
  async function copyPair(h, t) {
    try {
      await navigator.clipboard.write([new ClipboardItem({
        'text/html': new Blob([h], { type: 'text/html' }),
        'text/plain': new Blob([t], { type: 'text/plain' })
      })]);
      return '서식 그대로 복사했습니다. 메일 쓰기 창에 붙여넣으세요.';
    } catch (e) {
      try { await navigator.clipboard.writeText(t); return '글자만 복사했습니다(서식 복사가 이 브라우저에서 막혀 있습니다).'; }
      catch (e2) { return ''; }
    }
  }

  w.NLEmail = { html, text, copy, download, mailto, PALETTE, SECS, docHtml, docColors, copyPair };
})(window);
