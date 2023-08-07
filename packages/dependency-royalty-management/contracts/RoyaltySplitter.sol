// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity ^0.8.0;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {
    OwnableUpgradeable,
    ContextUpgradeable
} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {AddressUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import {ERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";
import {SafeMath} from "@openzeppelin/contracts/utils/math/SafeMath.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {BytesLibrary} from "@manifoldxyz/royalty-registry-solidity/contracts/libraries/BytesLibrary.sol";
import {
    IRoyaltySplitter,
    IERC165,
    Recipient
} from "@manifoldxyz/royalty-registry-solidity/contracts/overrides/IRoyaltySplitter.sol";
import {ERC2771HandlerAbstract} from "@sandbox-smart-contracts/dependency-metatx/contracts/ERC2771HandlerAbstract.sol";
import {IRoyaltyManager} from "./interfaces/IRoyaltyManager.sol";
import {IERC20Approve} from "./interfaces/IERC20Approve.sol";

/// @title RoyaltySplitter
/// @author The Sandbox
/// @notice RoyaltySplitter contract is deployed by the RoyaltyManager contract for a creator to get his royalty's share.
contract RoyaltySplitter is
    Initializable,
    OwnableUpgradeable,
    IRoyaltySplitter,
    ERC165Upgradeable,
    ERC2771HandlerAbstract
{
    using BytesLibrary for bytes;
    using AddressUpgradeable for address payable;
    using AddressUpgradeable for address;
    using SafeMath for uint256;

    uint256 internal constant TOTAL_BASIS_POINTS = 10000;
    uint256 internal constant IERC20_APPROVE_SELECTOR =
        0x095ea7b300000000000000000000000000000000000000000000000000000000;
    uint256 internal constant SELECTOR_MASK = 0xffffffff00000000000000000000000000000000000000000000000000000000;

    address payable public _recipient;
    IRoyaltyManager public _royaltyManager;

    event ETHTransferred(address indexed account, uint256 amount);
    event ERC20Transferred(address indexed erc20Contract, address indexed account, uint256 amount);

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(IERC165, ERC165Upgradeable)
        returns (bool)
    {
        return interfaceId == type(IRoyaltySplitter).interfaceId || super.supportsInterface(interfaceId);
    }

    /// @notice initialize the contract
    /// @dev can only be run once.
    /// @param recipient the wallet of the creator when the contract is deployed
    /// @param royaltyManager the address of the royalty manager contract
    function initialize(address payable recipient, address royaltyManager) public initializer {
        _royaltyManager = IRoyaltyManager(royaltyManager); // set manager before Ownable_init for _isTrustedForwarder
        _recipient = recipient;
        __Ownable_init();
    }

    /// @notice sets recipient for the splitter
    /// @dev only the owner can call this.
    /// @param recipients the array of recipients which should only have one recipient.
    function setRecipients(Recipient[] calldata recipients) external override onlyOwner {
        _setRecipients(recipients);
    }

    function _setRecipients(Recipient[] calldata recipients) private {
        delete _recipient;
        require(recipients.length == 1, "Invalid recipents length");
        _recipient = recipients[0].recipient;
    }

    /// @notice to get recipients of royalty through this splitter and their splits of royalty.
    /// @return recipients of royalty through this splitter and their splits of royalty.
    function getRecipients() external view override returns (Recipient[] memory) {
        Recipient memory commonRecipient = _royaltyManager.getCommonRecipient();
        uint16 creatorSplit = _royaltyManager.getCreatorSplit();
        Recipient[] memory recipients = new Recipient[](2);
        recipients[0].recipient = _recipient;
        recipients[0].bps = creatorSplit;
        recipients[1] = commonRecipient;
        return recipients;
    }

    /// @notice Splits and forwards ETH to the royalty receivers
    /// @dev splits ETH every time it is sent to this contract as royalty.
    receive() external payable {
        _splitETH(msg.value);
    }

    /// @notice Splits and forwards ETH to the royalty receivers
    /// @dev normally ETH should be split automatically by receive function.
    function splitETH() public payable {
        _splitETH(address(this).balance);
    }

    function _splitETH(uint256 value) internal {
        if (value > 0) {
            Recipient memory commonRecipient = _royaltyManager.getCommonRecipient();
            uint16 creatorSplit = _royaltyManager.getCreatorSplit();
            Recipient[] memory _recipients = new Recipient[](2);
            _recipients[0].recipient = _recipient;
            _recipients[0].bps = creatorSplit;
            _recipients[1] = commonRecipient;
            uint256 totalSent;
            uint256 amountToSend;
            unchecked {
                for (uint256 i = _recipients.length - 1; i > 0; i--) {
                    Recipient memory recipient = _recipients[i];
                    amountToSend = (value * recipient.bps) / TOTAL_BASIS_POINTS;
                    totalSent += amountToSend;
                    recipient.recipient.sendValue(amountToSend);
                    emit ETHTransferred(recipient.recipient, amountToSend);
                }
                // Favor the 1st recipient if there are any rounding issues
                amountToSend = value - totalSent;
            }
            _recipients[0].recipient.sendValue(amountToSend);
            emit ETHTransferred(_recipients[0].recipient, amountToSend);
        }
    }

    /// @notice split ERC20 Tokens owned by this contract.
    /// @dev can only be called by one of the recipients
    /// @param erc20Contract the address of the tokens to be split.
    function splitERC20Tokens(IERC20 erc20Contract) public {
        require(_splitERC20Tokens(erc20Contract), "Split: ERC20 split failed");
    }

    function _splitERC20Tokens(IERC20 erc20Contract) internal returns (bool) {
        try erc20Contract.balanceOf(address(this)) returns (uint256 balance) {
            if (balance == 0) {
                return false;
            }
            Recipient memory commonRecipient = _royaltyManager.getCommonRecipient();
            uint16 creatorSplit = _royaltyManager.getCreatorSplit();
            require(
                commonRecipient.recipient == _msgSender() || _recipient == _msgSender(),
                "Split: Can only be called by one of the recipients"
            );
            Recipient[] memory _recipients = new Recipient[](2);
            _recipients[0].recipient = _recipient;
            _recipients[0].bps = creatorSplit;
            _recipients[1] = commonRecipient;
            uint256 amountToSend;
            uint256 totalSent;
            unchecked {
                for (uint256 i = _recipients.length - 1; i > 0; i--) {
                    Recipient memory recipient = _recipients[i];
                    bool success;
                    (success, amountToSend) = balance.tryMul(recipient.bps);

                    amountToSend /= TOTAL_BASIS_POINTS;
                    totalSent += amountToSend;
                    try erc20Contract.transfer(recipient.recipient, amountToSend) {
                        emit ERC20Transferred(address(erc20Contract), recipient.recipient, amountToSend);
                    } catch {
                        return false;
                    }
                }
                // Favor the 1st recipient if there are any rounding issues
                amountToSend = balance - totalSent;
            }
            try erc20Contract.transfer(_recipients[0].recipient, amountToSend) {
                emit ERC20Transferred(address(erc20Contract), _recipients[0].recipient, amountToSend);
            } catch {
                return false;
            }
            return true;
        } catch {
            return false;
        }
    }

    /// @notice made for unexpected scenarios when assets are sent to this contact such that they could be recovered.
    /// @dev first attempts to split ERC20 tokens.
    /// @param target target of the call
    /// @param callData for the call.
    function proxyCall(address payable target, bytes calldata callData) external {
        Recipient memory commonRecipient = _royaltyManager.getCommonRecipient();
        require(
            commonRecipient.recipient == _msgSender() || _recipient == _msgSender(),
            "Split: Can only be called by one of the recipients"
        );
        require(
            !callData.startsWith(IERC20Approve.approve.selector) &&
                !callData.startsWith(IERC20Approve.increaseAllowance.selector),
            "Split: ERC20 tokens must be split"
        );
        /* solhint-disable-next-line no-empty-blocks*/
        try this.splitERC20Tokens(IERC20(target)) {} catch {}
        target.functionCall(callData);
    }

    /// @notice verify whether a forwarder address is the trustedForwarder address, using the manager setting
    /// @dev this function is used to avoid having a trustedForwarder variable inside the splitter
    /// @return bool whether the forwarder is the trusted address
    function _isTrustedForwarder(address forwarder) internal view override(ERC2771HandlerAbstract) returns (bool) {
        return forwarder == _royaltyManager.getTrustedForwarder();
    }

    function _msgSender()
        internal
        view
        virtual
        override(ContextUpgradeable, ERC2771HandlerAbstract)
        returns (address sender)
    {
        return ERC2771HandlerAbstract._msgSender();
    }

    function _msgData()
        internal
        view
        virtual
        override(ContextUpgradeable, ERC2771HandlerAbstract)
        returns (bytes calldata)
    {
        return ERC2771HandlerAbstract._msgData();
    }
}
