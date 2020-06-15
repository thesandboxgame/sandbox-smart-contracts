pragma solidity 0.6.5;
pragma experimental ABIEncoderV2;


contract CatalystDataBase {
    function getValue(
        uint256 catalystId,
        uint32 gemId,
        uint96 seed,
        bytes32 blockHash,
        uint256 slotIndex
    ) external view returns (uint32) {
        uint16 minValue = _data[catalystId].minValue;
        uint16 maxValue = _data[catalystId].maxValue;
        uint16 range = maxValue - minValue;
        return minValue + uint16(uint256(keccak256(abi.encodePacked(gemId, seed, blockHash, slotIndex))) % range);
    }

    // override is not supported by prettier-plugin-solidity : https://github.com/prettier-solidity/prettier-plugin-solidity/issues/221
    // prettier-ignore
    function getMintData(uint256 catalystId) external view returns (uint8 rarity, uint16 maxGems, uint16 minQuantity, uint16 maxQuantity, uint256 sandFee) {
        rarity = _data[catalystId].rarity;
        maxGems = _data[catalystId].maxGems;
        minQuantity = _data[catalystId].minQuantity;
        maxQuantity = _data[catalystId].maxQuantity;
        sandFee = _data[catalystId].sandFee;
    }

    struct CatalystData {
        uint168 sandFee;
        uint16 minQuantity;
        uint16 maxQuantity;
        uint16 minValue;
        uint16 maxValue;
        uint8 rarity;
        uint16 maxGems;
    }

    mapping(uint256 => CatalystData) _data;
}
