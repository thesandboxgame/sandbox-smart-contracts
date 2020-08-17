pragma solidity 0.6.5;

import "./BaseRelayRecipient.sol";
import "@nomiclabs/buidler/console.sol";


contract MetaTxWrapper is BaseRelayRecipient {
    address internal immutable _forwardTo;

    constructor(address trusted_Forwarder, address forwardTo) public {
        _forwardTo = forwardTo;
        trustedForwarder = trusted_Forwarder;
    }

    fallback() external trustedForwarderOnly() {
        // bytes memory data = msg.data;
        uint256 length = msg.data.length;
        // retrieve the msg sender as per EIP-2771
        address signer = _msgSender();

        // uint256 firstParam;
        // assembly {
        //     firstParam := and(mload(data), 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff)
        // }
        // @review delete all console logs
        console.logBytes(msg.data);
        address firstParam = abi.decode(msg.data[4:], (address));
        console.log("msg.sender: ", msg.sender);
        console.log("signer: ", signer);
        console.log("firstParam: ", firstParam);
        require(signer == firstParam, "INVALID_SIGNER");
        address target = _forwardTo;
        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := call(gas(), target, 0, calldatasize(), 0x0, 0, 0x0)
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
