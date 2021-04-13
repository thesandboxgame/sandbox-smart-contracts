import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre) {
  const {deployments, getNamedAccounts, getUnnamedAccounts} = hre;
  const {deploy, execute, read} = deployments;
  const {deployer, gameTokenAdmin, mintableAssetPredicate} = await getNamedAccounts();
  const sandContract = await deployments.get('Sand');
  const assetContract = await deployments.get('Asset');

  // @review mintableAssetPredicate doesn't belong in namedAccounts (it's a contract, not an EOA).
  // make its value network-dependent and use dummy address for testing

  await deploy('L2_GameToken', {
    from: deployer,
    log: true,
    args: [sandContract.address, gameTokenAdmin, assetContract.address, mintableAssetPredicate],
    skipIfAlreadyDeployed: true,
  });

  const {assetAdmin} = await getNamedAccounts();
  const L2_gameToken = await deployments.getOrNull('L2_GameToken');
  if (!L2_gameToken) {
    return;
  }

  const isSuperOperator = await read(
    'Asset',
    'isSuperOperator',
    L2_gameToken.address
  );
  const currentAdmin = await read('Asset', 'getAdmin');

  if (!isSuperOperator) {
    await execute(
      'Asset',
      {from: currentAdmin, log: true},
      'setSuperOperator',
      L2_gameToken.address,
      true
    );
  }

  const gameMinter = await deployments.getOrNull('GameMinter');
  if (!gameMinter) {
    return;
  }

  const currentMinter = await read('L2_GameToken', 'getMinter');
  const isMinter = currentMinter == gameMinter.address;

  if (!isMinter) {
    await execute(
      'L2_GameToken',
      {from: gameTokenAdmin, log: true},
      'changeMinter',
      gameMinter.address
    );
  }
};

export default func;
func.tags = ['L2_gameToken', 'L2_gameToken_deploy', 'L2_gameToken_setup'];
func.dependencies = ['Sand_deploy', 'Asset_deploy', 'Asset_setup', 'GameMinter_deploy'];
func.skip = async (hre) => hre.network.name !== 'hardhat'; // TODO enable
