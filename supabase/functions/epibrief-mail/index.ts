// 발행 권한 신청 메일. 신청이 들어오면 신청자에게 접수 확인을, 관리자에게 알림을 보낸다.
// 승인·거절을 누르면 신청자에게 결과를 보낸다.
//
// 메일은 곁다리다. 메일 설정이 없거나 메일 서버가 말썽이어도 신청 자체는 반드시 접수된다.
// 신청 넣기는 기존 함수(epibrief_apply)를 그대로 부르므로 시간당 횟수 제한도 그대로 걸린다.
//
// 필요한 환경변수 (수파베이스 → Edge Functions → Secrets)
//   MAIL_API_KEY   메일 보내는 곳의 열쇠. re_… 면 Resend, xkeysib-… 면 Brevo 로 알아서 붙는다
//   MAIL_FROM      보내는 주소.  예: 에피브리프 <noreply@epibrief.kr>  (Brevo 는 인증한 주소여야 한다)
//   ADMIN_EMAIL    새 신청 알림을 받을 주소
//   ADMIN_KEY      관리 화면과 같은 열쇠. 결과 통보 메일을 보낼 때 확인한다
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SITE = "https://epibrief.github.io";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

const esc = (t: string) =>
  String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

/* ── 보내는 주소 "이름 <메일>" 을 나눈다 ── */
function parseFrom(v: string) {
  const m = v.match(/^\s*(.*?)\s*<\s*([^>]+)\s*>\s*$/);
  return m ? { name: m[1] || "에피브리프", email: m[2] } : { name: "에피브리프", email: v.trim() };
}

/* ── 메일 한 통. Resend 와 Brevo 를 열쇠 모양으로 가려 쓴다 ── */
async function sendMail(to: string, subject: string, html: string, text: string) {
  const key = Deno.env.get("MAIL_API_KEY") ?? "";
  const from = parseFrom(Deno.env.get("MAIL_FROM") ?? "");
  if (!key || !from.email) return { sent: false, why: "NOT_CONFIGURED" };

  try {
    if (key.startsWith("xkeysib-")) {           // Brevo
      const r = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": key, "Content-Type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          sender: { name: from.name, email: from.email },
          to: [{ email: to }], subject, htmlContent: html, textContent: text,
        }),
      });
      if (!r.ok) return { sent: false, why: `BREVO_${r.status}: ${(await r.text()).slice(0, 200)}` };
    } else {                                    // Resend
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: `${from.name} <${from.email}>`, to: [to], subject, html, text }),
      });
      if (!r.ok) return { sent: false, why: `RESEND_${r.status}: ${(await r.text()).slice(0, 200)}` };
    }
    return { sent: true };
  } catch (e) {
    return { sent: false, why: String(e).slice(0, 200) };
  }
}

/* ── 메일 본문 틀. 글씨만 읽어도 뜻이 통하게 적는다 ── */
function wrap(title: string, body: string) {
  return `<!doctype html><html lang="ko"><meta charset="utf-8">
<div style="max-width:560px;margin:0 auto;padding:28px 20px;font:15px/1.75 -apple-system,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#1f2328">
  <div style="font-size:13px;color:#6b7280;letter-spacing:.02em">에피브리프 · EpiBrief</div>
  <h1 style="font-size:20px;margin:10px 0 18px;color:#1d4ed8">${esc(title)}</h1>
  ${body}
  <hr style="border:0;border-top:1px solid #e5e7eb;margin:26px 0 14px">
  <div style="font-size:12.5px;color:#6b7280">
    이 메일은 <a href="${SITE}/apply.html" style="color:#1d4ed8">발행 권한 신청</a> 접수 때문에 자동으로 보냈습니다.
    궁금한 것은 이 메일에 그대로 회신해 주세요.<br>
    개인이 만든 비공식 도구입니다. 어떤 기관의 공식 사이트도 아닙니다.
  </div>
</div></html>`;
}
const row = (k: string, v: string) =>
  `<tr><td style="padding:6px 14px 6px 0;color:#6b7280;white-space:nowrap;vertical-align:top">${esc(k)}</td>
       <td style="padding:6px 0">${esc(v || "—")}</td></tr>`;

/* ── 1. 신청자에게 보내는 접수 확인 ── */
function applyMail(a: Rec) {
  const title = "뉴스레터 발행 권한 신청을 받았습니다";
  const html = wrap(title, `
    <p><b>${esc(a.person)}</b> 님, 신청 잘 받았습니다.</p>
    <p>영업일 기준 <b>1~2일</b> 안에 이 주소로 결과를 알려 드리겠습니다.
       더 여쭐 것이 있으면 회신으로 묻겠습니다.</p>
    <table style="border-collapse:collapse;margin:18px 0;font-size:14.5px">
      ${row("기관명", a.org)}${row("부서", a.dept)}${row("담당자", a.person)}
      ${row("기관 코드", a.slug)}${row("용도", a.purpose ?? "")}
    </table>
    <p style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px 16px;margin:18px 0">
      <b>기다리시는 동안에도 그대로 쓰실 수 있습니다.</b><br>
      기능 제한은 없습니다. 화면에 ‘체험 중’ 띠가 붙고 검색에 노출되지 않을 뿐입니다.<br>
      <a href="${SITE}/local/?org=${encodeURIComponent(a.slug)}" style="color:#1d4ed8">만들던 소식지 열기 →</a>
    </p>
    <p style="font-size:14px;color:#4b5563">
      구독자 명단은 에피브리프가 보관하지 않습니다. 구독 신청은 기관 담당자 메일함으로 바로 갑니다.
    </p>`);
  const text =
`${a.person} 님, 뉴스레터 발행 권한 신청을 받았습니다.
영업일 기준 1~2일 안에 이 주소로 결과를 알려 드리겠습니다.

  기관명: ${a.org}
  부서: ${a.dept}
  담당자: ${a.person}
  기관 코드: ${a.slug}
  용도: ${a.purpose ?? "—"}

기다리시는 동안에도 그대로 쓰실 수 있습니다(기능 제한 없음, ‘체험 중’ 표시만 붙습니다).
${SITE}/local/?org=${a.slug}

— 에피브리프`;
  return { title, html, text };
}

/* ── 2. 관리자에게 보내는 새 신청 알림 ── */
function adminMail(a: Rec) {
  const title = `새 발행 권한 신청 — ${a.org}`;
  const html = wrap(title, `
    <table style="border-collapse:collapse;margin:4px 0 18px;font-size:14.5px">
      ${row("기관명", a.org)}${row("부서", a.dept)}${row("담당자", a.person)}
      ${row("이메일", a.email)}${row("기관 코드", a.slug)}${row("용도", a.purpose ?? "")}
    </table>
    <p><a href="${SITE}/admin/" style="background:#1d4ed8;color:#fff;text-decoration:none;
       padding:10px 18px;border-radius:8px;display:inline-block">관리 화면에서 처리하기 →</a></p>`);
  const text = `새 발행 권한 신청\n\n기관명: ${a.org}\n부서: ${a.dept}\n담당자: ${a.person}\n이메일: ${a.email}\n기관 코드: ${a.slug}\n용도: ${a.purpose ?? "—"}\n\n${SITE}/admin/`;
  return { title, html, text };
}

/* ── 3. 승인·거절 결과 통보 ── */
function decisionMail(a: Rec, approved: boolean, note: string) {
  const title = approved
    ? "발행 권한을 승인했습니다"
    : "발행 권한 신청 결과를 알려 드립니다";
  const html = approved
    ? wrap(title, `
        <p><b>${esc(a.person)}</b> 님, <b>${esc(a.org)}</b> 의 발행 권한을 승인했습니다.</p>
        <p>기관 코드 <code style="background:#f3f4f6;padding:2px 7px;border-radius:5px">${esc(a.slug)}</code> 로
           만드시는 소식지에서 ‘체험 중’ 띠가 사라집니다.</p>
        ${note ? `<p style="background:#f8fafc;border-left:3px solid #1d4ed8;padding:10px 14px">${esc(note)}</p>` : ""}
        <p><a href="${SITE}/local/?org=${encodeURIComponent(a.slug)}"
           style="background:#1d4ed8;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;display:inline-block">
           소식지 만들러 가기 →</a></p>
        <p style="font-size:14px;color:#4b5563">화면에 그대로 있던 소식지도 이어서 쓰실 수 있습니다.</p>`)
    : wrap(title, `
        <p><b>${esc(a.person)}</b> 님, 신청하신 기관 코드
           <code style="background:#f3f4f6;padding:2px 7px;border-radius:5px">${esc(a.slug)}</code> 는
           이번에 내어 드리지 못했습니다.</p>
        ${note ? `<p style="background:#fff7ed;border-left:3px solid #ea580c;padding:10px 14px">${esc(note)}</p>` : ""}
        <p>사정이 바뀌면 언제든 <a href="${SITE}/apply.html" style="color:#1d4ed8">다시 신청</a>하실 수 있습니다.
           그동안에도 체험 상태로는 그대로 쓰실 수 있습니다.</p>`);
  const text = approved
    ? `${a.person} 님, ${a.org} 의 발행 권한을 승인했습니다.\n기관 코드: ${a.slug}\n${note ? "\n" + note + "\n" : ""}\n${SITE}/local/?org=${a.slug}\n\n— 에피브리프`
    : `${a.person} 님, 신청하신 기관 코드(${a.slug})는 이번에 내어 드리지 못했습니다.\n${note ? "\n" + note + "\n" : ""}\n사정이 바뀌면 언제든 다시 신청하실 수 있습니다: ${SITE}/apply.html\n\n— 에피브리프`;
  return { title, html, text };
}

type Rec = { slug: string; org: string; dept: string; person: string; email: string; purpose?: string | null };

const str = (v: unknown, n: number) => String(v ?? "").trim().slice(0, n);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  let body: any;
  try { body = await req.json(); } catch { return json({ ok: false, error: "JSON 이 아닙니다" }, 400); }

  const SB  = Deno.env.get("SUPABASE_URL")!;
  const KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const rpc = (fn: string, params: unknown) =>
    fetch(`${SB}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

  /* ── 신청 접수 ── */
  if (body.kind === "apply") {
    const a: Rec = {
      slug: str(body.slug, 40).toLowerCase(), org: str(body.org, 120), dept: str(body.dept, 120),
      person: str(body.person, 60), email: str(body.email, 160).toLowerCase(),
      purpose: str(body.purpose, 400) || null,
    };
    // 신청 넣기는 기존 함수가 한다 — 형식 검사와 횟수 제한이 거기 들어 있다
    const r = await rpc("epibrief_apply", {
      p_slug: a.slug, p_org: a.org, p_dept: a.dept,
      p_person: a.person, p_email: a.email, p_purpose: a.purpose,
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return json({ ok: false, error: j.message || `HTTP_${r.status}` }, 400);
    if (!j.ok) return json(j, 200);          // SLUG_INVALID 같은 안내는 화면이 그대로 보여 준다

    const m1 = applyMail(a);
    const s1 = await sendMail(a.email, m1.title, m1.html, m1.text);
    const admin = Deno.env.get("ADMIN_EMAIL") ?? "";
    if (admin) { const m2 = adminMail(a); await sendMail(admin, m2.title, m2.html, m2.text); }
    if (!s1.sent) console.error("메일 실패:", s1.why);   // 까닭은 기록만 하고 밖으로 내보내지 않는다
    return json({ ok: true, slug: a.slug, mailed: s1.sent });
  }

  /* ── 결과 통보 (관리 화면에서 승인·거절 누른 뒤) ── */
  if (body.kind === "decision") {
    const want = Deno.env.get("ADMIN_KEY") ?? "";
    const got  = str(body.adminKey, 200);
    if (!want || got !== want) return json({ ok: false, error: "ADMIN_KEY" }, 403);
    const a: Rec = {
      slug: str(body.slug, 40), org: str(body.org, 120), dept: str(body.dept, 120),
      person: str(body.person, 60), email: str(body.email, 160), purpose: null,
    };
    if (!a.email) return json({ ok: false, error: "EMAIL_REQUIRED" }, 400);
    const m = decisionMail(a, body.decision === "approved", str(body.note, 600));
    const s = await sendMail(a.email, m.title, m.html, m.text);
    return json({ ok: true, mailed: s.sent, mailNote: s.why ?? null });
  }

  return json({ ok: false, error: "kind 는 apply 또는 decision 이어야 합니다" }, 400);
});
