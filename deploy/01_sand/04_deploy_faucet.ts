import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTestnet} from '../../utils/network';
import {BigNumber} from '@ethersproject/bignumber';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  const sand = await deployments.get('Sand');
  const period = 30;
  const DECIMALS_18 = BigNumber.from('1000000000000000000');
  const amountLimit = DECIMALS_18.mul(10);

  await deploy('Faucet', {
    from: deployer,
    log: true,
    args: [sand.address, period, amountLimit],
    skipIfAlreadyDeployed: true,
  });
};
export default func;
func.tags = ['Faucet', 'Faucet_deploy'];
func.dependencies = ['Sand_deploy'];
func.skip = skipUnlessTestnet;
