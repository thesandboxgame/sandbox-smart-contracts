//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

import {AvatarBase} from "../../../avatar/AvatarBase.sol";
import {Upgradeable} from "../../../common/BaseWithStorage/Upgradeable.sol";

/// @title This contract is a erc 721 compatible NFT token that represents an avatar and can be minted by a minter role.
/// @dev This contract support meta transactions.
/// @dev Avatar will be minted only on L2 (using the sale contract) and can be transferred to L1 but not minted on L1.
/// @dev This contract is final, don't inherit form it.
contract PolygonAvatar is AvatarBase, Upgradeable {
    function initialize(
        string memory name_,
        string memory symbol_,
        string memory baseTokenURI_,
        address trustedForwarder_,
        address defaultAdmin_
    ) external initializer {
        __Context_init_unchained();
        __ERC165_init_unchained();
        __AccessControl_init_unchained();
        __AvatarBase_init_unchained(defaultAdmin_, baseTokenURI_);
        __ERC721_init_unchained(name_, symbol_);
        __ERC2771Handler_initialize(trustedForwarder_);
    }
}
