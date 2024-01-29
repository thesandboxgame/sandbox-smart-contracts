//SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ILazyVault} from "./interfaces/ILazyVault.sol";
import "hardhat/console.sol";

contract LazyVault is ILazyVault, AccessControl {
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    // address of the token that will be distributed by this vault
    address public vaultToken;
    // the value of each tier
    uint256[] public tierValues;

    // array of recipients and their split
    SplitRecipient[] public splitRecipients;

    constructor(uint256[] memory _tierValues, SplitRecipient[] memory _initialRecipients, address _vaultToken) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MANAGER_ROLE, msg.sender);
        tierValues = _tierValues;
        vaultToken = _vaultToken;
        _setSplitRecipients(_initialRecipients);
    }

    /// @notice Distributes tokens to the creators and shares a specified percentage with the split recipients
    /// @dev The order of items in the tiers, amounts, and creators arrays must be preserved
    /// @param tiers An array of tiers
    /// @param amounts An array of amounts
    /// @param creators An array of creators
    function distribute(uint8[] calldata tiers, uint256[] calldata amounts, address[] calldata creators) external {
        require(tiers.length == amounts.length, "Tiers and amounts length mismatch");
        require(tiers.length == creators.length, "Tiers and creators length mismatch");

        for (uint256 i = 0; i < tiers.length; i++) {
            uint256 totalValue = amounts[i] * tierValues[tiers[i]];
            uint256 creatorShare = totalValue;
            uint256[] memory splitValues = new uint256[](splitRecipients.length);

            for (uint256 j = 0; j < splitRecipients.length; j++) {
                SplitRecipient memory recipient = splitRecipients[j];
                uint256 splitValue = (totalValue * recipient.split) / 10000;
                splitValues[j] = splitValue;
                IERC20(vaultToken).transfer(recipient.recipient, splitValue);
                creatorShare -= splitValue;
            }

            emit Distributed(
                tiers[i],
                amounts[i],
                tierValues[tiers[i]],
                creators[i],
                splitValues,
                splitRecipients,
                creatorShare
            );
        }
    }

    /// @notice Withdraws tokens from the vault
    /// @dev Only the manager role can withdraw tokens
    /// @param amount The amount to withdraw
    function withdraw(uint256 amount) external onlyRole(MANAGER_ROLE) {
        IERC20(vaultToken).transfer(_msgSender(), amount);
        emit VaultWithdraw(_msgSender(), amount);
    }

    /// @notice Changes the split recipients and their split amount
    /// @dev Only the manager role can change the split recipients
    /// @param recipients The new split recipients
    function changeSplitRecipients(SplitRecipient[] calldata recipients) external onlyRole(MANAGER_ROLE) {
        _setSplitRecipients(recipients);
    }

    /// @dev Resizes the splitRecipients array and sets the new recipients
    /// @param recipients The new split recipients
    function _setSplitRecipients(SplitRecipient[] memory recipients) internal {
        SplitRecipient[] memory newRecipients = new SplitRecipient[](recipients.length);
        for (uint256 i = 0; i < recipients.length; i++) {
            SplitRecipient memory recipient = recipients[i];
            require(recipient.split <= 10000, "Split must be <= 10000");
            require(recipient.recipient != address(0), "Recipient cannot be 0x0");
            newRecipients[i] = recipient;
        }

        // Resize splitRecipients to match the size of newRecipients
        if (splitRecipients.length != newRecipients.length) {
            // Reduce the length of splitRecipients if it's longer than newRecipients
            for (uint256 i = newRecipients.length; i < splitRecipients.length; i++) {
                splitRecipients.pop();
            }
            // Extend splitRecipients if it's shorter than newRecipients
            while (splitRecipients.length < newRecipients.length) {
                splitRecipients.push();
            }
        }

        // Now copy elements from newRecipients to splitRecipients
        for (uint256 i = 0; i < newRecipients.length; i++) {
            splitRecipients[i] = newRecipients[i];
        }
    }

    /// @notice Changes the value of a specific tier
    /// @dev Only the manager role can change the tier values
    /// @param tier The tier to change
    /// @param value The new value of the tier
    function changeTierValue(uint8 tier, uint256 value) external onlyRole(MANAGER_ROLE) {
        require(tier < tierValues.length, "Tier out of bounds");
        tierValues[tier] = value;
    }
}
