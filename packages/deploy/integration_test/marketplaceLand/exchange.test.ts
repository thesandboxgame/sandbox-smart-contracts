import {getContract, withSnapshot} from '../../utils/testUtils';
import {expect} from 'chai';
import {ethers} from 'hardhat';
import {BigNumber} from 'ethers';
import {AssetERC20, AssetERC721, OrderDefault, signOrder} from './orders';

const setupTest = withSnapshot(
  ['Exchange', 'PolygonSand', 'PolygonLand'],
  async (hre) => {
    const {sandAdmin} = await hre.getNamedAccounts();
    const [user1, user2, minter] = await hre.getUnnamedAccounts();

    const sandContract = await getContract(hre, 'PolygonSand');

    const sandAdminSigner = await ethers.getSigner(sandAdmin);
    const landContract = await getContract(hre, 'PolygonLand', sandAdminSigner);
    await landContract.setMinter(minter, true);
    const landContractAsMinter = await landContract.connect(
      await ethers.getSigner(minter)
    );

    const childChainManager = await getContract(
      hre,
      'CHILD_CHAIN_MANAGER',
      sandAdminSigner
    );
    await childChainManager.setPolygonAsset(landContract.address);

    const exchangeAsUser2 = await getContract(
      hre,
      'Exchange',
      await ethers.getSigner(user2)
    );
    const orderValidatorAsAdmin = await getContract(
      hre,
      'OrderValidator',
      await ethers.getSigner(sandAdmin)
    );
    const TSB_ROLE = await orderValidatorAsAdmin.TSB_ROLE();
    // enable land in whitelist
    await orderValidatorAsAdmin.grantRole(
      TSB_ROLE,
      landContractAsMinter.address
    );
    return {
      landContract,
      landContractAsMinter,
      sandContract,
      exchangeAsUser2,
      orderValidatorAsAdmin,
      sandAdmin,
      user1,
      user2,
      minter,
      mintSand: async (user: string, amount: BigNumber) =>
        childChainManager.callSandDeposit(
          sandContract.address,
          user,
          ethers.utils.defaultAbiCoder.encode(['uint256'], [amount])
        ),
    };
  }
);

describe('Marketplace Land <-> Sand exchange', function () {
  it('simple exchange', async function () {
    const {
      sandContract,
      landContractAsMinter,
      exchangeAsUser2,
      orderValidatorAsAdmin,
      user1,
      user2,
      mintSand,
    } = await setupTest();
    const oneEth = ethers.utils.parseEther('1');
    const landTokenId = 0;
    const size = 1;
    await landContractAsMinter.mintQuad(user1, size, 0, 0, '0x');
    expect(await landContractAsMinter.balanceOf(user1)).to.be.equal(
      size * size
    );

    await mintSand(user2, oneEth);
    expect(await sandContract.balanceOf(user2)).to.be.equal(oneEth);

    await sandContract
      .connect(await ethers.getSigner(user2))
      .approve(exchangeAsUser2.address, oneEth);
    await landContractAsMinter
      .connect(await ethers.getSigner(user1))
      .approve(exchangeAsUser2.address, landTokenId);

    const makerAsset = await AssetERC721(landContractAsMinter, landTokenId);
    const takerAsset = await AssetERC20(sandContract, oneEth);
    const orderLeft = OrderDefault(
      user1,
      makerAsset,
      ethers.constants.AddressZero,
      takerAsset,
      1,
      0,
      0
    );
    const orderRight = await OrderDefault(
      user2,
      takerAsset,
      ethers.constants.AddressZero,
      makerAsset,
      1,
      0,
      0
    );
    const makerSig = await signOrder(orderLeft, user1, orderValidatorAsAdmin);
    const takerSig = await signOrder(orderRight, user2, orderValidatorAsAdmin);
    const tx = await exchangeAsUser2.matchOrders([
      {
        orderLeft,
        signatureLeft: makerSig,
        orderRight,
        signatureRight: takerSig,
      },
    ]);
    const receipt = await tx.wait();
    console.log(receipt.gasUsed.toString());
    expect(await landContractAsMinter.balanceOf(user2)).to.be.equal(
      size * size
    );
    expect(await sandContract.balanceOf(user1)).to.be.equal(oneEth);
  });
});
