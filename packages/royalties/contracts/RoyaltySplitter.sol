// SPDX-License-Identifier: MIT OR Apache-2.0

pragma solidity ^0.8.0;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
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
import {IRoyaltyManager} from "./interfaces/IRoyaltyManager.sol";
import {IERC20Approve} from "./interfaces/IERC20Approve.sol";

/**
 * Cloneable and configurable royalty splitter contract
 */
contract RoyaltySplitter is Initializable, OwnableUpgradeable, IRoyaltySplitter, ERC165Upgradeable {
    using BytesLibrary for bytes;
    using AddressUpgradeable for address payable;
    using AddressUpgradeable for address;
    using SafeMath for uint256;

    uint256 internal constant Total_BASIS_POINTS = 10000;
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

    /**
     * @notice Called once to configure the contract after the initial deployment.
     * @dev This will be called by `createSplit` after deploying the proxy so it should never be called directly.
     */
    function initialize(address payable recipient, address royaltyManager) public initializer {
        __Ownable_init();
        _royaltyManager = IRoyaltyManager(royaltyManager);
        _recipient = recipient;
    }

    /**
     * @dev Set the splitter recipients. Total bps must total 10000.
     */
    function setRecipients(Recipient[] calldata recipients) external override onlyOwner {
        _setRecipients(recipients);
    }

    function _setRecipients(Recipient[] calldata recipients) private {
        delete _recipient;
        require(recipients.length == 1, "Invalid recipents length");
        _recipient = recipients[0].recipient;
    }

    /**
     * @dev Get the splitter recipients;
     */
    function getRecipients() external view override returns (Recipient[] memory) {
        Recipient memory commonRecipient = _royaltyManager.getCommonRecipient();
        uint16 creatorSplit = _royaltyManager.getCreatorSplit();
        Recipient[] memory recipients = new Recipient[](2);
        recipients[0].recipient = _recipient;
        recipients[0].bps = creatorSplit;
        recipients[1] = commonRecipient;
        return recipients;
    }

    /**
     * @notice Forwards any ETH received to the recipients in this split.
     * @dev Each recipient increases the gas required to split
     * and contract recipients may significantly increase the gas required.
     */
    receive() external payable {
        _splitETH(msg.value);
    }

    /**
     * @notice Allows any ETH stored by the contract to be split among recipients.
     * @dev Normally ETH is forwarded as it comes in, but a balance in this contract
     * is possible if it was sent before the contract was created or if self destruct was used.
     */
    function splitETH() public {
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
                    amountToSend = (value * recipient.bps) / Total_BASIS_POINTS;
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

    /**
     * @notice recipients can call this function to split all available tokens at the provided address between the recipients.
     * @dev This contract is built to split ETH payments. The ability to attempt to split ERC20 tokens is here
     * just in case tokens were also sent so that they don't get locked forever in the contract.
     */
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
                commonRecipient.recipient == msg.sender || _recipient == msg.sender,
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

                    amountToSend /= Total_BASIS_POINTS;
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

    /**
     * @notice Allows the split recipients to make an arbitrary contract call.
     * @dev This is provided to allow recovering from unexpected scenarios,
     * such as receiving an NFT at this address.
     *
     * It will first attempt a fair split of ERC20 tokens before proceeding.
     *
     * This contract is built to split ETH payments. The ability to attempt to make other calls is here
     * just in case other assets were also sent so that they don't get locked forever in the contract.
     */
    function proxyCall(address payable target, bytes calldata callData) external {
        Recipient memory commonRecipient = _royaltyManager.getCommonRecipient();
        require(
            commonRecipient.recipient == msg.sender || _recipient == msg.sender,
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
}
