// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {LibOrder} from "../libraries/LibOrder.sol";

struct ExchangeMatch {
    LibOrder.Order orderLeft; // Left order details
    bytes signatureLeft; // Signature of the left order
    LibOrder.Order orderRight; // Right order details
    bytes signatureRight; // Signature of the right order
}

interface IExchange {
    function matchOrdersFrom(address sender, ExchangeMatch[] calldata matchedOrders) external;
}
