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

  // destination endpoint for sepolia
  const eidSepolia = 40161;
  // destination endpoint for bscTestnet
  const eidBscTestnet = 40102;

  // setting OFTAdapterForSand(sepolia) as peer to  OFTSand(baseSepolia) using eidSepolia
  await execute(
    'OFTSand',
    {from: deployer, log: true},
    'setPeer',
    eidSepolia,
    ethers.zeroPadValue(OFTAdapterForSandJson.address, 32)
  );

  // setting OFTSand(bscTestnet) as peer to  OFTSand(baseSepolia) using eidBscTestnet
  await execute(
    'OFTSand',
    {from: deployer, log: true},
    'setPeer',
    eidBscTestnet,
    ethers.zeroPadValue(OFTSandBscJson.address, 32)
  );
};

export default func;
func.tags = ['OFTSand', 'OFTSand_baseSepolia_setup'];
func.dependencies = ['OFTSand_deploy'];
