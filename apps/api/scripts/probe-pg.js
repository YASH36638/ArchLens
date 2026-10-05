const fs = require('fs');
const path = require('path');
const tls = require('tls');
const net = require('net');

const envPath = path.join(__dirname, '..', '.env');
const env = Object.fromEntries(
  fs
    .readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const url = new URL(env.DIRECT_DATABASE_URL);
const host = url.hostname;
const port = Number(url.port || 5432);
const user = decodeURIComponent(url.username);
const password = decodeURIComponent(url.password);
const database = url.pathname.replace(/^\//, '').split('?')[0];

console.log('host=', host, 'db=', database, 'user=', user, 'passLen=', password.length);

const SSL_REQUEST = Buffer.from([0, 0, 0, 8, 0x04, 0xd2, 0x16, 0x2f]);

function startupMessage() {
  const body = Buffer.concat([
    Buffer.from([0, 3, 0, 0]),
    Buffer.from(`user\0${user}\0database\0${database}\0\0`, 'utf8'),
  ]);
  const len = Buffer.alloc(4);
  len.writeInt32BE(4 + body.length, 0);
  return Buffer.concat([len, body]);
}

const socket = net.connect({ host, port }, () => {
  console.log('tcp ok', socket.remoteAddress);
  socket.write(SSL_REQUEST);
});

socket.once('data', (chunk) => {
  const reply = chunk.toString('utf8');
  console.log('sslrequest reply=', JSON.stringify(reply), 'hex=', chunk.toString('hex'));
  if (reply[0] !== 'S') {
    console.error('server refused SSL');
    process.exit(1);
  }

  const secure = tls.connect(
    { socket, servername: host, rejectUnauthorized: true, minVersion: 'TLSv1.2' },
    () => {
      console.log('tls ok', secure.getProtocol());
      secure.write(startupMessage());
    }
  );

  let buf = Buffer.alloc(0);
  secure.on('data', (data) => {
    buf = Buffer.concat([buf, data]);
    const tag = String.fromCharCode(buf[0]);
    console.log('msg tag=', tag, 'len=', buf.length);
    if (tag === 'R' && buf.length >= 9) {
      console.log('auth type=', buf.readInt32BE(5));
    }
    if (tag === 'E') {
      console.log('error=', buf.toString('utf8').replace(/\0/g, ' | '));
      process.exit(1);
    }
    if (buf.length > 8) {
      console.log('postgres handshake progressed (got server packet)');
      secure.end();
      process.exit(0);
    }
  });
  secure.on('error', (e) => {
    console.error('tls error', e.message);
    process.exit(1);
  });
  secure.setTimeout(20000, () => {
    console.error('timeout after tls');
    process.exit(1);
  });
});

socket.on('error', (e) => {
  console.error('tcp error', e.message);
  process.exit(1);
});
socket.setTimeout(15000, () => {
  console.error('tcp/sslrequest timeout');
  process.exit(1);
});
