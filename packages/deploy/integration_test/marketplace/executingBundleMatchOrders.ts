import 'dotenv/config';
import {ethers, ZeroAddress} from 'ethers';
import hre from 'hardhat';
import {AssetERC20, Asset, AssetBundle} from './utils/assets';
import {OrderDefault, signOrder, Order} from './utils/order';
import {
  GRID_SIZE,
  erc721,
  quad,
  erc1155,
  erc20Price,
  priceDistribution,
} from './config';

// Sand token are exchanged with a bundle using matchOrder
async function main() {
  const {deployments, getNamedAccounts} = hre;
  const {read, execute} = deployments;
  const {deployer, sandAdmin, assetAdmin} = await getNamedAccounts();

  const PolygonSand = await deployments.get('PolygonSand');
  const PolygonSandAddress = PolygonSand.address;

  const PolygonLand = await deployments.get('PolygonLand');
  const PolygonLandAddress = PolygonLand.address;

  const Asset = await deployments.get('Asset');
  const AssetAddress = Asset.address;

  const Exchange = await deployments.get('Exchange');
  const ExchangeAddress = Exchange.address;
  const OrderValidator = await deployments.get('OrderValidator');

  const ERC20_ROLE = await read('OrderValidator', 'ERC20_ROLE');

  const erc721Id = [],
    erc1155Id = [],
    erc1155Supply = [],
    quadId = [],
    quadSize = [],
    quadXs = [],
    quadYs = [];

  // PolygonSand token is granted ERC20 role
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

  // initial sandAdmin PolygonSand balance
  console.log(
    'sandAdmin initial PolygonSand balance : ',
    (await read('PolygonSand', 'balanceOf', sandAdmin)).toString()
  );

  // initial deployer PolygonSand balance
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

  //  mint quad of size 1 with (x,y)
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

  const minterRole = await read('Asset', 'MINTER_ROLE');

  // allow assetAdmin to mint Asset
  if (!(await read('Asset', 'hasRole', minterRole, assetAdmin)))
    await execute(
      'Asset',
      {from: assetAdmin, log: true},
      'grantRole',
      minterRole,
      assetAdmin
    );

  // mint ERC1155 asset with id:1 and supply:10
  for (let i = 0; i < erc1155.length; i++) {
    const tokenId = erc1155[i][0];
    const supply = erc1155[i][1];
    await execute(
      'Asset',
      {from: assetAdmin, log: true},
      'mint',
      sandAdmin,
      tokenId,
      supply,
      '0x0'
    );

    console.log(
      `balance of sandAdmin asset with id:${tokenId} : `,
      (await read('Asset', 'balanceOf', sandAdmin, tokenId)).toString()
    );

    console.log(
      `balance of deployer asset with id:${tokenId} : `,
      (await read('Asset', 'balanceOf', deployer, tokenId)).toString()
    );

    erc1155Id.push(tokenId);
    erc1155Supply.push(supply);
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

  // approve Exchange contract with PolygonSand token by deployer
  await execute(
    'PolygonSand',
    {from: deployer, log: true},
    'approve',
    ExchangeAddress,
    erc20Price
  );

  // approve Exchange contract with PolygonLand token by sandAdmin
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

  const makerAsset: Asset = await AssetERC20(PolygonSandAddress, erc20Price);

  // TODO: to be removed after audit fixes
  const bundledERC20 = [];

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
    bundledERC20,
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

  const makerSig: string = await signOrder(
    orderLeft,
    signerDeployer,
    OrderValidator
  );
  const takerSig: string = await signOrder(
    orderRight,
    signerSandAdmin,
    OrderValidator
  );

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
      'balance of deployer asset with id:${erc1155Id[i]} after exchange : ',
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
