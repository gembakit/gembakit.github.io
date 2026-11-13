// Lanza Vitest con la letra de unidad en mayúscula.
// En Windows, si la terminal entrega "c:\…", Vitest carga dos veces el mismo
// módulo y todas las pruebas fallan con "failed to find the current suite".
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const cwd = process.cwd().replace(/^[a-z]:/, (d) => d.toUpperCase());
const require = createRequire(`${cwd}/package.json`);
const pkgPath = require.resolve('vitest/package.json');
const pkg = require(pkgPath);
const bin = typeof pkg.bin === 'string' ? pkg.bin : pkg.bin.vitest;
const vitestBin = pkgPath.replace(/package.json$/, bin);

const result = spawnSync(process.execPath, [vitestBin, ...process.argv.slice(2)], {
  cwd,
  stdio: 'inherit',
});
process.exit(result.status ?? 1);
