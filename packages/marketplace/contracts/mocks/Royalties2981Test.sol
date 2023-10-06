// SPDX-License-Identifier: MIT

pragma solidity 0.8.21;

import {IERC2981} from "@openzeppelin/contracts/interfaces/IERC2981.sol";

contract Royalties2981Test {
    IERC2981 internal immutable ROYALTIES;

    constructor(IERC2981 _royalties) {
        ROYALTIES = _royalties;
    }

    event Test(address account, uint256 value);

    function royaltyInfoTest(uint256 _tokenId, uint256 _salePrice) public {
        (address account, uint256 value) = ROYALTIES.royaltyInfo(_tokenId, _salePrice);
        emit Test(account, value);
    }
}
