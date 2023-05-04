import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {skipUnlessTestnet} from '../../utils/network';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {assetBouncerAdmin} = await getNamedAccounts();
  const assetMinter = await deployments.get('PolygonAssetMinter');
  const assetTunnel = await deployments.get('PolygonAssetERC1155Tunnel');
  await setBouncer(hre, assetBouncerAdmin, assetMinter.address);
  await setBouncer(hre, assetBouncerAdmin, assetTunnel.address);
};

async function setBouncer(
  hre: HardhatRuntimeEnvironment,
  admin: string,
  address: string
) {
  const {execute, read, catchUnknownSigner} = hre.deployments;
  const isAssetMinterBouncer = await read(
    'PolygonAssetERC1155',
    'isBouncer',
    address
  );
  if (!isAssetMinterBouncer) {
    await catchUnknownSigner(
      execute(
        'PolygonAssetERC1155',
        {from: admin, log: true},
        'setBouncer',
        address,
        true
      )
    );
  }
}

export default func;
func.runAtTheEnd = true;
func.tags = [
  'PolygonAssetMinter',
  'PolygonAssetMinter_setup',
  'PolygonAssetERC1155_setup',
  'PolygonAsset',
  'L2',
];
func.dependencies = ['PolygonAssetERC1155'];
func.skip = skipUnlessTestnet;
