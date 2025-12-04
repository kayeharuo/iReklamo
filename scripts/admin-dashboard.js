document.addEventListener('DOMContentLoaded', async () => {
    setupDropdowns();
    await loadDashboardData();
    setupStatusCardHandlers();
});

let recordsModalEscHandler = null;
let detailsModalEscHandler = null;

//Setup dropdown menus
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

//Load all dashboard data
async function loadDashboardData() {
    try {
        console.log('Loading dashboard data...');
        
        //Load status counts
        await loadStatusCounts();
        
        //Load charts
        await loadComplaintsChart();
        await loadIncidentsChart();
        
        console.log('Dashboard loaded successfully');
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
        alert('Error loading dashboard data: ' + error.message);
    }
}

//Load status counts from database
async function loadStatusCounts() {
    try {
        const { data: allRecords, error } = await supabaseClient
            .from('vito_complaint_incident')
            .select(`
                vci_id,
                vito_ci_stat (vcistat_current_stat)
            `);

        if (error) throw error;

        const counts = {
            pending: 0,
            underReview: 0,
            forMediation: 0,
            resolved: 0
        };

        allRecords.forEach(record => {
            const status = record.vito_ci_stat?.[0]?.vcistat_current_stat;
            
            if (status === 'Pending') counts.pending++;
            else if (status === 'Under Review') counts.underReview++;
            else if (status === 'For Mediation') counts.forMediation++;
            else if (status === 'Resolved/Closed') counts.resolved++;
        });

        document.getElementById('pendingcount').textContent = counts.pending;
        document.getElementById('underreview').textContent = counts.underReview;
        document.getElementById('formediation').textContent = counts.forMediation;
        document.getElementById('resolved').textContent = counts.resolved;

        console.log('Status counts loaded:', counts);

    } catch (error) {
        console.error('Error loading status counts:', error);
    }
}

//Load complaints chart - COMPLETE FIXED VERSION
async function loadComplaintsChart() {
    try {
        const { data: complaints, error } = await supabaseClient
            .from('vito_complaint_incident')
            .select('vci_category')
            .eq('vci_type', 'Complaint');

        if (error) throw error;

        const categoryCounts = {
            'Noise Disturbance': 0,
            'Domestic or Neighbor Dispute': 0,
            'Barangay Staff Misconduct': 0,
            'Service Delay or Negligence': 0,
            'Garbage or Sanitation Issue': 0,
            'Public Misconduct': 0,
            'Peace and Order Concern': 0,
            'Others': 0
        };

        complaints.forEach(c => {
            if (categoryCounts.hasOwnProperty(c.vci_category)) {
                categoryCounts[c.vci_category]++;
            }
        });

        const maxValue = Math.max(...Object.values(categoryCounts), 5);
        const yAxisMax = Math.ceil(maxValue / 5) * 5;

        const ctx = document.getElementById('complaintschart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(categoryCounts),
                datasets: [{
                    data: Object.values(categoryCounts),
                    backgroundColor: [
                        'rgb(255, 0, 0)',
                        'rgb(0, 0, 255)',
                        'rgb(255, 215, 0)',
                        'rgb(255, 165, 0)',
                        'rgb(31, 118, 34)',
                        'rgba(102, 0, 102, 1)',
                        'rgba(255, 0, 111, 1)',
                        'rgb(128, 128, 128)'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { 
                        display: false 
                    },
                    tooltip: {
                        enabled: true
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: yAxisMax,
                        ticks: {
                            stepSize: 5,
                            display: true,  
                            color: '#333',  
                            font: {
                                size: 12,
                                weight: '500'
                            },
                            padding: 10
                        },
                        grid: { 
                            color: '#e0e0e0',
                            display: true,
                            drawBorder: true,
                            drawOnChartArea: true,
                            drawTicks: true
                        },
                        display: true  
                    },
                    x: {
                        ticks: {
                            display: true,
                            color: '#333',
                            font: {
                                size: 11
                            }
                        },
                        grid: { 
                            display: false 
                        },
                        display: true
                    }
                }
            }
        });

        console.log('Complaints chart loaded');

    } catch (error) {
        console.error('Error loading complaints chart:', error);
    }
}

//Load incidents chart 
async function loadIncidentsChart() {
    try {
        const { data: incidents, error } = await supabaseClient
            .from('vito_complaint_incident')
            .select('vci_category')
            .eq('vci_type', 'Incident');

        if (error) throw error;

        const categoryCounts = {
            'Drainage or Flooding': 0,
            'Broken Roads or Streetlights': 0,
            'Fire Incident': 0,
            'Vehicular Incident': 0,
            'Natural Disaster or Calamity': 0,
            'Others': 0
        };

        incidents.forEach(i => {
            if (categoryCounts.hasOwnProperty(i.vci_category)) {
                categoryCounts[i.vci_category]++;
            }
        });

        const maxValue = Math.max(...Object.values(categoryCounts), 5);
        const yAxisMax = Math.ceil(maxValue / 5) * 5;

        const itx = document.getElementById('incidentschart').getContext('2d');
        new Chart(itx, {
            type: 'bar',
            data: {
                labels: Object.keys(categoryCounts),
                datasets: [{
                    data: Object.values(categoryCounts),
                    backgroundColor: [
                        'rgb(255, 0, 0)',
                        'rgb(0, 0, 255)',
                        'rgb(255, 215, 0)',
                        'rgb(255, 165, 0)',
                        'rgb(31, 118, 34)',
                        'rgb(128, 128, 128)'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { 
                        display: false 
                    },
                    tooltip: {
                        enabled: true
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: yAxisMax,
                        ticks: {
                            stepSize: 5,
                            display: true,  
                            color: '#333',  
                            font: {
                                size: 12,
                                weight: '500'
                            },
                            padding: 10
                        },
                        grid: { 
                            color: '#e0e0e0',
                            display: true,
                            drawBorder: true,
                            drawOnChartArea: true,
                            drawTicks: true
                        },
                        display: true  
                    },
                    x: {
                        ticks: {
                            display: true,
                            color: '#333',
                            font: {
                                size: 11
                            }
                        },
                        grid: { 
                            display: false 
                        },
                        display: true
                    }
                }
            }
        });

        console.log('Incidents chart loaded');

    } catch (error) {
        console.error('Error loading incidents chart:', error);
    }
}

//Setup status card click handlers
function setupStatusCardHandlers() {
    const statusCards = [
        { className: 'minicard1', status: 'Pending', title: 'PENDING COMPLAINTS OR REPORTS' },
        { className: 'minicard2', status: 'Under Review', title: 'UNDER REVIEW' },
        { className: 'minicard3', status: 'For Mediation', title: 'FOR MEDIATION' },
        { className: 'minicard4', status: 'Resolved/Closed', title: 'RESOLVED OR CLOSED CASES' }
    ];

    statusCards.forEach(cardInfo => {
        const card = document.querySelector(`.${cardInfo.className}`);
        if (card) {
            console.log('Setting up click handler for:', cardInfo.className);
            
            card.style.cursor = 'pointer';
            card.style.transition = 'transform 0.2s';
            
            card.addEventListener('mouseenter', function() {
                this.style.transform = 'scale(1.02)';
            });
            
            card.addEventListener('mouseleave', function() {
                this.style.transform = 'scale(1)';
            });
            
            card.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Card clicked:', cardInfo.status);
                showStatusModal(cardInfo.status, cardInfo.title);
            });
        } else {
            console.warn('Card not found:', cardInfo.className);
        }
    });
}

//Show modal with records for specific status
async function showStatusModal(status, title) {
    try {
        console.log('Loading records with status:', status);

        const { data: records, error } = await supabaseClient
            .from('vito_complaint_incident')
            .select(`
                *,
                vito_ci_stat!inner (vcistat_current_stat, vcistat_last_updated)
            `)
            .eq('vito_ci_stat.vcistat_current_stat', status)
            .order('created_at', { ascending: false });

        if (error) throw error;

        console.log('Found records:', records.length);

        displayRecordsModal(records, title);

    } catch (error) {
        console.error('Error loading records:', error);
        alert('Error loading records: ' + error.message);
    }
}

//Display records modal 
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
                <td>
                    <button class="view-record-btn" onclick="viewRecordDetails(${record.vci_id})">View</button>
                </td>
            </tr>
        `;
    }).join('') : `
        <tr>
            <td colspan="6" style="text-align: center; padding: 40px; color: #6b7280;">
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
                                <th>ACTION</th>
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
            
            .view-record-btn {
                padding: 8px 24px;
                border: 2px solid #ef4444;
                border-radius: 6px;
                background: #ef4444;
                color: white;
                font-weight: 500;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.3s;
            }
            
            .view-record-btn:hover {
                background: white;
                color: #ef4444;
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

//View record details
async function viewRecordDetails(vci_id) {
    if (recordsModalEscHandler) {
        document.removeEventListener('keydown', recordsModalEscHandler);
    }
    
    try {
        console.log('Viewing record with ID:', vci_id);

        const { data: record, error } = await supabaseClient
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

        showRecordDetailsModal(record);

    } catch (error) {
        console.error('Error loading record details:', error);
        alert('Error loading details: ' + error.message);
    }
}

//Show record details modal 
function showRecordDetailsModal(complaint) {
    const complainant = complaint.vito_ci_complainant?.[0];
    const respondent = complaint.vito_ci_respondent?.[0];
    const status = complaint.vito_ci_stat?.[0];
    const timeline = complaint.vito_ci_timeline || [];
    const files = complaint.vito_ci_files || [];

    timeline.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const modalHTML = `
        <div id="complaintModal" class="complaint-modal">
            <div class="complaint-modal-content">
                
                <div style="background: linear-gradient(135deg, #3b82f6 0%, #10b981 100%); padding: 30px; border-radius: 10px 10px 0 0; color: white; position: relative;">
                    <button class="modal-close-btn" onclick="event.stopPropagation(); closeDetailsModal();">×</button>
                    <h2 style="margin: 0 0 10px 0; font-size: 24px;">Report Details</h2>
                    <p style="margin: 0; opacity: 0.9; font-size: 14px;">Tracking #: <strong style="font-family: monospace; letter-spacing: 1px;">${complaint.vci_tracking}</strong></p>
                </div>

                <div style="padding: 30px; max-height: 70vh; overflow-y: auto;">

                    <div style="background: #f9fafb; border-left: 4px solid #3b82f6; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
                        <h3 style="margin: 0 0 15px 0; color: #1f2937; font-size: 18px;">Complainant Information</h3>
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

                    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
                        <h3 style="margin: 0 0 15px 0; color: #1f2937; font-size: 18px;">${complaint.vci_type} Details</h3>
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

                    <div style="background: white; border: 2px solid #e5e7eb; padding: 20px; border-radius: 6px;">
                        <h3 style="margin: 0 0 20px 0; color: #1f2937; font-size: 18px;">Timeline</h3>
                        <div class="timeline-container">
                            ${timeline.length > 0 ? timeline.map(item => `
                                <div class="timeline-item" style="display: flex; gap: 15px; margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #f3f4f6;">
                                    <div style="flex-shrink: 0; width: 10px; height: 10px; background: #3b82f6; border-radius: 50%; margin-top: 5px;"></div>
                                    <div style="flex: 1;">
                                        <p style="color: #6b7280; font-size: 12px; margin: 0 0 5px 0;">${formatDateTime(item.created_at)}</p>
                                        <p style="color: #1f2937; font-weight: 600; margin: 0 0 5px 0;">${item.vcitimeline_action}</p>
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
                            <h3 style="margin: 0 0 15px 0; color: #1f2937; font-size: 18px;">Attachments</h3>
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

                <div style="padding: 20px 30px; background: #f9fafb; border-top: 1px solid #e5e7eb; display: flex; justify-content: flex-end; gap: 10px; border-radius: 0 0 10px 10px;">
                    <button onclick="closeDetailsModal()" class="modal-close-button">Close</button>
                </div>

            </div>
        </div>
        
        <style>
            .complaint-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.6);
                z-index: 10000;
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
        </style>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    detailsModalEscHandler = (e) => {
        if (e.key === 'Escape') {
            e.stopPropagation();
            e.preventDefault();
            closeDetailsModal();
        }
    };
    document.addEventListener('keydown', detailsModalEscHandler);

}

//Close modals
function closeRecordsModal() {
    const modal = document.getElementById('recordsModal');
    if (modal) {
        modal.remove();
        document.removeEventListener('keydown', recordsModalEscHandler);
        console.log('Records modal closed');
    }
}

function closeDetailsModal() {
    const modal = document.getElementById('complaintModal');
    if (modal) {
        modal.remove();
        if (detailsModalEscHandler) {
            document.removeEventListener('keydown', detailsModalEscHandler);
            detailsModalEscHandler = null;
        }
        if (recordsModalEscHandler) {
            document.addEventListener('keydown', recordsModalEscHandler);
        }
    }
}

//Helper functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
    });
}

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

function getStatusColor(status) {
    const colorMap = {
        'Pending': '#f59e0b',
        'Under Review': '#3b82f6',
        'For Mediation': '#ec4899',
        'Resolved/Closed': '#10b981'
    };
    return colorMap[status] || '#6b7280';
}

console.log('Admin dashboard script loaded');