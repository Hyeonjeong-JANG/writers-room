# Writer's Room — Contract Deployment
# Usage:
#   make deploy-sepolia  — Deploy to Base Sepolia (testnet)
#   make deploy-mainnet  — Deploy to Base Mainnet
#   make verify          — Verify contracts on Basescan

# ---- Required env vars ----
# DEPLOYER_PRIVATE_KEY  — Deployer wallet private key
# BASE_RPC_URL          — Base Mainnet RPC (e.g. https://mainnet.base.org)
# BASE_SEPOLIA_RPC_URL  — Base Sepolia RPC (e.g. https://sepolia.base.org)
# BASESCAN_API_KEY      — Basescan API key for verification

deploy-sepolia:
	forge script script/Deploy.s.sol:Deploy \
		--rpc-url base_sepolia \
		--broadcast \
		--verify \
		-vvvv

deploy-mainnet:
	forge script script/Deploy.s.sol:Deploy \
		--rpc-url base_mainnet \
		--broadcast \
		--verify \
		-vvvv

verify:
	@echo "After deployment, update .env with contract addresses:"
	@echo "  NEXT_PUBLIC_CONTRIBUTION_CONTRACT=0x..."
	@echo "  NEXT_PUBLIC_REPUTATION_CONTRACT=0x..."

.PHONY: deploy-sepolia deploy-mainnet verify
