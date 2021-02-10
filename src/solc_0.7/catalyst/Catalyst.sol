//SPDX-License-Identifier: MIT
pragma solidity 0.7.5;
pragma experimental ABIEncoderV2;

import "./AssetAttributesRegistry.sol";
import "./ERC20Token.sol";
import "./IAttributes.sol";

contract Catalyst is ERC20Token, IAttributes {
    uint16 public immutable catalystId;
    uint8 internal immutable _maxGems;

    IAttributes internal _attributes;

    constructor(
        string memory name,
        string memory symbol,
        address admin,
        uint8 maxGems,
        uint16 _catalystId,
        IAttributes attributes,
        address operator
    ) ERC20Token(name, symbol, admin, operator) {
        _maxGems = maxGems;
        catalystId = _catalystId;
        _attributes = attributes;
    }

    function changeAttributes(IAttributes attributes) external onlyAdmin {
        _attributes = attributes;
    }

    function getMaxGems() external view returns (uint8) {
        return _maxGems;
    }

    function getAttributes(uint256 assetId, AssetAttributesRegistry.GemEvent[] calldata events)
        external
        view
        override
        returns (uint32[] memory values)
    {
        return _attributes.getAttributes(assetId, events);
    }
}
