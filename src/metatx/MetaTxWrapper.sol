pragma solidity 0.6.5;

import "./BaseRelayRecipient.sol";
import "@nomiclabs/buidler/console.sol";


contract MetaTxWrapper is BaseRelayRecipient {
    // @review removed immutable, TypeError: Assembly access to immutable variables is not supported
    address internal immutable _forwardTo;

    constructor(address trusted_Forwarder, address forwardTo) public {
        _forwardTo = forwardTo;
        trustedForwarder = trusted_Forwarder;
    }

    fallback() external trustedForwarderOnly() {
        bytes memory data = msg.data;
        uint256 length = msg.data.length;
        // retrieve the msg sender as per EIP-2771
        address signer = _msgSender();

        uint256 firstParam;
        assembly {
            firstParam := and(mload(data), 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff)
        }
        // @review delete all console logs
        console.logBytes(data);
        console.log("signer: ", signer);
        console.log("firstParam: ", firstParam);
        require(uint256(signer) == firstParam, "INVALID_SIGNER");
        // @review implement call forwarding
        address target = _forwardTo;
        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := call(gas(), target, 0, calldatasize(), 0, 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
                case 0 {
                    revert(0, returndatasize())
                }
                default {
                    return(0, returndatasize())
                }
        }
    }
}
