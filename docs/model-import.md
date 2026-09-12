# 已完成模型与配件目录

当前接入 11 款 Apple 设备、阅星瞳 X3 和 M5Stack StickS3，共 13 件设备；另有 X3 底座、Type-C 转接头，以及 iPad 的 Apple Pencil 二代共 3 件配件。只有已完成的模型进入展厅，暂缓建模的产品不会生成空白卡片。`product.json` 保留产品资料与已确认的拥有信息，`model.json` 控制页面展示；不把官方型号候选、容量和内存选项混作实机配置。待确认项目见 [待补充设备信息](device-records.md)。

配件与资源位于所属产品的路径下：

```text
public/models/xteink-x3/
├── model.json
├── model-owned.glb
├── XTEINK_X3_White_Owned.blend
└── accessories/
    ├── x3-dock/
    │   ├── model.json
    │   ├── X3_One_Piece_P22_Owned.blend
    │   ├── X3_One_Piece_Dock_P22.stl
    │   └── X3_One_Piece_Dock_P22.step
    └── x3-type-c-adapter/
        ├── model.json
        ├── model.glb
        ├── X3_Type_C_Adapter.blend
        └── X3_Type_C_Adapter.step
```

`parentId` 必须与目录中的所属产品一致，不支持配件再次嵌套配件。`pnpm model:add --parent xteink-x3` 会写入对应目录。网页使用 `#xteink-x3/x3-dock` 和 `#xteink-x3/x3-type-c-adapter`，旧 `#x3-dock` 链接仍可打开。

StickS3 位于 `public/models/m5stack-sticks3/`，采用已按实物照片修订的完整外观版 `real-device-screen-fit`，包括默认 STICK S3 屏幕。提供完整 GLB 和对应 Blender 工程，封面由现成正面预览生成缩略图；外壳单独的 STL 不作为整机打印文件提供。公开规格按 [M5Stack 官方文档](https://docs.m5stack.com/en/core/StickS3)填写，原外壳来源的许可保留在同目录的 `m5stack-source-license.txt`。

Apple Pencil 第二代位于 `public/models/ipad-pro-m2-12-9/accessories/apple-pencil-2/`，页面地址为 `#ipad-pro-m2-12-9/apple-pencil-2`。模型从官方 AR 资源单独提取，保留原有网格和贴图，提供 GLB 与 Blender 下载；只在 iPad 页面中切换，不单列为设备。规格按 [Apple 技术规格](https://support.apple.com/zh-cn/111889)填写，确认支持该款 M2 iPad Pro 的磁吸配对、无线充电和悬停。配件自己的购入信息保存在其 `product.json` 中，并在规格中展示为 2025年4月、国行，不从 iPad 购入时间或地区推定。

AirTag 第一代位于 `public/models/airtag-1/`，采用已完成的官方 AR 提取模型，提供 GLB 和 Blender 下载。按 [Apple 第一代技术规格](https://support.apple.com/zh-cn/111847)记录 2021 年、U1 芯片、31.9 mm 直径、8.0 mm 厚度和 11 g 重量；型号 A2187 与第二代分开。用户确认 2021年12月购入、国行、在役。

上述三款新增模型的复制校验记录位于各自目录的 `asset-import.json`，预览与下载文件保持源文件字节不变；完整制作资料和参考照片留在网站仓库外。StickS3 与 AirTag 按确认的购入时间参加设备排序，Pencil 作为配件不单独计数或排序到设备列表。

底座当前采用 P22，预览、封面与 STL、STEP、Blender 下载同步更新。充电头安装位沿机身插入方向下移 0.70 mm，承托面和转接头尺寸保留；新位置的充电与稳定性仍待试装。

P19、P21 的已发布文件和旧链接继续可用。历史路径与文件校验值记录在 `scripts/legacy-assets.mjs`，历史生成的 GLB 和缩略图保存在 `public/legacy/`，不会被目录重建清理。更新模型时应保留旧目录缓存引用的资源。STL 转换只用于网页预览，不修改送印文件。

Apple 模型按现有 `models/apple/*/product.json` 与其成品 GLB、Blender 文件导入，复制时保持原字节。区域相关外观以完成的模型为准，实机地区未确认时不会据此反推型号。Type-C 转接头从已有装配工程提取为独立预览，实测尺寸与未实测的触针参数分开记录。

用户后续补充的拥有信息保存在网站产品目录的 `product.json` 和 `model.json`；再次导入时应保留这些已确认信息，不能用源模型中未指定的配置覆盖。官方匹配型号与实机抄录编号分开记录。

`product.json` 的容量与内存仅记录实际拥有的配置，不保留整条产品线的可选容量或内存规则。`asset` 中的文件路径相对于该 `product.json`，只列已导入文件，并与当前 `model.json` 的预览和下载保持一致；未导入的源项目预览图、验证报告及文档不声明为可用文件。

Series 6 当前接入最新的无表带表壳模型，页面预览与 GLB 下载使用 `model-gps-case-only.glb`，Blender 下载和封面也同步为无表带版本。表冠材质继续匹配已确认的 GPS 版本；与新的源 GLB 相比，二进制几何、纹理数据保持一致。实物拥有规格中的表带记录保留，模型不含表带不代表实物从未配过表带。源文件和旧版网站文件保留，审计记录见该目录的 `gps-case-only-adaptation.json`。

左侧设备列表默认按购入时间从近到远排列，未知日期放在末尾；同日或同月并列时沿用目录 `order`。配件仍使用自己的 `order` 排列在所属设备中。

下载菜单按 GLB、Blender、STL、STEP 排列。每个预览 GLB 自动进入下载菜单，STL 转换出的 GLB 也可下载；Blender 工程是可选格式，现有工程方便提供时再加入。X3 本体的 GLB、Blender 和封面使用用户提供的天气资讯屏幕，背标与触点材质按实物背面照片更新，与 P22 装配工程中的设备外观一致。照片仅作本地参考，背标以平面几何绘制；机身和触点的尺寸、位置保留。旧阅读页版本和已发布资源继续可用。转接头工程从 P21 场景提取；底座下载为完整 P22 装配工程，包含同步下移的转接头与触针动画。独立转接头的固定尺寸不随底座安装位置改变，底座 STL 和 STEP 也不受此次外观更新影响。
