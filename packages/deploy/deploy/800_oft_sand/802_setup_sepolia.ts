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

  const eidBaseSepolia = 40245;
  const eidBscTestnet = 40102;

  await execute(
    'OFTAdapterForSand',
    {from: deployer, log: true},
    'setPeer',
    eidBaseSepolia,
    ethers.zeroPadValue(OFTSandBaseJson.address, 32)
  );

  await execute(
    'OFTAdapterForSand',
    {from: deployer, log: true},
    'setPeer',
    eidBscTestnet,
    ethers.zeroPadValue(OFTSandBscJson.address, 32)
  );
};

export default func;
func.tags = ['OFT_Sepolia_setup'];
