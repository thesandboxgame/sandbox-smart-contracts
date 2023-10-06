// SPDX-License-Identifier: MIT

pragma solidity 0.8.2;

import "../polygon/child/land/PolygonLandV2.sol";

contract MockPolygonLandV2 is PolygonLandV2 {
    /// @notice sets filter registry address deployed in test
    /// @param registry the address of the registry
    function setOperatorRegistry(address registry) external override {
        operatorFilterRegistry = IOperatorFilterRegistry(registry);
    }

    /// @notice sets Approvals with operator filterer check in case to test the transfer.
    /// @param operator address of the operator to be approved
    /// @param approved bool value denoting approved (true) or not Approved(false)
    function setApprovalForAllWithOutFilter(address operator, bool approved) external {
        super._setApprovalForAll(msg.sender, operator, approved);
    }

    /**
     * @notice Mint a new quad without a minter (aligned to a quad tree with size 1, 3, 6, 12 or 24 only)
     * @param user The recipient of the new quad
     * @param size The size of the new quad
     * @param x The top left x coordinate of the new quad
     * @param y The top left y coordinate of the new quad
     * @param data extra data to pass to the transfer
     */
    function mintQuad(
        address user,
        uint256 size,
        uint256 x,
        uint256 y,
        bytes memory data
    ) external override {
        _mintQuad(user, size, x, y, data);
    }

    /// @notice This function is used to register Land contract on the Operator Filterer Registry of Opensea.can only be called by admin.
    /// @dev used to register contract and subscribe to the subscriptionOrRegistrantToCopy's black list.
    /// @param subscriptionOrRegistrantToCopy registration address of the list to subscribe.
    /// @param subscribe bool to signify subscription "true"" or to copy the list "false".
    function registerFilterer(address subscriptionOrRegistrantToCopy, bool subscribe) external {
        _register(subscriptionOrRegistrantToCopy, subscribe);
    }
}
