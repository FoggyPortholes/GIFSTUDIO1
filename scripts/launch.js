#!/usr/bin/env node

'use strict';

const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');

function log(message) {
  console.log(`[launch] ${message}`);
}

function logWarn(message) {
  console.warn(`[launch][WARN] ${message}`);
}

function logError(message) {
  console.error(`[launch][ERROR] ${message}`);
}

function splitPath(value) {
  if (!value) {
    return [];
  }
  return value.split(path.delimiter).filter(Boolean);
}

function fileExists(filePath) {
  try {
    return fs.statSync(filePath).isFile();
  } catch (error) {
    return false;
  }
}

function dirExists(dirPath) {
  try {
    return fs.statSync(dirPath).isDirectory();
  } catch (error) {
    return false;
  }
}

function safeStat(target) {
  try {
    return fs.statSync(target);
  } catch (error) {
    return null;
  }
}

function buildPath(envPath, dir) {
  const segments = splitPath(envPath);
  const filtered = segments.filter((segment) => segment !== dir);
  filtered.unshift(dir);
  return filtered.join(path.delimiter);
}

function findPortableNode(root) {
  const portableDir = path.join(root, 'node-portable');
  if (!dirExists(portableDir)) {
    return null;
  }

  const directNames = ['node.exe', 'node'];
  for (const name of directNames) {
    const directCandidate = path.join(portableDir, name);
    if (fileExists(directCandidate)) {
      return directCandidate;
    }
  }

  const stack = [portableDir];
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
      if (entry.isFile() && directNames.includes(entry.name)) {
        return candidatePath;
      }
      if (entry.isDirectory()) {
        stack.push(candidatePath);
      }
    }
  }

  return null;
}

function resolveNpmForNode(nodePath) {
  const nodeDir = path.dirname(nodePath);
  const npmCliCandidates = [
    path.join(nodeDir, 'node_modules', 'npm', 'bin', 'npm-cli.js'),
    path.join(nodeDir, '..', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js')
  ];

  for (const cli of npmCliCandidates) {
    if (fileExists(cli)) {
      return {
        command: nodePath,
        args: [cli],
        displayName: `${nodePath} ${cli}`
      };
    }
  }

  const candidateNames = process.platform === 'win32' ? ['npm.cmd', 'npm'] : ['npm', 'npm.cmd'];
  for (const name of candidateNames) {
    const candidate = path.join(nodeDir, name);
    if (fileExists(candidate)) {
      return {
        command: candidate,
        args: [],
        displayName: candidate
      };
    }
  }

  return null;
}

function findExecutable(name) {
  if (path.isAbsolute(name)) {
    return fileExists(name) ? name : null;
  }

  const hasExt = !!path.extname(name);
  const extensions = process.platform === 'win32'
    ? (process.env.PATHEXT || '.EXE;.CMD;.BAT;.COM')
        .split(';')
        .map((ext) => ext.trim())
        .filter(Boolean)
    : [''];
  const candidates = hasExt ? [name] : extensions.map((ext) => name + ext.toLowerCase());
  const pathSegments = splitPath(process.env.PATH);

  for (const segment of pathSegments) {
    for (const candidate of candidates) {
      const candidatePath = path.join(segment, candidate);
      if (fileExists(candidatePath)) {
        return candidatePath;
      }
    }
  }

  return null;
}

function resolveSystemNpm() {
  const names = process.platform === 'win32' ? ['npm.cmd', 'npm'] : ['npm'];
  for (const name of names) {
    const resolved = findExecutable(name);
    if (resolved) {
      return {
        command: resolved,
        args: [],
        displayName: resolved
      };
    }
  }
  return null;
}

function resolveNodeEnvironment(root) {
  const portableNode = findPortableNode(root);
  if (portableNode) {
    const npm = resolveNpmForNode(portableNode);
    if (!npm) {
      logWarn('Found node-portable but npm was not located next to it; falling back to system runtime.');
    } else {
      const env = { ...process.env };
      env.PATH = buildPath(env.PATH, path.dirname(portableNode));
      return {
        label: 'portable',
        nodePath: portableNode,
        npm,
        env
      };
    }
  }

  const npm = resolveSystemNpm();
  if (!npm) {
    throw new Error('npm was not found in PATH. Install Node.js or add npm to PATH.');
  }

  return {
    label: 'system',
    nodePath: process.execPath,
    npm,
    env: { ...process.env }
  };
}

function shouldRunNpmInstall(root) {
  const nodeModulesDir = path.join(root, 'node_modules');
  if (!dirExists(nodeModulesDir)) {
    return true;
  }

  const lockFile = path.join(root, 'package-lock.json');
  if (!fileExists(lockFile)) {
    return true;
  }

  const internalLock = path.join(nodeModulesDir, '.package-lock.json');
  const lockStat = safeStat(lockFile);
  const internalLockStat = safeStat(internalLock);

  if (!internalLockStat) {
    return true;
  }

  if (lockStat && lockStat.mtimeMs > internalLockStat.mtimeMs + 1000) {
    return true;
  }

  return false;
}

function prepareCommand(command, args) {
  if (process.platform === 'win32' && /\.(cmd|bat)$/i.test(command)) {
    return {
      command: 'cmd.exe',
      args: ['/c', command, ...args]
    };
  }
  return { command, args };
}

function runCommand(command, args, options) {
  const prepared = prepareCommand(command, args);
  return new Promise((resolve, reject) => {
    const child = spawn(prepared.command, prepared.args, options);

    child.on('error', (error) => {
      reject(error);
    });

    child.on('exit', (code) => {
      if (typeof code === 'number' && code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} exited with code ${code}`));
      }
    });
  });
}

async function ensureDependencies(envObj, root) {
  if (!shouldRunNpmInstall(root)) {
    log('Dependencies appear up to date; skipping npm install.');
    return;
  }

  log('Running npm install to set up dependencies...');
  await runCommand(envObj.npm.command, [...envObj.npm.args, 'install'], {
    cwd: root,
    env: envObj.env,
    stdio: 'inherit'
  });
}

function startDevServer(envObj, root, scriptName, scriptArgs) {
  return new Promise((resolve, reject) => {
    const npmArgs = [...envObj.npm.args, 'run', scriptName];
    const hasDoubleDash = scriptArgs.length && scriptArgs[0] === '--';
    const finalArgs = hasDoubleDash ? scriptArgs.slice(1) : scriptArgs;

    if (hasDoubleDash || finalArgs.length) {
      npmArgs.push('--', ...finalArgs);
    }

    log(`Starting npm run ${scriptName}...`);
    const prepared = prepareCommand(envObj.npm.command, npmArgs);
    const child = spawn(prepared.command, prepared.args, {
      cwd: root,
      env: envObj.env,
      stdio: 'inherit'
    });

    const forwardSignal = (signal) => {
      if (!child.killed) {
        try {
          child.kill(signal);
        } catch (error) {
          child.kill();
        }
      }
    };

    const onSigInt = () => forwardSignal('SIGINT');
    const onSigTerm = () => forwardSignal('SIGTERM');

    process.on('SIGINT', onSigInt);
    process.on('SIGTERM', onSigTerm);

    child.on('error', (error) => {
      process.off('SIGINT', onSigInt);
      process.off('SIGTERM', onSigTerm);
      reject(error);
    });

    child.on('exit', (code, signal) => {
      process.off('SIGINT', onSigInt);
      process.off('SIGTERM', onSigTerm);
      resolve({ code, signal });
    });
  });
}

(async () => {
  try {
    log('=== GIF Studio Launch (Node) ===');
    const envObj = resolveNodeEnvironment(repoRoot);

    const npmVersionCommand = prepareCommand(envObj.npm.command, [...envObj.npm.args, '--version']);
    const npmVersion = spawnSync(npmVersionCommand.command, npmVersionCommand.args, {
      cwd: repoRoot,
      env: envObj.env,
      stdio: 'pipe',
      encoding: 'utf8'
    });
    if (npmVersion.error || npmVersion.status !== 0) {
      throw new Error(`Unable to determine npm version: ${(npmVersion.error && npmVersion.error.message) || npmVersion.stderr}`);
    }

    const nodeVersionCommand = prepareCommand(envObj.nodePath, ['--version']);
    const nodeVersion = spawnSync(nodeVersionCommand.command, nodeVersionCommand.args, {
      stdio: 'pipe',
      encoding: 'utf8'
    });
    if (nodeVersion.error || nodeVersion.status !== 0) {
      throw new Error(`Unable to determine node version: ${(nodeVersion.error && nodeVersion.error.message) || nodeVersion.stderr}`);
    }

    log(`Node (${envObj.label}): ${envObj.nodePath}`);
    log(`Node version: ${nodeVersion.stdout.trim()}`);
    log(`npm: ${envObj.npm.displayName}`);
    log(`npm version: ${npmVersion.stdout.trim()}`);

    await ensureDependencies(envObj, repoRoot);

    const forwardedArgs = process.argv.slice(2);
    let scriptName = 'dev';
    let scriptArgs = forwardedArgs;

    if (scriptArgs.length && scriptArgs[0] !== '--') {
      scriptName = scriptArgs[0];
      scriptArgs = scriptArgs.slice(1);
    }

    const result = await startDevServer(envObj, repoRoot, scriptName, scriptArgs);

    if (result.signal) {
      logWarn(`Dev server exited due to signal ${result.signal}.`);
      process.exit(0);
    }

    const exitCode = typeof result.code === 'number' ? result.code : 1;
    if (exitCode !== 0) {
      logWarn(`Dev server stopped with exit code ${exitCode}.`);
    }
    process.exit(exitCode);
  } catch (error) {
    logError(error.message);
    process.exit(1);
  }
})();
