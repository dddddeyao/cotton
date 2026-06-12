import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Phone, Save, UserRound } from 'lucide-react';
import { useApp } from '../context/useApp';
import { useToast } from '../components/useToast';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

type ProfileCache = {
  nickname: string;
  phone: string;
  organization: string;
  role: string;
};

const defaultProfile: ProfileCache = {
  nickname: '',
  phone: '',
  organization: '',
  role: '研究人员',
};

function readProfileCache(username?: string): ProfileCache {
  if (!username) return defaultProfile;
  try {
    const raw = localStorage.getItem(`profile_cache_${username}`);
    return raw ? { ...defaultProfile, ...(JSON.parse(raw) as Partial<ProfileCache>) } : defaultProfile;
  } catch {
    return defaultProfile;
  }
}

export default function EditProfilePage() {
  const navigate = useNavigate();
  const { session } = useApp();
  const { showToast } = useToast();
  useDocumentTitle('编辑资料');
  const [profile, setProfile] = useState<ProfileCache>(() => readProfileCache(session?.username));
  const [saved, setSaved] = useState(false);

  if (!session) {
    return (
      <div className="pt-4 space-y-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
          >
            <ArrowLeft size={16} strokeWidth={1.8} />
            返回
          </button>
          <h2 className="text-xl font-bold text-ink">编辑资料</h2>
        </div>
        <div className="rounded-lg border border-dashed border-line bg-surface-strong py-14 text-center text-muted">
          请先登录后再编辑资料
        </div>
      </div>
    );
  }

  const handleSave = () => {
    if (profile.phone && !/^1[3-9]\d{9}$/.test(profile.phone)) {
      showToast('手机号格式不正确', 'error');
      return;
    }
    localStorage.setItem(`profile_cache_${session.username}`, JSON.stringify(profile));
    setSaved(true);
    showToast('资料已保存', 'success');
    setTimeout(() => setSaved(false), 2000);
  };

  const updateField = (field: keyof ProfileCache, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="pt-4 space-y-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
        >
          <ArrowLeft size={16} strokeWidth={1.8} />
          返回
        </button>
        <h2 className="text-xl font-bold text-ink">编辑资料</h2>
      </div>

      <div className="rounded-lg border border-line bg-surface-strong p-5 shadow-card">
        <div className="mb-5 flex items-center gap-3 rounded-lg border border-primary/15 bg-primary-soft/70 p-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white text-primary">
            <UserRound size={22} strokeWidth={1.8} />
          </div>
          <div>
            <p className="font-bold text-ink">{session.username}</p>
            <p className="text-sm text-muted">本地资料将在浏览器中保留</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-muted text-sm block mb-1">用户名</label>
          <input
            className="w-full rounded-lg border border-line bg-background px-4 py-3 text-base text-muted"
            value={session?.username ?? ''}
            disabled
          />
        </div>
        <div>
          <label className="text-muted text-sm block mb-1">昵称</label>
          <input
            className="w-full rounded-lg border border-line bg-background px-4 py-3 text-base outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="请输入昵称"
            value={profile.nickname}
            onChange={(e) => updateField('nickname', e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 flex items-center gap-1.5 text-sm text-muted">
            <Phone size={14} strokeWidth={1.8} />
            手机号
          </label>
          <input
            className="w-full rounded-lg border border-line bg-background px-4 py-3 text-base outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="请输入手机号"
            value={profile.phone}
            onChange={(e) => updateField('phone', e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 flex items-center gap-1.5 text-sm text-muted">
            <Building2 size={14} strokeWidth={1.8} />
            单位/机构
          </label>
          <input
            className="w-full rounded-lg border border-line bg-background px-4 py-3 text-base outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="请输入单位或机构"
            value={profile.organization}
            onChange={(e) => updateField('organization', e.target.value)}
          />
        </div>
        <div className="md:col-span-2">
          <label className="text-muted text-sm block mb-1">身份</label>
          <select
            className="w-full rounded-lg border border-line bg-background px-4 py-3 text-base outline-none focus:ring-2 focus:ring-primary/30"
            value={profile.role}
            onChange={(e) => updateField('role', e.target.value)}
          >
            <option>研究人员</option>
            <option>检验人员</option>
            <option>企业用户</option>
            <option>系统管理员</option>
          </select>
        </div>
        </div>

        {saved && <p className="text-success text-sm">保存成功</p>}

        <button
          type="button"
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-base font-semibold text-white"
          onClick={handleSave}
        >
          <Save size={18} strokeWidth={1.8} />
          <span>保存</span>
        </button>
      </div>
    </div>
  );
}
