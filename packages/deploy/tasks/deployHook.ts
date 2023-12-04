import {extendEnvironment} from 'hardhat/config';
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
      await hre.upgrades.validateImplementation(oldFactory);
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
      await hre.upgrades.validateImplementation(newFactory);
      await hre.upgrades.validateUpgrade(oldFactory, newFactory);
    }
    return await orig.deploy(name, options);
  };
}

extendEnvironment((hre) => {
  const origClone: DeploymentsExtension = Object.assign({}, hre.deployments);
  hre.deployments.deploy = lazyFunction(() => deployHook(hre, origClone));
});
