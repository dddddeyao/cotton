import { BookOpenText, ClipboardCheck, Microscope, Ruler } from 'lucide-react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const colorGrades = [
  ['一级(11)', '77.2', '11.5', '黄度偏高，反射率最高'],
  ['二级(21)', '76.6', '9.3', '21和31的交界处'],
  ['三级(31)', '75.5', '8.0', '颜色稳定，品质良好'],
  ['四级(41)', '74.4', '7.0', '反射率继续降低'],
  ['五级(51)', '72.2', '5.7', '建议复核，品质偏低'],
  ['六级(61)', '70.1', '4.8', '低反射率样品'],
];

const leafGrades = [
  ['1', 'Leaf Grade 1', 'LG1', '0.12'],
  ['2', 'Leaf Grade 2', 'LG2', '0.20'],
  ['3', 'Leaf Grade 3', 'LG3', '0.33'],
  ['4', 'Leaf Grade 4', 'LG4', '0.50'],
  ['5', 'Leaf Grade 5', 'LG5', '0.68'],
  ['6', 'Leaf Grade 6', 'LG6', '0.92'],
  ['7', 'Leaf Grade 7', 'LG7', '1.21'],
  ['8', 'Leaf Grade 8', 'LG8', '>1.21'],
];

const cottonScale = ['#f7f2e9', '#f0e7d7', '#e6dbc5', '#d9cdb4', '#cbbd9f', '#bba989'];

export default function StandardsPage() {
  useDocumentTitle('分类标准');

  return (
    <div className="space-y-3">
      <section className="rounded-lg border border-line bg-surface-strong p-4 shadow-card">
        <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
              <BookOpenText size={15} strokeWidth={1.8} />
              <span>GB/T 相关指标展示</span>
            </div>
            <h2 className="text-2xl font-bold leading-tight text-ink">
              棉花智能(AI)识别采集说明
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-5 text-muted">
              以反射率 Rd、黄度 +b 与叶屑面积为核心观测量，形成面向图像识别结果解释的静态标准页。
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              ['颜色级', '6 档'],
              ['叶屑级', '8 档'],
              ['识别口径', 'HVI'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-line bg-background/70 px-3 py-2.5 text-center">
                <p className="text-xl font-bold text-ink">{value}</p>
                <p className="text-xs text-muted">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-3 xl:grid-cols-[1.04fr_0.96fr]">
        <section className="rounded-lg border border-line bg-surface-strong p-4 shadow-card">
          <div className="mb-3 flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <Ruler size={19} strokeWidth={1.8} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-ink">一、颜色分级</h3>
              <p className="mt-1 text-xs leading-4 text-muted">
                依据反射率(Rd)与黄度(+b)综合判定；反射率越高表示越白，黄度越高表示偏黄更明显。
              </p>
            </div>
          </div>

          <div className="mb-3 rounded-lg border border-line bg-background/60 p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <h4 className="text-xs font-bold text-ink">实物标准色阶</h4>
              <span className="text-xs text-muted">11 → 61</span>
            </div>
            <div className="grid grid-cols-6 overflow-hidden rounded-lg border border-line">
              {cottonScale.map((c, i) => (
                <div key={c} className="h-8 border-r border-white/70 last:border-r-0" style={{ backgroundColor: c }}>
                  <span className="block px-2 py-1 text-xs font-semibold text-ink/70">
                    {colorGrades[i][0].match(/\((.*?)\)/)?.[1]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-xs xl:min-w-0">
              <thead>
                <tr className="border-y border-line bg-primary-soft text-ink">
                  <th className="px-3 py-2 text-left font-bold">级别</th>
                  <th className="px-3 py-2 text-left font-bold">Rd/%</th>
                  <th className="px-3 py-2 text-left font-bold">+b</th>
                  <th className="px-3 py-2 text-left font-bold">备注</th>
                </tr>
              </thead>
              <tbody>
                {colorGrades.map((row) => (
                  <tr key={row[0]} className="border-b border-line last:border-b-0">
                    <td className="px-3 py-1 font-semibold text-ink">{row[0]}</td>
                    <td className="px-3 py-1 text-muted">{row[1]}</td>
                    <td className="px-3 py-1 text-muted">{row[2]}</td>
                    <td className="px-3 py-1 text-muted">{row[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-lg border border-line bg-surface-strong p-4 shadow-card">
          <div className="mb-3 flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <Microscope size={19} strokeWidth={1.8} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-ink">二、杂质分级</h3>
              <p className="mt-1 text-xs leading-4 text-muted">
                根据叶屑面积占比评定棉花纯净度，数值越低代表杂质控制越好。
              </p>
            </div>
          </div>

          <div className="mb-2 grid grid-cols-4 gap-2">
            {leafGrades.slice(0, 4).map((row, i) => (
              <div key={row[2]} className="rounded-lg border border-line bg-background/70 p-2">
                <div className="mb-1.5 h-1.5 rounded-full bg-emerald-100">
                  <div
                    className="h-1.5 rounded-full bg-emerald-600"
                    style={{ width: `${32 + i * 16}%` }}
                  />
                </div>
                <p className="text-xs font-bold text-ink">{row[2]}</p>
                <p className="text-[11px] text-muted">{row[3]}%</p>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-xs xl:min-w-0">
              <thead>
                <tr className="border-y border-line bg-emerald-50 text-ink">
                  <th className="px-3 py-2 text-left font-bold">代码</th>
                  <th className="px-3 py-2 text-left font-bold">叶屑等级</th>
                  <th className="px-3 py-2 text-left font-bold">符号</th>
                  <th className="px-3 py-2 text-left font-bold">面积/%</th>
                </tr>
              </thead>
              <tbody>
                {leafGrades.map((row) => (
                  <tr key={row[0]} className="border-b border-line last:border-b-0">
                    <td className="px-3 py-1 text-muted">{row[0]}</td>
                    <td className="px-3 py-1 text-muted">{row[1]}</td>
                    <td className="px-3 py-1 font-bold text-emerald-700">{row[2]}</td>
                    <td className="px-3 py-1 text-muted">{row[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="rounded-lg border border-line bg-surface-strong p-3 shadow-card">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex min-w-52 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
              <ClipboardCheck size={19} strokeWidth={1.8} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-ink">采集质量控制</h3>
              <p className="text-xs text-muted">用于降低颜色偏移与样本噪声</p>
            </div>
          </div>
          <div className="grid flex-1 gap-2 text-xs leading-5 text-muted md:grid-cols-3">
            {[
              '样品铺展均匀，减少阴影和局部堆叠。',
              '稳定光照与统一背景，降低颜色漂移。',
              '识别结果进入历史后，可与标准表复核。',
            ].map((item) => (
              <div key={item} className="rounded-lg border border-line bg-background/70 p-3">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
