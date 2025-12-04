document.addEventListener('DOMContentLoaded', () => {
    setupDropdowns();
    loadResidents();
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


//LOAD RESIDENTS FROM SUPABASE


let data = [];
let currentPage = 1;
let entriesPerPage = 10;
let filteredData = [];

async function loadResidents() {
    try {
        console.log('Loading residents from Supabase...');

        //Query vito_user and join with vito_user_info
        const { data: residents, error } = await supabaseClient
            .from('vito_user')
            .select(`
                vu_id,
                vu_email_add,
                vu_phone_no,
                vu_acc_status,
                vito_user_info (
                    vui_fname,
                    vui_mname,
                    vui_lname,
                    vui_suffix,
                    vui_dob,
                    vui_gender,
                    vui_address
                )
            `)
            .eq('vu_acc_status', 'ACTIVE')
            .order('vu_id', { ascending: true });

        if (error) {
            console.error('Error loading residents:', error);
            alert('Error loading residents: ' + error.message);
            return;
        }

        console.log('Raw residents data:', residents);

        //Check if we got data
        if (!residents || residents.length === 0) {
            console.log('No residents found');
            data = [];
            filteredData = [];
            renderTable();
            return;
        }

        //Transform data for table display
        data = residents.map((resident, index) => {
            const userInfo = resident.vito_user_info?.[0] || {};
            
            //Calculate age from DOB
            const age = calculateAge(userInfo.vui_dob);
            
            //Build full name with suffix
            let fullName = `${userInfo.vui_fname || ''} ${userInfo.vui_mname || ''} ${userInfo.vui_lname || ''}`.trim();
            if (userInfo.vui_suffix) {
                fullName += ` ${userInfo.vui_suffix}`;
            }
            fullName = fullName.trim() || 'N/A';
            
            return {
                rowNumber: index + 1,
                id: resident.vu_id,
                name: fullName,
                age: age || 'N/A',
                gender: userInfo.vui_gender || 'N/A',
                address: userInfo.vui_address || 'N/A',
                contact: resident.vu_phone_no || 'N/A',
                email: resident.vu_email_add || 'N/A'
            };
        });

        filteredData = [...data];
        renderTable();

        console.log(`Successfully loaded ${data.length} residents`);

    } catch (error) {
        console.error('Error in loadResidents:', error);
        alert('Error loading residents: ' + error.message);
    }
}

//Calculate age from date of birth
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


//TABLE RENDERING
function renderTable() {
    const tbody = document.getElementById('tableBody');
    const start = (currentPage - 1) * entriesPerPage;
    const end = start + entriesPerPage;
    const pageData = filteredData.slice(start, end);

    tbody.innerHTML = '';
    
    //Always show rows equal to entriesPerPage
    for (let i = 0; i < entriesPerPage; i++) {
        const item = pageData[i];
        const rowNum = start + i + 1;
        
        const row = `
            <tr>
                <td>${item ? rowNum : ''}</td>
                <td>${item ? item.name : ''}</td>
                <td>${item ? item.age : ''}</td>
                <td>${item ? item.gender : ''}</td>
                <td>${item ? item.address : ''}</td>
                <td>${item ? item.contact : ''}</td>
                <td>${item ? item.email : ''}</td>
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

    if (totalPages === 0) {
        return;
    }

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

    //First page
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

    //Page numbers
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

    //Last page
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
        document.getElementById('showingInfo').textContent = `Showing 0 to 0 of 0 entries`;
    } else {
        const start = (currentPage - 1) * entriesPerPage + 1;
        const end = Math.min(currentPage * entriesPerPage, total);
        document.getElementById('showingInfo').textContent = `Showing ${start} to ${end} of ${total} entries`;
    }
}


//SEARCH AND FILTER
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

console.log('Manage residents script loaded');