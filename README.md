# Model Gallery · 模型藏馆

[GitHub Pages](https://deanxizian.github.io/model-gallery/) · [Vercel](https://model-gallery-theta.vercel.app/) · [GitHub 自动部署记录](https://github.com/deanxizian/model-gallery/actions)

为拥有过的数码产品留一份 3D 存档，记录规格、购入时间和使用回忆。按「在役 / 已退役」和品牌标签组合筛选产品，公开预览和下载模型。支持拖动、缩放、触屏操作、自动旋转、重置视角和全屏。

当前收录 11 件产品、13 个模型视图：10 件 Apple 产品与白色阅星瞳 X3。Apple Watch Series 6 与 AirPods Pro 初代已退役，其余 9 件设备在役；购入时间与实际配置见 [设备档案清单](docs/待补充设备信息.md)。X3 充电底座与 Type-C 充电转接头都在 X3 页面内，文件位于 `public/models/xteink-x3/accessories/`，不单独计入产品目录。搜索配件名称会找到所属产品，原有 `#x3-dock` 链接仍可直接打开底座预览。

点击「下载模型」后按统一顺序选择 GLB、Blender、STL、STEP；只显示当前模型实际提供的格式。每个模型均提供 GLB，Blender 工程为可选，有对应工程时再提供。当前 13 个模型均已补齐对应 Blender 工程；底座另外提供 STL、STEP，转接头另外提供 STEP。构建会自动把预览 GLB 加入下载菜单，包括从 STL 生成的底座预览，不重复存储大文件。原始 STL / STEP 下载内容保持不变。底座当前采用 P21 Clean v3，旧版文件链接仍保留原文件内容。

本次导入范围与目录约定见 [模型导入说明](docs/模型导入.md)；实际配置及回复模板见 [待补充设备信息](docs/待补充设备信息.md)，已按地区和版本匹配的编号见 [官方型号对应表](docs/官方型号对应表.md)。

## 添加一个模型

需要 Node.js 24 和 pnpm 11.19.0。安装依赖后，在本仓库中执行：

```sh
pnpm install --frozen-lockfile
pnpm model:add --file /你的路径/model.glb --id my-model --name "新模型" --poster /你的路径/cover.png
pnpm dev
```

`--poster` 可省略。支持 GLB 和 STL；STL 默认单位为毫米、Z 轴朝上，可用 `--units mm` 和 `--up-axis z` 指定。GLB 应从 Blender 导出时包含材质、贴图并使用标准 glTF 坐标。

命令会创建 `public/models/my-model/`。编辑其中的 `model.json` 补充拥有记录、参数规格、来源和下载文件。新模型 ID 使用小写英文、数字、连字符，不能与已有目录重复。可通过 `--status active`、`--category "智能手机"`、`--brand "Apple"` 设置分类信息；未确认的状态默认是 `unknown`，不会自动列入在役。

添加配件时用 `--parent` 指向已有产品，配件沿用所属产品的拥有记录：

```sh
pnpm model:add --file /你的路径/dock.stl --id my-dock --name "充电底座" --parent my-model
```

先创建工作分支，再添加或更新模型：

```sh
git switch -c feat/add-my-model
git add public/models/my-model
git commit -m "Add my-model"
```

平时先在分支上完成修改和验证；只有明确要求「提 PR」时才提交 Pull Request。PR 需要经过 GitHub Codex Code Review，处理审查意见并通过构建检查后，再合并到 `main`，最后删除已合并的分支。完整规则见 [AGENTS.md](AGENTS.md)。

合并到 `main` 后，GitHub Actions 和 Vercel 分别自动校验、构建并发布正式站。不需要手动构建 GLB、不需要改页面代码，也不需要部署密钥。构建失败时，上一份已发布网站继续可用；错误可在对应平台的部署记录中查看。

也可使用 GitHub 网页的 **Add file → Upload files** 上传完整模型文件夹，提交到新分支后走同样的 PR 审查流程。大文件更适合使用本地 Git 提交。

## 文件夹与说明文件

```text
public/models/my-model/
├── model.json
├── model.glb       # 或 model.stl，用于预览
├── poster.png      # 可选封面
└── model.step      # 可选附加下载
```

产品档案示例（示例日期与配置仅作格式演示）：

```json
{
  "id": "my-model",
  "name": "新模型",
  "subtitle": "白色 · 阅读器",
  "description": "配备电子墨水屏与实体翻页按键的便携阅读器。",
  "category": "电子书阅读器",
  "ownership": {
    "status": "active",
    "acquired": "2026年7月",
    "specification": "白色"
  },
  "specGroups": [
    { "title": "机身", "items": [{ "label": "重量", "value": null }] }
  ],
  "specSources": [
    { "label": "官方规格（替换为产品官方链接）", "url": "https://example.com/specs", "checkedAt": "2026-09-07" }
  ],
  "preview": "model.glb",
  "downloads": [{ "label": "GLB", "file": "model.glb" }]
}
```

常用可选项：

| 字段                 | 用途                                     | 示例                                                                |
| -------------------- | ---------------------------------------- | ------------------------------------------------------------------- |
| `poster`             | 缩略图文件                               | `"poster.png"`                                                      |
| `order`              | 同一购入时间或日期未知时的次序；配件按此排序，小的在前 | `10`                                                                |
| `dimensions`         | 展示用尺寸说明                           | `"68.30 × 39.37 × 13.75 mm"`                                        |
| `revision`           | 可选版本或配色                           | `"白色"`                                                            |
| `cameraOrbit`        | 水平角、俯仰角、观察距离                 | `"32deg 56deg 110%"`                                                |
| `units`              | STL 源文件单位                           | `"mm"`、`"cm"`、`"m"`                                               |
| `upAxis`             | STL 源文件朝上方向                       | `"z"` 或 `"y"`                                                      |
| `note`               | 存档说明（不在页面展示）                 | `"尺寸为机身尺寸，不包含按键凸起。"`                                |
| `source`             | 存档来源链接（不在页面展示）             | `{"label":"原始资源","url":"https://…"}`                            |
| `parentId`           | 配件所属产品 ID；本体不填                | `"xteink-x3"`                                                       |
| `brand` / `category` | 品牌 / 产品类别                          | `"Apple"` / `"智能手机"`                                            |
| `ownership`          | 拥有记录，仅本体填写                     | 见上例                                                              |
| `specGroups`         | 分组参数，缺失值用 `null` 显示「待补充」 | 见上例                                                              |
| `specSources`        | 规格来源与核对日期                 | `[{"label":"官方规格","url":"https://…","checkedAt":"2026-09-07"}]` |

`ownership.status` 可为 `active`（在役）、`retired`（已退役）、`unknown`（待确认）。可选字段包括 `acquired`（购入时间）、`specification`（我的规格）和 `memory`（真实使用回忆）。退役时间暂不收集或展示，旧数据的 `retired` 字段仍可兼容。`specification` 是一段自由文本，支持换行，例如 `"黑色 · 512 GB"`，也可以记录处理器、内存、套装等实际配置，无须按配色或容量拆字段。未知信息省略，日期按用户提供的精度填写，例如只知道月份就不补造日期。退役产品保留原来的规格、回忆和配件；更新状态即可归档。旧档案的 `color`、`configuration` 仍兼容，会合并展示；同时填写时以新的 `specification` 为准。

标题下的 `description` 只简要介绍产品本身，用语正式，不描述模型制作或存档目的。参数规格默认折叠，标题与拥有记录、规格分组左对齐，箭头紧挨标题右侧，收起时朝右、展开时朝下；切换模型恢复折叠。展开后分组从上到下排列；宽屏时每组参数分两列，窄屏时改为单列，避免完整分组并排造成大块空白。页面末尾只保留简短的来源名称和链接，核对日期保留在数据中。只记录实际拥有的那一款，容量与配色不罗列官方的其他选项。已核对的通用硬件指标仍可引用官方规格；随附配件不能替代实际配置。拥有记录直接展示购入时间和一个「我的规格」文本区，不再重复设置「我的版本」分组；容量、内存和网络等技术信息归入硬件规格；列表显示规格摘要，详情保留完整文字。未核实的事实不猜测；X3 已由用户确认使用原装随附的 16 GB 存储卡。没有回忆文字时不显示回忆区。配件必须直接归属一个存在的产品，构建会拒绝无主配件、循环引用和重复参数名。

填写 `specGroups` 后必须提供至少一项 `specSources`。产品参数引用官方 HTTPS 页面。零售部件号可补充第一方零售商产品目录作为匹配依据，以 `kind: "retailer"` 区分，来源名称写实际发布方，不能标成 Apple 官方资料；页面字段名统一为「硬件型号」「零售部件号」，不附加括号匹配说明；在 `product.json` 的 `identification.matched_retail_part_number` 记录范围、来源和日期，保留实机标识未读取的状态。原购套装与后来更换的表带分开保存；不能仅根据相似配色、地区后缀推测编号。未知项继续用 `null`，用户要求省略的字段不出现在 `specGroups` 中；`checkedAt` 必须是真实日期，且不能晚于当前日期，默认按 UTC 核对。来源记录使用本地日历日期时，可显式填写 `timeZone`（如 `Asia/Shanghai`），保留原记录的日期，不猜造核对时刻。自制配件可显式记录 `{"kind":"local-design","label":"个人设计与实测记录","checkedAt":"2026-09-07"}`，其中说明与日期应按实际记录填写，不能省略依据或套用在产品本体上。普通配件仍使用官方来源。配件省略 `brand`，沿用所属产品的品牌。

预览支持 **GLB、STL**。STEP/STP、OBJ、3MF、BLEND、ZIP 可作为下载文件；要展示这些模型，请同时提供 GLB 或 STL 预览。缩略图支持 PNG、JPEG、WebP、AVIF。

`poster` 填原始封面即可。每次构建通过 [Sharp](https://sharp.pixelplumbing.com/api-resize/) 自动生成最长边 512px、质量 90、保留完整画面和透明度的 WebP 缩略图，为高分屏和页面放大保留细节。设备列表加载该小图，首项优先加载，其余使用浏览器懒加载。生成图以内容哈希命名，封面更新时自动更换 URL；原始封面路径与文件保持不变。缩略图独立于 3D 模型，列表不会为生成小图而下载 GLB。

项目校验将单个模型资源限制在 95 MiB 以内。GLB 贴图需要内嵌；不要把 Git LFS 指针文件当作模型上传。尺寸文字是手动填写的说明，不会自动更改几何尺寸。

## Blender 工程

`sources/` 保留最初三个模型的历史 Blender 工程副本，不进入网页部署目录。网页提供的当前工程放在各产品或配件目录，并在 `model.json` 的 `downloads` 中登记。Blender 工程不强制要求；有对应源工程且方便提供时再加入下载，同时核对工程与预览版本。

X3 本体使用白色版原工程；转接头工程从生成当前 GLB 的 P21 装配场景提取，保留原有几何与材质。底座工程在原 P21 装配工程副本中更新了当前 Clean v3 网格，保留原装配参考与设计脚本；原始工程及 STL、STEP 文件保持不变。

建模原项目与这个仓库互相独立，历史迭代、旧版本和本地归档不在本仓库中。

## 开发和部署

```sh
pnpm dev       # 自动生成目录，启动开发服务器
pnpm test      # 文件、元数据、配件关系、状态筛选和旧链接测试
pnpm build     # 校验资源、转换 STL 预览、TypeScript 检查、构建
pnpm preview   # 检查 dist 中的生产构建
```

使用 React、Vite 和 Google `<model-viewer>`。`scripts/build-catalog.mjs` 自动扫描模型目录，生成 `public/catalog.json`，并用 Three.js 与 glTF Transform 转换 STL 预览。原始下载文件逐字节复制到部署目录，预览材质及法线的处理不改变它们。

GitHub Pages 的发布源为 **GitHub Actions**。主分支推送执行完整构建和部署，Pull Request 仅构建校验。工作流位于 `.github/workflows/deploy.yml`，使用 GitHub 内置令牌，不包含个人访问令牌。

Vercel 项目 `model-gallery` 已连接同一 GitHub 仓库，以 `main` 为生产分支，功能分支仅用于预览。`vercel.json` 提供 Vite 构建配置，使用 Node.js 24、`pnpm install --frozen-lockfile` 和 `pnpm test && pnpm build`。项目已设置 `ENABLE_EXPERIMENTAL_COREPACK=1`，按 `packageManager` 固定 pnpm 版本；参见 [Vercel Corepack 配置](https://vercel.com/docs/builds/configure-a-build#corepack)。

官方参考：[GitHub Pages 自定义工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)、[model-viewer 控制示例](https://modelviewer.dev/examples/staging-and-camera-control.html)。

## 模型来源

X3 底座、充电转接头与白色 X3 由本地建模项目导出。10 件 Apple 产品从本地已完成模型导入，几何与贴图原始来源为 Apple 公开 AR 资源，例如 [iPhone 17](https://www.apple.com.cn/105/media/ww/iphone-17/2025/b2c72de3-1cbc-4e24-b4d3-23c7abcec4ec/ar/iphone-17-p-sim.usdz)。各产品的 `product.json` 与 `model.json` 保留来源和待确认信息；产品名称、商标及第三方模型的权利归各自权利人。本仓库不对第三方资源另行授予许可。

外观参考模型不等同于机械制造 CAD；X3 底座的实际夹紧程度与充电接触需以打印试装为准。
