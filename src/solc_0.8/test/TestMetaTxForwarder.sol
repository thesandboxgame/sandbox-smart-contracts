//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

import "@openzeppelin/contracts-0.8/utils/cryptography/ECDSA.sol";
import "./TestEIP712.sol";

// @note !!! For Testing Only !!!
// Based on https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/metatx/ERC2771Context.sol
contract TestMetaTxForwarder is EIP712 {
    using ECDSA for bytes32;
    event TXResult(bool success, bytes returndata);

    struct ForwardRequest {
        address from;
        address to;
        uint256 value;
        uint256 gas;
        uint256 nonce;
        bytes data;
    }

    bytes32 private constant TYPEHASH =
        keccak256("ForwardRequest(address from,address to,uint256 value,uint256 gas,uint256 nonce,bytes data)");

    mapping(address => uint256) private _nonces;

    // solhint-disable no-empty-blocks
    constructor() EIP712("The Sandbox", "1") {}

    // solhint-enable no-empty-blocks

    function getNonce(address from) public view returns (uint256) {
        return _nonces[from];
    }

    function verify(ForwardRequest calldata req, bytes calldata signature) public view returns (bool) {
        address signer =
            _hashTypedDataV4(
                keccak256(abi.encode(TYPEHASH, req.from, req.to, req.value, req.gas, req.nonce, keccak256(req.data)))
            )
                .recover(signature);
        return _nonces[req.from] == req.nonce && signer == req.from;
    }

    function execute(ForwardRequest calldata req, bytes calldata signature)
        public
        payable
        returns (bool, bytes memory)
    {
        require(verify(req, signature), "MinimalForwarder: signature does not match request");
        _nonces[req.from] = req.nonce + 1;

        // solhint-disable avoid-low-level-calls
        (bool success, bytes memory returndata) =
            req.to.call{gas: req.gas, value: req.value}(abi.encodePacked(req.data, req.from));
        // Validate that the relayer has sent enough gas for the call.
        // See https://ronan.eth.link/blog/ethereum-gas-dangers/
        assert(gasleft() > req.gas / 63);
        emit TXResult(success, returndata);
        // solhint-enable avoid-low-level-calls
        return (success, returndata);
    }
}
