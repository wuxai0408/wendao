const pptx = require('pptxgenjs');

const ppt = new pptx();

// ===== 配色 =====
const CLR = { main: '1F4E79', accent: '2E75B6', light: 'D6E4F0', dark: '333333', white: 'FFFFFF', green: '548235' };
const FONT = { face: '微软雅黑', size: 18, color: CLR.dark };

// ===== 辅助函数 =====
function addTitleSlide(title, subtitle) {
  const s = ppt.addSlide();
  s.background({ fill: CLR.main });
  s.addText(title, { x: 0.5, y: 1.2, w: 9, h: 1.5, fontSize: 36, color: CLR.white, bold: true, align: 'center' });
  s.addShape(pptx.ShapeType.rect, { x: 3.5, y: 2.9, w: 3, h: 0.06, fill: CLR.accent });
  if(subtitle) s.addText(subtitle, { x: 0.5, y: 3.2, w: 9, h: 0.8, fontSize: 18, color: CLR.light, align: 'center' });
  return s;
}

function addContentSlide(title, bullets, opts = {}) {
  const s = ppt.addSlide();
  s.background({ fill: CLR.white });
  // 顶部标题栏
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 0.9, fill: CLR.main });
  s.addText(title, { x: 0.4, y: 0.1, w: 9.2, h: 0.7, fontSize: 24, color: CLR.white, bold: true });
  // 左侧竖条
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0.9, w: 0.08, h: 5.6, fill: CLR.accent });
  // 内容
  const yStart = opts.yStart || 1.2;
  if(Array.isArray(bullets)) {
    s.addText(bullets.map((b,i) => ({ text: b, options: { fontSize: 16, color: CLR.dark, bullet: { code: '●', color: CLR.accent }, breakType: 'none' } })),
      { x: 0.4, y: yStart, w: 9.2, h: 5, valign: 'top', lineSpacingMultiple: 1.5 });
  }
  return s;
}

function addCodeSlide(title, code, note) {
  const s = ppt.addSlide();
  s.background({ fill: CLR.white });
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 0.9, fill: CLR.main });
  s.addText(title, { x: 0.4, y: 0.1, w: 9.2, h: 0.7, fontSize: 24, color: CLR.white, bold: true });
  // 代码框
  s.addShape(pptx.ShapeType.rect, { x: 0.4, y: 1.2, w: 9.2, h: 3.5, fill: 'F5F5F5', line: { color: 'CCCCCC', width: 1 } });
  s.addText(code, { x: 0.6, y: 1.3, w: 8.8, h: 3.3, fontSize: 13, color: '2D2D2D', fontFace: 'Consolas', valign: 'top' });
  if(note) s.addText(note, { x: 0.4, y: 4.9, w: 9.2, h: 1, fontSize: 14, color: CLR.accent, italic: true });
  return s;
}

// ===== 封面 =====
addTitleSlide('数据透视表 入门指南', '从零到精通 · Excel 核心技能');

// ===== 目录 =====
const toc = ppt.addSlide();
toc.background({ fill: CLR.white });
toc.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 0.9, fill: CLR.main });
toc.addText('目  录', { x: 0.4, y: 0.1, w: 9.2, h: 0.7, fontSize: 24, color: CLR.white, bold: true });
const items = [
  '1. 什么是数据透视表',
  '2. 数据源准备规范',
  '3. 创建数据透视表',
  '4. 字段布局详解',
  '5. 值字段设置与计算',
  '6. 筛选、切片器与日程表',
  '7. 分组与组合',
  '8. 刷新数据源',
  '9. 实战案例：销售数据分析',
  '10. 常用快捷键与技巧'
];
toc.addText(items.map((x,i) => ({ text: x, options: { fontSize: 16, color: CLR.dark, bullet: { code: `${String(i+1).padStart(2,'0')}`, color: CLR.accent } } })),
  { x: 0.6, y: 1.1, w: 8.8, h: 5.2, valign: 'top', lineSpacingMultiple: 1.6 });

// ===== 1. 什么是数据透视表 =====
addContentSlide('什么是数据透视表', [
  '数据透视表（PivotTable）是 Excel 中最强大的数据分析工具',
  '作用：快速汇总、交叉分析、多维查看大量数据',
  '无需写公式，拖拽字段即可完成分组统计',
  '支持计数、求和、平均值、最大值、最小值等多种计算',
  '轻松实现：行总计、列总计、百分比、排名等分析',
  '适用场景：销售报表、库存统计、财务分析、考勤汇总等'
]);

// ===== 2. 数据源准备规范 =====
addContentSlide('数据源准备规范（非常重要！）', [
  '✅ 第一行必须是标题行（字段名）',
  '✅ 每列数据类型统一（日期列全是日期，数字列全是数字）',
  '✅ 不要有空行、空列、合并单元格',
  '✅ 不要有小计/合计行（透视表会自动计算）',
  '✅ 建议用 Ctrl+T 转为"超级表"（动态范围，自动扩展）',
  '❌ 避免：空单元格、不同格式混排、多行标题'
]);

// ===== 3. 创建数据透视表 =====
addContentSlide('创建数据透视表', [
  '步骤一：选中数据区域任意单元格 → 按 Alt + N + V',
  '步骤二：或点击「插入」→「数据透视表」',
  '步骤三：确认数据区域（建议勾选"添加到数据模型"）',
  '步骤四：选择放置位置（新工作表 / 现有工作表）',
  '步骤四：点击确定 → 右侧出现「数据透视表字段」窗格',
  '提示：Win 快捷键 Alt+N+V+T，Mac 按 ⌘+⌥+P'
]);

// ===== 4. 字段布局详解 =====
addContentSlide('字段布局：四个区域', [
  '■  筛选器（Filters）：放在此区域的字段可对整个透视表筛选',
  '■  行（Rows）：放在行区域，数据纵向排列',
  '■  列（Columns）：放在列区域，数据横向排列',
  '■  值（Values）：放在值区域，进行求和/计数等计算',
  '',
  '拖拽技巧：直接把字段名拖到下方四个区域即可',
  '字段顺序决定：外层→内层（拖在上方的为外层分组）'
]);

// ===== 5. 值字段设置 =====
addContentSlide('值字段设置与计算', [
  '右键值字段 →「值字段设置」可更改计算类型：',
  '  - 求和（默认数值型）、计数（默认文本型）',
  '  - 平均值、最大值、最小值、乘积、标准差等',
  '',
  '值显示方式（右键 → 值字段设置 → 值显示方式）：',
  '  - 总计的百分比、列汇总的百分比、行汇总的百分比',
  '  - 差异、百分比差异、升序排列、降序排列',
  '  - 父级汇总的百分比（多层嵌套时非常实用）'
]);

// ===== 6. 筛选与切片器 =====
addContentSlide('筛选、切片器与日程表', [
  '■  报表筛选器：将字段拖入"筛选器"区域，下拉筛选',
  '■  切片器（Slicer）：',
  '  - 选中透视表 →「数据透视表分析」→「插入切片器」',
  '  - 可视化按钮，点击快速筛选，支持多选（Ctrl 或 多选按钮）',
  '  - 可连接多个透视表：右键切片器 →「报表连接」',
  '■  日程表（Timeline）：仅支持日期字段，时间范围滑块',
  '  -「数据透视表分析」→「插入日程表」'
]);

// ===== 7. 分组 =====
addContentSlide('分组与组合', [
  '■  日期分组：右键日期字段 →「组合」→ 按月/季度/年',
  '  - 自动生成 年、季度、月 三个字段',
  '  - 也可以在组合对话框中自定义起始和结束日期',
  '',
  '■  数字分组：右键数字字段 →「组合」→ 设置步长',
  '  - 如：年龄按 10 岁一组（0-9, 10-19, 20-29...）',
  '',
  '■  手动分组：选中多行 → 右键 →「组合」→ 创建自定义组',
  '  - 常用于：将多个品类合并为"其他"'
]);

// ===== 8. 刷新 =====
addContentSlide('刷新数据源', [
  '手动刷新：右键透视表 →「刷新」',
  '快捷键：Alt + F5（刷新当前表）',
  '快捷键：Ctrl + Alt + F5（刷新所有透视表）',
  '',
  '自动刷新（数据源变化时）：',
  '  - 右键透视表 →「数据透视表选项」→「数据」',
  '  - 勾选「打开文件时刷新数据」',
  '',
  '数据源扩展（超级表无需此操作）：',
  '  -「数据透视表分析」→「更改数据源」→ 重新选择',
  '  - 推荐创建数据源前就转为「超级表」Ctrl+T'
]);

// ===== 9. 实战案例 =====
addContentSlide('实战案例：销售数据分析', [
  '目标：分析各区域各产品类别的月销售额',
  '',
  '数据字段：日期、区域、产品类别、销售额、销售数量',
  '布局方案：',
  '  行 → 区域，列 → 产品类别，值 → 销售额（求和）',
  '  筛选器 → 日期（分组为月）',
  '',
  '进阶操作：',
  '  1. 添加切片器：区域、产品类别',
  '  2. 添加日程表：日期',
  '  3. 值显示方式改为「行汇总的百分比」',
  '  4. 排序：右键 → 排序 → 降序'
]);

// ===== 10. 常用快捷键与技巧 =====
addContentSlide('常用快捷键与技巧', [
  'Alt + N + V         → 创建数据透视表',
  'Alt + F5            → 刷新透视表',
  'Ctrl + Alt + F5     → 刷新所有透视表',
  '选中透视表 + Delete → 删除透视表',
  '双击汇总数字       → 向下钻取查看明细数据',
  '',
  '💡 技巧：',
  '  - 取消"自动调整列宽"：右键 → 选项 → 布局和格式',
  '  - 禁止显示错误值：右键 → 选项 → 布局和格式 → 错误值显示为 ""',
  '  - 重复所有项目标签：右键 → 数据透视表选项 → 显示 → 勾选',
  '  - 数据透视表转普通数据：Ctrl+C → 粘贴为值'
]);

// ===== 封底 =====
const end = ppt.addSlide();
end.background({ fill: CLR.main });
end.addText('谢谢学习', { x: 0.5, y: 1.5, w: 9, h: 1.2, fontSize: 40, color: CLR.white, bold: true, align: 'center' });
end.addShape(pptx.ShapeType.rect, { x: 3.5, y: 2.9, w: 3, h: 0.06, fill: CLR.accent });
end.addText('勤练习，多上手，数据分析不求人', { x: 0.5, y: 3.2, w: 9, h: 0.8, fontSize: 18, color: CLR.light, align: 'center' });

// ===== 保存 =====
const outPath = 'C:\\Users\\liyou\\Downloads\\无敌了\\青云\\数据透视表入门指南.pptx';
ppt.writeFile({ fileName: outPath }).then(() => {
  console.log('✅ PPT 已生成: ' + outPath);
}).catch(err => {
  console.error('❌ 失败:', err);
});
