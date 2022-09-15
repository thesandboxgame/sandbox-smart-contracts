import hre from 'hardhat';
import {DeployFunction} from 'hardhat-deploy/types';
import regenerate from './asset_regenerate';
import distribute from './asset_distribute';

const func: DeployFunction = async function () {
  await regenerate(hre);
  await distribute(hre);
};
export default func;

if (require.main === module) {
  func(hre).catch((err) => console.error(err));
}
