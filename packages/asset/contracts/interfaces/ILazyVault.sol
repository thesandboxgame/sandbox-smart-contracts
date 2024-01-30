//SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

interface ILazyVault {
    struct SplitRecipient {
        address recipient;
        uint256 split;
    }

    event Distributed(
        uint8 tier,
        uint256 amount,
        uint256 value,
        address creator,
        uint256[] splitValues,
        SplitRecipient[] splitRecipients,
        uint256 creatorShare
    );

    event VaultWithdraw(address indexed manager, uint256 amount);

    event TierValuesChanged(uint256[] oldValues, uint256[] newValues);

    event SplitRecipientsChanged(SplitRecipient[] recipients);

    function distribute(
        uint8[] calldata tiers,
        uint256[] calldata amounts,
        address[] calldata creators
    ) external;
}
