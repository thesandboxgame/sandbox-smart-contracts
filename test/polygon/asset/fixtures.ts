import {
  deployments,
  ethers,
  getNamedAccounts,
  getUnnamedAccounts,
} from 'hardhat';

import {BigNumber} from 'ethers';
import {Wallet} from 'ethers';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';

import {
  setupUsers,
  waitFor,
  withSnapshot,
  expectEventWithArgs,
  setupUser,
} from '../../utils';

import {
  assetFixtures,
  gemsAndCatalystsFixture,
} from '../../common/fixtures/asset';

import {depositViaChildChainManager} from '../sand/fixtures';

const ipfsHashString =
  '0x78b9f42c22c3c8b260b781578da3151e8200c741c6b7437bafaff5a9df9b403e';

const polygonAssetFixtures = async function () {
  const {deployer, sandAdmin} = await getNamedAccounts();
  const unnamedAccounts = await getUnnamedAccounts();
  const otherAccounts = [...unnamedAccounts];
  const minter = otherAccounts[0];
  const extractor = otherAccounts[1];
  otherAccounts.splice(0, 2);

  const {assetBouncerAdmin, assetAdmin} = await getNamedAccounts();

  const Sand = await ethers.getContract('PolygonSand');

  // Set up PolygonSand
  const SAND_AMOUNT = BigNumber.from(100000).mul(`1000000000000000000`);
  const childChainManager = await ethers.getContract('CHILD_CHAIN_MANAGER');
  await depositViaChildChainManager(
    {sand: Sand, childChainManager},
    sandAdmin,
    SAND_AMOUNT
  );

  const sandContractAsAdmin = await Sand.connect(
    ethers.provider.getSigner(sandAdmin)
  );

  async function provideSand(to: string, amount: BigNumber) {
    await sandContractAsAdmin.transfer(to, amount);
  }

  // Set up Asset contracts

  const Asset = await ethers.getContract('Asset', assetBouncerAdmin);
  const PolygonAssetERC1155 = await ethers.getContract(
    'PolygonAssetERC1155',
    assetBouncerAdmin
  );
  await waitFor(PolygonAssetERC1155.setBouncer(minter, true));

  // Set sender as bouncer (only bouncers can extract)
  await waitFor(PolygonAssetERC1155.setBouncer(extractor, true));

  const assetSignedAuctionAuthContract = await ethers.getContract(
    'PolygonAssetSignedAuctionWithAuth'
  );

  await waitFor(Asset.setBouncer(minter, true));

  // Set sender as bouncer (only bouncers can extract)
  await waitFor(Asset.setBouncer(extractor, true));

  const AssetERC1155Tunnel = await ethers.getContract('AssetERC1155Tunnel');
  const PolygonAssetERC1155Tunnel = await ethers.getContract(
    'PolygonAssetERC1155Tunnel'
  );
  const FxRoot = await ethers.getContract('FXROOT');
  const FxChild = await ethers.getContract('FXCHILD');
  const CheckpointManager = await ethers.getContract('CHECKPOINTMANAGER');
  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER');
  const trustedForwarder = await ethers.getContractAt(
    'TestMetaTxForwarder',
    TRUSTED_FORWARDER.address
  );

  // Set up ERC721 for extraction tests
  const PolygonAssetERC721 = await ethers.getContract(
    'PolygonAssetERC721',
    assetAdmin
  );
  const minterRole = await PolygonAssetERC721.MINTER_ROLE();
  const burnerRole = await PolygonAssetERC721.BURNER_ROLE();

  await PolygonAssetERC721.grantRole(minterRole, PolygonAssetERC1155.address);
  await PolygonAssetERC721.grantRole(burnerRole, extractor);

  const deployerAccount = await setupUser(deployer, {
    PolygonAssetERC1155,
    Asset,
    FxRoot,
    FxChild,
    CheckpointManager,
    PolygonAssetERC1155Tunnel,
    AssetERC1155Tunnel,
  });

  await deployerAccount.FxRoot.setFxChild(FxChild.address);

  let id = 0;

  async function mintAsset(to: string, value: number, hash = ipfsHashString) {
    // Asset to be minted
    const creator = to;
    const packId = ++id;
    const supply = value;
    const owner = to;
    const data = '0x';

    const receipt = await waitFor(
      PolygonAssetERC1155.connect(ethers.provider.getSigner(minter))[
        'mint(address,uint40,bytes32,uint256,address,bytes)'
      ](creator, packId, hash, supply, owner, data)
    );

    const transferEvent = await expectEventWithArgs(
      PolygonAssetERC1155,
      receipt,
      'TransferSingle'
    );
    const tokenId = transferEvent.args[3];

    return tokenId;
  }

  async function mintMultipleAsset(
    to: string,
    values: number[],
    hash = ipfsHashString
  ) {
    const creator = to;
    const packId = ++id;
    const supplies = values;
    const owner = to;
    const data = '0x';

    const receipt = await waitFor(
      PolygonAssetERC1155.connect(ethers.provider.getSigner(minter))[
        'mintMultiple(address,uint40,bytes32,uint256[],bytes,address,bytes)'
      ](creator, packId, hash, supplies, '0x', owner, data)
    );

    const transferEvent = await expectEventWithArgs(
      PolygonAssetERC1155,
      receipt,
      'TransferBatch'
    );

    const tokenIds = transferEvent.args[3];

    return tokenIds;
  }

  const users = await setupUsers(otherAccounts, {Asset});

  const authValidatorContract = await ethers.getContract(
    'PolygonAuthValidator'
  );

  return {
    Sand,
    Asset,
    PolygonAssetERC1155,
    AssetERC1155Tunnel,
    PolygonAssetERC1155Tunnel,
    PolygonAssetERC721,
    assetSignedAuctionAuthContract,
    users,
    minter,
    extractor,
    mintAsset,
    mintMultipleAsset,
    provideSand,
    trustedForwarder,
    assetBouncerAdmin,
    authValidatorContract,
  };
};

async function gemsAndCatalystsFixtureL1() {
  return gemsAndCatalystsFixture(false);
}

async function gemsAndCatalystsFixtureL2() {
  return gemsAndCatalystsFixture(true);
}

export const setupPolygonAsset = withSnapshot(
  [
    'PolygonAssetERC1155',
    'PolygonAssetERC721',
    'Asset',
    'AssetERC1155Tunnel',
    'PolygonAssetERC1155Tunnel',
    'PolygonAssetSignedAuctionWithAuth',
    'SandBaseToken',
    'PolygonSand',
    'PolygonAuthValidator',
  ],
  polygonAssetFixtures
);

export const setupMainnetAndPolygonAsset = withSnapshot(
  [
    'SandBaseToken',
    'PolygonSand',
    'PolygonAssetERC1155',
    'PolygonAssetERC721',
    'Asset',
    'AssetERC721',
    'PolygonAssetAttributesRegistry',
    'PolygonGemsCatalystsRegistry',
    'AssetAttributesRegistry',
    'GemsCatalystsRegistry',
  ],
  async () => {
    return {
      polygon: await polygonAssetFixtures(),
      mainnet: await assetFixtures(),
      polygonAssetRegistry: await gemsAndCatalystsFixtureL2(),
      assetRegistry: await gemsAndCatalystsFixtureL1(),
    };
  }
);

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
