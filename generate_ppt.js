const PptxGenJS = require("pptxgenjs");

const pptx = new PptxGenJS();
pptx.defineLayout({ name: "WIDE", width: 13.33, height: 7.5 });
pptx.layout = "WIDE";

const bgColor = "F2F6FC";
const accentColor = "1A5276";
const lightAccent = "D4E6F1";
const textColor = "2C3E50";

// 1. 封面
const slide1 = pptx.addSlide();
slide1.background = { color: accentColor };
slide1.addText("", { x: 1, y: 1.5, w: 11.33, h: 1.2, fontSize: 36, fontFace: "Microsoft YaHei", color: "FFFFFF", bold: true });
slide1.addText("", { x: 1, y: 3.2, w: 11.33, h: 0.8, fontSize: 18, fontFace: "Microsoft YaHei", color: "D4E6F1" });
slide1.addText("", { x: 1, y: 4.8, w: 11.33, h: 0.5, fontSize: 14, fontFace: "Microsoft YaHei", color: "A9CCE3" });
slide1.addShape(pptx.ShapeType.rect, { x: 0, y: 7.2, w: 13.33, h: 0.3, fill: { color: "1A3A5C" } });

// 2. 目录
const slide2 = pptx.addSlide();
slide2.background = { color: bgColor };
slide2.addText("", { x: 0.8, y: 0.5, w: 4, h: 0.8, fontSize: 28, fontFace: "Microsoft YaHei", color: accentColor, bold: true });
slide2.addShape(pptx.ShapeType.rect, { x: 0.8, y: 1.2, w: 1.2, h: 0.06, fill: { color: accentColor } });

const tocItems = [
  { num: "01", title: "" },
  { num: "02", title: "" },
  { num: "03", title: "" },
  { num: "04", title: "" },
  { num: "05", title: "" },
  { num: "06", title: "" },
  { num: "07", title: "" }
];
tocItems.forEach((item, i) => {
  const yBase = 1.8 + i * 0.7;
  slide2.addText(item.num, { x: 1.2, y: yBase, w: 1, h: 0.5, fontSize: 20, fontFace: "Microsoft YaHei", color: accentColor, bold: true });
  slide2.addText(item.title, { x: 2.5, y: yBase, w: 8, h: 0.5, fontSize: 16, fontFace: "Microsoft YaHei", color: textColor });
  slide2.addShape(pptx.ShapeType.rect, { x: 1.2, y: yBase + 0.55, w: 0.6, h: 0.02, fill: { color: lightAccent } });
});

// Section slides + Content slides
const sections = [
  { title: "", subtitle: "" },
  { title: "", subtitle: "" },
  { title: "", subtitle: "" },
  { title: "", subtitle: "" },
  { title: "", subtitle: "" },
  { title: "", subtitle: "" },
  { title: "", subtitle: "" }
];

sections.forEach((section, idx) => {
  // Section divider
  const sSlide = pptx.addSlide();
  sSlide.background = { color: accentColor };
  sSlide.addText("0" + (idx + 1), { x: 1, y: 1.5, w: 2, h: 1, fontSize: 48, fontFace: "Microsoft YaHei", color: "FFFFFF", bold: true, transparency: 30 });
  sSlide.addText(section.title, { x: 1, y: 2.8, w: 10, h: 1, fontSize: 32, fontFace: "Microsoft YaHei", color: "FFFFFF", bold: true });
  sSlide.addText(section.subtitle, { x: 1, y: 4, w: 10, h: 0.8, fontSize: 16, fontFace: "Microsoft YaHei", color: "D4E6F1" });

  // 2-3 content pages per section
  const pageCount = idx === 0 ? 3 : 2;
  for (let p = 0; p < pageCount; p++) {
    const cSlide = pptx.addSlide();
    cSlide.background = { color: bgColor };

    // Top bar
    cSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 0.06, fill: { color: accentColor } });

    // Section label top-left
    cSlide.addText("0" + (idx + 1) + " | " + section.title, { x: 0.8, y: 0.3, w: 6, h: 0.4, fontSize: 11, fontFace: "Microsoft YaHei", color: "7F8C8D" });

    // Page title
    cSlide.addText("", { x: 0.8, y: 0.9, w: 10, h: 0.7, fontSize: 22, fontFace: "Microsoft YaHei", color: accentColor, bold: true });

    // Decorative line under title
    cSlide.addShape(pptx.ShapeType.rect, { x: 0.8, y: 1.55, w: 0.8, h: 0.04, fill: { color: accentColor } });

    // Content area
    if (p === 0 && idx === 0) {
      // 3 columns layout
      for (let col = 0; col < 3; col++) {
        const xBase = 0.8 + col * 4.1;
        cSlide.addShape(pptx.ShapeType.roundRect, { x: xBase, y: 2, w: 3.7, h: 4.5, fill: { color: "FFFFFF" }, line: { color: "E0E0E0", width: 0.5 }, shadow: { type: "outer", blur: 4, offset: 2, color: "CCCCCC", opacity: 0.2 } });
        cSlide.addText("", { x: xBase + 0.3, y: 2.3, w: 3.1, h: 0.5, fontSize: 16, fontFace: "Microsoft YaHei", color: accentColor, bold: true });
        cSlide.addText("", { x: xBase + 0.3, y: 3, w: 3.1, h: 3, fontSize: 12, fontFace: "Microsoft YaHei", color: textColor });
      }
    } else if (p === 1 && idx === 0) {
      // Left text + right chart
      cSlide.addShape(pptx.ShapeType.roundRect, { x: 0.8, y: 2, w: 5.8, h: 4.5, fill: { color: "FFFFFF" }, line: { color: "E0E0E0", width: 0.5 } });
      cSlide.addText("", { x: 1.1, y: 2.3, w: 5.2, h: 0.5, fontSize: 15, fontFace: "Microsoft YaHei", color: accentColor, bold: true });
      cSlide.addShape(pptx.ShapeType.rect, { x: 1.1, y: 2.7, w: 5.2, h: 3.5, fill: { color: "F5F5F5" } });
      cSlide.addText("", { x: 7.2, y: 2, w: 5.3, h: 4.5, fontSize: 12, fontFace: "Microsoft YaHei", color: textColor });
    } else if (p === 2 && idx === 0) {
      // Timeline
      cSlide.addShape(pptx.ShapeType.rect, { x: 0.8, y: 2.5, w: 11.73, h: 0.06, fill: { color: accentColor } });
      for (let t = 0; t < 5; t++) {
        const xPos = 1.5 + t * 2.3;
        cSlide.addShape(pptx.ShapeType.ellipse, { x: xPos - 0.15, y: 2.35, w: 0.35, h: 0.35, fill: { color: accentColor } });
        cSlide.addText("", { x: xPos - 0.6, y: 3, w: 1.8, h: 0.4, fontSize: 12, fontFace: "Microsoft YaHei", color: accentColor, align: "center" });
        cSlide.addShape(pptx.ShapeType.roundRect, { x: xPos - 0.8, y: 3.6, w: 2, h: 2.8, fill: { color: "FFFFFF" }, line: { color: "E0E0E0", width: 0.5 } });
        cSlide.addText("", { x: xPos - 0.6, y: 3.8, w: 1.6, h: 2.3, fontSize: 10, fontFace: "Microsoft YaHei", color: textColor });
      }
    } else if (p === 0) {
      // 2 columns layout
      cSlide.addShape(pptx.ShapeType.roundRect, { x: 0.8, y: 2, w: 5.8, h: 4.5, fill: { color: "FFFFFF" }, line: { color: "E0E0E0", width: 0.5 } });
      cSlide.addText("", { x: 1.1, y: 2.3, w: 5.2, h: 0.5, fontSize: 15, fontFace: "Microsoft YaHei", color: accentColor, bold: true });
      cSlide.addText("", { x: 1.1, y: 3, w: 5.2, h: 3, fontSize: 12, fontFace: "Microsoft YaHei", color: textColor });
      cSlide.addShape(pptx.ShapeType.roundRect, { x: 7.2, y: 2, w: 5.3, h: 4.5, fill: { color: "FFFFFF" }, line: { color: "E0E0E0", width: 0.5 } });
      cSlide.addText("", { x: 7.5, y: 2.3, w: 4.7, h: 0.5, fontSize: 15, fontFace: "Microsoft YaHei", color: accentColor, bold: true });
      cSlide.addText("", { x: 7.5, y: 3, w: 4.7, h: 3, fontSize: 12, fontFace: "Microsoft YaHei", color: textColor });
    } else {
      // Full page text
      cSlide.addShape(pptx.ShapeType.roundRect, { x: 0.8, y: 2, w: 11.73, h: 4.5, fill: { color: "FFFFFF" }, line: { color: "E0E0E0", width: 0.5 } });
      cSlide.addText("", { x: 1.3, y: 2.3, w: 10.73, h: 0.5, fontSize: 15, fontFace: "Microsoft YaHei", color: accentColor, bold: true });
      cSlide.addText("", { x: 1.3, y: 3, w: 10.73, h: 3, fontSize: 12, fontFace: "Microsoft YaHei", color: textColor });
    }
  }
});

// 尾页
const lastSlide = pptx.addSlide();
lastSlide.background = { color: accentColor };
lastSlide.addText("", { x: 1, y: 2, w: 11.33, h: 1, fontSize: 36, fontFace: "Microsoft YaHei", color: "FFFFFF", bold: true, align: "center" });
lastSlide.addText("", { x: 1, y: 3.5, w: 11.33, h: 0.6, fontSize: 16, fontFace: "Microsoft YaHei", color: "D4E6F1", align: "center" });
lastSlide.addText("", { x: 1, y: 4.8, w: 11.33, h: 0.4, fontSize: 12, fontFace: "Microsoft YaHei", color: "A9CCE3", align: "center" });

pptx.writeFile({ fileName: "C:\\Users\\liyou\\Downloads\\无敌了\\青云\\项目申报书框架.pptx" })
  .then(() => console.log("PPT 已生成: 项目申报书框架.pptx"))
  .catch(err => console.error("生成失败:", err));
