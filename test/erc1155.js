const {
    encodeEventSignature,
} = require('./utils');

const TransferSingleEvent = encodeEventSignature('TransferSingle(address,address,address,uint256,uint256)');
const TransferBatchEvent = encodeEventSignature('TransferBatch(address,address,address,uint256[],uint256[])');
const URIEvent = encodeEventSignature('URI(string,uint256)');
const ApprovalForAllEvent = encodeEventSignature('ApprovalForAll(address,address,bool)');


module.exports = {
    TransferSingleEvent,
    URIEvent,
    TransferBatchEvent,
    ApprovalForAllEvent
}