//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "../common/interfaces/IERC20.sol";
import "../common/interfaces/Medianizer.sol";
import "../common/interfaces/IERC1155TokenReceiver.sol";
import "../common/BaseWithStorage/WithAdmin.sol";
import "../asset/ERC1155ERC721.sol";

/// @title PloygonBundleSandSale contract.
/// @notice This contract receive ERC1155 and create sand bundle sales that users can buy using Ether or Dai.
contract PloygonBundleSandSale is WithAdmin, IERC1155TokenReceiver {
    bytes4 private constant ERC1155_RECEIVED = 0xf23a6e61;
    bytes4 private constant ERC1155_BATCH_RECEIVED = 0xbc197c81;

    event BundleSale(
        uint256 indexed saleId,
        uint256[] ids,
        uint256[] amounts,
        uint256 sandAmount,
        uint256 priceUSD,
        uint256 numPacks
    );

    event BundleSold(
        uint256 indexed saleId,
        address indexed buyer,
        uint256 numPacks,
        address token,
        uint256 tokenAmount
    );

    Medianizer private _medianizer;
    IERC20 private _dai;
    IERC20 private _sand;
    ERC1155ERC721 private _asset;

    address payable private _receivingWallet;

    struct Sale {
        uint256[] ids;
        uint256[] amounts;
        uint256 sandAmount;
        uint256 priceUSD;
        uint256 numPacksLeft;
    }

    Sale[] private sales;

    constructor(
        IERC20 sandTokenContractAddress,
        ERC1155ERC721 assetTokenContractAddress,
        Medianizer medianizerContractAddress,
        IERC20 daiTokenContractAddress,
        address admin,
        address payable receivingWallet
    ) {
        require(receivingWallet != address(0), "need a wallet to receive funds");
        _medianizer = medianizerContractAddress;
        _sand = sandTokenContractAddress;
        _asset = assetTokenContractAddress;
        _dai = daiTokenContractAddress;
        _admin = admin;
        _receivingWallet = receivingWallet;
    }

    /// @notice set the wallet receiving the proceeds
    /// @param newWallet address of the new receiving wallet
    function setReceivingWallet(address payable newWallet) external onlyAdmin {
        require(newWallet != address(0), "receiving wallet cannot be zero address");
        _receivingWallet = newWallet;
    }

    /**
     * @notice Buys Sand Bundle with Ether
     * @param saleId id of the bundle
     * @param numPacks the amount of packs to buy
     * @param to The address that will receive the SAND
     */
    function buyBundleWithEther(
        uint256 saleId,
        uint256 numPacks,
        address to
    ) external payable {
        require(saleId > 0, "invalid saleId");
        uint256 saleIndex = saleId - 1;
        uint256 numPacksLeft = sales[saleIndex].numPacksLeft;
        require(numPacksLeft >= numPacks, "not enough packs on sale");
        sales[saleIndex].numPacksLeft = numPacksLeft - numPacks;

        uint256 usdRequired = numPacks * sales[saleIndex].priceUSD;
        uint256 ethRequired = getEtherAmountWithUSD(usdRequired);
        require(msg.value >= ethRequired, "not enough ether sent");
        uint256 leftOver = msg.value - ethRequired;
        if (leftOver > 0) {
            payable(msg.sender).transfer(leftOver);
            // refund extra
        }
        payable(_receivingWallet).transfer(ethRequired);
        _transferPack(saleIndex, numPacks, to);

        emit BundleSold(saleId, msg.sender, numPacks, address(0), ethRequired);
    }

    /**
     * @notice Buys Sand Bundle with DAI
     * @param saleId id of the bundle
     * @param numPacks the amount of packs to buy
     * @param to The address that will receive the SAND
     */
    function buyBundleWithDai(
        uint256 saleId,
        uint256 numPacks,
        address to
    ) external {
        require(saleId > 0, "invalid saleId");
        uint256 saleIndex = saleId - 1;
        uint256 numPacksLeft = sales[saleIndex].numPacksLeft;
        require(numPacksLeft >= numPacks, "not enough packs on sale");
        sales[saleIndex].numPacksLeft = numPacksLeft - numPacks;

        uint256 usdRequired = numPacks * sales[saleIndex].priceUSD;
        require(_dai.transferFrom(msg.sender, _receivingWallet, usdRequired), "failed to transfer dai");
        _transferPack(saleIndex, numPacks, to);

        emit BundleSold(saleId, msg.sender, numPacks, address(_dai), usdRequired);
    }

    /**
     * @notice get a specific sale information
     * @param saleId id of the bundle
     * @return priceUSD price in USD
     * @return numPacksLeft number of packs left
     */
    function getSaleInfo(uint256 saleId) external view returns (uint256 priceUSD, uint256 numPacksLeft) {
        require(saleId > 0, "invalid saleId");
        uint256 saleIndex = saleId - 1;
        priceUSD = sales[saleIndex].priceUSD;
        numPacksLeft = sales[saleIndex].numPacksLeft;
    }

    /**
     * @notice Remove a sale returning everything to some address
     * @param saleId id of the bundle
     * @param to The address that will receive the SAND
     */
    function withdrawSale(uint256 saleId, address to) external onlyAdmin {
        require(saleId > 0, "invalid saleId");
        uint256 saleIndex = saleId - 1;
        uint256 numPacksLeft = sales[saleIndex].numPacksLeft;
        sales[saleIndex].numPacksLeft = 0;

        uint256[] memory ids = sales[saleIndex].ids;
        uint256[] memory amounts = sales[saleIndex].amounts;
        uint256 numIds = ids.length;
        for (uint256 i = 0; i < numIds; i++) {
            amounts[i] = amounts[i] * numPacksLeft;
        }
        require(
            _sand.transferFrom(address(this), to, numPacksLeft * sales[saleIndex].sandAmount),
            "transfer fo Sand failed"
        );
        _asset.safeBatchTransferFrom(address(this), to, ids, amounts, "");
    }

    /**
     * @notice IERC1155TokenReceiver callback, creates a new Sale
     */
    function onERC1155Received(
        address operator,
        address from,
        uint256 id,
        uint256 value,
        bytes calldata data
    ) external override returns (bytes4) {
        require(address(_asset) == msg.sender, "only accept asset as sender");
        require(from == operator, "only self executed transfer allowed");
        require(value > 0, "no Asset transfered");
        require(data.length > 0, "data need to contains the sale data");

        (uint256 numPacks, uint256 sandAmountPerPack, uint256 priceUSDPerPack) =
            abi.decode(data, (uint256, uint256, uint256));

        uint256 amount = value / numPacks;
        require(amount * numPacks == value, "invalid amounts, not divisible by numPacks");
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = amount;
        uint256[] memory ids = new uint256[](1);
        ids[0] = id;
        _setupBundle(from, sandAmountPerPack, numPacks, ids, amounts, priceUSDPerPack);
        return ERC1155_RECEIVED;
    }

    /**
     * @notice IERC1155TokenReceiver callback, creates a new Sale
     */
    function onERC1155BatchReceived(
        address operator,
        address from,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata data
    ) external override returns (bytes4) {
        require(address(_asset) == msg.sender, "only accept asset as sender");
        require(from == operator, "only self executed transfer allowed");
        require(ids.length > 0, "need to contains Asset");
        require(data.length > 0, "data need to contains the sale data");

        (uint256 numPacks, uint256 sandAmountPerPack, uint256 priceUSDPerPack) =
            abi.decode(data, (uint256, uint256, uint256));

        uint256[] memory amounts = new uint256[](ids.length);
        for (uint256 i = 0; i < amounts.length; i++) {
            require(values[i] > 0, "asset transfer with zero values");
            uint256 amount = values[i] / numPacks;
            require(amount * numPacks == values[i], "invalid amounts, not divisible by numPacks");
            amounts[i] = amount;
        }

        _setupBundle(from, sandAmountPerPack, numPacks, ids, amounts, priceUSDPerPack);
        return ERC1155_BATCH_RECEIVED;
    }

    /**
     * @notice Returns the amount of ETH for a specific amount of USD
     * @param usdAmount An amount of USD
     * @return The amount of ETH
     */
    function getEtherAmountWithUSD(uint256 usdAmount) public view returns (uint256) {
        uint256 ethUsdPair = getEthUsdPair();
        return (usdAmount * 1000000000000000000) / ethUsdPair;
    }

    /**
     * @notice Gets the ETHUSD pair from the Medianizer contract
     * @return The pair as an uint256
     */
    function getEthUsdPair() internal view returns (uint256) {
        bytes32 pair = _medianizer.read();
        return uint256(pair);
    }

    function _transferPack(
        uint256 saleIndex,
        uint256 numPacks,
        address to
    ) internal {
        uint256 sandAmountPerPack = sales[saleIndex].sandAmount;
        require(_sand.transferFrom(address(this), to, sandAmountPerPack * numPacks), "Sand Transfer failed");
        uint256[] memory ids = sales[saleIndex].ids;
        uint256[] memory amounts = sales[saleIndex].amounts;
        uint256 numIds = ids.length;
        for (uint256 i = 0; i < numIds; i++) {
            amounts[i] = amounts[i] * numPacks;
        }
        _asset.safeBatchTransferFrom(address(this), to, ids, amounts, "");
    }

    function _setupBundle(
        address from,
        uint256 sandAmountPerPack,
        uint256 numPacks,
        uint256[] memory ids,
        uint256[] memory amounts,
        uint256 priceUSDPerPack
    ) internal {
        require(_sand.transferFrom(from, address(this), sandAmountPerPack * numPacks), "failed to transfer Sand");
        sales.push(
            Sale({
                ids: ids,
                amounts: amounts,
                sandAmount: sandAmountPerPack,
                priceUSD: priceUSDPerPack,
                numPacksLeft: numPacks
            })
        );
        uint256 saleId = sales.length - 1;
        emit BundleSale(saleId, ids, amounts, sandAmountPerPack, priceUSDPerPack, numPacks);
    }
}
