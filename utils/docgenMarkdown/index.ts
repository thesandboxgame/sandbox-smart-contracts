// BASED HEAVILY IN: https://hardhat.org/plugins/hardhat-docgen.html
import {extendConfig, task} from 'hardhat/config';
import 'hardhat/types/config';
import * as path from 'path';
import {TASK_COMPILE} from 'hardhat/builtin-tasks/task-names';
import fs from 'fs';
import {HardhatPluginError} from 'hardhat/plugins';
import './type-extensions';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const render = require('./renderMarkdown');

extendConfig(function (config, userConfig) {
  const {root, sources} = config.paths;

  config.docgen = Object.assign(
    {
      path: './docgen',
      clear: false,
      runOnCompile: false,
      only: [`^${path.relative(root, sources)}/`],
      except: [],
    },
    userConfig.docgen
  );
});

const NAME = 'generate-docs';
const DESC = 'Generate NatSpec documentation automatically on compilation';

task(NAME, DESC, async function (args, hre) {
  const config = hre.config.docgen;

  const outputDirectory = path.resolve(hre.config.paths.root, config.path);

  if (!outputDirectory.startsWith(hre.config.paths.root)) {
    throw new HardhatPluginError(
      'resolved path must be inside of project directory'
    );
  }

  if (outputDirectory === hre.config.paths.root) {
    throw new HardhatPluginError('resolved path must not be root directory');
  }

  if (fs.existsSync(outputDirectory)) {
    if (config.clear) {
      fs.rmdirSync(outputDirectory, {recursive: true});
      fs.mkdirSync(outputDirectory, {recursive: true});
    }
  } else {
    fs.mkdirSync(outputDirectory, {recursive: true});
  }
  const contractFQNNames = await hre.artifacts.getAllFullyQualifiedNames();
  for (const contractFQNName of contractFQNNames) {
    if (
      config.only.length &&
      !config.only.some((m) => contractFQNName.match(m))
    ) {
      continue;
    }
    if (
      config.except.length &&
      config.except.some((m) => contractFQNName.match(m))
    ) {
      continue;
    }
    const [sourceFileName, contractName] = contractFQNName.split(':');
    const info = await hre.artifacts.getBuildInfo(contractFQNName);
    if (!info) {
      continue;
    }
    const dirName = path.join(outputDirectory, path.dirname(sourceFileName));
    if (!fs.existsSync(dirName)) {
      fs.mkdirSync(dirName, {recursive: true});
    }
    await render(dirName, sourceFileName, contractName, info);
  }
});

task(TASK_COMPILE, async function (args, hre, runSuper) {
  for (const compiler of hre.config.solidity.compilers) {
    compiler.settings.outputSelection['*']['*'].push('devdoc');
    compiler.settings.outputSelection['*']['*'].push('userdoc');
  }

  await runSuper();

  if (hre.config.docgen.runOnCompile) {
    await hre.run(NAME);
  }
});
