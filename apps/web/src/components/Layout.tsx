import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  ClipboardList,
  FlaskConical,
  Leaf,
  Newspaper,
  ScanSearch,
  Settings2,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { appConfig } from '../config';
import type { TabKey } from '../types';

const tabs: { key: TabKey; label: string; icon: LucideIcon; path: string; hint: string }[] = [
  { key: 'news', label: '前沿瞭望', icon: Newspaper, path: '/news', hint: '行业动态' },
  { key: 'standards', label: '分类标准', icon: ClipboardList, path: '/standards', hint: '分级依据' },
  { key: 'recognition', label: '智能识别', icon: ScanSearch, path: '/recognition', hint: '图像判定' },
  { key: 'profile', label: '我的信息', icon: UserRound, path: '/profile', hint: '账户配置' },
];

const hideBottomNavPaths = [
  '/recognition/result',
  '/recognition/history',
  '/profile/edit',
  '/profile/collection',
  '/profile/settings',
  '/agreement/user',
  '/agreement/privacy',
];

export default function Layout() {
  const location = useLocation();
  const showBottomNav = !hideBottomNavPaths.some((p) => location.pathname.startsWith(p));
  const dataMode = appConfig.apiBaseUrl ? 'API 已配置' : 'Mock 数据模式';

  return (
    <div className="flex min-h-dvh bg-transparent">
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-line/80 bg-surface-strong/95 xl:w-72">
        <div className="px-6 pb-6 pt-8 border-b border-line">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-primary/20 bg-primary-soft text-primary">
              <Leaf size={24} strokeWidth={1.8} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-ink">棉花识别助手</h1>
              <p className="mt-0.5 text-xs uppercase text-muted">
                Cotton Quality AI Lab
              </p>
            </div>
          </div>
          <p className="mt-5 text-sm leading-6 text-muted">
            面向颜色级、叶屑等级与图像识别记录管理的前端研究平台。
          </p>
        </div>

        <nav className="flex-1 px-4 py-5 space-y-1.5">
          {tabs.map((tab) => (
            <NavLink
              key={tab.key}
              to={tab.path}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-4 py-3 text-[15px] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                  isActive
                    ? 'bg-primary text-white shadow-card'
                    : 'text-muted hover:bg-background-deep/70 hover:text-ink'
                }`
              }
            >
              <tab.icon size={19} strokeWidth={1.8} />
              <span className="flex min-w-0 flex-col">
                <span className="font-semibold leading-5">{tab.label}</span>
                <span className="text-xs leading-4 opacity-75">{tab.hint}</span>
              </span>
            </NavLink>
          ))}
        </nav>

        <div className="px-5 py-5 border-t border-line">
          <div className="rounded-lg border border-line bg-background/70 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Settings2 size={16} strokeWidth={1.8} />
              <span>{dataMode}</span>
            </div>
            <p className="mt-1 text-xs leading-5 text-muted">
              数据源契约独立，保留前后端分离接入边界。
            </p>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-muted">
            <FlaskConical size={14} strokeWidth={1.8} />
            <span>Research UI v1.1</span>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="mx-auto flex min-h-dvh w-full max-w-[1600px] px-4 py-4 pb-28 md:min-h-screen md:px-5 md:py-5 md:pb-5 xl:px-6 xl:py-6">
          <div key={location.pathname} className="page-transition flex min-h-full w-full flex-col">
            <Outlet />
          </div>
        </div>
      </main>

      {showBottomNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-around border-t border-line bg-surface-strong/95 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_24px_rgba(32,32,42,0.08)] md:hidden">
          {tabs.map((tab) => (
            <NavLink
              key={tab.key}
              to={tab.path}
              className={({ isActive }) =>
                `flex min-w-16 flex-col items-center gap-1 rounded-lg px-2 py-1.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                  isActive ? 'bg-primary-soft text-primary' : 'text-tab-muted'
                }`
              }
            >
              <tab.icon size={20} strokeWidth={1.8} />
              <span className="leading-4">{tab.label}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}
