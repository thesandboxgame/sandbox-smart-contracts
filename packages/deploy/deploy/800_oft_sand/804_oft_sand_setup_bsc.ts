import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {ethers} from 'ethers';

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
  } else {
    eidEthereum = 0;
    eidBase = 0;
  }

  const hreEthereum = hre.companionNetworks.ethereum;
  const deploymentsEthereum = hreEthereum.deployments;
  const OFTAdapterForSand = await deploymentsEthereum.getOrNull(
    'OFTAdapterForSand'
  );

  const hreBase = hre.companionNetworks.base;
  const deploymentsBase = hreBase.deployments;
  const OFTSandBase = await deploymentsBase.getOrNull('OFTSand');

  if (OFTAdapterForSand && OFTSandBase) {
    const isPeerForEthereum = await read(
      'OFTAdapterForSand',
      'isPeer',
      eidEthereum,
      ethers.zeroPadValue(OFTAdapterForSand.address, 32)
    );
    if (!isPeerForEthereum) {
      // setting OFTAdapterForSand as peer to  OFTSand(bsc) using eidEthereum
      await execute(
        'OFTSand',
        {from: deployer, log: true},
        'setPeer',
        eidEthereum,
        ethers.zeroPadValue(OFTAdapterForSand.address, 32)
      );
    }

    const isPeerForBase = await read(
      'OFTAdapterForSand',
      'isPeer',
      eidBase,
      ethers.zeroPadValue(OFTSandBase.address, 32)
    );
    if (!isPeerForBase) {
      // setting OFTSand(base) as peer to  OFTSand(bsc) using eidBase
      await execute(
        'OFTSand',
        {from: deployer, log: true},
        'setPeer',
        eidBase,
        ethers.zeroPadValue(OFTSandBase.address, 32)
      );
    }
  }
};

export default func;
func.tags = ['OFTSand', 'OFTSand_bsc_setup'];
func.dependencies = ['OFTSand_deploy'];
