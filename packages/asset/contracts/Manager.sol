// SPDX-License-Identifier: MIT OR Apache-2.0

pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./interfaces/IManager.sol";
import "@manifoldxyz/royalty-registry-solidity/contracts/overrides/IRoyaltySplitter.sol";
import "./CustomSplitter.sol";

/// @title Registry
/// @author The sandbox
/// @notice Registry contract to set the common Recipient and Split for the splitters. Also to set the royalty info
/// for contract which don't use splitter
contract Manager is AccessControlUpgradeable, IManager {
    bytes32 public constant CONTRACT_ROYALTY_SETTER_ROLE =
        keccak256("CONTRACT_ROYALTY_SETTER");

    uint16 internal constant TOTAL_BASIS_POINTS = 10000;
    uint16 public commonSplit;
    address payable public commonRecipient;
    mapping(address => uint16) public contractRoyalty;
    mapping(address => address payable) public _creatorRoyaltiesSplitter;
    address internal _royaltySplitterCloneable;

    /// @notice initialization function for deployment of contract
    /// @dev called during the deployment via the proxy.
    /// @param _commonRecipient the != address(0)common recipient for all the splitters
    /// @param _commonSplit split for the common recipient and creators split would be 10000 - commonSplit
    function initialize(
        address payable _commonRecipient,
        uint16 _commonSplit,
        address royaltySplitterCloneable,
        address managerAdmin,
        address contractRoyaltySetter
    ) external initializer {
        _setRecipient(_commonRecipient);
        _setSplit(_commonSplit);
        _grantRole(DEFAULT_ADMIN_ROLE, managerAdmin);
        _grantRole(CONTRACT_ROYALTY_SETTER_ROLE, contractRoyaltySetter);
        _royaltySplitterCloneable = royaltySplitterCloneable;
    }

    /// @notice sets royalty recipient wallet
    /// @dev should be called by the creator. The bps is not set on the splitter as it is set here on manager contract.
    /// @param recipient new recipient wallet.
    function setRoyaltyRecipient(address payable recipient) external {
        address payable creatorSplitterAddress = _creatorRoyaltiesSplitter[
            msg.sender
        ];
        require(
            creatorSplitterAddress != address(0),
            "Manager: No splitter deployed for the creator"
        );
        address _recipient = CustomRoyaltySplitter(creatorSplitterAddress)
            ._recipient();
        require(_recipient != recipient, "Recipient already set");
        Recipient[] memory newRecipient = new Recipient[](1);
        newRecipient[0] = Recipient({recipient: recipient, bps: 0});
        CustomRoyaltySplitter(creatorSplitterAddress).setRecipients(
            newRecipient
        );
    }

    /// @notice sets the common recipient and common split
    /// @dev can only be called by the owner now later could be called my a manager
    /// @param _commonRecipient the common recipient for all the splitters
    function setRecipient(
        address payable _commonRecipient
    ) external override onlyRole(DEFAULT_ADMIN_ROLE) {
        _setRecipient(_commonRecipient);
    }

    /// @notice sets the common recipient and common split
    /// @dev can only be called by the owner now later could be called my a manager
    /// @param _commonSplit split for the common recipient and creators split would be 10000 - commonSplit
    function setSplit(
        uint16 _commonSplit
    ) external override onlyRole(DEFAULT_ADMIN_ROLE) {
        _setSplit(_commonSplit);
    }

    function _setRecipient(address payable _commonRecipient) internal {
        require(
            _commonRecipient != address(0),
            "Manager: Can't set common recipient to zero address"
        );
        commonRecipient = _commonRecipient;
        emit RecipientSet(_commonRecipient);
    }

    function _setSplit(uint16 _commonSplit) internal {
        require(
            _commonSplit < TOTAL_BASIS_POINTS,
            "Manager: Can't set common recipient to zero address"
        );
        commonSplit = _commonSplit;
        emit SplitSet(_commonSplit);
    }

    /// @notice called to set the EIP 2981 royalty split
    /// @dev can only be called by the owner now later could be called my a manager
    /// @param _royaltyBps the royalty split for the EIP 2981
    function setContractRoyalty(
        address contractAddress,
        uint16 _royaltyBps
    ) external onlyRole(CONTRACT_ROYALTY_SETTER_ROLE) {
        require(
            _royaltyBps < TOTAL_BASIS_POINTS,
            "Manager: Royalty can't be greater than Total base points"
        );
        contractRoyalty[contractAddress] = _royaltyBps;
        emit RoyaltySet(_royaltyBps, contractAddress);
    }

    /// @notice to be called by the splitters to get the common recipient and split
    /// @return recipient which has common recipient and split
    function getCommonRecipient()
        external
        view
        override
        returns (Recipient memory recipient)
    {
        recipient = Recipient({recipient: commonRecipient, bps: commonSplit});
        return recipient;
    }

    /// @notice deploys splitter for creator
    /// @dev should only called once per creator
    /// @param creator  the address of the creator
    /// @param recipient the wallet of the recipient where they would receive there royalty
    /// @return creatorSplitterAddress deployed for a creator
    function deploySplitter(
        address creator,
        address payable recipient
    ) external returns (address payable) {
        address payable creatorSplitterAddress = _creatorRoyaltiesSplitter[
            creator
        ];
        if (creatorSplitterAddress == address(0)) {
            creatorSplitterAddress = payable(
                Clones.clone(_royaltySplitterCloneable)
            );
            CustomRoyaltySplitter(creatorSplitterAddress).initialize(
                recipient,
                address(this)
            );
            _creatorRoyaltiesSplitter[creator] = creatorSplitterAddress;
        }
        return creatorSplitterAddress;
    }

    /// @notice returns the address of splitter of a creator.
    /// @param creator  the address of the creator
    /// @return creatorSplitterAddress deployed for a creator
    function getCreatorRoyaltySplitter(
        address creator
    ) external view returns (address payable) {
        return _creatorRoyaltiesSplitter[creator];
    }

    /// @notice to be called by the splitters to get the common recipient and split
    /// @return creatorSplit which is 10000 - commonSplit
    function getCreatorSplit() external view returns (uint16) {
        return TOTAL_BASIS_POINTS - commonSplit;
    }

    /// @notice returns the commonRecipient and EIP2981 royalty split
    /// @return commonRecipient
    /// @return royaltySplit
    function getRoyaltyInfo() external view returns (address, uint16) {
        return (commonRecipient, contractRoyalty[msg.sender]);
    }
}
