//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {
    AccessControlUpgradeable,
    ContextUpgradeable
} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {IERC721NonTransferable} from "../common/interfaces/IERC721NonTransferable.sol";
import {ERC2771HandlerUpgradeable} from "../common/BaseWithStorage/ERC2771/ERC2771HandlerUpgradeable.sol";
import {IAuthValidator} from "../common/interfaces/IAuthValidator.sol";
import {StringsUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/StringsUpgradeable.sol";
import {
    EIP712Upgradeable,
    ECDSAUpgradeable
} from "@openzeppelin/contracts-upgradeable/utils/cryptography/draft-EIP712Upgradeable.sol";

/// @title This contract is for a NON-TRANSFERABLE KYCERC721 token which can be minted via Claiming with EIP712.
/// @dev The following roles are used in this contract: DEFAULT_ADMIN_ROLE, KYC_ROLE.
/// @dev KYCERC721 will be minted only on L2.
/// @dev This contract is final, don't inherit from it.
contract KYCERC721 is
    EIP712Upgradeable,
    AccessControlUpgradeable,
    ERC721Upgradeable,
    ERC2771HandlerUpgradeable,
    IERC721NonTransferable
{
    using StringsUpgradeable for uint256;

    bytes32 public constant KYC_TYPEHASH = keccak256("KYC(address to)");

    uint256[50] private __gap1; // In case

    struct ClaimKYCToken {
        address to;
        bytes signature;
        bytes backendSignature;
    }

    uint256 public tokenId;

    // Roles
    bytes32 public constant KYC_ROLE = keccak256("KYC_ROLE");

    string internal _baseTokenURI;

    IAuthValidator public _authValidator;

    // solhint-disable-next-line no-empty-blocks
    constructor() initializer {}

    /// @notice fulfills the purpose of a constructor in upgradeable contracts
    function initialize(
        address sandAdmin,
        address kycAdmin,
        address trustedForwarder,
        address authValidator,
        string memory uri
    ) public initializer {
        _grantRole(DEFAULT_ADMIN_ROLE, sandAdmin);
        _grantRole(KYC_ROLE, kycAdmin);
        __ERC721_init("Sandbox's KYC ERC721", "KYC");
        __EIP712_init("Sandbox KYC Token", "1.0");
        __ERC2771Handler_initialize(trustedForwarder);
        _authValidator = IAuthValidator(authValidator);
        _baseTokenURI = uri;
    }

    // Modifier for checking backend signature
    modifier isAuthValid(bytes memory signature, bytes32 hashedData) {
        require(_authValidator.isAuthValid(signature, hashedData), "INVALID_AUTH");
        _;
    }

    /// @notice Claim KYC token using EIP712
    /// @dev This function checks the backendSignature as well as the user signature
    /// @dev Users can only claim their own token
    /// @param input ClaimKYCToken
    /// @return tokenId tokenId that has been minted
    function claimKYCToken(ClaimKYCToken memory input)
        external
        isAuthValid(input.backendSignature, _hashBackendSig(input.to))
        returns (uint256)
    {
        _ensureCorrectSigner(input.signature, input.to);
        return _mintKYCToken(input.to);
    }

    /// @notice Creates a new token for `to`.
    /// @dev Minting is only permitted to KYC_ROLE.
    /// @param to The address that will receive the new token.
    /// @return tokenId tokenId that has been minted.
    function mint(address to) public override(IERC721NonTransferable) onlyRole(KYC_ROLE) returns (uint256) {
        return _mintKYCToken(to);
    }

    /// @notice A distinct Uniform Resource Identifier (URI) for a given token.
    /// @param tokenId The tokenId to get the uri of.
    /// @return URI The token's full URI string.
    function tokenURI(uint256 tokenId) public view override(ERC721Upgradeable) returns (string memory) {
        require(ownerOf(tokenId) != address(0), "ZERO_ADDRESS");
        require(_exists(tokenId), "INVALID_TOKEN");
        string memory uri = _baseURI();
        return bytes(uri).length > 0 ? string(abi.encodePacked(uri, tokenId.toString())) : "";
    }

    /// @notice Set the base for the token URI.
    /// @dev It is intended that only admin may set the base token URI.
    /// @param uri The string for the base URI.
    function setBaseURI(string memory uri) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _baseTokenURI = uri;
    }

    /// @notice View the base for the token URI.
    function baseURI() external view returns (string memory) {
        return _baseURI();
    }

    /// @notice Query if a contract implements interface `id`.
    /// @param id the interface identifier, as specified in ERC-165.
    /// @return `true` if the contract implements `id`.
    function supportsInterface(bytes4 id)
        public
        view
        override(AccessControlUpgradeable, ERC721Upgradeable)
        returns (bool)
    {
        return super.supportsInterface(id);
    }

    /// @notice Query if token exists with `id`.
    /// @param id the token ID to query.
    /// @return `true` if the token already exists.
    function exists(uint256 id) public view returns (bool) {
        return _exists(id);
    }

    /// @notice Burns token with given `id`.
    /// @dev Intended that users can burn their own tokens.
    /// @param id The id of the token to be burned.
    function burn(uint256 id) public override(IERC721NonTransferable) {
        require(_msgSender() == ERC721Upgradeable.ownerOf(id), "NOT_OWNER");
        _burn(id);
    }

    /// @notice Burns token with given `id`.
    /// @dev Intended that admin with KYC_ROLE has the right to burn user tokens.
    /// @param from Address whose token is to be burned.
    /// @param id Token id which will be burned.
    function burnFrom(address from, uint256 id) public override(IERC721NonTransferable) onlyRole(KYC_ROLE) {
        require(from == ERC721Upgradeable.ownerOf(id), "NOT_OWNER");
        _burn(id);
    }

    /// @notice Function to get the last tokenId minted
    function getTokenIdCounter() public view returns (uint256) {
        return tokenId;
    }

    /// @notice Function to get the domain separator
    function domainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    /// @notice Function to get the chainId
    function getChainId() external view returns (uint256) {
        return block.chainid;
    }

    /// @notice Internal function for viewing the baseURI.
    /// @dev Overrides ERC721Upgradeable which returns "".
    function _baseURI() internal view override(ERC721Upgradeable) returns (string memory) {
        return _baseTokenURI;
    }

    /// @notice Modified _beforeTokenTransfer hook ensures tokens are non-transferable.
    /// @dev It is intended that tokens cannot be transferred after being minted, unless burned.
    /// @param _from owner of token id.
    /// @param _to intended recipient of token id.
    /// @param _tokenId the token id to be transferred.
    function _beforeTokenTransfer(
        address _from,
        address _to,
        uint256 _tokenId
    ) internal override(ERC721Upgradeable) {
        require(_from == address(0) || _to == address(0), "NOT_TRANSFERABLE");
        super._beforeTokenTransfer(_from, _to, _tokenId);
    }

    /// @notice Internal function to mint the KYC token
    /// @dev The recipient must have a balance of 0 in order for minting to work
    /// @dev No need to pass a tokenId, the tokenId counter is used
    /// @return tokenId tokenId that has been minted
    function _mintKYCToken(address to) internal returns (uint256) {
        require(balanceOf(to) == 0, "KYCERC721_ISSUED");
        _safeMint(to, ++tokenId);
        return tokenId;
    }

    /// @notice Internal function to ensure the user has signed the message
    /// @dev The user must be the sender as well as the intended recipient of the token
    function _ensureCorrectSigner(bytes memory signature, address to) internal view {
        bytes32 digest = _hashSig(to);
        address signer = ECDSAUpgradeable.recover(digest, signature);
        require(signer == _msgSender(), "NOT_SENDER");
        require(signer == to, "NOT_TO");
    }

    /// @notice Internal function using ECDSAUpgradeable to create a digest
    function _hashSig(address to) internal view returns (bytes32) {
        return _hashTypedDataV4(keccak256(abi.encode(KYC_TYPEHASH, to)));
    }

    /// @notice Internal function using ECDSAUpgradeable to create a digest
    function _hashBackendSig(address to) internal pure returns (bytes32) {
        return keccak256(abi.encode(KYC_TYPEHASH, to));
    }

    /// @dev this override is required; two or more base classes define function
    function _msgSender()
        internal
        view
        override(ContextUpgradeable, ERC2771HandlerUpgradeable)
        returns (address sender)
    {
        return ERC2771HandlerUpgradeable._msgSender();
    }

    /// @dev this override is required; two or more base classes define function
    function _msgData() internal view override(ContextUpgradeable, ERC2771HandlerUpgradeable) returns (bytes calldata) {
        return ERC2771HandlerUpgradeable._msgData();
    }

    uint256[50] private __gap2; // In case
}
