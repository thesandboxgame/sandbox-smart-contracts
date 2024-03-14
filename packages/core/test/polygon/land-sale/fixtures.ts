import {ethers, getNamedAccounts} from 'hardhat';
import fs from 'fs-extra';
import {SaltedProofSaleLandInfo} from '../../../lib/merkleTreeHelper';
import {BigNumber, Wallet} from 'ethers';
import {AbiCoder} from 'ethers/lib/utils';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';
import {withSnapshot} from '../../utils';

export const backendAuthWallet = new ethers.Wallet(
  '0x4242424242424242424242424242424242424242424242424242424242424242'
);
export const zeroAddress = '0x0000000000000000000000000000000000000000';

export const signAuthMessageAs = async (
  wallet: Wallet | SignerWithAddress,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...args: any[]
): Promise<string> => {
  const hashedData = ethers.utils.solidityKeccak256(
    [
      'address',
      'address',
      'uint256',
      'uint256',
      'uint256',
      'uint256',
      'bytes32',
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
        [ethers.utils.solidityPack(['bytes32[]'], [args[args.length - 1]])]
      ),
    ]
  );
  return wallet.signMessage(ethers.utils.arrayify(hashedData));
};

export const setupAuthValidator = withSnapshot(
  ['PolygonAuthValidator'],
  async function (hre) {
    const authValidatorContract = await ethers.getContract('PolygonAuthValidator');
    return {
      authValidatorContract,
      hre,
      getNamedAccounts,
    };
  }
);

export const setupEstateSale = withSnapshot(
  ['PolygonEstateSaleWithAuth', 'MockERC1155Asset', 'PolygonSand'],
  async function (hre) {
    const {sandAdmin, sandBeneficiary, deployer, sandboxAccount} = await getNamedAccounts();
    const authValidatorContract = await ethers.getContract('PolygonAuthValidator');
    const estateSaleWithAuthContract = await ethers.getContract(
      'PolygonLandPreSale_0' // name of test deployment using test data at core/data/landSales/EstateSaleWithAuth_0
    );
    // Set up asset contract for lands with bundleIds
    const assetContract = await ethers.getContract('MockERC1155Asset', sandAdmin); // TODO: change to MockAsset from packages/asset when outside core
    await assetContract['mint(address,uint256,uint256,bytes)'](estateSaleWithAuthContract.address, 1, 2, "0x")
    await assetContract['mint(address,uint256,uint256,bytes)'](estateSaleWithAuthContract.address, 2, 1, "0x")
    await assetContract['mint(address,uint256,uint256,bytes)'](estateSaleWithAuthContract.address, 3, 2, "0x")
    // ---

    // Set up PolygonSand and transfer funds to purchasers
    const proofs: SaltedProofSaleLandInfo[] = fs.readJSONSync(
      './secret/estate-sale/hardhat/.proofs_0.json'
    );
    const sandContract = await ethers.getContract('PolygonSand');
    const childChainManagerContract = await ethers.getContract(
      'CHILD_CHAIN_MANAGER'
    );
    const FUNDS_AMOUNT = BigNumber.from(1500000).mul('1000000000000000000'); // arbitrary amount to beneficiary
    const abiCoder = new AbiCoder();
    const data = abiCoder.encode(['uint256'], [FUNDS_AMOUNT]);
    await childChainManagerContract.callSandDeposit(
      sandContract.address,
      sandBeneficiary,
      data
    );
    const sandContractAsSandBeneficiary = sandContract.connect(
      ethers.provider.getSigner(sandBeneficiary)
    );
    await sandContractAsSandBeneficiary.transfer(deployer, proofs[3].price);
    await sandContractAsSandBeneficiary.transfer(sandboxAccount, proofs[3].price); // reserved address
    //---

    const approveSandForEstateSale = async (address: string, price: string) => {
      const sandContractAsUser = sandContract.connect(
        ethers.provider.getSigner(address)
      );
      await sandContractAsUser.approve(
        estateSaleWithAuthContract.address,
        price
      );
    };
    return {
      authValidatorContract,
      estateSaleWithAuthContract,
      sandContract,
      approveSandForEstateSale,
      proofs,
      hre,
      getNamedAccounts,
    };
  }
);

