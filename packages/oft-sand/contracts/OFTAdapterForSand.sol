// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {SendParam, OFTReceipt, MessagingReceipt, MessagingFee} from "@layerzerolabs/lz-evm-oapp-v2/contracts/oft/interfaces/IOFT.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Context} from "@openzeppelin/contracts/utils/Context.sol";
import {OFTAdapter} from "./oft/OFTAdapter.sol";
import {ERC2771Handler} from "./sand/ERC2771Handler.sol";

/// @title OFTAdapterForSand
/// @author The Sandbox
/// @dev contract to be used with non-upgradable SAND contract
contract OFTAdapterForSand is OFTAdapter, ERC2771Handler {
    bool public enabled;

    /// @notice Emitted when the enabled state changes
    /// @param _enabled The new enabled state
    event StateChanged(bool _enabled);

    /// @notice Custom error thrown when the send function is called while disabled
    error SendFunctionDisabled();

    /// @param sandToken SAND token address on the same network as the OFT Adapter
    /// @param layerZeroEndpoint local endpoint address
    /// @param owner owner used as a delegate in LayerZero Endpoint
    /// @param trustedForwarder trusted forwarder address
    constructor(
        address sandToken,
        address layerZeroEndpoint,
        address owner,
        address trustedForwarder
    ) OFTAdapter(sandToken, layerZeroEndpoint, owner) Ownable(owner) {
        __ERC2771Handler_initialize(trustedForwarder);
        _enable(true);
    }

    /// @notice Change the address of the trusted forwarder for meta-TX.
    /// @param trustedForwarder The new trustedForwarder.
    function setTrustedForwarder(address trustedForwarder) external onlyOwner {
        _trustedForwarder = trustedForwarder;
    }

    function enable(bool _enabled) external onlyOwner {
        _enable(_enabled);
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

    function _msgSender() internal view override(ERC2771Handler, Context) returns (address sender) {
        return ERC2771Handler._msgSender();
    }

    function _msgData() internal view override(ERC2771Handler, Context) returns (bytes calldata) {
        return ERC2771Handler._msgData();
    }
}
