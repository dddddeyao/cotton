import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bookmark, Newspaper, ScanSearch } from 'lucide-react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function CollectionPage() {
  const navigate = useNavigate();
  useDocumentTitle('我的收藏');

  return (
    <div className="space-y-5 pt-2">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
        >
          <ArrowLeft size={16} strokeWidth={1.8} />
          返回
        </button>
        <h2 className="text-xl font-bold text-ink">我的收藏</h2>
      </div>

      <section className="rounded-lg border border-dashed border-line bg-surface-strong p-8 text-center shadow-card">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-primary-soft text-primary">
          <Bookmark size={26} strokeWidth={1.8} />
        </div>
        <h3 className="mt-4 text-lg font-bold text-ink">暂无收藏内容</h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-muted">
          当前尚未收藏任何资料。收藏的资讯与识别报告将在此集中管理。
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-line bg-background px-4 py-2 text-sm font-semibold text-ink"
            onClick={() => navigate('/news')}
          >
            <Newspaper size={16} strokeWidth={1.8} />
            前沿瞭望
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white"
            onClick={() => navigate('/recognition')}
          >
            <ScanSearch size={16} strokeWidth={1.8} />
            智能识别
          </button>
        </div>
      </section>
    </div>
  );
}
