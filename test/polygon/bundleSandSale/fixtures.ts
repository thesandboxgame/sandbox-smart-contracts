import {
  deployments,
  ethers,
  getNamedAccounts,
  getUnnamedAccounts,
} from 'hardhat';
import {BigNumber, BigNumberish, Contract} from 'ethers';
import {Address} from 'hardhat-deploy/dist/types';
import {expectEventWithArgs, waitFor, withSnapshot} from '../../utils';
import {defaultAbiCoder, keccak256, toUtf8Bytes} from 'ethers/lib/utils';

export type Fixture = {
  contract: Contract;
  sandContract: Contract;
  assetContract: Contract;
  daiContract: Contract;
  daiBeneficiary: Address;
  ethBeneficiary: Address;
  sandBeneficiary: Address;
  polygonBundleSandSaleAdmin: Address;
  otherUsers: string[];
  ethUsdPrice: BigNumber;
  deployPolygonBundleSandSale: (receivingWallet: Address) => Promise<void>;
  receivingWallet: Address;
};
export const setupFixtures = withSnapshot(
  ['DAI', 'PolygonAssetERC1155', 'Sand'],
  async function () {
    const {
      sandBeneficiary,
      assetBouncerAdmin,
      deployer,
    } = await getNamedAccounts();

    const daiBeneficiary = deployer;
    const fakeDai = await ethers.getContract('DAI', daiBeneficiary);

    const fakeMedianizer = await ethers.getContract('DAIMedianizer');
    const ethUsdPrice = BigNumber.from(await fakeMedianizer.read());
    const [
      ethBeneficiary,
      polygonBundleSandSaleAdmin,
      ...otherUsers
    ] = await getUnnamedAccounts();

    // ERC20
    const sandContract = await ethers.getContract('Sand', sandBeneficiary);
    // ERC1155ERC721
    const assetContractAsBouncerAdmin = await ethers.getContract(
      'PolygonAssetERC1155',
      assetBouncerAdmin
    );
    await waitFor(
      assetContractAsBouncerAdmin.setBouncer(sandBeneficiary, true)
    );
    const assetContract = await ethers.getContract(
      'PolygonAssetERC1155',
      sandBeneficiary
    );

    async function deployPolygonBundleSandSale(
      receivingWallet: Address
    ): Promise<void> {
      await deployments.deploy('PolygonBundleSandSale', {
        from: deployer,
        contract: 'PolygonBundleSandSale',
        args: [
          sandContract.address,
          assetContract.address,
          fakeMedianizer.address,
          fakeDai.address,
          polygonBundleSandSaleAdmin,
          receivingWallet,
        ],
      });
    }

    const receivingWallet = otherUsers[1];
    await deployPolygonBundleSandSale(receivingWallet);
    const contract = await ethers.getContract(
      'PolygonBundleSandSale',
      polygonBundleSandSaleAdmin
    );

    return {
      contract,
      sandContract,
      assetContract,
      daiContract: fakeDai,
      daiBeneficiary,
      ethBeneficiary,
      sandBeneficiary,
      polygonBundleSandSaleAdmin,
      otherUsers,
      ethUsdPrice,
      deployPolygonBundleSandSale,
      receivingWallet,
    };
  }
);

// This mints some assets in batch to the sandBeneficiary account, we must then transfer them with some sand
// to PolygonBundleSandSale to create a bundle.
export async function mintMultiple(
  fixtures: Fixture,
  packId: BigNumberish,
  supplies: BigNumberish[]
): Promise<BigNumberish[]> {
  const hash = keccak256(toUtf8Bytes('IPFS somehting'));
  const rarityPack = 0;

  const receipt = await waitFor(
    fixtures.assetContract.mintMultiple(
      fixtures.sandBeneficiary,
      packId,
      hash,
      supplies,
      rarityPack,
      fixtures.sandBeneficiary,
      []
    )
  );
  const mintEvent = await expectEventWithArgs(
    fixtures.assetContract,
    receipt,
    'TransferBatch'
  );
  return mintEvent.args.ids;
}

// This mints some assets in the sandBeneficiary account, we must then transfer them with some sand
// to PolygonBundleSandSale to create a bundle.
export async function mint(
  fixtures: Fixture,
  packId: BigNumberish,
  supply: BigNumberish
): Promise<BigNumberish> {
  const hash = keccak256(toUtf8Bytes('IPFS somehting'));

  const receipt = await waitFor(
    fixtures.assetContract[
      'mint(address,uint40,bytes32,uint256,address,bytes)'
    ](
      fixtures.sandBeneficiary,
      packId,
      hash,
      supply,
      fixtures.sandBeneficiary,
      []
    )
  );
  const mintEvent = await expectEventWithArgs(
    fixtures.assetContract,
    receipt,
    'TransferSingle'
  );
  return mintEvent.args.id;
}

export async function createBundle(
  fixtures: Fixture,
  numPacks: BigNumberish,
  sandAmountPerPack: BigNumberish,
  priceUSDPerPack: BigNumberish,
  transferId: BigNumberish,
  transferValue: BigNumberish
): Promise<BigNumberish> {
  const data = defaultAbiCoder.encode(
    [
      'uint256 numPacks',
      'uint256 sandAmountPerPack',
      'uint256 priceUSDPerPack',
    ],
    [numPacks, sandAmountPerPack, priceUSDPerPack]
  );
  // End up calling onERC1155Received in PolygonBundleSandSale
  const receipt = await waitFor(
    fixtures.assetContract[
      'safeTransferFrom(address,address,uint256,uint256,bytes)'
    ](
      fixtures.sandBeneficiary,
      fixtures.contract.address,
      transferId,
      transferValue,
      data
    )
  );
  const mintEvent = await expectEventWithArgs(
    fixtures.contract,
    receipt,
    'BundleSale'
  );
  return mintEvent.args.saleId;
}

export async function createBatchBundle(
  fixtures: Fixture,
  numPacks: BigNumberish,
  sandAmountPerPack: BigNumberish,
  priceUSDPerPack: BigNumberish,
  transferIds: BigNumberish[],
  transferValues: BigNumberish[]
): Promise<BigNumberish> {
  const data = defaultAbiCoder.encode(
    [
      'uint256 numPacks',
      'uint256 sandAmountPerPack',
      'uint256 priceUSDPerPack',
    ],
    [numPacks, sandAmountPerPack, priceUSDPerPack]
  );
  // End up calling onERC1155BatchReceived in PolygonBundleSandSale
  const receipt = await waitFor(
    fixtures.assetContract[
      'safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)'
    ](
      fixtures.sandBeneficiary,
      fixtures.contract.address,
      transferIds,
      transferValues,
      data
    )
  );
  const mintEvent = await expectEventWithArgs(
    fixtures.contract,
    receipt,
    'BundleSale'
  );
  return mintEvent.args.saleId;
}

export async function createPackMultiple(
  fixtures: Fixture,
  packId: BigNumberish,
  numPacks: BigNumberish,
  supplies: BigNumberish[],
  sandAmountPerPack: BigNumberish,
  priceUSDPerPack: BigNumberish
): Promise<{saleId: BigNumberish; tokenIds: BigNumberish[]}> {
  const realSupplies = supplies.map((x) => BigNumber.from(x).mul(numPacks));
  await waitFor(
    fixtures.sandContract.approve(
      fixtures.contract.address,
      BigNumber.from(sandAmountPerPack).mul(numPacks)
    )
  );
  const tokenIds = await mintMultiple(
    fixtures,
    BigNumber.from(packId),
    realSupplies
  );
  const saleId = await createBatchBundle(
    fixtures,
    numPacks,
    sandAmountPerPack,
    priceUSDPerPack,
    tokenIds,
    realSupplies
  );
  return {saleId, tokenIds};
}

export async function getTokenBalance(
  fixtures: Fixture,
  someUser: Address,
  tokenIds: BigNumberish[]
): Promise<BigNumber[]> {
  const tokenInfo = [];
  for (const tokenId of tokenIds) {
    const balance = await fixtures.assetContract['balanceOf(address,uint256)'](
      someUser,
      tokenId
    );
    tokenInfo.push(BigNumber.from(balance));
  }
  return tokenInfo;
}

export async function createPack(
  fixtures: Fixture
): Promise<{
  saleId: BigNumberish;
  tokenIds: BigNumberish[];
  tokensPre: BigNumber[];
  balancePre: BigNumber;
  priceUSDPerPack: number;
  numPacks: number;
  sandAmountPerPack: number;
  suppliesPerPack: number[];
}> {
  const priceUSDPerPack = 123456789;
  const numPacks = 4;
  const sandAmountPerPack = 1234;
  const suppliesPerPack = [12, 44, 43, 12, 13];
  const {saleId, tokenIds} = await createPackMultiple(
    fixtures,
    123,
    numPacks,
    suppliesPerPack,
    sandAmountPerPack,
    priceUSDPerPack
  );
  const tokensPre = await getTokenBalance(
    fixtures,
    fixtures.contract.address,
    tokenIds
  );
  const balancePre = BigNumber.from(
    await fixtures.sandContract.balanceOf(fixtures.contract.address)
  );
  return {
    saleId,
    tokenIds,
    tokensPre,
    balancePre,
    priceUSDPerPack,
    numPacks,
    sandAmountPerPack,
    suppliesPerPack,
  };
}
