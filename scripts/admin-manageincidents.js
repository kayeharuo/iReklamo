document.addEventListener('DOMContentLoaded', async () => {
    setupDropdowns();
    await loadIncidents();
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

let allIncidents = [];
let currentPage = 1;
let entriesPerPage = 10;
let filteredData = [];

async function loadIncidents() {
    try {
        console.log('Loading incidents...');

        const { data: incidents, error } = await supabaseClient
            .from('vito_complaint_incident')
            .select(`
                *,
                vito_ci_complainant (*),
                vito_ci_respondent (*),
                vito_ci_stat (*)
            `)
            .eq('vci_type', 'Incident')
            .order('created_at', { ascending: false });

        if (error) throw error;

        allIncidents = incidents.map(i => {
            const complainant = i.vito_ci_complainant?.[0];
            const respondent = i.vito_ci_respondent?.[0];
            const stat = i.vito_ci_stat?.[0];

            return {
                vci_id: i.vci_id,
                ticketid: i.vci_ticket_id || 'N/A',
                datefiled: formatDate(stat?.vcistat_date_filed || i.created_at),
                category: i.vci_category,
                complainant: complainant ? `${complainant.vcicomplainant_fname} ${complainant.vcicomplainant_lname}` : 'N/A',
                respondent: respondent?.vcirespondent_name || 'N/A',
                status: stat?.vcistat_current_stat || 'Pending',
                lastupdated: formatDate(stat?.vcistat_last_updated || i.created_at)
            };
        });

        filteredData = [...allIncidents];
        renderTable();

        console.log('Loaded incidents:', allIncidents.length);

    } catch (error) {
        console.error('Error loading incidents:', error);
        alert('Error loading incidents: ' + error.message);
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
                <td>${item ? `<a href="/admin/admin-viewdetails-inc.html?id=${item.vci_id}" class="view-link">View Details</a>` : ''}</td>
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
    filteredData = allIncidents.filter(item => {
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