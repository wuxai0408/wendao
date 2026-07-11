const docx = require('docx');
const fs = require('fs');

const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = docx;

const doc = new Document({
    sections: [{
        properties: {},
        children: [
            new Paragraph({
                text: '招标公告',
                heading: HeadingLevel.TITLE,
                alignment: AlignmentType.CENTER,
                spacing: { after: 200 }
            }),
            new Paragraph({
                children: [
                    new TextRun({ text: '项目名称：', bold: true }),
                    new TextRun('XX公司OA系统升级改造项目')
                ],
                spacing: { after: 100 }
            }),
            new Paragraph({
                children: [
                    new TextRun({ text: '招标编号：', bold: true }),
                    new TextRun('XX-2024-ZB-001')
                ],
                spacing: { after: 200 }
            }),

            new Paragraph({ text: '一、招标条件', heading: HeadingLevel.HEADING_1, spacing: { before: 200, after: 100 } }),
            new Paragraph('本招标项目XX公司OA系统升级改造项目已由XX公司批准建设，项目资金已落实，招标人为XX公司。项目已具备招标条件，现对该项目进行公开招标。'),

            new Paragraph({ text: '二、项目概况与招标范围', heading: HeadingLevel.HEADING_1, spacing: { before: 200, after: 100 } }),
            new Paragraph({ children: [new TextRun({ text: '项目地点：', bold: true }), new TextRun('XX市XX区XX路XX号')] }),
            new Paragraph({ children: [new TextRun({ text: '招标范围：', bold: true }), new TextRun('OA系统架构升级、流程引擎优化、移动端适配开发')] }),
            new Paragraph({ children: [new TextRun({ text: '工期要求：', bold: true }), new TextRun('合同签订后90日历天内完成')] }),
            new Paragraph({ children: [new TextRun({ text: '质量要求：', bold: true }), new TextRun('符合国家及行业现行验收规范合格标准')] }),
            new Paragraph({ children: [new TextRun({ text: '预算金额：', bold: true }), new TextRun('人民币80万元')] }),

            new Paragraph({ text: '三、投标人资格要求', heading: HeadingLevel.HEADING_1, spacing: { before: 200, after: 100 } }),
            new Paragraph('1. 在中华人民共和国境内注册，具有独立法人资格；'),
            new Paragraph('2. 具有软件企业认定证书或CMMI三级及以上资质；'),
            new Paragraph('3. 近三年（2021年1月至今）至少具有3个同类项目业绩（合同金额50万元以上，提供合同复印件）；'),
            new Paragraph('4. 拟派项目经理须具有PMP证书或信息系统项目管理师证书；'),
            new Paragraph('5. 本项目不接受联合体投标。'),

            new Paragraph({ text: '四、招标文件的获取', heading: HeadingLevel.HEADING_1, spacing: { before: 200, after: 100 } }),
            new Paragraph({ children: [new TextRun({ text: '时间：', bold: true }), new TextRun('2024年X月X日至2024年X月X日，每日9:00-17:00')] }),
            new Paragraph({ children: [new TextRun({ text: '地点：', bold: true }), new TextRun('XX市XX区XX路XX号XX楼XX室')] }),
            new Paragraph({ children: [new TextRun({ text: '方式：', bold: true }), new TextRun('持营业执照复印件、授权委托书、被授权人身份证原件及复印件（均加盖公章）现场购买')] }),
            new Paragraph({ children: [new TextRun({ text: '售价：', bold: true }), new TextRun('人民币500元/份，售后不退')] }),

            new Paragraph({ text: '五、投标文件的递交', heading: HeadingLevel.HEADING_1, spacing: { before: 200, after: 100 } }),
            new Paragraph({ children: [new TextRun({ text: '截止时间：', bold: true }), new TextRun('2024年X月X日 9:30（北京时间）')] }),
            new Paragraph({ children: [new TextRun({ text: '地点：', bold: true }), new TextRun('XX市XX区XX路XX号XX楼XX会议室')] }),
            new Paragraph({ text: '逾期送达的或者未送达指定地点的投标文件，招标人不予受理。', bold: true }),

            new Paragraph({ text: '六、开标时间及地点', heading: HeadingLevel.HEADING_1, spacing: { before: 200, after: 100 } }),
            new Paragraph({ children: [new TextRun({ text: '开标时间：', bold: true }), new TextRun('2024年X月X日 9:30（北京时间）')] }),
            new Paragraph({ children: [new TextRun({ text: '开标地点：', bold: true }), new TextRun('XX市XX区XX路XX号XX楼XX会议室')] }),

            new Paragraph({ text: '七、联系方式', heading: HeadingLevel.HEADING_1, spacing: { before: 200, after: 100 } }),
            new Paragraph({ children: [new TextRun({ text: '招标人：', bold: true }), new TextRun('XX公司')] }),
            new Paragraph({ children: [new TextRun({ text: '地址：', bold: true }), new TextRun('XX市XX区XX路XX号')] }),
            new Paragraph({ children: [new TextRun({ text: '联系人：', bold: true }), new TextRun('张工')] }),
            new Paragraph({ children: [new TextRun({ text: '电话：', bold: true }), new TextRun('010-XXXXXXXX')] }),
            new Paragraph({ children: [new TextRun({ text: '邮箱：', bold: true }), new TextRun('zhang@xx.com')] }),

            new Paragraph({ text: '八、公告发布媒介', heading: HeadingLevel.HEADING_1, spacing: { before: 200, after: 100 } }),
            new Paragraph('本次招标公告同时在中国招标投标公共服务平台、XX公司官网上发布。'),

            new Paragraph({
                children: [new TextRun({ text: '发布时间：2024年X月X日' })],
                alignment: AlignmentType.RIGHT,
                spacing: { before: 400 }
            })
        ]
    }]
});

Packer.toBuffer(doc).then(buffer => {
    const outPath = '招标公告_OA系统升级改造项目.docx';
    fs.writeFileSync(outPath, buffer);
    console.log('✅ 生成成功: ' + outPath);
}).catch(err => {
    console.error('❌ 失败: ' + err.message);
});
