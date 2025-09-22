#!/usr/bin/env node

'use strict';

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

function run(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, options);

    child.on('error', (error) => {
      reject(error);
    });

    child.on('exit', (code, signal) => {
      if (typeof code === 'number') {
        resolve({ code, signal });
        return;
      }
      resolve({ code: signal ? 1 : 0, signal });
    });
  });
}

function fileExists(target) {
  try {
    return fs.statSync(target).isFile();
  } catch (error) {
    return false;
  }
}

function resolvePortableNode(root) {
  const base = path.join(root, 'node-portable');
  const candidates = ['node.exe', 'node'];

  for (const name of candidates) {
    const direct = path.join(base, name);
    if (fileExists(direct)) {
      return direct;
    }
  }

  const stack = [base];
  while (stack.length) {
    const current = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch (error) {
      continue;
    }

    for (const entry of entries) {
      const candidatePath = path.join(current, entry.name);
      if (entry.isFile() && candidates.includes(entry.name)) {
        return candidatePath;
      }
      if (entry.isDirectory()) {
        stack.push(candidatePath);
      }
    }
  }

  return null;
}

async function main() {
  const repoRoot = path.resolve(__dirname, '..');
  const args = process.argv.slice(2);

  const [majorStr] = process.versions.node.split('.', 1);
  const major = Number(majorStr);

  if (Number.isFinite(major) && major >= 18) {
    const viteBin = path.join(repoRoot, 'node_modules', 'vite', 'bin', 'vite.js');
    const result = await run(process.execPath, [viteBin, ...args], {
      cwd: repoRoot,
      stdio: 'inherit'
    });
    process.exit(result.signal ? 1 : result.code);
  }

  const portableNode = resolvePortableNode(repoRoot);
  if (!portableNode) {
    console.error('\n[dev] Node.js 18+ is required for Vite dev server.');
    console.error('[dev] Install a newer Node.js or use the bundled node-portable runtime.');
    process.exit(1);
  }

  const launchScript = path.join(repoRoot, 'scripts', 'launch.js');
  const result = await run(process.execPath, [launchScript, 'dev:vite', '--', ...args], {
    cwd: repoRoot,
    stdio: 'inherit'
  });

  process.exit(result.signal ? 1 : result.code);
}

main().catch((error) => {
  console.error(`[dev] ${error.message}`);
  process.exit(1);
});
