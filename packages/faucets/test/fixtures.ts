import {ethers} from 'hardhat';

export const setupFaucetERC1155 = async function () {
  const [deployer, owner, otherAccount] = await ethers.getSigners();

  const Faucet = await ethers.getContractFactory('FaucetsERC1155');
  const faucetsERC1155 = await Faucet.deploy(owner.getAddress());
  await faucetsERC1155.waitForDeployment();

  const MockAsset = await ethers.getContractFactory('FakeAsset');
  const mockAssetERC1155 = await MockAsset.deploy();
  await mockAssetERC1155.waitForDeployment();

  async function mintAssetERC1155({id, supply}: {id: number; supply: number}) {
    const receipt = await mockAssetERC1155.connect(owner).mint(id, supply);
    return receipt;
  }

  const fakeAssets = [
    {
      id: 1,
      supply: 100000,
    },
    {
      id: 2,
      supply: 50,
    },
  ];
  const faucetPeriod = 3600;
  const faucetLimit = 100;

  await mintAssetERC1155(fakeAssets[0]);
  await mintAssetERC1155(fakeAssets[1]);

  const erc1155TokenIds = [fakeAssets[0].id, fakeAssets[1].id];
  const erc1155Amounts = [fakeAssets[0].supply, fakeAssets[1].supply];
  const mockAssetERC1155Address = await mockAssetERC1155.getAddress();
  const faucetsERC1155Address = await faucetsERC1155.getAddress();
  const ownerAddress = await owner.getAddress();

  await faucetsERC1155
    .connect(owner)
    .addFaucet(
      mockAssetERC1155Address,
      faucetPeriod,
      faucetLimit,
      erc1155TokenIds
    );

  await mockAssetERC1155
    .connect(owner)
    .safeBatchTransferFrom(
      ownerAddress,
      faucetsERC1155Address,
      erc1155TokenIds,
      erc1155Amounts,
      '0x'
    );

  return {
    deployer,
    owner,
    otherAccount,
    faucetsERC1155,
    mockAssetERC1155,
    mintAssetERC1155,
    fakeAssets,
    faucetPeriod,
    faucetLimit,
  };
};
