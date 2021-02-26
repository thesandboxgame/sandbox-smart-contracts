import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy, read, execute} = deployments;

  const {
    deployer,
    commonMinterAdmin,
    mintingFeeCollector,
  } = await getNamedAccounts();

  const Asset = await deployments.get('Asset');
  const Sand = await deployments.get('Sand');

  // constructor(ERC1155ERC721 asset, ERC20 sand, uint256 feePerCopy, address admin, address feeReceiver)
  const CommonMinter = await deploy('CommonMinter', {
    from: deployer,
    args: [
      Asset.address,
      Sand.address,
      0,
      commonMinterAdmin,
      mintingFeeCollector,
    ],
    skipIfAlreadyDeployed: true,
    log: true,
  });

  const isBouncer = await read('Asset', 'isBouncer', CommonMinter.address);
  if (!isBouncer) {
    const bouncerAdmin = await read('Asset', 'getBouncerAdmin');
    await execute(
      'Asset',
      {from: bouncerAdmin, log: true},
      'setBouncer',
      CommonMinter.address,
      true
    );
  }

  const isSandSuperOperator = await read(
    'Sand',
    'isSuperOperator',
    CommonMinter.address
  );
  if (!isSandSuperOperator) {
    const sandAdmin = await read('Sand', 'getAdmin');
    await execute(
      'Sand',
      {from: sandAdmin, log: true},
      'setSuperOperator',
      CommonMinter.address,
      true
    );
  }
};
export default func;
func.tags = ['CommonMinter', 'CommonMinter_deploy'];
func.dependencies = ['Asset_deploy', 'Sand_deploy'];
func.skip = async (hre) => hre.network.name !== 'hardhat';
