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

  let eidEthereum, eidBase;

  if (hre.network.name == 'bscMainnet') {
    eidEthereum = process.env[`EID_${'MAINNET'}`];
    eidBase = process.env[`EID_${'BASE'}`];
  } else if (hre.network.name == 'bscTestnet') {
    eidEthereum = process.env[`EID_${'SEPOLIA'}`];
    eidBase = process.env[`EID_${'BASESEPOLIA'}`];
  } else if (hre.network.name == 'hardhat') {
    eidEthereum = 0;
    eidBase = 0;
  } else {
    throw new Error('Cannot find EID for network');
  }

  const OFTAdapterForSand = await getAddressOrNull(
    hre,
    DEPLOY_NETWORKS.ETH_MAINNET,
    'OFTAdapterForSand'
  );
  const OFTSandBase = await getAddressOrNull(
    hre,
    DEPLOY_NETWORKS.BASE_MAINNET,
    'OFTSand'
  );

  if (OFTAdapterForSand && OFTSandBase) {
    const isPeerForEthereum = await read(
      'OFTSand',
      'isPeer',
      eidEthereum,
      ethers.zeroPadValue(OFTAdapterForSand, 32)
    );
    if (!isPeerForEthereum) {
      // setting OFTAdapterForSand as peer to  OFTSand(bsc) using eidEthereum
      await execute(
        'OFTSand',
        {from: deployer, log: true},
        'setPeer',
        eidEthereum,
        ethers.zeroPadValue(OFTAdapterForSand, 32)
      );
    }

    const isPeerForBase = await read(
      'OFTSand',
      'isPeer',
      eidBase,
      ethers.zeroPadValue(OFTSandBase, 32)
    );
    if (!isPeerForBase) {
      // setting OFTSand(base) as peer to  OFTSand(bsc) using eidBase
      await execute(
        'OFTSand',
        {from: deployer, log: true},
        'setPeer',
        eidBase,
        ethers.zeroPadValue(OFTSandBase, 32)
      );
    }
  }
};

export default func;
func.tags = ['OFTSand', 'OFTSand_bsc_setup'];
func.dependencies = ['OFTSand_deploy'];
