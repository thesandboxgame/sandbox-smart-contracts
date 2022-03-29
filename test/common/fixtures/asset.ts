import {
  deployments,
  ethers,
  getNamedAccounts,
  getUnnamedAccounts,
} from 'hardhat';

import {Wallet} from 'ethers';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';

const {read, execute, deploy} = deployments;

import {
  setupUsers,
  waitFor,
  expectEventWithArgs,
  findEvents,
} from '../../utils';

import {Contract} from 'ethers';
import catalysts from '../../../data/catalysts';
import gems from '../../../data/gems';

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const assetFixtures = async function () {
  // await asset_regenerate_and_distribute(hre);
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
    const rarity = 0;
    const owner = to;
    const data = '0x';

    const receipt = await waitFor(
      polygonAssetERC1155
        .connect(ethers.provider.getSigner(minter))
        .mint(creator, packId, hash, supply, rarity, owner, data)
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

    await polygonAssetTunnel
      .connect(ethers.provider.getSigner(to))
      .batchTransferToL1(to, [tokenId], [value], '0x00');

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
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const assetSignedAuctionFixtures = async function () {
  const assetSignedAuctionAuthContract = await ethers.getContract(
    'AssetSignedAuctionWithAuth'
  );

  const Sand = await ethers.getContract('Sand');

  const Admin = await read('AssetSignedAuctionWithAuth', 'getAdmin');

  return {
    assetSignedAuctionAuthContract,
    Sand,
    Admin,
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

export const signAuthMessageAs = async (
  wallet: Wallet | SignerWithAddress,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...args: any[]
): Promise<string> => {
  const hashedData = ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      [
        'bytes32',
        'address',
        'address',
        'uint256',
        'uint256',
        'uint256',
        'uint256',
        'uint256',
        'uint256',
        'bytes32',
        'bytes32',
      ],
      [
        ...args.slice(0, args.length - 2),
        ethers.utils.solidityKeccak256(
          ['bytes'],
          [ethers.utils.solidityPack(['uint256[]'], [args[args.length - 2]])]
        ),
        ethers.utils.solidityKeccak256(
          ['bytes'],
          [ethers.utils.solidityPack(['uint256[]'], [args[args.length - 1]])]
        ),
      ]
    )
  );

  return wallet.signMessage(ethers.utils.arrayify(hashedData));
};
