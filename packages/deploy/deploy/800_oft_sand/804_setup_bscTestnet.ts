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

  const eidSepolia = 40161;
  const eidBaseSepolia = 40245;

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
    eidBaseSepolia,
    ethers.zeroPadValue(OFTSandBaseJson.address, 32)
  );
};

export default func;
func.tags = ['OFT_BscTestnet_setup'];
