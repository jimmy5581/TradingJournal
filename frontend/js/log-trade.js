// Log Trade Form JavaScript
document.addEventListener('DOMContentLoaded', function() {
    const tradeForm = document.getElementById('tradeForm');
    const saveDraftBtn = document.getElementById('saveDraftBtn');
    const saveCloseBtn = document.getElementById('saveCloseBtn');
    const instrumentType = document.getElementById('instrumentType');
    const segment = document.getElementById('segment');

    // Set current date/time by default
    setCurrentDateTime();

    // Event Listeners
    saveDraftBtn.addEventListener('click', handleSaveDraft);
    saveCloseBtn.addEventListener('click', handleSaveAndClose);
    instrumentType.addEventListener('change', handleInstrumentTypeChange);
    segment.addEventListener('change', handleSegmentChange);

    // OCR Event Listeners
    const chartScreenshot = document.getElementById('chartScreenshot');
    const contractNote = document.getElementById('contractNote');
    
    if (chartScreenshot) {
        chartScreenshot.addEventListener('change', handleScreenshotUpload);
    }
    if (contractNote) {
        contractNote.addEventListener('change', handleScreenshotUpload);
    }

    // OCR Import Section Event Listeners
    const ocrImageInput = document.getElementById('ocrImageInput');
    const ocrFillBtn = document.getElementById('ocrFillBtn');
    const ocrFileName = document.getElementById('ocrFileName');
    const ocrStatus = document.getElementById('ocrStatus');
    
    if (ocrImageInput) {
        ocrImageInput.addEventListener('change', handleOcrImageSelect);
    }
    
    if (ocrFillBtn) {
        ocrFillBtn.addEventListener('click', handleOcrAutoFill);
    }

    /**
     * Set current date and time in IST
     */
    function setCurrentDateTime() {
        const now = new Date();
        const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
        const istDate = new Date(now.getTime() + istOffset);
        
        // Format for datetime-local input
        const year = istDate.getUTCFullYear();
        const month = String(istDate.getUTCMonth() + 1).padStart(2, '0');
        const day = String(istDate.getUTCDate()).padStart(2, '0');
        const hours = String(istDate.getUTCHours()).padStart(2, '0');
        const minutes = String(istDate.getUTCMinutes()).padStart(2, '0');
        
        const dateTimeString = `${year}-${month}-${day}T${hours}:${minutes}`;
        document.getElementById('tradeDate').value = dateTimeString;
    }

    /**
     * Handle instrument type changes
     */
    function handleInstrumentTypeChange(e) {
        const fnoCard = document.querySelector('.form-card:nth-of-type(2)');
        const value = e.target.value;
        
        // Show/hide F&O section based on instrument type
        if (value === 'futures' || value === 'options') {
            fnoCard.style.display = 'block';
        } else {
            fnoCard.style.display = 'block'; // Keep visible but optional
        }
    }

    /**
     * Handle segment changes
     */
    function handleSegmentChange(e) {
        const value = e.target.value;
        const instrumentType = document.getElementById('instrumentType');
        
        // Auto-adjust instrument options based on segment
        if (value === 'index_fno') {
            // F&O segment - show futures and options
            console.log('F&O segment selected');
        }
    }

    /**
     * Handle OCR image selection (from dedicated import section)
     */
    function handleOcrImageSelect(e) {
        const file = e.target.files[0];
        const ocrFillBtn = document.getElementById('ocrFillBtn');
        const ocrFileName = document.getElementById('ocrFileName');
        const ocrStatus = document.getElementById('ocrStatus');
        
        if (file) {
            // Validate file type
            const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
            if (!allowedTypes.includes(file.type)) {
                ocrFileName.textContent = 'Choose screenshot...';
                ocrFillBtn.disabled = true;
                showOcrStatus('Invalid file type. Please upload PNG, JPEG, or WEBP image.', 'error');
                e.target.value = '';
                return;
            }

            // Validate file size (10MB)
            const maxSize = 10 * 1024 * 1024;
            if (file.size > maxSize) {
                ocrFileName.textContent = 'Choose screenshot...';
                ocrFillBtn.disabled = true;
                showOcrStatus('File too large. Maximum size is 10MB.', 'error');
                e.target.value = '';
                return;
            }

            // Update UI
            ocrFileName.textContent = file.name;
            ocrFillBtn.disabled = false;
            ocrStatus.style.display = 'none';
        } else {
            ocrFileName.textContent = 'Choose screenshot...';
            ocrFillBtn.disabled = true;
        }
    }

    /**
     * Handle OCR auto-fill button click
     */
    async function handleOcrAutoFill() {
        const ocrImageInput = document.getElementById('ocrImageInput');
        const ocrFillBtn = document.getElementById('ocrFillBtn');
        const file = ocrImageInput.files[0];
        
        if (!file) return;

        // Disable button and show loading
        ocrFillBtn.disabled = true;
        showOcrStatus('Processing screenshot... This may take 5-10 seconds.', 'loading');

        try {
            // Create FormData and upload
            const formData = new FormData();
            formData.append('screenshot', file);

            const response = await fetch('http://localhost:5000/api/ocr/scan', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                // Populate form fields with extracted data
                const fieldsCount = populateFormFromOCR(result.data.extracted, true);
                
                if (fieldsCount > 0) {
                    showOcrStatus(`✓ Successfully extracted ${fieldsCount} field${fieldsCount !== 1 ? 's' : ''}. Please review before saving.`, 'success');
                } else {
                    showOcrStatus('Image processed, but no trade details were found. Please enter manually.', 'error');
                }

                // Clear the file input
                ocrImageInput.value = '';
                document.getElementById('ocrFileName').textContent = 'Choose screenshot...';
                
                // Remove auto-fill highlights after 3 seconds
                setTimeout(() => {
                    document.querySelectorAll('.auto-filled').forEach(field => {
                        field.classList.remove('auto-filled');
                    });
                }, 3000);
            } else {
                showOcrStatus(`Could not extract trade details from this image. ${result.error || ''}`, 'error');
            }
        } catch (error) {
            console.error('OCR error:', error);
            showOcrStatus('OCR processing failed. Please check your connection and try again, or enter details manually.', 'error');
        } finally {
            // Re-enable button
            setTimeout(() => {
                ocrFillBtn.disabled = ocrImageInput.files.length === 0;
            }, 1000);
        }
    }

    /**
     * Show OCR status message
     */
    function showOcrStatus(message, type) {
        const ocrStatus = document.getElementById('ocrStatus');
        ocrStatus.style.display = 'block';
        ocrStatus.className = `ocr-status ${type}`;
        
        if (type === 'loading') {
            ocrStatus.innerHTML = `
                <span class="ocr-spinner"></span>
                <span>${message}</span>
            `;
        } else {
            ocrStatus.textContent = message;
        }
    }

    /**
     * Handle screenshot upload and trigger OCR
     */
    async function handleScreenshotUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            showMessage('Invalid file type. Please upload PNG, JPEG, or WEBP image.', 'error');
            e.target.value = '';
            return;
        }

        // Validate file size (10MB)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            showMessage('File too large. Maximum size is 10MB.', 'error');
            e.target.value = '';
            return;
        }

        // Show loading message
        showMessage('📸 Processing screenshot with OCR...', 'info');

        try {
            // Create FormData and upload
            const formData = new FormData();
            formData.append('screenshot', file);

            const response = await fetch('http://localhost:5000/api/ocr/scan', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                // Populate form fields with extracted data
                populateFormFromOCR(result.data.extracted);
                
                const fieldsFound = result.data.metadata.fieldsExtracted;
                showMessage(`✅ OCR completed! Found ${fieldsFound} field${fieldsFound !== 1 ? 's' : ''}.`, 'success');
            } else {
                showMessage(`OCR failed: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('OCR error:', error);
            showMessage('OCR processing failed. Please enter details manually.', 'error');
        }
    }

    /**
     * Populate form fields from OCR extracted data
     */
    /**
     * Populate form fields from OCR extracted data
     * @param {Object} extracted - Extracted data from OCR
     * @param {Boolean} addHighlight - Whether to add auto-filled highlighting
     * @returns {Number} - Number of fields populated
     */
    function populateFormFromOCR(extracted, addHighlight = false) {
        let fieldsPopulated = 0;

        // Only populate if value exists and current field is empty
        const populateField = (fieldId, value) => {
            const field = document.getElementById(fieldId);
            if (field && value !== null && value !== undefined && !field.value) {
                field.value = value;
                fieldsPopulated++;
                
                if (addHighlight) {
                    // Add visual indicator with animation
                    field.classList.add('auto-filled');
                } else {
                    // Simple background color change
                    field.style.backgroundColor = '#f0fdf4'; // Light green
                    setTimeout(() => {
                        field.style.backgroundColor = '';
                    }, 2000);
                }
            }
        };

        // Populate trade details
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
            // Try to convert timestamp to datetime-local format
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
                console.log('Could not parse timestamp:', extracted.timestamp);
            }
        }

        console.log('OCR data populated:', extracted, `Fields filled: ${fieldsPopulated}`);
        return fieldsPopulated;
    }

    /**
     * Collect form data
     */
    function collectFormData() {
        const formData = new FormData(tradeForm);
        const tradeData = {
            tradeDetails: {
                dateTime: formData.get('tradeDate'),
                segment: formData.get('segment'),
                instrumentType: formData.get('instrumentType'),
                symbol: formData.get('symbol'),
                side: formData.get('side'),
                quantity: formData.get('quantity'),
                entryPrice: formData.get('entryPrice'),
                exitPrice: formData.get('exitPrice'),
                stopLoss: formData.get('stopLoss'),
                target: formData.get('target'),
                productType: formData.get('productType')
            },
            fnoSpecifics: {
                expiryDate: formData.get('expiryDate'),
                lotSize: formData.get('lotSize'),
                strikePrice: formData.get('strikePrice'),
                optionType: formData.get('optionType'),
                positionStatus: formData.get('positionStatus'),
                linkedNews: formData.get('linkedNews')
            },
            strategySetup: {
                setupTags: formData.getAll('setupTags'),
                strategyName: formData.get('strategyName'),
                timeframe: formData.get('timeframe'),
                riskTaken: formData.get('riskTaken'),
                convictionScore: formData.get('convictionScore'),
                tags: formData.getAll('tags')
            },
            psychologyNotes: {
                preTradePlan: formData.get('preTradePlan'),
                postTradeReview: formData.get('postTradeReview'),
                emotionalState: formData.getAll('emotionalState')
            },
            attachments: {
                chartScreenshot: formData.get('chartScreenshot'),
                contractNote: formData.get('contractNote')
            }
        };

        return tradeData;
    }

    /**
     * Validate required fields
     */
    function validateForm() {
        const requiredFields = [
            'tradeDate',
            'segment',
            'instrumentType',
            'symbol',
            'side',
            'quantity',
            'entryPrice',
            'stopLoss',
            'target',
            'productType'
        ];

        for (const fieldName of requiredFields) {
            const field = document.getElementById(fieldName);
            if (!field.value.trim()) {
                field.focus();
                showMessage(`Please fill in: ${field.previousElementSibling.textContent}`, 'error');
                return false;
            }
        }

        return true;
    }

    /**
     * Handle Save Draft
     */
    function handleSaveDraft(e) {
        e.preventDefault();
        
        const tradeData = collectFormData();
        console.log('Saving draft:', tradeData);
        
        // Save to localStorage as draft
        saveDraftToStorage(tradeData);
        
        showMessage('Trade saved as draft successfully!', 'success');
    }

    /**
     * Handle Save and Close
     */
    function handleSaveAndClose(e) {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        const tradeData = collectFormData();
        console.log('Saving and closing:', tradeData);
        
        // TODO: Send to backend API
        saveTradeToBackend(tradeData);
        
        showMessage('Trade saved successfully!', 'success');
        
        // Close window or redirect after a delay
        setTimeout(() => {
            window.location.href = 'journal.html';
        }, 1500);
    }

    /**
     * Save draft to localStorage
     */
    function saveDraftToStorage(data) {
        try {
            const drafts = JSON.parse(localStorage.getItem('tradeDrafts') || '[]');
            data.draftId = Date.now();
            data.savedAt = new Date().toISOString();
            drafts.push(data);
            localStorage.setItem('tradeDrafts', JSON.stringify(drafts));
        } catch (error) {
            console.error('Error saving draft:', error);
        }
    }

    /**
     * Save trade to backend (placeholder)
     */
    async function saveTradeToBackend(data) {
        try {
            // TODO: Implement actual API call
            console.log('Would send to API:', data);
            
            // Example API call (commented out):
            /*
            const response = await fetch('/api/trades', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(data)
            });
            
            if (!response.ok) {
                throw new Error('Failed to save trade');
            }
            
            const result = await response.json();
            return result;
            */
        } catch (error) {
            console.error('Error saving trade:', error);
            showMessage('Error saving trade. Please try again.', 'error');
        }
    }

    /**
     * Show message to user
     */
    function showMessage(text, type = 'success') {
        // Remove any existing messages
        const existingMessage = document.querySelector('.message');
        if (existingMessage) {
            existingMessage.remove();
        }

        // Create new message
        const message = document.createElement('div');
        message.className = `message message-${type}`;
        message.textContent = text;
        
        // Insert at top of container
        const container = document.querySelector('.container');
        container.insertBefore(message, container.firstChild);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            message.remove();
        }, 5000);
    }

    /**
     * Load draft if exists (for future implementation)
     */
    function loadDraft(draftId) {
        try {
            const drafts = JSON.parse(localStorage.getItem('tradeDrafts') || '[]');
            const draft = drafts.find(d => d.draftId === draftId);
            
            if (draft) {
                // Populate form with draft data
                console.log('Loading draft:', draft);
                // TODO: Implement form population
            }
        } catch (error) {
            console.error('Error loading draft:', error);
        }
    }
});
