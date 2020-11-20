//SPDX-License-Identifier: MIT
pragma solidity 0.7.1;
pragma experimental ABIEncoderV2;

import "../AssetAttributesRegistry.sol";
import "../ERC20Token.sol";

// TODO ERC20
abstract contract CatalystToken is ERC20Token {
    uint256 public immutable catalystId;
    uint8 internal immutable _maxGems;

    function getMaxGems() external view virtual returns (uint8);

    function getAttributes(uint256 assetId, AssetAttributesRegistry.GemEvent[] calldata events)
        external
        view
        virtual
        returns (uint32[] memory values);

    constructor(
        string memory name,
        string memory symbol,
        address admin,
        uint8 maxGems,
        uint256 _catalystId
    ) ERC20Token(name, symbol, admin) {
        _maxGems = maxGems;
        catalystId = _catalystId;
    }
}
