pragma solidity 0.6.5;


contract MetaTxWrapper {
    address internal immutable _forwardTo;
    address internal immutable _trustedForwarder;

    /// @notice function to check if forwarder is trusted.
    /// @return bool
    function isTrustedForwarder(address forwarder) public returns (bool) {
        return forwarder == _trustedForwarder;
    }

    fallback() external {
        require(isTrustedForwarder(msg.sender), "UNTRUSTED_FORWARDER");
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

    /// @dev function to get the actual sender by fetching the last 20bytes
    /// @return signer address of signer
    function _msgSender() internal returns (address payable signer) {
        signer = msg.sender;
        if (isTrustedForwarder(signer)) {
            bytes memory data = msg.data;
            uint256 length = msg.data.length;
            assembly {
                signer := mload(add(data, length))
            }
        }
    }

    constructor(address trustedForwarder, address forwardTo) public {
        _forwardTo = forwardTo;
        _trustedForwarder = trustedForwarder;
    }
}
