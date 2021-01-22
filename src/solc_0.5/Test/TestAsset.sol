pragma solidity 0.5.9;

import "../Asset/ERC1155ERC721.sol";

contract TestAsset is ERC1155ERC721 {
    function test() external pure returns (string memory) {
        return "hello";
    }
}
