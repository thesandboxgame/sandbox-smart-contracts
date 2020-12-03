import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import catalysts from '../data/catalysts';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;

  const { catalystMinter, deployer } = await getNamedAccounts();
  for (const catalyst of catalysts) {
    await deploy(`Catalyst_${catalyst.name}`, {
      contract: 'PrimaryCatalyst',
      from: deployer,
      log: true,
      args: [
        catalyst.name,
        catalyst.symbol,
        catalystMinter,
        catalyst.maxGems,
        catalyst.catalystId,
      ],
    });
  }
};
export default func;
func.tags = ['Catalysts'];
