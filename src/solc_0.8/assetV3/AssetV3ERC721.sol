//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

import {AssetBaseERC721} from "./AssetBaseERC721.sol";

// solhint-disable-next-line no-empty-blocks
contract AssetV3ERC721 is AssetBaseERC721 {
    /// @notice fulfills the purpose of a constructor in upgradeable contracts
    function initialize(
        address trustedForwarder,
        address admin, // contract admin
        address predicate,
        uint8 chainIndex
    ) external {
        initV3(trustedForwarder, admin, predicate, chainIndex);
    }
}
