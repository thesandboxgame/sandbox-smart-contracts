const rocketh = require('rocketh');
const {getDeployedContract} = require('../../lib');
const {runERC20Tests} = require('../erc20_tests');
const {runERC1155tests} = require('./erc1155_tests');

const {
    orbsBeneficiary,
} = rocketh.namedAccounts;

async function deployORB(name) {
    await rocketh.runStages();
    return getDeployedContract(name);
}

runERC20Tests('RareORB', () => deployORB('RareORB'), {
    testBurn: false,
    initialOwner: orbsBeneficiary,
    totalSupply: 1000000000
});

runERC20Tests('EpicORB', () => deployORB('EpicORB'), {
    testBurn: false,
    initialOwner: orbsBeneficiary,
    totalSupply: 1000000
});

runERC20Tests('LegendaryORB', () => deployORB('LegendaryORB'), {
    testBurn: false,
    initialOwner: orbsBeneficiary,
    totalSupply: 1000
});

function ERC1155Contract() {
    this.counter = 0;
    this.contract = null;
    this.mintContract = null;
}
ERC1155Contract.prototype.resetContract = async function () {
    await rocketh.runStages();
    this.contract = getDeployedContract('ORBCore');
    this.mintContract = this.contract;
    return this.contract;
};
ERC1155Contract.prototype.getInitialTokens = async function () {
    return [
        {id: 0, supply: 1000000000},
        {id: 1, supply: 1000000},
        {id: 2, supply: 1000},
    ];
};
runERC1155tests('ORBS', new ERC1155Contract());
