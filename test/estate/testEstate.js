const {deployments, getNamedAccounts} = require('@nomiclabs/buidler');
const ethers = require('ethers');
const {
    Contract,
} = ethers;

const MerkleTree = require('../../lib/merkleTree');
const {createDataArray, calculateLandHash} = require('../../lib/merkleTreeHelper');

const {runERC721tests} = require('../batteries/erc721_tests');
const {runMintingTestFromSale} = require('./sale_minting_tests');
const {runEstateTests} = require('./estate_tests');

const {
    ethersProvider
} = require('../utils');

function LandSaleEstateStore() {
    // this.
}
LandSaleEstateStore.prototype.resetContracts = async function () {
    try {
        await deployments.run(); // TODO BUIDLER_DEPLOY TAG
    } catch (e) {
        console.error(e);
    }
    const LandSale = await deployments.get('LandPreSale_4');
    const Estate = await deployments.get('Estate');
    const Land = await deployments.get('Land');
    const landSaleDeployment = await deployments.get('LandPreSale_4');
    const lands = landSaleDeployment.linkedData;
    const landHashArray = createDataArray(lands);
    const merkleTree = new MerkleTree(landHashArray);
    return {
        LandSale: new Contract(LandSale.address, LandSale.abi, ethersProvider),
        Estate: new Contract(Estate.address, Estate.abi, ethersProvider),
        Land: new Contract(Land.address, Land.abi, ethersProvider),
        merkleTree,
        lands,
        getProof: (land) => merkleTree.getProof(calculateLandHash(land))
    };
};

function EstateStore() {
    // this.
}
EstateStore.prototype.resetContracts = async function () {
    try {
        await deployments.run(); // TODO BUIDLER_DEPLOY TAG
    } catch (e) {
        console.error(e);
    }
    const EstateInfo = await deployments.get('Estate');
    const LandInfo = await deployments.get('Land');
    const Estate = new Contract(EstateInfo.address, EstateInfo.abi, ethersProvider);
    const Land = new Contract(LandInfo.address, LandInfo.abi, ethersProvider);

    const namedAccounts = await getNamedAccounts();
    const minter = namedAccounts.others[4];
    const landAdmin = namedAccounts.landAdmin;
    await Land.connect(Land.provider.getSigner(landAdmin)).functions.setMinter(minter, true).then((tx) => tx.wait());
    const LandFromMinter = Land.connect(Land.provider.getSigner(minter));
    return {
        Estate,
        Land,
        minter,
        LandFromMinter
    };
};

function ERC721Contract() {
    this.counter = 0;
    this.contract = null;
    this.contractName = 'Estate';
    this.supportsBatchTransfer = true;
    this.supportsSafeBatchTransfer = true;
    this.supportsMandatoryERC721Receiver = true;
}
ERC721Contract.prototype.resetContract = async function () {
    const {
        deployer,
        landAdmin,
    } = await getNamedAccounts();
    this.minter = deployer;

    await deployments.run(this.contractName);

    const contract = await deployments.get(this.contractName);
    this.contract = new Contract(contract.address, contract.abi, ethersProvider);

    const landContract = await deployments.get('Land');
    this.landContract = new Contract(landContract.address, landContract.abi, ethersProvider);
    const tx = await this.landContract.connect(ethersProvider.getSigner(landAdmin)).functions.setMinter(this.minter, true);
    await tx.wait();
    return this.contract;
};
ERC721Contract.prototype.mintERC721 = async function (creator) {
    this.counter++;
    const landTx = await this.landContract.connect(ethersProvider.getSigner(this.minter)).functions.mintQuad(creator, 1, this.counter, this.counter, '0x');
    await landTx.wait();
    const tx = await this.contract.connect(ethersProvider.getSigner(creator)).functions.createFromQuad(creator, creator, 1, this.counter, this.counter);
    const receipt = await tx.wait();
    return {receipt, tokenId: receipt.events.find((v) => v.event === 'QuadsAdded').args[0]};
};
// ERC721Contract.prototype.burnERC721 = async function (from, tokenId) {
//     const tx = await this.contract.connect(ethersProvider.getSigner(from)).functions.burnFrom(from, tokenId);
//     return tx.wait();
// };

// runEstateTests({contractsStore: new EstateStore()});
// runMintingTestFromSale({contractsStore: new LandSaleEstateStore()});
runERC721tests(new ERC721Contract());
