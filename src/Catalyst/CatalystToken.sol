pragma solidity 0.6.5;
pragma experimental ABIEncoderV2;

import "../Interfaces/ERC20Extended.sol";


interface CatalystToken is ERC20Extended {
    function getValue(
        uint32 gemId,
        uint96 seed,
        bytes32 blockHash,
        uint256 slotIndex
    ) external view returns (uint32);

    function getMintData()
        external
        view
        returns (
            uint8 rarity,
            uint16 maxGems,
            uint16 minQuantity,
            uint16 maxQuantity,
            uint256 sandFee
        );
}
