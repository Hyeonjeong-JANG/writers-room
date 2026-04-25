// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title WritersRoomContribution
/// @notice Records story contribution events on-chain (owner-only write)
contract WritersRoomContribution {
    address public owner;

    event ContributionRecorded(
        bytes32 indexed contributionId,
        address indexed contributor,
        string contributionType,
        bytes32 storyId,
        uint256 timestamp
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /// @notice Record a contribution event
    /// @param contributionId UUID of the contribution (as bytes32)
    /// @param contributor Wallet address of the contributor
    /// @param contributionType Type: "comment_adopted", "chapter_generated", "agent_created"
    /// @param storyId UUID of the related story (as bytes32, zero if N/A)
    function recordContribution(
        bytes32 contributionId,
        address contributor,
        string calldata contributionType,
        bytes32 storyId
    ) external onlyOwner {
        emit ContributionRecorded(
            contributionId,
            contributor,
            contributionType,
            storyId,
            block.timestamp
        );
    }

    /// @notice Transfer ownership
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Zero address");
        owner = newOwner;
    }
}
