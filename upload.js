const http = require('https');
const fs = require('fs');

const filePath = 'C:\\Users\\liyou\\Downloads\\无敌了\\青云\\数据透视表从入门到精通.pptx';
const file = fs.readFileSync(filePath);
const boundary = '----' + Date.now();

let body = '';
body += '--' + boundary + '\r\n';
body += 'Content-Disposition: form-data; name="file"; filename="数据透视表从入门到精通.pptx"\r\n';
body += 'Content-Type: application/vnd.openxmlformats-officedocument.presentationml.presentation\r\n\r\n';

const bodyStart = Buffer.from(body, 'utf-8');
const bodyEnd = Buffer.from('\r\n--' + boundary + '--\r\n', 'utf-8');
const fullBody = Buffer.concat([bodyStart, file, bodyEnd]);

const options = {
  hostname: 'tmpfiles.org',
  path: '/api/v1/upload',
  method: 'POST',
  headers: {
    'Content-Type': 'multipart/form-data; boundary=' + boundary,
    'Content-Length': fullBody.length
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log(data));
});
req.on('error', (e) => console.error('Error:', e.message));
req.write(fullBody);
req.end();
