import matplotlib.pyplot as plt
from PIL import Image
import os
import random

your_test_dir = '/path/to/your/test/algal_leaf'      # 你的测试集
web_data_dir  = '/root/autodl-tmp/test'               # 网上数据集（algal_spot）

def load_random_image(folder):
    imgs = [f for f in os.listdir(folder) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
    if not imgs: return None
    img_path = os.path.join(folder, random.choice(imgs))
    return Image.open(img_path).convert('RGB').resize((224, 224))

plt.figure(figsize=(10, 5))

# 左边：你的数据
plt.subplot(1, 2, 1)
img_your = load_random_image(your_test_dir)
if img_your:
    plt.imshow(img_your)
    plt.title("你的 algal_leaf")
plt.axis('off')

# 右边：网上的数据
plt.subplot(1, 2, 2)
img_web = load_random_image(web_data_dir)
if img_web:
    plt.imshow(img_web)
    plt.title("网上的 algal_spot")
plt.axis('off')

plt.suptitle("对比：你的数据 vs 网上数据")
plt.tight_layout()
plt.savefig('compare_your_vs_web.png')
plt.show()