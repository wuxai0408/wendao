const fs = require('fs');
const http = require('http');

const filePath = 'C:\\Users\\liyou\\Downloads\\无敌了\\青云\\招标助理数据透视表速成.pptx';
const fileBuffer = fs.readFileSync(filePath);
const boundary = '----' + Date.now();

const header = Buffer.from(
  '--' + boundary + '\r\n' +
  'Content-Disposition: form-data; name="file"; filename="data.pptx"\r\n' +
  'Content-Type: application/vnd.openxmlformats-officedocument.presentationml.presentation\r\n\r\n'
);
const footer = Buffer.from('\r\n--' + boundary + '--\r\n');
const body = Buffer.concat([header, fileBuffer, footer]);

const options = {
  hostname: 'uguu.se',
  path: '/upload',
  method: 'POST',
  headers: {
    'Content-Type': 'multipart/form-data; boundary=' + boundary,
    'Content-Length': body.length
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log(data));
});
req.on('error', (e) => console.error('Error:', e.message));
req.write(body);
req.end();
