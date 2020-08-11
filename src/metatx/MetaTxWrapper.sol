pragma solidity 0.6.5;

import "./BaseRelayRecipient.sol";


contract MetaTxWrapper is BaseRelayRecipient {
    address internal immutable _forwardTo;

    constructor(address forwarder, address forwardTo) public {
        _forwardTo = forwardTo;
        _forwarder = forwarder;
    }

    fallback() external {
        require(msg.sender == _forwarder, "can only be called by a forwarder");
        bytes memory data = msg.data;
        uint256 length = msg.data.length;

        address signer;
        assembly {
            signer := and(mload(sub(add(data, length), 0x00)), 0xffffffffffffffffffffffffffffffffffffffff)
        }

        uint256 firstParam;
        assembly {
            firstParam := and(mload(data), 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff)
        }
        require(uint256(signer) == firstParam, "firstParam is not signer");

        /*
        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := call(gas(), _forwardTo, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
                case 0 {
                    revert(0, returndatasize())
                }
                default {
                    return(0, returndatasize())
                }
        }
        */
    }
}
