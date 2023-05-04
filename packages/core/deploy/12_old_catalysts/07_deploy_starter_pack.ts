import {ethers} from 'hardhat';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {skipUnlessTest} from '../../utils/network';
const {BigNumber} = ethers;

// sand price is in Sand unit (Sand has 18 decimals)
const starterPackPrices = [sandWei(0), sandWei(0), sandWei(0), sandWei(0)];
const gemPrice = sandWei(0);

function sandWei(amount: number) {
  return BigNumber.from(amount).mul('1000000000000000000').toString();
}

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {
    deployer,
    starterPackAdmin,
    starterPackSaleBeneficiary,
    backendMessageSigner,
  } = await getNamedAccounts();
  const sandContract = await deployments.get('Sand');
  const daiContract = await deployments.get('DAI');
  const daiMedianizer = await deployments.get('DAIMedianizer');
  const catalystGroup = await deployments.get('OldCatalysts');
  const gemGroup = await deployments.get('OldGems');

  await deploy('StarterPackV1', {
    from: deployer,
    args: [
      starterPackAdmin,
      sandContract.address,
      sandContract.address,
      starterPackSaleBeneficiary,
      daiMedianizer.address,
      daiContract.address,
      catalystGroup.address,
      gemGroup.address,
      backendMessageSigner,
      starterPackPrices,
      gemPrice,
    ],
    log: true,
    skipIfAlreadyDeployed: true,
  });
};
export default func;
func.tags = ['StarterPackV1', 'StarterPackV1_deploy'];
func.dependencies = [
  'Sand_deploy',
  'DAI_deploy',
  'OldCatalysts_deploy',
  'OldGems_deploy',
];
func.skip = skipUnlessTest; // not meant to be redeployed
