import {ethers, deployments} from 'hardhat';
import {
  withSnapshot,
  expectEventWithArgs,
  expectEventWithArgsFromReceipt,
} from '../utils';

export const setupMisteryBox = withSnapshot([], async function () {
  const [deployer, account1, account2] = await ethers.getSigners();

  const MockAssetERC721 = await ethers.getContractFactory('MockAssetERC721');
  const mockAssetERC721 = await MockAssetERC721.deploy();
  await mockAssetERC721.deployed();

  const {deploy} = deployments;

  const ERC1155ERC721HelperLib = await deploy('ERC1155ERC721Helper', {
    from: deployer.address,
    log: true,
    skipIfAlreadyDeployed: true,
  });

  const MockAssetERC1155 = await ethers.getContractFactory('MockAssetERC1155', {
    libraries: {
      ERC1155ERC721Helper: ERC1155ERC721HelperLib.address,
    },
  });

  const mockAssetERC1155 = await MockAssetERC1155.deploy();
  await mockAssetERC1155.deployed();

  const MisteryBox = await ethers.getContractFactory('MisteryBox');
  const misteryBox = await MisteryBox.deploy();

  await misteryBox.deployed();

  async function mintAssetERC721({to, id}: {to: string; id: number}) {
    const receipt = await mockAssetERC721.mintWithOutMinterCheck(to, id);
    const event = await expectEventWithArgsFromReceipt(
      mockAssetERC721,
      receipt,
      'Transfer'
    );
    const tokenId = event.args[2];
    return {receipt, tokenId};
  }

  async function mintAssetERC1155({
    creatorAddress,
    packId,
    hash,
    supply,
    ownerAddress,
    data,
  }: {
    creatorAddress: string;
    packId: number;
    hash: string;
    supply: number;
    ownerAddress: string;
    data: string;
  }) {
    const receipt = await mockAssetERC1155.mintWithOutBouncerCheck(
      creatorAddress,
      packId,
      hash,
      supply,
      ownerAddress,
      data
    );
    const transferEvent = await expectEventWithArgs(
      mockAssetERC1155,
      receipt,
      'TransferSingle'
    );
    const tokenId = transferEvent.args[3];
    return {tokenId};
  }

  return {
    misteryBox,
    mockAssetERC721,
    mockAssetERC1155,
    deployer,
    account1,
    account2,
    mintAssetERC721,
    mintAssetERC1155,
  };
});
