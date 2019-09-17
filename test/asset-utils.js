const BN = require('bn.js');
const {gas, encodeEventSignature, zeroAddress, decodeEvents} = require('./utils');

const TransferSingleEvent = encodeEventSignature('TransferSingle(address,address,address,uint256,uint256)');
const TransferBatchEvent = encodeEventSignature('TransferBatch(address,address,address,uint256[],uint256[])');
const URIEvent = encodeEventSignature('URI(string,uint256)');
const OfferClaimedEvent = encodeEventSignature('OfferClaimed(address,address,address,uint256,uint256[],uint256[],uint256[],bytes)');
const OfferCancelledEvent = encodeEventSignature('OfferCancelled(address,uint256)');
const ExtractionEvent = encodeEventSignature('Extraction(uint256,uint256)');

const emptyBytes = '0x';

async function getBatchIds(receipt) {
    for (const index of Object.keys(receipt.events)) {
        try {
            const returnValues = decodeEvents([
                {name: '_operator', type: 'address', indexed: true},
                {name: '_from', type: 'address', indexed: true},
                {name: '_to', type: 'address', indexed: true},
                {name: '_ids', type: 'uint256[]'},
                {name: '_values', type: 'uint256[]'},
            ], receipt, index);
            // console.log('INDEX: ' + index + ' ::::: ' + JSON.stringify(returnValues, null, '  '));
            if (returnValues._ids.length > 0) { // TODO better
                return returnValues._ids;
            }
        } catch (e) {}
    }
}

async function getSingleId(receipt) {
    for (const index of Object.keys(receipt.events)) {
        try {
            const returnValues = decodeEvents([
                {name: '_operator', type: 'address', indexed: true},
                {name: '_from', type: 'address', indexed: true},
                {name: '_to', type: 'address', indexed: true},
                {name: '_id', type: 'uint256'},
                {name: '_value', type: 'uint256'},
            ], receipt, index);
            return returnValues._id;
        } catch (e) {}
    }
}

function mint(contract, ipfsHash, supply, creator, fixedID = 0) {
    return contract.methods.mint(creator, 0, zeroAddress, fixedID, ipfsHash, supply, creator, emptyBytes).send({from: creator, gas});
}

function mintFor(contract, operator, ipfsHash, supply, rarity, creator, fixedID = 0) {
    return contract.methods.mintFor(creator, fixedID, ipfsHash, supply, rarity, creator).send({from: operator, gas});
}

async function mintAndReturnTokenId(contract, ipfsHash, supply, creator, fixedID = 0) {
    const receipt = await mint(contract, ipfsHash, supply, creator, fixedID);
    // console.log(JSON.stringify(receipt, null, '  '));
    return getSingleId(receipt);
}

async function mintForAndReturnTokenId(contract, operator, ipfsHash, supply, rarity, creator, fixedID = 0) {
    const receipt = await mintFor(contract, operator, ipfsHash, supply, rarity, creator, fixedID);
    // console.log(JSON.stringify(receipt, null, '  '));
    return getSingleId(receipt);
}

function mintMultiple(contract, uri, supplies, creator, fixedID = 0) {
    return contract.methods.mintMultiple(creator, 0, zeroAddress, fixedID, uri, supplies, creator, emptyBytes).send({from: creator, gas});
}

function mintMultipleFor(contract, operator, uri, supplies, rarities, creator, fixedID = 0) {
    let rarityPack = '0x';
    for (let i = 0; i < rarities.length; i += 4) {
        let byteV = 0;
        for (let j = i; j < rarities.length && j < i + 4; j++) {
            if (rarities[j] > 3) {
                throw new Error('rarity > 3');
            }
            const p = Math.pow(2, ((3 - (j - i)) * 2));
            byteV += (rarities[j] * p);
        }
        let s = byteV.toString(16);
        if (s.length === 1) {
            s = '0' + s;
        }
        rarityPack += s;
    }
    // console.log({rarityPack});
    return contract.methods.mintMultipleFor(creator, fixedID, uri, supplies, rarityPack, creator).send({from: operator, gas});
}

async function mintTokensIncludingNFTWithSameURI(contract, num, uri, supply, numNFTs, creator, fixedID = 0) {
    const supplies = [];
    for (let i = 0; i < num + numNFTs; i++) {
        if (i < num) {
            supplies.push(supply);
        } else {
            supplies.push(1);
        }
    }
    // console.log(supplies);
    const receipt = await mintMultiple(contract, uri, supplies, creator, fixedID);
    // console.log(JSON.stringify(receipt, null, '  '));
    return getBatchIds(receipt);
}

async function mintTokensWithSameURIAndSupply(contract, num, uri, supply, creator, fixedID = 0) {
    const supplies = supply instanceof Array ? supply : [];
    for (let i = 0; i < num; i++) {
        if (supplies.length < num) {
            supplies.push(supply);
        }
    }
    const receipt = await mintMultiple(contract, uri, supplies, creator, fixedID);
    return getBatchIds(receipt);
}

async function mintMultipleAndReturnTokenIds(contract, uri, supplies, creator, fixedID = 0) {
    const receipt = await mintMultiple(contract, uri, supplies, creator, fixedID);
    return getBatchIds(receipt);
}

async function mintMultipleForAndReturnTokenIds(contract, operator, uri, supplies, rarities, creator, fixedID = 0) {
    const receipt = await mintMultipleFor(contract, operator, uri, supplies, rarities, creator, fixedID);
    return getBatchIds(receipt);
}

async function mintOneAtATime(contract, uris, supplies, creator, fixedID = 0) {
    const receipts = [];
    for (let i = 0; i < uris.length; i++) {
        const uri = uris[i];
        const supply = supplies[i];
        const receipt = await contract.methods.mint(creator, 0, zeroAddress, fixedID + i, uri, supply, creator, emptyBytes).send({from: creator, gas});
        receipts.push(receipt);
    }
    return receipts;
}

// async function mintOneAtATimeAndReturnTokenIds(contract, uris, supplies, creator, fixedID = 0) {
//   const tokenIds = [];
//   for (let i = 0; i < uris.length; i++) {
//     const uri = uris[i];
//     const supply = supplies[i];
//     const tokenId = await mintAndReturnTokenId(contract, uri, supply, creator, fixedID + i);
//     tokenIds.push(tokenId);
//   }
//   return tokenIds;
// }

async function mintOneAtATimeAndReturnTokenIds(contract, uris, supplies, creator, fixedID = 0) {
    const receipts = await mintOneAtATime(contract, uris, supplies, creator, fixedID);
    const ids = [];
    for (const receipt of receipts) {
        ids.push(getSingleId(receipt));
    }
    return ids;
}

async function getEventsMatching(contract, receipt, sig) {
    return contract.getPastEvents(sig, {
        fromBlock: receipt.blockNumber,
        toBlock: receipt.blockNumber
    });
}

module.exports = {
    getBatchIds,
    getSingleId,
    mint,
    mintAndReturnTokenId,
    mintForAndReturnTokenId,
    mintMultiple,
    mintMultipleAndReturnTokenIds,
    mintMultipleForAndReturnTokenIds,
    mintOneAtATime,
    mintTokensWithSameURIAndSupply,
    mintOneAtATimeAndReturnTokenIds,
    getEventsMatching,
    mintTokensIncludingNFTWithSameURI,
    OfferClaimedEvent,
    OfferCancelledEvent,
    ExtractionEvent,
    generateTokenId(creator, supply, packSize, fixedID = 0, index = 0, nftIndex = 0) {
        // console.log('creator', new BN(creator.slice(2), 16).mul(new BN('1000000000000000000000000', 16)).toString(10));
        // TODO rarity
        return ((new BN(creator.slice(2), 16)).mul(new BN('1000000000000000000000000', 16)))
            .add((supply === 1) ? new BN('800000000000000000000000', 16) : new BN(0))
            .add(new BN(nftIndex).mul(new BN('8000000000000000', 16)))
            .add(new BN(fixedID).mul(new BN('8000', 16)))
            .add(new BN(index)).toString(10);
    },
    // generateTokenId(creator, supply, fixedID=0, index=0, nftIndex = 0) {

    //   return ((new BN(creator.slice(2), 16)).mul(new BN('1000000000000000000000000', 16)))
    //     .add(supply == 1 ? (new BN(nftIndex)).mul(new BN('100000000000000', 16)) : new BN('800000000000000000000000', 16))
    //     .add(new BN(fixedID)).add(new BN(index)).toString(10)
    // },
    old_generateTokenId(creator, supply, fixedID = 0, index = 0, nftIndex = 0) {
        return ((new BN(creator.slice(2), 16)).mul(new BN('1000000000000000000000000', 16)))
            .add(supply == 1 ? (new BN(nftIndex)).mul(new BN('100000000000000', 16)) : new BN('800000000000000000000000', 16).add(new BN(supply).mul(new BN('100000000000000', 16))))
            .add(new BN(fixedID)).add(new BN(index)).toString(10);
    },
};
