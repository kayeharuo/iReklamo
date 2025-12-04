document.addEventListener('DOMContentLoaded', () => {
    setupDropdowns();
    checkAddUserPermission();
    loadAdmins();
    setupEventListeners();
});

let currentModalEscHandler = null;

function setupEventListeners() {
    //Safely attach search input listener
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterData(e.target.value);
        });
    } else {
        console.warn('Search input not found');
    }
    
    //Safely attach entries select listener
    const entriesSelect = document.getElementById('entriesSelect');
    if (entriesSelect) {
        entriesSelect.addEventListener('change', (e) => {
            entriesPerPage = parseInt(e.target.value);
            currentPage = 1;
            renderTable();
        });
    } else {
        console.warn('Entries select not found');
    }
    
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            //Only close these if no alert modal is open
            if (!document.getElementById('customAdminModal')) {
                closeAddUserModal();
                closeViewUserModal();
            }
        }
    });
}

function setupDropdowns() {
    const dropdowns = document.querySelectorAll('.menu-dropdown');
    
    if (dropdowns.length === 0) {
        console.warn('No dropdown menus found');
        return;
    }
    
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
    
    console.log('Dropdowns initialized:', dropdowns.length);
}

//Check if current admin has permission to add users
function checkAddUserPermission() {
    const adminPosition = sessionStorage.getItem('adminPosition');
    const addUserBtn = document.getElementById('adduserbtn');
    
    if (!addUserBtn) {
        console.warn('Add user button not found');
        return;
    }
    
    console.log('Checking add user permission for position:', adminPosition);
    
    //Only Barangay Secretary and IT Consultant can add users
    const allowedPositions = ['Barangay Secretary', 'IT Consultant'];
    
    if (!allowedPositions.includes(adminPosition)) {
        console.log('Position NOT allowed to add users:', adminPosition);
        
        addUserBtn.disabled = true;
        addUserBtn.style.opacity = '0.5';
        addUserBtn.style.cursor = 'not-allowed';
        addUserBtn.style.backgroundColor = '#9ca3af';
        addUserBtn.title = 'Only Barangay Secretary and IT Consultant can add users';
        
        addUserBtn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            alert('Access Denied!<br><br>You do not have permission to add users.<br><br>Only Barangay Secretary and IT Consultant can perform this action.');
            return false;
        };
    } else {
        console.log('Position ALLOWED to add users:', adminPosition);
        
        addUserBtn.disabled = false;
        addUserBtn.style.opacity = '1';
        addUserBtn.style.cursor = 'pointer';
        addUserBtn.style.backgroundColor = '#1e15b6';
        addUserBtn.title = 'Add new admin user';
        
        addUserBtn.onclick = function(e) {
            e.preventDefault();
            openAddUserModal();
        };
    }
}

let data = [];
let currentPage = 1;
let entriesPerPage = 10;
let filteredData = [];

async function loadAdmins() {
    try {
        console.log('Loading admins...');

        const { data: admins, error } = await supabaseClient
            .from('vito_admin')
            .select(`
                va_id,
                va_email_add,
                va_phone_no,
                va_status,
                created_at,
                updated_at,
                vito_admin_info (
                    vai_code,
                    vai_fname,
                    vai_mname,
                    vai_lname,
                    vai_suffix,
                    vai_gender,
                    vai_dob,
                    vai_address,
                    vai_barangay_position
                )
            `)
            .in('va_status', ['active', 'deactivated'])
            .order('va_status', { ascending: false })
            .order('va_id', { ascending: true });

        if (error) {
            console.error('Error loading admins:', error);
            alert('Error loading admins: ' + error.message);
            return;
        }

        console.log('Admins loaded:', admins);

        const filteredAdmins = admins.filter(admin => {
            if (admin.va_status === 'active') return true;

            const createdAt = new Date(admin.created_at).getTime();
            const updatedAt = new Date(admin.updated_at).getTime();
            return createdAt === updatedAt;
        });

        data = filteredAdmins.map(admin => {
            const info = admin.vito_admin_info?.[0] || {};
            const fullName = `${info.vai_fname || ''} ${info.vai_mname || ''} ${info.vai_lname || ''} ${info.vai_suffix || ''}`.trim() || 'N/A';
            
            return {
                va_id: admin.va_id,
                admincode: info.vai_code || 'Not Activated',
                adfullname: fullName,
                ademail: admin.va_email_add || 'N/A',
                adposition: info.vai_barangay_position || 'N/A',
                status: admin.va_status,
                rawData: { admin, info }
            };
        });

        filteredData = [...data];
        renderTable();

    } catch (error) {
        console.error('Error in loadAdmins:', error);
        alert('Error loading admins: ' + error.message);
    }
}


function renderTable() {
    const tbody = document.getElementById('tableBody');
    if (!tbody) {
        console.error('Table body not found');
        return;
    }
    
    const start = (currentPage - 1) * entriesPerPage;
    const end = start + entriesPerPage;
    const pageData = filteredData.slice(start, end);

    tbody.innerHTML = '';
    
    for (let i = 0; i < entriesPerPage; i++) {
        const item = pageData[i];
        
        let actionHTML = '';
        if (item) {
            if (item.status === 'deactivated') {
                actionHTML = `<button class="activate-btn" onclick="activateAdmin(${item.va_id})">Activate</button>`;
            } else if (item.status === 'active') {
                actionHTML = `<a href="#" class="view-details-link" onclick="viewAdminDetails(${item.va_id}); return false;">View Details</a>`;
            }
        }
        
        const row = `
            <tr>
                <td>${item ? item.admincode : ''}</td>
                <td>${item ? item.adfullname : ''}</td>
                <td>${item ? item.ademail : ''}</td>
                <td>${item ? item.adposition : ''}</td>
                <td>${actionHTML}</td>
            </tr>
        `;
        tbody.innerHTML += row;
    }

    updatePagination();
    updateShowingInfo();
}

function showModal(options) {
    const {
        icon = '✅',
        iconColor = '#10b981',
        title = 'Success',
        titleColor = '#10b981',
        message = '',
        details = [],
        buttons = [{ text: 'OK', color: '#3b82f6', onClick: null }]
    } = options;

    //Remove existing modal if any
    const existingModal = document.getElementById('customAdminModal');
    if (existingModal) existingModal.remove();

    const detailsHTML = details.length > 0 ? `
        <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: left;">
            ${details.map(detail => `
                <p style="color: #374151; font-size: 15px; margin: 8px 0; line-height: 1.6;">
                    <strong>${detail.label}:</strong> ${detail.value}
                </p>
            `).join('')}
        </div>
    ` : '';

    const buttonsHTML = buttons.map((btn, index) => `
        <button 
            id="adminModalBtn${index}" 
            style="background: ${btn.color}; color: white; border: none; padding: 14px 30px; font-size: 16px; font-weight: bold; border-radius: 6px; cursor: pointer; transition: all 0.3s; min-width: 120px;"
            onmouseover="this.style.opacity='0.9'"
            onmouseout="this.style.opacity='1'">
            ${btn.text}
        </button>
    `).join('');

    const modalHTML = `
        <div id="customAdminModal" style="display: block; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.6); z-index: 9999;">
            <div style="text-align: center; padding: 40px; max-width: 550px; margin: 80px auto; background: white; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.3); animation: modalSlideDown 0.3s ease;">
                <div style="font-size: 70px; margin-bottom: 20px;">${icon}</div>
                <h2 style="color: ${titleColor}; margin-bottom: 15px; font-size: 26px; font-weight: 700;">${title}</h2>
                <p style="color: #6b7280; font-size: 16px; margin-bottom: 10px; line-height: 1.6;">
                    ${message}
                </p>
                ${detailsHTML}
                <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin-top: 25px;">
                    ${buttonsHTML}
                </div>
            </div>
        </div>
    `;

    if (!document.getElementById('adminModalAnimationStyle')) {
        const style = document.createElement('style');
        style.id = 'adminModalAnimationStyle';
        style.textContent = `
            @keyframes modalSlideDown {
                from {
                    transform: translateY(-50px);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);
    }

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    currentModalEscHandler = (e) => {
        if (e.key === 'Escape') {
            e.stopPropagation();
            e.preventDefault();
            closeAdminModal();
        }
    };

    document.addEventListener('keydown', currentModalEscHandler);

    //Attach button handlers
    buttons.forEach((btn, index) => {
        const btnElement = document.getElementById(`adminModalBtn${index}`);
        if (btnElement) {
            btnElement.addEventListener('click', () => {
                if (btn.onClick) btn.onClick();
                closeAdminModal();
            });
        }
    });
}

function closeAdminModal() {
    const modal = document.getElementById('customAdminModal');
    if (modal) {
        modal.remove();
        if (currentModalEscHandler) {
            document.removeEventListener('keydown', currentModalEscHandler);
            currentModalEscHandler = null;
        }
    }
}

function showConfirmModal(options) {
    const {
        icon = '❓',
        title = 'Confirm Action',
        message = 'Are you sure?',
        confirmText = 'Confirm',
        cancelText = 'Cancel',
        onConfirm = null,
        onCancel = null
    } = options;

    showModal({
        icon: icon,
        iconColor: '#f59e0b',
        title: title,
        titleColor: '#1f2937',
        message: message,
        buttons: [
            {
                text: cancelText,
                color: '#6b7280',
                onClick: onCancel
            },
            {
                text: confirmText,
                color: '#3b82f6',
                onClick: onConfirm
            }
        ]
    });
}

function showModalWithoutEsc(options) {
    const {
        icon = '✅',
        iconColor = '#10b981',
        title = 'Success',
        titleColor = '#10b981',
        message = '',
        details = [],
        buttons = [{ text: 'OK', color: '#3b82f6', onClick: null }]
    } = options;

    const existingModal = document.getElementById('customAdminModal');
    if (existingModal) existingModal.remove();

    const detailsHTML = details.length > 0 ? `
        <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: left;">
            ${details.map(detail => `
                <p style="color: #374151; font-size: 15px; margin: 8px 0; line-height: 1.6;">
                    <strong>${detail.label}:</strong> ${detail.value}
                </p>
            `).join('')}
        </div>
    ` : '';

    const buttonsHTML = buttons.map((btn, index) => `
        <button 
            id="adminModalBtn${index}" 
            style="background: ${btn.color}; color: white; border: none; padding: 14px 30px; font-size: 16px; font-weight: bold; border-radius: 6px; cursor: pointer; transition: all 0.3s; min-width: 120px;"
            onmouseover="this.style.opacity='0.9'"
            onmouseout="this.style.opacity='1'">
            ${btn.text}
        </button>
    `).join('');

    const modalHTML = `
        <div id="customAdminModal" style="display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.6); z-index: 9999; align-items: center; justify-content: center; padding: 20px; overflow-y: auto;">
            <div style="text-align: center; padding: 40px; max-width: 550px; width: 100%; background: white; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.3); animation: modalSlideDown 0.3s ease; max-height: 90vh; overflow-y: auto; margin: auto;">
                <div style="font-size: 70px; margin-bottom: 20px;">${icon}</div>
                <h2 style="color: ${titleColor}; margin-bottom: 15px; font-size: 26px; font-weight: 700;">${title}</h2>
                <p style="color: #6b7280; font-size: 16px; margin-bottom: 10px; line-height: 1.6;">
                    ${message}
                </p>
                ${detailsHTML}
                <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin-top: 25px;">
                    ${buttonsHTML}
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    buttons.forEach((btn, index) => {
        const btnElement = document.getElementById(`adminModalBtn${index}`);
        if (btnElement) {
            btnElement.addEventListener('click', async () => {
                if (btn.onClick) await btn.onClick();
                closeAdminModal();
            });
        }
    });
}

async function activateAdmin(va_id) {
    try {
        showConfirmModal({
            icon: '🔓',
            title: 'Activate Admin Account',
            message: 'Are you sure you want to activate this admin account?<br><br>This will:<br>• Create their login credentials<br>• Allow them to access the system',
            confirmText: 'ACTIVATE',
            cancelText: 'CANCEL',
            onConfirm: async () => {
                await performActivation(va_id);
            }
        });

    } catch (error) {
        console.error('Error in activating Admin:', error);
    }
}

async function performActivation(va_id) {
    try {
        console.log('Activating admin:', va_id);

        //Get admin credentials
        const { data: prepData, error: prepError } = await supabaseClient
            .rpc('prepare_admin_activation', { admin_id: va_id });

        if (prepError) throw new Error('Failed to prepare activation: ' + prepError.message);
        if (!prepData.success) throw new Error(prepData.error);

        console.log('Admin credentials retrieved, creating auth user...');

        //Create auth user using signUp
        const { data: signUpData, error: signUpError } = await supabaseClient.auth.signUp({
            email: prepData.email,
            password: prepData.password,
            options: {
                data: {
                    role: 'admin',
                    created_by: 'admin_activation',
                    va_id: va_id  
                }
            }
        });

        if (signUpError) throw new Error('Failed to create auth user: ' + signUpError.message);
        if (!signUpData.user) throw new Error('No user data returned from signup');

        console.log('Auth user created:', signUpData.user.id);

        await new Promise(resolve => setTimeout(resolve, 500));

        //Finalize activation
        const { data: finalData, error: finalError } = await supabaseClient
            .rpc('finalize_admin_activation', { 
                admin_id: va_id, 
                auth_uid: signUpData.user.id 
            });

        if (finalError) {
            console.error('Finalize error:', finalError);
            throw new Error('Failed to finalize activation: ' + finalError.message);
        }

        if (!finalData.success) {
            console.error('Finalize returned error:', finalData.error);
            throw new Error(finalData.error || 'Activation failed');
        }

        console.log('Admin activated successfully');

        showModalWithoutEsc({
            icon: '✅',
            iconColor: '#10b981',
            title: 'Admin Activated Successfully!',
            titleColor: '#10b981',
            message: '⚠️ IMPORTANT: Save these credentials immediately!<br><br>The password will only be shown once and cannot be recovered.',
            details: [
                { label: '📧 Email', value: prepData.email },
                { label: '🔑 Temporary Password', value: `<code style="background: #fee; padding: 4px 8px; border-radius: 4px; font-family: monospace; font-size: 16px; color: #c00; user-select: all;">${prepData.password}</code>` },
                { label: '🆔 Admin Code', value: finalData.admin_code || 'Auto-generated' },
                { label: '✅ Status', value: 'Active - Ready to Login' },
                { label: '💡 Note', value: 'The admin should change this password after first login' }
            ],
            buttons: [{
                text: 'I HAVE SAVED THE PASSWORD',
                color: '#10b981',
                onClick: async () => {
                    await loadAdmins();
                }
            }]
        });

    } catch (error) {
        console.error('Error activating admin:', error);
        
        showModalWithoutEsc({
            icon: '❌',
            iconColor: '#ef4444',
            title: 'Activation Failed',
            titleColor: '#ef4444',
            message: error.message || 'Failed to activate admin account.',
            details: [
                { label: '💡 Tip', value: 'Try refreshing the page and activating again' }
            ],
            buttons: [{
                text: 'OK',
                color: '#ef4444',
                onClick: null
            }]
        });
    }
}

async function viewAdminDetails(va_id) {
    try {
        console.log('Opening admin details for va_id:', va_id);

        const adminEntry = data.find(a => a.va_id === va_id);
        if (!adminEntry) {
            console.error('Admin not found in data array for va_id:', va_id);
            alert('Admin not found');
            return;
        }

        const { admin: adminData, info } = adminEntry.rawData;

        function safeSetText(elementId, value) {
            const el = document.getElementById(elementId);
            if (el) {
                el.textContent = value || 'N/A';
            } else {
                console.warn(`safeSetText: element not found: ${elementId}`);
            }
        }

        //Populate modal fields
        safeSetText('viewAdminCode', info.vai_code);
        safeSetText('viewPosition', info.vai_barangay_position);
        safeSetText('viewLastName', info.vai_lname);
        safeSetText('viewFirstName', info.vai_fname);
        safeSetText('viewMiddleName', info.vai_mname);
        safeSetText('viewSuffix', info.vai_suffix);
        safeSetText('viewGender', info.vai_gender);
        safeSetText('viewDateOfBirth', formatDate(info.vai_dob));
        safeSetText('viewEmailAddress', adminData.va_email_add);
        safeSetText('viewContactNumber', adminData.va_phone_no);
        safeSetText('viewResidentialAddress', info.vai_address);

        window.currentAdminId = va_id;

        openViewUserModal();

        await new Promise(res => setTimeout(res, 60));

        const modalOverlay = document.getElementById('viewUserModalOverlay');
        const modalRoot = modalOverlay || document.querySelector('.modal2') || document.body;

        let deactivateBtn = null;
        try {
            deactivateBtn = modalRoot.querySelector('.deactivate-btn');
        } catch (err) {
            console.warn('Error querying modalRoot for .deactivate-btn', err);
        }

        if (!deactivateBtn) {
            deactivateBtn = document.querySelector('.deactivate-btn');
        }

        if (!deactivateBtn) {
            console.warn('viewAdminDetails: deactivate button not found in DOM. Ensure your modal markup includes a button with class="deactivate-btn".');
        } else {
            console.log('viewAdminDetails: deactivate button found:', deactivateBtn);

            if (deactivateBtn.hasAttribute('onclick')) {
                console.log('viewAdminDetails: removing inline onclick attribute from deactivate button');
                deactivateBtn.removeAttribute('onclick');
            }

            const cleanBtn = deactivateBtn.cloneNode(true);
            deactivateBtn.parentNode.replaceChild(cleanBtn, deactivateBtn);

            cleanBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();

                const loggedInVaId = sessionStorage.getItem('adminId');
                console.log('deactivate clicked — viewed va_id:', va_id, 'loggedInVaId:', loggedInVaId);

                //If user clicked their own account, show a blocking modal and do nothing
                if (String(va_id) === String(loggedInVaId)) {
                    console.warn('Blocked: attempt to deactivate own account');
                    showModal({
                        icon: '🚫',
                        iconColor: '#ef4444',
                        title: 'Action Not Allowed',
                        titleColor: '#ef4444',
                        message: 'You cannot deactivate your own account. Please ask another administrator to perform this action.',
                        buttons: [{ text: 'OK', color: '#ef4444' }]
                    });
                    return false;
                }

                try {
                    await deactivateAdmin();
                } catch (err) {
                    console.error('Error while deactivating admin:', err);
                    showModal({
                        icon: '❌',
                        iconColor: '#ef4444',
                        title: 'Deactivation Error',
                        titleColor: '#ef4444',
                        message: err && err.message ? err.message : 'An error occurred during deactivation.',
                        buttons: [{ text: 'OK', color: '#ef4444' }]
                    });
                }
            });
        }

        console.log('viewAdminDetails: completed wiring for deactivate button (if present)');
    } catch (error) {
        console.error('Error viewing admin details:', error);
        alert('Error loading admin details: ' + (error && error.message ? error.message : error));
    }
}


async function deactivateAdmin() {
    if (!window.currentAdminId) return;

    try {
        showConfirmModal({
        icon: '⚠️',
        title: 'Deactivate Admin Account',
        message: `Are you sure you want to deactivate this admin account?<br>
    They will:<br>• Not be able to log in<br>• Be moved to the Deactivated Admins list<br>• Need to be reactivated to access the system again`,
        confirmText: 'DEACTIVATE',
        cancelText: 'CANCEL',
        onConfirm: async () => {
            await performDeactivation(window.currentAdminId);
        }
    });


    } catch (error) {
        console.error('Error in deactivateAdmin:', error);
    }
}

async function performDeactivation(adminId) {
    try {
        const { error } = await supabaseClient
            .from('vito_admin')
            .update({ 
                va_status: 'deactivated',
                updated_at: new Date().toISOString()
            })
            .eq('va_id', adminId);

        if (error) throw error;

        closeViewUserModal();

        showModalWithoutEsc({
            icon: '✅',
            iconColor: '#10b981',
            title: 'Admin Deactivated',
            titleColor: '#10b981',
            message: 'The admin account has been deactivated successfully.',
            buttons: [{
                text: 'OK',
                color: '#10b981',
                onClick: async () => {
                    await loadAdmins();
                }
            }]
        });

    } catch (error) {
        console.error('Error deactivating admin:', error);
        
        showModalWithoutEsc({
            icon: '❌',
            iconColor: '#ef4444',
            title: 'Deactivation Failed',
            titleColor: '#ef4444',
            message: error.message || 'Failed to deactivate admin account.',
            buttons: [{
                text: 'OK',
                color: '#ef4444',
                onClick: null
            }]
        });
    }
}

function updatePagination() {
    const totalPages = Math.ceil(filteredData.length / entriesPerPage);
    const paginationDiv = document.getElementById('pagination');
    
    if (!paginationDiv) {
        console.error('Pagination div not found');
        return;
    }
    
    paginationDiv.innerHTML = '';

    if (totalPages === 0) return;

    const prevBtn = document.createElement('button');
    prevBtn.textContent = '‹';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => {
        if (currentPage > 1) {
            currentPage--;
            renderTable();
        }
    };
    paginationDiv.appendChild(prevBtn);

    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    if (startPage > 1) {
        const firstBtn = document.createElement('button');
        firstBtn.textContent = '1';
        firstBtn.onclick = () => {
            currentPage = 1;
            renderTable();
        };
        paginationDiv.appendChild(firstBtn);

        if (startPage > 2) {
            const dots = document.createElement('button');
            dots.textContent = '...';
            dots.disabled = true;
            paginationDiv.appendChild(dots);
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        const btn = document.createElement('button');
        btn.textContent = i;
        btn.className = i === currentPage ? 'active' : '';
        btn.onclick = () => {
            currentPage = i;
            renderTable();
        };
        paginationDiv.appendChild(btn);
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const dots = document.createElement('button');
            dots.textContent = '...';
            dots.disabled = true;
            paginationDiv.appendChild(dots);
        }

        const lastBtn = document.createElement('button');
        lastBtn.textContent = totalPages;
        lastBtn.onclick = () => {
            currentPage = totalPages;
            renderTable();
        };
        paginationDiv.appendChild(lastBtn);
    }

    const nextBtn = document.createElement('button');
    nextBtn.textContent = '›';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => {
        if (currentPage < totalPages) {
            currentPage++;
            renderTable();
        }
    };
    paginationDiv.appendChild(nextBtn);
}

function updateShowingInfo() {
    const showingInfoDiv = document.getElementById('showingInfo');
    if (!showingInfoDiv) {
        console.error('Showing info div not found');
        return;
    }
    
    const total = filteredData.length;
    if (total === 0) {
        showingInfoDiv.textContent = 'Showing 0 to 0 of 0 entries';
    } else {
        const start = (currentPage - 1) * entriesPerPage + 1;
        const end = Math.min(currentPage * entriesPerPage, total);
        showingInfoDiv.textContent = `Showing ${start} to ${end} of ${total} entries`;
    }
}

function filterData(searchTerm) {
    searchTerm = searchTerm.toLowerCase();
    filteredData = data.filter(item => {
        return Object.values(item).some(val => 
            String(val).toLowerCase().includes(searchTerm)
        );
    });
    currentPage = 1;
    renderTable();
}

function openAddUserModal() {
    const adminPosition = sessionStorage.getItem('adminPosition');
    const allowedPositions = ['Barangay Secretary', 'IT Consultant'];
    
    if (!allowedPositions.includes(adminPosition)) {
        alert('Access Denied!<br><br>Only Barangay Secretary and IT Consultant can add users.');
        return;
    }
    
    const modalOverlay = document.getElementById('addUserModalOverlay');
    if (modalOverlay) {
        modalOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeAddUserModal() {
    const modalOverlay = document.getElementById('addUserModalOverlay');
    if (modalOverlay) {
        modalOverlay.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
    
    const form = document.getElementById('addUserForm');
    if (form) {
        form.reset();
    }
}

function closeAddUserModalOnOverlay(event) {
    if (event.target.id === 'addUserModalOverlay') {
        closeAddUserModal();
    }
}

async function saveUser() {
    const form = document.getElementById('addUserForm');
    
    if (!form || !form.checkValidity()) {
        showModal({
            icon: '⚠️',
            iconColor: '#f59e0b',
            title: 'Incomplete Form',
            titleColor: '#f59e0b',
            message: 'Please fill in all required fields.',
            buttons: [{ text: 'OK', color: '#f59e0b', onClick: null }]
        });
        return;
    }

    const adminPosition = sessionStorage.getItem('adminPosition');
    const allowedPositions = ['Barangay Secretary', 'IT Consultant'];
    
    if (!allowedPositions.includes(adminPosition)) {
        showModal({
            icon: '🚫',
            iconColor: '#ef4444',
            title: 'Access Denied',
            titleColor: '#ef4444',
            message: 'Only Barangay Secretary and IT Consultant can add users.',
            buttons: [{ text: 'OK', color: '#ef4444', onClick: () => closeAddUserModal() }]
        });
        return;
    }

    try {
        const userData = {
            position: document.getElementById('position').value,
            lastName: document.getElementById('lastName').value,
            firstName: document.getElementById('firstName').value,
            middleName: document.getElementById('middleName')?.value || '',
            suffix: document.getElementById('suffix')?.value || '',
            gender: document.getElementById('gender').value,
            dateOfBirth: document.getElementById('dateOfBirth').value,
            emailAddress: document.getElementById('emailAddress').value,
            contactNumber: document.getElementById('contactNumber').value,
            residentialAddress: document.getElementById('residentialAddress').value
        };

        //Validations
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(userData.emailAddress)) {
            showModal({
                icon: '📧',
                iconColor: '#f59e0b',
                title: 'Invalid Email',
                titleColor: '#f59e0b',
                message: 'Please enter a valid email address.',
                buttons: [{ text: 'OK', color: '#f59e0b', onClick: () => document.getElementById('emailAddress').focus() }]
            });
            return;
        }

        const contactRegex = /^(09|\+639)\d{9}$/;
        if (!contactRegex.test(userData.contactNumber.replace(/\s/g, ''))) {
            showModal({
                icon: '📱',
                iconColor: '#f59e0b',
                title: 'Invalid Phone Number',
                titleColor: '#f59e0b',
                message: 'Please enter a valid Philippine mobile number (e.g., 09171234567).',
                buttons: [{ text: 'OK', color: '#f59e0b', onClick: () => document.getElementById('contactNumber').focus() }]
            });
            return;
        }

        console.log('Adding deactivated admin:', userData);

        //Check if email already exists
        const { data: existingAdmin, error: checkError } = await supabaseClient
            .from('vito_admin')
            .select('va_id')
            .eq('va_email_add', userData.emailAddress)
            .maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') {
            throw checkError;
        }

        if (existingAdmin) {
            showModal({
                icon: '⚠️',
                iconColor: '#f59e0b',
                title: 'Email Already Registered',
                titleColor: '#f59e0b',
                message: 'This email address is already registered. Please use a different email address.',
                buttons: [{ text: 'OK', color: '#f59e0b', onClick: () => document.getElementById('emailAddress').focus() }]
            });
            return;
        }

        //Insert with deactivated status (NO PASSWORD)
        const { data: adminData, error: adminError } = await supabaseClient
            .from('vito_admin')
            .insert({
                va_email_add: userData.emailAddress,
                va_phone_no: userData.contactNumber,
                va_status: 'deactivated',
                auth_user_id: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (adminError) throw adminError;

        console.log('Admin record created with deactivated status:', adminData.va_id);

        //Insert into vito_admin_info
        const { error: infoError } = await supabaseClient
            .from('vito_admin_info')
            .insert({
                vai_fname: userData.firstName,
                vai_lname: userData.lastName,
                vai_mname: userData.middleName,
                vai_suffix: userData.suffix,
                vai_gender: userData.gender,
                vai_dob: userData.dateOfBirth,
                vai_address: userData.residentialAddress,
                vai_barangay_position: userData.position,
                vai_code: null,
                va_id: adminData.va_id,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });

        if (infoError) throw infoError;

        console.log('Admin info record created');

        closeAddUserModal();
        
        //Show success modal WITHOUT ESC
        showModalWithoutEsc({
            icon: '✅',
            iconColor: '#10b981',
            title: 'Admin Added Successfully!',
            titleColor: '#10b981',
            message: 'The admin account has been created and is waiting for activation.<br><br>📌 A temporary password will be generated when you activate this account.',
            details: [
                { label: '👤 Name', value: `${userData.firstName} ${userData.lastName}` },
                { label: '💼 Position', value: userData.position },
                { label: '📧 Email', value: userData.emailAddress },
                { label: '📊 Status', value: '🔴 Deactivated (Pending Activation)' },
                { label: '🔐 Password', value: 'Will be generated during activation' }
            ],
            buttons: [{
                text: 'OK',
                color: '#10b981',
                onClick: async () => {
                    await loadAdmins();
                }
            }]
        });

    } catch (error) {
        console.error('Error adding admin:', error);
        
        showModalWithoutEsc({
            icon: '❌',
            iconColor: '#ef4444',
            title: 'Error Adding Admin',
            titleColor: '#ef4444',
            message: error.message || 'An unexpected error occurred.',
            buttons: [{
                text: 'OK',
                color: '#ef4444',
                onClick: null
            }]
        });
    }
}

function openViewUserModal() {
    console.log('Opening view user modal');
    
    const modalOverlay = document.getElementById('viewUserModalOverlay');
    if (!modalOverlay) {
        console.error('View user modal overlay not found!');
        alert('Error: Modal not found in page');
        return;
    }
    
    modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    console.log('Modal opened successfully');
}

function closeViewUserModal() {
    const modalOverlay = document.getElementById('viewUserModalOverlay');
    if (modalOverlay) {
        modalOverlay.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
}

function closeViewUserModalOnOverlay(event) {
    if (event.target.id === 'viewUserModalOverlay') {
        closeViewUserModal();
    }
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

console.log('Manage admins script loaded - Updated 2025-11-11 00:29:52 UTC');