//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

import {BaseERC721} from "../../../assetERC721/BaseERC721.sol";
import {IRootERC721} from "../../../common/interfaces/@maticnetwork/pos-portal/root/RootToken/IRootERC721.sol";

/// @title This contract is for AssetERC721 which can be minted by a minter role.
/// @dev This contract supports meta transactions.
/// @dev This contract is final, don't inherit from it.
contract AssetERC721 is BaseERC721, IRootERC721 {
    /// @notice fulfills the purpose of a constructor in upgradeable contracts
    function initialize(address trustedForwarder, address admin) public initializer {
        _setupRole(DEFAULT_ADMIN_ROLE, admin);
        _trustedForwarder = trustedForwarder;
        __ERC721_init("Sandbox's ASSETs ERC721", "ASSETERC721");
    }

    /// @dev Decode metadata obtained from L2 and attempt to set it for this `tokenId`
    /// @dev pos-portal default implementation
    function setTokenMetadata(uint256 tokenId, bytes memory data) external override {
        // TODO: role
        string memory uri = abi.decode(data, (string));
        // TODO: _setTokenURI(tokenId, uri);
    }
}
