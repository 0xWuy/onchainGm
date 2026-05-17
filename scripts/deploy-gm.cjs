const { ethers, network } = require("hardhat");

async function main() {
  if (network.name === "arcTestnet" && !process.env.PRIVATE_KEY) {
    throw new Error("Missing PRIVATE_KEY in .env.local. Add a funded Arc Testnet wallet first.");
  }

  const deployOverrides =
    network.name === "arcTestnet"
      ? {
          maxFeePerGas: ethers.parseUnits("20", "gwei"),
          maxPriorityFeePerGas: ethers.parseUnits("1", "gwei"),
        }
      : {};

  const GM = await ethers.getContractFactory("GM");
  const gm = await GM.deploy(deployOverrides);
  await gm.waitForDeployment();

  const address = await gm.getAddress();

  console.log("");
  console.log(`GM contract deployed on ${network.name}`);
  console.log(`Address: ${address}`);
  console.log("");

  if (network.name === "arcTestnet") {
    console.log("Add this to .env.local:");
    console.log(`VITE_GM_CONTRACT_ADDRESS_ARC=${address}`);
  } else if (network.name === "localhost") {
    console.log("Add this to .env.local:");
    console.log(`VITE_GM_CONTRACT_ADDRESS_LOCAL=${address}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
