//SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

contract RoyaltyManagerMock {
    address payable public commonRecipient;
    mapping(address => uint16) public contractRoyalty;

    constructor(address payable _commonRecipient) {
        commonRecipient = _commonRecipient;
    }
    /// @notice returns the commonRecipient and EIP2981 royalty bps
    /// @return recipient address of common royalty recipient
    /// @return royaltySplit contract EIP2981 royalty bps
    function getRoyaltyInfo() external view returns (address payable recipient, uint16 royaltySplit) {
        return (commonRecipient, contractRoyalty[msg.sender]);
    }

    /// @notice called to set the EIP 2981 royalty split
    /// @dev can only be called by contract royalty setter.
    /// @param contractAddress address of contract for which royalty is set
    /// @param _royaltyBps the royalty split for the EIP 2981
    function setContractRoyalty(address contractAddress, uint16 _royaltyBps) external {
        contractRoyalty[contractAddress] = _royaltyBps;
    }
}
