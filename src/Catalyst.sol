pragma solidity 0.6.5;
pragma experimental ABIEncoderV2;

import "./BaseWithStorage/ERC20BaseToken.sol";
import "./Catalyst/CatalystToken.sol";


contract Catalyst is ERC20BaseToken, CatalystToken {
    
    uint64 immutable _quantity;
    uint8 immutable _rarity;
    uint16 immutable _maxGems;
    address _minter;

    event Minter(address newMinter);

    constructor(
        string memory name,
        string memory symbol,
        address admin,
        address minter,
        uint8 rarity,
        uint16 maxGems,
        uint16 quantity
    ) public ERC20BaseToken(name, symbol, admin) {
        _quantity = quantity;
        _maxGems = maxGems;
        _rarity = rarity;
        _minter = minter;
    }
    
    function getMinter() external view returns (address) {
        return _minter;
    }
    function setMinter(address newMinter) external {
        require(msg.sender == _admin, "only admin allowed");
        _minter = newMinter;
        emit Minter(newMinter);
    }

    function mint(address to, uint256 amount) external {
        require(msg.sender == _minter, "only minter allowed to mint");
        _mint(to, amount);
    }

    // override is not supported by prettier-plugin-solidity : https://github.com/prettier-solidity/prettier-plugin-solidity/issues/221
    // prettier-ignore
    function getAttributes(Gem[] calldata gems) external override view returns(Attribute[] memory) {
        Attribute[] memory attributes = new Attribute[](gems.length);
        for (uint256 i = 0; i < attributes.length; i++) {
            Gem memory gem = gems[i];
            attributes[i] = Attribute({
                gemId: gem.id,
                value: _getValue(gem.id, i, gem.blockNumber)
            });
        }
        return attributes;
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

    // /////////////////////// INTERNALS /////////////////////////////////////////
    function _getValue(uint32 gemId, uint256 slotIndex, uint64 blockNumber) internal view returns(uint32) {
        // TODO
        return 25;
    }
}
