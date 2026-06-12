import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, FileText, Shield } from 'lucide-react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const titles: Record<string, string> = {
  '/agreement/user': '用户协议',
  '/agreement/privacy': '隐私政策',
};

const content: Record<string, { icon: typeof FileText; sections: { title: string; body: string }[] }> = {
  '/agreement/user': {
    icon: FileText,
    sections: [
      {
        title: '服务范围',
        body: '本系统用于棉花图像样本的颜色级、叶屑等级与相关指标展示，识别结果应结合标准表与人工复核使用。',
      },
      {
        title: '账户使用',
        body: '用户应妥善保管账号信息。当前前端支持本地会话缓存，后续接入后端后将以服务端认证结果为准。',
      },
      {
        title: '结果说明',
        body: '前端 mock 模式下的识别结论仅用于界面演示；配置正式接口后，页面将展示后端返回的识别数据。',
      },
      {
        title: '联系方式',
        body: '如需反馈识别结果、数据接入或系统使用问题，可通过客服电话 18967096861 联系维护人员。',
      },
    ],
  },
  '/agreement/privacy': {
    icon: Shield,
    sections: [
      {
        title: '数据存储',
        body: '新闻缓存、识别历史和登录会话默认保存在浏览器 localStorage 中。清理缓存不会移除登录会话。',
      },
      {
        title: '图像使用',
        body: '用户选择的棉花图片仅用于发起识别请求和本地预览。未配置后端时，图片不会离开当前浏览器环境。',
      },
      {
        title: '接口传输',
        body: '配置 apiBaseUrl 后，图片将通过识别接口上传，认证信息按 Authorization Bearer Token 形式注入请求头。',
      },
      {
        title: '最小化原则',
        body: '前端仅保存完成页面展示所需的数据字段，后续服务端存储范围应由正式隐私条款和后端策略明确。',
      },
    ],
  },
};

export default function AgreementPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const title = titles[location.pathname] || '协议';
  const pageContent = content[location.pathname] ?? content['/agreement/user'];
  const Icon = pageContent.icon;
  useDocumentTitle(title);

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
        <h2 className="text-xl font-bold text-ink">{title}</h2>
      </div>

      <section className="rounded-lg border border-line bg-surface-strong p-5 shadow-card md:p-7">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary-soft text-primary">
            <Icon size={22} strokeWidth={1.8} />
          </div>
          <div>
            <p className="text-lg font-bold text-ink">{title}</p>
            <p className="text-sm text-muted">棉花识别助手 Web 前端静态文本</p>
          </div>
        </div>

        <div className="space-y-4">
          {pageContent.sections.map((section) => (
            <div key={section.title} className="rounded-lg border border-line bg-background/60 p-4">
              <h3 className="font-bold text-ink">{section.title}</h3>
              <p className="mt-2 text-sm leading-7 text-muted">{section.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
