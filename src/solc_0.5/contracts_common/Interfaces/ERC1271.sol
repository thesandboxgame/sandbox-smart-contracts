pragma solidity ^0.5.2;

contract ERC1271 {

    /**
    * @dev Should return whether the signature provided is valid for the provided data
    * @param data Arbitrary length data signed on the behalf of address(this)
    * @param signature Signature byte array associated with _data
    *
    * MUST return the bytes4 magic value 0x20c13b0b when function passes.
    * MUST NOT modify state (using STATICCALL for solc < 0.5, view modifier for solc > 0.5)
    * MUST allow external calls
    */
    function isValidSignature(bytes memory data, bytes memory signature)
        public
        view
        returns (bytes4 magicValue);
}
