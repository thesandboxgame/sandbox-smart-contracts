import {DeployFunction} from 'hardhat-deploy/types';
import {gameMintingFee, gameUpdateFee} from '../data/gameMinterFees';

const func: DeployFunction = async function (hre) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer, gameTokenFeeBeneficiary} = await getNamedAccounts();
  const gameContract = await deployments.get('GameToken');
  const sandContract = await deployments.get('Sand');

  await deploy('GameMinter', {
    from: deployer,
    log: true,
    args: [
      gameContract.address,
      sandContract.address,
      gameMintingFee,
      gameUpdateFee,
      gameTokenFeeBeneficiary,
      sandContract.address,
    ],
  });
};

export default func;
func.tags = ['GameMinter', 'GameMinter_deploy'];
func.dependencies = ['GameToken_deploy', 'Sand_deploy'];
