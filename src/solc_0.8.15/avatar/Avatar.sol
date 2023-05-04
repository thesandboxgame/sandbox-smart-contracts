// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import { OwnableUpgradeable } from "openzeppelin-upgradeable/access/OwnableUpgradeable.sol";
import { ReentrancyGuardUpgradeable } from "openzeppelin-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import { AccessControlUpgradeable, ContextUpgradeable } from "openzeppelin-upgradeable/access/AccessControlUpgradeable.sol";
// import { UpdatableOperatorFiltererUpgradeable } from "operator-filter-registry/upgradeable/UpdatableOperatorFiltererUpgradeable.sol";
import { CollectionAccessControlRules } from "./CollectionAccessControlRules.sol";
import { CollectionStateManagement } from "./CollectionStateManagement.sol";

import { ERC2771HandlerUpgradeable } from "../common/BaseWithStorage/ERC2771/ERC2771HandlerUpgradeable.sol";

import {
    ERC721BurnMemoryEnumerableUpgradeable,
    ERC721EnumerableUpgradeable,
    ERC721Upgradeable,
    IERC721Upgradeable
    } from "./ERC721BurnMemoryEnumerableUpgradeable.sol";

contract Avatar is CollectionAccessControlRules, ReentrancyGuardUpgradeable, ERC721BurnMemoryEnumerableUpgradeable, CollectionStateManagement, ERC2771HandlerUpgradeable
// , UpdatableOperatorFiltererUpgradeable
    {

    /**
     * @notice Event emitted when the contract was initialized.
     * @dev emitted at proxy startup, once only
     * @param baseURI an URI that will be used as the base for token URI
     * @param _name name of the ERC721 token
     * @param _symbol token symbol of the ERC721 token
     * @param _sandOwner address belonging to SAND token owner
     * @param _signAddress signer address that is allowed to mint
     * @param _maxSupply max supply of tokens to be allowed to be minted per contract
     * @param _registry filter registry to which to register with. For blocking operators that do not respect royalties
     * @param _operatorFiltererSubscription subscription address to use as a template for
     * @param _operatorFiltererSubscriptionSubscribe if to subscribe tot the operatorFiltererSubscription address or
     *                                               just copy entries from it
     */
    event ContractInitialized(
        string baseURI,
        string _name,
        string _symbol,
        address _sandOwner,
        address _signAddress,
        uint256 _maxSupply,
        address _registry,
        address _operatorFiltererSubscription,
        bool _operatorFiltererSubscriptionSubscribe
    );

    /**
     * @notice Event emitted when the base token URI for the contract was set or changed
     * @dev emitted when setBaseURI is called
     * @param baseURI an URI that will be used as the base for token URI
     */
    event BaseURISet(string baseURI);

    /// @notice max token supply
    uint256 public maxSupply;
    string public baseTokenURI;
    address public allowedToExecuteMint;
    address public sandOwner;
    address public signAddress;

    bytes32 public constant ADMIN = keccak256("ADMIN");
    bytes32 public constant CONFIGURATOR = keccak256("CONFIGURATOR");
    bytes32 public constant TRANSFORMER = keccak256("TRANSFORMER");


    /*//////////////////////////////////////////////////////////////
                           Constructor / Initializers
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice mitigate a possible Implementation contract takeover, as indicate by
     *         https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable#initializing_the_implementation_contract
     */
    constructor() {
        _disableInitializers();
    }

    function __AvatarCollection_init(
        address _collectionOwner,
        string memory _initialBaseURI,
        string memory _name,
        string memory _symbol,
        address payable _sandOwner,
        address _signAddress,
        address _initialTrustedForwarder,
        address _registry,
        address _operatorFiltererSubscription,
        bool _operatorFiltererSubscriptionSubscribe,
        uint256 _maxSupply) internal onlyInitializing {

        require(bytes(_initialBaseURI).length != 0, "BaseURI is not set");
        require(bytes(_name).length != 0, "Name cannot be empty");
        require(bytes(_symbol).length != 0, "Symbol cannot be empty");
        require(_signAddress != address(0x0), "Sign address is zero address");
        require(_initialTrustedForwarder != address(0x0), "Trusted forwarder is zero address");
        require(_sandOwner != address(0x0), "Sand owner is zero address");
        require(_maxSupply > 0, "Max supply should be more than 0");

        baseTokenURI = _initialBaseURI;

        __ERC2771Handler_initialize(_initialTrustedForwarder);
        __ERC721_init(_name, _symbol);
        __ReentrancyGuard_init();

        __InitializeAccessControl(_collectionOwner);

        // __UpdatableOperatorFiltererUpgradeable_init(
        //     _registry,
        //     _operatorFiltererSubscription,
        //     _operatorFiltererSubscriptionSubscribe
        // );

        sandOwner = _sandOwner;
        signAddress = _signAddress;
        maxSupply = _maxSupply;


        emit ContractInitialized(
            _initialBaseURI,
            _name,
            _symbol,
            _sandOwner,
            _signAddress,
            _maxSupply,
            _registry,
            _operatorFiltererSubscription,
            _operatorFiltererSubscriptionSubscribe
        );
    }

    function initialize(
        address _collectionOwner,
        string memory _initialBaseURI,
        string memory _name,
        string memory _symbol,
        address payable _sandOwner,
        address _signAddress,
        address _initialTrustedForwarder,
        address _registry,
        address _operatorFiltererSubscription,
        bool _operatorFiltererSubscriptionSubscribe,
        uint256 _maxSupply
    ) external virtual initializer {
        __AvatarCollection_init(
            _collectionOwner,
            _initialBaseURI,
            _name,
            _symbol,
            _sandOwner,
            _signAddress,
            _initialTrustedForwarder,
            _registry,
            _operatorFiltererSubscription,
            _operatorFiltererSubscriptionSubscribe,
            _maxSupply
        );
    }


    /*//////////////////////////////////////////////////////////////
                    External and public functions
    //////////////////////////////////////////////////////////////*/

    function setBaseURI(string memory baseURI) public authorizedRole(CONFIGURATOR) {
        require(bytes(baseURI).length != 0, "Avatar: baseURI is not set");
        baseTokenURI = baseURI;
        emit BaseURISet(baseURI);
    }

    function changeState(State state)
        public
        override
        authorizedRole(CONFIGURATOR)
    {
        super.changeState(state);
    }

    /**
     * @notice ERC2771 compatible msg.data getter
     * @dev returns ERC2771HandlerUpgradeable._msgData()
     * @return msg.data
     */
    function _msgData() internal view override(ContextUpgradeable, ERC2771HandlerUpgradeable) returns (bytes calldata) {
        return ERC2771HandlerUpgradeable._msgData();
    }

    /**
     * @notice ERC2771 compatible msg.sender getter
     * @dev returns ERC2771HandlerUpgradeable._msgSender()
     * @return sender msg.sender
     */
    function _msgSender()
        internal
        view
        override(ContextUpgradeable, ERC2771HandlerUpgradeable)
        returns (address sender)
    {
        return ERC2771HandlerUpgradeable._msgSender();
    }

    // /**
    //  * @dev See OpenZeppelin {IERC721-setApprovalForAll}
    //  */
    // function setApprovalForAll(address operator, bool approved)
    //     public
    //     override(ERC721Upgradeable, IERC721Upgradeable)
    //     onlyAllowedOperatorApproval(operator)
    // {
    //     super.setApprovalForAll(operator, approved);
    // }

    // /**
    //  * @dev See OpenZeppelin {IERC721-approve}
    //  */
    // function approve(address operator, uint256 tokenId)
    //     public
    //     override(ERC721Upgradeable, IERC721Upgradeable)
    //     onlyAllowedOperatorApproval(operator)
    // {
    //     super.approve(operator, tokenId);
    // }

    // /**
    //  * @dev See OpenZeppelin {IERC721-transferFrom}
    //  */
    // function transferFrom(
    //     address from,
    //     address to,
    //     uint256 tokenId
    // ) public override(ERC721Upgradeable, IERC721Upgradeable) onlyAllowedOperator(from) {
    //     super.transferFrom(from, to, tokenId);
    // }

    // /**
    //  * @dev See OpenZeppelin {IERC721-safeTransferFrom}
    //  */
    // function safeTransferFrom(
    //     address from,
    //     address to,
    //     uint256 tokenId
    // ) public override(ERC721Upgradeable, IERC721Upgradeable) onlyAllowedOperator(from) {
    //     super.safeTransferFrom(from, to, tokenId);
    // }

    // /**
    //  * @dev See OpenZeppelin {IERC721-safeTransferFrom}
    //  */
    // function safeTransferFrom(
    //     address from,
    //     address to,
    //     uint256 tokenId,
    //     bytes memory data
    // ) public override(ERC721Upgradeable, IERC721Upgradeable) onlyAllowedOperator(from) {
    //     super.safeTransferFrom(from, to, tokenId, data);
    // }

    /*//////////////////////////////////////////////////////////////
                           View functions
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice get base TokenURI
     * @dev returns baseTokenURI
     * @return baseTokenURI
     */
    function _baseURI() internal view virtual override returns (string memory) {
        return baseTokenURI;
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721EnumerableUpgradeable, AccessControlUpgradeable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

}
