// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity ^0.8.0;

import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {IRoyaltyManager} from "./interfaces/IRoyaltyManager.sol";
import {Recipient} from "@manifoldxyz/royalty-registry-solidity/contracts/overrides/IRoyaltySplitter.sol";
import {RoyaltySplitter} from "./RoyaltySplitter.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";

/// @title RoyaltyManager
/// @author The Sandbox
/// @notice Registry contract to set the common Recipient and Split for the RoyaltySplitter. Also, to set the royalty info
/// for contracts that don't use the RoyaltySplitter.
contract RoyaltyManager is AccessControlUpgradeable, IRoyaltyManager {
    bytes32 public constant CONTRACT_ROYALTY_SETTER_ROLE = keccak256("CONTRACT_ROYALTY_SETTER_ROLE");
    bytes32 public constant SPLITTER_DEPLOYER_ROLE = keccak256("SPLITTER_DEPLOYER_ROLE");

    uint16 internal constant TOTAL_BASIS_POINTS = 10000;
    uint16 public commonSplit;
    address payable public commonRecipient;
    mapping(address => uint16) public contractRoyalty;
    mapping(address => address payable) public creatorRoyaltiesSplitter;
    address internal _royaltySplitterCloneable;
    address internal _trustedForwarder;

    /// @dev this protects the implementation contract from behing initialized.
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice initialization function for the deployment of contract
    /// @dev called during the deployment via the proxy.
    /// @param _commonRecipient the != address(0)common recipient for all the splitters
    /// @param _commonSplit split for the common recipient's and creator split would be 10000 - commonSplit
    /// @param royaltySplitterCloneable address of cloneable splitter contract for royalties distribution
    /// @param managerAdmin address of RoyaltyManager contract.
    /// @param contractRoyaltySetter the address of royalty setter of contract.
    /// @param trustedForwarder the trustedForwarder address for royalty splitters to use.
    function initialize(
        address payable _commonRecipient,
        uint16 _commonSplit,
        address royaltySplitterCloneable,
        address managerAdmin,
        address contractRoyaltySetter,
        address trustedForwarder
    ) external initializer {
        _setRecipient(_commonRecipient);
        _setSplit(_commonSplit);
        _grantRole(DEFAULT_ADMIN_ROLE, managerAdmin);
        _grantRole(CONTRACT_ROYALTY_SETTER_ROLE, contractRoyaltySetter);
        _royaltySplitterCloneable = royaltySplitterCloneable;
        _setTrustedForwarder(trustedForwarder);
    }

    /// @notice sets royalty recipient wallet
    /// @dev should be called by the creator. The bps is not set on the splitter as it is set here on manager contract.
    /// @param recipient new recipient wallet.
    function setRoyaltyRecipient(address payable recipient) external {
        address payable _creatorSplitterAddress = creatorRoyaltiesSplitter[msg.sender];
        require(_creatorSplitterAddress != address(0), "Manager: No splitter deployed for the creator");
        address _recipient = RoyaltySplitter(_creatorSplitterAddress).recipient();
        require(_recipient != recipient, "Manager: Recipient already set");
        Recipient[] memory newRecipient = new Recipient[](1);
        newRecipient[0] = Recipient({recipient: recipient, bps: 0});
        RoyaltySplitter(_creatorSplitterAddress).setRecipients(newRecipient);
    }

    /// @notice sets the common recipient
    /// @dev can only be called by the admin
    /// @param _commonRecipient is the common recipient for all the splitters
    function setRecipient(address payable _commonRecipient) external override onlyRole(DEFAULT_ADMIN_ROLE) {
        _setRecipient(_commonRecipient);
    }

    /// @notice sets the trustedForwarder address to be used by the splitters
    /// @dev can only be called by the admin
    /// new splitters will read this value
    /// @param _newForwarder is the new trusted forwarder address
    function setTrustedForwarder(address _newForwarder) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setTrustedForwarder(_newForwarder);
    }

    /// @notice sets the common split
    /// @dev can only be called by the admin.
    /// @param _commonSplit split for the common recipient and creators split would be 10000 - commonSplit
    function setSplit(uint16 _commonSplit) external override onlyRole(DEFAULT_ADMIN_ROLE) {
        _setSplit(_commonSplit);
    }

    /// @notice get the current trustedForwarder address
    /// @return trustedForwarder address of current TrustedForwarder
    function getTrustedForwarder() external view returns (address trustedForwarder) {
        return _trustedForwarder;
    }

    function _setRecipient(address payable _commonRecipient) internal {
        require(_commonRecipient != address(0), "Manager: Can't set common recipient to zero address");
        commonRecipient = _commonRecipient;
        emit RecipientSet(_commonRecipient);
    }

    function _setSplit(uint16 _commonSplit) internal {
        require(_commonSplit < TOTAL_BASIS_POINTS, "Manager: Can't set split greater than the total basis point");
        commonSplit = _commonSplit;
        emit SplitSet(_commonSplit);
    }

    /// @notice sets trusted forwarder address
    /// @param _newForwarder new trusted forwarder address to set
    function _setTrustedForwarder(address _newForwarder) internal {
        address oldTrustedForwarder = _trustedForwarder;
        _trustedForwarder = _newForwarder;
        emit TrustedForwarderSet(oldTrustedForwarder, _newForwarder);
    }

    /// @notice called to set the EIP 2981 royalty split
    /// @dev can only be called by contract royalty setter.
    /// @param contractAddress address of contract for which royalty is set
    /// @param _royaltyBps the royalty split for the EIP 2981
    function setContractRoyalty(address contractAddress, uint16 _royaltyBps)
        external
        onlyRole(CONTRACT_ROYALTY_SETTER_ROLE)
    {
        require(_royaltyBps < TOTAL_BASIS_POINTS, "Manager: Royalty can't be greater than Total base points");
        contractRoyalty[contractAddress] = _royaltyBps;
        emit RoyaltySet(_royaltyBps, contractAddress);
    }

    /// @notice to be called by the splitters to get the common recipient and split
    /// @return recipient which has the common recipient and split
    function getCommonRecipient() external view override returns (Recipient memory recipient) {
        return Recipient({recipient: commonRecipient, bps: commonSplit});
    }

    /// @notice deploys splitter for creator
    /// @dev should only called once per creator
    /// @param creator the address of the creator
    /// @param recipient the wallet of the recipient where they would receive their royalty
    /// @return creatorSplitterAddress splitter's address deployed for a creator
    function deploySplitter(address creator, address payable recipient)
        external
        onlyRole(SPLITTER_DEPLOYER_ROLE)
        returns (address payable creatorSplitterAddress)
    {
        creatorSplitterAddress = creatorRoyaltiesSplitter[creator];
        if (creatorSplitterAddress == address(0)) {
            creatorSplitterAddress = payable(Clones.clone(_royaltySplitterCloneable));
            RoyaltySplitter(creatorSplitterAddress).initialize(recipient, address(this));
            creatorRoyaltiesSplitter[creator] = creatorSplitterAddress;
            emit SplitterDeployed(creator, recipient, creatorSplitterAddress);
        }
        return creatorSplitterAddress;
    }

    /// @notice returns the address of splitter of a creator.
    /// @param creator the address of the creator
    /// @return creatorSplitterAddress splitter's address deployed for a creator
    function getCreatorRoyaltySplitter(address creator) external view returns (address payable creatorSplitterAddress) {
        return creatorRoyaltiesSplitter[creator];
    }

    /// @notice returns the amount of basis points allocated to the creator
    /// @return creatorSplit which is 10000 - commonSplit
    function getCreatorSplit() external view returns (uint16 creatorSplit) {
        return TOTAL_BASIS_POINTS - commonSplit;
    }

    /// @notice returns the commonRecipient and EIP2981 royalty bps
    /// @return recipient address of common royalty recipient
    /// @return royaltySplit contract EIP2981 royalty bps
    function getRoyaltyInfo() external view returns (address payable recipient, uint16 royaltySplit) {
        return (commonRecipient, contractRoyalty[msg.sender]);
    }

    /// @notice returns the EIP2981 royalty bps
    /// @param _contractAddress the address of the contract for which the royalty is required
    /// @return royaltyBps royalty bps of the contract
    function getContractRoyalty(address _contractAddress) external view returns (uint16 royaltyBps) {
        royaltyBps = contractRoyalty[_contractAddress];
    }

    uint256[46] private __gap;
}
