import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Phone, Save, UserRound } from 'lucide-react';
import { useApp } from '../context/useApp';
import { useToast } from '../components/useToast';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { api } from '../api';
import type { UserProfile } from '../types';

type ProfileCache = {
  nickname: string;
  phone: string;
  organization: string;
  role: string;
};

type ProfileState = {
  username?: string;
  data: ProfileCache;
};

function toProfileCache(profile: UserProfile): ProfileCache {
  return {
    nickname: profile.nickname || '',
    phone: profile.phone || '',
    organization: profile.organization || '',
    role: profile.role || defaultProfile.role,
  };
}

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
  const [profile, setProfile] = useState<ProfileState>(() => ({
    username: session?.username,
    data: readProfileCache(session?.username),
  }));
  const [saved, setSaved] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(() => Boolean(session));
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!session) return;

    let active = true;
    api.fetchProfile(session)
      .then((remoteProfile) => {
        if (!active) return;
        const nextProfile = toProfileCache(remoteProfile);
        setProfile({ username: session.username, data: nextProfile });
        localStorage.setItem(`profile_cache_${session.username}`, JSON.stringify(nextProfile));
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setIsLoadingProfile(false);
      });

    return () => {
      active = false;
    };
  }, [session]);

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

  const handleSave = async () => {
    const visibleProfile =
      profile.username === session.username ? profile.data : readProfileCache(session.username);

    if (visibleProfile.phone && !/^1[3-9]\d{9}$/.test(visibleProfile.phone)) {
      showToast('手机号格式不正确', 'error');
      return;
    }

    try {
      setIsSaving(true);
      const savedProfile = await api.updateProfile(session, visibleProfile);
      const nextProfile = toProfileCache(savedProfile);
      localStorage.setItem(`profile_cache_${session.username}`, JSON.stringify(nextProfile));
      setProfile({ username: session.username, data: nextProfile });
      setSaved(true);
      showToast('资料已保存', 'success');
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '保存失败', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (field: keyof ProfileCache, value: string) => {
    setProfile((prev) => ({
      username: session.username,
      data: {
        ...(prev.username === session.username ? prev.data : readProfileCache(session.username)),
        [field]: value,
      },
    }));
  };

  const visibleProfile =
    profile.username === session.username ? profile.data : readProfileCache(session.username);

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
            <p className="text-sm text-muted">{isLoadingProfile ? '正在同步账号资料' : '资料会同步到当前账号'}</p>
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
            value={visibleProfile.nickname}
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
            value={visibleProfile.phone}
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
            value={visibleProfile.organization}
            onChange={(e) => updateField('organization', e.target.value)}
          />
        </div>
        <div className="md:col-span-2">
          <label className="text-muted text-sm block mb-1">身份</label>
          <select
            className="w-full rounded-lg border border-line bg-background px-4 py-3 text-base outline-none focus:ring-2 focus:ring-primary/30"
            value={visibleProfile.role}
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
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-base font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          onClick={handleSave}
          disabled={isSaving}
        >
          <Save size={18} strokeWidth={1.8} />
          <span>{isSaving ? '保存中...' : '保存'}</span>
        </button>
      </div>
    </div>
  );
}
