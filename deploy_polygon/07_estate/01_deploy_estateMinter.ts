import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTestnet} from '../../utils/network';
import {estateMintingFee, estateUpdateFee} from "../../data/estateMinterFees";
//import {estateMintingFee, estateUpdateFee} from '../../data/estateMinterFees';

const func: DeployFunction = async function (hre) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer, estateTokenAdmin, upgradeAdmin} = await getNamedAccounts();
  const EstateToken = await deployments.get('EstateToken');
  //const feeCollector = await deployments.get('FeeCollector');
  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER');

  const chainIndex = 1;

  await deploy('EstateMinter', {
    from: deployer,
    log: true,
    contract: 'EstateMinter',
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OptimizedTransparentProxy',
      execute: {
        methodName: 'initV1',
        args: [
          EstateToken.address,
          TRUSTED_FORWARDER.address,
          estateTokenAdmin,
          //feeCollector.address,
          estateMintingFee,
          estateUpdateFee,
        ],
      },
      upgradeIndex: 0,
    },
    skipIfAlreadyDeployed: true,
  });
};

export default func;
func.tags = ['PolygonEstateMinter', 'PolygonEstateMinter_deploy'];
func.dependencies = [
  'FeeCollector_deploy',
  'PolygonEstateToken_deploy',
  'PolygonSand_deploy',
  'TRUSTED_FORWARDER',
];
// TODO: Setup deploy-polygon folder and network.
func.skip = skipUnlessTestnet; // TODO enable
