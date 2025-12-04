document.addEventListener('DOMContentLoaded', () => {
    setupDropdowns();
    loadDeactivatedAdmins();
    setupEventListeners();
});

let currentModalEscHandler = null;

function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterData(e.target.value);
        });
    }
    
    const entriesSelect = document.getElementById('entriesSelect');
    if (entriesSelect) {
        entriesSelect.addEventListener('change', (e) => {
            entriesPerPage = parseInt(e.target.value);
            currentPage = 1;
            renderTable();
        });
    }
}

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

let data = [];
let currentPage = 1;
let entriesPerPage = 10;
let filteredData = [];

async function loadDeactivatedAdmins() {
    try {
        console.log('Loading deactivated admins...');

        const { data: deactivatedAdmins, error } = await supabaseClient
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
            .eq('va_status', 'deactivated')
            .order('va_id', { ascending: true });

        if (error) {
            console.error('Error loading deactivated admins:', error);
            alert('Error loading deactivated admins: ' + error.message);
            return;
        }

        console.log('Deactivated admins loaded (before filter):', deactivatedAdmins);

        const filteredAdmins = deactivatedAdmins.filter(admin => {
            const createdAt = new Date(admin.created_at).getTime();
            const updatedAt = new Date(admin.updated_at).getTime();
            return updatedAt > createdAt; 
        });

        console.log('Filtered deactivated admins (after filter):', filteredAdmins);

        data = filteredAdmins.map(admin => {
            const info = admin.vito_admin_info?.[0] || {};
            const fullName = `${info.vai_fname || ''} ${info.vai_mname || ''} ${info.vai_lname || ''} ${info.vai_suffix || ''}`.trim() || 'N/A';
            
            return {
                va_id: admin.va_id,
                admincode: info.vai_code || 'N/A',
                adfullname: fullName,
                adposition: info.vai_barangay_position || 'N/A',
                adgender: info.vai_gender || 'N/A',
                adaddress: info.vai_address || 'N/A',
                adcontact: admin.va_phone_no || 'N/A',
                status: admin.va_status,
                rawData: { admin, info }
            };
        });

        filteredData = [...data];
        renderTable();

    } catch (error) {
        console.error('Error in loadDeactivatedAdmins:', error);
        alert('Error loading deactivated admins: ' + error.message);
    }
}


function renderTable() {
    const tbody = document.getElementById('tableBody');
    const start = (currentPage - 1) * entriesPerPage;
    const end = start + entriesPerPage;
    const pageData = filteredData.slice(start, end);

    tbody.innerHTML = '';
    
    for (let i = 0; i < entriesPerPage; i++) {
        const item = pageData[i];
        
        let actionHTML = '';
        if (item) {
            actionHTML = `<button class="reactivate-btn" onclick="reactivateAdmin(${item.va_id})">Reactivate</button>`;
        }
        
        const row = `
            <tr>
                <td>${item ? item.admincode : ''}</td>
                <td>${item ? item.adfullname : ''}</td>
                <td>${item ? item.adposition : ''}</td>
                <td>${item ? item.adgender : ''}</td>
                <td>${item ? item.adaddress : ''}</td>
                <td>${item ? item.adcontact : ''}</td>
                <td>${actionHTML}</td>
            </tr>
        `;
        tbody.innerHTML += row;
    }

    updatePagination();
    updateShowingInfo();
}


async function reactivateAdmin(va_id) {
    try {
        //Create confirmation modal with ESC handler
        showConfirmModalWithEsc({
            icon: '⚠️',
            title: 'Reactivate Admin Account',
            message: `Are you sure you want to reactivate this admin account?<br>
                        They will:
                        • Be able to log in again
                        • Be moved back to the Active Admins list
                        • Have full system access<br><br>`,
            confirmText: 'REACTIVATE',
            cancelText: 'CANCEL',
            onConfirm: async () => {
                await performReactivation(va_id);
            }
        });
    } catch (error) {
        console.error('Error in reactivateAdmin:', error);
    }
}

async function performReactivation(va_id) {
    try {
        console.log('Reactivating admin:', va_id);

        const { error } = await supabaseClient
            .from('vito_admin')
            .update({
                va_status: 'active',
                updated_at: new Date().toISOString()
            })
            .eq('va_id', va_id);

        if (error) throw error;

        //Show success modal WITHOUT ESC handler
        showModalWithoutEsc({
            icon: '✅',
            iconColor: '#10b981',
            title: 'Admin Reactivated!',
            titleColor: '#10b981',
            message: 'The admin account has been successfully reactivated and moved back to the Active Admins list.',
            buttons: [{
                text: 'OK',
                color: '#10b981',
                onClick: async () => {
                    await loadDeactivatedAdmins();
                }
            }]
        });

    } catch (error) {
        console.error('Error reactivating admin:', error);
        
        //Show error modal WITHOUT ESC handler
        showModalWithoutEsc({
            icon: '❌',
            iconColor: '#ef4444',
            title: 'Error Reactivating Admin',
            titleColor: '#ef4444',
            message: `There was an error reactivating this admin:<br><br>${error.message}`,
            buttons: [{
                text: 'OK',
                color: '#ef4444',
                onClick: null
            }]
        });
    }
}

function showConfirmModalWithEsc(options) {
    const {
        icon = '❓',
        title = 'Confirm Action',
        message = 'Are you sure?',
        confirmText = 'Confirm',
        cancelText = 'Cancel',
        onConfirm = null,
        onCancel = null
    } = options;

    showModalWithEsc({
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

function showModalWithEsc(options) {
    const { icon, iconColor = '#000', title, titleColor = '#000', message, buttons = [] } = options;
    
    closeModal();

    const overlay = document.createElement('div');
    overlay.id = 'custom-modal-overlay';
    overlay.style.cssText = `
        position: fixed; inset: 0;
        background: rgba(0,0,0,0.5);
        display: flex; justify-content: center; align-items: center;
        z-index: 9999;
    `;

    const modal = document.createElement('div');
    modal.id = 'custom-modal';
    modal.style.cssText = `
        background: white; border-radius: 12px; padding: 24px 32px;
        max-width: 400px; text-align: center;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        font-family: system-ui, sans-serif;
    `;

    modal.innerHTML = `
        <div style="font-size: 36px; color: ${iconColor}; margin-bottom: 12px;">${icon}</div>
        <h2 style="margin: 0 0 12px; color: ${titleColor}; font-size: 20px;">${title}</h2>
        <p style="color: #374151; white-space: pre-line; font-size: 15px;">${message}</p>
        <div id="modal-buttons" style="margin-top: 20px; display: flex; justify-content: center; gap: 12px;"></div>
    `;

    const btnContainer = modal.querySelector('#modal-buttons');
    buttons.forEach(btn => {
        const button = document.createElement('button');
        button.textContent = btn.text;
        button.style.cssText = `
            background: ${btn.color}; border: none; color: white;
            padding: 8px 16px; border-radius: 6px; cursor: pointer;
            font-size: 14px;
        `;
        button.onclick = btn.onClick || closeModal;
        btnContainer.appendChild(button);
    });

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    //Add ESC handler
    currentModalEscHandler = (e) => {
        if (e.key === 'Escape') {
            e.stopPropagation();
            e.preventDefault();
            closeModal();
        }
    };
    document.addEventListener('keydown', currentModalEscHandler);
}

function showModalWithoutEsc(options) {
    const { icon, iconColor = '#000', title, titleColor = '#000', message, buttons = [] } = options;
    
    closeModal();

    const overlay = document.createElement('div');
    overlay.id = 'custom-modal-overlay';
    overlay.style.cssText = `
        position: fixed; inset: 0;
        background: rgba(0,0,0,0.5);
        display: flex; justify-content: center; align-items: center;
        z-index: 9999;
    `;

    const modal = document.createElement('div');
    modal.id = 'custom-modal';
    modal.style.cssText = `
        background: white; border-radius: 12px; padding: 24px 32px;
        max-width: 400px; text-align: center;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        font-family: system-ui, sans-serif;
    `;

    modal.innerHTML = `
        <div style="font-size: 36px; color: ${iconColor}; margin-bottom: 12px;">${icon}</div>
        <h2 style="margin: 0 0 12px; color: ${titleColor}; font-size: 20px;">${title}</h2>
        <p style="color: #374151; white-space: pre-line; font-size: 15px;">${message}</p>
        <div id="modal-buttons" style="margin-top: 20px; display: flex; justify-content: center; gap: 12px;"></div>
    `;

    const btnContainer = modal.querySelector('#modal-buttons');
    buttons.forEach(btn => {
        const button = document.createElement('button');
        button.textContent = btn.text;
        button.style.cssText = `
            background: ${btn.color}; border: none; color: white;
            padding: 8px 16px; border-radius: 6px; cursor: pointer;
            font-size: 14px;
        `;
        button.onclick = async () => {
        if (btn.onClick) {
            await btn.onClick();
        }
        closeModal();
};
        btnContainer.appendChild(button);
    });

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
}

function closeModal() {
    const overlay = document.getElementById('custom-modal-overlay');
    if (overlay) {
        overlay.remove();
        //Remove ESC handler
        if (currentModalEscHandler) {
            document.removeEventListener('keydown', currentModalEscHandler);
            currentModalEscHandler = null;
        }
    }
}


function updatePagination() {
    const totalPages = Math.ceil(filteredData.length / entriesPerPage);
    const paginationDiv = document.getElementById('pagination');
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
    const total = filteredData.length;
    if (total === 0) {
        document.getElementById('showingInfo').textContent = 'Showing 0 to 0 of 0 entries';
    } else {
        const start = (currentPage - 1) * entriesPerPage + 1;
        const end = Math.min(currentPage * entriesPerPage, total);
        document.getElementById('showingInfo').textContent = `Showing ${start} to ${end} of ${total} entries`;
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

document.getElementById('searchInput').addEventListener('input', (e) => {
    filterData(e.target.value);
});

document.getElementById('entriesSelect').addEventListener('change', (e) => {
    entriesPerPage = parseInt(e.target.value);
    currentPage = 1;
    renderTable();
});

console.log('Manage deactivated admins script loaded');