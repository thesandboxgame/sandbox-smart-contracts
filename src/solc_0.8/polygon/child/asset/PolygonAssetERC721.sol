//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {BaseERC721} from "../../../assetERC721/BaseERC721.sol";
import {IChildToken} from "../../../common/interfaces/pos-portal/child/IChildToken.sol";

/// @title This contract is for AssetERC721 which can be minted by a minter role.
/// @dev AssetERC721 will be minted only on L2 and can be transferred to L1 but not minted on L1.
/// @dev This contract supports meta transactions.
/// @dev This contract is final, don't inherit from it.
contract PolygonAssetERC721 is BaseERC721, IChildToken {
    event Deposit(address indexed from, uint256 tokenId);
    event DepositBatch(address indexed from, uint256[] tokenIds);
    event WithdrawnBatch(address indexed user, uint256[] tokenIds);
    event Withdrawn(address indexed user, uint256 tokenId);
    event Minted(address indexed user, uint256 tokenId);

    bytes32 public constant CHILD_MANAGER_ROLE = keccak256("CHILD_MANAGER_ROLE");

    // We only mint on L2, so we track tokens transferred to L1 to avoid minting them twice.
    mapping(uint256 => bool) public withdrawnTokens;

    /// @notice fulfills the purpose of a constructor in upgradeable contracts
    function initialize(address trustedForwarder, address admin) public initializer {
        _setupRole(DEFAULT_ADMIN_ROLE, admin);
        _trustedForwarder = trustedForwarder;
        __ERC721_init("Sandbox's ASSETs ERC721", "ASSETERC721");
    }

    /// @notice called when token is deposited on root chain
    /// @dev Should be callable only by ChildChainManager
    /// @dev Should handle deposit by minting the required tokenId(s) for user
    /// @dev Should set `withdrawnTokens` mapping to `false` for the tokenId being deposited
    /// @dev Minting can also be done by other functions
    /// @param user user address for whom deposit is being done
    /// @param depositData abi encoded tokenIds. Batch deposit also supported.
    function deposit(address user, bytes calldata depositData) external override onlyRole(CHILD_MANAGER_ROLE) {
        require(user != address(0x0), "INVALID_USER");
        if (depositData.length == 32) {
            // deposit single
            uint256 tokenId = abi.decode(depositData, (uint256));
            _deposit(user, tokenId);
            emit Deposit(user, tokenId);
        } else {
            // deposit batch
            uint256[] memory tokenIds = abi.decode(depositData, (uint256[]));
            for (uint256 i; i < tokenIds.length; i++) {
                _deposit(user, tokenIds[i]);
            }
            emit DepositBatch(user, tokenIds);
        }
    }

    /// @notice Withdraw tokens
    /// @param tokenId tokenId of the token to be withdrawn
    function withdraw(uint256 tokenId) public {
        _withdraw(tokenId);
        emit Withdrawn(_msgSender(), tokenId);
    }

    /// @notice called when user wants to withdraw multiple tokens back to root chain
    /// @dev Should burn user's tokens. This transaction will be verified when exiting on root chain
    /// @param tokenIds tokenId list to withdraw
    function withdrawBatch(uint256[] calldata tokenIds) external {
        // Iteratively burn ERC721 tokens, for performing batch withdraw
        for (uint256 i; i < tokenIds.length; i++) {
            _withdraw(tokenIds[i]);
        }
        // At last emit this event, which will be used
        // in MintableERC721 predicate contract on L1
        // while verifying burn proof
        emit WithdrawnBatch(_msgSender(), tokenIds);
    }

    /// @notice Creates a new token for `to`
    /// @param to The address that will receive a new token
    /// @dev Minting is only permitted to MINTER_ROLE
    /// @param id The id of the new token
    function mint(address to, uint256 id) external override onlyRole(MINTER_ROLE) {
        require(!withdrawnTokens[id], "TOKEN_EXISTS_ON_ROOT_CHAIN");
        _safeMint(to, id);
        emit Minted(to, id);
    }

    /// @notice Deposit tokens
    /// @param user The address for deposit
    /// @param tokenId The tokenId to mint to user's account
    function _deposit(address user, uint256 tokenId) internal {
        // We only accept tokens that were minted on L2, withdrawn and now came from L1
        require(withdrawnTokens[tokenId], "TOKEN_NOT_EXISTS_ON_ROOT_CHAIN");
        withdrawnTokens[tokenId] = false;
        _safeMint(user, tokenId);
    }

    /// @notice Withdraw tokens
    /// @param tokenId The tokenId of the token to be withdrawn
    function _withdraw(uint256 tokenId) internal {
        require(ownerOf(tokenId) == _msgSender(), "NOT_OWNER");
        withdrawnTokens[tokenId] = true;
        _burn(tokenId);
    }
}
