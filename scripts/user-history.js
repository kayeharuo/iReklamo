let loggedInUser = null;
let confirmWithdraw = null;


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

        //load complaint history
        await loadComplaintHistory();

    } catch (error) {
        console.error('Error loading user:', error);
        window.location.href = '/user/user-landing.html';
    }
});




//LOAD COMPLAINT HISTORY
async function loadComplaintHistory() {
    try {
        console.log('📋 Loading complaint history for user:', loggedInUser.vu_id);

        //fetch all complaints for this user with related data
        const { data: complaints, error } = await supabaseClient
            .from('vito_complaint_incident')
            .select(`
                *,
                vito_ci_complainant (*),
                vito_ci_respondent (*),
                vito_ci_stat (*),
                vito_ci_timeline (*)
            `)
            .eq('vu_id', loggedInUser.vu_id);

        if (error) throw error;

        //sort complaints by last updated (most recent first)
        //withdrawn complaints will appear at top since they were just updated
        if (complaints && complaints.length > 0) {
            complaints.sort((a, b) => {
                const dateA = a.vito_ci_stat?.[0]?.vcistat_last_updated || a.created_at;
                const dateB = b.vito_ci_stat?.[0]?.vcistat_last_updated || b.created_at;
                return new Date(dateB) - new Date(dateA);
            });
        }

        console.log('Complaints loaded and sorted:', complaints);

        //populate table
        populateHistoryTable(complaints);

    } catch (error) {
        console.error('Error loading complaints:', error);
        alert('Error loading complaint history: ' + error.message);
    }
}


//POPULATE HISTORY TABLE
function populateHistoryTable(complaints) {
    const tbody = document.querySelector('.historytable tbody');
    tbody.innerHTML = '';

    if (!complaints || complaints.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px; color: #6b7280;">
                    <div style="font-size: 48px; margin-bottom: 15px;">📭</div>
                    <p style="font-size: 16px; font-weight: 600; margin-bottom: 5px;">No Complaints Found</p>
                    <p style="font-size: 14px;">You haven't filed any complaints yet.</p>
                </td>
            </tr>
        `;
        return;
    }

    complaints.forEach(complaint => {
        const status = complaint.vito_ci_stat?.[0];
        const respondent = complaint.vito_ci_respondent?.[0];
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${complaint.vci_tracking}</td>
            <td>${formatDate(complaint.created_at)}</td>
            <td>${complaint.vci_type}</td>
            <td>${complaint.vci_category}</td>
            <td>${respondent?.vcirespondent_name || 'N/A'}</td>
            <td>${status?.vcistat_current_stat || 'Pending'}</td>
            <td>${status?.vcistat_last_updated ? formatDate(status.vcistat_last_updated) : formatDate(complaint.created_at)}</td>
            <td>
                <button class="view-btn" onclick="viewComplaint(${complaint.vci_id})">View</button>
                ${canWithdraw(status?.vcistat_current_stat) ? 
                    `<button class="withdraw-btn" onclick="withdrawComplaint(${complaint.vci_id}, '${complaint.vci_tracking}', event)">Withdraw</button>` 
                    : '<span style="color: #9ca3af; font-size: 13px;">Withdrawn</span>'}
            </td>
        `;
        
        tbody.appendChild(row);
    });

    addButtonStyles();
}

function addButtonStyles() {
    if (document.getElementById('history-button-styles')) return;

    const styleSheet = document.createElement('style');
    styleSheet.id = 'history-button-styles';
    styleSheet.textContent = `
        /* Center ALL table cell contents */
        .historytable th,
        .historytable td {
            text-align: center !important;
            vertical-align: middle !important;
        }
        
        .view-btn, .withdraw-btn {
            padding: 8px 24px;
            border: 2px solid transparent;
            border-radius: 6px;
            font-weight: 500;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s;
            margin: 4px;
            min-width: 90px;
            display: inline-block;
            text-align: center;
        }
        
        .view-btn {
            background-color: #f4b513;
            color: white;
            border-color: #f4b513;
        }
        
        .view-btn:hover {
            background-color: white;
            color: #f4b513;
            border-color: #f4b513;
            box-shadow: 0 2px 6px rgba(244, 181, 19, 0.2);
        }
        
        .withdraw-btn {
            background-color: #e41411;
            color: white;
            border-color: #e41411;
        }
        
        .withdraw-btn:hover {
            background-color: white;
            color: #e41411;
            border-color: #e41411;
            box-shadow: 0 2px 6px rgba(228, 20, 17, 0.2);
        }
    `;
    
    document.head.appendChild(styleSheet);
}

//FORMAT DATE
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
    });
}


//GET STATUS CLASS FOR BADGE COLOR
function getStatusClass(status) {
    const statusMap = {
        'Pending': 'status-pending',
        'Under Review': 'status-review',
        'For Mediation': 'status-mediation',
        'Resolved': 'status-resolved',
        'Closed': 'status-closed'
    };
    return statusMap[status] || 'status-pending';
}


//CHECK IF COMPLAINT CAN BE WITHDRAWN
function canWithdraw(status) {
    //Can only withdraw if NOT already Resolved/Closed
    return status !== 'Resolved/Closed';
}


//VIEW COMPLAINT DETAILS (MODAL)
async function viewComplaint(vci_id) {
    try {
        console.log('Viewing complaint:', vci_id);

        //fetch complete complaint details
        const { data: complaint, error } = await supabaseClient
            .from('vito_complaint_incident')
            .select(`
                *,
                vito_ci_complainant (*),
                vito_ci_respondent (*),
                vito_ci_stat (*),
                vito_ci_timeline (*),
                vito_ci_files (*)
            `)
            .eq('vci_id', vci_id)
            .single();

        if (error) throw error;

        console.log('📄 Complaint details:', complaint);

        //show modal
        showComplaintModal(complaint);

    } catch (error) {
        console.error('Error loading complaint details:', error);
        alert('Error loading complaint details: ' + error.message);
    }
}


//SHOW COMPLAINT MODAL
function showComplaintModal(complaint) {
    const complainant = complaint.vito_ci_complainant?.[0];
    const respondent = complaint.vito_ci_respondent?.[0];
    const status = complaint.vito_ci_stat?.[0];
    const timeline = complaint.vito_ci_timeline || [];
    const files = complaint.vito_ci_files || [];

    //sort timeline by date (newest first)
    timeline.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const modalHTML = `
        <div id="complaintModal" class="complaint-modal">
            <div class="complaint-modal-content">
                
                <!-- Modal Header -->
                <div style="background: linear-gradient(135deg, #3b82f6 0%, #10b981 100%); padding: 30px; border-radius: 10px 10px 0 0; color: white; position: relative;">
                    <button class="modal-close-btn" onclick="closeModal()">×</button>
                    <h2 style="margin: 0 0 10px 0; font-size: 24px;">Report Details</h2>
                    <p style="margin: 0; opacity: 0.9; font-size: 14px;">Tracking #: <strong style="font-family: monospace; letter-spacing: 1px;">${complaint.vci_tracking}</strong></p>
                </div>

                <!-- Modal Body -->
                <div style="padding: 30px; max-height: 70vh; overflow-y: auto;">

                    <!-- Complainant Info -->
                    <div style="background: #f9fafb; border-left: 4px solid #3b82f6; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
                        <h3 style="margin: 0 0 15px 0; color: #1f2937; font-size: 18px;">👤 Complainant Information</h3>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                            <div>
                                <p style="color: #6b7280; font-size: 13px; margin: 0 0 5px 0;">Full Name</p>
                                <p style="color: #1f2937; font-weight: 600; margin: 0;">${complainant?.vcicomplainant_fname} ${complainant?.vcicomplainant_mname || ''} ${complainant?.vcicomplainant_lname}</p>
                            </div>
                            <div>
                                <p style="color: #6b7280; font-size: 13px; margin: 0 0 5px 0;">Contact</p>
                                <p style="color: #1f2937; font-weight: 600; margin: 0;">${complainant?.vcicomplainant_contact}</p>
                            </div>
                            <div>
                                <p style="color: #6b7280; font-size: 13px; margin: 0 0 5px 0;">Email</p>
                                <p style="color: #1f2937; font-weight: 600; margin: 0;">${complainant?.vcicomplainant_email}</p>
                            </div>
                            <div>
                                <p style="color: #6b7280; font-size: 13px; margin: 0 0 5px 0;">Address</p>
                                <p style="color: #1f2937; font-weight: 600; margin: 0;">${complainant?.vcicomplainant_address}</p>
                            </div>
                        </div>
                    </div>

                    <!-- Incident/Complaint Details -->
                    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
                        <h3 style="margin: 0 0 15px 0; color: #1f2937; font-size: 18px;">📋 Complaint Details</h3>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                            <div>
                                <p style="color: #92400e; font-size: 13px; margin: 0 0 5px 0;">Type</p>
                                <p style="color: #1f2937; font-weight: 600; margin: 0;">${complaint.vci_type}</p>
                            </div>
                            <div>
                                <p style="color: #92400e; font-size: 13px; margin: 0 0 5px 0;">Category</p>
                                <p style="color: #1f2937; font-weight: 600; margin: 0;">${complaint.vci_category}</p>
                            </div>
                            <div>
                                <p style="color: #92400e; font-size: 13px; margin: 0 0 5px 0;">Date & Time</p>
                                <p style="color: #1f2937; font-weight: 600; margin: 0;">${formatDateTime(complaint.vci_date_time)}</p>
                            </div>
                            <div>
                                <p style="color: #92400e; font-size: 13px; margin: 0 0 5px 0;">Location</p>
                                <p style="color: #1f2937; font-weight: 600; margin: 0;">${complaint.vci_location}</p>
                            </div>
                        </div>
                        <div>
                            <p style="color: #92400e; font-size: 13px; margin: 0 0 5px 0;">Description</p>
                            <p style="color: #1f2937; line-height: 1.6; margin: 0;">${complaint.vci_description}</p>
                        </div>
                        ${complaint.vci_witness ? `
                            <div style="margin-top: 15px;">
                                <p style="color: #92400e; font-size: 13px; margin: 0 0 5px 0;">Witnesses</p>
                                <p style="color: #1f2937; margin: 0;">${complaint.vci_witness}</p>
                            </div>
                        ` : ''}
                    </div>

                    <!-- Respondent Info -->
                    ${respondent ? `
                        <div style="background: #fee2e2; border-left: 4px solid #ef4444; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
                            <h3 style="margin: 0 0 15px 0; color: #1f2937; font-size: 18px;">Respondent Information</h3>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                                <div>
                                    <p style="color: #991b1b; font-size: 13px; margin: 0 0 5px 0;">Name</p>
                                    <p style="color: #1f2937; font-weight: 600; margin: 0;">${respondent.vcirespondent_name}</p>
                                </div>
                                <div>
                                    <p style="color: #991b1b; font-size: 13px; margin: 0 0 5px 0;">Relationship</p>
                                    <p style="color: #1f2937; font-weight: 600; margin: 0;">${respondent.vcirespondent_relationship || 'N/A'}</p>
                                </div>
                                <div style="grid-column: 1 / -1;">
                                    <p style="color: #991b1b; font-size: 13px; margin: 0 0 5px 0;">Address</p>
                                    <p style="color: #1f2937; font-weight: 600; margin: 0;">${respondent.vcirespondent_address || 'N/A'}</p>
                                </div>
                                ${respondent.vcirespondent_description ? `
                                    <div style="grid-column: 1 / -1;">
                                        <p style="color: #991b1b; font-size: 13px; margin: 0 0 5px 0;">Description</p>
                                        <p style="color: #1f2937; margin: 0;">${respondent.vcirespondent_description}</p>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    ` : ''}

                    <!-- Status -->
                    <div style="background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
                        <h3 style="margin: 0 0 15px 0; color: #1f2937; font-size: 18px;">Current Status</h3>
                        <div style="display: flex; align-items: center; gap: 20px; flex-wrap: wrap;">
                            <div style="background: ${getStatusColor(status?.vcistat_current_stat)}; padding: 10px 20px; border-radius: 6px; font-weight: 600; color: white;">
                                ${status?.vcistat_current_stat || 'Pending'}
                            </div>
                            <div>
                                <p style="color: #0369a1; font-size: 13px; margin: 0 0 3px 0;">Date Filed</p>
                                <p style="color: #1f2937; font-weight: 600; margin: 0;">${formatDateTime(status?.vcistat_date_filed || complaint.created_at)}</p>
                            </div>
                            ${status?.vcistat_assigned_officer ? `
                                <div>
                                    <p style="color: #0369a1; font-size: 13px; margin: 0 0 3px 0;">Assigned Officer</p>
                                    <p style="color: #1f2937; font-weight: 600; margin: 0;">${status.vcistat_assigned_officer}</p>
                                </div>
                            ` : ''}
                        </div>
                        ${status?.vcistat_resolution ? `
                            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #bae6fd;">
                                <p style="color: #0369a1; font-size: 13px; margin: 0 0 5px 0;">Resolution</p>
                                <p style="color: #1f2937; margin: 0; line-height: 1.6;">${status.vcistat_resolution}</p>
                            </div>
                        ` : ''}
                    </div>

                    <!-- Timeline -->
                    <div style="background: white; border: 2px solid #e5e7eb; padding: 20px; border-radius: 6px;">
                        <h3 style="margin: 0 0 20px 0; color: #1f2937; font-size: 18px;">🕒 Timeline</h3>
                        <div class="timeline-container">
                            ${timeline.length > 0 ? timeline.map(item => `
                                <div class="timeline-item" style="display: flex; gap: 15px; margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #f3f4f6;">
                                    <div style="flex-shrink: 0; width: 10px; height: 10px; background: #3b82f6; border-radius: 50%; margin-top: 5px;"></div>
                                    <div style="flex: 1;">
                                        <p style="color: #6b7280; font-size: 12px; margin: 0 0 5px 0;">${formatDateTime(item.created_at)}</p>
                                        <p style="color: #1f2937; font-weight: 600; margin: 0 0 5px 0;">${item.vcitimeline_action}</p>
                                        ${item.vcitimeline_details ? `<p style="color: #6b7280; font-size: 14px; margin: 0;">${item.vcitimeline_details}</p>` : ''}
                                        ${item.vcitimeline_actor ? `<p style="color: #9ca3af; font-size: 12px; margin: 5px 0 0 0;">By: ${item.vcitimeline_actor}</p>` : ''}
                                    </div>
                                </div>
                            `).join('') : `
                                <p style="color: #9ca3af; text-align: center; padding: 20px;">No timeline entries yet.</p>
                            `}
                        </div>
                    </div>

                    ${files.length > 0 ? `
                        <div style="margin-top: 25px; background: #f9fafb; padding: 20px; border-radius: 6px;">
                            <h3 style="margin: 0 0 15px 0; color: #1f2937; font-size: 18px;">📎 Attachments</h3>
                            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 15px;">
                                ${files.map(file => `
                                    <a href="${file.vfile_public_url}" target="_blank" style="text-decoration: none;">
                                        <div style="border: 2px solid #e5e7eb; border-radius: 8px; padding: 10px; text-align: center; transition: all 0.3s; cursor: pointer;" 
                                             onmouseover="this.style.borderColor='#3b82f6'; this.style.transform='scale(1.05)'" 
                                             onmouseout="this.style.borderColor='#e5e7eb'; this.style.transform='scale(1)'">
                                            <img src="${file.vfile_public_url}" style="width: 100%; height: 100px; object-fit: cover; border-radius: 6px; margin-bottom: 8px;">
                                            <p style="color: #6b7280; font-size: 11px; margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${file.vfile_filename}</p>
                                        </div>
                                    </a>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                </div>

                <!-- Modal Footer -->
                <div style="padding: 20px 30px; background: #f9fafb; border-top: 1px solid #e5e7eb; display: flex; justify-content: flex-end; gap: 10px; border-radius: 0 0 10px 10px;">
                    <button onclick="closeModal()" class="modal-close-button">Close</button>
                </div>

            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modalStyle = document.createElement('style');
    modalStyle.textContent = `
        .complaint-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .complaint-modal-content {
            background: white;
            border-radius: 10px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            max-width: 900px;
            width: 100%;
            max-height: 90vh;
            animation: modalSlideIn 0.3s ease-out;
            position: relative;
        }
        @keyframes modalSlideIn {
            from {
                opacity: 0;
                transform: translateY(-50px) scale(0.9);
            }
            to {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }
        .modal-close-btn {
            position: absolute;
            top: 15px;
            right: 15px;
            background: rgba(255,255,255,0.2);
            color: white;
            border: none;
            width: 35px;
            height: 35px;
            border-radius: 50%;
            font-size: 28px;
            cursor: pointer;
            transition: all 0.3s;
            display: flex;
            align-items: center;
            justify-content: center;
            line-height: 1;
        }
        .modal-close-btn:hover {
            background: rgba(255,255,255,0.3);
            transform: rotate(90deg);
        }
        .modal-close-button {
            padding: 10px 24px;
            background: white;
            color: #6b7280;
            border: 2px solid #e5e7eb;
            border-radius: 6px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
        }
        .modal-close-button:hover {
            background: #f3f4f6;
        }
    `;
    document.head.appendChild(modalStyle);

    function escHandler(e) {
        if (e.key === 'Escape') closeModal();
    }
    document.addEventListener('keydown', escHandler);

    window.closeModal = function() {
        const modal = document.getElementById('complaintModal');
        if (modal) modal.remove();
        document.removeEventListener('keydown', escHandler);
    };
}

//GET STATUS COLOR
function getStatusColor(status) {
    const colorMap = {
        'Pending': '#f59e0b',
        'Under Review': '#3b82f6',
        'For Mediation': '#ec4899',
        'Resolved/Closed': '#10b981'
    };
    return colorMap[status] || '#6b7280';
}


//WITHDRAW COMPLAINT
async function withdrawComplaint(vci_id, trackingNumber, event) {
    // Prevent double-clicking
    const withdrawBtn = event.target;
    if (withdrawBtn.disabled) {
        console.log('⚠️ Withdrawal already in progress');
        return;
    }

    confirmWithdraw = null;
    showWithdrawModal(trackingNumber);
    
    // Wait for user action
    await new Promise(resolve => {
        const checkInterval = setInterval(() => {
            if (confirmWithdraw !== null) {
                clearInterval(checkInterval);
                resolve();
            }
        }, 100);
    });

    if(!confirmWithdraw) return;

    try {
        withdrawBtn.disabled = true;
        withdrawBtn.style.opacity = '0.5';
        withdrawBtn.textContent = 'Processing';
        
        console.log('Withdrawing complaint VCI_ID:', vci_id);

        // Check if already withdrawn
        const { data: currentStatus, error: checkError } = await supabaseClient
            .from('vito_ci_stat')
            .select('vcistat_current_stat')
            .eq('vci_id', vci_id)
            .single();

        if (checkError) throw checkError;

        if (currentStatus.vcistat_current_stat === 'Resolved/Closed') {
            alert('This complaint has already been withdrawn.');
            await loadComplaintHistory();
            return;
        }

        // Update status to Resolved/Closed
        // The trigger will automatically create the timeline entry!
        const { data: updatedStatus, error: statusError } = await supabaseClient
            .from('vito_ci_stat')
            .update({
                vcistat_current_stat: 'Resolved/Closed',
                vcistat_resolution: 'Case withdrawn by complainant',
                vcistat_last_updated: new Date().toISOString()
            })
            .eq('vci_id', vci_id)
            .select();

        if (statusError) {
            console.error('❌ Status update error:', statusError);
            throw statusError;
        }

        console.log('✅ Status updated to Resolved/Closed:', updatedStatus);
        console.log('✅ Timeline entry created automatically by database trigger');

        showWithdrawCompleteModal(trackingNumber);

        console.log('🔄 Reloading complaint history...');
        await loadComplaintHistory();

    } catch (error) {
        console.error('❌ Error withdrawing complaint:', error);
        alert('Error: ' + error.message);
        
        // Re-enable button on error
        withdrawBtn.disabled = false;
        withdrawBtn.style.opacity = '1';
        withdrawBtn.textContent = 'Withdraw';
    }
}

//show withdraw modal
function showWithdrawModal(trackingNumber) {
    const modalHTML = `
        <div id="withdrawModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Confirm Withdrawal</h2>
                </div>
                <div class="modal-body">
                    <p>Are you sure you want to withdraw ${trackingNumber}?</p>
                </div>
                <div class="modal-footer">
                    <button id="cancelWithdraw" class="btn-cancel">Cancel</button>
                    <button id="confirmBtn" class="btn-confirm">Confirm</button>
                </div>
            </div>
        </div>
    `

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const modal = document.getElementById("withdrawModal");
    modal.classList.add("show");

    //event listeners
    document.getElementById("cancelWithdraw").onclick = () => {
        confirmWithdraw = false;
        modal.remove();
    };
    document.getElementById("confirmBtn").onclick = () => {
        confirmWithdraw = true;
        modal.remove();
    };

    const modalStyle = document.createElement('style');
    modalStyle.textContent = `
        .modal {
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(4px);
            animation: fadeIn 0.2s ease;
        }

        .modal.show {
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .modal-content {
            background-color: #fff;
            border-radius: 12px;
            width: 90%;
            max-width: 400px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
            animation: slideUp 0.3s ease;
        }

        .modal-header {
            padding: 24px 24px 16px;
            border-bottom: 1px solid #e5e7eb;
        }

        .modal-header h2 {
            margin: 0;
            font-size: 20px;
            font-weight: 600;
            color: #111827;
        }

        .modal-body {
            padding: 20px 24px;
        }

        .modal-body p {
            margin: 0;
            color: #6b7280;
            font-size: 15px;
            line-height: 1.5;
        }

        .modal-footer {
            padding: 16px 24px;
            display: flex;
            gap: 12px;
            justify-content: flex-end;
            border-top: 1px solid #e5e7eb;
        }

        .modal-footer button {
            padding: 10px 20px;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .btn-cancel {
            background-color: #f3f4f6;
            color: #374151;
        }

        .btn-cancel:hover {
            background-color: #e5e7eb;
        }

        .btn-confirm {
            background-color: #ef4444;
            color: white;
        }

        .btn-confirm:hover {
            background-color: #dc2626;
        }

        .btn-confirm:active {
            transform: scale(0.98);
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        @keyframes slideUp {
            from {
                transform: translateY(20px);
                opacity: 0;
            }
            to {
                transform: translateY(0);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(modalStyle);
}

//WITHDRAW COMPLETED MODAL
function showWithdrawCompleteModal(trackingNumber) {
    const modalHTML = `
        <div id="withdrawSuccessModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Withdrawal Successful</h2>
                </div>
                <div class="modal-body">
                    <p>Complaint ${trackingNumber} has been withdrawn and is now marked as Resolved.</p>
                </div>
                <div class="modal-footer">
                    <button id="closeForm" class="btn-cancel">Close</button>
                </div>
            </div>
        </div>
    `

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const modal = document.getElementById("withdrawSuccessModal");
    modal.classList.add("show");

    //event listener
    document.getElementById("closeForm").onclick = () => {
        modal.remove();
    };

    const modalStyle = document.createElement('style');
    modalStyle.textContent = `
        .modal {
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(4px);
            animation: fadeIn 0.2s ease;
        }

        .modal.show {
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .modal-content {
            background-color: #fff;
            border-radius: 12px;
            width: 90%;
            max-width: 400px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
            animation: slideUp 0.3s ease;
        }

        .modal-header {
            padding: 24px 24px 16px;
            border-bottom: 1px solid #e5e7eb;
        }

        .modal-header h2 {
            margin: 0;
            font-size: 20px;
            font-weight: 600;
            color: #111827;
        }

        .modal-body {
            padding: 20px 24px;
        }

        .modal-body p {
            margin: 0;
            color: #6b7280;
            font-size: 15px;
            line-height: 1.5;
        }

        .modal-footer {
            padding: 16px 24px;
            display: flex;
            gap: 12px;
            justify-content: flex-end;
            border-top: 1px solid #e5e7eb;
        }

        .modal-footer button {
            padding: 10px 20px;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .btn-cancel {
            background-color: #f3f4f6;
            color: #374151;
        }

        .btn-cancel:hover {
            background-color: #e5e7eb;
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        @keyframes slideUp {
            from {
                transform: translateY(20px);
                opacity: 0;
            }
            to {
                transform: translateY(0);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(modalStyle);
}


//FORMAT DATE TIME
function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}


//ADD DYNAMIC STYLES FOR STATUS BADGES AND BUTTONS
function addDynamicStyles() {
    if (document.getElementById('history-dynamic-styles')) return;

    const styleSheet = document.createElement('style');
    styleSheet.id = 'history-dynamic-styles';
    styleSheet.textContent = `
        .status-badge {
            display: inline-block;
            padding: 6px 14px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 600;
            text-align: center;
        }
        
        .status-pending {
            background-color: #fef3c7;
            color: #92400e;
        }
        
        .status-review {
            background-color: #dbeafe;
            color: #1e40af;
        }
        
        .status-mediation {
            background-color: #fce7f3;
            color: #9f1239;
        }
        
        .status-resolved {
            background-color: #dcfce7;
            color: #166534;
        }
        
        .status-closed {
            background-color: #f3f4f6;
            color: #4b5563;
        }
        
        .view-btn, .withdraw-btn {
            padding: 8px 16px;
            border: none;
            border-radius: 6px;
            font-weight: 600;
            font-size: 13px;
            cursor: pointer;
            transition: all 0.3s;
            margin: 2px;
        }
        
        .view-btn {
            background-color: #3b82f6;
            color: white;
        }
        
        .view-btn:hover {
            background-color: #2563eb;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
        }
        
        .withdraw-btn {
            background-color: #ef4444;
            color: white;
        }
        
        .withdraw-btn:hover {
            background-color: #dc2626;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
        }
        
        .historytable table {
            width: 100%;
            border-collapse: collapse;
        }
        
        .historytable th {
            background: linear-gradient(135deg, #3b82f6 0%, #10b981 100%);
            color: white;
            padding: 15px;
            text-align: left;
            font-weight: 600;
            font-size: 14px;
        }
        
        .historytable td {
            padding: 15px;
            border-bottom: 1px solid #e5e7eb;
            font-size: 14px;
        }
        
        .historytable tr:hover {
            background-color: #f9fafb;
        }
    `;
    
    document.head.appendChild(styleSheet);
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


console.log('📋 User history script loaded');