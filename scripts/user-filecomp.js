let loggedInUser = null;
let formData = {
    personal: {},
    complaint: {},
    respondent: {},
    files: []
};

let BREVO_API_KEY_CACHE = null;

document.addEventListener("DOMContentLoaded", () => {
    const burgerMenu = document.querySelector('.burger-menu');
    const rightside = document.querySelector('.navbar .rightside');
    
    if (burgerMenu && rightside) {
        burgerMenu.addEventListener('click', function(e) {
            e.stopPropagation();
            burgerMenu.classList.toggle('active');
            rightside.classList.toggle('active');
        });
        
        document.addEventListener('click', function(event) {
            if (!event.target.closest('.navbar .rightside') && 
                !event.target.closest('.burger-menu')) {
                if (burgerMenu.classList.contains('active')) {
                    burgerMenu.classList.remove('active');
                    rightside.classList.remove('active');
                }
            }
        });
        
        const navLinks = rightside.querySelectorAll('ul li a');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                burgerMenu.classList.remove('active');
                rightside.classList.remove('active');
            });
        });
    }
});


window.addEventListener('DOMContentLoaded', async () => {
    window.scrollTo(0, 0);
    
    try {
        const userDataString = sessionStorage.getItem('loggedInUser');
        
        if (!userDataString) {
            console.error('No session found');
            window.location.href = '/user/user-landing.html';
            return;
        }

        loggedInUser = JSON.parse(userDataString);
        console.log('Logged in user:', loggedInUser);

        prefillPersonalDetails();

    } catch (error) {
        console.error('Error loading user:', error);
        window.location.href = '/user/user-landing.html';
    }
});

//category filtering based on type
document.addEventListener('DOMContentLoaded', () => {
    const typeSelect = document.getElementById('type');
    const categorySelect = document.getElementById('category');

    const categories = {
        complaint: [
            { value: '1', label: 'Noise Disturbance' },
            { value: '6', label: 'Domestic or Neighbor Dispute' },
            { value: '7', label: 'Barangay Staff Misconduct' },
            { value: '8', label: 'Service Delay or Negligence' },
            { value: '3', label: 'Garbage or Sanitation Issue' },
            { value: '4', label: 'Public Misconduct' },
            { value: '5', label: 'Peace and Order Concern' },
            { value: '11', label: 'Others' }
        ],
        incident: [
            { value: '2', label: 'Drainage or Flooding' },
            { value: '10', label: 'Broken Roads or Streetlights' },
            { value: '12', label: 'Fire Incident' },
            { value: '13', label: 'Vehicular Incident' },
            { value: '14', label: 'Natural Disaster or Calamity' },
            { value: '11', label: 'Others' }
        ]
    };

    typeSelect.addEventListener('change', function() {
        const selectedType = this.value;
        
        categorySelect.innerHTML = '<option value="">Select category</option>';
        
        categorySelect.value = '';
        
        if (selectedType === '1') {
            categories.complaint.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.value;
                option.textContent = cat.label;
                categorySelect.appendChild(option);
            });
            categorySelect.disabled = false;
        } else if (selectedType === '2') {
            categories.incident.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.value;
                option.textContent = cat.label;
                categorySelect.appendChild(option);
            });
            categorySelect.disabled = false;
        } else {
            categorySelect.innerHTML = '<option value="">Select type first</option>';
            categorySelect.disabled = true;
        }
    });

    if (!typeSelect.value) {
        categorySelect.disabled = true;
    }
});


//PREFILL PERSONAL DETAILS


function prefillPersonalDetails() {
    if (!loggedInUser) return;

    const userInfo = loggedInUser.vito_user_info?.[0];

    document.getElementById('email').value = loggedInUser.vu_email_add || '';
    document.getElementById('contact').value = loggedInUser.vu_phone_no || '';

    if (userInfo) {
        document.getElementById('fname').value = userInfo.vui_fname || '';
        document.getElementById('lname').value = userInfo.vui_lname || '';
        document.getElementById('mname').value = userInfo.vui_mname || '';
        document.getElementById('suffix').value = userInfo.vui_suffix || '';
        document.getElementById('dob').value = userInfo.vui_dob || '';
        document.getElementById('gender').value = userInfo.vui_gender?.toLowerCase() || '';
        document.getElementById('address').value = userInfo.vui_address || '';
        
        if (userInfo.vui_dob) {
            const age = calculateAge(userInfo.vui_dob);
            setAgeDropdown(age);
        }
    }

    console.log('Personal details pre-filled');
}

function calculateAge(dob) {
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    
    return age;
}

function setAgeDropdown(age) {
    const ageSelect = document.getElementById('age');
    
    if (age < 18) {
        ageSelect.value = '1';
    } else if (age >= 18 && age <= 25) {
        ageSelect.value = '2';
    } else if (age >= 26 && age <= 35) {
        ageSelect.value = '3';
    } else {
        ageSelect.value = '4';
    }
}


//FILE UPLOAD VALIDATION & PREVIEW
document.addEventListener('DOMContentLoaded', () => {
    const attachmentsInput = document.getElementById('attachments');
    
    if (attachmentsInput) {
        attachmentsInput.addEventListener('change', function(e) {
            const files = Array.from(e.target.files);
            const maxFiles = 3;
            const maxSize = 5 * 1024 * 1024; //5MB
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
            
            //check file count
            if (files.length > maxFiles) {
                alert(`Maximum ${maxFiles} images allowed. Please select only ${maxFiles} images.`);
                e.target.value = '';
                document.getElementById('filePreview').innerHTML = '';
                return;
            }
            
            //check file types (program only accepts image files due to limited storage:( (supabase free ver) )
            const invalidFiles = files.filter(file => !allowedTypes.includes(file.type));
            if (invalidFiles.length > 0) {
                alert(`Only image files (JPG, JPEG, PNG) are allowed.\n\nInvalid files:\n${invalidFiles.map(f => f.name).join('\n')}`);
                e.target.value = '';
                document.getElementById('filePreview').innerHTML = '';
                return;
            }
            
            //check file sizes
            const oversizedFiles = files.filter(file => file.size > maxSize);
            if (oversizedFiles.length > 0) {
                alert(`Some images exceed 5MB limit:\n${oversizedFiles.map(f => f.name).join('\n')}`);
                e.target.value = '';
                document.getElementById('filePreview').innerHTML = '';
                return;
            }
            
            //Show file previews
            showFilePreview(files);
        });
    }
});

function showFilePreview(files) {
    const previewContainer = document.getElementById('filePreview');
    previewContainer.innerHTML = '';
    
    files.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.style.cssText = 'position: relative; width: 100px; height: 100px; border: 2px solid #e5e7eb; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);';
        
        const reader = new FileReader();
        reader.onload = function(e) {
            fileItem.innerHTML = `
                <img src="${e.target.result}" style="width: 100%; height: 100%; object-fit: cover;">
                <div style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.7); color: white; font-size: 10px; padding: 2px 5px; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${file.name}
                </div>
            `;
        };
        reader.readAsDataURL(file);
        
        previewContainer.appendChild(fileItem);
    });
}


//SAVE FORM DATA TEMPORARILY
function savePersonalDetails() {
    formData.personal = {
        fname: document.getElementById('fname').value.trim(),
        lname: document.getElementById('lname').value.trim(),
        mname: document.getElementById('mname').value.trim(),
        suffix: document.getElementById('suffix').value.trim(),
        age: document.getElementById('age').options[document.getElementById('age').selectedIndex].text,
        dob: document.getElementById('dob').value,
        status: document.getElementById('status').value,
        gender: document.getElementById('gender').value,
        contact: document.getElementById('contact').value.trim(),
        email: document.getElementById('email').value.trim(),
        address: document.getElementById('address').value.trim()
    };
    
    console.log('Personal details saved:', formData.personal);
}

function saveComplaintDetails() {
    formData.complaint = {
        type: document.getElementById('type').value,
        category: document.getElementById('category').value,
        dtincident: document.getElementById('dtincident').value,
        location: document.getElementById('location').value.trim(),
        description: document.getElementById('description').value.trim(),
        witness: document.getElementById('witness').value.trim()
    };
    
    const fileInput = document.getElementById('attachments');
    formData.files = Array.from(fileInput.files);
    
    console.log('Complaint details saved:', formData.complaint);
    console.log('Files:', formData.files.length);
}

function saveRespondentDetails() {
    const respondentName = document.getElementById('respondent').value.trim();
    
    if (respondentName) {
        formData.respondent = {
            name: respondentName,
            relationship: document.getElementById('relationship').value.trim(),
            address: document.getElementById('respaddress').value.trim(),
            description: document.getElementById('respondentdesc').value.trim()
        };
        console.log('Respondent details saved:', formData.respondent);
    } else {
        formData.respondent = null;
        console.log('No respondent data (optional)');
    }
}


//POPULATE SUMMARY WITH IMAGE PREVIEWS
function populateSummary() {
    //personal Details
    document.querySelector('.minicard1 #complainant').textContent = 
        `${formData.personal.fname} ${formData.personal.mname} ${formData.personal.lname} ${formData.personal.suffix}`.trim();
    
    const allAges = document.querySelectorAll('[id="age"]');
    const allDobs = document.querySelectorAll('[id="dob"]');
    const allGenders = document.querySelectorAll('[id="gender"]');
    const allStatuses = document.querySelectorAll('[id="status"]');
    const allContacts = document.querySelectorAll('[id="contact"]');
    const allEmails = document.querySelectorAll('[id="email"]');
    const allAddresses = document.querySelectorAll('[id="address"]');
    
    if (allAges[1]) allAges[1].textContent = formData.personal.age;
    if (allDobs[1]) allDobs[1].textContent = formData.personal.dob;
    if (allGenders[1]) allGenders[1].textContent = capitalizeFirstLetter(formData.personal.gender); 
    if (allStatuses[1]) allStatuses[1].textContent = capitalizeFirstLetter(formData.personal.status); 
    if (allContacts[1]) allContacts[1].textContent = formData.personal.contact;
    if (allEmails[1]) allEmails[1].textContent = formData.personal.email;
    if (allAddresses[1]) allAddresses[1].textContent = formData.personal.address;

    //respondent details
    const allRespondents = document.querySelectorAll('[id="respondent"]');
    const allRelationships = document.querySelectorAll('[id="relationship"]');
    const allRespAddresses = document.querySelectorAll('[id="respaddress"]');
    const allRespDescs = document.querySelectorAll('[id="respondentdesc"]');
    
    if (formData.respondent) {
        if (allRespondents[1]) allRespondents[1].textContent = formData.respondent.name;
        if (allRelationships[1]) allRelationships[1].textContent = formData.respondent.relationship || 'N/A';
        if (allRespAddresses[1]) allRespAddresses[1].textContent = formData.respondent.address || 'N/A';
        if (allRespDescs[1]) allRespDescs[1].textContent = formData.respondent.description || 'N/A';
    } else {
        if (allRespondents[1]) allRespondents[1].textContent = 'N/A';
        if (allRelationships[1]) allRelationships[1].textContent = 'N/A';
        if (allRespAddresses[1]) allRespAddresses[1].textContent = 'N/A';
        if (allRespDescs[1]) allRespDescs[1].textContent = 'N/A';
    }

    //complaint details with image previews (clickable)
    let attachmentsHTML = '';
    if (formData.files.length > 0) {
        attachmentsHTML = '<div style="display: flex; flex-wrap: wrap; gap: 12px; margin-top: 15px;">';
        formData.files.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = function(e) {
                const imgElement = document.getElementById(`preview-img-${index}`);
                if (imgElement) {
                    imgElement.src = e.target.result;
                }
            };
            reader.readAsDataURL(file);
            
            attachmentsHTML += `
                <a href="#" class="image-preview-link" data-index="${index}" style="text-decoration: none; display: block; position: relative; width: 140px; height: 140px; border: 3px solid #3b82f6; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); transition: all 0.3s ease; cursor: pointer;">
                    <img id="preview-img-${index}" src="" style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s ease;">
                    <div style="position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(to top, rgba(0,0,0,0.8), transparent); color: white; font-size: 11px; padding: 8px 5px 5px 5px; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${file.name}
                    </div>
                    <div class="hover-overlay" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(59, 130, 246, 0); display: flex; align-items: center; justify-content: center; transition: background 0.3s ease; pointer-events: none;">
                        <span style="color: white; font-size: 24px; opacity: 0; transition: opacity 0.3s ease;">🔍</span>
                    </div>
                </a>
            `;
        });
        attachmentsHTML += '</div>';
        
        //add hover styles
        attachmentsHTML += `
            <style>
                .image-preview-link:hover {
                    transform: scale(1.05);
                    box-shadow: 0 8px 16px rgba(59, 130, 246, 0.3) !important;
                }
                .image-preview-link:hover img {
                    transform: scale(1.1);
                }
                .image-preview-link:hover .hover-overlay {
                    background: rgba(59, 130, 246, 0.3) !important;
                }
                .image-preview-link:hover .hover-overlay span {
                    opacity: 1 !important;
                }
            </style>
        `;
    } else {
        attachmentsHTML = '<p style="color: #6b7280; font-style: italic; margin-top: 10px;">No images attached</p>';
    }

    document.querySelector('.minicard3').innerHTML = `
        <h4>COMPLAINT/INCIDENT DETAILS</h4>
        <p>Type: <span style="font-weight: bold;">${getTypeText(formData.complaint.type)}</span></p>
        <p>Category: <span style="font-weight: bold;">${getCategoryText(formData.complaint.category)}</span></p>
        <p>Date & Time: <span style="font-weight: bold;">${formatDateTime(formData.complaint.dtincident)}</span></p>
        <p>Location: <span style="font-weight: bold;">${formData.complaint.location}</span></p>
        <p>Description: <span style="font-weight: bold;">${formData.complaint.description}</span></p>
        <p>Witnesses: <span style="font-weight: bold;">${formData.complaint.witness || 'None'}</span></p>
        <p style="margin-top: 20px; font-weight: bold;">Attachments:</p>
        ${attachmentsHTML}
    `;
    
    console.log('Summary populated');

    setupImageClickHandlers();
}

//IMAGE PREVIEW MODAL
function setupImageClickHandlers() {
    setTimeout(() => {
        const imageLinks = document.querySelectorAll('.image-preview-link');
        
        imageLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const index = this.getAttribute('data-index');
                const imgSrc = document.getElementById(`preview-img-${index}`).src;
                const fileName = formData.files[index].name;
                
                showImageModal(imgSrc, fileName);
            });
        });
    }, 100);
}

function showImageModal(imgSrc, fileName) {
    const modalHTML = `
        <div id="imageModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px;">
            <div style="position: relative; max-width: 90%; max-height: 90%; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.5);">
                
                <!-- Close button -->
                <button id="closeImageModal" style="position: absolute; top: 15px; right: 15px; background: rgba(0,0,0,0.7); color: white; border: none; width: 40px; height: 40px; border-radius: 50%; font-size: 24px; cursor: pointer; z-index: 10; display: flex; align-items: center; justify-content: center; transition: background 0.3s;">
                    ✕
                </button>
                
                <!-- Image -->
                <img src="${imgSrc}" style="max-width: 100%; max-height: 80vh; display: block; margin: 0 auto;">
                
                <!-- File name footer -->
                <div style="background: #f9fafb; padding: 15px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0; color: #374151; font-weight: 600; font-size: 14px;">${fileName}</p>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    //close on button click
    document.getElementById('closeImageModal').addEventListener('click', () => {
        document.getElementById('imageModal').remove();
    });
    
    //close on background click
    document.getElementById('imageModal').addEventListener('click', function(e) {
        if (e.target === this) {
            this.remove();
        }
    });
    
    //close on esc key
    document.addEventListener('keydown', function escHandler(e) {
        if (e.key === 'Escape') {
            const modal = document.getElementById('imageModal');
            if (modal) {
                modal.remove();
            }
            document.removeEventListener('keydown', escHandler);
        }
    });
    
    //hover effect for close button
    const closeBtn = document.getElementById('closeImageModal');
    closeBtn.addEventListener('mouseenter', () => {
        closeBtn.style.background = 'rgba(239, 68, 68, 0.9)';
    });
    closeBtn.addEventListener('mouseleave', () => {
        closeBtn.style.background = 'rgba(0,0,0,0.7)';
    });
}

//HELPER FUNCTIONS
function getTypeText(value) {
    return value === '1' ? 'Complaint' : 'Incident';
}

function getCategoryText(value) {
    const categories = {
        // Complaint categories
        '1': 'Noise Disturbance',
        '3': 'Garbage or Sanitation Issue',
        '4': 'Public Misconduct',
        '5': 'Peace and Order Concern',
        '6': 'Domestic or Neighbor Dispute',
        '7': 'Barangay Staff Misconduct',
        '8': 'Service Delay or Negligence',
        '2': 'Drainage or Flooding',
        '10': 'Broken Roads or Streetlights',
        '12': 'Fire Incident',
        '13': 'Vehicular Incident',
        '14': 'Natural Disaster or Calamity',
        '11': 'Others'
    };
    return categories[value] || 'Unknown';
}

function formatDateTime(datetime) {
    const date = new Date(datetime);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function capitalizeFirstLetter(string) {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
}


//SUBMIT COMPLAINT TO DATABASE
async function submitComplaint() {
    const submitBtn = document.getElementById('nextbtn');
    
    // Prevent double-clicking
    if (submitBtn.disabled) {
        console.log('Submit already in progress, ignoring duplicate click');
        return;
    }
    
    try {
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.6';
        submitBtn.style.cursor = 'not-allowed';
        submitBtn.textContent = 'SUBMITTING...';

        console.log('Starting complaint submission...');

        //1: generate tracking number
        const { data: trackingData, error: trackingError } = await supabaseClient
            .rpc('generate_tracking_number');

        if (trackingError) throw trackingError;

        const trackingNumber = trackingData;
        console.log('Tracking number generated:', trackingNumber);

        //2: insert into vito_complaint_incident table
        const { data: ciData, error: ciError } = await supabaseClient
            .from('vito_complaint_incident')
            .insert({
                vci_tracking: trackingNumber,
                vci_type: getTypeText(formData.complaint.type),
                vci_category: getCategoryText(formData.complaint.category),
                vci_date_time: formData.complaint.dtincident,
                vci_location: formData.complaint.location,
                vci_description: formData.complaint.description,
                vci_witness: formData.complaint.witness || null,
                vu_id: loggedInUser.vu_id
            })
            .select()
            .single();

        if (ciError) throw ciError;

        console.log('Complaint inserted:', ciData);

        //3: insert into vito_ci_complainant table
        const { error: complainantError } = await supabaseClient
            .from('vito_ci_complainant')
            .insert({
                vcicomplainant_fname: formData.personal.fname,
                vcicomplainant_lname: formData.personal.lname,
                vcicomplainant_mname: formData.personal.mname || null,
                vcicomplainant_suffix: formData.personal.suffix || null,
                vcicomplainant_age: formData.personal.age,
                vcicomplainant_dob: formData.personal.dob,
                vcicomplainant_status: formData.personal.status,
                vcicomplainant_gender: formData.personal.gender,
                vcicomplainant_contact: formData.personal.contact,
                vcicomplainant_email: formData.personal.email,
                vcicomplainant_address: formData.personal.address,
                vci_id: ciData.vci_id
            });

        if (complainantError) throw complainantError;

        console.log('Complainant data inserted');

        //4: insert respondent if provided
        if (formData.respondent) {
            const { error: respondentError } = await supabaseClient
                .from('vito_ci_respondent')
                .insert({
                    vcirespondent_name: formData.respondent.name,
                    vcirespondent_relationship: formData.respondent.relationship || null,
                    vcirespondent_address: formData.respondent.address || null,
                    vcirespondent_description: formData.respondent.description || null,
                    vci_id: ciData.vci_id
                });

            if (respondentError) throw respondentError;
            console.log('Respondent data inserted');
        }

        //5: upload files to Supabase Storage
        if (formData.files.length > 0) {
            await uploadFiles(trackingNumber, ciData.vci_id);
        }

        //6: create initial status
        // The trigger will automatically create the timeline entry!
        // The trigger will also automatically update the dashboard stats!
        const { error: statError } = await supabaseClient
            .from('vito_ci_stat')
            .insert({
                vcistat_current_stat: 'Pending',
                vcistat_date_filed: new Date().toISOString(),
                vcistat_assigned_officer: null,
                vcistat_resolution: null,
                vci_id: ciData.vci_id
            });

        if (statError) {
            console.error('Status error:', statError);
            throw statError;
        }

        console.log('Initial status created');
        console.log('Timeline entry created automatically by database trigger');
        console.log('Dashboard stats updated automatically by database trigger');

        //7: send email notification
        await sendEmailNotification(trackingNumber);

        //8: show success modal
        showSuccessModal(trackingNumber);

        console.log('Complaint submission complete!');

    } catch (error) {
        console.error('Error submitting complaint:', error);
        alert('Error submitting complaint: ' + error.message);
        
        // Re-enable button on error
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
        submitBtn.style.cursor = 'pointer';
        submitBtn.textContent = 'SUBMIT';
    }
}


//UPLOAD FILES TO STORAGE 
async function uploadFiles(trackingNumber, vci_id) {
    console.log(`Starting file upload for ${formData.files.length} images...`);
    
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (!session) {
        console.error('No active session found');
        throw new Error('User not authenticated');
    }
    
    for (let i = 0; i < formData.files.length; i++) {
        const file = formData.files[i];
        const fileExt = file.name.split('.').pop();
        const timestamp = Date.now();
        const fileName = `${trackingNumber}_${timestamp}_${i + 1}.${fileExt}`;
        const filePath = `complaints-incidents-images/${fileName}`;

        try {
            console.log(`Uploading image ${i + 1}/${formData.files.length}: ${file.name}`);
            console.log('File size:', file.size, 'bytes');
            console.log('File type:', file.type);

            // Upload with explicit options
            const { data: uploadData, error: uploadError } = await supabaseClient.storage
                .from('vito-ci-attachments')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false,
                    contentType: file.type
                });

            if (uploadError) {
                console.error('Upload error details:', uploadError);
                throw uploadError;
            }

            console.log('File uploaded successfully:', uploadData);

            // Get public URL
            const { data: { publicUrl } } = supabaseClient.storage
                .from('vito-ci-attachments')
                .getPublicUrl(filePath);

            console.log('Public URL generated:', publicUrl);

            // Save file metadata to database
            const { data: dbData, error: dbError } = await supabaseClient
                .from('vito_ci_files')
                .insert({
                    vfile_filename: file.name,
                    vfile_content_type: file.type,
                    vfile_size_bytes: file.size,
                    vfile_storage_path: filePath,
                    vfile_public_url: publicUrl,
                    vfile_is_public: true,
                    uploader_vu_id: loggedInUser.vu_id,
                    vci_id: vci_id
                })
                .select();

            if (dbError) {
                console.error('Database insert error:', dbError);
                
                // Try to delete the uploaded file if DB insert fails
                await supabaseClient.storage
                    .from('vito-ci-attachments')
                    .remove([filePath]);
                
                throw dbError;
            }

            console.log('File record saved to database:', dbData);

        } catch (error) {
            console.error(`Error uploading file ${file.name}:`, error);
            console.error('Error details:', JSON.stringify(error, null, 2));
            throw new Error(`Failed to upload file: ${file.name}\nError: ${error.message}`);
        }
    }
    
    console.log('File upload process complete');
}
async function getBrevoApiKey() {
    // Return cached key if available
    if (BREVO_API_KEY_CACHE) {
        return BREVO_API_KEY_CACHE;
    }
    
    try {
        const { data, error } = await supabaseClient
            .rpc('get_decrypted_api_key', { service: 'brevo_email' });
        
        if (error) {
            console.error('Error fetching Brevo API key:', error);
            return null;
        }
        
        BREVO_API_KEY_CACHE = data;
        return data;
    } catch (error) {
        console.error('Exception fetching Brevo key:', error);
        return null;
    }
}

//SEND EMAIL NOTIFICATION
async function sendEmailNotification(trackingNumber) {
    try {
        console.log('Sending email via Brevo...');
        
        const BREVO_API_KEY = await getBrevoApiKey();
        if (!BREVO_API_KEY) {
            throw new Error('Unable to retrieve Brevo API key');
        }

        const complainantName = `${formData.personal.fname} ${formData.personal.lname}`;


        const emailHTML = `
<!DOCTYPE html>
<html>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #10b981 100%); padding: 40px 30px; text-align: center;">
            <h1 style="color: #ffffff; font-size: 26px; margin: 0 0 8px 0; font-weight: 700;">Barangay VITO</h1>
            <p style="color: #e0f2fe; font-size: 16px; margin: 0; font-weight: 500;">Complaint and Incident Reporting System</p>
            <p style="color: #ffffff; font-size: 18px; margin: 8px 0 0 0; font-weight: 600; letter-spacing: 1px;">(iReklamo)</p>
        </div>
        <div style="padding: 40px 30px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 30px;">
                <div style="display: inline-block; background-color: #dcfce7; color: #166534; padding: 8px 20px; border-radius: 20px; font-size: 14px; font-weight: 600; margin-bottom: 20px;">✓ Complaint Submitted</div>
                <h2 style="color: #1f2937; font-size: 24px; margin: 0 0 15px 0; font-weight: 700;">Complaint Successfully Received</h2>
                <p style="color: #6b7280; font-size: 16px; line-height: 1.6; margin: 0;">Dear ${complainantName},<br>Thank you for reporting your concern to Barangay VITO.</p>
            </div>
            <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-left: 4px solid #3b82f6; padding: 20px; border-radius: 8px; margin: 30px 0;">
                <p style="color: #1e40af; margin: 0 0 10px 0; font-size: 15px; font-weight: 600;">📌 Your Tracking Number</p>
                <p style="color: #1e3a8a; margin: 0; font-size: 24px; font-weight: 700; font-family: 'Courier New', monospace; letter-spacing: 2px;">${trackingNumber}</p>
                <p style="color: #3b82f6; margin: 10px 0 0 0; font-size: 13px;">Use this number to track your complaint status</p>
            </div>
            <div style="margin: 30px 0;">
                <h3 style="color: #374151; font-size: 18px; font-weight: 600; margin: 0 0 15px 0; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Complaint Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr><td style="padding: 10px 0; color: #6b7280; font-size: 14px; width: 35%;"><strong>Type:</strong></td><td style="padding: 10px 0; color: #1f2937; font-size: 14px;">${getTypeText(formData.complaint.type)}</td></tr>
                    <tr><td style="padding: 10px 0; color: #6b7280; font-size: 14px;"><strong>Category:</strong></td><td style="padding: 10px 0; color: #1f2937; font-size: 14px;">${getCategoryText(formData.complaint.category)}</td></tr>
                    <tr><td style="padding: 10px 0; color: #6b7280; font-size: 14px;"><strong>Date & Time:</strong></td><td style="padding: 10px 0; color: #1f2937; font-size: 14px;">${formatDateTime(formData.complaint.dtincident)}</td></tr>
                    <tr><td style="padding: 10px 0; color: #6b7280; font-size: 14px;"><strong>Location:</strong></td><td style="padding: 10px 0; color: #1f2937; font-size: 14px;">${formData.complaint.location}</td></tr>
                    <tr><td style="padding: 10px 0; color: #6b7280; font-size: 14px; vertical-align: top;"><strong>Description:</strong></td><td style="padding: 10px 0; color: #1f2937; font-size: 14px;">${formData.complaint.description}</td></tr>
                </table>
            </div>
            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 30px 0; border-radius: 6px;">
                <p style="color: #92400e; margin: 0 0 10px 0; font-size: 15px; font-weight: 600;">📋 What Happens Next?</p>
                <ol style="color: #b45309; margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.8;">
                    <li>Your complaint will be reviewed by our team</li>
                    <li>An assigned officer will investigate the matter</li>
                    <li>You will receive updates on your complaint status</li>
                    <li>We aim to resolve your concern within 7-14 working days</li>
                </ol>
            </div>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 35px 0;">
            <div style="margin-top: 30px;">
                <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;"><strong>Need help or have questions?</strong></p>
                <p style="margin: 5px 0;"><span style="color: #3b82f6; font-weight: 500; font-size: 14px;">📧 support@vito-barangay.gov.ph</span></p>
                <p style="color: #6b7280; font-size: 14px; margin: 5px 0;">📞 0942-744-2287 / 402-0139</p>
            </div>
        </div>
        <div style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 13px; margin: 0 0 8px 0; font-weight: 600;">Barangay VITO Complaint and Incident Reporting System (iReklamo)</p>
            <p style="color: #9ca3af; font-size: 12px; margin: 5px 0;">Serving the community with transparency and efficiency</p>
            <p style="color: #d1d5db; font-size: 11px; margin: 15px 0 0 0;">© 2025 Barangay VITO. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
        `;
        //we're using brevo for email confirmation once complaint is submitted
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'api-key': BREVO_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sender: {
                    name: 'VITO iReklamo',
                    email: 'princessgeonzon29@gmail.com'
                },
                to: [{
                    email: formData.personal.email,
                    name: complainantName
                }],
                subject: `Complaint Submitted - Tracking #${trackingNumber}`,
                htmlContent: emailHTML
            })
        });

        if (response.ok) {
            console.log('Email sent successfully via Brevo to:', formData.personal.email);
            
            //send to logged-in user too if different
            if (loggedInUser.vu_email_add && loggedInUser.vu_email_add !== formData.personal.email) {
                const userInfo = loggedInUser.vito_user_info?.[0];
                const userName = userInfo ? `${userInfo.vui_fname} ${userInfo.vui_lname}` : 'User';
                
                await fetch('https://api.brevo.com/v3/smtp/email', {
                    method: 'POST',
                    headers: {
                        'api-key': BREVO_API_KEY,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        sender: { name: 'VITO iReklamo', email: 'princessgeonzon29@gmail.com' },
                        to: [{ email: loggedInUser.vu_email_add, name: userName }],
                        subject: `Complaint Submitted - Tracking #${trackingNumber}`,
                        htmlContent: emailHTML
                    })
                });
                
                console.log('Email also sent to logged-in user:', loggedInUser.vu_email_add);
            }
        } else {
            const errorData = await response.json();
            console.error('Brevo error:', errorData);
        }

    } catch (error) {
        console.error('Error sending email:', error);
    }
}

//SHOW SUCCESS MODAL
function showSuccessModal(trackingNumber) {
    const modalHTML = `
        <div id="successModal" class="modal" style="display: block;">
            <div class="modal-content" style="text-align: center; padding: 40px; max-width: 600px; margin: 100px auto; background: white; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
                <div style="font-size: 70px; color: #10b981; margin-bottom: 20px;">✓</div>
                <h2 style="color: #3b82f6; margin-bottom: 15px;">Complaint Submitted</h2>
                <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                    Your complaint was successfully submitted. You may view its progress through the following tracking number:
                </p>
                
                <div style="background: #f9fafb; border: 2px solid #e5e7eb; padding: 20px; border-radius: 8px; margin: 25px 0; position: relative;">
                    <p style="color: #1f2937; font-size: 24px; font-weight: bold; font-family: 'Courier New', monospace; letter-spacing: 2px; margin: 0;">
                        ${trackingNumber}
                    </p>
                    <button id="copyTrackingBtn" style="position: absolute; top: 15px; right: 15px; background: transparent; color: #6b7280; border: none; padding: 8px; cursor: pointer; font-size: 20px;" title="Copy to clipboard">
                        📋
                    </button>
                </div>

                <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 25px 0; text-align: left;">
                    <p style="color: #1e40af; font-size: 14px; margin: 0; line-height: 1.6;">
                        <strong>📧 Email Sent:</strong> A confirmation email with your complaint details has been sent to <strong>${formData.personal.email}</strong>
                    </p>
                </div>

                <div style="display: flex; gap: 15px; justify-content: center; margin-top: 30px;">
                    <button id="submitAnotherBtn" style="background: #3b82f6; color: white; border: none; padding: 14px 30px; font-size: 16px; font-weight: 600; border-radius: 6px; cursor: pointer;">
                        Submit another Complaint
                    </button>
                    <button id="backToDashboardBtn" style="background: white; color: #3b82f6; border: 2px solid #3b82f6; padding: 14px 30px; font-size: 16px; font-weight: 600; border-radius: 6px; cursor: pointer;">
                        BACK
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modalStyle = document.createElement('style');
    modalStyle.textContent = `
        #successModal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            z-index: 9999;
        }
        #copyTrackingBtn:hover {
            color: #3b82f6 !important;
        }
        #submitAnotherBtn:hover {
            background: #2563eb !important;
        }
        #backToDashboardBtn:hover {
            background: #eff6ff !important;
        }
    `;
    document.head.appendChild(modalStyle);

    document.getElementById('copyTrackingBtn').addEventListener('click', () => {
        navigator.clipboard.writeText(trackingNumber);
        const btn = document.getElementById('copyTrackingBtn');
        const original = btn.textContent;
        btn.textContent = '✓';
        btn.style.color = '#10b981';
        
        setTimeout(() => {
            btn.textContent = original;
            btn.style.color = '#6b7280';
        }, 2000);
    });

    document.getElementById('submitAnotherBtn').addEventListener('click', () => {
        location.reload();
    });

    document.getElementById('backToDashboardBtn').addEventListener('click', () => {
        window.location.href = '/user/user-dashboard.html';
    });
}


//NAVIGATION - NEXT/BACK BUTTONS
const steps = document.querySelectorAll('.step');
const cards = document.querySelectorAll('.card');
const nextBtn = document.getElementById('nextbtn');
const backBtn = document.getElementById('backbtn');

nextBtn.addEventListener('click', () => {
    let currentStep = Array.from(cards).findIndex(card => card.classList.contains('active'));

    if (currentStep < steps.length - 1) {
        if (validateCurrentStep()) {
            if (currentStep === 0) {
                savePersonalDetails();
            } else if (currentStep === 1) {
                saveComplaintDetails();
            } else if (currentStep === 2) {
                saveRespondentDetails();
                populateSummary();
            }
            
            currentStep++;
            updateView(currentStep);
        }
    } else {
        const confirmCheckbox = document.getElementById('confirm');
        if (!confirmCheckbox.checked) {
            alert('Please confirm that the information provided is true and accurate.');
            confirmCheckbox.focus();
            return;
        }
        
        submitComplaint();
    }
});

backBtn.addEventListener('click', () => {
    let currentStep = Array.from(cards).findIndex(card => card.classList.contains('active'));
    
    if (currentStep > 0) {
        currentStep--;
        updateView(currentStep);
    }
});

function updateView(currentStep) {
    steps.forEach((step, index) => {
        step.classList.toggle('active', index === currentStep);
        step.classList.toggle('completed', index < currentStep);
    });

    cards.forEach((card, index) => {
        card.classList.toggle('active', index === currentStep);
    });

    backBtn.style.display = currentStep === 0 ? 'none' : 'block';
    nextBtn.textContent = currentStep === steps.length - 1 ? 'SUBMIT' : 'NEXT';

    window.scrollTo(0, 0);
}

function validateCurrentStep() {
    let currentStep = Array.from(cards).findIndex(card => card.classList.contains('active'));
    const currentCard = cards[currentStep];
    const requiredFields = currentCard.querySelectorAll('[required]');
    let isValid = true;
    let firstInvalidField = null;

    const existingErrors = currentCard.querySelectorAll('.error-message');
    existingErrors.forEach(error => error.remove());

    requiredFields.forEach(field => {
        field.style.borderColor = '';
        
        if (!field.value.trim()) {
            isValid = false;
            field.style.borderColor = '#ff0000';
            
            const errorMessage = document.createElement('span');
            errorMessage.className = 'error-message';
            errorMessage.style.color = '#ff0000';
            errorMessage.style.fontSize = '10pt';
            errorMessage.style.display = 'block';
            errorMessage.style.marginTop = '5px';
            errorMessage.textContent = 'This field is required';
            
            field.parentNode.appendChild(errorMessage);

            if (!firstInvalidField) {
                firstInvalidField = field;
            }
        }
    });

    if (firstInvalidField) {
        firstInvalidField.focus();
    }

    return isValid;
}


//LOGOUT HANDLER
const logoutBtn = document.getElementById('logout');
const logoutModal = document.getElementById('logoutModal');
const cancelLogoutBtn = document.getElementById('cancelLogout');
const confirmLogoutBtn = document.getElementById('confirmLogout');

if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        logoutModal.classList.add('show');
    });

    cancelLogoutBtn.addEventListener('click', () => {
        logoutModal.classList.remove('show');
    });

    logoutModal.addEventListener('click', (e) => {
        if (e.target === logoutModal) {
            logoutModal.classList.remove('show');
        }
    });

    //handle logout confirmation
    confirmLogoutBtn.addEventListener('click', async () => {
        try {
            const { error } = await supabaseClient.auth.signOut();
            if (error) throw error;
            
            sessionStorage.removeItem('loggedInUser');
            window.location.href = '/user/user-landing.html';
        } catch (error) {
            console.error('Logout error:', error);
            alert('Error logging out');
            logoutModal.classList.remove('show');
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && logoutModal.classList.contains('show')) {
            logoutModal.classList.remove('show');
        }
    });
}

//Initialize view
updateView(0);

console.log('File complaint script loaded');
