import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTest} from '../../utils/network';
import {toWei} from '../../test/utils';

// Set a fake balance for forked networks.
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const initialAmount = toWei('1000').toHexString();

  const named = await hre.getNamedAccounts();
  for (const c in named) {
    console.log('Setting', c, 'balance', initialAmount);
    await hre.ethers.provider.send('hardhat_setBalance', [
      named[c],
      initialAmount.toString(),
    ]);
  }
  const others = await hre.getUnnamedAccounts();
  for (const c of others) {
    console.log('Setting', c, 'balance', initialAmount);
    await hre.ethers.provider.send('hardhat_setBalance', [
      c,
      initialAmount.toString(),
    ]);
  }
};
export default func;
func.tags = ['SET_BALANCE'];
func.skip = async (hre) => {
  return (await skipUnlessTest(hre)) || !process.env.HARDHAT_FORK;
};
