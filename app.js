let allRecords = [];
let filteredRecords = [];
let currentFilter = 'all';
let currentPage = 1;
const itemsPerPage = 10;
const TOTAL_ROOMS = 20;

// Camera Streams
let camFacingGuest = 'user';
let camFacingId = 'environment';
let guestStream = null;
let idFrontStream = null;
let idBackStream = null;

// Cropper State
let cropperInstance = null;
let currentCropTarget = null; // 'guest', 'idFront', 'idBack', 'editGuest', 'editIdFront', 'editIdBack', 'targetedArea'
let targetedOcrField = null; // 'name', 'dob', 'idNumber', 'address'
let activeRecordForDirectCrop = null;
let activeCheckoutRecord = null;
let activeDualRecord = null;

// Hotel Slot and Guest Count Defaults
let selectedGuestCount = 1;
let selectedSlotName = '12 Hours';
let selectedSlotHours = 12;

document.addEventListener("DOMContentLoaded", () => {
    const checkInInput = document.getElementById('checkInTime');
    if (checkInInput) checkInInput.value = new Date().toLocaleString('en-US');

    window.switchTab = function(tab) {
        const formSec = document.getElementById('sectionForm');
        const tableSec = document.getElementById('sectionTable');
        const formBtn = document.getElementById('tabFormBtn');
        const tableBtn = document.getElementById('tabTableBtn');

        if (tab === 'form') {
            formSec.classList.remove('hidden');
            tableSec.classList.add('hidden');
            formBtn.className = "flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-indigo-600 text-white px-3.5 py-1.5 rounded-md text-[11px] sm:text-xs font-semibold shadow transition";
            tableBtn.className = "flex-1 sm:flex-none flex items-center justify-center gap-1.5 text-slate-400 hover:text-white px-3.5 py-1.5 rounded-md text-[11px] sm:text-xs font-semibold transition";
        } else {
            formSec.classList.add('hidden');
            tableSec.classList.remove('hidden');
            tableBtn.className = "flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-indigo-600 text-white px-3.5 py-1.5 rounded-md text-[11px] sm:text-xs font-semibold shadow transition";
            formBtn.className = "flex-1 sm:flex-none flex items-center justify-center gap-1.5 text-slate-400 hover:text-white px-3.5 py-1.5 rounded-md text-[11px] sm:text-xs font-semibold transition";
            loadRecords();
        }
    };

    // Camera initializations
    initCamera('guest');
    initCamera('idFront');
    initCamera('idBack');

    // 1. Guest Photo Capture
    const cG = document.getElementById('cGuest'), pG = document.getElementById('pGuest'), vG = document.getElementById('vGuest');
    document.getElementById('btnGuest').onclick = () => {
        if (!vG.srcObject) { showToast("Camera inactive. Please upload file.", "error"); return; }
        cG.width = vG.videoWidth || 640; cG.height = vG.videoHeight || 480;
        cG.getContext('2d').drawImage(vG, 0, 0, cG.width, cG.height);
        openCropperModal(cG.toDataURL('image/jpeg', 0.95), 'guest');
    };
    document.getElementById('uploadGuestFile').onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const r = new FileReader();
            r.onload = (ev) => openCropperModal(ev.target.result, 'guest');
            r.readAsDataURL(file);
        }
    };
    document.getElementById('resetGuest').onclick = () => {
        pG.classList.add('hidden'); vG.classList.remove('hidden');
        document.getElementById('pGuestOverlay').classList.add('hidden');
        document.getElementById('resetGuest').classList.add('hidden');
        pG.src = "";
    };

    // 2. ID Front Capture
    const cIF = document.getElementById('cIdFront'), pIF = document.getElementById('pIdFront'), vIF = document.getElementById('vIdFront');
    document.getElementById('btnIdFront').onclick = () => {
        if (!vIF.srcObject) { showToast("Camera inactive. Please upload file.", "error"); return; }
        cIF.width = vIF.videoWidth || 1280; cIF.height = vIF.videoHeight || 720;
        cIF.getContext('2d').drawImage(vIF, 0, 0, cIF.width, cIF.height);
        openCropperModal(cIF.toDataURL('image/jpeg', 0.95), 'idFront');
    };
    document.getElementById('uploadIdFrontFile').onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const r = new FileReader();
            r.onload = (ev) => openCropperModal(ev.target.result, 'idFront');
            r.readAsDataURL(file);
        }
    };
    document.getElementById('resetIdFront').onclick = () => {
        pIF.classList.add('hidden'); vIF.classList.remove('hidden');
        document.getElementById('pIdFrontOverlay').classList.add('hidden');
        document.getElementById('resetIdFront').classList.add('hidden');
        document.getElementById('frontOcrTools').classList.add('hidden');
        pIF.src = "";
    };

    // 3. ID Back Capture
    const cIB = document.getElementById('cIdBack'), pIB = document.getElementById('pIdBack'), vIB = document.getElementById('vIdBack');
    document.getElementById('btnIdBack').onclick = () => {
        if (!vIB.srcObject) { showToast("Camera inactive. Please upload file.", "error"); return; }
        cIB.width = vIB.videoWidth || 1280; cIB.height = vIB.videoHeight || 720;
        cIB.getContext('2d').drawImage(vIB, 0, 0, cIB.width, cIB.height);
        openCropperModal(cIB.toDataURL('image/jpeg', 0.95), 'idBack');
    };
    document.getElementById('uploadIdBackFile').onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const r = new FileReader();
            r.onload = (ev) => openCropperModal(ev.target.result, 'idBack');
            r.readAsDataURL(file);
        }
    };
    document.getElementById('resetIdBack').onclick = () => {
        pIB.classList.add('hidden'); vIB.classList.remove('hidden');
        document.getElementById('pIdBackOverlay').classList.add('hidden');
        document.getElementById('resetIdBack').classList.add('hidden');
        document.getElementById('backOcrTools').classList.add('hidden');
        document.getElementById('skipBackBtn').classList.remove('hidden');
        document.getElementById('backStatusTag').innerText = "Optional";
        document.getElementById('backStatusTag').className = "text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded";
        pIB.src = "";
    };

    window.skipBackSide = function() {
        pIB.classList.add('hidden'); vIB.classList.remove('hidden');
        pIB.src = "";
        document.getElementById('backStatusTag').innerText = "Skipped";
        document.getElementById('backStatusTag').className = "text-[9px] bg-slate-800 text-amber-300 px-1.5 py-0.2 rounded";
        showToast("Back side skipped. Address can be entered manually.", "info");
    };

    // Form Submission
    const regForm = document.getElementById('regForm');
    if (regForm) {
        regForm.onsubmit = async (e) => {
            e.preventDefault();

            if (!pG.src || pG.classList.contains('hidden') || !pIF.src || pIF.classList.contains('hidden')) {
                showToast("Guest Live Photo and ID Front are mandatory!", "warning");
                return;
            }

            const nameVal = document.getElementById('guestName').value.trim();
            if (nameVal.split(/\s+/).length < 2) {
                showToast("Please enter Full Name (First & Last Name).", "warning");
                return;
            }

            const mobVal = document.getElementById('mobileNumber').value.trim();
            if (!/^[6-9]\d{9}$/.test(mobVal)) {
                showToast("Enter a valid 10-digit Indian Mobile Number.", "warning");
                return;
            }

            const roomVal = document.getElementById('roomNumber').value;
            const occupiedRooms = allRecords.filter(r => r.status === "Occupied").map(r => String(r.room));
            if (occupiedRooms.includes(String(roomVal))) {
                showToast(`Room #${roomVal} is already occupied!`, "error");
                return;
            }

            const btn = document.getElementById('saveSubmitBtn');
            btn.disabled = true;
            btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1"></i> Saving Guest Record...`;

            const payload = {
                checkIn: document.getElementById('checkInTime').value,
                room: roomVal,
                name: nameVal,
                mobile: mobVal,
                guestCount: selectedGuestCount,
                staySlot: selectedSlotName,
                slotHours: selectedSlotHours,
                tariff: Number(document.getElementById('roomTariff').value) || 500,
                advancePaid: Number(document.getElementById('advancePaid').value) || 0,
                paymentMode: document.getElementById('paymentMode').value,
                dob: document.getElementById('dateOfBirth').value,
                idType: document.getElementById('idType').value,
                idNumber: document.getElementById('idNumber').value.trim(),
                purpose: document.getElementById('purposeOfStay').value.trim(),
                nationality: document.getElementById('nationality').value.trim(),
                checkOut: "-",
                address: document.getElementById('address').value.trim(),
                guestPhoto: pG.src,
                idPhoto: pIF.src,
                idBackPhoto: pIB.src && !pIB.classList.contains('hidden') ? pIB.src : null
            };

            try {
                const res = await fetch('/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const result = await res.json();
                if (result.success) {
                    showToast("Guest Check-In Confirmed!", "success");
                    regForm.reset();
                    document.getElementById('checkInTime').value = new Date().toLocaleString('en-US');
                    document.getElementById('resetGuest').click();
                    document.getElementById('resetIdFront').click();
                    document.getElementById('resetIdBack').click();
                    setTariffAmount(500);
                    switchTab('table');
                } else {
                    showToast(result.error || "Save failed", "error");
                }
            } catch (err) {
                showToast("Server Connection Error!", "error");
            } finally {
                btn.disabled = false;
                btn.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i> <span>Register & Confirm Check-In</span>`;
            }
        };
    }

    loadRecords();
});

// ================= GUEST COUNT & TARIFF CONTROLS =================
window.setGuestCount = function(count) {
    selectedGuestCount = count;
    document.getElementById('guestCountInput').value = count;
    [1, 2, 3, 4].forEach(i => {
        const btn = document.getElementById(`gcBtn_${i}`);
        if (btn) {
            btn.className = (i === count)
                ? "flex-1 py-1.5 rounded bg-indigo-600 text-white font-bold text-xs shadow transition"
                : "flex-1 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition";
        }
    });
};

window.manualGuestCount = function() {
    const val = parseInt(document.getElementById('guestCountInput').value) || 1;
    selectedGuestCount = Math.max(1, Math.min(20, val));
    [1, 2, 3, 4].forEach(i => {
        const btn = document.getElementById(`gcBtn_${i}`);
        if (btn) {
            btn.className = (i === selectedGuestCount)
                ? "flex-1 py-1.5 rounded bg-indigo-600 text-white font-bold text-xs shadow transition"
                : "flex-1 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition";
        }
    });
};

window.setDurationSlot = function(slotName, tariffRate) {
    selectedSlotName = slotName;
    selectedSlotHours = parseInt(slotName) || 12;
    document.getElementById('slotTariffTag').innerText = `${slotName} Slot (₹${tariffRate})`;

    [6, 12, 18, 24].forEach(h => {
        const b = document.getElementById(`slotBtn_${h}`);
        if (b) {
            b.className = slotName.startsWith(String(h))
                ? "py-1 rounded bg-indigo-600 text-white text-[11px] font-semibold transition"
                : "py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold transition";
        }
    });

    setTariffAmount(tariffRate);
};

window.setTariffAmount = function(amount) {
    const tariffInput = document.getElementById('roomTariff');
    const advanceInput = document.getElementById('advancePaid');
    if (tariffInput) tariffInput.value = amount;
    if (advanceInput) advanceInput.value = amount;
    showToast(`Tariff set to ₹${amount}`, "info");
};

window.syncAdvancePayment = function() {
    const tariffVal = document.getElementById('roomTariff').value;
    document.getElementById('advancePaid').value = tariffVal;
};

// ================= CAMERA MANAGEMENT =================
async function initCamera(type) {
    let videoEl, facing;
    if (type === 'guest') { videoEl = document.getElementById('vGuest'); facing = camFacingGuest; }
    else if (type === 'idFront') { videoEl = document.getElementById('vIdFront'); facing = camFacingId; }
    else { videoEl = document.getElementById('vIdBack'); facing = camFacingId; }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1080 } }
        });
        if (type === 'guest') guestStream = stream;
        else if (type === 'idFront') idFrontStream = stream;
        else idBackStream = stream;
        videoEl.srcObject = stream;
    } catch(e) { console.warn(`Camera ${type} unavailable`); }
}

window.switchCamera = function(type) {
    if (type === 'guest') {
        camFacingGuest = (camFacingGuest === 'user') ? 'environment' : 'user';
        initCamera('guest');
    } else {
        camFacingId = (camFacingId === 'environment') ? 'user' : 'environment';
        initCamera('idFront');
        initCamera('idBack');
    }
};

// ================= SMART AUTO-BORDER CROPPING & TARGETED AREA CROPPER =================
function cropFormImage(type) {
    let p;
    if (type === 'guest') p = document.getElementById('pGuest');
    else if (type === 'idFront') p = document.getElementById('pIdFront');
    else p = document.getElementById('pIdBack');

    if (p.src && !p.classList.contains('hidden')) {
        openCropperModal(p.src, type);
    }
}

function openCropperModal(imageSrc, targetType) {
    currentCropTarget = targetType;
    const modal = document.getElementById('cropModal');
    const imageEl = document.getElementById('imageToCrop');

    imageEl.src = imageSrc;
    modal.classList.remove('hidden');

    if (cropperInstance) cropperInstance.destroy();

    const isCard = targetType.toLowerCase().includes('id') && targetType !== 'targetedArea';

    cropperInstance = new Cropper(imageEl, {
        viewMode: 1,
        dragMode: 'move',
        restore: false,
        guides: true,
        center: true,
        cropBoxMovable: true,
        cropBoxResizable: true,
        aspectRatio: isCard ? 1.586 : (targetType === 'targetedArea' ? NaN : 1),
        ready() {
            if (isCard) autoDetectCardBorders();
        }
    });
}

window.autoDetectCardBorders = function() {
    if (!cropperInstance) return;
    const canvas = cropperInstance.getCanvasData();
    const cardRatio = 1.586;
    let targetWidth = canvas.width * 0.90;
    let targetHeight = targetWidth / cardRatio;

    if (targetHeight > canvas.height * 0.92) {
        targetHeight = canvas.height * 0.92;
        targetWidth = targetHeight * cardRatio;
    }

    const left = canvas.left + (canvas.width - targetWidth) / 2;
    const top = canvas.top + (canvas.height - targetHeight) / 2;

    cropperInstance.setAspectRatio(cardRatio);
    cropperInstance.setCropBoxData({ left, top, width: targetWidth, height: targetHeight });
    showToast("Snapped to card borders!", "info");
};

function rotateCrop(deg) { if (cropperInstance) cropperInstance.rotate(deg); }
function setCropRatio(ratio) { if (cropperInstance) cropperInstance.setAspectRatio(ratio); }

function cancelCrop() {
    if (cropperInstance) { cropperInstance.destroy(); cropperInstance = null; }
    document.getElementById('cropModal').classList.add('hidden');
    targetedOcrField = null;
}

// Targeted Zone/Area OCR Tool (Select Area on ID and Extract Only that Field)
window.startAreaOcr = function(imageTarget, fieldKey) {
    targetedOcrField = fieldKey;
    let imgSrc = "";
    if (imageTarget === 'front') {
        const pIF = document.getElementById('pIdFront');
        if (!pIF.src || pIF.classList.contains('hidden')) { showToast("Upload/Capture Front ID first!", "warning"); return; }
        imgSrc = pIF.src;
    } else {
        const pIB = document.getElementById('pIdBack');
        if (!pIB.src || pIB.classList.contains('hidden')) { showToast("Upload/Capture Back ID first!", "warning"); return; }
        imgSrc = pIB.src;
    }

    openCropperModal(imgSrc, 'targetedArea');
    showToast(`Drag the crop box over the ${fieldKey.toUpperCase()} area, then click 'Apply Crop'!`, "info");
};

async function applyCrop() {
    if (!cropperInstance) return;
    const canvas = cropperInstance.getCroppedCanvas({ maxWidth: 1600, maxHeight: 1600, fillColor: '#fff' });
    const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.95);

    if (currentCropTarget === 'targetedArea') {
        // Run OCR on specifically cropped area only
        runTargetedAreaOcr(croppedDataUrl, targetedOcrField);
        cancelCrop();
        return;
    }

    if (currentCropTarget === 'guest') {
        const pG = document.getElementById('pGuest');
        pG.src = croppedDataUrl;
        pG.classList.remove('hidden');
        document.getElementById('vGuest').classList.add('hidden');
        document.getElementById('pGuestOverlay').classList.remove('hidden');
        document.getElementById('resetGuest').classList.remove('hidden');
        showToast("Guest photo cropped!", "success");
    } else if (currentCropTarget === 'idFront') {
        const pIF = document.getElementById('pIdFront');
        pIF.src = croppedDataUrl;
        pIF.classList.remove('hidden');
        document.getElementById('vIdFront').classList.add('hidden');
        document.getElementById('pIdFrontOverlay').classList.remove('hidden');
        document.getElementById('resetIdFront').classList.remove('hidden');
        document.getElementById('frontOcrTools').classList.remove('hidden');
        showToast("Front ID cropped! Scanning details...", "info");
        extractFrontIdDetailsWithOCR(croppedDataUrl);
    } else if (currentCropTarget === 'idBack') {
        const pIB = document.getElementById('pIdBack');
        pIB.src = croppedDataUrl;
        pIB.classList.remove('hidden');
        document.getElementById('vIdBack').classList.add('hidden');
        document.getElementById('pIdBackOverlay').classList.remove('hidden');
        document.getElementById('resetIdBack').classList.remove('hidden');
        document.getElementById('backOcrTools').classList.remove('hidden');
        document.getElementById('skipBackBtn').classList.add('hidden');
        document.getElementById('backStatusTag').innerText = "Uploaded";
        document.getElementById('backStatusTag').className = "text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded";
        showToast("Back ID cropped! Scanning Address...", "info");
        extractBackAddressWithOCR(croppedDataUrl);
    } else if (currentCropTarget === 'editGuest' || currentCropTarget === 'editIdFront' || currentCropTarget === 'editIdBack') {
        // Direct crop update from Edit Modal
        if (activeRecordForDirectCrop) {
            const apiType = currentCropTarget === 'editGuest' ? 'guest' : (currentCropTarget === 'editIdBack' ? 'id_back' : 'id_front');
            try {
                const res = await fetch(`/update-image/${activeRecordForDirectCrop.id}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: apiType, imageBase64: croppedDataUrl })
                });
                const d = await res.json();
                if (d.success) {
                    if (currentCropTarget === 'editGuest') {
                        document.getElementById('editGuestImg').src = d.newPath;
                        activeRecordForDirectCrop.guestPhotoFile = d.newPath;
                    } else if (currentCropTarget === 'editIdBack') {
                        document.getElementById('editIdBackImg').src = d.newPath;
                        activeRecordForDirectCrop.idBackPhotoFile = d.newPath;
                    } else {
                        document.getElementById('editIdImg').src = d.newPath;
                        activeRecordForDirectCrop.idPhotoFile = d.newPath;
                    }
                    showToast("Photo updated in record!", "success");
                    loadRecords();
                }
            } catch(e) { showToast("Failed to save cropped image", "error"); }
        }
    }

    cancelCrop();
}

// Binarization engine for high OCR sharpness
function preprocessImageForOCR(imageSrc) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width; canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const d = imgData.data;

            for (let i = 0; i < d.length; i += 4) {
                const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
                const enhanced = gray < 130 ? 0 : 255;
                d[i] = enhanced; d[i + 1] = enhanced; d[i + 2] = enhanced;
            }
            ctx.putImageData(imgData, 0, 0);
            resolve(canvas.toDataURL('image/jpeg', 0.95));
        };
        img.src = imageSrc;
    });
}

// ================= OCR ENGINE 1: FRONT ID =================
window.reScanFrontId = function() {
    const pIF = document.getElementById('pIdFront');
    if (!pIF.src || pIF.classList.contains('hidden')) {
        showToast("Please capture or upload Front ID first!", "warning");
        return;
    }
    showToast("Re-scanning Front ID...", "info");
    extractFrontIdDetailsWithOCR(pIF.src);
};

async function extractFrontIdDetailsWithOCR(originalImageSrc) {
    const ocrLoader = document.getElementById('ocrLoaderFront');
    if (ocrLoader) ocrLoader.classList.remove('hidden');

    try {
        const processedImageSrc = await preprocessImageForOCR(originalImageSrc);
        const result = await Tesseract.recognize(processedImageSrc, 'eng');
        const rawText = result.data.text || '';
        const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

        let detectedName = "";
        let detectedDOB = "";
        let detectedAadhaar = "";

        if (/government|india|भारत|आधार|aadhaar|dob|birth|male|female/i.test(rawText)) {
            document.getElementById('idType').value = 'Aadhaar Card';
        }

        // 1. DOB Match
        const dobRegex = /\b([0-3]?[0-9][\/\-\.][0-1]?[0-9][\/\-\.](19|20)\d{2})\b/;
        let dobLineIndex = -1;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const match = line.match(dobRegex);
            if (match && !line.includes("Issue")) {
                let [d, m, y] = match[0].split(/[\/\-\.]/);
                if (d.length === 1) d = '0' + d;
                if (m.length === 1) m = '0' + m;
                detectedDOB = `${y}-${m}-${d}`;
                dobLineIndex = i;
                document.getElementById('dateOfBirth').value = detectedDOB;
                break;
            }
        }

        // 2. NAME EXTRACTION
        if (dobLineIndex > 0) {
            for (let k = dobLineIndex - 1; k >= 0; k--) {
                let candidate = lines[k].replace(/[^a-zA-Z\s]/g, '').trim();
                candidate = candidate.replace(/^(w[\/\s]?o|s[\/\s]?o|d[\/\s]?o|c[\/\s]?o|wo|so|do|co|to|mr|mrs|shri|smt)\b[:\s.-]*/i, '').trim();

                if (candidate.length >= 3 && !/government|india|republic|father|mother|card|uidai/i.test(candidate)) {
                    const words = candidate.split(/\s+/).filter(w => w.length >= 2);
                    if (words.length >= 1) {
                        detectedName = words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
                        document.getElementById('guestName').value = detectedName;
                        break;
                    }
                }
            }
        }

        // 3. 12-Digit Aadhaar Extraction
        const aadhaarMatch = rawText.match(/\b([2-9]\d{3}\s*\d{4}\s*\d{4})\b/);
        if (aadhaarMatch) {
            const d = aadhaarMatch[0].replace(/\s+/g, '');
            if (d.length === 12) {
                detectedAadhaar = `${d.slice(0,4)} ${d.slice(4,8)} ${d.slice(8,12)}`;
                document.getElementById('idNumber').value = detectedAadhaar;
            }
        }

        let summary = [];
        if (detectedName) summary.push(`Name: ${detectedName}`);
        if (detectedDOB) summary.push(`DOB: ${detectedDOB}`);
        if (detectedAadhaar) summary.push(`ID: ${detectedAadhaar}`);
        if (summary.length) showToast(`Extracted: ${summary.join(" | ")}`, "success");
        else showToast("Scan completed. If some fields are missing, use 'Select Area OCR'!", "info");

    } catch (err) {
        console.warn("Front OCR failed", err);
        showToast("OCR Error. Please use manual entry or targeted area crop.", "warning");
    } finally {
        if (ocrLoader) ocrLoader.classList.add('hidden');
    }
}

// ================= OCR ENGINE 2: BACK ID =================
window.reScanBackId = function() {
    const pIB = document.getElementById('pIdBack');
    if (!pIB.src || pIB.classList.contains('hidden')) {
        showToast("Please capture or upload Back ID first!", "warning");
        return;
    }
    showToast("Re-scanning Back ID Address...", "info");
    extractBackAddressWithOCR(pIB.src);
};

async function extractBackAddressWithOCR(originalImageSrc) {
    const ocrLoader = document.getElementById('ocrLoaderBack');
    if (ocrLoader) ocrLoader.classList.remove('hidden');

    try {
        const processedImageSrc = await preprocessImageForOCR(originalImageSrc);
        const result = await Tesseract.recognize(processedImageSrc, 'eng');
        const rawText = result.data.text || '';
        const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 2);

        let addressParts = [];
        let capturing = false;

        for (let line of lines) {
            if (/address|पता/i.test(line)) {
                capturing = true;
                const afterAddress = line.replace(/^.*(address|पता)\s*[:.-]*/i, '').trim();
                if (afterAddress.length > 3) addressParts.push(afterAddress);
                continue;
            }
            if (capturing) {
                if (/help|uidai|unique|identification|www/i.test(line)) break;
                addressParts.push(line);
                if (/\b[1-9][0-9]{5}\b/.test(line)) break;
            }
        }

        if (addressParts.length === 0) {
            const pinIndex = lines.findIndex(l => /\b[1-9][0-9]{5}\b/.test(l));
            if (pinIndex !== -1) {
                addressParts = lines.slice(Math.max(0, pinIndex - 2), pinIndex + 1);
            }
        }

        if (addressParts.length > 0) {
            const finalAddress = addressParts.join(', ').replace(/\s+/g, ' ').trim();
            document.getElementById('address').value = finalAddress;
            showToast("Address Auto-Extracted from Back ID!", "success");
        } else {
            showToast("Back ID saved. Use 'Select Area OCR' if address wasn't auto-found.", "info");
        }
    } catch (err) {
        console.warn("Back OCR failed", err);
    } finally {
        if (ocrLoader) ocrLoader.classList.add('hidden');
    }
}

// ================= TARGETED AREA OCR RUNNER =================
async function runTargetedAreaOcr(croppedDataUrl, fieldKey) {
    showToast(`Scanning cropped area for ${fieldKey}...`, "info");
    try {
        const processed = await preprocessImageForOCR(croppedDataUrl);
        const res = await Tesseract.recognize(processed, 'eng');
        const text = (res.data.text || '').trim();

        if (!text) {
            showToast("Could not recognize text in that selection. Try again.", "warning");
            return;
        }

        if (fieldKey === 'name') {
            const cleaned = text.replace(/[^a-zA-Z\s]/g, '').trim();
            const words = cleaned.split(/\s+/).filter(w => w.length >= 2);
            if (words.length > 0) {
                const formatted = words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
                document.getElementById('guestName').value = formatted;
                showToast(`Name set to: ${formatted}`, "success");
            }
        } else if (fieldKey === 'dob') {
            const match = text.match(/\b([0-3]?[0-9][\/\-\.][0-1]?[0-9][\/\-\.](19|20)\d{2})\b/);
            if (match) {
                let [d, m, y] = match[0].split(/[\/\-\.]/);
                if (d.length === 1) d = '0' + d;
                if (m.length === 1) m = '0' + m;
                document.getElementById('dateOfBirth').value = `${y}-${m}-${d}`;
                showToast(`DOB set to: ${y}-${m}-${d}`, "success");
            } else {
                showToast(`Extracted: ${text}. Please verify DOB.`, "info");
            }
        } else if (fieldKey === 'idNumber') {
            const digits = text.replace(/[^0-9A-Za-z\s]/g, '').trim();
            document.getElementById('idNumber').value = digits;
            showToast(`ID Number set to: ${digits}`, "success");
        } else if (fieldKey === 'address') {
            const cleanedAddr = text.replace(/\n+/g, ', ').replace(/\s+/g, ' ').trim();
            document.getElementById('address').value = cleanedAddr;
            showToast(`Address set successfully!`, "success");
        }
    } catch(e) {
        showToast("Error scanning selected area", "error");
    }
}

// ================= FREE PHONE CALL VERIFICATION =================
window.makeVerificationCall = function() {
    const mob = document.getElementById('mobileNumber').value.trim();
    if (!/^[6-9]\d{9}$/.test(mob)) {
        showToast("Enter a valid 10-digit mobile number first!", "warning");
        return;
    }
    window.location.href = `tel:+91${mob}`;
    showToast(`Dialing +91 ${mob}... Check if guest's phone rings!`, "info");
    document.getElementById('verifyBadge').classList.remove('hidden');
};

window.sendWhatsAppVerify = function() {
    const mob = document.getElementById('mobileNumber').value.trim();
    if (!/^[6-9]\d{9}$/.test(mob)) {
        showToast("Enter a valid 10-digit mobile number first!", "warning");
        return;
    }
    const name = document.getElementById('guestName').value.trim() || 'Guest';
    window.open(`https://wa.me/91${mob}?text=${encodeURIComponent(`Hello ${name}, welcome to Bharat Guest House! Verification code: ` + Math.floor(1000 + Math.random() * 9000))}`, '_blank');
    document.getElementById('verifyBadge').classList.remove('hidden');
};

// ================= DATA TABLE & CARDS RENDERING =================
async function loadRecords() {
    try {
        const res = await fetch('/records');
        allRecords = await res.json();
        updateKPIs(allRecords);
        applyFilterAndSearch();
    } catch (err) { console.error(err); }
}

function updateKPIs(records) {
    const occupied = records.filter(r => r.status === "Occupied").length;
    const checkedOut = records.filter(r => r.status === "Checked-Out").length;
    document.getElementById('statTotal').innerText = records.length;
    document.getElementById('statOccupied').innerText = occupied;
    document.getElementById('statAvailable').innerText = Math.max(0, TOTAL_ROOMS - occupied);
    document.getElementById('statCheckedOut').innerText = checkedOut;
}

function handleSearch() { currentPage = 1; applyFilterAndSearch(); }
function setFilter(type) {
    currentFilter = type;
    ['filterAll', 'filterOccupied', 'filterCheckedOut'].forEach(id => {
        document.getElementById(id).className = "bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap";
    });
    if (type === 'all') document.getElementById('filterAll').className = "bg-indigo-600 text-white px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap";
    else if (type === 'Occupied') document.getElementById('filterOccupied').className = "bg-rose-600 text-white px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap";
    else if (type === 'Checked-Out') document.getElementById('filterCheckedOut').className = "bg-emerald-600 text-white px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap";
    currentPage = 1;
    applyFilterAndSearch();
}

function applyFilterAndSearch() {
    const q = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();
    filteredRecords = allRecords.filter(r => {
        const matchesFilter = (currentFilter === 'all') || (r.status === currentFilter);
        const matchesSearch = !q || (r.name && r.name.toLowerCase().includes(q)) || (r.mobile && r.mobile.includes(q)) || (String(r.room).includes(q)) || (r.idNumber && r.idNumber.toLowerCase().includes(q));
        return matchesFilter && matchesSearch;
    });
    document.getElementById('shownRecordsCount').innerText = filteredRecords.length;
    renderCurrentPage();
}

function renderCurrentPage() {
    const totalPages = Math.ceil(filteredRecords.length / itemsPerPage) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    const startIdx = (currentPage - 1) * itemsPerPage;
    const pageRecords = filteredRecords.slice(startIdx, startIdx + itemsPerPage);

    document.getElementById('currentPageNum').innerText = currentPage;
    document.getElementById('totalPagesNum').innerText = totalPages;
    document.getElementById('prevPageBtn').disabled = (currentPage === 1);
    document.getElementById('nextPageBtn').disabled = (currentPage === totalPages);

    const btnContainer = document.getElementById('pageNumberButtons');
    btnContainer.innerHTML = '';
    for (let p = 1; p <= totalPages; p++) {
        if (p <= 5 || p === totalPages || Math.abs(p - currentPage) <= 1) {
            const b = document.createElement('button');
            b.innerText = p;
            b.className = p === currentPage ? "w-6 h-6 rounded bg-indigo-600 text-white font-bold text-xs" : "w-6 h-6 rounded bg-slate-800 text-slate-300 text-xs";
            b.onclick = () => { currentPage = p; renderCurrentPage(); };
            btnContainer.appendChild(b);
        }
    }

    renderDesktopTable(pageRecords, startIdx);
    renderMobileCards(pageRecords, startIdx);
    document.getElementById('noDataState').classList.toggle('hidden', pageRecords.length > 0);
}

function changePage(dir) { currentPage += dir; renderCurrentPage(); }
function refreshData() { loadRecords(); showToast("Refreshed", "info"); }

function renderDesktopTable(records, offset) {
    const tbody = document.getElementById('dataTableBody');
    tbody.innerHTML = "";

    records.forEach((r, idx) => {
        const isOccupied = (r.status === "Occupied");
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-800/40 transition border-b border-slate-800/60";
        tr.innerHTML = `
            <td class="p-2.5 text-center font-bold text-slate-500">${offset + idx + 1}</td>
            <td class="p-2.5">
                <img src="${r.guestPhotoFile}" class="w-9 h-9 object-cover rounded border border-slate-700 cursor-pointer hover:border-indigo-400 shadow" title="Click to View" onclick="zoomImage('${r.guestPhotoFile}')">
            </td>
            <td class="p-2.5">
                <div class="flex items-center gap-1.5 cursor-pointer group" onclick="openDualIdModal(${r.id})" title="Click to view & crop Front/Back IDs">
                    <div class="relative">
                        <img src="${r.idPhotoFile}" class="w-10 h-7 object-cover rounded border border-emerald-500/50 group-hover:border-emerald-400 shadow">
                        <span class="absolute -bottom-1 -right-1 text-[8px] bg-emerald-950 text-emerald-300 px-1 rounded font-bold border border-emerald-500/40">F</span>
                    </div>
                    ${r.idBackPhotoFile ? `
                    <div class="relative">
                        <img src="${r.idBackPhotoFile}" class="w-10 h-7 object-cover rounded border border-amber-500/50 group-hover:border-amber-400 shadow">
                        <span class="absolute -bottom-1 -right-1 text-[8px] bg-amber-950 text-amber-300 px-1 rounded font-bold border border-amber-500/40">B</span>
                    </div>` : `
                    <span class="text-[9px] text-slate-500 italic bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">No Back</span>
                    `}
                </div>
            </td>
            <td class="p-2.5 font-mono text-[11px] text-slate-300 whitespace-nowrap">${r.checkIn || '-'}</td>
            <td class="p-2.5 text-center"><span class="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-extrabold text-xs font-mono">Room ${r.room}</span></td>
            <td class="p-2.5 whitespace-nowrap">
                <div class="font-bold text-slate-100">${r.name}</div>
                <div class="text-[10px] text-slate-400 flex items-center gap-1">
                    <i class="fa-solid fa-users text-[9px] text-indigo-400"></i> ${r.guestCount || 1} Person(s)
                </div>
            </td>
            <td class="p-2.5 whitespace-nowrap font-mono font-bold">
                <a href="tel:+91${r.mobile}" class="text-emerald-400 hover:underline flex items-center gap-1 select-all" title="Click to Call">
                    <i class="fa-solid fa-phone text-[10px]"></i> ${r.mobile}
                </a>
            </td>
            <td class="p-2.5 whitespace-nowrap">
                <div class="text-[11px] font-mono text-emerald-400 font-bold">₹${r.tariff || 500} <span class="text-[9px] text-slate-400 font-normal">(${r.staySlot || '12h'})</span></div>
                <div class="text-[10px] text-slate-400">Adv: <span class="font-mono text-white font-semibold">₹${r.advancePaid || 0}</span></div>
            </td>
            <td class="p-2.5 font-mono text-[11px] ${r.checkOut && r.checkOut !== '-' ? 'text-amber-400' : 'text-slate-500'} whitespace-nowrap">${r.checkOut || '-'}</td>
            <td class="p-2.5 whitespace-nowrap">
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${isOccupied ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'}">
                    <span class="w-1.5 h-1.5 rounded-full ${isOccupied ? 'bg-rose-400 animate-ping' : 'bg-emerald-400'}"></span>
                    ${isOccupied ? 'Occupied' : 'Checked-Out'}
                </span>
            </td>
            <td class="p-2.5 text-center">
                <div class="flex items-center justify-center gap-1">
                    <button onclick="openEditModal(${r.id})" title="Edit Details & Crop Photos" class="bg-indigo-600/90 hover:bg-indigo-600 text-white px-2 py-1 rounded text-[10px] font-semibold"><i class="fa-solid fa-pen-to-square"></i> Edit</button>
                    <button onclick="printPoliceReport(${r.id})" title="Print Police Report" class="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-1 rounded text-[10px]"><i class="fa-solid fa-print"></i></button>
                    ${isOccupied ? `<button onclick="initiateCheckOutModal(${r.id})" title="Check-Out & Settle Bill" class="bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded text-[10px] font-semibold"><i class="fa-solid fa-receipt mr-0.5"></i> Out</button>` : ''}
                    <button onclick="deleteRecord(${r.id})" title="Delete Record (Admin)" class="bg-rose-600/80 hover:bg-rose-600 text-white px-2 py-1 rounded text-[10px]"><i class="fa-solid fa-trash"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderMobileCards(records, offset) {
    const container = document.getElementById('mobileCardsContainer');
    container.innerHTML = "";

    records.forEach((r, idx) => {
        const isOccupied = (r.status === "Occupied");
        const card = document.createElement('div');
        card.className = "bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-md space-y-2 text-xs";
        card.innerHTML = `
            <div class="flex items-center justify-between border-b border-slate-800 pb-2">
                <div class="flex items-center gap-1.5">
                    <span class="w-5 h-5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-bold flex items-center justify-center font-mono">${offset + idx + 1}</span>
                    <span class="px-2 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-extrabold text-[11px] font-mono">Room ${r.room}</span>
                    <span class="text-[10px] text-slate-400"><i class="fa-solid fa-users text-indigo-400"></i> ${r.guestCount || 1}</span>
                </div>
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${isOccupied ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'}">
                    <span class="w-1.5 h-1.5 rounded-full ${isOccupied ? 'bg-rose-400' : 'bg-emerald-400'}"></span>
                    ${isOccupied ? 'Occupied' : 'Checked-Out'}
                </span>
            </div>

            <!-- Photos: Guest, Front ID, Back ID -->
            <div class="flex gap-2 items-center bg-slate-950 p-2 rounded-lg border border-slate-800">
                <div class="text-center" onclick="zoomImage('${r.guestPhotoFile}')">
                    <img src="${r.guestPhotoFile}" class="w-12 h-12 object-cover rounded border border-slate-700 shadow">
                    <span class="text-[8px] text-slate-400 block mt-0.5">Guest</span>
                </div>
                <div class="text-center" onclick="openDualIdModal(${r.id})">
                    <img src="${r.idPhotoFile}" class="w-14 h-10 object-cover rounded border border-emerald-500/50 shadow">
                    <span class="text-[8px] text-emerald-400 block mt-0.5">ID Front</span>
                </div>
                ${r.idBackPhotoFile ? `
                <div class="text-center" onclick="openDualIdModal(${r.id})">
                    <img src="${r.idBackPhotoFile}" class="w-14 h-10 object-cover rounded border border-amber-500/50 shadow">
                    <span class="text-[8px] text-amber-400 block mt-0.5">ID Back</span>
                </div>` : `
                <div class="w-14 h-10 rounded border border-dashed border-slate-800 flex items-center justify-center text-[8px] text-slate-600">No Back</div>
                `}
                <div class="flex-1 pl-1">
                    <div class="font-extrabold text-white text-xs">${r.name}</div>
                    <a href="tel:+91${r.mobile}" class="flex items-center gap-1 text-[11px] text-emerald-400 font-mono font-bold whitespace-nowrap select-all hover:underline">
                        <i class="fa-solid fa-phone text-[9px]"></i> <span>${r.mobile}</span>
                    </a>
                    <div class="text-[10px] text-emerald-400 font-bold font-mono">₹${r.tariff || 500} <span class="text-slate-400 font-normal">(${r.staySlot || '12h'})</span></div>
                </div>
            </div>

            <div class="bg-slate-950 p-2 rounded border border-slate-800/80 space-y-1 text-[10px]">
                <div class="flex justify-between items-center text-slate-400">
                    <span>In: <span class="font-mono text-slate-200">${r.checkIn}</span></span>
                    <span>Out: <span class="font-mono ${r.checkOut && r.checkOut !== '-' ? 'text-amber-400 font-bold' : 'text-slate-500'}">${r.checkOut || 'Active'}</span></span>
                </div>
                <div class="pt-0.5 border-t border-slate-800 text-slate-300 break-words"><span class="text-slate-500">Address:</span> ${r.address}</div>
            </div>

            <div class="grid grid-cols-4 gap-1.5 pt-0.5">
                <button onclick="openEditModal(${r.id})" class="col-span-2 bg-indigo-600 text-white py-1.5 rounded text-[11px] font-semibold flex items-center justify-center gap-1"><i class="fa-solid fa-pen-to-square"></i> Edit</button>
                <button onclick="printPoliceReport(${r.id})" class="bg-slate-800 text-slate-200 py-1.5 rounded text-[11px] font-semibold border border-slate-700 flex items-center justify-center"><i class="fa-solid fa-print"></i></button>
                ${isOccupied ? `<button onclick="initiateCheckOutModal(${r.id})" class="bg-emerald-600 text-white py-1.5 rounded text-[11px] font-semibold flex items-center justify-center gap-1"><i class="fa-solid fa-receipt"></i> Out</button>` : `<button onclick="deleteRecord(${r.id})" class="bg-rose-600/80 text-white py-1.5 rounded text-[11px] font-semibold flex items-center justify-center"><i class="fa-solid fa-trash"></i></button>`}
            </div>
        `;
        container.appendChild(card);
    });
}

// ================= DUAL ID MODAL (VIEW & CROP BOTH SIDES) =================
window.openDualIdModal = function(id) {
    const record = allRecords.find(r => r.id === id);
    if (!record) return;
    activeDualRecord = record;
    activeRecordForDirectCrop = record;

    document.getElementById('dualFrontImg').src = record.idPhotoFile;

    const backImg = document.getElementById('dualBackImg');
    const noBackMsg = document.getElementById('noDualBackMsg');
    const btnCropBack = document.getElementById('btnDualCropBack');

    if (record.idBackPhotoFile) {
        backImg.src = record.idBackPhotoFile;
        backImg.classList.remove('hidden');
        noBackMsg.classList.add('hidden');
        btnCropBack.classList.remove('hidden');
    } else {
        backImg.src = "";
        backImg.classList.add('hidden');
        noBackMsg.classList.remove('hidden');
        btnCropBack.classList.add('hidden');
    }

    document.getElementById('dualIdModal').classList.remove('hidden');
};

window.closeDualIdModal = function() {
    document.getElementById('dualIdModal').classList.add('hidden');
    activeDualRecord = null;
};

window.cropExistingId = function(type) {
    if (!activeDualRecord) return;
    closeDualIdModal();
    if (type === 'idFront') {
        openCropperModal(activeDualRecord.idPhotoFile, 'editIdFront');
    } else {
        openCropperModal(activeDualRecord.idBackPhotoFile, 'editIdBack');
    }
};

// ================= CHECK-OUT BILLING & SETTLEMENT MODAL =================
window.initiateCheckOutModal = function(id) {
    const record = allRecords.find(r => r.id === id);
    if (!record) return;
    activeCheckoutRecord = record;

    document.getElementById('coGuestName').innerText = record.name;
    document.getElementById('coRoomNumber').innerText = `Room #${record.room}`;
    document.getElementById('coMembersCount').innerText = `${record.guestCount || 1} Person(s)`;
    document.getElementById('coCheckInTime').innerText = record.checkIn;

    // Calculate elapsed hours
    let hoursElapsed = 1;
    if (record.checkInRaw) {
        const checkInDate = new Date(record.checkInRaw);
        const diffMs = Math.max(0, new Date() - checkInDate);
        hoursElapsed = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60)));
    }
    document.getElementById('coActualStay').innerText = `~${hoursElapsed} Hours Elapsed`;

    const tariff = Number(record.tariff) || 500;
    const advance = Number(record.advancePaid) || tariff;

    document.getElementById('coStaySlot').value = `${record.staySlot || '12 Hours'} (Base ₹${tariff})`;
    document.getElementById('coTotalBill').value = tariff;
    document.getElementById('coAdvancePaid').value = advance;

    calculateBalanceDue();
    document.getElementById('checkoutBillingModal').classList.remove('hidden');
};

window.calculateBalanceDue = function() {
    const total = Number(document.getElementById('coTotalBill').value) || 0;
    const adv = Number(document.getElementById('coAdvancePaid').value) || 0;
    const due = Math.max(0, total - adv);
    document.getElementById('coBalanceDue').value = due;
};

window.closeCheckoutBillingModal = function() {
    document.getElementById('checkoutBillingModal').classList.add('hidden');
    activeCheckoutRecord = null;
};

window.confirmCheckOutSettlement = async function() {
    if (!activeCheckoutRecord) return;
    const totalBill = Number(document.getElementById('coTotalBill').value) || 0;
    const advancePaid = Number(document.getElementById('coAdvancePaid').value) || 0;
    const balanceDue = Number(document.getElementById('coBalanceDue').value) || 0;
    const settlementMode = document.getElementById('coSettlementMode').value;
    const actualHours = document.getElementById('coActualStay').innerText;

    try {
        const res = await fetch(`/checkout/${activeCheckoutRecord.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ totalBill, advancePaid, balanceDue, settlementMode, actualHours })
        });
        const result = await res.json();
        if (result.success) {
            showToast(`Checked-out! Collected balance ₹${balanceDue} via ${settlementMode}.`, "success");
            closeCheckoutBillingModal();
            loadRecords();
        } else {
            showToast("Failed to process checkout", "error");
        }
    } catch(err) {
        showToast("Error processing checkout", "error");
    }
};

// ================= EDIT MODAL (WITH IMAGE CROP CAPABILITY) =================

function openEditModal(id) {
    const record = allRecords.find(r => r.id === id);
    if (!record) return;
    activeRecordForDirectCrop = record;

    document.getElementById('editRecordId').value = record.id;
    document.getElementById('editRoom').value = record.room || '';
    document.getElementById('editName').value = record.name || '';
    document.getElementById('editGuestCount').value = record.guestCount || 1;
    document.getElementById('editMobile').value = record.mobile || '';
    document.getElementById('editTariff').value = record.tariff || 500;
    document.getElementById('editDob').value = record.dob || '';
    document.getElementById('editIdType').value = record.idType || 'Aadhaar Card';
    document.getElementById('editIdNumber').value = record.idNumber || '';
    document.getElementById('editPurpose').value = record.purpose || '';
    document.getElementById('editNationality').value = record.nationality || 'Indian';
    document.getElementById('editCheckIn').value = record.checkIn || '';
    document.getElementById('editCheckOut').value = record.checkOut || '-';
    document.getElementById('editAddress').value = record.address || '';

    document.getElementById('editGuestImg').src = record.guestPhotoFile;
    document.getElementById('editIdImg').src = record.idPhotoFile;

    const backBox = document.getElementById('editBackBox');
    const backImgEl = document.getElementById('editIdBackImg');
    const noBackEl = document.getElementById('editNoBackMsg');
    const gridContainer = document.getElementById('editImagesGrid');

    if (record.idBackPhotoFile) {
        gridContainer.className = "grid grid-cols-3 gap-2 mb-3 bg-slate-950 p-2.5 rounded-lg border border-slate-800";
        backBox.style.display = "flex";
        backImgEl.src = record.idBackPhotoFile;
        backImgEl.classList.remove('hidden');
        noBackEl.classList.add('hidden');
    } else {
        gridContainer.className = "grid grid-cols-2 gap-2 mb-3 bg-slate-950 p-2.5 rounded-lg border border-slate-800";
        backBox.style.display = "none";
    }

    document.getElementById('editModal').classList.remove('hidden');
}

function renderDesktopTable(records, offset) {
    const tbody = document.getElementById('dataTableBody');
    tbody.innerHTML = "";

    records.forEach((r, idx) => {
        const isOccupied = (r.status === "Occupied");
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-800/40 transition border-b border-slate-800/60";
        tr.innerHTML = `
            <td class="p-2.5 text-center font-bold text-slate-500">${offset + idx + 1}</td>
            <td class="p-2.5">
                <img src="${r.guestPhotoFile}" class="w-9 h-9 object-cover rounded border border-slate-700 cursor-pointer hover:border-indigo-400 shadow" title="Click to View" onclick="zoomImage('${r.guestPhotoFile}')">
            </td>
            <td class="p-2.5">
                <div class="flex items-center gap-1.5 cursor-pointer group" onclick="openDualIdModal(${r.id})" title="Click to view & crop Front/Back IDs">
                    <div class="relative">
                        <img src="${r.idPhotoFile}" class="w-10 h-7 object-cover rounded border border-emerald-500/50 group-hover:border-emerald-400 shadow">
                        <span class="absolute -bottom-1 -right-1 text-[8px] bg-emerald-950 text-emerald-300 px-1 rounded font-bold border border-emerald-500/40">F</span>
                    </div>
                    ${r.idBackPhotoFile ? `
                    <div class="relative">
                        <img src="${r.idBackPhotoFile}" class="w-10 h-7 object-cover rounded border border-amber-500/50 group-hover:border-amber-400 shadow">
                        <span class="absolute -bottom-1 -right-1 text-[8px] bg-amber-950 text-amber-300 px-1 rounded font-bold border border-amber-500/40">B</span>
                    </div>` : `
                    <span class="text-[9px] text-slate-500 italic bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">No Back</span>
                    `}
                </div>
            </td>
            <td class="p-2.5 font-mono text-[11px] text-slate-300 whitespace-nowrap">${r.checkIn || '-'}</td>
            <td class="p-2.5 text-center"><span class="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-extrabold text-xs font-mono">Room ${r.room}</span></td>
            <td class="p-2.5 whitespace-nowrap">
                <div class="font-bold text-slate-100 uppercase">${r.name}</div>
                <div class="text-[10px] text-slate-400 flex items-center gap-1">
                    <i class="fa-solid fa-users text-[9px] text-indigo-400"></i> ${r.guestCount || 1} Person(s)
                </div>
            </td>
            <td class="p-2.5 whitespace-nowrap font-mono font-bold">
                <a href="tel:+91${r.mobile}" class="text-emerald-400 hover:underline flex items-center gap-1 select-all" title="Click to Call">
                    <i class="fa-solid fa-phone text-[10px]"></i> ${r.mobile}
                </a>
            </td>
            <td class="p-2.5 whitespace-nowrap">
                <div class="text-[11px] font-mono text-emerald-400 font-bold">₹${r.tariff || 500} <span class="text-[9px] text-slate-400 font-normal">(${r.staySlot || '12h'})</span></div>
                <div class="text-[10px] text-slate-400">Adv: <span class="font-mono text-white font-semibold">₹${r.advancePaid || 0}</span></div>
            </td>
            <td class="p-2.5 font-mono text-[11px] ${r.checkOut && r.checkOut !== '-' ? 'text-amber-400' : 'text-slate-500'} whitespace-nowrap">${r.checkOut || '-'}</td>
            <td class="p-2.5 whitespace-nowrap">
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${isOccupied ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'}">
                    <span class="w-1.5 h-1.5 rounded-full ${isOccupied ? 'bg-rose-400 animate-ping' : 'bg-emerald-400'}"></span>
                    ${isOccupied ? 'Occupied' : 'Checked-Out'}
                </span>
            </td>
            <td class="p-2.5 text-center">
                <div class="flex items-center justify-center gap-1.5 flex-wrap">
                    <button onclick="openEditModal(${r.id})" title="Edit Details" class="bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1 rounded text-[10px] font-semibold"><i class="fa-solid fa-pen-to-square"></i> Edit</button>
                    <button onclick="printPoliceReport(${r.id})" title="Print PDF" class="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded text-[10px]"><i class="fa-solid fa-print"></i></button>
                    ${isOccupied ? `<button onclick="initiateCheckOutModal(${r.id})" title="Check-Out" class="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded text-[10px] font-semibold"><i class="fa-solid fa-receipt mr-0.5"></i> Out</button>` : ''}
                    <button onclick="deleteRecord(${r.id})" title="Delete" class="bg-rose-600/80 hover:bg-rose-600 text-white px-2 py-1 rounded text-[10px]"><i class="fa-solid fa-trash"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}


function closeEditModal() {
    document.getElementById('editModal').classList.add('hidden');
    activeRecordForDirectCrop = null;
}

window.cropFromEditModal = function(type) {
    if (!activeRecordForDirectCrop) return;
    if (type === 'guest') {
        openCropperModal(activeRecordForDirectCrop.guestPhotoFile, 'editGuest');
    } else if (type === 'idFront') {
        openCropperModal(activeRecordForDirectCrop.idPhotoFile, 'editIdFront');
    } else if (type === 'idBack') {
        if (activeRecordForDirectCrop.idBackPhotoFile) {
            openCropperModal(activeRecordForDirectCrop.idBackPhotoFile, 'editIdBack');
        }
    }
};

async function submitEditRecord(e) {
    e.preventDefault();
    const id = document.getElementById('editRecordId').value;
    const updated = {
        room: document.getElementById('editRoom').value,
        name: document.getElementById('editName').value.trim(),
        guestCount: Number(document.getElementById('editGuestCount').value) || 1,
        mobile: document.getElementById('editMobile').value.trim(),
        tariff: Number(document.getElementById('editTariff').value) || 500,
        dob: document.getElementById('editDob').value,
        idType: document.getElementById('editIdType').value,
        idNumber: document.getElementById('editIdNumber').value.trim(),
        purpose: document.getElementById('editPurpose').value.trim(),
        nationality: document.getElementById('editNationality').value.trim(),
        checkIn: document.getElementById('editCheckIn').value.trim(),
        checkOut: document.getElementById('editCheckOut').value.trim(),
        address: document.getElementById('editAddress').value.trim()
    };
    try {
        const res = await fetch(`/update/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updated)
        });
        if ((await res.json()).success) {
            showToast("Record Updated Successfully!", "success");
            closeEditModal();
            loadRecords();
        }
    } catch(err) { showToast("Update failed", "error"); }
}

// ================= DELETE WITH ADMIN PASSWORD =================
async function deleteRecord(id) {
    const pwd = prompt("Enter Admin Password to delete this record:");
    if (!pwd) return;
    try {
        const res = await fetch(`/delete/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: pwd })
        });
        const d = await res.json();
        if (d.success) {
            showToast("Record Deleted Successfully!", "success");
            loadRecords();
        } else {
            showToast(d.message || "Incorrect Admin Password!", "error");
        }
    } catch(e) { showToast("Error deleting record", "error"); }
}

// Room Grid Modal
window.openRoomModal = async function() {
    const records = await (await fetch('/records')).json();
    const occupiedRooms = records.filter(r => r.status === "Occupied").map(r => String(r.room));
    const grid = document.getElementById('roomGrid');
    grid.innerHTML = "";

    for (let i = 1; i <= TOTAL_ROOMS; i++) {
        const isFilled = occupiedRooms.includes(String(i));
        const btn = document.createElement('button');
        btn.type = "button";
        btn.className = `p-2 rounded-lg font-bold text-xs border transition flex flex-col items-center justify-center gap-0.5 ${isFilled ? 'bg-rose-950/80 border-rose-600 text-rose-300 cursor-not-allowed shadow-inner' : 'bg-emerald-950/80 border-emerald-600 text-emerald-300 hover:bg-emerald-900 active:scale-95 shadow'}`;
        btn.innerHTML = `<span>Room ${i}</span><span class="text-[8px] font-normal uppercase">${isFilled ? 'Occupied' : 'Vacant'}</span>`;
        if (!isFilled) {
            btn.onclick = () => { document.getElementById('roomNumber').value = i; closeRoomModal(); showToast(`Room ${i} selected`, "info"); };
        } else {
            btn.onclick = () => showToast(`Room ${i} is Occupied!`, "warning");
        }
        grid.appendChild(btn);
    }
    document.getElementById('roomModal').classList.remove('hidden');
};
window.closeRoomModal = function() { document.getElementById('roomModal').classList.add('hidden'); };

window.zoomImage = function(url) {
    if (!url) return;
    document.getElementById('zoomedImg').src = url;
    document.getElementById('zoomModal').classList.remove('hidden');
};
window.closeZoom = function() { document.getElementById('zoomModal').classList.add('hidden'); };

// Print Police Verification Report (Includes Both IDs)
window.printPoliceReport = function(id) {
    const record = allRecords.find(r => r.id === id);
    if (!record) return;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Police Verification - ${record.name}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 25px; color: #111; max-width: 800px; margin: auto; }
                .header { text-align: center; border-bottom: 2px solid #1e3a8a; padding-bottom: 10px; margin-bottom: 15px; }
                .header h1 { margin: 0; color: #1e3a8a; font-size: 22px; }
                .table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                .table th, .table td { border: 1px solid #cbd5e1; padding: 7px 10px; font-size: 13px; text-align: left; }
                .table th { background-color: #f1f5f9; width: 30%; color: #334155; }
                .images-container { display: flex; justify-content: space-around; margin: 25px 0; gap: 10px; }
                .img-card { text-align: center; }
                .img-card img { width: 210px; height: 145px; object-fit: cover; border: 2px solid #94a3b8; border-radius: 4px; }
                .footer { margin-top: 50px; display: flex; justify-content: space-between; font-size: 13px; font-weight: bold; }
                @media print { body { padding: 10px; } }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>BHARAT GUEST HOUSE</h1>
                <p>OFFICIAL POLICE VERIFICATION REPORT & GUEST RECORD</p>
            </div>
            <table class="table">
                <tr><th>Check-In Date/Time</th><td>${record.checkIn}</td></tr>
                <tr><th>Assigned Room</th><td><b>Room ${record.room}</b></td></tr>
                <tr><th>Guest Name & Members</th><td><b>${record.name}</b> (${record.guestCount || 1} Person)</td></tr>
                <tr><th>Phone Number</th><td>${record.mobile}</td></tr>
                <tr><th>DOB</th><td>${record.dob}</td></tr>
                <tr><th>ID Document</th><td>${record.idType} - <b>${record.idNumber}</b></td></tr>
                <tr><th>Tariff & Slot</th><td>₹${record.tariff || 500} (${record.staySlot || '12h'})</td></tr>
                <tr><th>Purpose of Stay</th><td>${record.purpose}</td></tr>
                <tr><th>Permanent Address</th><td>${record.address}</td></tr>
                <tr><th>Check-Out</th><td>${record.checkOut || 'Active (Occupied)'}</td></tr>
                <tr><th>Status</th><td><b>${record.status}</b></td></tr>
            </table>
            <div class="images-container">
                <div class="img-card"><p><b>Guest Photo</b></p><img src="${record.guestPhotoFile}"></div>
                <div class="img-card"><p><b>ID Proof Front</b></p><img src="${record.idPhotoFile}"></div>
                ${record.idBackPhotoFile ? `<div class="img-card"><p><b>ID Proof Back</b></p><img src="${record.idBackPhotoFile}"></div>` : ''}
            </div>
            <div class="footer"><div>Authorized Signatory</div><div>Guest Signature</div></div>
            <script>window.onload = function() { window.print(); }</script>
        </body>
        </html>
    `);
    printWindow.document.close();
};

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    const colors = { success: 'bg-emerald-600', error: 'bg-rose-600', warning: 'bg-amber-600', info: 'bg-indigo-600' };
    toast.className = `${colors[type] || colors.info} text-white pointer-events-auto px-3.5 py-2 rounded-lg text-xs font-semibold shadow-xl flex items-center gap-2 transform transition-all duration-200 translate-y-2 opacity-0`;
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.remove('translate-y-2', 'opacity-0'));
    setTimeout(() => { toast.classList.add('opacity-0', 'translate-x-full'); setTimeout(() => toast.remove(), 250); }, 3200);
}