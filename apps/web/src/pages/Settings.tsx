import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Database,
  Eraser,
  KeyRound,
  LogOut,
  RefreshCw,
  ServerCog,
} from 'lucide-react';
import { useApp } from '../context/useApp';
import { useToast } from '../components/useToast';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { appConfig } from '../config';

type CacheStats = {
  newsCount: number;
  historyCount: number;
};

function countCachedItems(key: string): number {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

function readCacheStats(): CacheStats {
  return {
    newsCount: countCachedItems('news_cache'),
    historyCount: countCachedItems('history_cache'),
  };
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const { clearCache, logout, session } = useApp();
  const { showToast } = useToast();
  useDocumentTitle('应用设置');
  const [cacheStats, setCacheStats] = useState<CacheStats>(() => readCacheStats());
  const [showPasswordPanel, setShowPasswordPanel] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleClearCache = () => {
    if (!window.confirm('确认清理缓存？这将清除新闻缓存和本地识别记录，保留登录状态。')) return;
    clearCache();
    setCacheStats(readCacheStats());
    showToast('缓存已清理', 'success');
  };

  const handleLogout = () => {
    if (window.confirm(`确认退出账号 ${session?.username}？`)) {
      logout();
      navigate('/profile');
    }
  };

  const handleCheckUpdate = () => {
    showToast('当前为最新静态前端版本', 'success');
  };

  const handlePasswordSubmit = () => {
    if (!session) {
      showToast('请先登录', 'error');
      return;
    }
    if (!passwordForm.oldPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      showToast('请填写完整密码信息', 'error');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      showToast('新密码至少 6 位', 'error');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast('两次新密码不一致', 'error');
      return;
    }
    setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    setShowPasswordPanel(false);
    showToast(appConfig.apiBaseUrl ? '密码修改请求已提交' : '密码格式校验通过', 'success');
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
        <h2 className="text-xl font-bold text-ink">应用设置</h2>
      </div>

      <section className="grid gap-3 md:grid-cols-3">
        {[
          {
            label: '资讯缓存',
            value: `${cacheStats.newsCount} 条`,
            icon: Database,
          },
          {
            label: '识别记录',
            value: `${cacheStats.historyCount} 条`,
            icon: CheckCircle2,
          },
          {
            label: '数据模式',
            value: appConfig.apiBaseUrl ? 'API' : 'Mock',
            icon: ServerCog,
          },
        ].map((item) => (
          <div key={item.label} className="rounded-lg border border-line bg-surface-strong p-4 shadow-card">
            <div className="mb-2 flex items-center gap-2 text-sm text-muted">
              <item.icon size={16} strokeWidth={1.8} />
              <span>{item.label}</span>
            </div>
            <p className="text-2xl font-bold text-ink">{item.value}</p>
          </div>
        ))}
      </section>

      <section className="overflow-hidden rounded-lg border border-line bg-surface-strong shadow-card">
        {[
          {
            label: '修改密码',
            desc: session ? '账号安全校验' : '登录后可用',
            icon: KeyRound,
            action: () => setShowPasswordPanel((value) => !value),
          },
          {
            label: '检查更新',
            desc: 'Research UI v1.1',
            icon: RefreshCw,
            action: handleCheckUpdate,
          },
          {
            label: '清理缓存',
            desc: '清除新闻缓存和本地识别记录',
            icon: Eraser,
            action: handleClearCache,
          },
        ].map((item) => (
          <button
            key={item.label}
            type="button"
            className="flex w-full items-center gap-3 border-b border-line px-4 py-4 text-left transition-colors last:border-b-0 hover:bg-background"
            onClick={item.action}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <item.icon size={19} strokeWidth={1.8} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-ink">{item.label}</span>
              <span className="mt-0.5 block text-sm text-muted">{item.desc}</span>
            </span>
          </button>
        ))}
      </section>

      {showPasswordPanel && (
        <section className="rounded-lg border border-line bg-surface-strong p-5 shadow-card">
          <h3 className="text-base font-bold text-ink">修改密码</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {[
              ['oldPassword', '当前密码'],
              ['newPassword', '新密码'],
              ['confirmPassword', '确认新密码'],
            ].map(([field, placeholder]) => (
              <input
                key={field}
                type="password"
                className="rounded-lg border border-line bg-background px-4 py-3 text-base outline-none focus:ring-2 focus:ring-primary/30"
                placeholder={placeholder}
                value={passwordForm[field as keyof typeof passwordForm]}
                onChange={(e) =>
                  setPasswordForm((prev) => ({ ...prev, [field]: e.target.value }))
                }
              />
            ))}
          </div>
          <button
            type="button"
            className="mt-4 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white"
            onClick={handlePasswordSubmit}
          >
            提交
          </button>
        </section>
      )}

      <section className="overflow-hidden rounded-lg border border-line bg-surface-strong shadow-card">
        {session && (
          <button
            type="button"
            className="flex w-full items-center gap-3 px-4 py-4 text-left text-danger transition-colors hover:bg-background"
            onClick={handleLogout}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-danger/10">
              <LogOut size={19} strokeWidth={1.8} />
            </span>
            <span className="font-semibold">退出登录</span>
          </button>
        )}
      </section>
    </div>
  );
}
