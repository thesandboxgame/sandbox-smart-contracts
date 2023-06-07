import {task} from 'hardhat/config';
import {
  TASK_COMPILE,
  TASK_COMPILE_SOLIDITY,
  TASK_COMPILE_SOLIDITY_GET_DEPENDENCY_GRAPH,
  TASK_COMPILE_SOLIDITY_GET_SOURCE_NAMES,
  TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS,
} from 'hardhat/builtin-tasks/task-names';
import {getAllFilesMatching} from 'hardhat/internal/util/fs-utils';
import {normalizeSourceName} from 'hardhat/utils/source-names';
import path from 'path';
import {DependencyGraph} from 'hardhat/types';
import fsPromises from 'fs/promises';

const NODE_MODULES = 'node_modules';

declare module 'hardhat/types/runtime' {
  interface HardhatRuntimeEnvironment {
    _currentPkg?: {name: string; sourcePath: string | string[]};
  }
}
declare module 'hardhat/types/config' {
  interface HardhatUserConfig {
    importedPackages: {[name: string]: string};
  }
}

task(
  TASK_COMPILE,
  'Compiles the entire project, building all artifacts including imported packages'
).setAction(async (args, hre, runSuper) => {
  for (const pkg in hre.userConfig.importedPackages) {
    console.log('Compiling', pkg);
    hre._currentPkg = {
      name: pkg,
      sourcePath: hre.userConfig.importedPackages[pkg],
    };
    await hre.run(TASK_COMPILE_SOLIDITY, {...args, pkg});
  }
  hre._currentPkg = undefined;
  console.log('Compiling this');
  return runSuper(args);
});

task(
  TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS,
  async (args, {_currentPkg, config}, runSuper): Promise<string[]> => {
    if (_currentPkg) {
      const sources = Array.isArray(_currentPkg.sourcePath)
        ? _currentPkg.sourcePath
        : [_currentPkg.sourcePath];
      // Collect the package files to compile.
      const root = path.join(config.paths.root, NODE_MODULES);
      const paths: string[] = [];
      for (const s of sources) {
        const absolutePathToFile = path.join(root, _currentPkg.name, s);
        const stats = await fsPromises.stat(absolutePathToFile);
        if (stats.isDirectory()) {
          paths.push(
            ...(await getAllFilesMatching(absolutePathToFile, (f) =>
              f.endsWith('.sol')
            ))
          );
        } else {
          paths.push(absolutePathToFile);
        }
      }
      return paths.map((x) => path.relative(root, x));
    }
    return runSuper(args);
  }
);

task(TASK_COMPILE_SOLIDITY_GET_SOURCE_NAMES).setAction(
  async (args, {_currentPkg}, runSuper): Promise<string[]> => {
    const {sourcePaths}: {sourcePaths: string[]} = args;
    if (_currentPkg) {
      // Avoids the error:"Error HH1005: Solidity source file ... not found"
      return sourcePaths.map((p) => normalizeSourceName(p));
    }
    return runSuper(args);
  }
);

task(TASK_COMPILE_SOLIDITY_GET_DEPENDENCY_GRAPH).setAction(
  async (args, {_currentPkg, config}, runSuper): Promise<DependencyGraph> => {
    if (_currentPkg) {
      // Compile in the package root directory
      const saved = config.paths.root;
      config.paths.root = path.join(
        config.paths.root,
        NODE_MODULES,
        _currentPkg.name
      );
      const ret = await runSuper(args);
      config.paths.root = saved;
      return ret;
    }
    return runSuper(args);
  }
);
