# plot_arlitenet_loss.py
# 仅绘制 AR-LiteNet 的训练损失曲线（Train & Val）

import matplotlib.pyplot as plt
import numpy as np
import os

# =============================
# 1. 输入你的 AR-LiteNet 训练数据（按 epoch 填写）
# ⚠️ 请修改以下两行为你实际训练时记录的 loss 值！
# =============================
train_loss = [1.96, 1.62, 1.35, 1.16, 1.00, 0.93, 0.87, 0.82, 0.79, 0.73,
              0.64, 0.63, 0.62, 0.61, 0.58, 0.59, 0.59, 0.58, 0.58, 0.58]

val_loss   = [1.63, 1.33, 1.13, 0.87, 0.90, 0.80, 0.68, 0.75, 0.69, 0.60,
              0.55, 0.55, 0.55, 0.53, 0.51, 0.52, 0.52, 0.51, 0.51, 0.52]

# 确保长度一致
num_epochs = len(train_loss)
assert len(train_loss) == len(val_loss), "⚠️ train_loss 和 val_loss 长度不一致！"

# =============================
# 2. 绘图设置
# =============================
plt.figure(figsize=(10, 6))

epochs = np.arange(1, num_epochs + 1)

# 绘制曲线
plt.plot(epochs, train_loss, 'o-', color='#2E8B57', linewidth=2, markersize=4, label='Training Loss')
plt.plot(epochs, val_loss,   's--', color='#DC143C', linewidth=2, markersize=4, label='Validation Loss')

# 标题和标签
plt.title('AR-LiteNet: Training & Validation Loss Curve', fontsize=16, pad=20)
plt.xlabel('Epoch', fontsize=12)
plt.ylabel('Loss', fontsize=12)

# 网格
plt.grid(True, linestyle='--', alpha=0.4)

# 图例
plt.legend(fontsize=12, loc='upper right')

# 限制 y 轴范围（可选，让趋势更明显）
# plt.ylim(0.4, 2.2)  # 可根据你的数据调整

# 布局优化
plt.tight_layout()

# 保存图像
output_dir = 'plots'
os.makedirs(output_dir, exist_ok=True)
save_path = os.path.join(output_dir, 'arlitenet_loss_curve.png')
plt.savefig(save_path, dpi=300, bbox_inches='tight')
print(f"✅ AR-LiteNet 损失曲线已保存至: {save_path}")

# 显示图像
plt.show()
