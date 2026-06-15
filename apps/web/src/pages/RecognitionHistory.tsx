import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Clock3, Database, Trash2 } from 'lucide-react';
import { api } from '../api';
import { useApp } from '../context/useApp';
import { useToast } from '../components/useToast';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function RecognitionHistoryPage() {
  const { history, setHistory, removeHistoryItems, session } = useApp();
  const navigate = useNavigate();
  const { showToast } = useToast();
  useDocumentTitle('识别记录');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(() => Boolean(session));

  useEffect(() => {
    if (!session) return;

    let active = true;
    api.fetchHistory()
      .then((remoteHistory) => {
        if (!active) return;
        setHistory(remoteHistory);
      })
      .catch(() => {
        if (active) showToast('历史记录同步失败，已保留本地记录', 'error');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [session, setHistory, showToast]);

  const availableIds = new Set(history.map((item) => item.id));
  const effectiveSelectedIds = selectedIds.filter((id) => availableIds.has(id));
  const allSelected = history.length > 0 && effectiveSelectedIds.length === history.length;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(history.map((h) => h.id));
    }
  };

  const handleDelete = async () => {
    if (effectiveSelectedIds.length === 0 || deleting) return;
    if (!window.confirm(`确认删除 ${effectiveSelectedIds.length} 条记录？`)) return;
    setDeleting(true);
    try {
      const remoteIds = history
        .filter((item) => effectiveSelectedIds.includes(item.id) && !item.isLocal && Number.isFinite(Number(item.id)))
        .map((item) => item.id);

      if (remoteIds.length > 0) {
        await api.deleteHistory(remoteIds);
      }

      removeHistoryItems(effectiveSelectedIds);
      setSelectedIds([]);
      showToast('记录已删除', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '删除失败，请稍后重试', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

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
        <h2 className="text-xl font-bold text-ink">识别记录</h2>
        {isLoading && <span className="text-sm text-muted">同步中...</span>}
      </div>

      {history.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line bg-surface-strong py-14 text-center text-muted">
          暂无识别记录
        </div>
      ) : (
        <>
          <section className="grid gap-3 md:grid-cols-3">
            {[
              ['记录总数', history.length],
              ['选中记录', effectiveSelectedIds.length],
              ['平均置信度', `${Math.round((history.reduce((sum, item) => sum + item.confidence, 0) / history.length) * 100)}%`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-line bg-surface-strong p-4 shadow-card">
                <p className="text-2xl font-bold text-ink">{value}</p>
                <p className="mt-1 text-sm text-muted">{label}</p>
              </div>
            ))}
          </section>

          <div className="space-y-2 pb-20 md:pb-0">
            {history.map((item) => (
              <div
                key={item.id}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-line bg-surface-strong p-3 shadow-card transition-colors hover:border-primary/30"
                onClick={() => navigate('/recognition/result', { state: { result: item } })}
              >
                <button
                  type="button"
                  aria-label="选择记录"
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                    effectiveSelectedIds.includes(item.id)
                      ? 'bg-primary border-primary'
                      : 'border-line'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelect(item.id);
                  }}
                >
                  {effectiveSelectedIds.includes(item.id) && (
                    <Check size={14} strokeWidth={2.4} className="text-white" />
                  )}
                </button>
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary-soft">
                  {item.imageUri ? (
                    <img src={item.imageUri} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Database size={23} strokeWidth={1.8} className="text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-bold text-ink">{item.grade}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                    <Clock3 size={13} strokeWidth={1.8} />
                    {formatDate(item.createdAt)}
                  </p>
                  <p className="mt-1 text-xs text-muted">置信度 {Math.round(item.confidence * 100)}%</p>
                </div>
              </div>
            ))}
          </div>

          <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between border-t border-line bg-surface-strong px-4 py-3 md:relative md:z-auto md:rounded-lg md:border md:shadow-card">
            <button
              type="button"
              className="flex items-center gap-2 text-sm font-semibold text-ink"
              onClick={toggleAll}
            >
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                  allSelected
                    ? 'bg-primary border-primary'
                    : 'border-line'
                }`}
              >
                {allSelected && (
                  <Check size={14} strokeWidth={2.4} className="text-white" />
                )}
              </div>
              <span>全选</span>
            </button>
            <button
              type="button"
              className={`inline-flex items-center gap-2 rounded-full px-6 py-2 text-sm font-semibold ${
                effectiveSelectedIds.length > 0 && !deleting
                  ? 'bg-danger text-white'
                  : 'bg-muted/30 text-muted cursor-not-allowed'
              }`}
              disabled={effectiveSelectedIds.length === 0 || deleting}
              onClick={handleDelete}
            >
              <Trash2 size={16} strokeWidth={1.8} />
              {deleting ? '删除中...' : '删除'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
