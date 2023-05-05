import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {ethers} from 'ethers';
import {isTest} from '../../utils/network';
/*
  This script is used specifically in forks to have enough balance to run the deployments.
  We are not testing eth consumption when we run on forks!!!!
 */
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployer, sandAdmin} = await hre.getNamedAccounts();
  // We take the balance from hardhat address 0
  const signer = await hre.ethers.provider.getSigner(0);
  for (const n of [deployer, sandAdmin]) {
    await signer.sendTransaction({
      from: await signer.getAddress(),
      value: ethers.utils.parseEther('10'),
      to: n,
    });
  }
};
export default func;
func.skip = async (hre: HardhatRuntimeEnvironment) => {
  // Run only when forking some network and it is a testnet network.
  return !process.env.HARDHAT_FORK || !isTest(hre);
};
