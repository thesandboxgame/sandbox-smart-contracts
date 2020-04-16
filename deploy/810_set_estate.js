const {guard} = require('../lib');
module.exports = async ({deployments}) => {
  const {call, sendTxAndWait, log} = deployments;

  const land = await deployments.get('Land');
  if (!land) {
    throw new Error('no Land contract deployed');
  }

  const estate = await deployments.get('Estate');
  if (!estate) {
    throw new Error('no Estate contract deployed');
  }

  const isSuperOperator = await call('Land', 'isSuperOperator', estate.address);
  if (!isSuperOperator) {
    log('setting NativeMetaTransactionProcessor as super operator');
    const currentLandAdmin = await call('Land', 'getAdmin');
    await sendTxAndWait({from: currentLandAdmin, gas: 100000, skipError: true}, 'Land', 'setSuperOperator', estate.address, true);
  }
};

module.exports.skip = guard(['1', '4', '314159']); // TODO remove
module.exports.tags = ['Estate'];