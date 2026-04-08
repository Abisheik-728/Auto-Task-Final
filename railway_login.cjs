const { spawn } = require('child_process');
const child = spawn('npx.cmd', ['@railway/cli', 'login', '--browserless'], { shell: true });
child.stdout.on('data', (d) => process.stdout.write(`OUT: ${d.toString()}`));
child.stderr.on('data', (d) => process.stdout.write(`ERR: ${d.toString()}`));
