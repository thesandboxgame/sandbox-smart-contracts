// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {IWhiteList} from "../interfaces/IWhiteList.sol";

/// @title WhiteList contract
/// @dev controls which tokens are accepted in the marketplace
contract WhiteList is IWhiteList, OwnableUpgradeable {
    /// @notice if status == tsbOnly, then only tsbListedContracts [small mapping]
    /// @return tsbOnly
    bool public tsbOnly;

    /// @notice if status == partners, then tsbListedContracts and partnerContracts [manageable mapping]
    /// @return partners
    bool public partners;

    /// @notice if status == open, then no whitelist [no mapping needed]. But then we need a removeListing function for contracts we subsequently
    /// @return open
    bool public open;

    /// @notice if status == erc20List, users can only pay white whitelisted ERC20 tokens
    /// @return erc20List
    bool public erc20List;

    /// @notice mapping containing the list of contracts in the tsb white list
    /// @return true if list contains address
    mapping(address => bool) public tsbWhiteList;

    /// @notice mapping containing the list of contracts in the partners white list
    /// @return true if list contains address
    mapping(address => bool) public partnerWhiteList;

    /// @notice mapping containing the list of contracts in the erc20 white list
    /// @return true if list contains address
    mapping(address => bool) public erc20WhiteList;

    /// @notice event emitted when new permissions for tokens are added
    /// @param tsbOnly boolean indicating that TSB tokens are accepted
    /// @param partners boolean indicating that partner tokens are accepted
    /// @param open boolean indicating that all tokens are accepted
    /// @param erc20List boolean indicating that there is a restriction for ERC20 tokens
    event PermissionSetted(bool tsbOnly, bool partners, bool open, bool erc20List);

    /// @notice event emitted when a new TSB token has been added
    /// @param tokenAddress address of added token
    event TSBAdded(address indexed tokenAddress);

    /// @notice event emitted when a TSB token has been removed
    /// @param tokenAddress address of removed token
    event TSBRemoved(address indexed tokenAddress);

    /// @notice event emitted when a new partner token has been added
    /// @param tokenAddress address of added token
    event PartnerAdded(address indexed tokenAddress);

    /// @notice event emitted when a partner token has been removed
    /// @param tokenAddress address of removed token
    event PartnerRemoved(address indexed tokenAddress);

    /// @notice event emitted when a new ERC20 token has been added
    /// @param tokenAddress address of added token
    event ERC20Added(address indexed tokenAddress);

    /// @notice event emitted when a ERC20 token has been removed
    /// @param tokenAddress address of removed token
    event ERC20Removed(address indexed tokenAddress);

    /// @notice initializer for WhiteList
    /// @param newTsbOnly allows orders with The Sandbox token
    /// @param newPartners allows orders with partner token
    /// @param newOpen allows orders with any token
    /// @param newErc20List allows to pay orders with only whitelisted token
    function __Whitelist_init(bool newTsbOnly, bool newPartners, bool newOpen, bool newErc20List) internal initializer {
        __Ownable_init();
        tsbOnly = newTsbOnly;
        partners = newPartners;
        open = newOpen;
        erc20List = newErc20List;
    }

    /// @notice setting permissions for tokens
    /// @param newTsbOnly allows orders with The Sandbox token
    /// @param newPartners allows orders with partner token
    /// @param newOpen allows orders with any token
    /// @param newErc20List allows to pay orders with only whitelisted token
    function setPermissions(bool newTsbOnly, bool newPartners, bool newOpen, bool newErc20List) external onlyOwner {
        tsbOnly = newTsbOnly;
        partners = newPartners;
        open = newOpen;
        erc20List = newErc20List;

        emit PermissionSetted(tsbOnly, partners, open, erc20List);
    }

    /// @notice add token to tsb list
    /// @param tokenAddress token address
    function addTSB(address tokenAddress) external onlyOwner {
        tsbWhiteList[tokenAddress] = true;

        emit TSBAdded(tokenAddress);
    }

    /// @notice remove token from tsb list
    /// @param tokenAddress token address
    function removeTSB(address tokenAddress) external onlyOwner {
        require(tsbWhiteList[tokenAddress], "not allowed");
        tsbWhiteList[tokenAddress] = false;

        emit TSBRemoved(tokenAddress);
    }

    /// @notice add token to partners list
    /// @param tokenAddress token address
    function addPartner(address tokenAddress) external onlyOwner {
        partnerWhiteList[tokenAddress] = true;

        emit PartnerAdded(tokenAddress);
    }

    /// @notice remove token from partner list
    /// @param tokenAddress token address
    function removePartner(address tokenAddress) external onlyOwner {
        require(partnerWhiteList[tokenAddress], "not allowed");
        partnerWhiteList[tokenAddress] = false;

        emit PartnerRemoved(tokenAddress);
    }

    /// @notice add token to the ERC20 list
    /// @param tokenAddress token address
    function addERC20(address tokenAddress) external onlyOwner {
        erc20WhiteList[tokenAddress] = true;

        emit ERC20Added(tokenAddress);
    }

    /// @notice remove token from ERC20 list
    /// @param tokenAddress token address
    function removeERC20(address tokenAddress) external onlyOwner {
        require(erc20WhiteList[tokenAddress], "not allowed");
        erc20WhiteList[tokenAddress] = false;

        emit ERC20Removed(tokenAddress);
    }
}
