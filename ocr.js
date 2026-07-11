const Tesseract = require('tesseract.js');
const fs = require('fs');
const path = require('path');

const imagesDir = path.join(__dirname, 'images');

// 获取所有图片文件
const files = fs.readdirSync(imagesDir).filter(f => 
  /\.(png|jpg|jpeg|bmp|gif|webp)$/i.test(f)
);

if (files.length === 0) {
  console.log('⚠️  images 文件夹中没有图片文件');
  console.log('请把你的图片放到：' + imagesDir);
  process.exit(0);
}

(async () => {
  for (const file of files) {
    const filePath = path.join(imagesDir, file);
    console.log(`\n📄 正在识别: ${file}`);
    try {
      const { data } = await Tesseract.recognize(filePath, 'chi_sim+eng', {
        logger: m => {
          if (m.status === 'recognizing text') {
            process.stdout.write(`\r   进度: ${Math.round(m.progress * 100)}%`);
          }
        }
      });
      console.log(`\n✅ 识别结果:\n${"─".repeat(40)}`);
      console.log(data.text || '（未识别到文字）');
      console.log("─".repeat(40));
    } catch (err) {
      console.log(`❌ 识别失败: ${err.message}`);
    }
  }
  console.log('\n✨ 全部识别完成！');
})();
