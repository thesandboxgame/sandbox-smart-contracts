pragma solidity 0.6.5;
pragma experimental ABIEncoderV2;

import "./BaseWithStorage/ERC20BaseToken.sol";
import "./Catalyst/CatalystToken.sol";


contract Catalyst is ERC20BaseToken, CatalystToken {
    uint256 immutable _sandFee;
    uint16 immutable _minQuantity;
    uint16 immutable _maxQuantity;
    uint16 immutable _minValue;
    uint16 immutable _maxValue;
    uint8 immutable _rarity;
    uint16 immutable _maxGems;
    address _minter;

    event Minter(address newMinter);

    constructor(
        string memory name,
        string memory symbol,
        address admin,
        address minter,
        uint256 sandFee,
        uint8 rarity,
        uint16 maxGems,
        uint16[] memory quantityRange,
        uint16[] memory valueRange
    ) public ERC20BaseToken(name, symbol, admin) {
        require(quantityRange[1] >= quantityRange[0], "invalid quantity range");
        require(valueRange[1] >= valueRange[0], "invalid value range");
        _sandFee = sandFee;
        _minQuantity = quantityRange[0];
        _maxQuantity = quantityRange[1];
        _minValue = valueRange[0];
        _maxValue = valueRange[1];
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
                blockNumber: gem.blockNumber,
                slotIndex: uint32(i),
                minValue: _minValue,
                maxValue: _maxValue
            });
        }
        return attributes;
    }

    /// @notice compute value given a blockHash, the blockHash need to correspon to the blockNumber associated with the gem
    function getValue(
        uint32 gemId,
        uint256 slotIndex,
        bytes32 blockHash
    ) external view returns (uint32) {
        uint16 range = _maxValue - _minValue;
        return _minValue + uint16(uint256(keccak256(abi.encode(blockHash, gemId, slotIndex))) % range);
    }

    // override is not supported by prettier-plugin-solidity : https://github.com/prettier-solidity/prettier-plugin-solidity/issues/221
    // prettier-ignore
    function getMintData() external override view returns (uint8 rarity, uint16 maxGems, uint16 minQuantity, uint16 maxQuantity, uint256 sandFee) {
        rarity = _rarity;
        maxGems = _maxGems;
        minQuantity = _minQuantity;
        maxQuantity = _maxQuantity;
        sandFee = _sandFee;
    }

    /// @notice returns the number of decimals for that token.
    /// @return the number of decimals.
    function decimals() external override pure returns (uint8) {
        return uint8(0);
    }
}
