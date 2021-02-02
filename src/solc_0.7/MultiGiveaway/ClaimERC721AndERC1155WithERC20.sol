//SPDX-License-Identifier: MIT
pragma solidity 0.7.5;

import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../common/Interfaces/IERC721Extended.sol";

contract ClaimMultipleTokens {
    event ClaimedMultipleTokens(
        address to,
        uint256[] assetIds,
        uint256[] assetValues,
        address[] assetContractAddresses,
        uint256[] landIds,
        address[] landContractAddresses,
        uint256[] erc20Amounts,
        address[] erc20ContractAddresses
    );

    // constructor() {}

    /// @dev TODO.
    function _claimMultipleTokens(
        address to,
        uint256[] calldata assetIds,
        uint256[] calldata assetValues,
        address[] calldata assetContractAddresses,
        uint256[] calldata landIds,
        address[] calldata landContractAddresses,
        uint256[] calldata erc20Amounts,
        address[] calldata erc20ContractAddresses,
        bytes32[] calldata proof,
        bytes32 salt
    ) internal {
        _checkValidity(
            to,
            assetIds,
            assetValues,
            assetContractAddresses,
            landIds,
            landContractAddresses,
            erc20Amounts,
            erc20ContractAddresses,
            proof,
            salt
        );

        // TODO: for each
        _sendAssets(to, assetIds, assetValues);
        _sendLands(to, landIds);
        _transferERC20(to, erc20Amount);
        emit ClaimedMultipleTokens(
            to,
            assetIds,
            assetValues,
            assetContractAddresses,
            landIds,
            landContractAddresses,
            erc20Amounts,
            erc20ContractAddresses
        );
    }

    function _checkValidity(
        address to,
        uint256[] memory assetIds,
        uint256[] memory assetValues,
        uint256[] memory landIds,
        uint256 erc20Amount,
        bytes32[] memory proof,
        bytes32 salt
    ) private view {
        require(assetIds.length == assetValues.length, "INVALID_INPUT");
        bytes32 leaf = _generateClaimHash(to, assetIds, assetValues, landIds, erc20Amount, salt);
        require(_verify(proof, leaf), "INVALID_CLAIM");
    }

    function _generateClaimHash(
        address to,
        uint256[] memory assetIds,
        uint256[] memory assetValues,
        uint256[] memory landIds,
        uint256 erc20Amount,
        bytes32 salt
    ) private pure returns (bytes32) {
        return keccak256(abi.encodePacked(to, assetIds, assetValues, landIds, erc20Amount, salt));
    }

    function _verify(bytes32[] memory proof, bytes32 leaf) private view returns (bool) {
        bytes32 computedHash = leaf;

        for (uint256 i = 0; i < proof.length; i++) {
            bytes32 proofElement = proof[i];

            if (computedHash < proofElement) {
                computedHash = keccak256(abi.encodePacked(computedHash, proofElement));
            } else {
                computedHash = keccak256(abi.encodePacked(proofElement, computedHash));
            }
        }

        return computedHash == _merkleRoot;
    }

    function _sendAssets(
        address to,
        uint256[] memory assetIds,
        uint256[] memory assetValues
    ) private {
        _asset.safeBatchTransferFrom(_assetsHolder, to, assetIds, assetValues, "");
    }

    function _sendLands(address to, uint256[] memory ids) private {
        _land.safeBatchTransferFrom(_landHolder, to, ids, "");
    }

    function _transferERC20(address to, uint256 erc20Amount) private {
        require(_erc20Token.transferFrom(_erc20TokenHolder, to, erc20Amount), "ERC20_TRANSFER_FAILED");
    }
}
