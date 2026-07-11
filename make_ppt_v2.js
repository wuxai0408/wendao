const PptxGenJS = require("pptxgenjs");
const pptx = new PptxGenJS();
pptx.defineLayout({ name: "WIDE", width: 13.33, height: 7.5 });
pptx.layout = "WIDE";
const bgColor = "F2F6FC", accent = "1A5276", textColor = "2C3E50";
const s1 = pptx.addSlide();
s1.background = { color: accent };
s1.addText("数据透视表 从入门到精通", { x: 1, y: 2, w: 11.33, h: 1.2, fontSize: 40, fontFace: "Microsoft YaHei", color: "FFFFFF", bold: true });
s1.addText("7天成为数据透视表高手", { x: 1, y: 3.5, w: 11.33, h: 0.8, fontSize: 22, fontFace: "Microsoft YaHei", color: "D4E6F1" });
s1.addText("适合：职场新人 / 业务人员 / 数据分析入门", { x: 1, y: 4.8, w: 11.33, h: 0.5, fontSize: 14, fontFace: "Microsoft YaHei", color: "A9CCE3" });
const s2 = pptx.addSlide();
s2.background = { color: bgColor };
s2.addText("目  录", { x: 0.8, y: 0.5, w: 4, h: 0.8, fontSize: 30, fontFace: "Microsoft YaHei", color: accent, bold: true });
s2.addShape(pptx.ShapeType.rect, { x: 0.8, y: 1.2, w: 1.2, h: 0.06, fill: { color: accent } });
const toc = [
  ["01", "什么是数据透视表"],
  ["02", "数据准备的规范"],
  ["03", "创建你的第一个透视表"],
  ["04", "字段布局与拖拽"],
  ["05", "值计算与格式化"],
  ["06", "筛选、排序与切片器"],
  ["07", "实战案例与常见问题"]
];
toc.forEach((item, i) => {
  const y = 1.8 + i * 0.7;
  s2.addText(item[0], { x: 1.2, y, w: 1, h: 0.5, fontSize: 20, fontFace: "Microsoft YaHei", color: accent, bold: true });
  s2.addText(item[1], { x: 2.5, y, w: 8, h: 0.5, fontSize: 16, fontFace: "Microsoft YaHei", color: textColor });
});
pptx.writeFile({ fileName: "C:\\Users\\liyou\\Downloads\\无敌了\\青云\\test_ppt.pptx" }).then(() => console.log("OK")).catch(e => console.error(e));
