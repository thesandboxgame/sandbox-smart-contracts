import {HardhatUserConfig} from 'hardhat/types';
import path from 'path';
import {traverse} from 'hardhat-deploy/dist/src/utils';

export function addSourceFiles(initial: HardhatUserConfig): HardhatUserConfig {
  const dirs = traverse('node_modules').filter(x => x.name.startsWith('sandbox-smart-contracts'));
  let paths: string[] = [];
  for (const d of dirs) {
    const entries = traverse(path.join('node_modules', d.name), [], 'node_modules',
      (name, stats) => !name.startsWith('.') && (stats.isDirectory() || name.endsWith('.sol'))
    ).filter(x => !x.directory).map(x => x.relativePath);
    paths = [...paths, ...entries];
  }

  return {
    ...initial,
    dependencyCompiler: {
      ...initial.dependencyCompiler,
      paths: [...(initial.dependencyCompiler && initial.dependencyCompiler.paths || []), ...paths]
    }
  };
}
