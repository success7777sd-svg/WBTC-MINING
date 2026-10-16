const express = require('express');
const { ethers } = require('ethers');
const app = express();

app.use(express.json());
app.use(express.static('.')); // Serwuje plik index.html

// Konfiguracja sieci Polygon oraz tokena WBTC
const POLYGON_RPC = "https://polygon-rpc.com";
const WBTC_CONTRACT_ADDRESS = "0x33214A0715f5Ce8b223D225bf16654765E254956"; 
const WBTC_ABI = ["function transfer(address to, uint256 amount) returns (bool)"];

const provider = new ethers.providers.JsonRpcProvider(POLYGON_RPC);

// Klucz prywatny pobierany ze zmiennej środowiskowej Render
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const wbtcContract = new ethers.Contract(WBTC_CONTRACT_ADDRESS, WBTC_ABI, wallet);

app.post('/api/payout', async (req, res) => {
    const { recipient } = req.body;

    if (!ethers.utils.isAddress(recipient)) {
        return res.status(400).json({ success: false, message: "Nieprawidłowy adres" });
    }

    try {
        // Określamy ilość do wysłania (dostosuj liczbę miejsc po przecinku, jeśli token ma inne niż 18)
        const amount = ethers.utils.parseUnits("1.0", 18); 

        // Wysyłanie transakcji z ręcznym limitem gazu (gasLimit), aby uniknąć błędów szacowania przez RPC
        const tx = await wbtcContract.transfer(recipient, amount, {
            gasLimit: 100000 
        });
        
        await tx.wait(); // Czekamy na potwierdzenie z bloku

        return res.json({ success: true, txHash: tx.hash });
    } catch (error) {
        console.error("Błąd transakcji:", error);
        return res.status(500).json({ 
            success: false, 
            message: "Błąd wysyłania transakcji lub brak środków na opłatę gazu (POL/MATIC)." 
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serwer WBTC MINING uruchomiony na porcie ${PORT}`));
