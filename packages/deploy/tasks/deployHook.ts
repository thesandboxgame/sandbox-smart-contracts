import {extendEnvironment, task} from 'hardhat/config';
import 'dotenv/config';
import 'hardhat-deploy';
import '@openzeppelin/hardhat-upgrades';
import {HardhatPluginError, lazyFunction} from 'hardhat/plugins';
import {
  DeploymentsExtension,
  DeployOptions,
  DeployResult,
} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {ContractFactory} from 'ethers';
import {TASK_DEPLOY} from 'hardhat-deploy';
import {ValidateUpgradeOptions} from '@openzeppelin/hardhat-upgrades/src/utils/options';

declare module 'hardhat/types/runtime' {
  interface HardhatRuntimeEnvironment {
    _ozVerifyOpts: ValidateUpgradeOptions;
  }
}
type ValidationErrorKind = NonNullable<
  ValidateUpgradeOptions['unsafeAllow']
> extends (infer U)[]
  ? U
  : never;
const unsafeOpts: {[k: string]: ValidationErrorKind} = {
  StateVariableAssignment: 'state-variable-assignment',
  StateVariableImmutable: 'state-variable-immutable',
  ExternalLibraryLinking: 'external-library-linking',
  StructDefinition: 'struct-definition',
  EnumDefinition: 'enum-definition',
  Constructor: 'constructor',
  DelegateCall: 'delegatecall',
  SelfDestruct: 'selfdestruct',
  MissingPublicUpgradeTo: 'missing-public-upgradeto',
};

function deployHook(
  hre: HardhatRuntimeEnvironment,
  orig: DeploymentsExtension
) {
  return async (
    name: string,
    options: DeployOptions
  ): Promise<DeployResult> => {
    // We assume same name different contract => upgrade.
    const deployment = await hre.deployments.getOrNull(
      name + '_Implementation'
    );
    if (deployment) {
      console.log('CHECKING UPGRADE', name, options.contract);
      if (!deployment.bytecode) {
        throw new HardhatPluginError(`missing bytecode for deployment ${name}`);
      }
      const oldFactory = new ContractFactory(
        deployment.abi,
        deployment.bytecode
      );
      await hre.upgrades.validateImplementation(oldFactory, hre._ozVerifyOpts);
      if (!options.contract || typeof options.contract !== 'string') {
        throw new HardhatPluginError(`missing new contract for ${name}`);
      }
      const newName = options.contract as string;
      const artifact = await hre.artifacts.readArtifact(newName);
      if (!artifact || !artifact.abi || !artifact.bytecode) {
        throw new HardhatPluginError(
          `missing bytecode for artifact ${newName}`
        );
      }
      const newFactory = new ContractFactory(artifact.abi, artifact.bytecode);
      await hre.upgrades.validateImplementation(newFactory, hre._ozVerifyOpts);
      await hre.upgrades.validateUpgrade(
        oldFactory,
        newFactory,
        hre._ozVerifyOpts
      );
    }
    return await orig.deploy(name, options);
  };
}

extendEnvironment((hre) => {
  const origClone: DeploymentsExtension = Object.assign({}, hre.deployments);
  hre.deployments.deploy = lazyFunction(() => deployHook(hre, origClone));
});

Object.keys(unsafeOpts)
  .reduce(
    (task, o) =>
      task.addFlag(
        'unsafeAllow' + o,
        'Selectively disable one or more validation errors'
      ),
    task(TASK_DEPLOY, 'use defender admin to propose transactions')
  )
  .addFlag(
    'unsafeAllowRenames',
    'Configure storage layout check to allow variable renaming'
  )
  .addFlag(
    'unsafeSkipStorageCheck',
    'Upgrades the proxy or beacon without first checking for storage layout compatibility errors. This is a dangerous option meant to be used as a last resort'
  )
  .setAction(async (args: {[flag: string]: boolean}, hre, runSuper) => {
    hre._ozVerifyOpts = {...args};
    hre._ozVerifyOpts.unsafeAllow = [];
    for (const o in unsafeOpts) {
      if (args['unsafeAllow' + o]) {
        hre._ozVerifyOpts.unsafeAllow.push(unsafeOpts[o]);
      }
    }
    return await runSuper(args);
  });
