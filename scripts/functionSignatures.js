const Web3 = require('web3');

function generateSigs(sigs) {
    const result = {}; 
    for(let sig of sigs) {
        result[sig] = Web3.utils.keccak256(sig).slice(0, 10); 
    }
    return result;
}
console.log(generateSigs([
    'onERC1155Received(address,address,uint256,uint256,bytes)',
    'onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)',
    'isERC1155TokenReceiver()',
]));
