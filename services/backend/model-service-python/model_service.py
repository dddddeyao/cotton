# model_service.py
from flask import Flask, request, jsonify
import torch
from torchvision import models
from PIL import Image
from torchvision import transforms
import os

app = Flask(__name__)

# =============================
# 修改这里：配置你的模型和类别
# =============================
MODEL_PATH = "cotton-best.pth"  # 你的模型文件名
LABELS_PATH = "class_labels.txt"  # 你的类别文件名
NUM_CLASSES = 7                    # 你的分类数量

# 检查文件
if not os.path.exists(MODEL_PATH):
    print(f"错误：模型文件 {MODEL_PATH} 不存在！")
    exit(1)
if not os.path.exists(LABELS_PATH):
    print(f"错误：类别文件 {LABELS_PATH} 不存在！")
    exit(1)

# 加载模型
model = models.resnet50(pretrained=False)
model.fc = torch.nn.Linear(2048, NUM_CLASSES)  # 改成你的类别数

try:
    model.load_state_dict(torch.load(MODEL_PATH, map_location='cpu'))
    print("加载 state_dict 成功")
except:
    print("加载失败，请检查模型文件格式")
    exit(1)

model.eval()

# 加载标签
with open(LABELS_PATH, 'r', encoding='utf-8') as f:
    labels = [line.strip() for line in f.readlines()]

# 预处理
transform = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

# 推理接口
@app.route('/predict', methods=['POST'])
def predict():

    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400

    file = request.files['file']
    print(f" 收到文件: {file.filename}")

    try:
        # 用 PIL 直接从内存中打开文件，避免落盘后再读取。
        image = Image.open(file.stream).convert("RGB")
        tensor = transform(image).unsqueeze(0)  # 添加 batch

        with torch.no_grad():
            outputs = model(tensor)
            probs = torch.nn.functional.softmax(outputs[0], dim=0)
            conf, idx = torch.max(probs, 0)
            label = labels[idx.item()] if idx.item() < len(labels) else "Unknown"

        return jsonify({
            "label": label,
            "confidence": round(conf.item(), 4)
        })

    except Exception as e:
        return jsonify({
            "error": str(e),
            "label": "Error",
            "confidence": 0.0
        }), 500

# 健康检查
@app.route('/health')
def health():
    return jsonify({"status": "ok", "model": "Custom ResNet50"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
