import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {ethers} from 'ethers';
import OFTSandBaseJson from '../../deployments/baseSepolia/OFTSand.json';
import OFTSandBscJson from '../../deployments/bscTestnet/OFTSand.json';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {execute} = deployments;
  const {deployer} = await getNamedAccounts();

  // destination endpoint for baseSepolia
  const eidBaseSepolia = 40245;
  // destination endpoint for bscTestnet
  const eidBscTestnet = 40102;

  // setting OFTSand(baseSepolia) as peer to OFTAdapterForSand(sepolia) using eidBaseSepolia
  await execute(
    'OFTAdapterForSand',
    {from: deployer, log: true},
    'setPeer',
    eidBaseSepolia,
    ethers.zeroPadValue(OFTSandBaseJson.address, 32)
  );

  // set OFTSand(bscTestnet) as peer to OFTAdapterForSand(sepolia) using eidBscTestnet
  await execute(
    'OFTAdapterForSand',
    {from: deployer, log: true},
    'setPeer',
    eidBscTestnet,
    ethers.zeroPadValue(OFTSandBscJson.address, 32)
  );
};

export default func;
func.tags = ['OFTAdapterForSand', 'OFTAdapterForSand_sepolia_setup'];
func.dependencies = ['OFTAdapterForSand_deploy'];
