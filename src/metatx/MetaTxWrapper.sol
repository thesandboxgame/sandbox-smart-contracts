pragma solidity 0.6.5;

import "./BaseRelayRecipient.sol";


contract MetaTxWrapper is BaseRelayRecipient {
    address internal immutable _forwardTo;

    constructor(address trusted_Forwarder, address forwardTo) public {
        _forwardTo = forwardTo;
        trustedForwarder = trusted_Forwarder;
    }

    fallback() external payable trustedForwarderOnly() {
        uint256 length = msg.data.length;
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
