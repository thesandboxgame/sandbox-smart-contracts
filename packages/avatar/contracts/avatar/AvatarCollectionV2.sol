// SPDX-License-Identifier: MIT

pragma solidity 0.8.15;

import {AvatarCollection} from "./AvatarCollection.sol";

/**
 * @title AvatarCollectionV2
 * @author qed.team x The Sandbox
 * @notice ERC721 contract for future Avatar collections.
 *         Is expected to be initialize via {CollectionFactory} or other similar factories
 * @dev Upgraded to include a setter for trusted forwarder for meta transactions and fix access control transfer issues
 *
 */
contract AvatarCollectionV2 is AvatarCollection {
    /// @notice Set a new trusted forwarder address, limited to ADMIN_ROLE only
    /// @dev Change the address of the trusted forwarder for meta-TX
    /// @param trustedForwarder The new trustedForwarder
    function setTrustedForwarder(address trustedForwarder) external onlyRole(ADMIN_ROLE) {
        require(_isContract(trustedForwarder), "AvatarCollection: Bad forwarder");
        _trustedForwarder = trustedForwarder;
    }
}
