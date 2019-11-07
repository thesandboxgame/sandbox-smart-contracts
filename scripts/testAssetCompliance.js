const rocketh = require('rocketh');
const {
    call,
    rawCall
} = rocketh;

const assetAddress = '0x266003afa9976d72565cac0bd840c276b01ae34f';
const zeroAddress = '0x0000000000000000000000000000000000000000';
const owner = '0x61c461ecc993aadeb7e4b47e96d1b8cc37314b20';
const tokenId = '44221324190444972628403853229966997983936414854632412290085204005353951338500';

(async () => {
    const sender = rocketh.accounts[0];
    const ownerOf = await call({from: sender}, 'Asset', 'ownerOf', tokenId);
    const balanceOf = await call({from: sender}, 'Asset', 'balanceOf(address)', owner);
    const balanceOfToken = await call({from: sender}, 'Asset', 'balanceOf(address,uint256)', owner, tokenId);
    const balanceOfZeroAddressTokenId = await call({from: sender}, 'Asset', 'balanceOf(address,uint256)', zeroAddress, tokenId);

    console.log({ownerOf, balanceOf, balanceOfToken, balanceOfZeroAddressTokenId});

    const balanceOfZeroData = await call({from: sender, outputTx: true}, 'Asset', 'balanceOf(address)', zeroAddress);
    console.log({balanceOfZeroData});

    const result = await rawCall(assetAddress, '0x70a082310000000000000000000000000000000000000000000000000000000000000000');
    console.log({result});

    const balanceOfZeroAddressTokenIdData = await call({from: sender, outputTx: true}, 'Asset', 'balanceOf(address,uint256)', zeroAddress, tokenId);
    console.log({balanceOfZeroAddressTokenIdData});

    const result2 = await rawCall(assetAddress, balanceOfZeroAddressTokenIdData.data);
    console.log({result2});

    try {
        await call({from: sender}, 'Asset', 'balanceOf(address)', zeroAddress);
    } catch (e) {
        console.log('throw on balanceOf(zeroAddress) ', e);
    }
})();
