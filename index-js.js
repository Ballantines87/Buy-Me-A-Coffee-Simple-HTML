// The wallet client provides access to the user's wallet ACTIONS (MetaMask in this case) - e.g. sending a transaction
// parseEther is a utility function to convert ETH amounts to wei
import {
  createWalletClient,
  custom,
  parseEther,
  defineChain,
} from "https://esm.sh/viem";

// We're also importing a public client to READ data from the blockchain or SIMULATE transactions
import { createPublicClient } from "https://esm.sh/viem";

// the deployed contract address
import { contractAddress } from "./constants-js.js";

// the abi of the smart contract, required to interact with it
import { abi } from "./constants-js.js";

const connectButton = document.getElementById("connectButton");
const fundButton = document.getElementById("fundButton");
let ethAmountInput = document.getElementById("ethAmount");

let walletClient;
let publicClient;

async function connect() {
  if (typeof window.ethereum !== "undefined") {
    // a wallet client allows you to interact with the user's wallet
    walletClient = createWalletClient({
      transport: custom(window.ethereum), // this says to use MetaMask's provider
    });

    // requestAddresses() is the function that tells MetaMask to prompt the user to connect their wallet ("what addresses can I work with? Can I actually connect to you?")
    const accounts = await walletClient.requestAddresses();
    connectButton.innerText = "Connected: " + accounts[0];
  } else {
    connectButton.innerText = "Please install MetaMask!";
  }
}

async function fund() {
  // gets the ETH amount from the input field
  ethAmountInput = ethAmountInput.value;
  console.log(`Funding with ${ethAmountInput} ETH...`);

  // this in case we haven't connected yet
  if (typeof window.ethereum !== "undefined") {
    walletClient = createWalletClient({
      // the transport (aka the blockchain node) we're gonna connect to is inside of the window.ethereum (MetaMask)
      transport: custom(window.ethereum),
    });

    // this returns a list of addresses connected to MetaMask
    const [connectedAccount] = await walletClient.requestAddresses(); // the [] brackets is a way to say: "okay, the 1st item in the list we're gonna call 'connectedAccount'"

    const currentChain = await getCurrentChain(walletClient);

    publicClient = createPublicClient({
      transport: custom(window.ethereum),
    });

    // there's a function called simulateContract, whihch simulates/validates a contract interaction -> it's useful for retrieving return data and revert reasons of contract write functions.
    // This function does not require gas to execute and does not change the state of the blockchain
    // so, basically, we're gonna i) simulate funding the contract with ETH and ii) then, if the simulation passes, we can actually call the fund() function ourselves.

    await publicClient.simulateContract({
      address: contractAddress, // the address of the contract we want to interact with
      abi: abi, // the ABI of the contract we want to interact with
      functionName: "fund", // the actual function we wanna call
      account: connectedAccount, // the user's wallet address
      chain: currentChain, // unfortunately we have to custom specify the chain here -> so check the async function getCurrentChain(client) below
      value: parseEther(ethAmountInput), // the amount of ETH to send (converted to wei)
    });
  } else {
    connectButton.innerText = "Please install MetaMask!";
  }
}

async function getCurrentChain(client) {
  const chainId = await client.getChainId();

  // n.b. since we're only working with Anvil, we're going to define this Anvil custom chain - kind of annoying having to do this ... but you'll see later on that we don't have to do this
  const currentChain = defineChain({
    id: chainId,
    name: "Custom Chain",
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
    rpcUrls: {
      default: {
        http: ["http://localhost:8545"],
      },
    },
  });
  return currentChain;
}

connectButton.onclick = connect;
fundButton.onclick = fund;
