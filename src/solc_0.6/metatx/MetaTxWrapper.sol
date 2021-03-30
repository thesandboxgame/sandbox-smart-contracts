pragma solidity 0.6.5;

import "./BaseRelayRecipient.sol";


contract MetaTxWrapper is BaseRelayRecipient {
    address internal immutable _forwardTo;

    constructor(address trusted_Forwarder, address forwardTo) public BaseRelayRecipient(trusted_Forwarder) {
        _forwardTo = forwardTo;
    }

    receive() external payable {
        revert("ETHER_TRANSFER_BLOCKED");
    }

    fallback() external payable trustedForwarderOnly() {
        // retrieve the msg sender as per EIP-2771
        address signer = _msgSender();
        address firstParam = abi.decode(msg.data[4:], (address));
        require(signer == firstParam, "INVALID_METATX_DATA");
        address target = _forwardTo;
        (bool success, ) = target.call{value: msg.value}(msg.data);
        if (!success) {
            assembly {
                let returnDataSize := returndatasize()
                returndatacopy(0, 0, returnDataSize)
                revert(0, returnDataSize)
            }
        }
    }
}
