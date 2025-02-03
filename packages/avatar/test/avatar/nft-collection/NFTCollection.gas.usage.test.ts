import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {Wallet} from 'ethers';
import {setupNFTCollectionContract} from './NFTCollection.fixtures';

async function customDeploy() {
  const maxSupply = 100000;
  const ret = await loadFixture(setupNFTCollectionContract);
  const collectionContract = await ret.deployWithCustomArg({
    maxSupply,
    maxTokensPerWallet: maxSupply,
  });
  const collectionContractAsOwner = collectionContract.connect(
    ret.collectionOwner
  );
  await collectionContractAsOwner.setupWave(maxSupply, maxSupply, 0);
  return {
    ...ret,
    maxSupply,
    collectionContract,
    collectionContractAsOwner,
    collectionContractAsRandomWallet: collectionContract.connect(
      ret.randomWallet
    ),
    collectionContractAsRandomWallet2: collectionContract.connect(
      ret.randomWallet2
    ),
    mint: async (amount, wallet = ret.collectionOwner) => {
      const tokenIds = [];
      while (tokenIds.length < amount) {
        const batchSize = Math.min(500, amount - tokenIds.length);
        const tx = await collectionContractAsOwner.batchMint(0, [
          [wallet, batchSize],
        ]);
        const transferEvents = await collectionContractAsOwner.queryFilter(
          'Transfer',
          tx.blockNumber
        );
        tokenIds.push(...transferEvents.map((x) => x.args.tokenId));
      }
      return tokenIds;
    },
  };
}

describe('NFTCollection gas usage @skip-on-ci @skip-on-coverage', function () {
  function check(method, data, amount) {
    it(`gas usage of ${method}`, async function () {
      const {
        collectionContractAsRandomWallet,
        randomWallet,
        randomWallet2,
        mint,
      } = await loadFixture(customDeploy);
      const tokenIds = await mint(amount, randomWallet);
      const tx = await collectionContractAsRandomWallet[method](
        ...[randomWallet, randomWallet2, tokenIds, ...data]
      );
      const receipt = await tx.wait();
      const gasPerToken = receipt.gasUsed / BigInt(tokenIds.length);
      console.log(
        `Gas usage of ${method} ${receipt.gasUsed} after minting ${
          tokenIds.length
        } tokens ${gasPerToken} per token, raw estimate of tokens ${
          BigInt(30 * 10 ** 6) / gasPerToken
        }`
      );
    });
  }

  // eslint-disable-next-line mocha/no-setup-in-describe
  check('batchTransferFrom', [], 2610);
  // eslint-disable-next-line mocha/no-setup-in-describe
  check('safeBatchTransferFrom', ['0x'], 2520);

  it(`gas usage of batchMint in one batch`, async function () {
    const {collectionContractAsOwner, randomWallet} = await loadFixture(
      customDeploy
    );
    const amount = 1000n;
    const tx = await collectionContractAsOwner.batchMint(0, [
      [randomWallet, amount],
    ]);
    const receipt = await tx.wait();
    const gasPerToken = receipt.gasUsed / amount;
    console.log(
      `Gas usage of batchMint ${
        receipt.gasUsed
      } after minting ${amount} in one batch tokens ${gasPerToken} per token, raw estimate of tokens ${
        BigInt(30 * 10 ** 6) / gasPerToken
      }`
    );
  });

  it(`gas usage of batchMint in multiple batches of one token`, async function () {
    const {collectionContractAsOwner} = await loadFixture(customDeploy);
    const amount = 400n;
    const batches = [];
    for (let i = 0; i < amount; i++) {
      batches.push([Wallet.createRandom(), 1]);
    }
    const tx = await collectionContractAsOwner.batchMint(0, batches);
    const receipt = await tx.wait();
    const gasPerToken = receipt.gasUsed / amount;
    console.log(
      `Gas usage of batchMint ${
        receipt.gasUsed
      } after minting ${amount} in multiple batches, ${gasPerToken} per token, raw estimate of tokens ${
        BigInt(30 * 10 ** 6) / gasPerToken
      }`
    );
  });

  it(`gas usage of mint`, async function () {
    const {
      collectionContractAsOwner: contract,
      sandContract,
      randomWallet,
      raffleSignWallet,
      mintSign,
    } = await loadFixture(customDeploy);
    const amount = 1000n;
    const encodedData = contract.interface.encodeFunctionData('mint', [
      await randomWallet.getAddress(),
      amount,
      222,
      await mintSign(
        randomWallet,
        222,
        raffleSignWallet,
        await contract.getAddress()
      ),
    ]);
    const tx = await sandContract
      .connect(randomWallet)
      .approveAndCall(contract, 0, encodedData);
    const receipt = await tx.wait();
    const gasPerToken = receipt.gasUsed / amount;
    console.log(
      `Gas usage of mint ${
        receipt.gasUsed
      } after minting ${amount} in multiple batches, ${gasPerToken} per token, raw estimate of tokens ${
        BigInt(30 * 10 ** 6) / gasPerToken
      }`
    );
  });
});
