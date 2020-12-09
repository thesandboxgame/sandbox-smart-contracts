import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {createAssetClaimMerkleTree} from '../data/land_giveaway_1/getLands';
import {default as landData} from '../data/land_giveaway_1/lands.json';

const LAND_HOLDER = '0x0000000000000000000000000000000000000000';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts, network, getChainId} = hre;
  const {deploy} = deployments;
  const chainId = await getChainId();
  const {deployer} = await getNamedAccounts();

  const {lands, merkleRootHash} = createAssetClaimMerkleTree(
    network.live,
    chainId,
    landData
  );

  const landContract = await deployments.get('Land');

  await deploy('Land_Giveaway_1', {
    contract: 'LandGiveaway',
    from: deployer,
    linkedData: lands,
    log: true,
    args: [
      landContract.address,
      deployer,
      merkleRootHash,
      LAND_HOLDER,
      1615194000, // Sunday, 08-Mar-21 09:00:00 UTC
    ], // TODO: expiryTime
  });
};
export default func;
func.tags = ['Land_Giveaway_1', 'Land_Giveaway_1_deploy'];
func.dependencies = ['Land_deploy'];
