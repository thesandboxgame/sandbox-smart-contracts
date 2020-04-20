pragma solidity 0.5.9;

import {
    ProxyImplementation
} from "../../../contracts_common/src/BaseWithStorage/ProxyImplementation.sol";

// from https://github.com/ricmoo/ethers-airdrop/blob/master/AirDropToken.sol
// https://blog.ricmoo.com/merkle-air-drops-e6406945584d
contract ERC20MerkleDropExtension is ProxyImplementation {
    bytes32 rootHash;
    mapping(uint256 => uint256) redeemed;

    function initMerkleDrop(bytes32 _rootHash) public phase("merkleDrop") {
        rootHash = _rootHash;
    }

    function isRedeemed(uint256 _index) public view returns (bool _redeemed) {
        uint256 redeemedBlock = redeemed[_index / 256];
        uint256 redeemedMask = (uint256(1) << uint256(_index % 256));
        return ((redeemedBlock & redeemedMask) != 0);
    }

    function redeemPackage(
        uint256 _index,
        address _recipient,
        uint256 _amount,
        bytes32[] calldata _merkleProof
    ) external {
        // Make sure this package has not already been claimed (and claim it)
        uint256 redeemedBlock = redeemed[_index / 256];
        uint256 redeemedMask = (uint256(1) << uint256(_index % 256));
        require((redeemedBlock & redeemedMask) == 0);
        redeemed[_index / 256] = redeemedBlock | redeemedMask;

        // Compute the merkle root
        bytes32 node = keccak256(abi.encodePacked(_index, _recipient, _amount));
        uint256 path = _index;
        for (uint16 i = 0; i < _merkleProof.length; i++) {
            if ((path & 0x01) == 1) {
                node = keccak256(abi.encodePacked(_merkleProof[i], node));
            } else {
                node = keccak256(abi.encodePacked(node, _merkleProof[i]));
            }
            path /= 2;
        }

        // Check the merkle proof
        require(node == rootHash);

        // Redeem!
        _mint(_recipient, _amount); // this increase the totalSupply
    }

    function _mint(address _to, uint256 _amount) internal;
}
