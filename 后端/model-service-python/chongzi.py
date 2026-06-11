"""
Bing 图片爬虫 - 稳定版
依赖：requests, beautifulsoup4, tqdm
pip install requests beautifulsoup4 tqdm
"""

import os
import time
import requests
from tqdm import tqdm
from bs4 import BeautifulSoup
from urllib.parse import quote, urljoin

# ———— 参数区 ————
KEYWORD  = "茶叶绿盲蝽晚期病害"           # 搜索关键词
TOTAL    = 200             # 下载数量
SAVE_DIR = r"F:\pachongdataset\lvmangchuqi" # 保存路径
# ——————————————————

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) "
                  "Chrome/118.0.0.0 Safari/537.36"
}

def fetch_bing_urls(keyword, max_count):
    """
    从 Bing 图片搜索页解析图片 URL，支持翻页。
    """
    urls = []
    page = 0
    per_page = 35  # 每页 Bing 默认 35 张
    while len(urls) < max_count:
        query = quote(keyword)
        search_url = f"https://www.bing.com/images/async?q={query}&first={page*per_page}&count={per_page}&adlt=off"
        resp = requests.get(search_url, headers=HEADERS, timeout=10)
        if resp.status_code != 200:
            break
        html = resp.text
        soup = BeautifulSoup(html, "html.parser")
        # 每个结果都在 mimg 标签里
        items = soup.find_all("a", class_="iusc")
        if not items:
            break
        for a in items:
            # m 属性是一个包含 murl 的 JSON 字符串
            m = a.get("m")
            if not m:
                continue
            # 从 m 中提取 murl
            try:
                # 简单 eval（安全性问题可改用 json.loads +替换单引号）
                info = eval(m)
                murl = info.get("murl")
            except:
                continue
            if murl and murl.startswith("http"):
                urls.append(murl)
                if len(urls) >= max_count:
                    break
        page += 1
        time.sleep(0.2)
    return urls[:max_count]

def download_images(urls, save_dir, prefix):
    os.makedirs(save_dir, exist_ok=True)
    for idx, url in enumerate(tqdm(urls, desc="Downloading"), start=1):
        try:
            resp = requests.get(url, headers=HEADERS, timeout=10)
            resp.raise_for_status()
            ext = url.split('.')[-1].split('?')[0]
            if len(ext) > 5 or ext.lower() not in ("jpg","jpeg","png","webp"):
                ext = "jpg"
            fname = f"{prefix}_{idx:03d}.{ext}"
            with open(os.path.join(save_dir, fname), "wb") as f:
                f.write(resp.content)
        except Exception:
            continue

def main():
    print(f"开始从 Bing 下载关键词“{KEYWORD}”的图片，共 {TOTAL} 张，保存到：{SAVE_DIR}")
    urls = fetch_bing_urls(KEYWORD, TOTAL)
    if not urls:
        print("未获取到任何图片 URL，请检查网络或关键词。")
        return
    download_images(urls, SAVE_DIR, KEYWORD.replace(" ", "_"))
    print("下载完成。")

if __name__ == "__main__":
    main()


