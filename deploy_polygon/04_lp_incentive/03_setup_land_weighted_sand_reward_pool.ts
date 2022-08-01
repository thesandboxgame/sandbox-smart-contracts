import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {ethers} from 'hardhat';
import {utils} from 'ethers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments} = hre;

  let land;
  if (hre.network.name === 'hardhat') {
    // workaround for tests
    land = await deployments.get('MockLandWithMint');
  } else {
    land = await deployments.get('PolygonLand');
  }
  const pool = await ethers.getContract('PolygonLandWeightedSANDRewardPool');
  const multiplier = utils.hexValue(
    await ethers.provider.getStorageAt(pool.address, 13)
  );

  if (land.address.toLowerCase() != multiplier.toLowerCase()) {
    await deployments.catchUnknownSigner(
      deployments.execute(
        'PolygonLandWeightedSANDRewardPool',
        {from: await pool.owner(), log: true},
        'SetNFTMultiplierToken',
        land.address
      )
    );
  }
};
export default func;
func.tags = [
  'PolygonLandWeightedSANDRewardPool',
  'PolygonLandWeightedSANDRewardPool_setup',
];
func.dependencies = ['PolygonLandWeightedSANDRewardPool_deploy'];
