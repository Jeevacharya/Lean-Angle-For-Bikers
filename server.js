/**
 * MotoLean Local Development & Phone Connect Server
 * Zero dependencies - works with standard Node.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

// MIME types map
const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.apk': 'application/vnd.android.package-archive'
};

// Find local IPv4 address for phone connectivity
function getLocalIPAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal (loopback 127.0.0.1) and non-IPv4
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  return addresses;
}

const server = http.createServer((req, res) => {
  // Simple API endpoint to provide local IP addresses to web app
  if (req.url === '/api/info') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      port: PORT,
      ips: getLocalIPAddresses()
    }));
    return;
  }

  // Parse requested URL
  let parsedUrl = req.url.split('?')[0];
  if (parsedUrl === '/') {
    parsedUrl = '/index.html';
  }

  // Prevent directory traversal
  const safePath = path.normalize(parsedUrl).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(PUBLIC_DIR, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // Allow CORS and proper PWA caching headers
    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const localIPs = getLocalIPAddresses();
  const phoneIP = localIPs[0] || '192.168.0.x';

  console.log(`\n📱 Direct APK Download on your Phone:`);
  localIPs.forEach(ip => {
    console.log(`   http://${ip}:${PORT}/MotoLean.apk`);
  });
  console.log('\n======================================================');
  console.log('   🏍️  MOTO LEAN ANGLE - BIKER GAUGE SERVER RUNNING   ');
  console.log('======================================================');
  console.log(`\n💻 Open on this computer:`);
  console.log(`   http://localhost:${PORT}`);
  console.log(`\n📱 Open on your Mobile Phone (on same Wi-Fi):`);
  localIPs.forEach(ip => {
    console.log(`   http://${ip}:${PORT}`);
  });
  console.log(`\n📱 Direct APK Download on your Phone:`);
  localIPs.forEach(ip => {
    console.log(`   http://${ip}:${PORT}/MotoLean.apk`);
  });
  console.log('\n======================================================');
  console.log('💡 Quick Tips:');
  console.log(' - Mount phone on bike in portrait or landscape.');
  console.log(' - Sit on bike, hold straight & press CALIBRATE (ZERO).');
  console.log(' - Right turns: +ve angle (+32°), Left turns: -ve angle (-28°).');
  console.log('======================================================\n');
});
