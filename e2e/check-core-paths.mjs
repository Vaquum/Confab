import fs from 'node:fs';
import path from 'node:path';

const E2E_DIR = 'e2e';
const CORE_PATHS_FILE = path.join(E2E_DIR, 'core-paths.ts');

function readUtf8(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function extractArrayBlock(source, marker) {
  const start = source.indexOf(marker);
  if (start === -1) {
    throw new Error(`Missing marker: ${marker}`);
  }
  const equalsIndex = source.indexOf('=', start);
  if (equalsIndex === -1) {
    throw new Error(`Missing assignment for marker: ${marker}`);
  }
  const blockStart = source.indexOf('[', equalsIndex);
  if (blockStart === -1) {
    throw new Error(`Missing array start for marker: ${marker}`);
  }
  let depth = 0;
  for (let index = blockStart; index < source.length; index += 1) {
    const ch = source[index];
    if (ch === '[') {
      depth += 1;
    } else if (ch === ']') {
      depth -= 1;
      if (depth === 0) {
        return source.slice(blockStart, index + 1);
      }
    }
  }
  throw new Error(`Unclosed array block for marker: ${marker}`);
}

function extractQuotedValues(block, key) {
  const regex = new RegExp(`${key}\\s*:\\s*(['"])([^'"]+)\\1`, 'g');
  const values = [];
  let match;
  while (true) {
    match = regex.exec(block);
    if (!match) {
      break;
    }
    values.push(match[2]);
  }
  return values;
}

function findDuplicates(values) {
  const counts = new Map();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .filter(([, count]) => count > 1)
    .map(([value]) => value);
}

function detectMode(prompt) {
  const normalized = prompt.trim().toLowerCase();
  if (normalized.startsWith('/help')) return 'help';
  if (normalized.startsWith('/?')) return 'help';
  if (normalized.startsWith('/doc+')) return 'doc_plus';
  if (normalized.startsWith('/doc')) return 'doc';
  if (normalized.startsWith('/consensus')) return 'consensus';
  if (normalized.startsWith('/pr')) return 'pr';
  if (normalized.startsWith('@gpt')) return 'gpt';
  if (normalized.startsWith('@grok')) return 'grok';
  if (normalized.startsWith('@gemini')) return 'gemini';
  return 'chat';
}

function main() {
  const root = process.cwd();
  const corePathsPath = path.join(root, CORE_PATHS_FILE);
  const source = readUtf8(corePathsPath);

  const corePathsBlock = extractArrayBlock(source, 'export const CORE_PATHS');
  const modeMatrixBlock = extractArrayBlock(source, 'export const MODE_MATRIX_CASES');

  const corePathIds = extractQuotedValues(corePathsBlock, 'id');
  const corePathSpecs = extractQuotedValues(corePathsBlock, 'ownerSpec');
  const corePathDescriptions = extractQuotedValues(corePathsBlock, 'description');

  const matrixCaseIds = extractQuotedValues(modeMatrixBlock, 'id');
  const matrixPrompts = extractQuotedValues(modeMatrixBlock, 'prompt');

  const errors = [];

  if (corePathIds.length === 0) {
    errors.push('CORE_PATHS must define at least one path.');
  }
  if (matrixCaseIds.length === 0) {
    errors.push('MODE_MATRIX_CASES must define at least one scenario.');
  }
  if (corePathDescriptions.some((item) => !item.trim())) {
    errors.push('All CORE_PATHS entries must include non-empty descriptions.');
  }

  for (const duplicate of findDuplicates(corePathIds)) {
    errors.push(`Duplicate CORE_PATHS id: ${duplicate}`);
  }
  for (const duplicate of findDuplicates(corePathSpecs)) {
    errors.push(`Duplicate CORE_PATHS ownerSpec: ${duplicate}`);
  }
  for (const duplicate of findDuplicates(matrixCaseIds)) {
    errors.push(`Duplicate MODE_MATRIX_CASES id: ${duplicate}`);
  }

  const expectedSpecFiles = fs
    .readdirSync(path.join(root, E2E_DIR))
    .filter((name) => name.endsWith('.spec.ts'))
    .map((name) => path.join(E2E_DIR, name))
    .sort();
  const declaredSpecFiles = [...corePathSpecs].sort();

  for (const spec of declaredSpecFiles) {
    const fullPath = path.join(root, spec);
    if (!fs.existsSync(fullPath)) {
      errors.push(`CORE_PATHS ownerSpec does not exist: ${spec}`);
    }
  }

  for (const spec of expectedSpecFiles) {
    if (!declaredSpecFiles.includes(spec)) {
      errors.push(
        `Spec file missing from CORE_PATHS manifest: ${spec}. Add an owner entry in e2e/core-paths.ts.`,
      );
    }
  }

  const requiredModes = new Set([
    'chat',
    'help',
    'gpt',
    'grok',
    'gemini',
    'doc',
    'doc_plus',
    'consensus',
    'pr',
  ]);
  const coveredModes = new Set(matrixPrompts.map((prompt) => detectMode(prompt)));
  for (const mode of requiredModes) {
    if (!coveredModes.has(mode)) {
      errors.push(`MODE_MATRIX_CASES missing required mode coverage: ${mode}`);
    }
  }

  if (errors.length > 0) {
    console.error('E2E policy check failed:');
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log('E2E policy check passed.');
  console.log(`- core paths: ${corePathIds.length}`);
  console.log(`- mapped specs: ${declaredSpecFiles.length}`);
  console.log(`- matrix cases: ${matrixCaseIds.length}`);
}

try {
  main();
} catch (error) {
  console.error('E2E policy check crashed.');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
