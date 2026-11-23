import { spawn } from 'node:child_process';

const compiler = new URL('../node_modules/typescript/bin/tsc', import.meta.url);
const build = spawn(process.execPath, [compiler.pathname, '-p', 'tsconfig.json'], { stdio: 'inherit' });
build.on('exit', (code) => {
  if (code !== 0) process.exit(code ?? 1);
  const children = [
    spawn(process.execPath, [compiler.pathname, '-p', 'tsconfig.json', '--watch', '--preserveWatchOutput'], { stdio: 'inherit' }),
    spawn(process.execPath, ['--watch', 'dist/src/server.js'], { stdio: 'inherit' }),
  ];
  let stopping = false;
  const stop = () => {
    if (stopping) return;
    stopping = true;
    for (const child of children) child.kill('SIGTERM');
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  for (const child of children) child.on('exit', stop);
});
