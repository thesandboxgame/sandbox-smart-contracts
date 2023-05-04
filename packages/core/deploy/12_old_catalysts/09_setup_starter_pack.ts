import {BigNumber} from 'ethers';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {skipUnlessTest} from '../../utils/network';

// sand price is in Sand unit (Sand has 18 decimals)
const starterPackPrices = [sandWei(0), sandWei(0), sandWei(0), sandWei(0)];
const gemPrice = sandWei(0);

function sandWei(amount: number) {
  return BigNumber.from(amount).mul('1000000000000000000').toString();
}

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments} = hre;
  const {read, execute, catchUnknownSigner} = deployments;
  const prices = await read('StarterPackV1', {}, 'getPrices');

  const needsSetup =
    prices.pricesAfterSwitch.some(
      (price: BigNumber, i: number) => !price.eq(starterPackPrices[i])
    ) || !prices.gemPriceAfterSwitch.eq(gemPrice);
  if (needsSetup) {
    console.log('Setting up new prices');
    const admin = await read('StarterPackV1', {}, 'getAdmin');
    await catchUnknownSigner(
      execute(
        'StarterPackV1',
        {from: admin},
        'setPrices',
        starterPackPrices,
        gemPrice
      )
    );
  }
};
export default func;
func.tags = ['StarterPackV1', 'StarterPackV1_setup'];
func.dependencies = [];
func.skip = skipUnlessTest; // not meant to be redeployed
