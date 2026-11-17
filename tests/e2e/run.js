/* Lance tous les tests : node tests/e2e/run.js   (ou un seul : node tests/e2e/run.js doublons)
   Démarre un petit serveur local sur le port 8123 (racine du dépôt), exécute chaque
   *.test.js l'un après l'autre, puis affiche le bilan. Code de sortie 1 si un test échoue. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

/* Lance un test sans bloquer le serveur ci-dessous (spawnSync le figerait). */
function runTest(file) {
  return new Promise(resolve => {
    const ch = spawn(process.execPath, [file], { cwd: __dirname });
    let out = '';
    ch.stdout.on('data', d => { out += d; });
    ch.stderr.on('data', d => { out += d; });
    const t = setTimeout(() => ch.kill(), 300000);
    ch.on('close', code => { clearTimeout(t); resolve({ code, out }); });
  });
}

const ROOT = path.resolve(__dirname, '..', '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' };

const server = http.createServer((req, res) => {
  const p = path.normalize(path.join(ROOT, decodeURIComponent(req.url.split('?')[0])));
  if (!p.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  const file = fs.existsSync(p) && fs.statSync(p).isDirectory() ? path.join(p, 'index.html') : p;
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(8123, async () => {
  const only = process.argv[2];
  const tests = fs.readdirSync(__dirname).filter(f => f.endsWith('.test.js') && (!only || f.includes(only))).sort();
  const unit = only ? [] : fs.readdirSync(path.join(ROOT, 'tests')).filter(f => f.endsWith('.test.mjs')).map(f => path.join('..', f));
  let ko = 0;
  for (const t of [...unit, ...tests]) {
    const r = await runTest(path.join(__dirname, t));
    const out = r.out;
    const fails = out.split('\n').filter(l => /^(FAIL|ÉCHEC)|TimeoutError|Error:/.test(l));
    const bad = r.code !== 0 || fails.length > 0;
    if (bad) ko++;
    console.log((bad ? '✘ ' : '✔ ') + path.basename(t) + (bad ? '\n    ' + (fails.slice(0, 5).join('\n    ') || out.trim().split('\n').slice(-3).join('\n    ')) : ''));
  }
  console.log(ko ? `\n${ko} test(s) en échec` : '\nTOUS LES TESTS PASSENT');
  server.close();
  process.exit(ko ? 1 : 0);
});
