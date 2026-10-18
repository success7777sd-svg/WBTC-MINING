const express = require('express');
const { ethers } = require('ethers');
const app = express();

app.use(express.json());
app.use(express.static('.'));

const POLYGON_RPC = "https://rpc-polygon.blockmachine.io";
const WBTC_CONTRACT_ADDRESS = "0x33214A0715f5Ce8b223D225bf16654765E254956"; 
const WBTC_ABI = ["function transfer(address to, uint256 amount) returns (bool)"];

const provider = new ethers.providers.JsonRpcProvider(POLYGON_RPC, 137);

const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const wbtcContract = new ethers.Contract(WBTC_CONTRACT_ADDRESS, WBTC_ABI, wallet);

app.post('/api/payout', async (req, res) => {
const { recipient } = req.body;

if (!ethers.utils.isAddress(recipient)) {
return res.status(400).json({ success: false, message: "Nieprawidłowy adres" });
}

try {
const amount = ethers.utils.parseUnits("1.0", 18); 

console.log(`Próba wysyłki 1.0 tokena do ${recipient}...`);

// Pobieramy aktualną cenę gazu z sieci, aby transakcja przeszła płynnie
const gasPrice = await provider.getGasPrice();

// Wysyłamy transakcję z ręcznym limitem i ceną gazu, pomijając błędy szacowania RPC
const tx = await wbtcContract.transfer(recipient, amount, {
gasLimit: 100000,
gasPrice: gasPrice
});

console.log(`Transakcja wysłana, Hash: ${tx.hash}`);
await tx.wait();

return res.json({ success: true, txHash: tx.hash });
} catch (error) {
console.error("Szczegóły błędu transakcji:", error);

let errorMsg = error.reason || error.message || "Nieznany błąd kontraktu";
if (errorMsg.includes("transfer amount exceeds balance")) {
errorMsg = "Portfel techniczny na serwerze nie ma tych tokenów (sprawdź PRIVATE_KEY)!";
}

return res.status(500).json({ 
success: false, 
message: `Błąd: ${errorMsg}` 
});
}
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serwer WBTC MINING uruchomiony na porcie ${PORT}`));
