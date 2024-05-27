import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {ethers} from 'ethers';
import OFTAdapterForSandJson from '../../deployments/sepolia/OFTAdapterForSand.json';
import OFTSandBscJson from '../../deployments/bscTestnet/OFTSand.json';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {execute} = deployments;
  const {deployer} = await getNamedAccounts();

  const eidSepolia = 40161;
  const eidBscTestnet = 40102;

  await execute(
    'OFTSand',
    {from: deployer, log: true},
    'setPeer',
    eidSepolia,
    ethers.zeroPadValue(OFTAdapterForSandJson.address, 32)
  );

  await execute(
    'OFTSand',
    {from: deployer, log: true},
    'setPeer',
    eidBscTestnet,
    ethers.zeroPadValue(OFTSandBscJson.address, 32)
  );
};

export default func;
func.tags = ['OFT_BaseSepolia_setup'];
