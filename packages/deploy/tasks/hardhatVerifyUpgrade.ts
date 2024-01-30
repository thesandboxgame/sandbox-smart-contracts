import {getVersion} from '@openzeppelin/upgrades-core';
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
import {Artifact, HardhatRuntimeEnvironment} from 'hardhat/types';
import {ContractFactory} from 'ethers';
import {TASK_DEPLOY} from 'hardhat-deploy';
import {ValidateUpgradeOptions} from '@openzeppelin/hardhat-upgrades/src/utils/options';
import {readValidations} from '@openzeppelin/hardhat-upgrades/dist/utils';
import {ValidationOptions} from '@openzeppelin/upgrades-core/src/validate/overrides';
import assert from 'assert';

declare module 'hardhat/types/runtime' {
  interface HardhatRuntimeEnvironment {
    _ozVerifyOpts: ValidateUpgradeOptions;
  }
}

declare module 'hardhat-deploy/types' {
  interface DeployOptions {
    skipUpgradeValidation?: boolean;
    validationOptions?: ValidationOptions;
  }
}

type ValidationErrorKind = NonNullable<
  ValidateUpgradeOptions['unsafeAllow']
> extends (infer U)[]
  ? U
  : never;
const unsafeOpts = {
  StateVariableAssignment: 'state-variable-assignment',
  StateVariableImmutable: 'state-variable-immutable',
  ExternalLibraryLinking: 'external-library-linking',
  StructDefinition: 'struct-definition',
  EnumDefinition: 'enum-definition',
  Constructor: 'constructor',
  DelegateCall: 'delegatecall',
  SelfDestruct: 'selfdestruct',
  MissingPublicUpgradeTo: 'missing-public-upgradeto',
} as {[k: string]: ValidationErrorKind};

// Sometimes we want to check contracts that where deployed in a different package (for example: `core`)
// Internally hardhat-upgrades matches the full bytecode with the metadata, we want a partial match
// As recompile the code in this project, we must replace the bytecode with the right one so it matches later.
async function getPrevArtifacts(
  hre: HardhatRuntimeEnvironment,
  bytecode: string
): Promise<Artifact[]> {
  const validations = await readValidations(hre);
  const version = getVersion(bytecode);
  const ret = [];
  for (const validation of validations.log) {
    for (const contractName in validation) {
      if (
        validation[contractName].version?.withoutMetadata ===
        version.withoutMetadata
      ) {
        // It is ok to have more than one match we take the first
        ret.push(await hre.artifacts.readArtifact(contractName));
      }
    }
  }
  return ret;
}

function getFQN(artifact: Artifact) {
  return artifact.sourceName + ':' + artifact.contractName;
}

async function checkUpgradability(
  hre: HardhatRuntimeEnvironment,
  name: string,
  options: DeployOptions
): Promise<void> {
  // We assume same name different contract => upgrade.
  const deployment = await hre.deployments.getOrNull(name + '_Implementation');
  if (!deployment) {
    // First deploy, we don't have a previous deployment.
    return;
  }
  if (!deployment.bytecode) {
    throw new HardhatPluginError(`missing bytecode for deployment ${name}`);
  }
  // As we recompile the contract we need to search for the bytecode without checking metadata hash.
  const prevArtifacts = await getPrevArtifacts(hre, deployment.bytecode);
  if (prevArtifacts.length === 0) {
    throw new HardhatPluginError(
      `missing artifact for deployment ${name} (add the source code)`
    );
  }
  // Choose one they all have the same bytecode, it just affects the name we console.log
  const prevArtifact = prevArtifacts[0];
  for (const a of prevArtifacts.slice(1)) {
    assert.deepStrictEqual(
      a.abi,
      prevArtifact.abi,
      `there are two contracts with same bytecode and different abis ${prevArtifacts.map(
        getFQN
      )}`
    );
  }
  // Right now we don't support options.contract as ArtifactData
  if (!options.contract || typeof options.contract !== 'string') {
    throw new HardhatPluginError(`missing new contract for deploy ${name}`);
  }
  const newName = options.contract as string;
  const newArtifact = await hre.artifacts.readArtifact(newName);
  if (!newArtifact || !newArtifact.abi || !newArtifact.bytecode) {
    throw new HardhatPluginError(`missing artifact for ${newName}`);
  }
  if (
    prevArtifacts.some(
      (x) =>
        x.sourceName === newArtifact.sourceName &&
        x.contractName === newArtifact.contractName
    )
  ) {
    // same bytecode, abi and name => same contract, just skip
    return;
  }
  console.log('checking the upgrade of', name, '=>', getFQN(prevArtifact));
  console.log('\tTO', newArtifact.sourceName + ':' + newArtifact.contractName);
  const validationOptions = {
    ...hre._ozVerifyOpts,
    ...(options.validationOptions || {}),
  };
  const oldFactory = new ContractFactory(
    prevArtifact.abi,
    prevArtifact.bytecode
  );
  try {
    await hre.upgrades.validateImplementation(oldFactory, validationOptions);
  } catch (err) {
    const msg = err.toString();
    if (msg.includes('The requested contract was not found')) {
      // We skip contracts that where deployed elsewhere and we don't have the source code
      console.warn('ignoring', msg);
      return;
    }
    throw err;
  }
  const newFactory = new ContractFactory(newArtifact.abi, newArtifact.bytecode);
  await hre.upgrades.validateImplementation(newFactory, validationOptions);
  await hre.upgrades.validateUpgrade(oldFactory, newFactory, validationOptions);
}

function hardhatVerifyUpgrade(
  hre: HardhatRuntimeEnvironment,
  orig: DeploymentsExtension
) {
  return async (
    name: string,
    options: DeployOptions
  ): Promise<DeployResult> => {
    if (options.skipUpgradeValidation) {
      return;
    }
    await checkUpgradability(hre, name, options);
    return await orig.deploy(name, options);
  };
}

extendEnvironment((hre) => {
  const origClone: DeploymentsExtension = Object.assign({}, hre.deployments);
  hre.deployments.deploy = lazyFunction(() =>
    hardhatVerifyUpgrade(hre, origClone)
  );
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
    hre._ozVerifyOpts = args as ValidateUpgradeOptions;
    hre._ozVerifyOpts.unsafeAllow = [];
    for (const o in unsafeOpts) {
      if (args['unsafeAllow' + o]) {
        hre._ozVerifyOpts.unsafeAllow.push(unsafeOpts[o]);
      }
    }
    return await runSuper(args);
  });
