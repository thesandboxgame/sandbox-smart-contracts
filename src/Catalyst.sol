pragma solidity 0.6.5;
pragma experimental ABIEncoderV2;

import "./Catalyst/CatalystToken.sol";
import "./BaseWithStorage/MintableERC1155Token.sol";


contract Catalyst is MintableERC1155Token, CatalystToken {
    function getValue(
        uint256 catalystId,
        uint32 gemId,
        uint96 seed,
        bytes32 blockHash,
        uint256 slotIndex
    ) external override view returns (uint32) {
        uint16 minValue = _data[catalystId].minValue;
        uint16 maxValue = _data[catalystId].maxValue;
        uint16 range = maxValue - minValue;
        return minValue + uint16(uint256(keccak256(abi.encodePacked(gemId, seed, blockHash, slotIndex))) % range);
    }

    // override is not supported by prettier-plugin-solidity : https://github.com/prettier-solidity/prettier-plugin-solidity/issues/221
    // prettier-ignore
    function getMintData(uint256 catalystId) external override view returns (uint8 rarity, uint16 maxGems, uint16 minQuantity, uint16 maxQuantity, uint256 sandFee) {
        rarity = _data[catalystId].rarity;
        maxGems = _data[catalystId].maxGems;
        minQuantity = _data[catalystId].minQuantity;
        maxQuantity = _data[catalystId].maxQuantity;
        sandFee = _data[catalystId].sandFee;
    }

    // TODO metadata + EIP-165

    // //////////////////////////// ADMIN ///////////////////////////////////////////

    struct CatalystData {
        uint168 sandFee;
        uint16 minQuantity;
        uint16 maxQuantity;
        uint16 minValue;
        uint16 maxValue;
        uint8 rarity;
        uint16 maxGems;
    }

    function addCatalysts(string[] memory names, CatalystData[] memory data) public {
        require(msg.sender == _admin, "only admin");
        require(names.length == data.length, "inconsistent length");
        uint256 count = _count;
        for (uint256 i = 0; i < data.length; i++) {
            _names[count + i] = names[i];
            _data[count + i] = data[i];
        }
        _count = count + data.length;
    }

    function addCatalyst(string memory name, CatalystData memory data) public {
        require(msg.sender == _admin, "only admin");
        uint256 count = _count;
        _names[count] = name;
        _data[count] = data;
        _count++;

        // TODO event ?
    }

    // /////////////////////
    uint256 _count;
    mapping(uint256 => CatalystData) _data;
    mapping(uint256 => string) _names;

    // ////////////////////////
    constructor(
        address metaTransactionContract,
        address admin,
        address initialMinter
    ) public MintableERC1155Token(metaTransactionContract, admin, initialMinter) {}
}
