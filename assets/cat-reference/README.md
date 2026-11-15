# 基于用户参考图的双猫设计

两张用户提供的参考图为角色身份与绘画风格依据，项目副本保存在 `references/`。

- 白灰小猫：白色身体、灰耳朵、额头中央灰斑、灰爪尖与灰尾巴。
- 灰色小猫：冷灰色身体、粉色耳内、夸张的表情。
- 共同特点：大圆头、短小身体、灰褐色粗线条、轻微手绘纹理。

本轮使用 `codex-image2` 技能的原生 CLI，调用 `gpt-image-2`，两张图均作为 edit 输入，输出 1536×1024，quality medium。

`hero-prompt.txt` 与 `stickers-prompt.txt` 为完整生成提示词。

`two-cats-hero.png` 为首页背景概念；`relationship-stickers.png` 为六种关系场景整板；`scene-01.png` 到 `scene-06.png` 从整板裁切，用于网页预览。

新预览入口为 `/cat-reference.html`。不替换旧素材或主测试页面。当前为AI延展的角色概念，表情与姿态有变化，未宣称和参考图逐像素一致。

## 页面批注后的修订

正式品牌现为「亲密来信 / CLOSER NOTES」，面向伴侣、挚友等重要关系。

- `two-cats-hero-pout.png`：对原首页插画局部编辑，左边白灰小猫嘟嘴、稍微生气地看向右边灰猫；模型 gpt-image-2，1536×1024，medium。完整提示词为 `revision-hero-prompt.txt`。
- `white-cat-comforts-gray-calm.png`：左边白灰小猫以平静温柔的表情伸手安慰右边落泪的灰猫，用于页头与第一张维度卡。模型 gpt-image-2，1024×1024，medium；经过一次针对左猫泪眼的修订，完整提示词为 `revision-comfort-prompt.txt` 与 `revision-comfort-face-prompt.txt`。
- 原图和初次安慰版本均保留。`scripts/prepare-cat-assets.py` 将最终素材处理到 `assets/cats/`，供正式网页使用。

## 答题进度的小猫送信

`progress-sprites.png` 以第一版的 `scene-02.png` 为参考，将持信白灰小猫与等信灰猫分开，用于进度动画。使用 codex-image2 技能，模型 `gpt-image-2`，尺寸 1536×1024，quality medium；完整提示词保存在 `progress-sprites-prompt.txt`。处理脚本去除边缘背景、分别裁切并导出 `assets/cats/progress-sender.png` 与 `progress-receiver.png`（280×320 透明 PNG）。

正式页头、首页与维度插画继续使用第一版原图；此前安慰、嘟嘴修订仅留档。

第一题单独使用 `progress-pickup.png`：白灰小猫俯身伸爪捡起脚边的爱心信封，第二题起继续使用原有 `progress-sender.png`。第一题选择答案后仍显示捡信动作，返回第一题也恢复该姿态，位置继续按实际已完成题数计算。以原持信小猫为参考，通过 codex-image2 技能的 gpt-image-2 编辑生成，1024×1024，quality medium；最终完整提示词为 `progress-pickup-prompt.txt`。处理脚本导出 `assets/cats/progress-pickup.png`（280×320）。

## 结果页的拥抱

`result-hug.png` 以第一版 `scene-02.png` 为参考，保留白灰小猫与灰猫的角色特征，改为脸贴着脸、互相伸爪拥抱，供结果页顶部使用。使用 codex-image2 技能，模型 `gpt-image-2`，1024×1024，quality medium；最终完整提示词见 `result-hug-prompt.txt`。处理脚本移除边缘相连的浅色背景后导出 `assets/cats/result-hug.png`（420×420）。正式结果和示例结果使用同一拥抱图。

当前正式结果与示例结果改用 `result-hug-pose.png`：按用户新增的 `references/hug-pose.jpg` 动作参考，白灰小猫正面伸爪环住灰猫，灰猫背朝观众回抱，两只身体贴紧。忽略参考图的粉色爱心背景，保留第一版角色的灰褐线条和蜡笔纹理。通过 codex-image2 的 gpt-image-2 编辑生成，1024×1024，quality medium；最终完整提示词为 `result-hug-pose-prompt.txt`。网页素材为 `assets/cats/result-hug-pose.png`（420×420，边缘背景透明）。前一版拥抱图留档。

## 结果页底部一起玩耍

`ending-play.png` 以第一版 `scene-02.png` 为角色与画风参考，改为白灰小猫与灰猫开心地一起拨弄粉色毛线球，专用于结果页底部。正式结果与示例结果均使用此图。通过 codex-image2 技能的 gpt-image-2 编辑生成，1024×1024，quality medium；最终完整提示词为 `ending-play-prompt.txt`。处理脚本移除边缘背景后导出 `assets/cats/ending-play.png`（420×420）。

当前正式页面使用 `ending-play-happy.png` 修订版：去掉白猫与灰猫脸上全部泪滴，灰猫改为弯弯的笑眼，白猫张嘴笑得更开心，两只保留一起玩毛线球的动作。以 `ending-play.png` 为编辑输入，使用 codex-image2 技能的 gpt-image-2，1024×1024，quality medium；最终提示词为 `ending-play-happy-prompt.txt`，网页文件为 `assets/cats/ending-play-happy.png`（420×420）。

## 结果指南卡片的眼泪修订

三个独立修订仅用于结果指南卡片，原始场景素材继续保留：

- `guide-care-dry.png`：以 `scene-02.png` 编辑，仅去掉持信白猫的眼泪，灰猫保持原表情，对应「关心的表达」。
- `guide-talk-dry.png`：以 `scene-03.png` 编辑，去掉交流中两只猫的眼泪，对应「分歧的处理」。
- `guide-rest-dry.png`：以 `scene-06.png` 编辑，去掉依偎休息的两只猫的泪滴和泪痕，对应「相处的安排」。

均使用 codex-image2 技能的 gpt-image-2，1024×1024，quality medium。各图最终提示词为同名的 `-prompt.txt` 文件，处理脚本输出至 `assets/cats/`（420×420，边缘背景透明）。

## 误会说明插画的灰猫去泪

`reflection-gray-dry.png` 以 `scene-05.png` 为参考，仅去掉右边灰猫的泪滴和白色湿痕，保留其微笑、抚摸白猫头部的安慰动作，以及左边白猫的泪滴。专用于结果页「那些容易发生的误会」插画。使用 codex-image2 技能的 gpt-image-2，1024×1024，quality medium；完整最终提示词为 `reflection-gray-dry-prompt.txt`。处理脚本输出 `assets/cats/reflection-gray-dry.png`（420×420）。

## 首页白猫泪滴动画

基于原有 `assets/cats/hero.png` 处理，无新增生成图片。`scripts/prepare-hero-tears.py` 用相邻白色脸颊纹理移除固定泪滴，导出同尺寸 `assets/cats/hero-tear-base.png`。页面在其上叠加 SVG 泪滴，采用与原画相近的灰褐描边，CSS 控制两侧泪滴错开滑落、加速、淡出和再次形成。图层随主图缩放，减少动态效果模式保留静态泪滴。整体素材准备脚本会自动重建此底图。

## 16 种画像的独立双猫图鉴

`gallery-v1/` 保存每种小猫画像独立生成的插画、完整提示词和 `manifest.json`。参考输入为已经确认的 `assets/cats/ending-play-happy.png` 与 `assets/cats/guide-talk-dry.png`，只用于角色身份和手绘风格，所有动作重新生成。每张均为一只白灰小猫与一只冷灰小猫，两只都不流泪。

使用 `codex-image2` 原生 CLI 的 edit 模式；原配置 `gpt-image-2` 请求返回 HTTP 400，经服务型号列表确认，改用当前可用的 `gpt-image-2.6`。请求尺寸 1024×1024，quality medium；服务返回的原图实际为 1254×1254。原图 `source-01.png` 至 `source-16.png`，完整提示词 `prompt-01.txt` 至 `prompt-16.txt`，均位于 `gallery-v1/`。

| 编号 | 画像 | 独立场景 |
|---|---|---|
| 01 | 暖暖猫 | 分享暖茶 |
| 02 | 蹦蹦猫 | 吹泡泡、跳起来追泡泡 |
| 03 | 悄悄猫 | 写信、准备爱心信封 |
| 04 | 月亮猫 | 在月亮软垫上相伴休息 |
| 05 | 窝窝猫 | 搭毯子小窝 |
| 06 | 叮当猫 | 整理野餐篮 |
| 07 | 栗栗猫 | 收藏橡果和叶片 |
| 08 | 糯糯猫 | 围着同一条围巾拥抱 |
| 09 | 直直猫 | 玩传声筒 |
| 10 | 风风猫 | 放风筝 |
| 11 | 慢慢猫 | 带着小花走向等待的小猫 |
| 12 | 星星猫 | 用望远镜看星星 |
| 13 | 稳稳猫 | 穿围裙煮热汤 |
| 14 | 溜溜猫 | 背包、地图小探险 |
| 15 | 苔苔猫 | 一起照料花盆 |
| 16 | 云云猫 | 趴在云朵软垫上玩纸飞机 |

`scripts/generate-gallery-images.mjs` 可按编号生成缺失原图，已有原图会跳过。`scripts/prepare-gallery-images.py` 仅处理图鉴原图，移除边缘连通的浅色背景，保留白猫内部，裁切、统一留白并输出 `assets/cats/gallery/cat-01.png` 至 `cat-16.png`（420×420 透明 PNG）。图鉴卡片和首页图鉴入口引用这套独立素材；其余已确认的双猫插画保持原用途。
