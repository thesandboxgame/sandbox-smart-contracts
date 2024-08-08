import {ethers} from 'ethers';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DEPLOY_NETWORKS} from '../../hardhat.config';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {execute, read} = deployments;
  const {deployer} = await getNamedAccounts();

  let eidEthereum, eidBsc;

  if (hre.network.name == 'base') {
    eidEthereum = process.env[`EID_${'MAINNET'}`];
    eidBsc = process.env[`EID_${'BSCMAINNET'}`];
  } else if (hre.network.name == 'baseSepolia') {
    eidEthereum = process.env[`EID_${'SEPOLIA'}`];
    eidBsc = process.env[`EID_${'BSCTESTNET'}`];
  } else if (hre.network.name == 'hardhat') {
    eidEthereum = 0;
    eidBsc = 0;
  } else {
    throw new Error('Cannot find EID for network');
  }

  const hreEthereum = hre.companionNetworks[DEPLOY_NETWORKS.ETH_MAINNET];
  const deploymentsEthereum = hreEthereum.deployments;
  const OFTAdapterForSand = await deploymentsEthereum.getOrNull(
    'OFTAdapterForSand'
  );

  const hreBsc = hre.companionNetworks[DEPLOY_NETWORKS.BSC_MAINNET];
  const deploymentsBsc = hreBsc.deployments;
  const OFTSandBsc = await deploymentsBsc.getOrNull('OFTSand');

  if (OFTAdapterForSand && OFTSandBsc) {
    const isPeerForEthereum = await read(
      'OFTSand',
      'isPeer',
      eidEthereum,
      ethers.zeroPadValue(OFTAdapterForSand.address, 32)
    );
    if (!isPeerForEthereum) {
      await execute(
        'OFTSand',
        {from: deployer, log: true},
        'setPeer',
        eidEthereum,
        ethers.zeroPadValue(OFTAdapterForSand.address, 32)
      );
    }

    const isPeerForBsc = await read(
      'OFTSand',
      'isPeer',
      eidBsc,
      ethers.zeroPadValue(OFTSandBsc.address, 32)
    );
    if (!isPeerForBsc) {
      // setting OFTSand(bsc) as peer to OFTSand(base) using eidBsc
      await execute(
        'OFTSand',
        {from: deployer, log: true},
        'setPeer',
        eidBsc,
        ethers.zeroPadValue(OFTSandBsc.address, 32)
      );
    }
  }
};

export default func;
func.tags = ['OFTSand', 'OFTSand_base_setup'];
func.dependencies = ['OFTSand_deploy'];
