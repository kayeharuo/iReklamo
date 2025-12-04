document.addEventListener('DOMContentLoaded', async () => {
    setupDropdowns();
    await loadComplaints();
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

let allComplaints = [];
let currentPage = 1;
let entriesPerPage = 10;
let filteredData = [];

async function loadComplaints() {
    try {
        console.log('Loading complaints...');

        const { data: complaints, error } = await supabaseClient
            .from('vito_complaint_incident')
            .select(`
                *,
                vito_ci_complainant (*),
                vito_ci_respondent (*),
                vito_ci_stat (*)
            `)
            .eq('vci_type', 'Complaint')
            .order('created_at', { ascending: false });

        if (error) throw error;

        allComplaints = complaints.map(c => {
            const complainant = c.vito_ci_complainant?.[0];
            const respondent = c.vito_ci_respondent?.[0];
            const stat = c.vito_ci_stat?.[0];

            return {
                vci_id: c.vci_id,
                ticketid: c.vci_ticket_id || 'N/A',
                datefiled: formatDate(stat?.vcistat_date_filed || c.created_at),
                category: c.vci_category,
                complainant: complainant ? `${complainant.vcicomplainant_fname} ${complainant.vcicomplainant_lname}` : 'N/A',
                respondent: respondent?.vcirespondent_name || 'N/A',
                status: stat?.vcistat_current_stat || 'Pending',
                lastupdated: formatDate(stat?.vcistat_last_updated || c.created_at)
            };
        });

        filteredData = [...allComplaints];
        renderTable();

        console.log('Loaded complaints:', allComplaints.length);

    } catch (error) {
        console.error('Error loading complaints:', error);
        alert('Error loading complaints: ' + error.message);
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
        const row = `
            <tr>
                <td>${item ? item.ticketid || '' : ''}</td>
                <td>${item ? item.datefiled || '' : ''}</td>
                <td>${item ? item.category || '' : ''}</td>
                <td>${item ? item.complainant || '' : ''}</td>
                <td>${item ? item.respondent || '' : ''}</td>
                <td>${item ? item.status || '' : ''}</td>
                <td>${item ? item.lastupdated || '' : ''}</td>
                <td>${item ? `<a href="/admin/admin-viewdetails-comp.html?id=${item.vci_id}" class="view-link">View Details</a>` : ''}</td>
            </tr>
        `;
        tbody.innerHTML += row;
    }

    updatePagination();
    updateShowingInfo();
}

function updatePagination() {
    const totalPages = Math.ceil(filteredData.length / entriesPerPage);
    const paginationDiv = document.getElementById('pagination');
    paginationDiv.innerHTML = '';

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
    filteredData = allComplaints.filter(item => {
        return Object.values(item).some(val => 
            String(val).toLowerCase().includes(searchTerm)
        );
    });
    currentPage = 1;
    renderTable();
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
    });
}

document.getElementById('searchInput').addEventListener('input', (e) => {
    filterData(e.target.value);
});

document.getElementById('entriesSelect').addEventListener('change', (e) => {
    entriesPerPage = parseInt(e.target.value);
    currentPage = 1;
    renderTable();
});