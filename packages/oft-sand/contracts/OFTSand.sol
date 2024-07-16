//SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {SendParam, OFTReceipt, MessagingReceipt, MessagingFee} from "@layerzerolabs/lz-evm-oapp-v2/contracts/oft/interfaces/IOFT.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Context} from "@openzeppelin/contracts/utils/Context.sol";
import {OFTCore} from "./oft/OFTCore.sol";
import {ERC2771Handler} from "./sand/ERC2771Handler.sol";
import {SandBaseToken} from "./sand/SandBaseToken.sol";

/// @title OFTSand
/// @author The Sandbox
/// @dev OFTSand is a contract that combines SandBaseToken, ERC2771Handler, and OFTCore functionalities.
/// @dev It provides a token contract implementation of Sand token with LayerZero compatibility.
contract OFTSand is SandBaseToken, ERC2771Handler, OFTCore {
    bool public enabled;

    /// @notice Emitted when the enabled state changes
    /// @param _enabled The new enabled state
    event StateChanged(bool _enabled);

    /// @notice Custom error thrown when the send function is called while disabled
    error SendFunctionDisabled();

    constructor(
        address trustedForwarder,
        address sandAdmin,
        address executionAdmin,
        address layerZeroEndpoint,
        address owner
    ) SandBaseToken(sandAdmin, executionAdmin, address(0), 0) OFTCore(18, layerZeroEndpoint, owner) Ownable(owner) {
        __ERC2771Handler_initialize(trustedForwarder);
        _enable(true);
    }

    /// @notice Change the address of the trusted forwarder for meta-TX.
    /// @param trustedForwarder The new trustedForwarder.
    function setTrustedForwarder(address trustedForwarder) external onlyOwner {
        _trustedForwarder = trustedForwarder;
    }

    function enable(bool _enabled) external onlyAdmin {
        _enable(_enabled);
    }

    /// @notice Indicates whether the OFT contract requires approval of the 'token()' to send.
    /// @return requiresApproval Needs approval of the underlying token implementation.
    /// @dev In the case of OFT where the contract IS the token, approval is NOT required.
    function approvalRequired() external pure virtual returns (bool) {
        return false;
    }

    /// @dev Retrieves the address of the underlying ERC20 implementation.
    /// @return The address of the OFT token.
    /// @dev In the case of OFT, address(this) and erc20 are the same contract.
    function token() external view returns (address) {
        return address(this);
    }

    function send(
        SendParam calldata _sendParam,
        MessagingFee calldata _fee,
        address _refundAddress
    ) public payable virtual override returns (MessagingReceipt memory msgReceipt, OFTReceipt memory oftReceipt) {
        if (!enabled) {
            revert SendFunctionDisabled();
        }

        super.send(_sendParam, _fee, _refundAddress);
    }

    function _enable(bool _enabled) internal {
        enabled = _enabled;
        emit StateChanged(_enabled);
    }

    /// @dev Burns tokens from the sender's specified balance.
    /// @param _from The address to debit the tokens from.
    /// @param _amountLD The amount of tokens to send in local decimals.
    /// @param _minAmountLD The minimum amount to send in local decimals.
    /// @param _dstEid The destination chain ID.
    /// @return amountSentLD The amount sent in local decimals.
    /// @return amountReceivedLD The amount received in local decimals on the remote.
    function _debit(
        address _from,
        uint256 _amountLD,
        uint256 _minAmountLD,
        uint32 _dstEid
    ) internal virtual override returns (uint256 amountSentLD, uint256 amountReceivedLD) {
        (amountSentLD, amountReceivedLD) = _debitView(_amountLD, _minAmountLD, _dstEid);

        // @dev In NON-default OFT, amountSentLD could be 100, with a 10% fee, the amountReceivedLD amount is 90,
        // therefore amountSentLD CAN differ from amountReceivedLD.

        // @dev Default OFT burns on src.
        _burn(_from, amountSentLD);
    }

    /// @dev Credits tokens to the specified address.
    /// @param _to The address to credit the tokens to.
    /// @param _amountLD The amount of tokens to credit in local decimals.
    /// @dev _srcEid The source chain ID.
    /// @return amountReceivedLD The amount of tokens ACTUALLY received in local decimals.
    function _credit(
        address _to,
        uint256 _amountLD,
        uint32 /*_srcEid*/
    ) internal virtual override returns (uint256 amountReceivedLD) {
        // @dev Default OFT mints on dst.
        _mint(_to, _amountLD);
        // @dev In the case of NON-default OFT, the _amountLD MIGHT not be == amountReceivedLD.
        return _amountLD;
    }

    function _msgSender() internal view override(ERC2771Handler, Context) returns (address sender) {
        return ERC2771Handler._msgSender();
    }

    function _msgData() internal view override(ERC2771Handler, Context) returns (bytes calldata) {
        return ERC2771Handler._msgData();
    }
}
