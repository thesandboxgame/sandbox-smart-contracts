//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "@openzeppelin/contracts-0.8/utils/Address.sol";
import "@openzeppelin/contracts-0.8/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts-0.8/token/ERC1155/IERC1155Receiver.sol";
import "../common/interfaces/IAssetERC721.sol";
import "../common/Libraries/ObjectLib32.sol";
import "../common/BaseWithStorage/WithSuperOperators.sol";
import "../asset/libraries/ERC1155ERC721Helper.sol";

// solhint-disable max-states-count
abstract contract AssetBaseERC1155 is WithSuperOperators, IERC1155 {
    using Address for address;
    using ObjectLib32 for ObjectLib32.Operations;
    using ObjectLib32 for uint256;

    bytes4 private constant ERC1155_IS_RECEIVER = 0x4e2312e0;
    bytes4 private constant ERC1155_RECEIVED = 0xf23a6e61;
    bytes4 private constant ERC1155_BATCH_RECEIVED = 0xbc197c81;

    mapping(address => uint256) private _numNFTPerAddress; // erc721
    mapping(uint256 => uint256) private _owners; // erc721
    mapping(address => mapping(uint256 => uint256)) private _packedTokenBalance; // erc1155
    mapping(address => mapping(address => bool)) private _operatorsForAll; // erc721 and erc1155
    mapping(uint256 => address) private _erc721operators; // erc721
    mapping(uint256 => bytes32) internal _metadataHash; // erc721 and erc1155
    mapping(uint256 => bytes) internal _rarityPacks; // rarity configuration per packs (2 bits per Asset) *DEPRECATED*
    mapping(uint256 => uint32) private _nextCollectionIndex; // extraction

    // @note : Deprecated.
    mapping(address => address) private _creatorship; // creatorship transfer // deprecated

    mapping(address => bool) private _bouncers; // the contracts allowed to mint

    // @note : Deprecated.
    mapping(address => bool) private _metaTransactionContracts;

    address private _bouncerAdmin;

    bool internal _init;

    bytes4 internal constant ERC165ID = 0x01ffc9a7;

    uint256 internal _initBits;
    address internal _predicate; // used in place of polygon's `PREDICATE_ROLE`

    uint8 internal _chainIndex; // modify this for l2

    address internal _trustedForwarder;

    IAssetERC721 public _assetERC721;

    uint256[20] private __gap;
    // solhint-enable max-states-count

    event BouncerAdminChanged(address indexed oldBouncerAdmin, address indexed newBouncerAdmin);
    event Bouncer(address indexed bouncer, bool indexed enabled);
    event Extraction(uint256 indexed id, uint256 indexed newId);
    event AssetERC721Set(IAssetERC721 indexed assetERC721);

    function init(
        address trustedForwarder,
        address admin,
        address bouncerAdmin,
        IAssetERC721 assetERC721,
        uint8 chainIndex
    ) public {
        // one-time init of bitfield's previous versions
        _checkInit(1);
        _admin = admin;
        _bouncerAdmin = bouncerAdmin;
        _assetERC721 = assetERC721;
        __ERC2771Handler_initialize(trustedForwarder);
        _chainIndex = chainIndex;
    }

    /// @notice Change the minting administrator to be `newBouncerAdmin`.
    /// @param newBouncerAdmin address of the new minting administrator.
    function changeBouncerAdmin(address newBouncerAdmin) external {
        require(_msgSender() == _bouncerAdmin, "!BOUNCER_ADMIN");
        require(newBouncerAdmin != address(0), "AssetBaseERC1155: new bouncer admin can't be zero address");
        emit BouncerAdminChanged(_bouncerAdmin, newBouncerAdmin);
        _bouncerAdmin = newBouncerAdmin;
    }

    /// @notice Enable or disable the ability of `bouncer` to mint tokens (minting bouncer rights).
    /// @param bouncer address that will be given/removed minting bouncer rights.
    /// @param enabled set whether the address is enabled or disabled as a minting bouncer.
    function setBouncer(address bouncer, bool enabled) external {
        require(_msgSender() == _bouncerAdmin, "!BOUNCER_ADMIN");
        _bouncers[bouncer] = enabled;
        emit Bouncer(bouncer, enabled);
    }

    /// @notice Transfers `value` tokens of type `id` from  `from` to `to`  (with safety call).
    /// @param from address from which tokens are transfered.
    /// @param to address to which the token will be transfered.
    /// @param id the token type transfered.
    /// @param value amount of token transfered.
    /// @param data aditional data accompanying the transfer.
    function _safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 value,
        bytes calldata data
    ) internal {
        require(to != address(0), "TO==0");
        require(from != address(0), "FROM==0");
        bool success = _transferFrom(from, to, id, value);
        if (success) {
            require(_checkOnERC1155Received(_msgSender(), from, to, id, value, data), "1155_TRANSFER_REJECTED");
        }
    }

    /// @notice Transfers `values` tokens of type `ids` from  `from` to `to` (with safety call).
    /// @dev call data should be optimized to order ids so packedBalance can be used efficiently.
    /// @param from address from which tokens are transfered.
    /// @param to address to which the token will be transfered.
    /// @param ids ids of each token type transfered.
    /// @param values amount of each token type transfered.
    /// @param data aditional data accompanying the transfer.
    function _safeBatchTransferFrom(
        address from,
        address to,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata data
    ) internal {
        require(ids.length == values.length, "MISMATCHED_ARR_LEN");
        require(to != address(0), "TO==0");
        require(from != address(0), "FROM==0");
        address msgSender = _msgSender();
        bool authorized = from == msgSender || isApprovedForAll(from, msgSender);

        _batchTransferFrom(from, to, ids, values, authorized);
        emit TransferBatch(msgSender, from, to, ids, values);
        require(_checkOnERC1155BatchReceived(msgSender, from, to, ids, values, data), "1155_TRANSFER_REJECTED");
    }

    /// @notice Enable or disable approval for `operator` to manage all `sender`'s tokens.
    /// @dev used for Meta Transaction (from metaTransactionContract).
    /// @param sender address which grant approval.
    /// @param operator address which will be granted rights to transfer all token owned by `sender`.
    /// @param approved whether to approve or revoke.
    function _setApprovalForAllFor(
        address sender,
        address operator,
        bool approved
    ) internal {
        require(sender == _msgSender() || _superOperators[_msgSender()], "!AUTHORIZED");
        _setApprovalForAll(sender, operator, approved);
    }

    /// @notice Returns the current administrator in charge of minting rights.
    /// @return the current minting administrator in charge of minting rights.
    function getBouncerAdmin() external view returns (address) {
        return _bouncerAdmin;
    }

    /// @notice check whether address `who` is given minting bouncer rights.
    /// @param who The address to query.
    /// @return whether the address has minting rights.
    function isBouncer(address who) public view returns (bool) {
        return _bouncers[who];
    }

    /// @notice Get the balance of `owners` for each token type `ids`.
    /// @param owners the addresses of the token holders queried.
    /// @param ids ids of each token type to query.
    /// @return the balance of each `owners` for each token type `ids`.
    function balanceOfBatch(address[] calldata owners, uint256[] calldata ids)
        external
        view
        override
        returns (uint256[] memory)
    {
        require(owners.length == ids.length, "ARG_LENGTH_MISMATCH");
        uint256[] memory balances = new uint256[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            balances[i] = balanceOf(owners[i], ids[i]);
        }
        return balances;
    }

    /// @notice A descriptive name for the collection of tokens in this contract.
    /// @return _name the name of the tokens.
    function name() external pure returns (string memory _name) {
        return "Sandbox's ASSETs";
    }

    /// @notice An abbreviated name for the collection of tokens in this contract.
    /// @return _symbol the symbol of the tokens.
    function symbol() external pure returns (string memory _symbol) {
        return "ASSET";
    }

    /// @notice Query if a contract implements interface `id`.
    /// @param id the interface identifier, as specified in ERC-165.
    /// @return `true` if the contract implements `id`.
    function supportsInterface(bytes4 id) external pure override returns (bool) {
        return
            id == 0x01ffc9a7 || //ERC165
            id == 0xd9b67a26 || // ERC1155
            id == 0x0e89341c || // ERC1155 metadata
            id == 0x572b6c05; // ERC2771
    }

    /// Collection methods for ERC721s extracted from an ERC1155 -----------------------------------------------------

    /// @notice Gives the collection a specific token belongs to.
    /// @param id the token to get the collection of.
    /// @return the collection the NFT is part of.
    function collectionOf(uint256 id) public view returns (uint256) {
        require(doesHashExist(id), "INVALID_ID"); // Note: doesHashExist must track ERC721s
        uint256 collectionId = id & ERC1155ERC721Helper.NOT_NFT_INDEX & ERC1155ERC721Helper.NOT_IS_NFT;
        require(doesHashExist(collectionId), "UNMINTED_COLLECTION");
        return collectionId;
    }

    /// @notice Return wether the id is a collection
    /// @param id collectionId to check.
    /// @return whether the id is a collection.
    function isCollection(uint256 id) external view returns (bool) {
        uint256 collectionId = id & ERC1155ERC721Helper.NOT_NFT_INDEX & ERC1155ERC721Helper.NOT_IS_NFT;
        return doesHashExist(collectionId);
    }

    /// @notice Gives the index at which an NFT was minted in a collection : first of a collection get the zero index.
    /// @param id the token to get the index of.
    /// @return the index/order at which the token `id` was minted in a collection.
    function collectionIndexOf(uint256 id) external view returns (uint256) {
        collectionOf(id); // this check if id and collection indeed was ever minted
        return uint24((id & ERC1155ERC721Helper.NFT_INDEX) >> ERC1155ERC721Helper.NFT_INDEX_OFFSET);
    }

    /// end collection methods ---------------------------------------------------------------------------------------

    /// @notice Whether or not an ERC1155 or ERC721 tokenId has a valid structure and the metadata hash exists.
    /// @param id the token to check.
    /// @return bool whether a given id has a valid structure.
    /// @dev if IS_NFT > 0 then PACK_NUM_FT_TYPES may be 0
    function doesHashExist(uint256 id) public view returns (bool) {
        return (((id & ERC1155ERC721Helper.PACK_INDEX) <=
            ((id & ERC1155ERC721Helper.PACK_NUM_FT_TYPES) / ERC1155ERC721Helper.PACK_NUM_FT_TYPES_OFFSET_MULTIPLIER)) &&
            _metadataHash[id & ERC1155ERC721Helper.URI_ID] != 0);
    }

    /// @notice A distinct Uniform Resource Identifier (URI) for a given ERC1155 asset.
    /// @param id ERC1155 token to get the uri of.
    /// @return URI string
    function uri(uint256 id) public view returns (string memory) {
        require(doesHashExist(id), "INVALID_ID"); // prevent returning invalid uri
        return ERC1155ERC721Helper.toFullURI(_metadataHash[id & ERC1155ERC721Helper.URI_ID], id);
    }

    /// @notice Get the balance of `owner` for the token type `id`.
    /// @param owner The address of the token holder.
    /// @param id the token type of which to get the balance of.
    /// @return the balance of `owner` for the token type `id`.
    function balanceOf(address owner, uint256 id) public view override returns (uint256) {
        require(doesHashExist(id), "INVALID_ID");
        (uint256 bin, uint256 index) = id.getTokenBinIndex();
        return _packedTokenBalance[owner][bin].getValueInBin(index);
    }

    /// @notice Extracts an EIP-721 Asset from an EIP-1155 Asset.
    /// @dev Extraction is limited to bouncers.
    /// @param sender address which own the token to be extracted.
    /// @param id the token type to extract from.
    /// @param to address which will receive the token.
    /// @return newId the id of the newly minted NFT.
    function extractERC721From(
        address sender,
        uint256 id,
        address to
    ) external returns (uint256) {
        require(sender == _msgSender() || isApprovedForAll(sender, _msgSender()), "!AUTHORIZED");
        require(isBouncer(_msgSender()), "!BOUNCER");
        require(to != address(0), "TO==0");
        require(id & ERC1155ERC721Helper.IS_NFT == 0, "UNIQUE_ERC1155");
        uint24 tokenCollectionIndex = uint24(_nextCollectionIndex[id]) + 1;
        _nextCollectionIndex[id] = tokenCollectionIndex;
        string memory metaData = uri(id);
        uint256 newId =
            id +
                ERC1155ERC721Helper.IS_NFT_OFFSET_MULTIPLIER + // newId is always an NFT; IS_NFT is 1
                (tokenCollectionIndex) *
                2**ERC1155ERC721Helper.NFT_INDEX_OFFSET; // uint24 nft index
        _burnFT(sender, id, 1);
        _assetERC721.mint(to, newId, bytes(abi.encode(metaData)));
        emit Extraction(id, newId);
        return newId;
    }

    /// @notice Set the ERC721 contract.
    /// @param assetERC721 the contract address to set the ERC721 contract to.
    /// @return true if the operation completes successfully.
    function setAssetERC721(IAssetERC721 assetERC721) external returns (bool) {
        require(_admin == _msgSender(), "!AUTHORIZED");
        _assetERC721 = assetERC721;
        emit AssetERC721Set(assetERC721);
        return true;
    }

    /// @notice Queries the approval status of `operator` for owner `owner`.
    /// @param owner the owner of the tokens.
    /// @param operator address of authorized operator.
    /// @return isOperator true if the operator is approved, false if not.
    function isApprovedForAll(address owner, address operator)
        public
        view
        override(IERC1155)
        returns (bool isOperator)
    {
        require(owner != address(0), "OWNER==0");
        require(operator != address(0), "OPERATOR==0");
        return _operatorsForAll[owner][operator] || _superOperators[operator];
    }

    /// @notice Queries the chainIndex that a token was minted on originally.
    /// @param id the token id to query.
    /// @return chainIndex the chainIndex that the token was minted on originally.
    /// @dev take care not to confuse chainIndex with chain ID.
    function getChainIndex(uint256 id) external pure returns (uint256) {
        return uint8((id & ERC1155ERC721Helper.CHAIN_INDEX) / ERC1155ERC721Helper.CHAIN_INDEX_OFFSET_MULTIPLIER);
    }

    function __ERC2771Handler_initialize(address forwarder) internal {
        _trustedForwarder = forwarder;
    }

    function isTrustedForwarder(address forwarder) public view returns (bool) {
        return forwarder == _trustedForwarder;
    }

    function getTrustedForwarder() external view returns (address) {
        return _trustedForwarder;
    }

    function _msgSender() internal view virtual returns (address sender) {
        if (isTrustedForwarder(msg.sender)) {
            // The assembly code is more direct than the Solidity version using `abi.decode`.
            // solhint-disable-next-line no-inline-assembly
            assembly {
                sender := shr(96, calldataload(sub(calldatasize(), 20)))
            }
        } else {
            return msg.sender;
        }
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        if (isTrustedForwarder(msg.sender)) {
            return msg.data[:msg.data.length - 20];
        } else {
            return msg.data;
        }
    }

    function _setApprovalForAll(
        address sender,
        address operator,
        bool approved
    ) internal {
        require(sender != address(0), "SENDER==0");
        require(sender != operator, "SENDER==OPERATOR");
        require(operator != address(0), "OPERATOR==0");
        require(!_superOperators[operator], "APPR_EXISTING_SUPEROPERATOR");
        _operatorsForAll[sender][operator] = approved;
        emit ApprovalForAll(sender, operator, approved);
    }

    /* solhint-disable code-complexity */
    function _batchTransferFrom(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values,
        bool authorized
    ) internal {
        uint256 numItems = ids.length;
        uint256 bin;
        uint256 index;
        uint256 balFrom;
        uint256 balTo;

        uint256 lastBin;
        require(authorized, "OPERATOR_!AUTH");

        for (uint256 i = 0; i < numItems; i++) {
            if (from == to) {
                _checkEnoughBalance(from, ids[i], values[i]);
            } else if (values[i] > 0) {
                (bin, index) = ids[i].getTokenBinIndex();
                if (lastBin == 0) {
                    lastBin = bin;
                    balFrom = ObjectLib32.updateTokenBalance(
                        _packedTokenBalance[from][bin],
                        index,
                        values[i],
                        ObjectLib32.Operations.SUB
                    );
                    balTo = ObjectLib32.updateTokenBalance(
                        _packedTokenBalance[to][bin],
                        index,
                        values[i],
                        ObjectLib32.Operations.ADD
                    );
                } else {
                    if (bin != lastBin) {
                        _packedTokenBalance[from][lastBin] = balFrom;
                        _packedTokenBalance[to][lastBin] = balTo;
                        balFrom = _packedTokenBalance[from][bin];
                        balTo = _packedTokenBalance[to][bin];
                        lastBin = bin;
                    }

                    balFrom = balFrom.updateTokenBalance(index, values[i], ObjectLib32.Operations.SUB);
                    balTo = balTo.updateTokenBalance(index, values[i], ObjectLib32.Operations.ADD);
                }
            }
        }

        if (bin != 0 && from != to) {
            _packedTokenBalance[from][bin] = balFrom;
            _packedTokenBalance[to][bin] = balTo;
        }
    }

    function _burn(
        address from,
        uint256 id,
        uint256 amount
    ) internal {
        require(amount > 0 && amount <= ERC1155ERC721Helper.MAX_SUPPLY, "INVALID_AMOUNT");
        _burnFT(from, id, uint32(amount));
        emit TransferSingle(_msgSender(), from, address(0), id, amount);
    }

    function _burnBatch(
        address from,
        uint256[] memory ids,
        uint256[] memory amounts
    ) internal {
        address operator = _msgSender();
        for (uint256 i = 0; i < ids.length; i++) {
            require(amounts[i] > 0 && amounts[i] <= ERC1155ERC721Helper.MAX_SUPPLY, "INVALID_AMOUNT");
            _burnFT(from, ids[i], uint32(amounts[i]));
        }
        emit TransferBatch(operator, from, address(0), ids, amounts);
    }

    function _burnFT(
        address from,
        uint256 id,
        uint32 amount
    ) internal {
        (uint256 bin, uint256 index) = (id).getTokenBinIndex();
        _packedTokenBalance[from][bin] = _packedTokenBalance[from][bin].updateTokenBalance(
            index,
            amount,
            ObjectLib32.Operations.SUB
        );
    }

    function _mintBatch(
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) internal {
        uint16 offset = 0;
        while (offset < amounts.length) {
            _mintPack(offset, amounts, to, ids);
            offset += 8;
        }
        _completeBatchMint(_msgSender(), to, ids, amounts, data);
    }

    function _mintPack(
        uint16 offset,
        uint256[] memory supplies,
        address owner,
        uint256[] memory ids
    ) internal {
        (uint256 bin, uint256 index) = ids[offset].getTokenBinIndex();
        for (uint256 i = 0; i < 8 && offset + i < supplies.length; i++) {
            uint256 j = offset + i;
            if (supplies[j] > 0) {
                _packedTokenBalance[owner][bin] = _packedTokenBalance[owner][bin].updateTokenBalance(
                    index + i,
                    supplies[j],
                    ObjectLib32.Operations.ADD
                );
            }
        }
    }

    function _transferFrom(
        address from,
        address to,
        uint256 id,
        uint256 value
    ) internal returns (bool) {
        address sender = _msgSender();
        bool authorized = from == sender || isApprovedForAll(from, sender);

        require(authorized, "OPERATOR_!AUTH");
        if (value > 0) {
            (uint256 bin, uint256 index) = id.getTokenBinIndex();
            _packedTokenBalance[from][bin] = _packedTokenBalance[from][bin].updateTokenBalance(
                index,
                value,
                ObjectLib32.Operations.SUB
            );
            _packedTokenBalance[to][bin] = _packedTokenBalance[to][bin].updateTokenBalance(
                index,
                value,
                ObjectLib32.Operations.ADD
            );
        }

        emit TransferSingle(sender, from, to, id, value);
        return true;
    }

    function _mint(
        address operator,
        address account,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) internal {
        (uint256 bin, uint256 index) = id.getTokenBinIndex();
        _packedTokenBalance[account][bin] = _packedTokenBalance[account][bin].updateTokenBalance(
            index,
            amount,
            ObjectLib32.Operations.REPLACE
        );

        emit TransferSingle(operator, address(0), account, id, amount);
        require(_checkOnERC1155Received(operator, address(0), account, id, amount, data), "TRANSFER_REJECTED");
    }

    function _mintBatches(
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) internal {
        for (uint256 i = 0; i < amounts.length; i++) {
            if (amounts[i] > 0) {
                (uint256 bin, uint256 index) = ids[i].getTokenBinIndex();
                _packedTokenBalance[to][bin] = _packedTokenBalance[to][bin].updateTokenBalance(
                    index,
                    amounts[i],
                    ObjectLib32.Operations.REPLACE
                );
            }
        }
        _completeBatchMint(_msgSender(), to, ids, amounts, data);
    }

    function _mintDeficit(
        address account,
        uint256 id,
        uint256 amount
    ) internal {
        address sender = _msgSender();
        (uint256 bin, uint256 index) = id.getTokenBinIndex();
        _packedTokenBalance[account][bin] = _packedTokenBalance[account][bin].updateTokenBalance(
            index,
            amount,
            ObjectLib32.Operations.ADD
        );

        emit TransferSingle(sender, address(0), account, id, amount);
        require(_checkOnERC1155Received(sender, address(0), account, id, amount, ""), "TRANSFER_REJECTED");
    }

    /// @dev Allows the use of a bitfield to track the initialized status of the version `v` passed in as an arg.
    /// If the bit at the index corresponding to the given version is already set, revert.
    /// Otherwise, set the bit and return.
    /// @param v The version of this contract.
    function _checkInit(uint256 v) internal {
        require((_initBits >> v) & uint256(1) != 1, "ALREADY_INITIALISED");
        _initBits = _initBits | (uint256(1) << v);
    }

    function _completeBatchMint(
        address operator,
        address owner,
        uint256[] memory ids,
        uint256[] memory supplies,
        bytes memory data
    ) internal {
        emit TransferBatch(operator, address(0), owner, ids, supplies);
        require(_checkOnERC1155BatchReceived(operator, address(0), owner, ids, supplies, data), "TRANSFER_REJECTED");
    }

    function _checkEnoughBalance(
        address from,
        uint256 id,
        uint256 value
    ) internal view {
        (uint256 bin, uint256 index) = id.getTokenBinIndex();
        require(_packedTokenBalance[from][bin].getValueInBin(index) >= value, "BALANCE_TOO_LOW");
    }

    function _checkOnERC1155Received(
        address operator,
        address from,
        address to,
        uint256 id,
        uint256 value,
        bytes memory data
    ) internal returns (bool) {
        if (!to.isContract()) {
            return true;
        }

        return IERC1155Receiver(to).onERC1155Received(operator, from, id, value, data) == ERC1155_RECEIVED;
    }

    function _checkOnERC1155BatchReceived(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values,
        bytes memory data
    ) internal returns (bool) {
        if (!to.isContract()) {
            return true;
        }
        bytes4 retval = IERC1155Receiver(to).onERC1155BatchReceived(operator, from, ids, values, data);
        return (retval == ERC1155_BATCH_RECEIVED);
    }
}
