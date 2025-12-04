let currentUser = null;
let recordsModalEscHandler = null;

window.onload = function() {
    window.scrollTo(0, 0);
};

document.addEventListener("DOMContentLoaded", () => {
    const toggleButton = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (toggleButton) {
        toggleButton.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }
});

window.addEventListener('DOMContentLoaded', async () => {
    try {
        //check authentication
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
        
        if (authError || !user) {
            console.error('Not authenticated');
            if (window.location.pathname !== '/user/user-landing.html' && 
                !window.location.pathname.endsWith('/user/user-landing.html')) {
                window.location.href = '/user/user-landing.html';
            }
            return;
        }

        window.history.pushState(null, '', window.location.href);
        window.addEventListener('popstate', function(event) {
            window.history.pushState(null, '', window.location.href);
        });

        //get user data
        const { data: userData, error: userError } = await supabaseClient
            .from('vito_user')
            .select(`
                vu_id,
                vu_email_add,
                vito_user_info(vui_fname, vui_lname)
            `)
            .eq('auth_user_id', user.id)
            .single();

        if (userError) throw userError;

        currentUser = userData;
        console.log('User loaded:', userData);

        //Load dashboard stats
        await loadDashboardStats();
        setupCardHandlers();

    } catch (error) {
        console.error('Error loading dashboard:', error);
        window.location.href = '/user/user-landing.html';
    }
});

//LOAD DASHBOARD STATS
async function loadDashboardStats() {
    try {
        const { data: stats, error } = await supabaseClient
            .from('vito_dashboard_stat')
            .select('*')
            .eq('vu_id', currentUser.vu_id)
            .single();

        if (error && error.code !== 'PGRST116') throw error; 

        if (stats) {
            document.getElementById('pendingcount').textContent = stats.vdstat_pending || 0;
            document.getElementById('underrevcount').textContent = stats.vdstat_ureview || 0;
            document.getElementById('mediationcount').textContent = stats.vdtstat_mediation || 0;
            document.getElementById('closedcount').textContent = stats.vdstat_resolved || 0;
        } else {
            //No stats yet, show zeros
            document.getElementById('pendingcount').textContent = '0';
            document.getElementById('underrevcount').textContent = '0';
            document.getElementById('mediationcount').textContent = '0';
            document.getElementById('closedcount').textContent = '0';
        }

    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

//SETUP CARD CLICK HANDLERS
function setupCardHandlers() {
    const cardConfigs = [
        { id: 'pendingCard', status: 'Pending', title: 'PENDING COMPLAINTS OR REPORTS' },
        { id: 'underReviewCard', status: 'Under Review', title: 'UNDER REVIEW' },
        { id: 'mediationCard', status: 'For Mediation', title: 'FOR MEDIATION' },
        { id: 'resolvedCard', status: 'Resolved/Closed', title: 'RESOLVED OR CLOSED CASES' }
    ];

    cardConfigs.forEach(config => {
        const card = document.getElementById(config.id);
        if (card) {
            card.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Card clicked:', config.status);
                showStatusModal(config.status, config.title);
            });
        }
    });
}

//SHOW MODAL WITH RECORDS FOR SPECIFIC STATUS
async function showStatusModal(status, title) {
    try {
        console.log('Loading records with status:', status, 'for user:', currentUser.vu_id);

        //Query based on your schema: vu_id is in vito_complaint_incident table
        const { data: records, error } = await supabaseClient
            .from('vito_complaint_incident')
            .select(`
                *,
                vito_ci_stat!inner (vcistat_current_stat, vcistat_last_updated)
            `)
            .eq('vito_ci_stat.vcistat_current_stat', status)
            .eq('vu_id', currentUser.vu_id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        console.log('Found records:', records.length);

        displayRecordsModal(records, title);

    } catch (error) {
        console.error('Error loading records:', error);
        alert('Error loading records: ' + error.message);
    }
}

function displayRecordsModal(records, title) {
    const tableRows = records.length > 0 ? records.map(record => {
        const stat = record.vito_ci_stat[0];
        return `
            <tr>
                <td>${record.vci_tracking}</td>
                <td>${formatDate(record.created_at)}</td>
                <td>${record.vci_type}</td>
                <td>${record.vci_category}</td>
                <td>${formatDate(stat.vcistat_last_updated)}</td>
            </tr>
        `;
    }).join('') : `
        <tr>
            <td colspan="5" style="text-align: center; padding: 40px; color: #6b7280;">
                <p style="font-size: 16px;">No records found</p>
            </td>
        </tr>
    `;

    const modalHTML = `
        <div id="recordsModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2 id="modalTitle">${title}</h2>
                    <span class="close" style="cursor: pointer;" onclick="event.stopPropagation(); closeRecordsModal();">&times;</span>
                </div>
                <div class="modal-body">
                    <table>
                        <thead>
                            <tr>
                                <th>TRACKING NO.</th>
                                <th>DATE CREATED</th>
                                <th>TYPE</th>
                                <th>CATEGORY</th>
                                <th>LAST UPDATED</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tableRows}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        
        <style>
            #recordsModal {
                display: block !important;
            }
        </style>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    console.log('Modal inserted into DOM');

    recordsModalEscHandler = (e) => {
        if (e.key === 'Escape') {
            closeRecordsModal();
        }
    };
    document.addEventListener('keydown', recordsModalEscHandler);
}

//CLOSE RECORDS MODAL
function closeRecordsModal() {
    const modal = document.getElementById('recordsModal');
    if (modal) {
        modal.remove();
        if (recordsModalEscHandler) {
            document.removeEventListener('keydown', recordsModalEscHandler);
            recordsModalEscHandler = null;
        }
        console.log('Records modal closed');
    }
}

//SEARCH TRACKING NUMBER
const searchInput = document.getElementById('searchinput');

if (searchInput) {
    searchInput.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter') {
            const trackingNumber = searchInput.value.trim().toUpperCase();
            
            if (!trackingNumber) {
                alert('⚠️ Please enter a tracking number');
                return;
            }

            await searchComplaint(trackingNumber);
        }
    });
}

async function searchComplaint(trackingNumber) {
    try {
        console.log('Searching for:', trackingNumber);

        //get complaint details
        const { data: complaint, error: complaintError } = await supabaseClient
            .from('vito_complaint_incident')
            .select(`
                *,
                vito_ci_complainant(*),
                vito_ci_stat(*),
                vito_ci_timeline(*),
                vito_ci_files(*)
            `)
            .eq('vci_tracking', trackingNumber)
            .single();

        if (complaintError) {
            if (complaintError.code === 'PGRST116') {
                alert('Tracking number not found!');
            } else {
                throw complaintError;
            }
            return;
        }

        console.log('Complaint found:', complaint);

        //display complaint details
        displayComplaintDetails(complaint);

    } catch (error) {
        console.error('Error searching complaint:', error);
        alert('⚠️ Error searching for complaint');
    }
}

function displayComplaintDetails(complaint) {
    const complainant = complaint.vito_ci_complainant[0];
    const status = complaint.vito_ci_stat[0];
    const timeline = complaint.vito_ci_timeline || [];
    const files = complaint.vito_ci_files || [];

    //sort timeline by date DESCENDING (newest first)
    timeline.sort((a, b) => {
        const dateA = new Date(a.vcitimeline_date || a.created_at);
        const dateB = new Date(b.vcitimeline_date || b.created_at);
        return dateB - dateA; //descending order (from latest to oldest entries)
    });

    //html included here to avoid in line script
    const detailsHTML = `
        <div style="border: 2px solid #e5e7eb; border-radius: 12px; padding: 30px; margin-top: 30px; background: white; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
            
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; padding-bottom: 20px; border-bottom: 2px solid #e5e7eb;">
                <h3 style="color: #1f2937; font-size: 22px; font-weight: 700; margin: 0;">REPORT DETAILS</h3>
                <button id="closeDetails" style="background: #ef4444; color: white; border: none; padding: 8px 20px; border-radius: 6px; cursor: pointer; font-weight: 600;">✕ Close</button>
            </div>

            <!-- Tracking Number -->
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #10b981 100%); padding: 15px 20px; border-radius: 8px; margin-bottom: 25px;">
                <p style="color: white; margin: 0; font-size: 14px; font-weight: 500;">Tracking Number:</p>
                <p style="color: white; margin: 5px 0 0 0; font-size: 24px; font-weight: 700; font-family: 'Courier New', monospace; letter-spacing: 2px;">${complaint.vci_tracking}</p>
            </div>

            <!-- Complaint Info Grid -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px;">
                <div>
                    <p style="color: #6b7280; font-size: 13px; margin: 0;">Type of Complaint:</p>
                    <p style="color: #1f2937; font-size: 16px; font-weight: 600; margin: 5px 0 0 0;">${complaint.vci_type}</p>
                </div>
                <div>
                    <p style="color: #6b7280; font-size: 13px; margin: 0;">Category:</p>
                    <p style="color: #1f2937; font-size: 16px; font-weight: 600; margin: 5px 0 0 0;">${complaint.vci_category}</p>
                </div>
                <div>
                    <p style="color: #6b7280; font-size: 13px; margin: 0;">Date and Time of Incident:</p>
                    <p style="color: #1f2937; font-size: 16px; font-weight: 600; margin: 5px 0 0 0;">${formatDateTime(complaint.vci_date_time)}</p>
                </div>
                <div>
                    <p style="color: #6b7280; font-size: 13px; margin: 0;">Location:</p>
                    <p style="color: #1f2937; font-size: 16px; font-weight: 600; margin: 5px 0 0 0;">${complaint.vci_location}</p>
                </div>
            </div>

            <div style="margin-bottom: 25px;">
                <p style="color: #6b7280; font-size: 13px; margin: 0 0 8px 0;">Description:</p>
                <p style="color: #1f2937; font-size: 15px; line-height: 1.6; margin: 0; background: #f9fafb; padding: 15px; border-radius: 6px;">${complaint.vci_description}</p>
            </div>

            ${files.length > 0 ? `
            <div style="margin-bottom: 25px;">
                <p style="color: #6b7280; font-size: 13px; margin: 0 0 10px 0;">Attached Files:</p>
                <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                    ${files.map(file => `
                        <a href="${file.vfile_public_url}" target="_blank" style="background: #eff6ff; color: #3b82f6; padding: 8px 15px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 500;">
                            📎 ${file.vfile_filename}
                        </a>
                    `).join('')}
                </div>
            </div>
            ` : ''}

            <!-- Status Information -->
            <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
                <h4 style="color: #1e40af; margin: 0 0 15px 0; font-size: 18px; font-weight: 700;">STATUS INFORMATION</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div>
                        <p style="color: #6b7280; font-size: 13px; margin: 0;">Current Status:</p>
                        <p style="color: #1e40af; font-size: 16px; font-weight: 700; margin: 5px 0 0 0;">${status.vcistat_current_stat}</p>
                    </div>
                    <div>
                        <p style="color: #6b7280; font-size: 13px; margin: 0;">Date Filed:</p>
                        <p style="color: #1f2937; font-size: 16px; font-weight: 600; margin: 5px 0 0 0;">${formatDate(status.vcistat_date_filed)}</p>
                    </div>
                    ${status.vcistat_assigned_officer ? `
                    <div>
                        <p style="color: #6b7280; font-size: 13px; margin: 0;">Assigned Officer:</p>
                        <p style="color: #1f2937; font-size: 16px; font-weight: 600; margin: 5px 0 0 0;">${status.vcistat_assigned_officer}</p>
                    </div>
                    ` : ''}
                    ${status.vcistat_resolution ? `
                    <div style="grid-column: 1 / -1;">
                        <p style="color: #6b7280; font-size: 13px; margin: 0 0 8px 0;">Resolution Notes:</p>
                        <p style="color: #1f2937; font-size: 15px; line-height: 1.6; margin: 0; background: white; padding: 15px; border-radius: 6px;">${status.vcistat_resolution}</p>
                    </div>
                    ` : ''}
                    <div>
                        <p style="color: #6b7280; font-size: 13px; margin: 0;">Last Updated:</p>
                        <p style="color: #1f2937; font-size: 14px; margin: 5px 0 0 0;">${formatDateTime(status.vcistat_last_updated)}</p>
                    </div>
                </div>
            </div>

            <!-- Timeline (DESCENDING ORDER) -->
            <div>
                <h4 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px; font-weight: 700;">TIMELINE</h4>
                <table style="width: 100%; border-collapse: collapse; background: white; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                    <thead>
                        <tr style="background: #3b82f6; color: white;">
                            <th style="padding: 12px; text-align: left; font-size: 14px; font-weight: 600;">Date</th>
                            <th style="padding: 12px; text-align: left; font-size: 14px; font-weight: 600;">Action Taken</th>
                            <th style="padding: 12px; text-align: left; font-size: 14px; font-weight: 600;">By</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${timeline.length > 0 ? timeline.map((entry, index) => `
                            <tr style="border-bottom: 1px solid #e5e7eb; ${index % 2 === 0 ? 'background: #f9fafb;' : ''}">
                                <td style="padding: 12px; font-size: 14px; color: #1f2937;">${formatDate(entry.vcitimeline_date || entry.created_at)}</td>
                                <td style="padding: 12px; font-size: 14px; color: #1f2937; font-weight: 500;">${entry.vcitimeline_action}</td>
                                <td style="padding: 12px; font-size: 14px; color: #6b7280;">${entry.vcitimeline_actor || 'System'}</td>
                            </tr>
                        `).join('') : `
                            <tr>
                                <td colspan="3" style="padding: 20px; text-align: center; color: #9ca3af;">No timeline entries yet.</td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>

        </div>
    `;

    //insert details into page
    const searchContainer = document.querySelector('.search');
    
    //remove existing details if any
    const existingDetails = document.getElementById('complaintDetails');
    if (existingDetails) {
        existingDetails.remove();
    }

    //add new details
    const detailsDiv = document.createElement('div');
    detailsDiv.id = 'complaintDetails';
    detailsDiv.innerHTML = detailsHTML;
    searchContainer.after(detailsDiv);

    //add close button handler
    document.getElementById('closeDetails').addEventListener('click', () => {
        detailsDiv.remove();
        searchInput.value = '';
    });

    //scroll to details
    detailsDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

//HELPER FUNCTIONS
function formatDateTime(datetime) {
    if (!datetime) return 'N/A';
    const date = new Date(datetime);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatDate(datetime) {
    if (!datetime) return 'N/A';
    const date = new Date(datetime);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
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