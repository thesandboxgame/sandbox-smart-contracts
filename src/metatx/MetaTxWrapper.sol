pragma solidity 0.6.5;

import "./BaseRelayRecipient.sol";
import "@nomiclabs/buidler/console.sol";


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
        // @review delete all console logs
        console.logBytes(msg.data);
        address firstParam = abi.decode(msg.data[4:], (address));
        console.log("msg.sender: ", msg.sender);
        console.log("signer: ", signer);
        console.log("firstParam: ", firstParam);
        require(signer == firstParam, "INVALID_SIGNER");
        address target = _forwardTo;
        (bool success, ) = target.call{value: msg.value}(msg.data);
        require(success, "FORWARDED_CALL_FAILED");
    }
}
