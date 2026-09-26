import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../src');

function getImports(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const imports = [];
  const regex = /import\s+.*?from\s+['"](.*?)['"]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    if (match[1].startsWith('.')) {
      imports.push({
        raw: match[1],
        resolved: path.resolve(path.dirname(filePath), match[1]),
      });
    }
  }
  return imports;
}

function walk(dir) {
  let files = [];
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    if (fs.statSync(full).isDirectory()) {
      files = files.concat(walk(full));
    } else if (full.endsWith('.js')) {
      files.push(full);
    }
  }
  return files;
}

test('Arquitectura: Cero dependencias circulares en todo src/', () => {
  const allFiles = walk(srcDir);
  const graph = {};
  for (const f of allFiles) {
    graph[f] = getImports(f).map(i => i.resolved);
  }

  function findCycle(node, visited = new Set(), stack = []) {
    visited.add(node);
    stack.push(node);
    for (const neighbor of (graph[node] || [])) {
      if (!visited.has(neighbor)) {
        const cycle = findCycle(neighbor, visited, stack);
        if (cycle) return cycle;
      } else if (stack.includes(neighbor)) {
        return [...stack.slice(stack.indexOf(neighbor)), neighbor];
      }
    }
    stack.pop();
    return null;
  }

  for (const f of allFiles) {
    const cycle = findCycle(f);
    assert.strictEqual(
      cycle,
      null,
      `Ciclo de dependencias detectado: ${cycle ? cycle.map(p => path.relative(srcDir, p)).join(' -> ') : ''}`
    );
  }
});

test('Arquitectura: Cumplimiento estricto de la regla de dependencias (Clean Architecture)', () => {
  const allFiles = walk(srcDir);
  const violations = [];

  for (const f of allFiles) {
    const rel = path.relative(srcDir, f).replace(/\\/g, '/');
    const imports = getImports(f);

    for (const imp of imports) {
      const impRel = path.relative(srcDir, imp.resolved).replace(/\\/g, '/');

      // 1. src/core solo puede importar de src/core
      if (rel.startsWith('core/')) {
        if (!impRel.startsWith('core/')) {
          violations.push(`${rel} importa ${impRel} (core no puede importar fuera de core)`);
        }
      }

      // 2. Capa domain solo puede importar de domain o core
      if (rel.includes('/domain/')) {
        if (impRel.includes('/infrastructure/') || impRel.includes('/presentation/') || impRel.includes('/application/')) {
          violations.push(`${rel} importa ${impRel} (domain no puede importar application, infrastructure ni presentation)`);
        }
      }

      // 3. Capa application no puede importar infrastructure ni presentation
      if (rel.includes('/application/')) {
        if (impRel.includes('/infrastructure/') || impRel.includes('/presentation/')) {
          violations.push(`${rel} importa ${impRel} (application no puede importar infrastructure ni presentation)`);
        }
      }

      // 4. Capa infrastructure no puede importar presentation
      if (rel.includes('/infrastructure/')) {
        if (impRel.includes('/presentation/')) {
          violations.push(`${rel} importa ${impRel} (infrastructure no puede importar presentation)`);
        }
      }
    }
  }

  assert.deepStrictEqual(violations, [], `Violaciones de regla de dependencia detectadas:\n${violations.join('\n')}`);
});

test('Arquitectura: Inversión de dependencias en controladores (sin acoplamiento a Storage singleton)', () => {
  const controllers = [
    path.join(srcDir, 'features/scheduling/presentation/schedule.controller.js'),
    path.join(srcDir, 'features/settings/presentation/settings.controller.js'),
    path.join(srcDir, 'features/individual/presentation/individual.controller.js'),
    path.join(srcDir, 'main.js'),
  ];

  for (const ctrlPath of controllers) {
    const content = fs.readFileSync(ctrlPath, 'utf8');
    const rel = path.relative(srcDir, ctrlPath);
    assert.strictEqual(
      content.includes("from './storage.js'") || content.includes("from '../../../storage.js'"),
      false,
      `${rel} no debe importar directamente el singleton Storage`
    );
  }
});
