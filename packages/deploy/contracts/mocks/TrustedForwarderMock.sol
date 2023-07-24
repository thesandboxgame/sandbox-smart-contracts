//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

contract TrustedForwarderMock {

    struct ForwardRequest {
        address from;
        address to;
        uint256 value;
        uint256 gas;
        uint256 nonce;
        bytes data;
    }

    function execute(ForwardRequest calldata req, bytes calldata)
    public
    payable
    returns (bool, bytes memory)
    {
        (bool success, bytes memory returndata) =
        req.to.call{gas : req.gas, value : req.value}(abi.encodePacked(req.data, req.from));
        assert(gasleft() > req.gas / 63);
        return (success, returndata);
    }
}
