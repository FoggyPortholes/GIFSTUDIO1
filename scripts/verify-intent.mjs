import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const expectedIntent = 'Character Creator with AI image generation and simple GIF creation tools';

const currentFile = fileURLToPath(import.meta.url);
const intentPath = resolve(dirname(currentFile), '../src/intent.ts');

async function verifyIntent() {
  try {
    const intentSource = await readFile(intentPath, 'utf8');
    if (!intentSource.includes(expectedIntent)) {
      console.error(`APP_INTENT check failed. Expected string: '${expectedIntent}'`);
      process.exit(1);
    }
    console.log('APP_INTENT verified.');
  } catch (error) {
    console.error('Unable to read APP_INTENT:', error);
    process.exit(1);
  }
}

await verifyIntent();