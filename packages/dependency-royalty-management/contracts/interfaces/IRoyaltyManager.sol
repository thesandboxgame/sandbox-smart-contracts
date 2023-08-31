// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Recipient} from "@manifoldxyz/royalty-registry-solidity/contracts/overrides/IRoyaltySplitter.sol";

/// @title IRoyaltyManager
/// @notice interface for RoyaltyManager Contract
interface IRoyaltyManager {
    event RecipientSet(address commonRecipient);

    event SplitSet(uint16 commonSplit);

    event RoyaltySet(uint16 royaltyBps, address contractAddress);

    event TrustedForwarderSet(address indexed previousForwarder, address indexed newForwarder);

    event SplitterDeployed(address indexed creator, address indexed recipient, address splitterAddress);

    ///@notice sets the common recipient
    ///@param _commonRecipient is the common recipient for all the splitters
    function setRecipient(address payable _commonRecipient) external;

    ///@notice sets the common split
    ///@param commonSplit split for the common recipient
    function setSplit(uint16 commonSplit) external;

    ///@notice to be called by the splitters to get the common recipient and split
    ///@return recipient which has the common recipient and split
    function getCommonRecipient() external view returns (Recipient memory recipient);

    ///@notice returns the amount of basis points allocated to the creator
    ///@return creatorSplit the share of creator in bps
    function getCreatorSplit() external view returns (uint16 creatorSplit);

    ///@notice returns the commonRecipient and EIP2981 royalty split
    ///@return recipient address of common royalty recipient
    ///@return royaltySplit contract EIP2981 royalty bps
    function getRoyaltyInfo() external view returns (address payable recipient, uint16 royaltySplit);

    ///@notice deploys splitter for creator
    ///@param creator the address of the creator
    ///@param recipient the wallet of the recipient where they would receive their royalty
    ///@return creatorSplitterAddress splitter's address deployed for creator
    function deploySplitter(address creator, address payable recipient)
        external
        returns (address payable creatorSplitterAddress);

    ///@notice returns the address of splitter of a creator.
    ///@param creator the address of the creator
    ///@return creatorSplitterAddress splitter's address deployed for a creator
    function getCreatorRoyaltySplitter(address creator) external view returns (address payable creatorSplitterAddress);

    ///@notice returns the EIP2981 royalty split
    ///@param _contractAddress the address of the contract for which the royalty is required
    ///@return royaltyBps royalty bps of the contract
    function getContractRoyalty(address _contractAddress) external view returns (uint16 royaltyBps);

    ///@notice sets the trustedForwarder address to be used by the splitters
    ///@param _newForwarder is the new trusted forwarder address
    function setTrustedForwarder(address _newForwarder) external;

    ///@notice get the current trustedForwarder address
    ///@return trustedForwarder address of current trusted Forwarder
    function getTrustedForwarder() external view returns (address trustedForwarder);
}
