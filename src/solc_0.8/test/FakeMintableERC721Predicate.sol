//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "../common/interfaces/IMintableERC721.sol";
import "../common/interfaces/IERC721TokenReceiver.sol";

/// @dev based on: @maticnetwork/pos-portal/contracts/root/TokenPredicates/MintableERC721Predicate.sol
/// @dev This is NOT a secure ERC721 Predicate contract implementation!
/// DO NOT USE in production.

contract FakeMintableERC721Predicate is IERC721TokenReceiver {
    /**
     * @notice Lock ERC721 token(s) for deposit, callable only by manager
     * @param depositor Address who wants to deposit token
     * @param rootToken Token which gets deposited
     * @param depositData ABI encoded tokenId(s). It's possible to deposit batch of tokens.
     */
    function lockTokens(
        address depositor,
        address rootToken,
        bytes calldata depositData
    ) external {
        // Locking single ERC721 token
        if (depositData.length == 32) {
            uint256 tokenId = abi.decode(depositData, (uint256));

            // Emitting event that single token is getting locked in predicate
            // emit LockedMintableERC721(depositor, depositReceiver, rootToken, tokenId);

            // Transferring token to this address, which will be
            // released when attempted to be unlocked
            IMintableERC721(rootToken).safeTransferFrom(depositor, address(this), tokenId);
        } else {
            // Locking a set a ERC721 token(s)

            uint256[] memory tokenIds = abi.decode(depositData, (uint256[]));

            // Emitting event that a set of ERC721 tokens are getting lockec
            // in this predicate contract
            // emit LockedMintableERC721Batch(depositor, depositReceiver, rootToken, tokenIds);

            // These many tokens are attempted to be deposited
            // by user
            uint256 length = tokenIds.length;
            // Iteratively trying to transfer ERC721 token
            // to this predicate address
            for (uint256 i; i < length; i++) {
                IMintableERC721(rootToken).safeTransferFrom(depositor, address(this), tokenIds[i]);
            }
        }
    }

    /**
     * @notice Validates log signature, from and to address
     * then checks if token already exists on root chain
     * if token exits then transfers it to withdrawer
     * if token doesn't exit then it is minted
     * callable only by manager
     */
    function exitTokens(
        address rootToken,
        address withdrawer,
        uint256 tokenId
    ) public {
        // If it's a simple exit ( with out metadata coming from L2 to L1 )
        IMintableERC721 token = IMintableERC721(rootToken);

        // topic3 is tokenId field
        if (token.exists(tokenId)) {
            token.safeTransferFrom(address(this), withdrawer, tokenId);
        } else {
            token.mint(withdrawer, tokenId);
        }
    }

    function exitTokens(
        address rootToken,
        address withdrawer,
        uint256[] calldata tokenIds
    ) public {
        // topic0 is event sig
        // If it's a simple batch exit, where a set of
        // ERC721s were burnt in child chain with event signature
        // looking like `WithdrawnBatch(address indexed user, uint256[] tokenIds);`
        //
        // @note This doesn't allow transfer of metadata cross chain
        // For that check below `else if` block
        // topic1 is from address

        uint256 length = tokenIds.length;
        IMintableERC721 token = IMintableERC721(rootToken);
        for (uint256 i; i < length; i++) {
            uint256 tokenId = tokenIds[i];

            // Check if token exists or not
            //
            // If does, transfer token to withdrawer
            if (token.exists(tokenId)) {
                token.safeTransferFrom(address(this), withdrawer, tokenId);
            } else {
                // If token was minted on L2
                // we'll mint it here, on L1, during
                // exiting from L2
                token.mint(withdrawer, tokenId);
            }
        }
    }

    function exitTokens(
        address rootToken,
        address withdrawer,
        uint256 tokenId,
        bytes calldata metadata
    ) public {
        // If this is NFT exit with metadata i.e. URI 👆
        //
        // Note: If your token is only minted in L2, you can exit
        // it with metadata. But if it was minted on L1, it'll be
        // simply transferred to withdrawer address. And in that case,
        // it's lot better to exit with `Transfer(address,address,uint256)`
        // i.e. calling `withdraw` method on L2 contract
        // event signature proof, which is defined under first `if` clause
        //
        // If you've called `withdrawWithMetadata`, you should submit
        // proof of event signature `TransferWithMetadata(address,address,uint256,bytes)`

        IMintableERC721 token = IMintableERC721(rootToken);

        // topic3 is tokenId field
        if (token.exists(tokenId)) {
            token.safeTransferFrom(address(this), withdrawer, tokenId);
        } else {
            token.mint(withdrawer, tokenId, metadata);
        }
    }

    /**
     * @notice accepts safe ERC721 transfer
     */
    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return IERC721TokenReceiver.onERC721Received.selector;
    }
}
