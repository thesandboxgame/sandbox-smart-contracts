import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {ethers} from 'ethers';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {execute} = deployments;
  const {deployer} = await getNamedAccounts();

  let eidEthereum, eidBsc;

  if (hre.network.name == 'base') {
    eidEthereum = process.env[`EID_${'MAINNET'}`];
    eidBsc = process.env[`EID_${'BSCMAINNET'}`];
  } else if (hre.network.name == 'baseSepolia') {
    eidEthereum = process.env[`EID_${'SEPOLIA'}`];
    eidBsc = process.env[`EID_${'BSCTESTNET'}`];
  } else {
    eidEthereum = 0;
    eidBsc = 0;
  }

  const hreEthereum = hre.companionNetworks.ethereum;
  const deploymentsEthereum = hreEthereum.deployments;
  const OFTAdapterForSand = await deploymentsEthereum.getOrNull(
    'OFTAdapterForSand'
  );

  const hreBsc = hre.companionNetworks.bsc;
  const deploymentsBsc = hreBsc.deployments;
  const OFTSand = await deploymentsBsc.getOrNull('OFTSand');

  if (OFTAdapterForSand && OFTSand) {
    // setting OFTAdapterForSand as peer to OFTSand(base) using eidEthereum
    await execute(
      'OFTSand',
      {from: deployer, log: true},
      'setPeer',
      eidEthereum,
      ethers.zeroPadValue(OFTAdapterForSand.address, 32)
    );

    // setting OFTSand(bsc) as peer to OFTSand(base) using eidBsc
    await execute(
      'OFTSand',
      {from: deployer, log: true},
      'setPeer',
      eidBsc,
      ethers.zeroPadValue(OFTSand.address, 32)
    );
  }
};

export default func;
func.tags = ['OFTSand', 'OFTSand_base_setup'];
func.dependencies = ['OFTSand_deploy'];
