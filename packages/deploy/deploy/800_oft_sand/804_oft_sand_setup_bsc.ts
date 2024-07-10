import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {ethers} from 'ethers';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {execute} = deployments;
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
  const OFTSand = await deploymentsBase.getOrNull('OFTSand');

  if (OFTAdapterForSand && OFTSand) {
    // setting OFTAdapterForSand as peer to  OFTSand(bsc) using eidEthereum
    await execute(
      'OFTSand',
      {from: deployer, log: true},
      'setPeer',
      eidEthereum,
      ethers.zeroPadValue(OFTAdapterForSand.address, 32)
    );

    // setting OFTSand(base) as peer to  OFTSand(bsc) using eidBase
    await execute(
      'OFTSand',
      {from: deployer, log: true},
      'setPeer',
      eidBase,
      ethers.zeroPadValue(OFTSand.address, 32)
    );
  }
};

export default func;
func.tags = ['OFTSand', 'OFTSand_bsc_setup'];
func.dependencies = ['OFTSand_deploy'];
