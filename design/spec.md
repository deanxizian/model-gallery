# Model gallery visual specification

The complete desktop concept is `concept.png`, generated with the built-in Image Gen tool for this project. It is a layout reference; public model geometry always comes from the user's actual files.

- Native concept: 1536 × 1024. White header 74 px high, white left rail about 25% width (maximum 380 px), light gray main stage, white metadata band below.
- Colors: page/header/rail #ffffff; stage #f1f2f3; primary text #17191b; secondary text #747b84; lines #e7e9ec; selected row #f2f8ff with restrained blue border #b5d5ff; actions #202224.
- Type: system sans-serif, Chinese PingFang SC/Noto Sans CJK. Brand 25 px/650, rail heading 22 px/600, row title 18 px/550, supporting copy 15 px/400; model heading 30 px/600; controls 17 px/500. Eight-pixel spacing rhythm.
- Components: Header; ModelLibrary (search, count, selectable thumbnail rows, empty state); ModelStage (WebGL model, actual loading/error states, fullscreen and rotate/reset controls); ModelDetails (title, description, dimensions, revision, download actions).
- Copy lock: DEAN / 3D, 模型展厅, GitHub, 模型, 搜索模型, X3 充电底座, P19 · 单体底座, 阅星瞳 X3, 白色 · 外观模型, iPhone 17, 黑色 · 外观模型, 自动旋转, 重置视角, 拖动旋转 · 滚轮缩放, 为阅星瞳 X3 设计的一体式充电底座。, 68.30 × 39.37 × 13.75 mm, P19, 下载 STL, STEP.
- Icons: 1.6 px stroke, rounded joins, search magnifier, full screen corners, rotate arrows, reset/view cube, download arrow. Lucide equivalents are intentional.
- Functional additions permitted: loading/error/empty-search messages; the current model's download formats, accurate provenance and description, keyboard focus states, search clear button and mobile model selection layout. They are necessary for the real gallery workflow.
- Intentional asset deviation: generated concept depicts an incorrect round X3 and approximate dock. Use actual GLB/STL geometry and real model renders, not these invented product forms. No generated product image is used as a substitute for interactive 3D.
- Mobile ≤760 px: compact header, horizontal model rail with search above, full-width stage at least 350 px, metadata and downloads stack. Preserve hierarchy and all controls without horizontal page overflow.
- Default auto rotation off; respect reduced motion. Model switching uses URL hash for shareable deep links. Selected state and camera controls are real local state.
- Backend: public static site. Model metadata and files live in Git; a build generates the catalog, converts STL to GLB for web display, checks references, and deploys to GitHub Pages on main.
