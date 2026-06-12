# test_model.py
import torch
import torch.nn as nn
from torchvision import datasets, transforms
import timm
import os
from torch.utils.data import DataLoader
from sklearn.metrics import classification_report, confusion_matrix
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns

# =============================
# 1. 配置参数
# =============================
data_dir = '/root/autodl-tmp/datasets'           # 数据集根目录
model_path = 'best_efficientnet.pth'            # 最佳模型权重路径
model_name = 'efficientnet_b0'
num_classes = 13
img_size = 224
batch_size = 32
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

print(f"🚀 使用设备: {device}")
print(f"📂 测试集路径: {os.path.join(data_dir, 'test')}")

# =============================
# 2. 数据预处理（必须和训练一致）
# =============================
normalize = transforms.Normalize(
    mean=[0.485, 0.456, 0.406],
    std=[0.229, 0.224, 0.225]
)

test_transform = transforms.Compose([
    transforms.Resize((img_size, img_size)),
    transforms.ToTensor(),
    normalize,
])

# 加载测试集
test_dataset = datasets.ImageFolder(root=os.path.join(data_dir, 'test'), transform=test_transform)
test_loader = DataLoader(test_dataset, batch_size=batch_size, shuffle=False, num_workers=4)

class_names = test_dataset.classes
print(f"✅ 测试样本数: {len(test_dataset)}")
print(f"✅ 类别: {class_names}")

# =============================
# 3. 加载模型
# =============================
model = timm.create_model(model_name, pretrained=False, num_classes=num_classes)
model.load_state_dict(torch.load(model_path, map_location=device))
model = model.to(device)
model.eval()  # 设置为评估模式

print(f"✅ 模型权重已加载: {model_path}")

# =============================
# 4. 测试循环
# =============================
all_preds = []
all_labels = []
running_corrects = 0
total_loss = 0.0
criterion = nn.CrossEntropyLoss()

with torch.no_grad():  # 不计算梯度
    for inputs, labels in test_loader:
        inputs = inputs.to(device)
        labels = labels.to(device)

        outputs = model(inputs)
        loss = criterion(outputs, labels)
        total_loss += loss.item() * inputs.size(0)

        _, preds = torch.max(outputs, 1)

        running_corrects += torch.sum(preds == labels.data)
        all_preds.extend(preds.cpu().numpy())
        all_labels.extend(labels.cpu().numpy())

test_loss = total_loss / len(test_dataset)
test_acc = 100. * running_corrects.double() / len(test_dataset)

print(f"\n🧪 测试结果:")
print(f"Loss: {test_loss:.4f}")
print(f"Accuracy: {test_acc:.2f}%")

# =============================
# 5. 分类报告（精确率、召回率、F1）
# =============================
print("\n📋 分类报告:")
print(classification_report(all_labels, all_preds, target_names=class_names))

# =============================
# 6. 混淆矩阵
# =============================
cm = confusion_matrix(all_labels, all_preds)

plt.figure(figsize=(10, 8))
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', xticklabels=class_names, yticklabels=class_names)
plt.title('Confusion Matrix - Test Set')
plt.xlabel('Predicted')
plt.ylabel('True')
plt.xticks(rotation=45)
plt.yticks(rotation=0)
plt.tight_layout()
cm_path = 'confusion_matrix_test.png'
plt.savefig(cm_path)
plt.show()
print(f"📈 混淆矩阵已保存为: {cm_path}")