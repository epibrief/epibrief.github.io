#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
감염병 뉴스레터용 소스 자동 수집 → data/feed.json

- data/sources.json 에 적힌 기관 RSS와 뉴스 검색어를 훑어
  '제목 + 출처 + 원문링크 + 날짜 + 짧은 발췌'만 저장합니다(원문 미저장, 저작권 안전).
- 키가 필요 없습니다. 실패한 소스는 건너뛰고 나머지는 그대로 저장합니다.

실행:  python3 scripts/build_outbreak_feed.py
"""
import os, re, json, html, socket, time, datetime
import urllib.request, urllib.parse
import xml.etree.ElementTree as ET

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC  = os.path.join(ROOT, "data", "sources.json")
OUT  = os.path.join(ROOT, "data", "feed.json")

KEEP_DAYS  = 45     # 이 기간 안의 글만 보관
PER_SOURCE = 25     # 소스 한 곳에서 최대 몇 건까지
UA = "Mozilla/5.0 (compatible; outbreak-newsletter/1.0; +https://github.com)"

def force_ipv4():
    if getattr(socket, "_v4", False): return
    orig = socket.getaddrinfo
    socket.getaddrinfo = lambda h, *a, **k: [r for r in orig(h, *a, **k) if r[0] == socket.AF_INET] or orig(h, *a, **k)
    socket._v4 = True

def fetch_xml(url, tries=3):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/rss+xml, application/xml, text/xml, */*"})
    for i in range(tries):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                raw = r.read()
            return ET.fromstring(raw)
        except Exception as e:
            if i < tries - 1:
                time.sleep(2 * (i + 1))
            else:
                print(f"  ! 실패: {url} ({e})")
    return None

def google_news_rss(query, lang="en"):
    if lang == "ko":
        tail = "&hl=ko&gl=KR&ceid=KR:ko"
    else:
        tail = "&hl=en-US&gl=US&ceid=US:en"
    return "https://news.google.com/rss/search?q=" + urllib.parse.quote(query) + "+when:30d" + tail

def fetch_json(url, tries=3):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    for i in range(tries):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.loads(r.read().decode("utf-8", "replace"))
        except Exception as e:
            if i < tries - 1:
                time.sleep(2 * (i + 1))
            else:
                print(f"  ! 실패: {url} ({e})")
    return None

def who_don(limit=PER_SOURCE):
    """WHO 발생 속보(Disease Outbreak News) 공식 자료 — WHO 웹사이트 API에서 그대로 가져온다."""
    url = ("https://www.who.int/api/news/diseaseoutbreaknews?sf_provider=dynamicProvider372"
           "&sf_culture=en&%24orderby=PublicationDateAndTime%20desc&%24top=" + str(limit) + "&%24format=json")
    data = fetch_json(url) or {}
    out = []
    for x in data.get("value", []):
        out.append({
            "title": (x.get("Title") or "").strip(),
            "link": "https://www.who.int/emergencies/disease-outbreak-news/item" + (x.get("ItemDefaultUrl") or ""),
            "date": (x.get("PublicationDateAndTime") or x.get("PublicationDate") or "")[:10],
            "excerpt": strip_tags(x.get("Summary") or x.get("Overview") or "", 420),
            "origin": "WHO Disease Outbreak News",
        })
    return [o for o in out if o["title"]]

def who_pub(terms, limit=PER_SOURCE):
    """WHO 발간물(who.int/publications) 공식 API — 제목에 terms('|'로 구분) 중 하나가 들어간 최신 발간물."""
    words = [t.strip().replace("'", "''") for t in terms.split("|") if t.strip()]
    flt = " or ".join("contains(Title,'%s')" % w for w in words)
    url = ("https://www.who.int/api/hubs/publications?sf_culture=en&%24orderby=PublicationDate%20desc"
           "&%24top=" + str(limit) + "&%24format=json&%24filter=" + urllib.parse.quote(flt))
    data = fetch_json(url) or {}
    out = []
    for x in data.get("value", []):
        out.append({
            "title": (x.get("Title") or "").strip(),
            "link": "https://www.who.int/publications/i/item/" + (x.get("UrlName") or ""),
            "date": (x.get("PublicationDate") or "")[:10],
            "excerpt": strip_tags(x.get("Summary") or x.get("MetaDescription") or x.get("Overview") or "", 420),
            "origin": "WHO 발간물",
        })
    return [o for o in out if o["title"] and o["link"].endswith("/") is False]

def europepmc(query, limit=PER_SOURCE):
    """검색식의 {RECENT} 는 최근 120일 기간으로 바뀐다."""
    today = datetime.date.today()
    query = query.replace("{RECENT}", "(FIRST_PDATE:[%s TO %s])"
                          % ((today - datetime.timedelta(days=120)).isoformat(), today.isoformat()))
    url = ("https://www.ebi.ac.uk/europepmc/webservices/rest/search?query="
           + urllib.parse.quote(query)
           + f"&format=json&pageSize={limit}&resultType=core&sort=P_PDATE_D%20desc")
    data = fetch_json(url)
    out = []
    for r in ((data or {}).get("resultList") or {}).get("result", []):
        doi = r.get("doi") or ""
        link = ("https://doi.org/" + doi) if doi else (
               "https://europepmc.org/article/%s/%s" % (r.get("source", "MED"), r.get("id", "")))
        journal = (r.get("journalInfo") or {}).get("journal", {}).get("title") or r.get("bookOrReportDetails", {}).get("publisher", "") or "preprint"
        out.append({
            "title": r.get("title", "").strip().rstrip("."),
            "link": link,
            "date": parse_date(r.get("firstPublicationDate") or r.get("pubYear", "")),
            "excerpt": strip_tags(r.get("abstractText", ""), 420),
            "origin": f"{journal} · {r.get('authorString','')[:60]}",
        })
    return out

def fetch_text(url, tries=3):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "text/html, */*"})
    for i in range(tries):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read().decode("utf-8", "replace")
        except Exception as e:
            if i < tries - 1:
                time.sleep(2 * (i + 1))
            else:
                print(f"  ! 실패: {url} ({e})")
    return ""

def page_items(url, item_re, title_fmt="{title}", limit=PER_SOURCE, link_fmt=""):
    """RSS가 없는 기관 웹페이지에서 글 목록을 뽑는다 (계간지·간행물 목록 등).
    item_re 는 이름 붙인 그룹 (?P<title>…) (?P<link>…) 을 가진 정규식. (?P<link2>…) 는 대체 링크, (?P<date>…) 는 있으면 쓴다.
    link_fmt 는 글 번호(?P<id>…)로 주소를 만드는 서식. limit 은 소스별 "limit" 값 — 간행물 목록처럼 옛 호가 한꺼번에 잡히는 페이지는 2~3으로 두는 것이 좋다.
    발행일을 못 읽으면 비워 두고, main()이 처음 발견한 날을 기억해 둔다."""
    raw = fetch_text(url)
    out, got_links = [], set()
    for m in re.finditer(item_re, raw, re.S):
        g = m.groupdict()
        title = strip_tags(g.get("title") or "", 300)
        link  = html.unescape(g.get("link") or g.get("link2") or "").strip()   # link2: 대체 링크(내려받기 등)
        if link_fmt: link = link_fmt.format(**{k: (v or "") for k, v in g.items()})   # 자바스크립트 링크뿐인 게시판: 글 번호로 주소를 만든다
        if not title or not link: continue
        if link in got_links: continue   # 같은 글이 머리기사 칸과 목록에 두 번 나오는 페이지가 있다
        got_links.add(link)
        dtxt = re.sub(r"(\d)(st|nd|rd|th)\b", r"\1", strip_tags(g.get("date") or "", 60))   # "10th September 2026" → "10 September 2026"
        out.append({"title": title_fmt.format(title=title), "link": urllib.parse.urljoin(url, link),
                    "date": parse_date(dtxt), "excerpt": strip_tags(g.get("excerpt") or "", 420),
                    "origin": ""})
        if len(out) >= limit: break
    return out

DATE_FORMATS = (
    "%a, %d %b %Y %H:%M:%S %z", "%a, %d %b %Y %H:%M:%S %Z",
    "%a, %d %b %Y %H:%M:%S GMT", "%a, %d %b %Y %H:%M %z",
    "%Y-%m-%dT%H:%M:%S%z", "%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%d",
    "%d %B %Y", "%B %d, %Y", "%Y.%m.%d", "%Y.%m.%d.", "%Y/%m/%d",
)

def parse_date(s):
    s = (s or "").strip()
    if not s: return ""
    for fmt in DATE_FORMATS:
        try:
            return datetime.datetime.strptime(s, fmt).strftime("%Y-%m-%d")
        except Exception:
            pass
    m = re.search(r"(\d{4})-(\d{2})-(\d{2})", s)
    return m.group(0) if m else ""

def strip_tags(s, limit=320):
    s = re.sub(r"<[^>]+>", " ", s or "")
    s = html.unescape(s)
    s = re.sub(r"\s+", " ", s).strip()
    return s[:limit]

def items_from(root):
    """RSS(item)와 Atom(entry)을 함께 읽는다."""
    if root is None: return []
    out = []
    for it in root.iter():
        tag = it.tag.split("}")[-1]
        if tag not in ("item", "entry"): continue
        def txt(name):
            for ch in it:
                if ch.tag.split("}")[-1] == name:
                    return (ch.text or "").strip()
            return ""
        link = txt("link")
        if not link:
            for ch in it:
                if ch.tag.split("}")[-1] == "link" and ch.get("href"):
                    link = ch.get("href"); break
        title = txt("title")
        desc  = txt("description") or txt("summary") or txt("content")
        date  = parse_date(txt("pubDate") or txt("published") or txt("updated") or txt("date"))
        src_el = None
        for ch in it:
            if ch.tag.split("}")[-1] == "source": src_el = ch
        origin = (src_el.text or "").strip() if src_el is not None and src_el.text else ""
        title = strip_tags(title, 300)
        if title and link:
            out.append({"title": title, "link": link, "date": date,
                        "excerpt": strip_tags(desc), "origin": origin})
    return out

def main():
    force_ipv4()
    groups = json.load(open(SRC, encoding="utf-8"))["groups"]
    today = datetime.date.today()
    cutoff = (today - datetime.timedelta(days=KEEP_DAYS)).strftime("%Y-%m-%d")

    first_seen = {}      # 발행일이 없는 글은 처음 발견한 날을 발행일로 삼고, 다음 실행에도 그 날을 유지한다
    try:
        for it in json.load(open(OUT, encoding="utf-8")).get("items", []):
            if it.get("dateGuessed") and it.get("link"): first_seen[it["link"]] = it["date"]
    except Exception:
        pass

    items, seen_by_kind, status = [], {}, []
    for g in groups:
        # 같은 지침·논문이라도 분과(뉴스레터)가 다르면 각각 실어야 한다.
        # 전체에서 한 번만 걸러내면 먼저 도는 분과가 다 가져가고 나머지는 빈손이 된다.
        seen = seen_by_kind.setdefault(g.get("kind", "outbreak"), set())
        for s in g["sources"]:
            print(f"- {s['name']}")
            got, via = [], ""
            if s.get("who_api"):
                got, via = who_don(), "WHO 공식"
            if not got and s.get("who_pub"):
                got, via = who_pub(s["who_pub"]), "WHO 공식"
            if not got and s.get("epmc"):
                got, via = europepmc(s["epmc"]), "논문 검색"
            if not got and s.get("page"):
                got, via = page_items(s["page"], s["page_re"], s.get("title_fmt", "{title}"), int(s.get("limit", PER_SOURCE)), s.get("link_fmt", "")), "기관 페이지"
            if not got and s.get("rss"):
                got, via = items_from(fetch_xml(s["rss"])), "기관 RSS"
                got = [g2 for g2 in got if not g2["date"] or g2["date"] >= cutoff]   # 오래된 글만 남은 RSS는 빈 것으로 봄
            if not got and s.get("query"):          # RSS가 막히거나 비면 뉴스검색으로 대체
                got = items_from(fetch_xml(google_news_rss(s["query"], s.get("lang", "en"))))
                via = "뉴스검색"
                s = dict(s); s.pop("rss", None)      # 아래 제목 정리 규칙을 뉴스검색 기준으로
            got = got[:PER_SOURCE]
            keys = [k.lower() for k in s.get("filter", [])]
            if keys:   # 주제와 먼 글을 걸러낸다 (프리프린트처럼 분야가 넓은 소스용)
                got = [g2 for g2 in got
                       if any(k in (g2["title"] + " " + g2["excerpt"]).lower() for k in keys)]
            if not got and via != "뉴스검색" and s.get("query"):
                # 기관 페이지·RSS를 읽긴 했지만 거르고 나니 남은 글이 없으면 — 게시판 첫 쪽에 없었을 뿐이므로 뉴스검색으로 대체한다
                got = items_from(fetch_xml(google_news_rss(s["query"], s.get("lang", "en"))))[:PER_SOURCE]
                via = "뉴스검색"
                s = dict(s); s.pop("rss", None)
                if keys:
                    got = [g2 for g2 in got
                           if any(k in (g2["title"] + " " + g2["excerpt"]).lower() for k in keys)]
            musts = [k.lower() for k in s.get("must", [])]
            if musts and via == "뉴스검색":   # 기관 이름을 단 소스인데 검색 결과가 그 기관 글이 아니면 버린다
                got = [g2 for g2 in got
                       if any(k in (g2["title"] + " " + g2["excerpt"] + " " + g2["origin"]).lower() for k in musts)]
            kept = 0
            for it in got:
                title = re.sub(r"\s-\s[^-]+$", "", it["title"]).strip() if via == "뉴스검색" else it["title"]
                key = re.sub(r"\W+", "", title.lower())[:60]
                if not title or key in seen: continue
                if not it["date"]: it["date"] = first_seen.get(it["link"], "")
                if it["date"] and it["date"] < cutoff: continue
                seen.add(key)
                items.append({
                    "id": f"{s['id']}-{len(items)}",
                    "sourceId": s["id"],
                    "sourceName": s["name"],
                    "groupId": g["id"],
                    "kind": g.get("kind", "outbreak"),
                    "region": s.get("region", ""),
                    "lang": s.get("lang", "en"),
                    "title": title,
                    "origin": it["origin"],
                    "link": it["link"],
                    "date": it["date"] or today.strftime("%Y-%m-%d"),
                    "dateGuessed": not it["date"],          # 발행일을 못 읽어 수집일을 넣은 경우
                    "via": via,                              # WHO 공식 / 기관 RSS / 뉴스검색 / 논문 검색
                    "excerpt": it["excerpt"],
                })
                kept += 1
            status.append({"id": s["id"], "name": s["name"], "count": kept, "via": via})
            print(f"  → {kept}건 ({via})")

    items.sort(key=lambda x: x["date"], reverse=True)
    data = {
        "updated": datetime.datetime.now().strftime("%Y-%m-%d %H:%M"),
        "count": len(items),
        "status": status,
        "items": items,
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    if not items:
        print("수집 0건 — 기존 feed.json 을 유지합니다.")
        return
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    print(f"저장: {OUT} ({len(items)}건)")

    # 발간 예시 페이지가 '오늘 수집된 최신 자료'를 보여줄 때 쓰는 작은 파일 (분야별 최근 10건, 제목·출처·링크만)
    latest = {"updated": data["updated"], "byKind": {}}
    for it in items:
        bucket = latest["byKind"].setdefault(it["kind"], [])
        if len(bucket) >= 10: continue
        bucket.append({k: it[k] for k in ("title", "origin", "sourceName", "link", "date", "via")})
    latest_path = os.path.join(os.path.dirname(OUT), "latest.json")
    with open(latest_path, "w", encoding="utf-8") as f:
        json.dump(latest, f, ensure_ascii=False, indent=1)
    print(f"저장: {latest_path} (분야 {len(latest['byKind'])}개)")

if __name__ == "__main__":
    main()
