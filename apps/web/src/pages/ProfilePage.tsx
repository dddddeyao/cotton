import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bookmark,
  CheckCircle2,
  Database,
  Eye,
  EyeOff,
  FilePenLine,
  LogOut,
  Phone,
  ScanSearch,
  ServerCog,
  Settings,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { useApp } from '../context/useApp';
import { api } from '../api';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

type ProfileCache = {
  nickname?: string;
  phone?: string;
  organization?: string;
  role?: string;
};

function readProfileCache(username?: string): ProfileCache {
  if (!username) return {};
  try {
    const raw = localStorage.getItem(`profile_cache_${username}`);
    return raw ? (JSON.parse(raw) as ProfileCache) : {};
  } catch {
    return {};
  }
}

export default function ProfilePage() {
  const { session, setSession, logout } = useApp();
  const navigate = useNavigate();
  useDocumentTitle('我的信息');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const profile = readProfileCache(session?.username);

  const switchMode = (m: 'login' | 'register') => {
    setMode(m);
    setMessage('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleSubmit = async () => {
    setMessage('');
    if (!username || !password) {
      setMessage('请填写完整信息');
      return;
    }
    if (mode === 'register' && password !== confirmPassword) {
      setMessage('两次密码不一致');
      return;
    }
    setLoading(true);
    try {
      const result =
        mode === 'login'
          ? await api.login(username, password)
          : await api.register(username, password);
      setSession(result);
      setUsername('');
      setPassword('');
      setConfirmPassword('');
      setMessage('');
    } catch {
      setMessage(mode === 'login' ? '登录失败' : '注册失败');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm(`确认退出账号 ${session?.username}？`)) {
      logout();
    }
  };

  const featureItems = [
    { label: '编辑资料', path: '/profile/edit', icon: FilePenLine },
    { label: '我的收藏', path: '/profile/collection', icon: Bookmark },
    { label: '应用设置', path: '/profile/settings', icon: Settings },
  ];

  return (
    <div className="grid min-h-full gap-4 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="flex flex-col gap-4">
        {session ? (
          <section className="interactive-card rounded-lg border border-primary/20 bg-primary-soft p-5 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={20} strokeWidth={1.8} className="text-success" />
                  <span className="font-bold text-ink">已登录：{session.username}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted">
                  {profile.nickname ? `${profile.nickname} 的研究工作台` : '棉花品质识别研究工作台'}
                </p>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full border border-danger bg-white/70 px-4 py-2 text-sm font-semibold text-danger"
                onClick={handleLogout}
              >
                <LogOut size={16} strokeWidth={1.8} />
                退出登录
              </button>
            </div>

            <div className="mt-4 grid gap-2 text-sm md:grid-cols-3">
              {[
                { label: '昵称', value: profile.nickname || '未填写', icon: UserRound },
                { label: '手机号', value: profile.phone || '未填写', icon: Phone },
                { label: '身份', value: profile.role || '研究人员', icon: ShieldCheck },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border border-white/70 bg-white/60 p-3">
                  <div className="mb-1 flex items-center gap-1.5 text-xs text-muted">
                    <item.icon size={14} strokeWidth={1.8} />
                    <span>{item.label}</span>
                  </div>
                  <p className="truncate font-semibold text-ink">{item.value}</p>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <section className="interactive-card rounded-lg border border-line bg-surface-strong p-4 shadow-card">
            <div className="mb-4 flex rounded-full bg-background-deep p-1">
              <button
                type="button"
                className={`flex-1 rounded-full py-2 text-sm font-semibold ${
                  mode === 'login' ? 'bg-primary text-white' : 'text-muted'
                }`}
                onClick={() => switchMode('login')}
              >
                登录
              </button>
              <button
                type="button"
                className={`flex-1 rounded-full py-2 text-sm font-semibold ${
                  mode === 'register' ? 'bg-primary text-white' : 'text-muted'
                }`}
                onClick={() => switchMode('register')}
              >
                注册
              </button>
            </div>

            <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
              <input
                className="w-full rounded-lg border border-line bg-background px-4 py-3 text-base outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="用户名"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <div className="relative">
                <input
                  className="w-full rounded-lg border border-line bg-background px-4 py-3 pr-12 text-base outline-none focus:ring-2 focus:ring-primary/30"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? '隐藏密码' : '显示密码'}
                >
                  {showPassword ? <EyeOff size={18} strokeWidth={1.8} /> : <Eye size={18} strokeWidth={1.8} />}
                </button>
              </div>
              {mode === 'register' && (
                <input
                  className="w-full rounded-lg border border-line bg-background px-4 py-3 text-base outline-none focus:ring-2 focus:ring-primary/30"
                  type="password"
                  placeholder="确认密码"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              )}

              {message && (
                <p className={`text-sm ${message.includes('成功') ? 'text-success' : 'text-danger'}`}>
                  {message}
                </p>
              )}

              <button
                type="submit"
                className="w-full rounded-full bg-primary py-3 text-base font-semibold text-white disabled:opacity-50"
                disabled={loading}
              >
                {loading ? '请稍候...' : mode === 'login' ? '登录' : '注册'}
              </button>
            </form>
          </section>
        )}

        <div className="grid grid-cols-3 gap-3">
          {featureItems.map((item) => (
            <button
              key={item.path}
              type="button"
              className="interactive-card rounded-lg border border-line bg-surface-strong p-4 text-center text-sm font-semibold text-ink shadow-card hover:border-primary/30 hover:bg-primary-soft"
              onClick={() => navigate(item.path)}
            >
              <item.icon className="mx-auto mb-2 text-primary" size={21} strokeWidth={1.8} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        <section className="interactive-card rounded-lg border border-line bg-surface-strong p-4 shadow-card">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-ink">
            <CheckCircle2 size={17} strokeWidth={1.8} className="text-success" />
            <span>功能覆盖与移动适配</span>
          </div>
          <div className="grid gap-2 text-sm md:grid-cols-2">
            {[
              '账号登录、注册与会话缓存',
              '资料编辑、本地保存与后端预留',
              '识别结果、历史记录与缓存清理',
              '手机浏览器底部导航与触控按钮',
            ].map((item) => (
              <div key={item} className="rounded-lg border border-line bg-background/70 px-3 py-2 text-muted">
                {item}
              </div>
            ))}
          </div>
        </section>
      </div>

      <aside className="interactive-card flex min-h-full flex-col rounded-lg border border-line bg-surface-strong p-5 shadow-card">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase text-primary">Account Console</p>
          <h2 className="mt-2 text-2xl font-bold text-ink">用户与系统状态</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            面向移动端使用与领导演示的轻量工作台，保留后端账号、识别记录和资料库接入边界。
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {[
            { label: '会话状态', value: session ? '已登录' : '待登录', icon: ShieldCheck },
            { label: '识别入口', value: '拍照/相册', icon: ScanSearch },
            { label: '缓存策略', value: '本地可用', icon: Database },
            { label: '接口模式', value: 'Mock/API', icon: ServerCog },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border border-line bg-background/70 p-3">
              <div className="mb-2 flex items-center gap-2 text-xs text-muted">
                <item.icon size={15} strokeWidth={1.8} className="text-primary" />
                <span>{item.label}</span>
              </div>
              <p className="text-lg font-bold text-ink">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-auto pt-5 text-sm text-muted">
          <div className="rounded-lg border border-line bg-background/70 p-4">
            <p className="font-semibold text-ink">服务信息</p>
            <p className="mt-2 leading-6">客服电话：18967096861</p>
            <p className="mt-2">
              <button className="font-semibold hover:text-primary" onClick={() => navigate('/agreement/user')}>
                用户协议
              </button>
              {' | '}
              <button className="font-semibold hover:text-primary" onClick={() => navigate('/agreement/privacy')}>
                隐私政策
              </button>
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
