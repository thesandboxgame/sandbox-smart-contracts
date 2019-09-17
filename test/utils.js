const Web3 = require('web3');

const assert = require('assert');
const rocketh = require('rocketh');

const web3 = new Web3();
web3.setProvider(rocketh.ethereum);

// const truffleConfig = require('../../truffle-config.js');

const gas = 4000000;
const deployGas = 6721975; // 6000000;

function getEventsFromReceipt(contract, sig, receipt) {
  return contract.getPastEvents(sig, {
    fromBlock: receipt.blockNumber,
    toBlock: receipt.blockNumber
  });
}

function getPastEvents(contract, sig, options) {
  return contract.getPastEvents(sig, options || {
    fromBlock: 0,
    toBlock: 'latest'
  });
}


function tx(contract, functionName, options, ...args) {
  // console.log(functionName, ...args);
  return contract.methods[functionName](...args).send(options);
}

function call(contract, functionName, options, ...args) {
  return contract.methods[functionName](...args).call(options);
}

function encodeCall(contract, functionName, ...args) {
  return contract.methods[functionName](...args).encodeABI();
}

async function deployProxyContract(from, contract, initData) {
  const adminUpgradeabilityProxy = await deployContract(from, 'AdminUpgradeabilityProxy', from, contract.options.address, initData);
  // const AdminUpgradeabilityProxyInfo = rocketh.contractInfo('AdminUpgradeabilityProxy');
  const matchingEvents = await adminUpgradeabilityProxy.getPastEvents('AdminChanged');
  const adminAddress = matchingEvents[0].returnValues.newAdmin;
  const ProxyAdminContractInfo = rocketh.contractInfo('ProxyAdmin');
  const admin = new web3.eth.Contract(ProxyAdminContractInfo.abi, adminAddress);
  const proxy = new web3.eth.Contract(contract.options.jsonInterface, adminUpgradeabilityProxy.options.address);
  // const proxyAsAdmin = new web3.eth.Contract(AdminUpgradeabilityProxyInfo.abi, adminUpgradeabilityProxy.options.address)
  return {
    proxy,
    admin,
    proxyAsAdmin: adminUpgradeabilityProxy
  };
}

function deployContract(from, contractName, ...args) {
  const ContractInfo = rocketh.contractInfo(contractName);
  const Contract = new web3.eth.Contract(ContractInfo.abi, {data: '0x' + ContractInfo.evm.bytecode.object});
  return Contract.deploy({arguments: args}).send({from, gas: deployGas});
}

module.exports = {
  web3,
  tx,
  encodeCall,
  call,
  deployContract,
  deployProxyContract,
  encodeEventSignature: web3.eth.abi.encodeEventSignature,

  soliditySha3: web3.utils.soliditySha3,
  ethSign: web3.eth.sign,
  sendTransaction: web3.eth.sendTransaction,
  instantiateContract: function() { return new web3.eth.Contract(...arguments);},
  revertToSnapshot: (id) => {
    return new Promise((resolve, reject) => {
      // console.log('reverting to snapshot ' + id + '...');
      web3.currentProvider.sendAsync({
        method: 'evm_revert',
        params: [id],
        jsonrpc: '2.0',
        id: '2'
      }, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  },

  saveSnapshot: () => {
    return new Promise((resolve, reject) => {
      // console.log('snapshot...');
      web3.currentProvider.sendAsync({
        method: 'evm_snapshot',
        params: [],
        jsonrpc: '2.0',
        id: '2'
      }, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result.result);
        }
      });
    });
  },

  increaseTime: (timeInSeconds) => {
    return new Promise((resolve, reject) => {
      web3.currentProvider.sendAsync({
        method: 'evm_increaseTime',
        params: [timeInSeconds],
        jsonrpc: '2.0',
        id: '2'
      }, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  },

  mine: () => {
    return new Promise((resolve, reject) => {
      console.log('mining...');
      web3.currentProvider.sendAsync({
        method: 'evm_mine',
        params: [],
        jsonrpc: '2.0',
        id: '2'
      }, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  },

  stopAutoMine: () => {
    return new Promise((resolve, reject) => {
      web3.currentProvider.sendAsync({
        method: 'miner_stop',
        params: [],
        jsonrpc: '2.0',
        id: '3'
      }, (err, result) => {
        if (err) {
          console.log('error while calling miner_stop', err);
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  },

  // Took this from https://github.com/OpenZeppelin/zeppelin-solidity/blob/master/test/helpers/expectThrow.js
  // Doesn't seem to work any more :(
  // Changing to use the invalid opcode error instead works
  expectThrow: async (promise) => {
    let receipt;
    try {
      receipt = await promise;
    } catch (error) {
      // TODO: Check jump destination to destinguish between a throw
      //       and an actual invalid jump.
      const invalidOpcode = error.message.search('invalid opcode') >= 0;
      // TODO: When we contract A calls contract B, and B throws, instead
      //       of an 'invalid jump', we get an 'out of gas' error. How do
      //       we distinguish this from an actual out of gas event? (The
      //       ganache log actually show an 'invalid jump' event.)
      const outOfGas = error.message.search('out of gas') >= 0;
      const revert = error.message.search('revert') >= 0;
      const status0x0 = error.message.search('status": "0x0"') >= 0 ||  error.message.search('status":"0x0"') >= 0; // TODO better
      assert(
        invalidOpcode || outOfGas || revert || status0x0,
        'Expected throw, got \'' + error + '\' instead',
      );
      return;
    }
    if(receipt.status == "0x0") {
      return;
    }
    assert.fail('Expected throw not received');
  },
  toHex: web3.utils.toHex,
  padLeft: web3.utils.padLeft,
  toWei: web3.utils.toWei,
  getBalance: web3.eth.getBalance,
  getBlockNumber: web3.eth.getBlockNumber,
  getBlock: web3.eth.getBlock,
  gas,
  deployGas,
  toChecksumAddress: Web3.utils.toChecksumAddress,
  getEventsFromReceipt,
  getPastEvents,
  zeroAddress: '0x0000000000000000000000000000000000000000',
  emptyBytes:'0x',
  decodeEvents: (inputs, receipt, logIndex) => {
    const event = receipt.events["" + logIndex];
    return web3.eth.abi.decodeLog(inputs, event.raw.data, event.raw.topics);
  },
  decodeLogs: (inputs, receipt, logIndex) => {
    const log = receipt.logs[logIndex];
    return web3.eth.abi.decodeLog(inputs, log.data, log.topics);
  },
  sendSignedTransaction(txData, to, privateKey) {
    const data = txData instanceof Object ? txData.encodeABI() : txData;
    const privateKeyHex = privateKey instanceof Buffer ? ('0x' + privateKey.toString('hex')) : privateKey;
    return web3.eth.accounts.signTransaction({data, to, gas}, privateKeyHex).then((signedTx) => {
      return web3.eth.sendSignedTransaction(signedTx.rawTransaction);
    });
  },
  encodeParameters: web3.eth.abi.encodeParameters.bind(web3.eth.abi)
  // (types, params) => {
  //   return web3.eth.abi.encodeParameters({inputs:types.map(v => {type:v})},params);
  // }
};
