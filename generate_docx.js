const docx = require("docx");
const fs = require("fs");

const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  NumberFormat,
  LevelFormat,
  convertInchesToTwip,
  PageBreak,
} = docx;

const bold = (text, opts = {}) =>
  new TextRun({ text, bold: true, ...opts });
const normal = (text, opts = {}) => new TextRun({ text, ...opts });
const heading = (text, level) =>
  new Paragraph({
    text,
    heading: level,
    spacing: { before: 240, after: 120 },
  });
const para = (runs, opts = {}) =>
  new Paragraph({
    children: Array.isArray(runs) ? runs : [normal(runs)],
    spacing: { after: 100 },
    ...opts,
  });

const cell = (text, opts = {}) =>
  new TableCell({
    children: [para(text, { alignment: AlignmentType.LEFT })],
    width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1 },
      bottom: { style: BorderStyle.SINGLE, size: 1 },
      left: { style: BorderStyle.SINGLE, size: 1 },
      right: { style: BorderStyle.SINGLE, size: 1 },
    },
  });

const headerCell = (text, opts = {}) =>
  new TableCell({
    children: [para([bold(text)], { alignment: AlignmentType.LEFT })],
    width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
    shading: { fill: "D9E2F3" },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1 },
      bottom: { style: BorderStyle.SINGLE, size: 1 },
      left: { style: BorderStyle.SINGLE, size: 1 },
      right: { style: BorderStyle.SINGLE, size: 1 },
    },
  });

const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: "宋体", size: 24 },
      },
    },
  },
  sections: [
    {
      children: [
        // ========== 封面/标题 ==========
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 3600, after: 600 },
          children: [
            new TextRun({
              text: "XX公司OA协同办公系统开发项目",
              bold: true,
              size: 44,
              font: "黑体",
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [new TextRun({ text: "招标文件", bold: true, size: 36, font: "黑体" })],
        }),
        new Paragraph({ spacing: { before: 1200 }, children: [] }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [normal("招标人：XX有限公司", { size: 24 })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [normal("日期：2025年X月", { size: 24 })],
        }),

        new Paragraph({ children: [new PageBreak()] }),

        // ========== 目录 ==========
        heading("目录", HeadingLevel.HEADING_1),
        para("第一章 招标公告"),
        para("第二章 投标人须知"),
        para("第三章 项目需求说明书"),
        para("第四章 合同主要条款"),
        para("第五章 附件格式"),
        para("第六章 招标文件编写建议"),

        new Paragraph({ children: [new PageBreak()] }),

        // ========== 第一章 ==========
        heading("第一章 招标公告", HeadingLevel.HEADING_1),

        heading("1. 招标条件", HeadingLevel.HEADING_2),
        para("本招标项目 XX公司OA协同办公系统开发项目，招标人为 XX有限公司，资金来源为企业自筹。项目已具备招标条件，现对该项目进行公开招标。"),

        heading("2. 项目概况与招标范围", HeadingLevel.HEADING_2),
        para("2.1 项目名称：XX公司OA协同办公系统开发项目"),
        para("2.2 项目地点：XX市XX区"),
        para("2.3 招标内容：OA系统需求分析、设计、开发、测试、部署、培训及运维支持"),
        para("2.4 工期要求：合同签订后90个日历日内完成上线"),
        para("2.5 质量要求：符合国家及行业标准，通过验收"),

        heading("3. 投标人资格要求", HeadingLevel.HEADING_2),
        para("3.1 在中华人民共和国境内注册，具有独立法人资格"),
        para("3.2 具有ISO9001质量管理体系认证"),
        para("3.3 近三年内具有至少2个同类项目业绩（提供合同复印件）"),
        para("3.4 本项目不接受联合体投标"),

        heading("4. 招标文件的获取", HeadingLevel.HEADING_2),
        para("4.1 获取时间：2025年X月X日至2025年X月X日"),
        para("4.2 获取方式：现场获取/线上发送"),
        para("4.3 文件售价：人民币500元/份，售后不退"),

        heading("5. 投标文件的递交", HeadingLevel.HEADING_2),
        para("5.1 递交截止时间：2025年X月X日14:00"),
        para("5.2 递交地点：XX市XX区XX路XX号XX会议室"),
        para("5.3 逾期送达的投标文件将不予受理"),

        heading("6. 开标时间及地点", HeadingLevel.HEADING_2),
        para("6.1 开标时间：同投标截止时间"),
        para("6.2 开标地点：同递交地点"),

        new Paragraph({ children: [new PageBreak()] }),

        // ========== 第二章 ==========
        heading("第二章 投标人须知", HeadingLevel.HEADING_1),

        heading("投标人须知前附表", HeadingLevel.HEADING_2),
        new Table({
          rows: [
            [headerCell("条款", { width: 3000 }), headerCell("内容", { width: 9000 })],
            ["招标人", "XX有限公司"],
            ["项目预算", "人民币XX万元"],
            ["投标有效期", "投标截止日起90天"],
            ["投标保证金", "人民币XX万元"],
            ["踏勘现场", "不组织，投标人自行踏勘"],
            ["答疑会", "投标截止前7天"],
            ["投标文件份数", "正本1份，副本4份，电子版1份"],
          ].map((row, i) =>
            i === 0
              ? new TableRow({ children: row })
              : new TableRow({ children: row.map((t) => cell(t)) })
          ),
        }),

        heading("1. 投标文件的组成", HeadingLevel.HEADING_2),
        para("（1）投标函及投标函附录"),
        para("（2）法定代表人身份证明及授权委托书"),
        para("（3）投标报价表"),
        para("（4）项目方案（技术方案、实施方案）"),
        para("（5）项目管理团队及人员配置"),
        para("（6）同类项目业绩证明"),
        para("（7）资格审查资料（营业执照、资质证书等）"),
        para("（8）其他投标人认为有必要提交的资料"),

        heading("2. 投标报价", HeadingLevel.HEADING_2),
        para("2.1 投标报价应为完成招标范围内全部工作所需的所有费用"),
        para("2.2 报价货币为人民币"),
        para("2.3 不得低于成本报价，也不得超过招标控制价"),

        heading("3. 评标办法", HeadingLevel.HEADING_2),
        para("本项目采用综合评估法，总分100分："),
        para("• 价格部分：30分"),
        para("• 技术方案：40分"),
        para("• 企业实力与业绩：20分"),
        para("• 服务承诺：10分"),

        new Paragraph({ children: [new PageBreak()] }),

        // ========== 第三章 ==========
        heading("第三章 项目需求说明书", HeadingLevel.HEADING_1),

        heading("1. 建设目标", HeadingLevel.HEADING_2),
        para("构建统一、集成、高效的OA协同办公平台，实现办公流程电子化、自动化，信息资源共享，移动办公支持，数据统计分析。"),

        heading("2. 功能需求", HeadingLevel.HEADING_2),
        new Table({
          rows: [
            [headerCell("模块", { width: 3000 }), headerCell("功能说明", { width: 9000 })],
            ["个人办公", "待办事项、已办事项、日程管理、个人设置"],
            ["公文管理", "收文管理、发文管理、公文流转、签章"],
            ["审批流程", "请假审批、报销审批、用印申请、合同审批"],
            ["会议管理", "会议室预约、会议通知、会议纪要"],
            ["文档管理", "文档上传、分类、检索、权限控制"],
            ["公告通知", "公告发布、通知推送"],
            ["通讯录", "组织架构、人员查询"],
            ["移动端", "iOS/Android APP，支持主要办公功能"],
            ["系统管理", "用户管理、角色管理、权限管理、日志审计"],
          ].map((row) => new TableRow({ children: row.map((t) => cell(t)) })),
        }),

        heading("3. 技术要求", HeadingLevel.HEADING_2),
        para("3.1 B/S架构，支持主流浏览器"),
        para("3.2 支持MySQL或SQL Server数据库"),
        para("3.3 支持与钉钉/企微集成"),
        para("3.4 响应时间：页面加载<3秒，查询<5秒"),
        para("3.5 并发用户数不低于200"),
        para("3.6 系统可用性≥99.5%"),

        heading("4. 安全要求", HeadingLevel.HEADING_2),
        para("4.1 用户身份认证与权限控制"),
        para("4.2 数据传输加密（HTTPS）"),
        para("4.3 操作日志记录"),
        para("4.4 数据备份与恢复机制"),

        new Paragraph({ children: [new PageBreak()] }),

        // ========== 第四章 ==========
        heading("第四章 合同主要条款", HeadingLevel.HEADING_1),

        heading("1. 合同价格与支付方式", HeadingLevel.HEADING_2),
        para("• 合同签订后支付30%"),
        para("• 系统上线试运行支付40%"),
        para("• 终验合格后支付25%"),
        para("• 质保期满后支付5%"),

        heading("2. 工期与验收", HeadingLevel.HEADING_2),
        para("• 工期：90个日历日"),
        para("• 验收标准：满足需求说明书全部功能点，通过性能测试"),

        heading("3. 质保与运维", HeadingLevel.HEADING_2),
        para("• 质保期：终验合格后12个月"),
        para("• 质保期内免费修复Bug"),
        para("• 质保期后运维费用另行协商"),

        heading("4. 知识产权", HeadingLevel.HEADING_2),
        para("• 定制开发的源代码归招标人所有"),
        para("• 投标人不得将项目成果用于其他项目"),

        heading("5. 违约责任", HeadingLevel.HEADING_2),
        para("• 延期交付：每日按合同总价的千分之一支付违约金"),
        para("• 功能不达标：限期整改，仍不达标招标人有权解除合同"),

        new Paragraph({ children: [new PageBreak()] }),

        // ========== 第五章 ==========
        heading("第五章 附件格式", HeadingLevel.HEADING_1),

        heading("附件1：投标函", HeadingLevel.HEADING_2),
        para("致：XX有限公司"),
        para(""),
        para("我方已仔细阅读了贵方发布的《XX公司OA协同办公系统开发项目》招标文件，决定参加投标。"),
        para(""),
        para("1. 我方投标总价为人民币______元（大写：______）。"),
        para("2. 我方承诺在投标有效期内不撤销投标。"),
        para("3. 如我方中标，保证在合同约定的工期内完成全部工作。"),
        para("4. 我方同意提供贵方要求的与投标有关的任何资料。"),
        para(""),
        para("投标人（盖章）：__________"),
        para("法定代表人或授权代表（签字）：__________"),
        para("日期：______年______月______日"),

        heading("附件2：报价表", HeadingLevel.HEADING_2),
        new Table({
          rows: [
            [headerCell("序号"), headerCell("费用项"), headerCell("金额（元）"), headerCell("说明")],
            ["1", "需求调研与分析", "", ""],
            ["2", "系统设计", "", ""],
            ["3", "系统开发", "", ""],
            ["4", "测试与部署", "", ""],
            ["5", "培训", "", ""],
            ["6", "质保期运维", "", ""],
            ["", "合计", "", ""],
          ].map((row) => new TableRow({ children: row.map((t) => cell(t)) })),
        }),

        heading("附件3：评分标准", HeadingLevel.HEADING_2),
        new Table({
          rows: [
            [headerCell("评分项"), headerCell("分值"), headerCell("评分标准")],
            [
              "投标报价",
              "30",
              "基准价=所有有效报价的算术平均价，每高于基准价1%扣1分，每低于1%扣0.5分",
            ],
            [
              "技术方案",
              "40",
              "完整性10分、先进性10分、可行性10分、创新性5分、安全性5分",
            ],
            ["企业业绩", "15", "每提供1个同类项目合同得3分，最高15分"],
            ["项目团队", "10", "项目经理资质5分，团队成员配置5分"],
            ["服务承诺", "5", "响应时间、培训方案、质保承诺"],
          ].map((row) => new TableRow({ children: row.map((t) => cell(t)) })),
        }),

        new Paragraph({ children: [new PageBreak()] }),

        // ========== 第六章 ==========
        heading("第六章 招标文件编写建议（实战经验）", HeadingLevel.HEADING_1),
        new Table({
          rows: [
            [headerCell("#"), headerCell("建议"), headerCell("为什么重要")],
            [
              "1",
              "需求写清楚可验收",
              "模糊需求=扯皮，'系统运行稳定'不如'系统可用性≥99.5%'",
            ],
            ["2", "评分标准别拍脑袋", "权重不合理会导致选到低价但做不好的公司"],
            ["3", "设置招标控制价", "防止报价虚高，也防止恶意低价"],
            ["4", "付款跟交付绑定", "不是按时间付，而是按'验收通过'付"],
            ["5", "知识产权要写死", "否则开发方可能拿你的代码卖给别人"],
          ].map((row) => new TableRow({ children: row.map((t) => cell(t)) })),
        }),
      ],
    },
  ],
});

(async () => {
  const buffer = await Packer.toBuffer(doc);
  const outPath = "C:\\Users\\liyou\\Downloads\\无敌了\\青云\\招标文件_OA系统开发项目.docx";
  fs.writeFileSync(outPath, buffer);
  console.log("OK: " + outPath);
})();
