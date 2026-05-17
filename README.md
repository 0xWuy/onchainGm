# Arc GM App

A beginner-friendly on-chain GM app for Arc Testnet. The smart contract stores GM messages, and the React UI lets a wallet send a new GM and read recent GMs.

Arc docs used for this starter:

- Arc docs: <https://docs.arc.io/>
- App Kit: <https://docs.arc.io/app-kit>
- Arc Testnet RPC: `https://rpc.testnet.arc.network`
- Chain ID: `5042002`
- Gas token: `USDC`

## What You Are Building

- `contracts/GM.sol`: a small Solidity contract.
- `src/`: a modern dark React app.
- `hardhat.config.cjs`: Arc Testnet and local Hardhat network config.
- `wrangler.toml`: Cloudflare Pages config.

## Step 1: Install Dependencies

On this Windows machine, use `npm.cmd` instead of `npm` because PowerShell script execution can block `npm.ps1`.

```powershell
npm.cmd install
```

Simple explanation: this downloads the packages listed in `package.json` into `node_modules`.

## Step 2: Create Your Local Env File

```powershell
Copy-Item .env.example .env.local
```

Simple explanation: this creates your private settings file. Do not commit `.env.local`.

For local UI work, you can leave `PRIVATE_KEY` empty. For Arc Testnet deployment, add a wallet private key that has Arc Testnet USDC from the Circle faucet.

## Step 3: Test the Smart Contract

```powershell
npm.cmd run test:contract
```

Simple explanation: Hardhat compiles `contracts/GM.sol`, starts an in-memory blockchain, and checks the GM behavior.

## Step 4: Run the Website Locally

```powershell
npm.cmd run dev
```

Simple explanation: Vite starts the local React website. Open the URL it prints, usually `http://127.0.0.1:5173`.

The UI will show "Contract address missing" until you deploy the contract and add its address to `.env.local`.

## Step 5: Run a Full Local Blockchain Test

Open a second terminal and run:

```powershell
npm.cmd run node:hardhat
```

Simple explanation: this starts a local blockchain at `http://127.0.0.1:8545`.

Open a third terminal and run:

```powershell
npm.cmd run deploy:local
```

Simple explanation: this deploys the GM contract to your local blockchain.

Copy the printed address into `.env.local`:

```env
VITE_DEFAULT_CHAIN_ID=31337
VITE_GM_CONTRACT_ADDRESS_LOCAL=0xYourLocalContractAddress
```

Restart `npm.cmd run dev` after changing `.env.local`.

## Step 6: Deploy to Arc Testnet

1. Add Arc Testnet to your wallet:
   - RPC: `https://rpc.testnet.arc.network`
   - Chain ID: `5042002`
   - Currency: `USDC`
   - Explorer: `https://testnet.arcscan.app`
2. Get testnet USDC from <https://faucet.circle.com>.
3. Put your deployer private key in `.env.local`.

```env
PRIVATE_KEY=0xyour_private_key_here
```

Deploy:

```powershell
npm.cmd run deploy:arc
```

Simple explanation: this sends a transaction to Arc Testnet that creates your GM contract.

Copy the printed address into `.env.local`:

```env
VITE_GM_CONTRACT_ADDRESS_ARC=0xYourContractAddress
```

Restart the dev server after changing `.env.local`.

## Step 7: Build for Production

```powershell
npm.cmd run build
```

Simple explanation: this checks TypeScript and creates the static website in `dist`.

## Step 8: Push to GitHub

Create an empty GitHub repository in the browser, then run:

```powershell
git init
git add .
git commit -m "Build Arc GM app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/arc-gm-app.git
git push -u origin main
```

Simple explanation:

- `git init` starts git tracking.
- `git add .` stages your files.
- `git commit` saves a project snapshot.
- `git remote add origin` connects your local project to GitHub.
- `git push` uploads the project.

## Step 9: Deploy with Cloudflare Pages

Recommended beginner path:

1. Go to Cloudflare Dashboard.
2. Open Workers & Pages.
3. Create a Pages project from your GitHub repo.
4. Use these settings:
   - Build command: `npm.cmd run build`
   - Build output directory: `dist`
5. Add environment variables:
   - `VITE_DEFAULT_CHAIN_ID=5042002`
   - `VITE_GM_CONTRACT_ADDRESS_ARC=0xYourContractAddress`

CLI path after logging in with Wrangler:

```powershell
npm.cmd run build
npm.cmd run cloudflare:deploy
```

## Adding More EVM Chains Later

Add a chain in `src/lib/chains.ts`, add its deployed contract address in `src/lib/gmContract.ts`, then deploy the same `GM.sol` contract to that chain.

App Kit is not required for this first GM write flow. It becomes useful when you add stablecoin movement later, such as send, bridge, swap, or Unified Balance flows.
