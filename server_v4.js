const express = require('express');
const fs = require('fs');
const xlsx = require('xlsx');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(bodyParser.json());
app.use(cors());

const filePath = './game_data.xlsx';
const idFilePath = './participant_id.json';  // File to store the latest participant ID
let workbook;

// Load or initialize the Excel workbook
if (fs.existsSync(filePath)) {
    console.log("Loading existing Excel file...");
    workbook = xlsx.readFile(filePath);
    if (!workbook.Sheets["Data"]) {
        console.log("Creating 'Data' worksheet...");
        const worksheet = xlsx.utils.aoa_to_sheet([
            ["Participant ID", "Condition", "Round Type", "Selected Card", "Green Card Location", "Green Card Selected?", "Choice Reason"]
        ]);
        xlsx.utils.book_append_sheet(workbook, worksheet, "Data");
        xlsx.writeFile(workbook, filePath);
    }
} else {
    console.log("Creating new Excel file...");
    workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.aoa_to_sheet([
        ["Participant ID", "Condition", "Round Type", "Selected Card", "Green Card Location", "Green Card Selected?", "Choice Reason"]
    ]);
    xlsx.utils.book_append_sheet(workbook, worksheet, "Data");
    xlsx.writeFile(workbook, filePath);
    console.log("Excel file created successfully.");
}

// Load or initialize participant ID counter
let participantIdCounter = 1;
if (fs.existsSync(idFilePath)) {
    const idData = JSON.parse(fs.readFileSync(idFilePath, 'utf8'));
    participantIdCounter = idData.latestId + 1;
} else {
    fs.writeFileSync(idFilePath, JSON.stringify({ latestId: participantIdCounter }));
}

// Endpoint to log game data
app.post('/log-data', (req, res) => {
    const { condition, roundType, selectedCard, greenCardLocation, greenCardSelected, choiceReason } = req.body;

    if (!condition || !roundType || !selectedCard || !greenCardLocation || greenCardSelected === undefined || !choiceReason) {
        console.error("Invalid data format received:", req.body);
        return res.status(400).send({ error: "Invalid data format" });
    }

    const participantId = participantIdCounter++;  // Assign the next unique participant ID

    // Update the latest participant ID in the ID file
    fs.writeFileSync(idFilePath, JSON.stringify({ latestId: participantId }));

    try {
        const worksheet = workbook.Sheets["Data"];
        const newRow = [
            participantId,
            condition,
            roundType,
            selectedCard,
            greenCardLocation,
            greenCardSelected ? 'Yes' : 'No',
            choiceReason
        ];
        xlsx.utils.sheet_add_aoa(worksheet, [newRow], { origin: -1 });
        xlsx.writeFile(workbook, filePath);
        console.log(`Data logged successfully for Participant ID: ${participantId}`);
        res.send({ status: 'Data logged successfully', participantId: participantId });
    } catch (error) {
        console.error("Error logging data to Excel:", error);
        res.status(500).send({ error: "Failed to log data to Excel" });
    }
});

// Endpoint to clear the Excel file data
app.post('/clear-data', (req, res) => {
    try {
        // Create a new worksheet with headers
        const worksheet = xlsx.utils.aoa_to_sheet([
            ["Participant ID", "Condition", "Round Type", "Selected Card", "Green Card Location", "Green Card Selected?", "Choice Reason"]
        ]);
        
        // Replace the existing "Data" sheet with the new, empty one
        workbook.Sheets["Data"] = worksheet;
        
        // Reset the participant ID counter
        participantIdCounter = 1;
        fs.writeFileSync(idFilePath, JSON.stringify({ latestId: 0 }));

        // Save the workbook with the cleared data
        xlsx.writeFile(workbook, filePath);
        console.log("Excel data cleared successfully.");

        res.send({ status: 'Data cleared successfully' });
    } catch (error) {
        console.error("Error clearing data:", error);
        res.status(500).send({ error: "Failed to clear data" });
    }
});

// Server start and shutdown handling
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

process.on('SIGTERM', () => {
    console.log("Shutting down server gracefully...");
    process.exit();
});
