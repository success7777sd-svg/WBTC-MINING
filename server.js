const express = require('express');
const { ethers } = require('ethers');
const app = express();

app.use(express.json());
app.use(express.static('.')); // Serwuje plik index.html

// Konfiguracja sieci Polygon oraz tokena z 18 miejscami po przecinku
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
        // Dokładnie 1.0 tokena uwzględniające 18 miejsc po przecinku (zgodnie z info ze skrinszota)
        const amount = ethers.utils.parseUnits("1.0", 18); 

        console.log(`Próba wysyłki 1.0 tokena z portfela ${wallet.address} do ${recipient}...`);

        // Wysyłanie transakcji z ręcznym limitem gazu
        const tx = await wbtcContract.transfer(recipient, amount, {
            gasLimit: 100000 
        });
        
        console.log(`Transakcja wysłana, Hash: ${tx.hash}`);
        await tx.wait(); // Czekamy na potwierdzenie z bloku

        return res.json({ success: true, txHash: tx.hash });
    } catch (error) {
        console.error("Szczegóły błędu transakcji:", error);
        
        // Wyciągamy czytelny komunikat z błędu blockchaina
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
