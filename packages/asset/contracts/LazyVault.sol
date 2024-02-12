//SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ILazyVault} from "./interfaces/ILazyVault.sol";

/// @title LazyVault
/// @author The Sandbox
/// @notice Contract responsible for distributing tokens to creators and split recipients
contract LazyVault is ILazyVault, AccessControl {
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    bytes32 public constant DISTRIBUTOR_ROLE = keccak256("DISTRIBUTOR_ROLE");

    // address of the token that will be distributed by this vault
    address public vaultToken;
    // the value of each tier
    uint256[] public tierValues;

    // array of recipients and their split
    SplitRecipient[] public splitRecipients;

    /// @notice Sets the initial vault token, tier values, and split recipients
    /// @param _tierValues The initial tier values
    /// @param _initialRecipients The initial split recipients
    /// @param _vaultToken The vault token
    constructor(
        address _admin,
        address _manager,
        address _distributor,
        uint256[] memory _tierValues,
        SplitRecipient[] memory _initialRecipients,
        address _vaultToken
    ) {
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(MANAGER_ROLE, _manager);
        _grantRole(DISTRIBUTOR_ROLE, _distributor);
        _setSplitRecipients(_initialRecipients);
        _setTierValues(_tierValues);
        vaultToken = _vaultToken;
    }

    /// @notice Distributes tokens to creators and split recipients
    /// @dev Only the distributor role can distribute tokens
    /// @param tiers An array of tiers
    /// @param amounts An array of amounts
    /// @param creators An array of creators
    function distribute(
        uint8[] calldata tiers,
        uint256[] calldata amounts,
        address[] calldata creators
    ) external onlyRole(DISTRIBUTOR_ROLE) {
        validateDistributionInputs(tiers, amounts, creators);
        for (uint256 i = 0; i < tiers.length; i++) {
            processDistribution(tiers[i], amounts[i], creators[i]);
        }
    }

    /// @notice Validates the input arrays for distribution
    /// @param tiers An array of tiers
    /// @param amounts An array of amounts
    /// @param creators An array of creators
    function validateDistributionInputs(
        uint8[] memory tiers,
        uint256[] memory amounts,
        address[] memory creators
    ) internal view {
        require(tiers.length == amounts.length, "LazyVault: 1-Array mismatch");
        require(tiers.length == creators.length, "LazyVault: 2-Array mismatch");
        for (uint256 i = 0; i < tiers.length; i++) {
            require(tiers[i] > 0 && tiers[i] < tierValues.length, "LazyVault: Invalid tier");
        }
    }

    /// @notice Processes the distribution internally and does token transfers
    /// @param tier The tier of the distribution
    /// @param amount The amount to be distributed
    /// @param creator The creator's address
    function processDistribution(uint8 tier, uint256 amount, address creator) internal {
        uint256 totalValue = amount * tierValues[tier];
        uint256 creatorShare = totalValue;
        uint256[] memory splitValues = new uint256[](splitRecipients.length);
        address[] memory splitRecipientsAddresses = new address[](splitRecipients.length);
        for (uint256 j = 0; j < splitRecipients.length; j++) {
            SplitRecipient memory recipient = splitRecipients[j];
            splitRecipientsAddresses[j] = recipient.recipient;
            uint256 splitValue = (totalValue * recipient.split) / 10000;
            splitValues[j] = splitValue;
            SafeERC20.safeTransfer(IERC20(vaultToken), recipient.recipient, splitValue);
            creatorShare -= splitValue;
        }

        SafeERC20.safeTransfer(IERC20(vaultToken), creator, creatorShare);
        emit Distributed(tier, amount, totalValue, creator, splitValues, splitRecipientsAddresses, creatorShare);
    }

    /// @notice Withdraws tokens from the vault
    /// @dev Only the manager role can withdraw tokens
    /// @param amount The amount to withdraw
    function withdraw(uint256 amount, address recipient) external onlyRole(MANAGER_ROLE) {
        SafeERC20.safeTransfer(IERC20(vaultToken), recipient, amount);
        emit VaultWithdraw(_msgSender(), recipient, amount);
    }

    /// @notice Changes the split recipients and their split amount
    /// @dev Only the manager role can change the split recipients
    /// @param recipients The new split recipients
    function changeSplitRecipients(SplitRecipient[] calldata recipients) external onlyRole(MANAGER_ROLE) {
        _setSplitRecipients(recipients);
    }

    /// @dev Wipes the splitRecipients array and sets the new recipients
    /// @param recipients The new split recipients
    function _setSplitRecipients(SplitRecipient[] memory recipients) internal {
        delete splitRecipients;
        for (uint256 i = 0; i < recipients.length; i++) {
            SplitRecipient memory recipient = recipients[i];
            require(recipient.split <= 10000, "Split must be <= 10000");
            require(recipient.recipient != address(0), "Recipient cannot be 0x0");
            splitRecipients.push(recipient);
        }
        emit SplitRecipientsChanged(splitRecipients);
    }

    /// @notice Changes the values of the tiers
    /// @dev Only the manager role can change the tier values
    /// @param values The new values of the tiers
    function changeTierValues(uint256[] calldata values) external onlyRole(MANAGER_ROLE) {
        _setTierValues(values);
    }

    /// @dev Wipes the tierValues array and sets the new values
    /// @param values The new values of the tiers
    function _setTierValues(uint256[] memory values) internal {
        require(values[0] == 0, "LazyVault: Tier 0 must be 0");
        uint256[] memory oldValues = tierValues;
        delete tierValues;
        for (uint256 i = 0; i < values.length; i++) {
            tierValues.push(values[i]);
        }
        emit TierValuesChanged(oldValues, values);
    }
}
