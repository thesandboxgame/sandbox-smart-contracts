import {
  deployments,
  ethers,
  getNamedAccounts,
  getUnnamedAccounts,
} from 'hardhat';
import {BigNumber, BigNumberish, Contract} from 'ethers';
import {Address} from 'hardhat-deploy/dist/types';
import {expectEventWithArgs, waitFor} from '../../utils';
import {defaultAbiCoder, keccak256, toUtf8Bytes} from 'ethers/lib/utils';

export type Fixture = {
  sandContract: Contract;
  assetContract: Contract;
  dai: Contract;
  ethBeneficiary: Address;
  sandBeneficiary: Address;
  dayBeneficiary: Address;
  polygonBundleSandSaleAdmin: Address;
  otherUsers: string[];
  usdPrice: BigNumber;
  deployPolygonBundleSandSale: (receivingWallet: Address) => Promise<void>;
};
export const setupFixtures = deployments.createFixture(async function () {
  await deployments.fixture(['DAI', 'Asset', 'Sand']);
  const {
    sandBeneficiary,
    assetBouncerAdmin,
    deployer,
  } = await getNamedAccounts();

  const dayBeneficiary = deployer;
  const fakeDai = await ethers.getContract('DAI', dayBeneficiary);

  const fakeMedianizer = await ethers.getContract('DAIMedianizer');
  const usdPrice = BigNumber.from(await fakeMedianizer.read());
  const [
    ethBeneficiary,
    polygonBundleSandSaleAdmin,
    ...otherUsers
  ] = await getUnnamedAccounts();

  // ERC20
  const sandContract = await ethers.getContract('Sand', sandBeneficiary);
  // ERC1155ERC721
  const assetContractAsBouncerAdmin = await ethers.getContract(
    'Asset',
    assetBouncerAdmin
  );
  await waitFor(assetContractAsBouncerAdmin.setBouncer(sandBeneficiary, true));
  const assetContract = await ethers.getContract('Asset', sandBeneficiary);

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

  return {
    sandContract,
    assetContract,
    dai: fakeDai,
    ethBeneficiary,
    sandBeneficiary,
    dayBeneficiary,
    polygonBundleSandSaleAdmin,
    otherUsers,
    usdPrice,
    deployPolygonBundleSandSale,
  };
});

// This mints some assets in batch to the sandBeneficiary account, we must then transfer them with some sand
// to PolygonBundleSandSale to create a bundle.
export async function mintMultiple(
  fixtures: Fixture,
  packId: number,
  supplies: number[]
) {
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
) {
  const hash = keccak256(toUtf8Bytes('IPFS somehting'));
  const rarity = 0;

  const receipt = await waitFor(
    fixtures.assetContract.mint(
      fixtures.sandBeneficiary,
      packId,
      hash,
      supply,
      rarity,
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
  contract: Contract,
  numPacks: BigNumberish,
  sandAmountPerPack: BigNumberish,
  priceUSDPerPack: BigNumberish,
  transferId: BigNumberish,
  transferValue: BigNumberish
) {
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
      contract.address,
      transferId,
      transferValue,
      data
    )
  );
  const mintEvent = await expectEventWithArgs(contract, receipt, 'BundleSale');
  // TODO: The contract is returning indexId, fix there and then remove add(1)
  return mintEvent.args.saleId.add(1);
}

export async function createBatchBundle(
  fixtures: Fixture,
  contract: Contract,
  numPacks: BigNumberish,
  sandAmountPerPack: BigNumberish,
  priceUSDPerPack: BigNumberish,
  transferIds: number[] | BigNumber[],
  transferValues: number[] | BigNumber[]
) {
  const data = defaultAbiCoder.encode(
    [
      'uint256 numPacks',
      'uint256 sandAmountPerPack',
      'uint256 priceUSDPerPack',
    ],
    [numPacks, sandAmountPerPack, priceUSDPerPack]
  );
  console.log(transferIds, transferValues);
  // End up calling onERC1155BatchReceived in PolygonBundleSandSale
  const receipt = await waitFor(
    fixtures.assetContract[
      'safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)'
    ](
      fixtures.sandBeneficiary,
      contract.address,
      transferIds,
      transferValues,
      data
    )
  );
  const mintEvent = await expectEventWithArgs(contract, receipt, 'BundleSale');
  // TODO: The contract is returning indexId, fix there and then remove add(1)
  return mintEvent.args.saleId.add(1);
}
