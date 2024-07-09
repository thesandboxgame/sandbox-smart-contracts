import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {ethers} from 'ethers';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {execute} = deployments;
  const {deployer} = await getNamedAccounts();

  let eidBase, eidBsc;

  if (hre.network.name == 'mainnnet') {
    eidBase = process.env[`EID_${'BASE'}`];
    eidBsc = process.env[`EID_${'BSCMAINNET'}`];
  } else {
    eidBase = process.env[`EID_${'BASESEPOLIA'}`];
    eidBsc = process.env[`EID_${'BSCTESTNET'}`];
  }

  const hreBase = hre.companionNetworks.base;
  const deploymentsBase = hreBase.deployments;
  const OFTSandBase = await deploymentsBase.getOrNull('OFTSand');

  const hreBsc = hre.companionNetworks.bsc;
  const deploymentsBsc = hreBsc.deployments;
  const OFTSandBsc = await deploymentsBsc.getOrNull('OFTSand');

  if (OFTSandBase && OFTSandBsc) {
    //   setting OFTSand(base) as peer to OFTAdapterForSand using eidBase
    await execute(
      'OFTAdapterForSand',
      {from: deployer, log: true},
      'setPeer',
      eidBase,
      ethers.zeroPadValue(OFTSandBase.address, 32)
    );

    // set OFTSand(bsc) as peer to OFTAdapterForSand using eidBsc
    await execute(
      'OFTAdapterForSand',
      {from: deployer, log: true},
      'setPeer',
      eidBsc,
      ethers.zeroPadValue(OFTSandBsc.address, 32)
    );
  }
};

export default func;
func.tags = ['OFTAdapterForSand', 'OFTAdapterForSand_setup'];
func.dependencies = ['OFTAdapterForSand_deploy'];
