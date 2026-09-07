# DEAN / 3D · 模型展厅

[打开 3D 展厅](https://deanxizian.github.io/model-gallery/) · [自动部署记录](https://github.com/deanxizian/model-gallery/actions)

公开浏览和下载个人模型。支持鼠标拖动、滚轮缩放、触屏操作、自动旋转、重置视角、全屏和模型搜索；每个模型都有可分享的链接。

当前收录 X3 充电底座 P19、白色阅星瞳 X3、黑色 iPhone 17。底座下载提供清理版 STL 和 STEP；原始文件不经过网页转换器修改。网页使用单独生成的 GLB 显示底座。

## 添加一个模型

需要 Node.js 24 和 pnpm 11.19.0。安装依赖后，在本仓库中执行：

```sh
pnpm install --frozen-lockfile
pnpm model:add --file /你的路径/model.glb --id my-model --name "新模型" --poster /你的路径/cover.png
pnpm dev
```

`--poster` 可省略。支持 GLB 和 STL；STL 默认单位为毫米、Z 轴朝上，可用 `--units mm` 和 `--up-axis z` 指定。GLB 应从 Blender 导出时包含材质、贴图并使用标准 glTF 坐标。

命令会创建 `public/models/my-model/`。编辑其中的 `model.json` 可补充介绍、尺寸、版本和下载文件。新模型 ID 使用小写英文、数字、连字符，不能与已有目录重复。

确认本地预览后提交：

```sh
git add public/models/my-model
git commit -m "Add my-model"
git push
```

推送到 `main` 后，GitHub Actions 自动校验、构建并发布到 GitHub Pages。不需要手动构建 GLB、不需要改页面代码，也不需要部署密钥。构建失败时，上一份已发布网站继续可用；错误可在 Actions 页面查看。

也可直接使用 GitHub 网页的 **Add file → Upload files** 上传完整模型文件夹，再提交到 `main`。大文件更适合使用本地 Git 提交。

## 文件夹与说明文件

```text
public/models/my-model/
├── model.json
├── model.glb       # 或 model.stl，用于预览
├── poster.png      # 可选封面
└── model.step      # 可选附加下载
```

最小示例：

```json
{
  "id": "my-model",
  "name": "新模型",
  "subtitle": "白色 · 桌面配件",
  "description": "模型介绍。",
  "preview": "model.glb",
  "downloads": [{ "label": "GLB", "file": "model.glb" }]
}
```

常用可选项：

| 字段 | 用途 | 示例 |
| --- | --- | --- |
| `poster` | 缩略图文件 | `"poster.png"` |
| `order` | 排序，小的在前 | `10` |
| `dimensions` | 展示用尺寸说明 | `"68.30 × 39.37 × 13.75 mm"` |
| `revision` | 版本 | `"P19"` |
| `cameraOrbit` | 水平角、俯仰角、观察距离 | `"32deg 56deg 110%"` |
| `units` | STL 源文件单位 | `"mm"`、`"cm"`、`"m"` |
| `upAxis` | STL 源文件朝上方向 | `"z"` 或 `"y"` |
| `note` | 模型说明 | `"尺寸为机身尺寸，不包含按键凸起。"` |
| `source` | 来源链接 | `{"label":"原始资源","url":"https://…"}` |

预览支持 **GLB、STL**。STEP/STP、OBJ、3MF、BLEND、ZIP 可作为下载文件；要展示这些模型，请同时提供 GLB 或 STL 预览。缩略图支持 PNG、JPEG、WebP、AVIF。

项目校验将单个模型资源限制在 95 MiB 以内。GLB 贴图需要内嵌；不要把 Git LFS 指针文件当作模型上传。尺寸文字是手动填写的说明，不会自动更改几何尺寸。

## Blender 工程

`sources/` 保存当前三个模型的 Blender 工程副本，供在 GitHub 下载。它不进入网页部署目录；更新网页模型时，需要从 Blender 重新导出 GLB/STL，并更新 `public/models/` 中对应文件。

建模原项目与这个仓库互相独立，历史迭代、旧版本和本地归档不在本仓库中。

## 开发和部署

```sh
pnpm dev       # 自动生成目录，启动开发服务器
pnpm test      # 文件和元数据校验测试
pnpm build     # 校验资源、转换 STL 预览、TypeScript 检查、构建
pnpm preview   # 检查 dist 中的生产构建
```

使用 React、Vite 和 Google `<model-viewer>`。`scripts/build-catalog.mjs` 自动扫描模型目录，生成 `public/catalog.json`，并用 Three.js 与 glTF Transform 转换 STL 预览。原始下载文件逐字节复制到部署目录，预览材质及法线的处理不改变它们。

GitHub Pages 的发布源为 **GitHub Actions**。主分支推送执行完整构建和部署，Pull Request 仅构建校验。工作流位于 `.github/workflows/deploy.yml`，使用 GitHub 内置令牌，不包含个人访问令牌。

官方参考：[GitHub Pages 自定义工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)、[model-viewer 控制示例](https://modelviewer.dev/examples/staging-and-camera-control.html)。

## 模型来源

X3 底座与白色 X3 由本地建模项目导出。iPhone 17 的几何与贴图来自 [Apple 公开 AR 资源](https://www.apple.com.cn/105/media/ww/iphone-17/2025/b2c72de3-1cbc-4e24-b4d3-23c7abcec4ec/ar/iphone-17-p-sim.usdz)，并在模型说明中保留来源；产品名称、商标及第三方模型的权利归各自权利人。本仓库不对第三方资源另行授予许可。

外观参考模型不等同于机械制造 CAD；X3 底座的实际夹紧程度与充电接触需以打印试装为准。
