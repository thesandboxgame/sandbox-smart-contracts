pragma solidity 0.6.5;


interface ERC1654 {
    /**
     * @dev Should return whether the signature provided is valid for the provided hash
     * @param hash 32 bytes hash to be signed
     * @param signature Signature byte array associated with hash
     * @return magicValue 0x1626ba7e if valid else 0x00000000
     */
    function isValidSignature(bytes32 hash, bytes calldata signature) external view returns (bytes4 magicValue);
}
