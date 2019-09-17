const {
    encodeEventSignature,
} = require('./utils');

const AuthorizedOperatorEvent = encodeEventSignature('AuthorizedOperator(address,address)');
const RevokedOperatorEvent = encodeEventSignature('RevokedOperator(address,address)');
const BurnedEvent = encodeEventSignature('Burned(address,address,uint256,bytes,bytes)');
const MintedEvent = encodeEventSignature('Minted(address,address,uint256,bytes)');
const SentEvent = encodeEventSignature('Sent(address,address,address,uint256,bytes,bytes)');

function authorizeOperator(contract, operator, options) {
  return contract.methods.authorizeOperator(operator).send(options);
}

function revokeOperator(contract, operator, options) {
  return contract.methods.revokeOperator(operator).send(options);
}

function isOperatorFor(contract, operator, tokenHolder) {
  return contract.methods.isOperatorFor(operator, tokenHolder).call({from: operator});
}

function send(contract, to, amount, data, options) {
  return contract.methods.send(to, amount, data).send(options);
}

function operatorSend(contract, from, to, amount, data, operatorData, options) {
  return contract.methods.operatorSend(from, to, amount, data, operatorData).send(options);
}

module.exports = {
    AuthorizedOperatorEvent,
    RevokedOperatorEvent,
    BurnedEvent,
    MintedEvent,
    SentEvent,
    authorizeOperator,
    revokeOperator,
    isOperatorFor,
    send,
    operatorSend
}
