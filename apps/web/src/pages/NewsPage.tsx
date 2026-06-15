import { useState, useEffect } from 'react';
import { CalendarDays, Search, Sparkles, TrendingUp } from 'lucide-react';
import { useApp } from '../context/useApp';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { appConfig } from '../config';

const toneStyles: Record<string, { panel: string; dot: string; label: string }> = {
  blue: {
    panel: 'border-sky-200 bg-sky-50 text-sky-800',
    dot: 'bg-sky-500',
    label: '通关监管',
  },
  green: {
    panel: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    dot: 'bg-emerald-500',
    label: '口岸实践',
  },
  orange: {
    panel: 'border-amber-200 bg-amber-50 text-amber-800',
    dot: 'bg-amber-500',
    label: '质量保障',
  },
  purple: {
    panel: 'border-violet-200 bg-violet-50 text-violet-800',
    dot: 'bg-violet-500',
    label: '智能检验',
  },
};

export default function NewsPage() {
  const { news } = useApp();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  useDocumentTitle('前沿瞭望');

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), news.length > 0 ? 0 : 1500);
    return () => clearTimeout(timer);
  }, [news.length]);

  const q = query.toLowerCase();
  const filtered = news.filter(
    (n) =>
      n.title.toLowerCase().includes(q) ||
      n.summary.toLowerCase().includes(q) ||
      n.source.toLowerCase().includes(q)
  );
  const latest = news[0];
  const dataMode = appConfig.apiBaseUrl ? 'API' : 'Mock';

  return (
    <div className="space-y-3 md:space-y-4">
      <section className="overflow-hidden rounded-lg border border-line bg-surface-strong shadow-card">
        <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="p-4 md:p-5">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase text-primary">
              <TrendingUp size={15} strokeWidth={1.8} />
              <span>Academic Watch</span>
            </div>
            <h2 className="text-2xl font-bold leading-tight text-ink">
              前沿瞭望
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              聚合棉花进口监管、质量检验与智能化应用动态，为识别模型展示提供可追溯的行业背景。
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              {[
                ['资讯样本', news.length || '-'],
                ['检索结果', loading ? '-' : filtered.length],
                ['数据源', dataMode],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-line bg-background/70 px-3 py-2.5">
                  <p className="text-lg font-bold text-ink">{value}</p>
                  <p className="text-xs text-muted">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative border-t border-line bg-[#eef5f1] p-4 lg:border-l lg:border-t-0">
            <div className="absolute inset-x-5 top-7 h-px bg-ink/10" />
            <div className="absolute inset-y-7 left-8 w-px bg-ink/10" />
            <div className="relative flex h-full min-h-36 flex-col justify-between rounded-lg border border-emerald-100 bg-white/72 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                <Sparkles size={17} strokeWidth={1.8} />
                <span>棉花质量研究索引</span>
              </div>
              {latest && (
                <div>
                  <p className="text-xs text-muted">最新记录 / Latest record</p>
                  <p className="mt-1 line-clamp-2 text-base font-bold leading-6 text-ink">
                    {latest.title}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="relative">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 text-muted"
          size={18}
          strokeWidth={1.8}
        />
        <input
          className="w-full rounded-full border border-line bg-surface-strong py-3 pl-11 pr-4 text-base outline-none transition-shadow focus:ring-2 focus:ring-primary/30"
          placeholder="搜索"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="rounded-lg border border-line bg-surface-strong py-10 text-center text-muted">加载中...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line bg-surface-strong py-10 text-center text-muted">
          没有找到相关新闻
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="group flex gap-3 rounded-lg border border-line bg-surface-strong p-3 shadow-card transition-colors hover:border-primary/30"
            >
              <div
                className={`flex h-[86px] w-24 shrink-0 flex-col justify-between rounded-lg border p-3 ${
                  toneStyles[item.tone]?.panel ?? toneStyles.blue.panel
                }`}
              >
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    toneStyles[item.tone]?.dot ?? toneStyles.blue.dot
                  }`}
                />
                <span className="text-xs font-semibold leading-4">
                  {toneStyles[item.tone]?.label ?? '研究资讯'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="line-clamp-2 text-base font-bold leading-snug text-ink group-hover:text-primary">
                  {item.title}
                </h3>
                <p className="mt-1 line-clamp-2 text-sm leading-5 text-muted">{item.summary}</p>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays size={13} strokeWidth={1.8} />
                    {item.date}
                  </span>
                  <span>{item.source}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
