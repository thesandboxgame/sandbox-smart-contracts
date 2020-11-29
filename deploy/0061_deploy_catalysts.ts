import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import catalysts from '../data/catalysts';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;

  const { catalystOwner } = await getNamedAccounts();
  for (const catalyst of catalysts) {
    await deploy(`Catalyst_${catalyst.name}`, {
      contract: 'PrimaryCatalyst',
      from: catalystOwner,
      log: true,
      args: [
        catalyst.name,
        catalyst.symbol,
        catalystOwner,
        catalyst.maxGems,
        catalyst.catalystId,
      ],
    });
  }
};
export default func;
func.tags = ['Catalysts'];
