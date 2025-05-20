import {ethers} from 'ethers';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DEPLOY_NETWORKS} from '../../hardhat.config';
import {getAddressOrNull} from '../../utils/hardhatDeployUtils';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {execute, read} = deployments;
  const {deployer} = await getNamedAccounts();

  let eidBase, eidBsc;

  if (hre.network.name == 'mainnet') {
    eidBase = process.env[`EID_${'BASE'}`];
    eidBsc = process.env[`EID_${'BSCMAINNET'}`];
  } else if (hre.network.name == 'sepolia') {
    eidBase = process.env[`EID_${'BASESEPOLIA'}`];
    eidBsc = process.env[`EID_${'BSCTESTNET'}`];
  } else if (hre.network.name == 'hardhat') {
    eidBsc = 0;
    eidBase = 0;
  } else {
    throw new Error('Cannot find EID for network');
  }

  const OFTSandBase = await getAddressOrNull(
    hre,
    DEPLOY_NETWORKS.BASE_MAINNET,
    'OFTSand'
  );
  const OFTSandBsc = await getAddressOrNull(
    hre,
    DEPLOY_NETWORKS.BSC_MAINNET,
    'OFTSand'
  );
  if (OFTSandBase && OFTSandBsc) {
    const isPeerForBase = await read(
      'OFTAdapterForSand',
      'isPeer',
      eidBase,
      ethers.zeroPadValue(OFTSandBase, 32)
    );
    if (!isPeerForBase) {
      // setting OFTSand(base) as peer to OFTAdapterForSand using eidBase
      await execute(
        'OFTAdapterForSand',
        {from: deployer, log: true},
        'setPeer',
        eidBase,
        ethers.zeroPadValue(OFTSandBase, 32)
      );
    }

    const isPeerForBsc = await read(
      'OFTAdapterForSand',
      'isPeer',
      eidBsc,
      ethers.zeroPadValue(OFTSandBsc, 32)
    );
    if (!isPeerForBsc) {
      // setting OFTSand(bsc) as peer to OFTAdapterForSand using eidBsc
      await execute(
        'OFTAdapterForSand',
        {from: deployer, log: true},
        'setPeer',
        eidBsc,
        ethers.zeroPadValue(OFTSandBsc, 32)
      );
    }
  }
};

export default func;
func.tags = ['OFTAdapterForSand', 'OFTAdapterForSand_setup'];
func.dependencies = ['OFTAdapterForSand_deploy'];
