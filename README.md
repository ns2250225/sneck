# 颈椎贪吃蛇 · Neck Snake

用**头部动作**控制的贪吃蛇网页游戏。对着摄像头点头、歪头即可操控小蛇，边玩边活动颈椎。纯前端实现（Vue 3 + TypeScript + Vite + Canvas + MediaPipe Face Landmarker），摄像头画面只在浏览器本地处理，**不上传任何视频或人脸数据**。

## ✨ 功能特性

### 游戏模式
- **经典模式**：传统贪吃蛇玩法，撞墙即结束
- **限时模式**：可配置时长，边界穿越（穿墙）
- **障碍模式**：逐关增加障碍，挑战难度递增
- **无尽模式**：边界穿越，轻松畅玩

### 游戏内容
- 六种食物：苹果、香蕉、金色星星、蓝色能量球（减速）、闪电（加速）、特殊果实（随机效果）
- 连击加分机制
- 成就系统（10 项成就）
- 皮肤系统：8 款蛇皮肤 / 6 款地图 / 6 款食物皮肤
- 本地统计：日 / 周游戏次数、近 7 天游戏时长趋势

### 头部控制（核心亮点）
- MediaPipe Face Landmarker 人脸关键点 → 3D 面部法向量估算 Yaw / Pitch / Roll
- One Euro Filter 平滑滤波，动作识别稳定不抖动
- 阈值 + 中立区 + 冷却 + 反向锁定，避免误触发
- 姿态校准（保持 2 秒）+ 四方向动作测试，支持一键反转左右 / 上下映射
- 识别性能自适应降级，低端设备也能流畅运行

### 多种操控方式
- 头部动作（摄像头）
- 触屏方向键（支持长按）、滑动手势
- 键盘：方向键 / WASD 移动，空格暂停

### 健康关怀
- 休息提醒、单局时长提醒
- 音效与背景音乐（Web Audio 实时合成，无音频资源文件）、震动反馈
- 摄像头异常处理：权限被拒 / 摄像头被占用 / 无人脸 / 多人脸 / 动作过大均有友好提示
- 切到后台自动暂停并释放摄像头

### 适配
- 竖屏 / 横屏响应式布局
- 支持 iPhone Safari、Android Chrome、iPad、桌面浏览器

## 🛠 技术栈

| 分类 | 技术 |
| --- | --- |
| 框架 | Vue 3（Composition API）+ Vue Router |
| 语言 | TypeScript |
| 构建 | Vite 5、vue-tsc 类型检查 |
| 渲染 | Canvas 2D（自研游戏引擎） |
| 头部识别 | MediaPipe Tasks Vision（Face Landmarker） |
| 图标 | lucide-vue-next |

## 🚀 快速开始

### 环境要求

- Node.js ≥ 18
- 浏览器摄像头权限
- 访问摄像头需要 HTTPS（localhost 除外）

### 安装与运行

```bash
# 安装依赖（postinstall 会自动：
#   1. 复制 MediaPipe wasm 到 public/mediapipe/wasm
#   2. 下载 face_landmarker.task 模型到 public/models）
npm install

# 本地开发，浏览器打开 http://localhost:5173
npm run dev

# 自签名 HTTPS 开发模式，用于手机 / 平板通过局域网 IP 访问（摄像头需要 HTTPS）
npm run dev:https
```

### 构建与部署

```bash
npm run build     # 类型检查 + 打包，产物在 dist/
npm run preview   # 本地预览构建产物
```

`dist/` 为纯静态文件，可部署到任意静态服务器或 CDN，**线上访问需要 HTTPS**。

### 模型下载失败？

若安装时模型自动下载失败，手动下载 [face_landmarker.task](https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task) 放到 `public/models/` 目录即可；运行时也会自动回退到官方 CDN 加载。

## 🎮 玩法说明

1. 首次进入选择摄像头，进行**姿态校准**（保持自然姿势 2 秒）
2. 完成**四方向动作测试**（左歪头、右歪头、抬头、低头）
3. 选择游戏模式开始游戏
4. 用头部动作控制蛇的方向，吃食物成长、得分，避免撞到自己
5. 不方便动头时，可随时切换触屏 / 键盘操作

## 📁 项目结构

```
src/
├── core/        游戏引擎（Snake / Food / GameMap / Collision / GameEngine / Renderer）
├── vision/      摄像头与头部识别（CameraManager / FaceDetector / HeadPoseEstimator /
│                MotionFilter / Calibration / HeadController / HeadTracker）
├── systems/     音频、成就、皮肤、存储、休息提醒
├── stores/      全局状态（Pinia 风格，本地持久化）
├── pages/       页面（首页 / 模式 / 游戏 / 皮肤 / 成就 / 统计 / 设置 / 帮助）
├── components/  通用组件
└── utils/       工具函数（设备检测、性能自适应等）

scripts/         prepare-assets.mjs（安装后自动准备 wasm 与模型）
```

## 🔒 隐私说明

- 不上传视频，不保存人脸图像或关键点数据
- 无身份识别，无第三方统计
- 所有游戏数据仅保存在浏览器 LocalStorage
- 摄像头画面仅在内存中用于姿态计算，刷新即消失

> ⚠️ 本游戏用于日常放松颈椎，**不构成也不替代医疗建议或康复训练**。如有颈椎疾病，请遵医嘱。

## 📄 许可证

仅供学习交流使用。
