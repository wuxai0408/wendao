const docx = require('docx');
const fs = require('fs');
const path = require('path');

const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } = docx;

const doc = new Document({
    sections: [{
        properties: {},
        children: [
            new Paragraph({
                text: "反思记录",
                heading: HeadingLevel.HEADING_1,
                alignment: AlignmentType.CENTER,
                spacing: { after: 400 },
                borders: {
                    bottom: { style: BorderStyle.SINGLE, size: 6, color: "333333" }
                }
            }),

            // 第一条
            new Paragraph({
                text: `1. PPT需求没对齐就批量产出`,
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 300, after: 100 }
            }),
            new Paragraph({
                children: [new TextRun({ text: `先出1页样稿确认方向，再批量做。不猜需求。`, size: 24 })],
                spacing: { after: 200 }
            }),

            // 第二条
            new Paragraph({
                text: `2. 用户说"继续"就机械循环`,
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 300, after: 100 }
            }),
            new Paragraph({
                children: [new TextRun({ text: `连续2次"继续"=红灯，立即停下来问方向对不对。`, size: 24 })],
                spacing: { after: 200 }
            }),

            // 第三条
            new Paragraph({
                text: `3. 做一半才返工`,
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 300, after: 100 }
            }),
            new Paragraph({
                children: [new TextRun({ text: `设中间校验点，分阶段交付，不一口气干到底。`, size: 24 })],
                spacing: { after: 200 }
            }),

            // 第四条
            new Paragraph({
                text: `4. 用户不耐烦信号没识别`,
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 300, after: 100 }
            }),
            new Paragraph({
                children: [new TextRun({ text: `问"还要多久/好了没"=立即止损，问要不要换方案。`, size: 24 })],
                spacing: { after: 200 }
            }),

            // 第五条
            new Paragraph({
                text: `5. 对话前未回顾经验库`,
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 300, after: 100 }
            }),
            new Paragraph({
                children: [new TextRun({ text: `不动手先翻库，翻了再开工。`, size: 24 })],
                spacing: { after: 200 }
            }),

            // 结尾
            new Paragraph({
                children: [new TextRun({ text: `\n—— 记录于对话复盘`, size: 20, italics: true, color: "888888" })],
                alignment: AlignmentType.RIGHT,
                spacing: { before: 400 }
            })
        ]
    }]
});

const outputPath = path.join(__dirname, "反思记录.docx");

Packer.toBuffer(doc).then(buffer => {
    fs.writeFileSync(outputPath, buffer);
    console.log("OK: " + outputPath + " (" + buffer.length + " bytes)");
});
