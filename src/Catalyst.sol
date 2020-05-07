pragma solidity 0.6.5;

import "./BaseWithStorage/ERC20BaseToken.sol";
import "./Catalyst/CatalystToken.sol";


contract Catalyst is ERC20BaseToken, CatalystToken {
    
    uint64 immutable _quantity;
    uint8 immutable _rarity;
    uint16 immutable _maxGems;

    constructor(
        string memory name,
        string memory symbol,
        address admin,
        address beneficiary,
        uint256 amount,
        uint8 rarity,
        uint16 maxGems,
        uint16 quantity
    ) public ERC20BaseToken(name, symbol, admin, beneficiary, amount) {
        _quantity = quantity;
        _maxGems = maxGems;
        _rarity = rarity;
    }

    // override is not supported by prettier-plugin-solidity : https://github.com/prettier-solidity/prettier-plugin-solidity/issues/221
    // prettier-ignore
    function getValue(
        uint256 gemId,
        uint256 slotIndex,
        uint64 blockNumber
    ) external override view returns (uint32) {
        return 0;
        // TODO return BlockHashRegister.
    }

    // override is not supported by prettier-plugin-solidity : https://github.com/prettier-solidity/prettier-plugin-solidity/issues/221
    // prettier-ignore
    function getMintData() external override view returns (uint8 rarity, uint16 maxGems, uint64 quantity) {
        rarity = _rarity;
        maxGems = _maxGems;
        quantity = _quantity;
    }

    /// @notice returns the number of decimals for that token.
    /// @return the number of decimals.
    function decimals() external override pure returns (uint8) {
        return uint8(0);
    }
}
