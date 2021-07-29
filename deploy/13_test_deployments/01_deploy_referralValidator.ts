import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTest} from '../../utils/network';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer, backendReferralWallet} = await getNamedAccounts();

  await deploy('ReferralValidator08', {
    from: deployer,
    args: [backendReferralWallet, 2000], //got 200 from 00_deploy_land_sale_5.ts
    log: true,
    skipIfAlreadyDeployed: true,
  });
};
export default func;
func.tags = ['ReferralValidator08', 'ReferralValidator08_deploy'];
func.skip = skipUnlessTest;
