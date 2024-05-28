import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {ethers} from 'ethers';
import OFTAdapterForSandJson from '../../deployments/sepolia/OFTAdapterForSand.json';
import OFTSandBaseJson from '../../deployments/baseSepolia/OFTSand.json';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {execute} = deployments;
  const {deployer} = await getNamedAccounts();

  // destination endpoint for sepolia
  const eidSepolia = 40161;
  // destination endpoint for baseSepolia
  const eidBaseSepolia = 40245;

  // setting OFTAdapterForSand(sepolia) as peer to  OFTSand(bscTestnet) using eidSepolia
  await execute(
    'OFTSand',
    {from: deployer, log: true},
    'setPeer',
    eidSepolia,
    ethers.zeroPadValue(OFTAdapterForSandJson.address, 32)
  );

  // setting OFTSand(baseSepolia) as peer to  OFTSand(bscTestnet) using eidBaseSepolia
  await execute(
    'OFTSand',
    {from: deployer, log: true},
    'setPeer',
    eidBaseSepolia,
    ethers.zeroPadValue(OFTSandBaseJson.address, 32)
  );
};

export default func;
func.tags = ['OFTSand', 'OFTSand_bscTestnet_setup'];
func.dependencies = ['OFTSand_deploy'];
