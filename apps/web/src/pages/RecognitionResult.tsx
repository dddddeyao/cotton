import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BadgeCheck,
  CalendarClock,
  ClipboardCopy,
  FileText,
  Gauge,
  History,
  RotateCcw,
} from 'lucide-react';
import { useApp } from '../context/useApp';
import { useToast } from '../components/useToast';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import type { RecognitionResult } from '../types';

function formatDateTime(iso: string) {
  if (!iso) return '未记录';
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
}

export default function RecognitionResultPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { history } = useApp();
  const { showToast } = useToast();
  useDocumentTitle('识别结果');
  const stateResult = (location.state as { result?: RecognitionResult })?.result;
  const result = stateResult ?? history[0];

  const copySummary = async () => {
    if (!result) return;
    const summary = [
      `识别等级：${result.grade}`,
      `置信度：${Math.round(result.confidence * 100)}%`,
      `识别时间：${formatDateTime(result.createdAt)}`,
      `结论：${result.conclusion}`,
      ...result.metrics.map((m) => `${m.label}：${m.value}${m.hint ? `（${m.hint}）` : ''}`),
    ].join('\n');

    try {
      await navigator.clipboard.writeText(summary);
      showToast('摘要已复制', 'success');
    } catch {
      showToast('复制失败，请手动选择文本', 'error');
    }
  };

  if (!result) {
    return (
      <div className="pt-4 space-y-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
        >
          <ArrowLeft size={16} strokeWidth={1.8} />
          返回
        </button>
        <div className="rounded-lg border border-dashed border-line bg-surface-strong py-14 text-center text-muted">
          暂无识别结果
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pt-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
          >
            <ArrowLeft size={16} strokeWidth={1.8} />
            返回
          </button>
          <h2 className="text-xl font-bold text-ink">识别结果</h2>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={copySummary}
            className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-strong px-4 py-2 text-sm font-semibold text-ink shadow-card"
          >
            <ClipboardCopy size={16} strokeWidth={1.8} />
            复制摘要
          </button>
          <button
            type="button"
            onClick={() => navigate('/recognition/history')}
            className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-strong px-4 py-2 text-sm font-semibold text-ink shadow-card"
          >
            <History size={16} strokeWidth={1.8} />
            记录
          </button>
        </div>
      </div>

      <section className="grid gap-5 md:grid-cols-[1fr_0.9fr]">
        <div className="overflow-hidden rounded-lg border border-line bg-surface-strong shadow-card">
          {result.imageUri ? (
            <img src={result.imageUri} alt="识别图" className="h-80 w-full object-cover md:h-[420px]" />
          ) : (
            <div className="flex h-80 w-full items-center justify-center bg-[#eef5f1] md:h-[420px]">
              <div className="relative h-24 w-32">
                <div className="absolute left-8 top-3 h-14 w-14 rounded-full bg-white shadow-sm" />
                <div className="absolute left-1 top-8 h-12 w-12 rounded-full bg-white shadow-sm" />
                <div className="absolute right-1 top-9 h-12 w-12 rounded-full bg-white shadow-sm" />
                <div className="absolute bottom-3 left-6 h-9 w-20 rounded-full bg-white shadow-sm" />
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-line bg-surface-strong p-5 shadow-card">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted">识别等级</p>
                <p className="mt-1 text-2xl font-bold leading-tight text-ink">{result.grade}</p>
              </div>
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-4 border-primary-soft bg-primary text-xl font-bold text-white">
                {Math.round(result.confidence * 100)}%
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-lg border border-line bg-background/70 p-3">
                <div className="mb-1 flex items-center gap-1.5 text-muted">
                  <CalendarClock size={15} strokeWidth={1.8} />
                  <span>识别时间</span>
                </div>
                <p className="font-semibold text-ink">{formatDateTime(result.createdAt)}</p>
              </div>
              <div className="rounded-lg border border-line bg-background/70 p-3">
                <div className="mb-1 flex items-center gap-1.5 text-muted">
                  <BadgeCheck size={15} strokeWidth={1.8} />
                  <span>记录类型</span>
                </div>
                <p className="font-semibold text-ink">{result.isLocal ? '本地临时' : '后端记录'}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-line bg-surface-strong p-5 shadow-card">
            <div className="mb-2 flex items-center gap-2 text-sm font-bold text-ink">
              <FileText size={17} strokeWidth={1.8} className="text-primary" />
              <span>判定结论</span>
            </div>
            <p className="text-sm leading-7 text-muted">{result.conclusion}</p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {result.metrics.map((m, i) => (
          <div key={i} className="rounded-lg border border-line bg-surface-strong p-4 shadow-card">
            <div className="mb-2 flex items-center gap-1.5 text-xs text-muted">
              <Gauge size={14} strokeWidth={1.8} />
              <span>{m.label}</span>
            </div>
            <p className="text-xl font-bold text-ink">{m.value}</p>
            {m.hint && <p className="mt-2 text-xs leading-5 text-muted">{m.hint}</p>}
          </div>
        ))}
      </section>

      <button
        type="button"
        className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-base font-semibold text-white"
        onClick={() => navigate('/recognition')}
      >
        <RotateCcw size={18} strokeWidth={1.8} />
        <span>重新选择图片</span>
      </button>
    </div>
  );
}
