// SPDX-License-Identifier: MIT

pragma solidity 0.8.23;

import {IERC2981} from "@openzeppelin/contracts/interfaces/IERC2981.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IRoyaltiesProvider} from "../interfaces/IRoyaltiesProvider.sol";
import {RoyaltiesRegistry} from "../RoyaltiesRegistry.sol";

/// @title Royalties2981ImplMock Contract
/// @dev serves as an implementation of the IERC2981
contract Royalties2981ImplMock is RoyaltiesRegistry, IERC2981 {
    uint256 public royaltiesBasePoint;

    mapping(uint256 => address) public royaltiesReceiver;

    function royaltyInfo(
        uint256 _tokenId,
        uint256 _salePrice
    ) external view override returns (address receiver, uint256 royaltyAmount) {
        receiver = royaltiesReceiver[_tokenId];
        royaltyAmount = (_salePrice * royaltiesBasePoint) / 10000;
    }

    function calculateRoyaltiesTest(
        address payable to,
        uint256 amount
    ) external pure returns (IRoyaltiesProvider.Part[] memory) {
        return _calculateRoyalties(to, amount);
    }

    function setRoyalties(uint256 _value) public {
        royaltiesBasePoint = _value;
    }

    function setRoyaltiesReceiver(uint256 _tokenId, address _receiver) public {
        royaltiesReceiver[_tokenId] = _receiver;
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(IERC165, RoyaltiesRegistry) returns (bool) {
        return interfaceId == type(IERC2981).interfaceId || super.supportsInterface(interfaceId);
    }
}
