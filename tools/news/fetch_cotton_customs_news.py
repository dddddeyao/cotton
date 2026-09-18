#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Strictly collect 2026+ cotton/customs news candidates.

Quality gate:
- published in 2026 or later
- contains at least one strong cotton keyword
- contains at least one customs/import/export/tariff keyword
- rejects obvious unrelated/ad/login pages
- never assigns a default image; missing images stay null
"""

from __future__ import annotations

import argparse
import html
import json
import re
import shutil
import ssl
import sys
import time
from dataclasses import asdict, dataclass
from html.parser import HTMLParser
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_OUTPUT_DIR = ROOT / "preview-checks" / "news-keyword-check"
MIN_YEAR = 2026
MAX_SUMMARY_CHARS = 420

COTTON_KEYWORDS = [
    "棉花",
    "进口棉",
    "原棉",
    "皮棉",
    "籽棉",
    "新疆棉",
    "疆棉",
    "郑棉",
    "美棉",
    "棉价",
    "棉市",
    "棉纱",
    "棉纺",
    "棉企",
    "棉农",
    "棉花检验",
    "纤维检验",
    "cotton",
    "raw cotton",
    "cotton yarn",
]

CUSTOMS_KEYWORDS = [
    "海关",
    "海关总署",
    "海关统计",
    "海关数据",
    "进出口",
    "进出口数据",
    "进口量",
    "出口量",
    "进口额",
    "出口额",
    "通关",
    "报关",
    "口岸",
    "查验",
    "检验检疫",
    "关税",
    "配额",
    "滑准税",
    "customs",
    "customs duty",
    "import duty",
    "export duty",
    "tariff",
    "quota",
]
REJECT_KEYWORDS = [
    "娱乐",
    "体育",
    "彩票",
    "游戏",
    "汽车",
    "房产",
    "招聘",
    "广告",
    "优惠券",
    "登录 用户登录",
    "请输入用户名和密码",
]

NON_DISPLAY_IMAGE_MARKERS = [
    "placeholder",
    "default",
    "news-default",
    "no-image",
    "noimage",
    "no_pic",
    "nopic",
    "notfound",
    "cotton-news-placeholder",
    "logo",
    "banner",
    "/ad.",
    "/ads/",
    "wanganlogo",
    "12377",
    "show_qrcode",
    "uk.gif",
    "201508201641002466553",
    "201508201625068547638",
    "5a681a7949560",
    "rawmex.cn",
    "images/2013",
    "upload/201508",
    "news_new/fzw",
    "source-cotton-logo",
    "cntac_logo",
    "cntac-logo",
    "cqn_logo",
    "cqn-logo",
    "site-logo",
    "website-logo",
    "web-logo",
    "/logo.",
    "/logo_",
    "/logo/",
    "/logos/",
    "/images_new/logo",
    "/topimgs/",
    "/topimg/",
    "/banner.",
    "/banner/",
    "/banners/",
    "banner.jpg",
    "banner.png",
    "banner.jpeg",
    "banner.webp",
]
SOURCES = [
    {
        "name": "中国棉花信息网-棉花进口",
        "url": "https://www.cottonchina.org.cn/news/newsser.php?relnews=%C3%DE%BB%A8%BD%F8%BF%DA",
        "url_pattern": r"news_showa?\.php",
        "language": "zh",
    },
    {
        "name": "中国棉花信息网-海关关键词",
        "url": "https://www.cottonchina.org.cn/news/newsser.php?relnews=%BA%A3%B9%D8",
        "url_pattern": r"news_showa?\.php",
        "language": "zh",
    },
    {
        "name": "中国棉花信息网-外棉中文报道",
        "url": "https://www.cottonchina.org.cn/foreign/index.php",
        "url_pattern": r"news_showa?\.php",
        "language": "zh",
    },
    {
        "name": "中国棉花信息网-纺织市场",
        "url": "https://www.cottonchina.org.cn/textile/index.php",
        "url_pattern": r"news_showa?\.php",
        "language": "zh",
    },
    {
        "name": "中国棉花信息网-棉市快讯",
        "url": "https://www.cottonchina.org.cn/news/newsser.php?relnews=%C3%DE%CA%D0%BF%EC%D1%B6%7C%C9%B4%C7%E9%CB%D9%B5%DD",
        "url_pattern": r"news_showa?\.php",
        "language": "zh",
    },
    {
        "name": "中国棉花信息网-CIF棉价",
        "url": "https://www.cottonchina.org.cn/news/newsser.php?relnews=CIF%7CCotlook",
        "url_pattern": r"news_showa?\.php",
        "language": "zh",
    },
    {
        "name": "中国棉花信息网-USDA中文报道",
        "url": "https://www.cottonchina.org.cn/news/newsser.php?relnews=USDA",
        "url_pattern": r"news_showa?\.php",
        "language": "zh",
    },
    {
        "name": "生意社-皮棉频道",
        "url": "https://cotton.100ppi.com/",
        "url_pattern": r"/news/detail-\d{8}-\d+\.html",
        "language": "zh",
    },
    {
        "name": "生意社-皮棉情报",
        "url": "https://www.100ppi.com/qb/?pid=89",
        "url_pattern": r"/news/detail-\d{8}-\d+\.html",
        "language": "zh",
    },
    {
        "name": "纺织网-统计数据",
        "url": "https://info.texnet.com.cn/list--19-.html",
        "url_pattern": r"detail-\d+\.html",
        "language": "zh",
    },
    {
        "name": "纺织网-进口关键词",
        "url": "https://info.texnet.com.cn/key-%E8%BF%9B%E5%8F%A3-1.html",
        "url_pattern": r"detail-\d+\.html",
        "language": "zh",
    },
    {
        "name": "纺织网-出口关键词",
        "url": "https://info.texnet.com.cn/key-%E5%87%BA%E5%8F%A3-1.html",
        "url_pattern": r"detail-\d+\.html",
        "language": "zh",
    },
    {
        "name": "中纺联-数据分析",
        "url": "https://www.cntac.org.cn/zixun/shuju/",
        "url_pattern": r"/zixun/(?:shuju|hangye|guoji)/\d{6}/t\d{8}_\d+\.html",
        "language": "zh",
    },
    {
        "name": "中纺联-行业发展",
        "url": "https://www.cntac.org.cn/zixun/hangye/",
        "url_pattern": r"/zixun/(?:shuju|hangye|guoji)/\d{6}/t\d{8}_\d+\.html",
        "language": "zh",
    },
    {
        "name": "中纺联-国际动态",
        "url": "https://www.cntac.org.cn/zixun/guoji/",
        "url_pattern": r"/zixun/(?:shuju|hangye|guoji)/\d{6}/t\d{8}_\d+\.html",
        "language": "zh",
    },
    {
        "name": "中国质量新闻网-检验检测",
        "url": "https://www.cqn.com.cn/zj/node_20190.htm",
        "url_pattern": r"/.*content_\d+\.htm",
        "language": "zh",
    },
    {
        "name": "中国质量新闻网-质量纤锋",
        "url": "https://www.cqn.com.cn/zt/node_25942.htm",
        "url_pattern": r"/.*content_\d+\.htm",
        "language": "zh",
    },
    {
        "name": "海关总署-新闻发布",
        "url": "https://www.customs.gov.cn/customs/302249/302266/index.html",
        "url_pattern": r"/customs/.*\.html",
        "language": "zh",
    },
    {
        "name": "Economic Times-India cotton customs duty",
        "url": "https://m.economictimes.com/news/economy",
        "url_pattern": r"cotton|customs-duty|imports|articleshow",
        "language": "en",
    },
    {
        "name": "Times of India-cotton imports",
        "url": "https://timesofindia.indiatimes.com/business/india-business",
        "url_pattern": r"cotton|imports|duty|articleshow",
        "language": "en",
    },
]

@dataclass
class LinkCandidate:
    source: str
    source_url: str
    title: str
    url: str
    language: str


@dataclass
class ReviewedNews:
    source: str
    title: str
    url: str
    publishedAt: str | None
    summary: str
    imageUrl: str | None
    cottonKeywords: list[str]
    customsKeywords: list[str]
    rejectKeywords: list[str]
    passed: bool
    reason: str


class PageParser(HTMLParser):
    def __init__(self, base_url: str) -> None:
        super().__init__(convert_charrefs=True)
        self.base_url = base_url
        self.links: list[tuple[str, str]] = []
        self.images: list[str] = []
        self.meta_images: list[str] = []
        self._href: str | None = None
        self._parts: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attrs_map = {name.lower(): value or "" for name, value in attrs}
        tag = tag.lower()
        if tag == "a" and attrs_map.get("href"):
            href = attrs_map["href"].strip()
            if href and not href.startswith(("javascript:", "#")):
                self._href = urljoin(self.base_url, href)
                self._parts = []
        elif tag == "img" and attrs_map.get("src"):
            self.images.append(urljoin(self.base_url, attrs_map["src"]))
        elif tag == "meta":
            key = (attrs_map.get("property") or attrs_map.get("name") or "").lower()
            content = attrs_map.get("content", "")
            if key in {"og:image", "og:image:url", "twitter:image", "twitter:image:src"} and content:
                self.meta_images.append(urljoin(self.base_url, content))

    def handle_data(self, data: str) -> None:
        if self._href:
            self._parts.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() != "a" or not self._href:
            return
        title = clean_text(" ".join(self._parts))
        if title:
            self.links.append((title, self._href))
        self._href = None
        self._parts = []


def clean_text(value: str) -> str:
    text = html.unescape(value or "")
    text = re.sub(r"(?is)<script.*?</script>", " ", text)
    text = re.sub(r"(?is)<style.*?</style>", " ", text)
    text = re.sub(r"(?is)<noscript.*?</noscript>", " ", text)
    text = re.sub(r"(?is)<svg.*?</svg>", " ", text)
    text = re.sub(r"(?is)<[^>]+>", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def decode_body(body: bytes, content_type: str) -> str:
    candidates: list[str] = []
    match = re.search(r"charset\s*=\s*['\"]?([A-Za-z0-9._-]+)", content_type or "", re.I)
    if match:
        candidates.append(match.group(1))
    probe = body[:4096].decode("latin-1", errors="ignore")
    match = re.search(r"charset\s*=\s*['\"]?([A-Za-z0-9._-]+)", probe, re.I)
    if match:
        candidates.append(match.group(1))
    candidates.extend(["utf-8", "gb18030", "gbk"])
    for charset in candidates:
        try:
            return body.decode(charset, errors="replace")
        except LookupError:
            continue
    return body.decode("utf-8", errors="replace")


def fetch_text(url: str, timeout: int) -> str:
    request = Request(
        url,
        headers={
            "User-Agent": "CottonRecognitionAssistant/1.0 strict-news-crawler",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
    )
    try:
        response = urlopen(request, timeout=timeout)
    except URLError as exc:
        if "CERTIFICATE_VERIFY_FAILED" not in str(exc):
            raise
        response = urlopen(request, timeout=timeout, context=ssl._create_unverified_context())
    with response:
        body = response.read()
        content_type = response.headers.get("content-type", "")
    return decode_body(body, content_type)


def is_http_url(value: str) -> bool:
    return urlparse(value).scheme.lower() in {"http", "https"}


def is_display_image(url: str | None) -> bool:
    if not url:
        return False
    normalized = url.lower()
    return not any(marker in normalized for marker in NON_DISPLAY_IMAGE_MARKERS)


def matched_keywords(text: str, keywords: list[str]) -> list[str]:
    normalized = text.lower()
    hits: list[str] = []
    for keyword in keywords:
        if keyword.lower() in normalized and keyword not in hits:
            hits.append(keyword)
    return hits


def extract_title(html_text: str, fallback: str) -> str:
    for pattern in [r"(?is)<h1[^>]*>(.*?)</h1>", r"(?is)<title[^>]*>(.*?)</title>"]:
        match = re.search(pattern, html_text or "")
        if match:
            title = clean_text(match.group(1))
            if title:
                return title
    return fallback


def extract_summary(html_text: str) -> str:
    paragraphs = [clean_text(item) for item in re.findall(r"(?is)<p[^>]*>(.*?)</p>", html_text or "")]
    meaningful = [item for item in paragraphs if len(item) >= 22]
    text = " ".join(meaningful) if meaningful else clean_text(html_text)
    return text[:MAX_SUMMARY_CHARS]


def extract_date(*values: str) -> str | None:
    joined = " ".join(value or "" for value in values)
    patterns = [
        r"(20\d{2})[-/.年](\d{1,2})[-/.月](\d{1,2})(?:日)?",
        r"(?<!\d)(20\d{2})(\d{2})(\d{2})(?!\d)",
        r"(?<!\d)(20\d{2})(?!\d)",
    ]
    for pattern in patterns[:2]:
        match = re.search(pattern, joined)
        if match:
            year, month, day = (int(match.group(1)), int(match.group(2)), int(match.group(3)))
            if 1 <= month <= 12 and 1 <= day <= 31:
                return f"{year:04d}-{month:02d}-{day:02d}"
    match = re.search(patterns[2], joined)
    if match:
        return f"{int(match.group(1)):04d}-01-01"
    return None


def in_scope_date(date_value: str | None) -> bool:
    if not date_value:
        return False
    try:
        return int(date_value[:4]) >= MIN_YEAR
    except ValueError:
        return False


def looks_like_login_page(title: str, summary: str) -> bool:
    combined = f"{title} {summary}"
    return "登录" in combined and ("用户登录" in combined or "请输入用户名和密码" in combined)


def source_links(source: dict[str, str], timeout: int, max_links: int) -> tuple[list[LinkCandidate], str]:
    try:
        source_html = fetch_text(source["url"], timeout)
    except (HTTPError, URLError, TimeoutError, OSError) as exc:
        return [], f"{source['name']}: {exc}"

    parser = PageParser(source["url"])
    parser.feed(source_html)
    pattern = re.compile(source.get("url_pattern") or "", re.I)
    links: list[LinkCandidate] = []
    seen: set[str] = set()
    for title, url in parser.links:
        if not is_http_url(url) or url in seen:
            continue
        pattern_match = bool(pattern.search(url) or pattern.search(title)) if pattern.pattern else True
        if not pattern_match:
            continue
        seen.add(url)
        links.append(
            LinkCandidate(
                source=source["name"],
                source_url=source["url"],
                title=title,
                url=url,
                language=source.get("language", ""),
            )
        )
        if len(links) >= max_links:
            break
    return links, ""


def evaluate_candidate(candidate: LinkCandidate, timeout: int) -> ReviewedNews | None:
    try:
        article_html = fetch_text(candidate.url, timeout)
    except (HTTPError, URLError, TimeoutError, OSError):
        return None

    parser = PageParser(candidate.url)
    parser.feed(article_html)
    title = extract_title(article_html, candidate.title)
    summary = extract_summary(article_html)
    if candidate.title and looks_like_login_page(title, summary):
        title = candidate.title
        summary = candidate.title
    date_value = extract_date(candidate.url, article_html[:5000], summary, title)
    images = [*parser.meta_images, *parser.images]
    image_url = next((image for image in images if is_display_image(image)), None)
    haystack = f"{candidate.title} {title} {summary}"
    cotton_hits = matched_keywords(haystack, COTTON_KEYWORDS)
    customs_hits = matched_keywords(haystack, CUSTOMS_KEYWORDS)
    reject_hits = matched_keywords(haystack, REJECT_KEYWORDS)

    reason = "ok"
    passed = True
    if not in_scope_date(date_value):
        passed = False
        reason = "date_out_of_scope_or_unknown"
    elif not cotton_hits:
        passed = False
        reason = "missing_cotton_keyword"
    elif not customs_hits:
        passed = False
        reason = "missing_customs_keyword"
    elif reject_hits:
        passed = False
        reason = "reject_keyword"

    return ReviewedNews(
        source=candidate.source,
        title=title,
        url=candidate.url,
        publishedAt=date_value,
        summary=summary,
        imageUrl=image_url,
        cottonKeywords=cotton_hits,
        customsKeywords=customs_hits,
        rejectKeywords=reject_hits,
        passed=passed,
        reason=reason,
    )


def reset_output_dir(output_dir: Path) -> None:
    root = ROOT.resolve()
    target = output_dir.resolve()
    if root not in [target, *target.parents]:
        raise RuntimeError(f"Refuse to clear output outside workspace: {target}")
    if target.exists():
        shutil.rmtree(target)
    target.mkdir(parents=True, exist_ok=True)


def write_json(path: Path, value: object) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")


def write_markdown(path: Path, accepted: list[ReviewedNews], rejected: list[ReviewedNews], errors: list[str]) -> None:
    with_images = [item for item in accepted if item.imageUrl]
    text_only = [item for item in accepted if not item.imageUrl]
    lines = [
        "# 2026+ 棉花 + 海关/进出口资讯严格审查",
        "",
        f"生成时间：{time.strftime('%Y-%m-%d %H:%M:%S')}",
        f"通过：{len(accepted)}，其中带图：{len(with_images)}，纯文本：{len(text_only)}",
        f"未通过样本：{len(rejected)}，源错误：{len(errors)}",
        "",
        "## 带图资讯",
    ]
    if not with_images:
        lines.append("暂无。")
    for item in with_images:
        lines.extend([
            f"- [{item.title}]({item.url})",
            f"  - 来源：{item.source}",
            f"  - 时间：{item.publishedAt}",
            f"  - 图片：{item.imageUrl}",
            f"  - 命中：{', '.join(item.cottonKeywords)} / {', '.join(item.customsKeywords)}",
        ])
    lines.extend(["", "## 纯文本资讯"])
    if not text_only:
        lines.append("暂无。")
    for item in text_only:
        lines.extend([
            f"- [{item.title}]({item.url})",
            f"  - 来源：{item.source}",
            f"  - 时间：{item.publishedAt}",
            f"  - 命中：{', '.join(item.cottonKeywords)} / {', '.join(item.customsKeywords)}",
        ])
    lines.extend(["", "## 源错误"])
    lines.extend([f"- {error}" for error in errors] or ["无。"])
    path.write_text("\n".join(lines), encoding="utf-8")


def demote_repeated_images(items: list[ReviewedNews]) -> None:
    counts: dict[str, int] = {}
    for item in items:
        if item.imageUrl:
            counts[item.imageUrl] = counts.get(item.imageUrl, 0) + 1

    for item in items:
        if item.imageUrl and counts.get(item.imageUrl, 0) > 1:
            item.imageUrl = None


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--timeout", type=int, default=15)
    parser.add_argument("--max-links-per-source", type=int, default=24)
    parser.add_argument("--max-articles", type=int, default=72)
    parser.add_argument("--min-items", type=int, default=0)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    reset_output_dir(args.output_dir)

    errors: list[str] = []
    candidates: list[LinkCandidate] = []
    for source in SOURCES:
        links, error = source_links(source, args.timeout, args.max_links_per_source)
        if error:
            errors.append(error)
        candidates.extend(links)

    unique: list[LinkCandidate] = []
    seen: set[str] = set()
    for candidate in candidates:
        if candidate.url in seen:
            continue
        seen.add(candidate.url)
        unique.append(candidate)

    reviewed: list[ReviewedNews] = []
    for candidate in unique[: args.max_articles]:
        item = evaluate_candidate(candidate, args.timeout)
        if item:
            reviewed.append(item)
        time.sleep(0.15)

    accepted = [item for item in reviewed if item.passed]
    demote_repeated_images(accepted)
    accepted.sort(key=lambda item: item.publishedAt or "", reverse=True)
    accepted.sort(key=lambda item: item.imageUrl is None)
    rejected = [item for item in reviewed if not item.passed]

    write_json(args.output_dir / "accepted-news.json", [asdict(item) for item in accepted])
    write_json(args.output_dir / "rejected-news-sample.json", [asdict(item) for item in rejected[:40]])
    write_json(args.output_dir / "crawler-report.json", {
        "generatedAt": time.strftime("%Y-%m-%d %H:%M:%S"),
        "sourceCount": len(SOURCES),
        "sources": [{"name": source["name"], "url": source["url"], "language": source.get("language", "")} for source in SOURCES],
        "candidateCount": len(unique),
        "reviewedCount": len(reviewed),
        "acceptedCount": len(accepted),
        "acceptedWithImageCount": len([item for item in accepted if item.imageUrl]),
        "acceptedTextOnlyCount": len([item for item in accepted if not item.imageUrl]),
        "errors": errors,
        "qualityGate": {
            "minYear": MIN_YEAR,
            "requiresCottonKeyword": True,
            "requiresCustomsKeyword": True,
            "defaultImagesAllowed": False,
        },
    })
    write_markdown(args.output_dir / "reviewed-news.md", accepted, rejected[:20], errors)

    if len(accepted) < args.min_items:
        print(f"Strict crawler found {len(accepted)} item(s), expected at least {args.min_items}.")
        print(f"Output: {args.output_dir}")
        return 2

    print(
        "Strict crawler finished: "
        f"accepted={len(accepted)}, withImages={len([item for item in accepted if item.imageUrl])}, "
        f"textOnly={len([item for item in accepted if not item.imageUrl])}"
    )
    print(f"Output: {args.output_dir}")
    return 0


if __name__ == "__main__":
    sys.exit(main())




