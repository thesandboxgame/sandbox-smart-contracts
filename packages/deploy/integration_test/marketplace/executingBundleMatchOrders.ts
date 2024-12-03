import 'dotenv/config';
import {ethers, ZeroAddress} from 'ethers';
import hre from 'hardhat';
import {AssetERC20, Asset, AssetBundle} from './utils/assets';
import {OrderDefault, signOrder, Order} from './utils/order';
import {
  createAssetMintSignature,
  generateTokenId,
} from './utils/createAssetMintSignature';
import {
  GRID_SIZE,
  erc721,
  quad,
  erc1155,
  erc20PriceForBundle,
  priceDistribution,
} from './config';

// Sand token are exchanged with a bundle using matchOrder
async function main() {
  const networkName = hre.network.name;
  if (networkName == 'hardhat') {
    throw new TypeError('Invalid network');
  }
  const {getChainId} = hre;
  const chainId = await getChainId();

  const {deployments, getNamedAccounts} = hre;
  const {read, execute} = deployments;
  const {deployer, sandAdmin, assetAdmin} = await getNamedAccounts();

  const PolygonSand = await deployments.get('PolygonSand');
  const PolygonSandAddress = PolygonSand.address;

  const PolygonLand = await deployments.get('PolygonLand');
  const PolygonLandAddress = PolygonLand.address;

  const Asset = await deployments.get('Asset');
  const AssetAddress = Asset.address;

  const AssetCreate = await deployments.get('AssetCreate');
  const AssetCreateAddress = AssetCreate.address;

  const Exchange = await deployments.get('Exchange');
  const ExchangeAddress = Exchange.address;
  const OrderValidator = await deployments.get('OrderValidator');

  const ERC20_ROLE = await read('OrderValidator', 'ERC20_ROLE');
  const TSB_PRIMARY_MARKET_SELLER_ROLE = await read(
    'Exchange',
    'TSB_PRIMARY_MARKET_SELLER_ROLE'
  );

  const mnemonicAmoyInstance = ethers.Mnemonic.fromPhrase(
    process.env.MNEMONIC_AMOY
  );

  const signerDeployer = ethers.HDNodeWallet.fromMnemonic(
    mnemonicAmoyInstance,
    `m/44'/60'/0'/0/0`
  );

  const signerSandAdmin = ethers.HDNodeWallet.fromMnemonic(
    mnemonicAmoyInstance,
    `m/44'/60'/0'/0/2`
  );

  const signerAssetCreate = new ethers.Wallet(
    process.env.ASSET_V2_CREATE_WALLET_SIGNATURE
  );

  const erc721Id = [],
    erc1155Id = [],
    erc1155Supply = [],
    quadId = [],
    quadSize = [],
    quadXs = [],
    quadYs = [];

  // Sand token is granted ERC20 role
  if (
    !(await read('OrderValidator', 'hasRole', ERC20_ROLE, PolygonSandAddress))
  ) {
    await execute(
      'OrderValidator',
      {from: sandAdmin, log: true},
      'grantRole',
      ERC20_ROLE,
      PolygonSandAddress
    );
  }

  // initial sandAdmin Sand balance
  console.log(
    'sandAdmin initial PolygonSand balance : ',
    (await read('PolygonSand', 'balanceOf', sandAdmin)).toString()
  );

  // initial deployer Sand balance
  console.log(
    'deployer initial PolygonSand balance : ',
    (await read('PolygonSand', 'balanceOf', deployer)).toString()
  );

  // allow sandAdmin to mint land
  if (!(await read('PolygonLand', 'isMinter', sandAdmin))) {
    await execute(
      'PolygonLand',
      {from: deployer, log: true},
      'setMinter',
      sandAdmin,
      true
    );
  }

  // mint quad of size 1 with (x,y)
  for (let i = 0; i < erc721.length; i++) {
    const x = erc721[i][0];
    const y = erc721[i][1];
    await execute(
      'PolygonLand',
      {from: sandAdmin, log: true},
      'mintQuad',
      sandAdmin,
      1,
      x,
      y,
      '0x'
    );

    const id = idInPath(0, 1, x, y);
    console.log(
      `land owner of id: ${id} : `,
      await read('PolygonLand', 'ownerOf', id)
    );

    erc721Id.push(id);
  }

  // mint ERC1155 asset with provided tier and amount
  for (let i = 0; i < erc1155.length; i++) {
    const tier = erc1155[i][0];
    const amount = erc1155[i][1];
    const metadataHash = erc1155[i][2];

    let nonce = (
      await read('AssetCreate', 'signatureNonces', assetAdmin)
    ).toString();

    const signature = await createAssetMintSignature(
      assetAdmin,
      tier,
      amount,
      nonce,
      true,
      metadataHash,
      AssetCreateAddress,
      signerAssetCreate
    );

    await execute(
      'Catalyst',
      {from: assetAdmin, log: true},
      'mint',
      assetAdmin,
      tier,
      amount
    );

    await execute(
      'AssetCreate',
      {from: assetAdmin, log: true},
      'createAsset',
      signature,
      tier,
      amount,
      true,
      metadataHash,
      assetAdmin
    );

    nonce = (
      await read('AssetCreate', 'signatureNonces', assetAdmin)
    ).toString();

    const tokenId = await generateTokenId(assetAdmin, tier, nonce, 1);

    console.log(
      `balance of sandAdmin asset with id:${tokenId} : `,
      (await read('Asset', 'balanceOf', sandAdmin, tokenId)).toString()
    );
    console.log(
      `balance of deployer asset with id:${tokenId} : `,
      (await read('Asset', 'balanceOf', deployer, tokenId)).toString()
    );
    erc1155Id.push(tokenId);
    erc1155Supply.push(amount);
  }

  // mint quad of given size with (x,y)
  for (let i = 0; i < quad.length; i++) {
    const size = quad[i][0];
    const x = quad[i][1];
    const y = quad[i][2];

    await execute(
      'PolygonLand',
      {from: sandAdmin, log: true},
      'mintQuad',
      sandAdmin,
      size,
      x,
      y,
      '0x'
    );

    for (let j = 0; j < size * size; j++) {
      const id = idInPath(j, size, x, y);
      console.log(
        `land owner of id:${id} : `,
        await read('PolygonLand', 'ownerOf', id)
      );
      quadId.push(id);
    }

    quadSize.push(size);
    quadXs.push(x);
    quadYs.push(y);
  }

  // approve Exchange contract with Sand token by deployer
  await execute(
    'PolygonSand',
    {from: deployer, log: true},
    'approve',
    ExchangeAddress,
    erc20PriceForBundle
  );

  // approve Exchange contract with Land token by sandAdmin
  await execute(
    'PolygonLand',
    {from: sandAdmin, log: true},
    'setApprovalForAll',
    ExchangeAddress,
    true
  );

  // approve Exchange contract with Asset token by sandAdmin
  await execute(
    'Asset',
    {from: sandAdmin, log: true},
    'setApprovalForAll',
    ExchangeAddress,
    true
  );

  const makerAsset: Asset = await AssetERC20(
    PolygonSandAddress,
    erc20PriceForBundle
  );

  const bundledERC721 = [
    {
      erc721Address: PolygonLandAddress,
      ids: erc721Id,
    },
  ];

  const bundledERC1155 = [
    {
      erc1155Address: AssetAddress,
      ids: erc1155Id,
      supplies: erc1155Supply,
    },
  ];

  const quads = {
    sizes: quadSize,
    xs: quadXs,
    ys: quadYs,
    data: '0x',
  };

  // Create bundle for passing as right order
  const bundleData = {
    bundledERC721,
    bundledERC1155,
    quads,
    priceDistribution,
  };

  const takerAsset: Asset = await AssetBundle(bundleData, 1);

  const orderLeft: Order = await OrderDefault(
    deployer,
    makerAsset, // ERC20
    ZeroAddress,
    takerAsset, // Bundle
    1,
    0,
    0
  );
  const orderRight: Order = await OrderDefault(
    sandAdmin,
    takerAsset, // Bundle
    ZeroAddress,
    makerAsset, // ERC20
    1,
    0,
    0
  );

  const makerSig: string = await signOrder(
    orderLeft,
    signerDeployer,
    chainId,
    OrderValidator
  );
  const takerSig: string = await signOrder(
    orderRight,
    signerSandAdmin,
    chainId,
    OrderValidator
  );

  // bundle seller (sandAdmin) is provided with
  if (
    !(await read(
      'Exchange',
      'hasRole',
      TSB_PRIMARY_MARKET_SELLER_ROLE,
      sandAdmin
    ))
  ) {
    await execute(
      'Exchange',
      {from: sandAdmin, log: true},
      'grantRole',
      TSB_PRIMARY_MARKET_SELLER_ROLE,
      sandAdmin
    );
  }

  const tx = await execute(
    'Exchange',
    {from: deployer, log: true, gasLimit: 1000000},
    'matchOrders',
    [
      {
        orderLeft, // passing ERC20 as left order
        signatureLeft: makerSig,
        orderRight, // passing Bundle as right order
        signatureRight: takerSig,
      },
    ]
  );
  console.log('transaction hash for bundle exchange : ', tx.transactionHash);

  console.log('After executing match Orders');
  console.log(
    'sandAdmin PolygonSand balance after exchange : ',
    (await read('PolygonSand', 'balanceOf', sandAdmin)).toString()
  );
  console.log(
    'deployer PolygonSand balance after exchange : ',
    (await read('PolygonSand', 'balanceOf', deployer)).toString()
  );
  for (let i = 0; i < erc721Id.length; i++) {
    console.log(
      `land owner of id:${erc721Id[i]} after exchange : `,
      await read('PolygonLand', 'ownerOf', erc721Id[i])
    );
  }

  for (let i = 0; i < erc1155Id.length; i++) {
    console.log(
      `balance of sandAdmin asset with id:${erc1155Id[i]} after exchange : `,
      (await read('Asset', 'balanceOf', sandAdmin, erc1155Id[i])).toString()
    );
    console.log(
      `balance of deployer asset with id:${erc1155Id[i]} after exchange : `,
      (await read('Asset', 'balanceOf', deployer, erc1155Id[i])).toString()
    );
  }

  for (let i = 0; i < quadId.length; i++) {
    console.log(
      `land owner of id:${quadId[i]} after excahnge : `,
      await read('PolygonLand', 'ownerOf', quadId[i])
    );
  }
}

function idInPath(i: number, size: number, x: number, y: number): number {
  return x + (i % size) + (y + Math.floor(i / size)) * GRID_SIZE;
}
void main();
