// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// External callback the router calls on the consumer (FunctionsClient exposes this)
interface IFunctionsClientExternal {
  function handleOracleFulfillment(bytes32 requestId, bytes calldata response, bytes calldata err) external;
}

// This is a mock implementation of the Chainlink Function Router
contract MockFunctionsRouter {
  address public owner;
  uint256 public nonce;

  event RequestSent(bytes32 indexed requestId, address indexed client, bytes reqCbor, uint64 subId, uint16 dataVersion, uint32 gasLimit, bytes32 donId);
  event Simulated(bytes32 indexed requestId, bool occurred, uint64 delayMinutes);

  modifier onlyOwner() { require(msg.sender == owner, "not owner"); _; }

  constructor() { owner = msg.sender; }

  /// -----------------------------------------------------------------------
  /// IMPORTANT: this must match IFunctionsRouter.sendRequest signature
  /// -----------------------------------------------------------------------
  function sendRequest(
    uint64 subscriptionId,
    bytes calldata reqCbor,
    uint16 dataVersion,
    uint32 gasLimit,
    bytes32 donId
  ) external returns (bytes32 requestId) {
    // Synthesize a requestId; in real router this includes more entropy
    requestId = keccak256(abi.encodePacked(address(this), msg.sender, ++nonce, block.timestamp));
    emit RequestSent(requestId, msg.sender, reqCbor, subscriptionId, dataVersion, gasLimit, donId);
    // Note: We don't auto-fulfill here. You (the mock operator) will call simulateFulfill later.
  }

  /// Simulate the DON finishing and calling back the consumer (router-only in prod)
  function simulateFulfill(
    address client,
    bytes32 requestId,
    bool occurred,
    uint64 delayMinutes
  ) external onlyOwner {
    // Your consumer decodes this as (bool,uint64)
    bytes memory response = abi.encode(occurred, delayMinutes);
    bytes memory err = bytes("");
    IFunctionsClientExternal(client).handleOracleFulfillment(requestId, response, err);
    emit Simulated(requestId, occurred, delayMinutes);
  }
}
