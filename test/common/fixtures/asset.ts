import {
  deployments,
  ethers,
  getNamedAccounts,
  getUnnamedAccounts,
} from 'hardhat';

const {read, execute, deploy} = deployments;

import {setupUsers, waitFor, expectEventWithArgs} from '../../utils';

import {Contract} from 'ethers';
import {AbiCoder} from 'ethers/lib/utils';
import catalysts from '../../../data/catalysts';
import gems from '../../../data/gems';

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const assetFixtures = async function () {
  const unnamedAccounts = await getUnnamedAccounts();
  const otherAccounts = [...unnamedAccounts];
  const minter = otherAccounts[0];
  otherAccounts.splice(0, 1);

  const {assetBouncerAdmin} = await getNamedAccounts();

  const polygonAssetERC1155 = await ethers.getContract(
    'PolygonAssetERC1155',
    assetBouncerAdmin
  );
  await waitFor(polygonAssetERC1155.setBouncer(minter, true));

  const Asset = await ethers.getContract('Asset', minter);
  const assetTunnel = await ethers.getContract('AssetERC1155Tunnel');
  const polygonAssetTunnel = await ethers.getContract(
    'PolygonAssetERC1155Tunnel'
  );
  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER');
  const trustedForwarder = await ethers.getContractAt(
    'TestMetaTxForwarder',
    TRUSTED_FORWARDER.address
  );

  let id = 0;
  const ipfsHashString =
    '0x78b9f42c22c3c8b260b781578da3151e8200c741c6b7437bafaff5a9df9b403e';

  async function mintAsset(to: string, value: number, hash = ipfsHashString) {
    // Asset to be minted
    const creator = to;
    const packId = ++id;
    const supply = value;
    const owner = to;
    const data = '0x';

    const receipt = await waitFor(
      polygonAssetERC1155
        .connect(ethers.provider.getSigner(minter))
        ['mint(address,uint40,bytes32,uint256,address,bytes)'](
          creator,
          packId,
          hash,
          supply,
          owner,
          data
        )
    );

    const transferEvent = await expectEventWithArgs(
      polygonAssetERC1155,
      receipt,
      'TransferSingle'
    );
    const tokenId = transferEvent.args[3];

    await polygonAssetERC1155
      .connect(ethers.provider.getSigner(to))
      .setApprovalForAll(polygonAssetTunnel.address, true);

    const testMetadataHashArray = [];

    testMetadataHashArray.push(
      ethers.utils.formatBytes32String('metadataHash')
    );

    const MOCK_DATA = new AbiCoder().encode(
      ['bytes32[]'],
      [testMetadataHashArray]
    );

    await polygonAssetTunnel
      .connect(ethers.provider.getSigner(to))
      .batchWithdrawToRoot(to, [tokenId], [value]);

    const admin = await Asset.getAdmin();
    await Asset.connect(ethers.provider.getSigner(admin)).setPredicate(minter);
    await waitFor(
      Asset.connect(ethers.provider.getSigner(minter))[
        'mint(address,uint256,uint256,bytes)'
      ](to, tokenId, value, MOCK_DATA)
    );

    return tokenId;
  }

  const users = await setupUsers(otherAccounts, {Asset});

  return {
    Asset,
    users,
    minter,
    mintAsset,
    assetTunnel,
    trustedForwarder,
  };
};

export const gemsAndCatalystsFixture = async function (
  isSetupForL2: boolean
): Promise<Contract> {
  const {
    assetAttributesRegistryAdmin,
    gemMinter,
    deployer,
    catalystAdmin,
  } = await getNamedAccounts();
  const L2Prefix = isSetupForL2 ? 'Polygon' : '';
  const assetAttributesRegistryAsRegistryAdmin: Contract = await ethers.getContract(
    L2Prefix + 'AssetAttributesRegistry',
    assetAttributesRegistryAdmin
  );

  const GemsCatalystsRegistry = await deployments.get(
    L2Prefix + 'GemsCatalystsRegistry'
  );

  const DefaultAttributes = await deployments.deploy(`DefaultAttributes`, {
    from: deployer,
    log: true,
  });

  const catalystsToAdd = [];
  const gemsToAdd = [];

  for (const catalyst of catalysts) {
    const doesCatalystExist = await read(
      L2Prefix + 'GemsCatalystsRegistry',
      'doesCatalystExist',
      catalyst.catalystId
    );

    let catalystContract;
    if (!doesCatalystExist) {
      catalystContract = await deploy(
        L2Prefix + `Catalyst_${catalyst.symbol}`,
        {
          contract: 'Catalyst',
          from: deployer,
          log: true,
          args: [
            `Sandbox ${catalyst.symbol} Catalysts`,
            catalyst.symbol,
            catalystAdmin,
            catalyst.maxGems,
            catalyst.catalystId,
            DefaultAttributes.address,
            GemsCatalystsRegistry.address,
          ],
          skipIfAlreadyDeployed: true,
        }
      );

      catalystsToAdd.push(catalystContract.address);
    }
  }

  for (const gem of gems) {
    const doesGemExist = await read(
      L2Prefix + 'GemsCatalystsRegistry',
      'doesGemExist',
      gem.gemId
    );
    let gemsContract;
    if (!doesGemExist) {
      gemsContract = await deploy(L2Prefix + `Gem_${gem.symbol}`, {
        contract: 'Gem',
        from: deployer,
        log: true,
        args: [
          `Sandbox ${gem.symbol} Gems`,
          gem.symbol,
          gemMinter,
          gem.gemId,
          GemsCatalystsRegistry.address,
        ],
        skipIfAlreadyDeployed: true,
      });
      gemsToAdd.push(gemsContract.address);
    }
  }

  const currentAdmin = await read(
    L2Prefix + 'GemsCatalystsRegistry',
    'getAdmin'
  );
  await execute(
    L2Prefix + 'GemsCatalystsRegistry',
    {from: currentAdmin, log: true},
    'addGemsAndCatalysts',
    gemsToAdd,
    catalystsToAdd
  );

  return assetAttributesRegistryAsRegistryAdmin;
};
