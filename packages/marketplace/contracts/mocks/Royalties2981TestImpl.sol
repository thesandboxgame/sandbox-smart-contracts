// SPDX-License-Identifier: MIT

pragma solidity 0.8.21;

import {IERC2981} from "@openzeppelin/contracts/interfaces/IERC2981.sol";
import {LibRoyalties2981} from "../royalties/LibRoyalties2981.sol";
import {LibPart} from "../lib-part/LibPart.sol";

contract Royalties2981TestImpl is IERC2981 {
    uint256 public royaltiesBasePoint;

    mapping(uint256 => address) public royaltiesReceiver;

    function setRoyalties(uint256 _value) public {
        royaltiesBasePoint = _value;
    }

    function setRoyaltiesReceiver(uint256 _tokenId, address _receiver) public {
        royaltiesReceiver[_tokenId] = _receiver;
    }

    function royaltyInfo(
        uint256 _tokenId,
        uint256 _salePrice
    ) external view override returns (address receiver, uint256 royaltyAmount) {
        receiver = royaltiesReceiver[_tokenId];
        royaltyAmount = (_salePrice * royaltiesBasePoint) / 10000;
    }

    function calculateRoyaltiesTest(address payable to, uint96 amount) external pure returns (LibPart.Part[] memory) {
        return LibRoyalties2981.calculateRoyalties(to, amount);
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == type(IERC2981).interfaceId;
    }
}
