const {
    encodeEventSignature,
} = require('./utils');

const TransferEvent = encodeEventSignature('Transfer(address,address,uint256)');
const ApprovalEvent = encodeEventSignature('Approval(address,address,uint256)');
const ApprovalForAllEvent = encodeEventSignature('ApprovalForAll(address,address,bool)');

module.exports = {
    TransferEvent,
    ApprovalEvent,
    ApprovalForAllEvent,
}