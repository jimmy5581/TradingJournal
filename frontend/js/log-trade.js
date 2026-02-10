document.addEventListener('DOMContentLoaded', function() {
    const tradeForm = document.getElementById('tradeForm');
    const cancelBtn = document.getElementById('cancelBtn');
    const saveCloseBtn = document.getElementById('saveCloseBtn');

    setCurrentDateTime();

    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            if (confirm('Discard changes and return to journal?')) {
                window.location.href = 'journal.html';
            }
        });
    }

    if (saveCloseBtn) {
        saveCloseBtn.addEventListener('click', handleSaveAndClose);
    }

    const screenshot = document.getElementById('screenshot');
    if (screenshot) {
        screenshot.addEventListener('change', handleScreenshotPreview);
    }

    const ocrImageInput = document.getElementById('ocrImageInput');
    const ocrFileName = document.getElementById('ocrFileName');
    const ocrStatus = document.getElementById('ocrStatus');
    const ocrAutofillBtn = document.getElementById('ocrAutofillBtn');
    
    if (ocrImageInput) {
        ocrImageInput.addEventListener('change', handleOcrImageSelect);
    }
    
    if (ocrAutofillBtn) {
        ocrAutofillBtn.addEventListener('click', handleOcrAutoFill);
    }

    function setCurrentDateTime() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        
        const dateTimeString = `${year}-${month}-${day}T${hours}:${minutes}`;
        const tradeDateField = document.getElementById('tradeDate');
        if (tradeDateField) {
            tradeDateField.value = dateTimeString;
        }
    }

    function handleScreenshotPreview(e) {
        const file = e.target.files[0];
        const screenshotFileName = document.getElementById('screenshotFileName');
        const screenshotPreview = document.getElementById('screenshotPreview');
        
        if (file) {
            const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
            if (!allowedTypes.includes(file.type)) {
                showMessage('Invalid file type. Please upload PNG, JPEG, or WEBP image.', 'error');
                e.target.value = '';
                return;
            }

            const maxSize = 10 * 1024 * 1024;
            if (file.size > maxSize) {
                showMessage('File too large. Maximum size is 10MB.', 'error');
                e.target.value = '';
                return;
            }

            screenshotFileName.textContent = file.name;
            
            const reader = new FileReader();
            reader.onload = function(e) {
                screenshotPreview.innerHTML = `<img src="${e.target.result}" alt="Screenshot preview">`;
                screenshotPreview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        } else {
            screenshotFileName.textContent = 'Upload reference screenshot';
            screenshotPreview.style.display = 'none';
        }
    }

    function handleOcrImageSelect(e) {
        const file = e.target.files[0];
        
        if (file) {
            const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
            if (!allowedTypes.includes(file.type)) {
                ocrFileName.textContent = 'Choose screenshot...';
                showOcrStatus('Invalid file type. Please upload PNG, JPEG, or WEBP image.', 'error');
                e.target.value = '';
                ocrAutofillBtn.disabled = true;
                return;
            }

            const maxSize = 10 * 1024 * 1024;
            if (file.size > maxSize) {
                ocrFileName.textContent = 'Choose screenshot...';
                showOcrStatus('File too large. Maximum size is 10MB.', 'error');
                e.target.value = '';
                ocrAutofillBtn.disabled = true;
                return;
            }

            ocrFileName.textContent = file.name;
            ocrStatus.style.display = 'none';
            ocrAutofillBtn.disabled = false;
        } else {
            ocrFileName.textContent = 'Choose screenshot...';
            ocrAutofillBtn.disabled = true;
        }
    }

    async function handleOcrAutoFill() {
        const ocrImageInput = document.getElementById('ocrImageInput');
        const file = ocrImageInput.files[0];
        
        if (!file) return;

        ocrAutofillBtn.disabled = true;
        showOcrStatus('Processing screenshot...', 'loading');

        try {
            const formData = new FormData();
            formData.append('screenshot', file);

            const response = await fetch('http://localhost:5000/api/ocr/scan', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                const fieldsCount = populateFormFromOCR(result.data.extracted, true);
                
                if (fieldsCount > 0) {
                    showOcrStatus(`Successfully extracted ${fieldsCount} field${fieldsCount !== 1 ? 's' : ''}`, 'success');
                } else {
                    showOcrStatus('No trade details found in image', 'error');
                }

                ocrImageInput.value = '';
                ocrFileName.textContent = 'Choose screenshot...';
                ocrAutofillBtn.disabled = true;
                
                setTimeout(() => {
                    document.querySelectorAll('.auto-filled').forEach(field => {
                        field.classList.remove('auto-filled');
                    });
                }, 3000);
            } else {
                showOcrStatus('Could not extract trade details', 'error');
                ocrAutofillBtn.disabled = false;
            }
        } catch (error) {
            console.error('OCR error: - log-trade.js:153', error);
            showOcrStatus('OCR processing failed', 'error');
            ocrAutofillBtn.disabled = false;
        }
    }

    function showOcrStatus(message, type) {
        const ocrStatus = document.getElementById('ocrStatus');
        ocrStatus.style.display = 'block';
        ocrStatus.className = `ocr-status ${type}`;
        ocrStatus.textContent = message;
    }

    function populateFormFromOCR(extracted, addHighlight = false) {
        let fieldsPopulated = 0;

        const populateField = (fieldId, value) => {
            const field = document.getElementById(fieldId);
            if (field && value !== null && value !== undefined && !field.value) {
                field.value = value;
                fieldsPopulated++;
                
                if (addHighlight) {
                    field.classList.add('auto-filled');
                }
            }
        };

        if (extracted.symbol) {
            populateField('symbol', extracted.symbol);
        }

        if (extracted.side) {
            populateField('side', extracted.side.toLowerCase());
        }

        if (extracted.entryPrice) {
            populateField('entryPrice', extracted.entryPrice);
        }

        if (extracted.exitPrice) {
            populateField('exitPrice', extracted.exitPrice);
        }

        if (extracted.quantity) {
            populateField('quantity', extracted.quantity);
        }

        if (extracted.timestamp) {
            try {
                const date = new Date(extracted.timestamp);
                if (!isNaN(date.getTime())) {
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    const hours = String(date.getHours()).padStart(2, '0');
                    const minutes = String(date.getMinutes()).padStart(2, '0');
                    populateField('tradeDate', `${year}-${month}-${day}T${hours}:${minutes}`);
                }
            } catch (e) {
                console.log('Could not parse timestamp: - log-trade.js:212', extracted.timestamp);
            }
        }

        return fieldsPopulated;
    }

    function collectFormData() {
        const formData = new FormData(tradeForm);
        
        // Collect checkbox arrays
        const setupTypes = [];
        document.querySelectorAll('input[name="setupType"]:checked').forEach(cb => {
            setupTypes.push(cb.value);
        });
        
        const emotionalStates = [];
        document.querySelectorAll('input[name="emotionalState"]:checked').forEach(cb => {
            emotionalStates.push(cb.value);
        });
        
        const mistakes = [];
        document.querySelectorAll('input[name="mistake"]:checked').forEach(cb => {
            mistakes.push(cb.value);
        });
        
        const tradeData = {
            tradeDetails: {
                dateTime: formData.get('tradeDate'),
                symbol: formData.get('symbol'),
                side: formData.get('side'),
                quantity: formData.get('quantity'),
                entryPrice: formData.get('entryPrice'),
                exitPrice: formData.get('exitPrice'),
                stopLoss: formData.get('stopLoss'),
                target: formData.get('target')
            },
            fnoSpecifics: {
                contractType: formData.get('contractType'),
                expiryDate: formData.get('expiryDate'),
                strikePrice: formData.get('strikePrice'),
                optionType: formData.get('optionType'),
                lotSize: formData.get('lotSize'),
                positionStatus: formData.get('positionStatus')
            },
            strategySetup: {
                strategyName: formData.get('strategyName'),
                timeframe: formData.get('timeframe'),
                setupTypes: setupTypes,
                convictionScore: formData.get('convictionScore'),
                preTradePlan: formData.get('preTradePlan')
            },
            psychology: {
                postTradeReview: formData.get('postTradeReview'),
                emotionalStates: emotionalStates,
                mistakes: mistakes
            },
            screenshots: {
                screenshot: formData.get('screenshot'),
                contractNote: formData.get('contractNote')
            }
        };

        return tradeData;
    }

    function validateForm() {
        const requiredFields = [
            { id: 'tradeDate', label: 'Date & Time' },
            { id: 'symbol', label: 'Symbol' },
            { id: 'side', label: 'Side' },
            { id: 'quantity', label: 'Quantity' },
            { id: 'entryPrice', label: 'Entry Price' }
        ];

        for (const field of requiredFields) {
            const element = document.getElementById(field.id);
            if (!element || !element.value.trim()) {
                if (element) element.focus();
                showMessage(`Please fill in: ${field.label}`, 'error');
                return false;
            }
        }

        return true;
    }

    function handleSaveAndClose(e) {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        const tradeData = collectFormData();
        console.log('Saving trade: - log-trade.js:307', tradeData);
        
        saveTradeToBackend(tradeData);
        
        showMessage('Trade saved successfully!', 'success');
        
        setTimeout(() => {
            window.location.href = 'journal.html';
        }, 1500);
    }

    async function saveTradeToBackend(data) {
        try {
            console.log('Would send to API: - log-trade.js:320', data);
        } catch (error) {
            console.error('Error saving trade: - log-trade.js:322', error);
            showMessage('Error saving trade. Please try again.', 'error');
        }
    }

    function showMessage(text, type = 'success') {
        const existingMessage = document.querySelector('.message');
        if (existingMessage) {
            existingMessage.remove();
        }

        const message = document.createElement('div');
        message.className = `message message-${type}`;
        message.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            background: ${type === 'success' ? '#10b981' : '#ef4444'};
            color: white;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;
        message.textContent = text;
        
        document.body.appendChild(message);
        
        setTimeout(() => {
            message.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => message.remove(), 300);
        }, 5000);
    }
});
