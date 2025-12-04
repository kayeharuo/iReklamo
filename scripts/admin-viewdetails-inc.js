document.addEventListener('DOMContentLoaded', async () => {
    setupDropdowns();
    await loadIncidentDetails();
    setupBackButton();
});

const card = document.querySelector('.card5');
const tooltip = document.getElementById('tooltip');
let HF_TOKEN_CACHE = null;

card.addEventListener('mousemove', (e) => {
  tooltip.style.opacity = '1';
  const offsetX = 15; 
  const offsetY = 20; 

  let x = e.clientX + offsetX;
  let y = e.clientY + offsetY;

  const maxX = window.innerWidth - tooltip.offsetWidth - 10;
  if (x > maxX) x = maxX;

  const maxY = window.innerHeight - tooltip.offsetHeight - 10;
  if (y > maxY) y = maxY;

  tooltip.style.left = `${x}px`;
  tooltip.style.top = `${y}px`;
});

card.addEventListener('mouseleave', () => {
  tooltip.style.opacity = '0';
});

function setupDropdowns() {
    const dropdowns = document.querySelectorAll('.menu-dropdown');
    
    dropdowns.forEach(dropdown => {
        dropdown.addEventListener('click', (e) => {
            if (e.target.closest('.submenu a')) return;
            
            e.preventDefault();
            e.stopPropagation();
            
            dropdowns.forEach(other => {
                if (other !== dropdown) {
                    other.classList.remove('active');
                }
            });
            
            dropdown.classList.toggle('active');
        });
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.menu-dropdown')) {
            dropdowns.forEach(dropdown => {
                dropdown.classList.remove('active');
            });
        }
    });
}

let currentIncidentId = null;
let isWithdrawn = false;

async function loadIncidentDetails() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        currentIncidentId = urlParams.get('id');

        if (!currentIncidentId) {
            alert('No incident ID provided');
            window.location.href = '/admin/admin-manageincidents.html';
            return;
        }

        console.log('Loading incident details for ID:', currentIncidentId);

        const { data: incident, error } = await supabaseClient
            .from('vito_complaint_incident')
            .select(`
                *,
                vito_ci_complainant (*),
                vito_ci_respondent (*),
                vito_ci_stat (*),
                vito_ci_files (*)
            `)
            .eq('vci_id', currentIncidentId)
            .single();

        if (error) throw error;

        console.log('Incident data loaded:', incident);

        const { data: userInfo, error: userError } = await supabaseClient
            .from('vito_user_info')
            .select('*')
            .eq('vu_id', incident.vu_id)
            .single();

        if (userError) console.error('Error loading user info:', userError);

        populateIncidentDetails(incident, userInfo);
        await loadAttachments(incident.vito_ci_files || []);

    } catch (error) {
        console.error('Error loading incident details:', error);
        alert('Error loading incident details: ' + error.message);
    }
}

function populateIncidentDetails(incident, userInfo) {
    const complainant = incident.vito_ci_complainant?.[0];
    const respondent = incident.vito_ci_respondent?.[0];
    const stat = incident.vito_ci_stat?.[0];

    if (complainant && userInfo) {
        const fullName = `${complainant.vcicomplainant_fname} ${complainant.vcicomplainant_mname || ''} ${complainant.vcicomplainant_lname}`.trim();
        document.getElementById('complainant').textContent = fullName;
        
        const age = calculateAge(userInfo.vui_dob);
        document.getElementById('age').textContent = age || 'N/A';
        document.getElementById('dob').textContent = formatDate(userInfo.vui_dob) || 'N/A';
        document.getElementById('gender').textContent = userInfo.vui_gender || 'N/A';
        
        const statusElements = document.querySelectorAll('#status');
        if (statusElements[0]) statusElements[0].textContent = 'N/A';
        
        document.getElementById('contact').textContent = complainant.vcicomplainant_contact || 'N/A';
        document.getElementById('email').textContent = complainant.vcicomplainant_email || 'N/A';
        document.getElementById('address').textContent = complainant.vcicomplainant_address || userInfo.vui_address || 'N/A';
    }

    if (respondent) {
        document.getElementById('respondent').textContent = respondent.vcirespondent_name || 'N/A';
        document.getElementById('relationship').textContent = respondent.vcirespondent_relationship || 'N/A';
        document.getElementById('respaddress').textContent = respondent.vcirespondent_address || 'N/A';
        document.getElementById('respondentdesc').textContent = respondent.vcirespondent_description || 'N/A';
    }

    document.getElementById('trackingnum').textContent = incident.vci_tracking || 'N/A';
    document.getElementById('type').textContent = incident.vci_type || 'N/A';
    document.getElementById('category').textContent = incident.vci_category || 'N/A';
    document.getElementById('dtincident').textContent = formatDateTime(incident.vci_date_time) || 'N/A';
    document.getElementById('location').textContent = incident.vci_location || 'N/A';
    document.getElementById('witness').textContent = incident.vci_witness || 'N/A';
    document.getElementById('detaileddesc').textContent = incident.vci_description || 'N/A';

    if (stat) {
        const statusElements = document.querySelectorAll('#status');
        if (statusElements[1]) statusElements[1].textContent = stat.vcistat_current_stat || 'Pending';
        
        document.getElementById('datefiled').textContent = formatDate(stat.vcistat_date_filed) || formatDate(incident.created_at);
        
        const assignedOfficerElements = document.querySelectorAll('#datefiled');
        if (assignedOfficerElements[1]) assignedOfficerElements[1].textContent = stat.vcistat_assigned_officer || 'Not assigned';
        
        document.getElementById('resolutionnotes').textContent = stat.vcistat_resolution || 'No resolution notes yet';
        document.getElementById('lastupdated').textContent = formatDate(stat.vcistat_last_updated) || formatDate(incident.created_at);

        const resolutionText = (stat.vcistat_resolution || '').toLowerCase();
        isWithdrawn = resolutionText.includes('withdrawn');

        const updateBtn = document.getElementById('updatebtn');
        if (isWithdrawn) {
            updateBtn.disabled = true;
            updateBtn.classList.add('disabled');
            updateBtn.title = 'Cannot update withdrawn cases';
        } else {
            updateBtn.disabled = false;
            updateBtn.classList.remove('disabled');
            updateBtn.title = '';
        }

        populateModal({
            status: stat.vcistat_current_stat || '',
            dateFiled: formatDateForInput(stat.vcistat_date_filed || incident.created_at),
            officer: stat.vcistat_assigned_officer || '',
            notes: stat.vcistat_resolution || ''
        });
    }
}

async function loadAttachments(files) {
    const attachmentsDiv = document.querySelector('.card5 .header');
    
    if (!files || files.length === 0) {
        attachmentsDiv.innerHTML = `
            <h4>ATTACHMENTS</h4>
            <p style="color: #6b7280; margin-top: 20px;">No attachments available</p>
        `;
        return;
    }

    let attachmentsHTML = '<h4>ATTACHMENTS</h4><div style="margin-top: 20px;">';

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isImage = file.vfile_content_type?.startsWith('image/');
        
        if (isImage) {
            attachmentsHTML += `
                <div id="file-${i}" style="margin-bottom: 15px; padding: 15px; background: #f9fafb; border-radius: 8px; border-left: 4px solid #6b7280;">
                    <a href="${file.vfile_public_url}" target="_blank" style="color: #1e15b6; text-decoration: underline; font-weight: 600;">
                        ${file.vfile_filename}
                    </a>
                    <br>
                    <span class="ai-status" style="font-size: 13px; color: #6b7280; font-weight: 600; margin-top: 5px; display: inline-block;">
                        🔍 Verifying authenticity...
                    </span>
                    <div class="ai-details" style="font-size: 11px; color: #6b7280; margin-top: 3px; font-style: italic;"></div>
                    <div style="margin-top: 10px;">
                        <img src="${file.vfile_public_url}" 
                             style="max-width: 200px; max-height: 200px; border-radius: 6px; cursor: pointer;"
                             onclick="window.open('${file.vfile_public_url}', '_blank')">
                    </div>
                </div>
            `;
        } else {
            attachmentsHTML += `
                <div style="margin-bottom: 10px;">
                    <a href="${file.vfile_public_url}" target="_blank" style="color: #1e15b6; text-decoration: underline; font-weight: 600;">
                        ${file.vfile_filename}
                    </a>
                </div>
            `;
        }
    }

    attachmentsHTML += '</div>';
    attachmentsDiv.innerHTML = attachmentsHTML;

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isImage = file.vfile_content_type?.startsWith('image/');
        
        if (isImage) {
            const aiResult = await analyzeImageForAI(file.vfile_public_url);
            
            const fileDiv = document.getElementById(`file-${i}`);
            if (fileDiv) {
                fileDiv.style.borderLeftColor = aiResult.color;
                const statusSpan = fileDiv.querySelector('.ai-status');
                const detailsSpan = fileDiv.querySelector('.ai-details');
                
                if (statusSpan) {
                    statusSpan.textContent = `📊 Verification: ${aiResult.label}`;
                    statusSpan.style.color = aiResult.color;
                }
                
                if (detailsSpan && aiResult.details) {
                    detailsSpan.textContent = `ℹ️ ${aiResult.details}`;
                }
            }
        }
    }
}

//DUAL VERIFICATION SYSTEM: HUGGING FACE AI + METADATA ANALYSIS

async function analyzeImageForAI(imageUrl) {
    try {
        console.log('Starting dual verification system...');
        
        const [metadataResult, aiResult] = await Promise.all([
            analyzeImageMetadata(imageUrl),
            analyzeWithHuggingFace(imageUrl)
        ]);
        
        console.log('Metadata result:', metadataResult);
        console.log('AI result:', aiResult);
        
        if (metadataResult && aiResult) {
            return combineResults(metadataResult, aiResult);
        } else if (aiResult) {
            return aiResult;
        } else if (metadataResult) {
            return metadataResult;
        }
        
        return {
            label: 'Verification unavailable',
            color: '#6b7280',
            confidence: 'none',
            details: 'Unable to verify image'
        };
        
    } catch (error) {
        console.error('Verification error:', error);
        return {
            label: 'Verification error',
            color: '#6b7280',
            confidence: 'none',
            details: error.message
        };
    }
}

async function getHuggingFaceToken() {
    // Return cached token if available
    if (HF_TOKEN_CACHE) {
        return HF_TOKEN_CACHE;
    }
    
    try {
        const { data, error } = await supabaseClient
            .rpc('get_decrypted_api_key', { service: 'hugging_face' });
        
        if (error) {
            console.error('Error fetching Hugging Face token:', error);
            return null;
        }
        
        HF_TOKEN_CACHE = data;
        return data;
    } catch (error) {
        console.error('Exception fetching token:', error);
        return null;
    }
}

async function analyzeWithHuggingFace(imageUrl) {
    try {
        console.log('Analyzing image with Hugging Face AI detector...');
        
        const HF_TOKEN = await getHuggingFaceToken();
        if (!HF_TOKEN) {
            throw new Error('Unable to retrieve Hugging Face API token');
        }
        
        const MODEL = 'Organika/sdxl-detector';
        
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
            throw new Error('Failed to fetch image');
        }
        const imageBlob = await imageResponse.blob();
        console.log('Image fetched, size:', imageBlob.size, 'bytes');
        
        const HF_API_URL = `https://router.huggingface.co/hf-inference/models/${MODEL}`;
        
        try {
            const aiResponse = await fetch(HF_API_URL, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${HF_TOKEN}`,
                    'Content-Type': 'application/octet-stream'
                },
                body: imageBlob
            });

            if (aiResponse.ok) {
                const result = await aiResponse.json();
                console.log('AI Detection Result:', result);
                return parseAIResult(result);
            } else {
                console.log('Direct API failed, status:', aiResponse.status);
            }
        } catch (directError) {
            console.log('Direct API failed, trying with CORS proxy...');
        }
        
        const base64Image = await blobToBase64(imageBlob);
        const CORS_PROXY = 'https://api.allorigins.win/raw?url=';
        const proxiedUrl = CORS_PROXY + encodeURIComponent(HF_API_URL);
        
        const aiResponse = await fetch(proxiedUrl, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${HF_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                inputs: base64Image
            })
        });

        if (!aiResponse.ok) {
            const errorText = await aiResponse.text();
            console.error('Hugging Face API error:', errorText);
            
            try {
                const errorJson = JSON.parse(errorText);
                if (errorJson.error && errorJson.error.includes('loading')) {
                    const estimatedTime = errorJson.estimated_time || 20;
                    return {
                        label: `AI Model Loading... Refresh in ${Math.ceil(estimatedTime)}s`,
                        color: '#f59e0b',
                        confidence: 'loading',
                        details: 'Model is initializing, please wait'
                    };
                }
            } catch (e) {
                console.log('Could not parse error as JSON');
            }
            
            throw new Error('API request failed');
        }

        const result = await aiResponse.json();
        console.log('AI Detection Result:', result);
        return parseAIResult(result);

    } catch (error) {
        console.error('Hugging Face AI error:', error);
        return null;
    }
}

function parseAIResult(result) {
    let aiScore = 0;
    
    if (Array.isArray(result)) {
        const artificialResult = result.find(r => 
            r.label && (r.label.toLowerCase().includes('artificial') || 
                       r.label.toLowerCase().includes('fake') ||
                       r.label.toLowerCase().includes('ai') ||
                       r.label.toLowerCase().includes('generated'))
        );
        
        if (artificialResult) {
            aiScore = artificialResult.score;
        } else {
            const realResult = result.find(r => 
                r.label && (r.label.toLowerCase().includes('real') || 
                           r.label.toLowerCase().includes('human'))
            );
            aiScore = realResult ? (1 - realResult.score) : 0;
        }
    }

    const aiPercentage = Math.round(aiScore * 100);
    const realPercentage = 100 - aiPercentage;

    if (aiScore < 0.3) {
        return {
            label: `Real Photo (${realPercentage}% confidence)`,
            color: '#10b981',
            confidence: 'high',
            details: `AI probability: ${aiPercentage}%`
        };
    } else if (aiScore < 0.7) {
        return {
            label: `Uncertain (${aiPercentage}% AI probability)`,
            color: '#f59e0b',
            confidence: 'medium',
            details: `Mixed signals detected`
        };
    } else {
        return {
            label: `AI-Generated (${aiPercentage}% confidence)`,
            color: '#b86767ff',
            confidence: 'high',
            details: `Strong AI signature`
        };
    }
}

function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

async function analyzeImageMetadata(imageUrl) {
    try {
        console.log('Analyzing EXIF metadata...');
        
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const img = await loadImage(blob);
        const exifData = await extractExifData(img);
        
        console.log('EXIF data extracted:', exifData);
        
        return analyzeExifData(exifData);
        
    } catch (error) {
        console.error('Metadata analysis error:', error);
        return {
            label: 'No metadata',
            color: '#f59e0b',
            confidence: 'low',
            details: 'No EXIF data found'
        };
    }
}

function loadImage(blob) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = URL.createObjectURL(blob);
    });
}

function extractExifData(img) {
    return new Promise((resolve) => {
        EXIF.getData(img, function() {
            const allTags = EXIF.getAllTags(this);
            resolve(allTags);
        });
    });
}

function analyzeExifData(exifData) {
    const hasCameraMake = exifData.Make || exifData.make;
    const hasCameraModel = exifData.Model || exifData.model;
    const hasDateTime = exifData.DateTime || exifData.DateTimeOriginal;
    const hasGPS = exifData.GPSLatitude || exifData.GPSLongitude;
    const hasExposure = exifData.ExposureTime;
    const hasISO = exifData.ISOSpeedRatings;
    const hasFocalLength = exifData.FocalLength;
    const hasOrientation = exifData.Orientation;
    
    let details = [];
    if (hasCameraMake) details.push('Camera: ' + hasCameraMake);
    if (hasCameraModel) details.push(hasCameraModel);
    if (hasDateTime) details.push('Date: ' + hasDateTime);
    if (hasGPS) details.push('GPS verified');
    
    const detailsText = details.join(' | ') || 'No camera metadata';
    
    let score = 0;
    if (hasCameraMake && hasCameraModel) score += 40;
    else if (hasCameraMake || hasCameraModel) score += 20;
    if (hasExposure) score += 10;
    if (hasISO) score += 10;
    if (hasFocalLength) score += 10;
    if (hasGPS) score += 15;
    if (hasDateTime) score += 10;
    if (hasOrientation) score += 5;
    
    console.log('Metadata authenticity score:', score + '/100');
    
    if (score >= 70) {
        return {
            label: `Authentic (${score}% metadata)`,
            color: '#10b981',
            confidence: 'high',
            details: detailsText
        };
    } else if (score >= 30) {
        return {
            label: `Uncertain (${score}% metadata)`,
            color: '#f59e0b',
            confidence: 'medium',
            details: detailsText
        };
    } else {
        return {
            label: `Suspicious (${score}% metadata)`,
            color: '#ef4444',
            confidence: 'low',
            details: detailsText
        };
    }
}

function combineResults(metadata, ai) {
    console.log("🔬 HYBRID ANALYSIS - Combining metadata + AI results");
    console.log("📊 Metadata:", metadata.label, "(" + metadata.color + ")");
    console.log("🤖 AI Result:", ai.label, "(" + ai.color + ")");

    // Extract numerical scores (0-100)
    const metadataScore = extractPercentage(metadata.label);
    
    // Extract AI confidence score
    let aiScore = extractPercentage(ai.label);
    if (aiScore === 0 && ai.details) {
        const detailScore = extractPercentage(ai.details);
        if (ai.details.includes('AI probability')) {
            aiScore = 100 - detailScore; // Invert if it's AI probability
        } else {
            aiScore = detailScore;
        }
    }
    
    console.log("📈 Raw Metadata Score:", metadataScore + "%");
    console.log("📈 Raw AI Score:", aiScore + "%");

    // Normalize to 0-1 scale
    let metadataConfidence = metadataScore / 100;
    let aiConfidence = aiScore / 100;

    
    // SMART PENALTY SYSTEM - The key improvement!
    
    // RULE 1: If AI strongly says "AI-generated" (70%+), trust it completely
    if (aiScore >= 70 && ai.color === "#ef4444") {
        console.log("🚫 AI detector strongly confident this is AI-generated");
        console.log("   → Trusting AI result completely, ignoring metadata");
        
        return {
            label: `🚫 Likely AI-Generated (${aiScore}% confidence)`,
            color: "#ef4444",
            confidence: "high",
            details: `Metadata: ${metadata.label} | AI: ${ai.label}`
        };
    }
    // RULE 2: If AI strongly says "Real" (70%+) AND metadata is zero
    // This is the tricky case - could be Google download OR AI-generated that fooled the AI
    else if (aiScore >= 70 && metadataScore === 0) {
        console.log("⚠️ AMBIGUOUS CASE: AI says real, but no metadata");
        console.log("   → Could be: Downloaded from web, social media, OR sophisticated AI image");
        console.log("   → Applying MODERATE penalty (not severe)");
        aiConfidence *= 0.75; // Only 25% penalty, not 60%
    }
    
    // RULE 3: If AI is uncertain (30-69%) AND metadata is zero
    // This is a red flag - increase suspicion
    else if (aiScore >= 30 && aiScore < 70 && metadataScore === 0) {
        console.log("🚨 SUSPICIOUS: AI uncertain + no metadata");
        console.log("   → Applying HEAVY penalty");
        aiConfidence *= 0.5; // 50% penalty
    }
    
    // RULE 4: If metadata is low (1-30%), apply light penalty
    else if (metadataScore > 0 && metadataScore < 30) {
        console.log("⚠️ Low metadata present");
        console.log("   → Applying light penalty");
        aiConfidence *= 0.85; // 15% penalty
    }

    // Calculate weighted final score
    // When metadata is 0, give MORE weight to AI (80/20 instead of 60/40)
    // When metadata exists, use balanced weights (60/40)
    let aiWeight, metadataWeight;
    
    if (metadataScore === 0) {
        aiWeight = 0.80;      // Trust AI more when no metadata available
        metadataWeight = 0.20;
        console.log("📊 Using AI-heavy weighting (80/20) due to missing metadata");
    } else {
        aiWeight = 0.60;
        metadataWeight = 0.40;
        console.log("📊 Using balanced weighting (60/40)");
    }
    
    const finalScore = (aiConfidence * aiWeight) + (metadataConfidence * metadataWeight);
    const finalPercentage = Math.round(finalScore * 100);
    
    console.log("📊 Adjusted AI Confidence:", Math.round(aiConfidence * 100) + "%");
    console.log("📊 Final Combined Score:", finalPercentage + "%");

    
    // CLASSIFICATION - More nuanced thresholds
    
    
    if (finalScore >= 0.65) {
        // LIKELY REAL
        // Add context if metadata is missing
        let explanation = `Metadata: ${metadata.label} | AI: ${ai.label}`;
        if (metadataScore === 0 && aiScore >= 70) {
            explanation += " | Note: No camera data (possibly downloaded/shared)";
        }
        
        return {
            label: `✅ Likely Real (${finalPercentage}% confidence)`,
            color: "#10b981", // Green
            confidence: "high",
            details: explanation
        };
    } 
    else if (finalScore <= 0.40) {
        // LIKELY AI-GENERATED
        return {
            label: `🚫 Likely AI-Generated (${100 - finalPercentage}% confidence)`,
            color: "#ef4444", // Red
            confidence: "high",
            details: `Metadata: ${metadata.label} | AI: ${ai.label}`
        };
    } 
    else {
        // UNCERTAIN (41-64%)
        // Provide guidance on what to look for
        let advice = "Manual review recommended";
        if (metadataScore === 0) {
            advice = "Check if image source is legitimate (Google, social media, etc.)";
        }
        
        return {
            label: `⚠️ Uncertain (${finalPercentage}% confidence)`,
            color: "#f59e0b", // Orange
            confidence: "medium",
            details: `Metadata: ${metadata.label} | AI: ${ai.label} | ${advice}`
        };
    }
}

function extractPercentage(text) {
    if (!text) return 0;
    const match = text.match(/(\d+)%/);
    return match ? parseInt(match[1]) : 0;
}

function setupBackButton() {
    document.getElementById('backbtn').addEventListener('click', () => {
        window.location.href = '/admin/admin-manageincidents.html';
    });
}

document.getElementById('updatebtn').addEventListener('click', function() {
    if (!isWithdrawn) {
        openModal();
    }
});

function openModal() {
    document.getElementById('modalOverlay').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('active');
    document.body.style.overflow = 'auto';
}

function closeModalOnOverlay(event) {
    if (event.target.id === 'modalOverlay') {
        closeModal();
    }
}

document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeModal();
    }
});

function populateModal(data) {
    document.getElementById('currentStatus').value = data.status || '';
    document.getElementById('dateFiled').value = data.dateFiled || '';
    document.getElementById('assignedOfficer').value = data.officer || '';
    document.getElementById('resolutionNotes').value = data.notes || '';
    
    const lastUpdatedInput = document.getElementById('lastUpdated');
    if (lastUpdatedInput) {
        lastUpdatedInput.closest('.info-item').style.display = 'none';
    }
}

async function saveChanges() {
    try {
        const currentStatus = document.getElementById('currentStatus').value;
        const dateFiled = document.getElementById('dateFiled').value;
        const assignedOfficer = document.getElementById('assignedOfficer').value;
        const resolutionNotes = document.getElementById('resolutionNotes').value;

        if (!currentStatus || !dateFiled || !assignedOfficer) {
            alert('Please fill in all required fields');
            return;
        }

        console.log('Updating status for incident:', currentIncidentId);

        const { data, error } = await supabaseClient
            .from('vito_ci_stat')
            .update({
                vcistat_current_stat: currentStatus,
                vcistat_date_filed: dateFiled,
                vcistat_assigned_officer: assignedOfficer,
                vcistat_resolution: resolutionNotes
            })
            .eq('vci_id', currentIncidentId)
            .select();

        if (error) throw error;

        console.log('Status updated successfully:', data);

        alert('Status updated successfully!');
        closeModal();
        
        await loadIncidentDetails();

    } catch (error) {
        console.error('Error updating status:', error);
        alert('Error updating status: ' + error.message);
    }
}

function calculateAge(dob) {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
    });
}

function formatDateTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatDateForInput(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
}


console.log('Incident view details script loaded');