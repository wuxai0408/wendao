const docx = require("docx");
const fs = require("fs");

const {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  BorderStyle, AlignmentType, PageBreak,
} = docx;

const normal = (text, opts = {}) => new TextRun({ text, size: 22, ...opts });
const bold = (text, opts = {}) => new TextRun({ text, bold: true, size: 22, ...opts });
const h2 = (text) => new Paragraph({ text, heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 150 } });
const h3 = (text) => new Paragraph({ text, heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 100 } });

const para = (runs, opts = {}) => new Paragraph({
  children: Array.isArray(runs) ? runs : [normal(runs)],
  spacing: { after: 80 },
  ...opts,
});

const children = [];

// ===== 封面 =====
children.push(
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 4000, after: 200 }, children: [new TextRun({ text: "经验库 & 反思记录", bold: true, size: 48, font: "黑体" })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [normal("——个人工作复盘与流程优化", { size: 28 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 2000 }, children: [normal(`生成日期：${new Date().toLocaleDateString("zh-CN")}`, { size: 24 })] }),
  new Paragraph({ children: [new PageBreak()] }),
);

// ===== 经验库 =====
children.push(
  new Paragraph({ text: "经验库", heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),
  para("以下是历次工作过程中总结的经验教训、成功做法与核心原则。每次开始新任务前，建议先回顾本库。"),
);

// 失败教训部分
children.push(h2("一、失败教训"));

const lessons = [
  { title: "1. PPT生成没一步到位", items: ["场景：PPT脚本写完了没运行，等用户催才执行", "教训：写完直接跑，输出最终文件", "通用结论：产出物一步到位，不等催"] },
  { title: "2. 文件传输让用户绕路", items: ["场景：用户要微信发文件，我答"做不到"，让用户自己操作", "教训：遇到限制先问"最快让用户拿到结果的方式是什么"", "通用结论：别让用户替你动手"] },
  { title: "3. 工具意识脱节", items: ["场景：用户问"能识别图片吗"，直接答"不能"", "根因：忘了手上有read_file/run_command能读本地文件", "教训：说"不能"之前先问核心功能、可用工具、有无绕过限制的路", "通用结论：说"不能"前先扫全部工具"] },
  { title: "4. 控制台UI盲猜4轮", items: ["场景：API正常但前端不显示聊天记录，连修4轮全是猜的", "根因："API对=UI对"的错误假设", "教训：排查看不见的UI，第一轮先写极简验证页", "通用结论：先写最小验证页再修bug"] },
  { title: "5. 修表象不查根因", items: ["场景：QR码连续过期，原地加刷新逻辑，没查服务器实际返回", "教训：异常先写最小debug脚本，确认根因再改", "通用结论：先查根因再修，别猜"] },
  { title: "6. 过度复杂化", items: ["场景：控制台200行膨胀到360行，三层调用链+各种封装。30行推翻", "教训：代码膨胀时停下来问"最简单版本什么样"", "通用结论：代码膨胀先简化后继续"] },
  { title: "7. 进程管理粗暴", items: ["场景：多次Stop-Process失败，旧进程残留占端口", "教训：杀进程→netstat验证→再启动", "通用结论：操作后必须验证再下一步"] },
  { title: "8. 格式没确认就产出", items: ["场景：用户要Word文档简历，给了HTML版", "教训：产出物格式先问清楚", "通用结论：先确认格式再动手"] },
  { title: "9. 验证环境≠部署环境", items: ["场景：交互式PS通过，execSync里全报TypeNotFound", "教训：测试必须在目标环境下做", "通用结论：部署环境做测试才算数"] },
  { title: "10. 系统提示词没跟功能更新", items: ["场景：OCR接入后还在翻images文件夹叫用户手动放图", "根因：AI不会自动感知代码变化", "教训：功能上线同步更新系统提示词", "通用结论：改代码必须同步改prompt"] },
  { title: "11. PPT需求没对齐就批量产出", items: ["场景：没问主题/色系就做5页，全部返工", "教训：第一版先出1页样稿确认方向再批量", "通用结论：先出样稿再批量，不猜"] },
];

for (const lesson of lessons) {
  children.push(h3(lesson.title));
  for (const item of lesson.items) {
    children.push(para([normal("• " + item)]));
  }
}

// 成功做法部分
children.push(h2("二、成功做法"));

const successes = [
  { title: "1. Worker预加载单例", items: ["做法：_ocrWorker全局缓存，createWorker一次永久复用", "通用结论：初始化开销大的用懒加载单例"] },
  { title: "2. 全自动OCR管线", items: ["做法：微信收图→CDN下载→AES解密→OCR→传Claude，用户零感知", "通用结论：后台全自动，用户只看结果"] },
  { title: "3. 自动化经验记录系统", items: ["做法：CLAUDE.md设定自动触发→读库→总结→追加→记忆→git推送", "通用结论：重复流程写入系统自动执行"] },
  { title: "4. 精美PPT视觉方案", items: ["做法：Unsplash高清图背景+半透明遮罩+金色装饰+多色系+装饰角标", "通用结论：视觉需求直接走最丰富路线"] },
  { title: "5. 调试标记法", items: ["做法：在不确定位置画亮黄/亮粉方块，10秒定位渲染管线问题", "通用结论：用极端颜色标记定位渲染bug"] },
  { title: "6. 方向键探索+碰撞战斗", items: ["做法：WASD/方向键走地图，撞怪触发回合制，全清自动新地图", "通用结论：交互方式匹配游戏类型直觉"] },
  { title: "7. 自动Agent匹配系统", items: ["做法：扫描171个agent→提取关键词构建索引→自动匹配规则→自动加载最相关专家", "通用结论：用户说需求，系统自动匹配专家，零手动"] },
  { title: "8. Agent映射表优化——全量索引改为关键词查表", items: ["做法：171个agent的全量JSON索引（30KB/每次10K token）→ 56个分类的关键词映射表（8KB/每次500 token）", "通用结论：查表比扫描全部更快更省"] },
];

for (const s of successes) {
  children.push(h3(s.title));
  for (const item of s.items) {
    children.push(para([normal("• " + item)]));
  }
}

// 核心铁律
children.push(h2("三、核心铁律"));
children.push(para([bold("1. 先想后动"), normal(" — 说不能前扫工具，修bug前写验证，加代码前问简化")]));
children.push(para([bold("2. 一步到位"), normal(" — 输出最终文件，不等催不等确认")]));
children.push(para([bold("3. 环境一致"), normal(" — 验证和部署用同一个环境")]));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ===== 反思记录 =====
children.push(
  new Paragraph({ text: "反思记录", heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),
  para("以下为近期工作中发现的问题与改进方向，需在日常对话中有意识规避。"),
);

const reflections = [
  { title: "1. PPT需求没对齐就批量产出", content: "先出1页样稿确认方向，再批量做。不猜需求。" },
  { title: "2. 用户说"继续"就机械循环", content: "连续2次"继续"=红灯，立即停下来问方向对不对。" },
  { title: "3. 做一半才返工", content: "设中间校验点，分阶段交付，不一口气干到底。" },
  { title: "4. 用户不耐烦信号没识别", content: "问"还要多久/好了没"=立即止损，问要不要换方案。" },
  { title: "5. 对话前未回顾经验库", content: "不动手先翻库，翻了再开工。" },
];

for (const r of reflections) {
  children.push(h3(r.title));
  children.push(para("改进方向：" + r.content));
}

// ===== 构建文档 =====
const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: "微软雅黑", size: 22 },
      },
    },
  },
  sections: [{ children }],
});

(async () => {
  const buffer = await Packer.toBuffer(doc);
  const outPath = "C:\\Users\\liyou\\Downloads\\无敌了\\青云\\经验库_反思记录.docx";
  fs.writeFileSync(outPath, buffer);
  console.log("OK: " + outPath);
  console.log("文件大小: " + (buffer.length / 1024).toFixed(1) + " KB");
})();
