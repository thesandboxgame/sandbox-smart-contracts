import { ethers, getNamedAccounts, getUnnamedAccounts, deployments } from 'hardhat';
import { BigNumber } from 'ethers';
import { withSnapshot, expectEventWithArgs } from '../utils';

export const setupFaucet = withSnapshot(['Faucet'], async function () {
  const { sandAdmin, sandBeneficiary, deployer } = await getNamedAccounts();
  const others = await getUnnamedAccounts();

  const sandContract = await ethers.getContract('Sand');
  const faucetContract = await ethers.getContract('Faucet');

  const nonce = BigNumber.from(0);
  const deadline = BigNumber.from(2582718400);

  return {
    faucetContract,
    sandContract,
    sandAdmin,
    sandBeneficiary,
    deployer,
    others,
    nonce,
    deadline,
  };
});

export const setupFaucetERC1155 = withSnapshot([], async function () {
  const [owner] = await ethers.getSigners();
  const { deploy } = deployments;

  const Faucet = await ethers.getContractFactory("FaucetsERC1155");
  const faucetsERC1155 = await Faucet.deploy();
  await faucetsERC1155.deployed();

  const ERC1155ERC721HelperLib = await deploy('ERC1155ERC721Helper', {
    from: owner.address,
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
    return { tokenId };
  }

  return {
    faucetsERC1155,
    mockAssetERC1155,
    mintAssetERC1155
  };
});
