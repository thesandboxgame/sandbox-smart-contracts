import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import gems from '../data/gems';
import catalysts from '../data/catalysts';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { execute, read } = deployments;
  const { deployer } = await getNamedAccounts();

  const catalystsToAdd = [];
  const gemsToAdd = [];

  for (const catalyst of catalysts) {
    const isCatalystExists = false;
    // const isCatalystExists = await read(
    //   `GemsAndCatalysts`,
    //   'isCatalystExists',
    //   catalyst.catalystId
    // );
    if (!isCatalystExists) {
      const catalystAddress = await deployments.get(`Catalyst_${catalyst.name}`);
      catalystsToAdd.push(catalystAddress)
    }
  }

  for (const gem of gems) {
    const isGemExists = await read(
      `GemsAndCatalysts`,
      'isGemExists',
      gem.gemId
    );
    if (!isGemExists) {
      const gemAddress = await deployments.get(`Gem_${gem.name}`);
      gemsToAdd.push(gemAddress)
    }
  }

  await execute(
    'GemsAndCatalysts',
    { from: deployer, log: true },
    'addGemsAndCatalysts',
    gemsToAdd,
    catalystsToAdd
  );

};
export default func;
func.tags = ['GemsAndCatalysts_setup'];
func.dependencies = ['GemsAndCatalysts_deploy'];
