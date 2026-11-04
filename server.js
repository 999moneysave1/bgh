const express = require('express');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(__dirname));

// 1. Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// 2. Connect to MongoDB Atlas
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log("Connected to MongoDB Atlas successfully!"))
  .catch(err => console.error("MongoDB connection error:", err));

// 3. Define Guest Schema & Model
const guestSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    checkIn: String,
    checkInRaw: String,
    room: String,
    name: String,
    mobile: String,
    guestCount: Number,
    staySlot: String,
    slotHours: Number,
    tariff: Number,
    advancePaid: Number,
    paymentMode: String,
    dob: String,
    idType: String,
    idNumber: String,
    purpose: String,
    nationality: String,
    checkOut: String,
    address: String,
    guestPhotoFile: String,
    idPhotoFile: String,
    idBackPhotoFile: String,
    status: String,
    totalBill: Number,
    balanceDue: Number,
    settlementMode: String
});

const Guest = mongoose.model('Guest', guestSchema);

// Helper to upload base64 images to Cloudinary
async function uploadBase64ToCloudinary(base64Data, folderName) {
    if (!base64Data || !base64Data.startsWith('data:image')) return null;
    try {
        const uploadResponse = await cloudinary.uploader.upload(base64Data, {
            folder: folderName,
            resource_type: 'image'
        });
        return uploadResponse.secure_url; // Returns secure HTTPS URL from Cloudinary
    } catch (error) {
        console.error("Cloudinary upload error:", error);
        return null;
    }
}

// Save Record API
app.post('/save', async (req, res) => {
    try {
        const data = req.body;
        const timeId = Date.now();

        if (data.guestPhoto) {
            data.guestPhotoFile = await uploadBase64ToCloudinary(data.guestPhoto, 'guest_photos');
        }
        if (data.idPhoto) {
            data.idPhotoFile = await uploadBase64ToCloudinary(data.idPhoto, 'id_front');
        }
        if (data.idBackPhoto) {
            data.idBackPhotoFile = await uploadBase64ToCloudinary(data.idBackPhoto, 'id_back');
        }

        delete data.guestPhoto;
        delete data.idPhoto;
        delete data.idBackPhoto;

        const newRecord = new Guest({
            id: timeId,
            ...data,
            checkInRaw: new Date().toISOString(),
            status: data.checkOut && data.checkOut !== "-" ? "Checked-Out" : "Occupied"
        });

        await newRecord.save();
        res.json({ success: true, record: newRecord });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Update Record API
app.put('/update/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const updatedData = req.body;

        if (updatedData.guestPhoto && updatedData.guestPhoto.startsWith('data:image')) {
            updatedData.guestPhotoFile = await uploadBase64ToCloudinary(updatedData.guestPhoto, 'guest_photos');
        }
        if (updatedData.idPhoto && updatedData.idPhoto.startsWith('data:image')) {
            updatedData.idPhotoFile = await uploadBase64ToCloudinary(updatedData.idPhoto, 'id_front');
        }
        if (updatedData.idBackPhoto && updatedData.idBackPhoto.startsWith('data:image')) {
            updatedData.idBackPhotoFile = await uploadBase64ToCloudinary(updatedData.idBackPhoto, 'id_back');
        }

        delete updatedData.guestPhoto;
        delete updatedData.idPhoto;
        delete updatedData.idBackPhoto;

        if (updatedData.checkOut && updatedData.checkOut !== "-" && updatedData.checkOut.trim() !== "") {
            updatedData.status = "Checked-Out";
        }

        const updatedRecord = await Guest.findOneAndUpdate({ id: id }, updatedData, { new: true });
        if (updatedRecord) {
            return res.json({ success: true, record: updatedRecord });
        }
        res.status(404).json({ success: false, message: "Record not found" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Direct Image Crop Update API
app.post('/update-image/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { type, imageBase64 } = req.body; // 'guest', 'id_front', 'id_back'

        const secureUrl = await uploadBase64ToCloudinary(imageBase64, 'edited_crops');
        if (!secureUrl) return res.status(400).json({ success: false, message: "Upload failed" });

        let updateField = {};
        if (type === 'guest') updateField.guestPhotoFile = secureUrl;
        else if (type === 'id_back') updateField.idBackPhotoFile = secureUrl;
        else updateField.idPhotoFile = secureUrl;

        const updated = await Guest.findOneAndUpdate({ id: id }, updateField, { new: true });
        if (updated) {
            return res.json({ success: true, newPath: secureUrl });
        }
        res.status(404).json({ success: false, message: "Record not found" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get All Records
app.get('/records', async (req, res) => {
    try {
        const records = await Guest.find({}).sort({ id: -1 });
        res.json(records);
    } catch (err) {
        res.status(500).json([]);
    }
});

// Check-Out API
app.put('/checkout/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { totalBill, advancePaid, balanceDue, settlementMode, actualHours } = req.body || {};

        const updated = await Guest.findOneAndUpdate({ id: id }, {
            checkOut: new Date().toLocaleString('en-US'),
            status: "Checked-Out",
            totalBill: totalBill,
            advancePaid: advancePaid,
            balanceDue: balanceDue,
            settlementMode: settlementMode,
            actualStayDuration: actualHours
        }, { new: true });

        if (updated) {
            return res.json({ success: true, record: updated });
        }
        res.status(404).json({ success: false });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Returning Guest History Check
app.get('/check-guest', async (req, res) => {
    try {
        const { query } = req.query;
        const found = await Guest.findOne({
            $or: [
                { mobile: query },
                { idNumber: { $regex: new RegExp(query.replace(/\s+/g, ''), 'i') } }
            ]
        });
        if (found) return res.json({ exists: true, guest: found });
        res.json({ exists: false });
    } catch (err) {
        res.json({ exists: false });
    }
});

// Delete Record (Admin Protected)
app.delete('/delete/:id', async (req, res) => {
    const { password } = req.body;
    if (password !== "admin123") return res.status(403).json({ success: false, message: "Incorrect Admin Password!" });

    try {
        const id = parseInt(req.params.id);
        await Guest.findOneAndDelete({ id: id });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));