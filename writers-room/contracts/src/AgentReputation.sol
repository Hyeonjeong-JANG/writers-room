// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title AgentReputation
/// @notice Stores agent reputation scores on-chain (owner-only write)
contract AgentReputation {
    address public owner;

    struct ReputationData {
        uint256 overallScore;   // scaled by 100 (e.g., 7500 = 75.00)
        string trustTier;       // "none", "bronze", "silver", "gold"
        uint256 updatedAt;
    }

    mapping(bytes32 => ReputationData) public reputations;

    event ReputationUpdated(
        bytes32 indexed agentId,
        uint256 overallScore,
        string trustTier,
        uint256 timestamp
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /// @notice Update an agent's reputation score
    /// @param agentId UUID of the agent (as bytes32)
    /// @param overallScore Score scaled by 100 (0-10000)
    /// @param trustTier Tier label
    function updateReputation(
        bytes32 agentId,
        uint256 overallScore,
        string calldata trustTier
    ) external onlyOwner {
        reputations[agentId] = ReputationData({
            overallScore: overallScore,
            trustTier: trustTier,
            updatedAt: block.timestamp
        });

        emit ReputationUpdated(agentId, overallScore, trustTier, block.timestamp);
    }

    /// @notice Get an agent's reputation
    function getReputation(bytes32 agentId) external view returns (
        uint256 overallScore,
        string memory trustTier,
        uint256 updatedAt
    ) {
        ReputationData memory data = reputations[agentId];
        return (data.overallScore, data.trustTier, data.updatedAt);
    }

    /// @notice Transfer ownership
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Zero address");
        owner = newOwner;
    }
}
