import { useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera,
  ClipboardCheck,
  Database,
  FileImage,
  Gauge,
  History,
  ImageUp,
  LoaderCircle,
  Play,
  ScanLine,
} from 'lucide-react';
import { useApp } from '../context/useApp';
import { api } from '../api';
import { useToast } from '../components/useToast';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

function formatFileSize(size: number) {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export default function RecognitionPage() {
  const { selectedImage, setSelectedImage, isRecognizing, setIsRecognizing, addHistoryItem } = useApp();
  const navigate = useNavigate();
  const { showToast } = useToast();
  useDocumentTitle('智能识别');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const previewUrl = useMemo(
    () => (selectedImage ? URL.createObjectURL(selectedImage) : null),
    [selectedImage]
  );

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('请选择图片文件', 'error');
      e.target.value = '';
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      showToast('图片大小不能超过 20MB', 'error');
      e.target.value = '';
      return;
    }
    setSelectedImage(file);
    e.target.value = '';
  };

  const handleRecognize = async () => {
    if (!selectedImage || isRecognizing) return;
    setIsRecognizing(true);
    try {
      const result = await api.recognizeImage(selectedImage);
      setSelectedImage(null);
      addHistoryItem(result);
      navigate('/recognition/result', { state: { result } });
    } catch {
      showToast('识别失败，请稍后重试', 'error');
    } finally {
      setIsRecognizing(false);
    }
  };

  return (
    <div className="flex min-h-full flex-col gap-3 md:gap-4">
      <section className="grid flex-1 gap-3 md:grid-cols-[1.35fr_0.65fr] md:gap-4">
        <div className="interactive-card overflow-hidden rounded-lg border border-line bg-[#ccdff3] shadow-card">
          <div className="relative flex h-72 items-center justify-center overflow-hidden md:h-full md:min-h-[360px] xl:min-h-[430px]">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="预览"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center gap-5 text-center">
                <div className="soft-pulse relative h-28 w-36">
                  <div className="absolute left-9 top-5 h-16 w-16 rounded-full bg-white shadow-sm" />
                  <div className="absolute left-2 top-11 h-14 w-14 rounded-full bg-white shadow-sm" />
                  <div className="absolute right-1 top-12 h-14 w-14 rounded-full bg-white shadow-sm" />
                  <div className="absolute bottom-4 left-6 h-10 w-24 rounded-full bg-white shadow-sm" />
                  <div className="absolute bottom-0 left-10 h-1.5 w-16 rounded-full bg-emerald-300/80" />
                </div>
                <div>
                  <p className="font-semibold text-ink">等待样本图像</p>
                  <p className="mt-1 text-sm text-muted">支持相册上传与设备拍摄</p>
                </div>
              </div>
            )}

            {isRecognizing && (
              <div className="pointer-events-none absolute inset-0 bg-primary/10">
                <div className="scan-sweep absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-transparent via-white/75 to-transparent">
                  <div className="absolute left-0 right-0 top-1/2 h-px bg-primary/70 shadow-[0_0_18px_rgba(39,104,232,0.55)]" />
                </div>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-white/70 bg-white/85 px-4 py-2 text-sm font-semibold text-primary shadow-card">
                  模型分析中...
                </div>
              </div>
            )}
          </div>

          {selectedImage && (
            <div className="flex items-center gap-3 border-t border-line bg-surface-strong px-4 py-3 text-sm">
              <FileImage size={18} strokeWidth={1.8} className="shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-ink">{selectedImage.name}</p>
                <p className="text-xs text-muted">{formatFileSize(selectedImage.size)}</p>
              </div>
            </div>
          )}
        </div>

        <aside className="flex flex-col gap-3 md:gap-4">
          <div className="interactive-card rounded-lg border border-line bg-surface-strong p-4 shadow-card">
            <div className="mb-4 flex items-center gap-2 text-sm font-bold text-ink">
              <ScanLine size={18} strokeWidth={1.8} className="text-primary" />
              <span>图像采集</span>
            </div>
            <div className="grid grid-cols-3 gap-2 md:grid-cols-1">
              <button
                type="button"
                className="flex flex-col items-center justify-center gap-2 rounded-lg border border-line bg-background/70 px-3 py-4 text-sm font-semibold text-ink transition-colors hover:border-primary/40 hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 md:flex-row md:justify-start"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImageUp size={20} strokeWidth={1.8} />
                <span>相册</span>
              </button>

              <button
                type="button"
                className="flex flex-col items-center justify-center gap-2 rounded-lg border border-primary bg-primary px-3 py-4 text-sm font-semibold text-white shadow-card transition-colors hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 md:flex-row md:justify-start"
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera size={20} strokeWidth={1.8} />
                <span>拍照</span>
              </button>

              <button
                type="button"
                className="flex flex-col items-center justify-center gap-2 rounded-lg border border-line bg-background/70 px-3 py-4 text-sm font-semibold text-ink transition-colors hover:border-primary/40 hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 md:flex-row md:justify-start"
                onClick={() => navigate('/recognition/history')}
              >
                <History size={20} strokeWidth={1.8} />
                <span>记录</span>
              </button>
            </div>
          </div>

          <div className="interactive-card flex-1 rounded-lg border border-line bg-surface-strong p-4 shadow-card">
            <h3 className="text-sm font-bold text-ink">识别状态</h3>
            <p className="mt-2 min-h-10 text-sm leading-6 text-muted">
              {selectedImage
                ? '图片已选择，可开始识别。'
                : '拍摄或选择一张棉花图片后开始识别。'}
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
              {[
                ['1', '采集'],
                ['2', '分析'],
                ['3', '归档'],
              ].map(([step, label], index) => {
                const active = selectedImage || isRecognizing;
                const current = isRecognizing ? index <= 1 : active && index === 0;
                return (
                  <div
                    key={step}
                    className={`rounded-lg border px-2 py-2 ${
                      current
                        ? 'border-primary/30 bg-primary-soft text-primary'
                        : 'border-line bg-background/70 text-muted'
                    }`}
                  >
                    <p className="font-bold">{step}</p>
                    <p className="mt-0.5">{label}</p>
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              className={`mt-4 flex w-full items-center justify-center gap-2 rounded-full py-3 text-base font-semibold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                selectedImage && !isRecognizing
                  ? 'bg-primary active:bg-primary-dark'
                  : 'bg-muted'
              }`}
              disabled={!selectedImage || isRecognizing}
              onClick={handleRecognize}
            >
              {isRecognizing ? (
                <>
                  <LoaderCircle size={19} strokeWidth={1.8} className="animate-spin" />
                  <span>识别中...</span>
                </>
              ) : (
                <>
                  <Play size={18} strokeWidth={1.8} />
                  <span>开始识别</span>
                </>
              )}
            </button>
          </div>
        </aside>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        {[
          { label: '采集对象', value: '棉花样本', detail: '自然铺展图像', icon: ClipboardCheck },
          { label: '输入格式', value: 'JPG / PNG', detail: '单张图片识别', icon: FileImage },
          { label: '核心指标', value: 'Rd / +b / LG', detail: '颜色级与叶屑等级', icon: Gauge },
          { label: '结果记录', value: 'Local / API', detail: '便于后端归档', icon: Database },
        ].map((item) => (
          <div key={item.label} className="interactive-card rounded-lg border border-line bg-surface-strong p-3 shadow-card">
            <div className="mb-2 flex items-center gap-2 text-xs text-muted">
              <item.icon size={15} strokeWidth={1.8} className="text-primary" />
              <span>{item.label}</span>
            </div>
            <p className="text-base font-bold text-ink">{item.value}</p>
            <p className="mt-1 text-xs text-muted">{item.detail}</p>
          </div>
        ))}
      </section>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
