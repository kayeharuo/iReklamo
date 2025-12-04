//Global variable to cache admin data in memory 
let currentAdminData = null;

document.addEventListener('DOMContentLoaded', () => {
    initAdminSession();
    setupLogout();
});

async function initAdminSession() {
    const isLoggedIn = sessionStorage.getItem('isAdminLoggedIn');
    const adminId = sessionStorage.getItem('adminId');

    //Check if logged in
    if (!isLoggedIn || !adminId) {
        redirectToLogin();
        return;
    }

    //Verify with Supabase
    const { data: { user }, error } = await supabaseClient.auth.getUser();

    if (error || !user) {
        clearAdminSession();
        redirectToLogin();
        return;
    }

    //Fetch admin data from database
    const admin = await fetchAdminData(adminId);
    
    if (!admin) {
        clearAdminSession();
        redirectToLogin();
        return;
    }

    //Check if admin is active
    if (admin.status !== 'active') {
        alert('Your account is not active. Please contact the administrator.');
        clearAdminSession();
        redirectToLogin();
        return;
    }

    currentAdminData = admin;
    
    sessionStorage.setItem('adminPosition', admin.position);
    sessionStorage.setItem('adminName', buildFullName(admin));
    
    updateSidebarProfile(admin);
    
    console.log('Admin session initialized:', {
        id: admin.va_id,
        name: buildFullName(admin),
        position: admin.position,
        status: admin.status
    });
}

async function fetchAdminData(adminId) {
    try {
        const { data, error } = await supabaseClient
            .from('vito_admin')
            .select(`
                va_id,
                va_phone_no,
                va_status,
                auth_user_id,
                vito_admin_info (
                    vai_id,
                    vai_code,
                    vai_fname,
                    vai_lname,
                    vai_mname,
                    vai_suffix,
                    vai_gender,
                    vai_dob,
                    vai_address,
                    vai_barangay_position
                )
            `)
            .eq('va_id', adminId)
            .single();

        if (error) throw error;

        console.log('Raw data from Supabase:', data);

        //Get auth user email
        const { data: { user } } = await supabaseClient.auth.getUser();

        //Format the data
        const adminInfo = data.vito_admin_info && data.vito_admin_info.length > 0 
            ? data.vito_admin_info[0] 
            : {};

        console.log('Admin info extracted:', adminInfo);
        
        const formattedData = {
            va_id: data.va_id,
            email: user.email,
            phone: data.va_phone_no,
            status: data.va_status || 'active',
            code: adminInfo.vai_code || '',
            firstName: adminInfo.vai_fname || '',
            lastName: adminInfo.vai_lname || '',
            middleName: adminInfo.vai_mname || '',
            suffix: adminInfo.vai_suffix || '',
            gender: adminInfo.vai_gender || '',
            dob: adminInfo.vai_dob || '',
            address: adminInfo.vai_address || '',
            position: adminInfo.vai_barangay_position || ''
        };

        console.log('Formatted admin data:', formattedData);

        return formattedData;

    } catch (error) {
        console.error('Error fetching admin data:', error);
        return null;
    }
}

//Get current admin 
async function getCurrentAdmin() {
    if (currentAdminData) {
        return currentAdminData;
    }

    const adminId = sessionStorage.getItem('adminId');
    if (!adminId) return null;

    currentAdminData = await fetchAdminData(adminId);
    return currentAdminData;
}

async function refreshAdminData() {
    const adminId = sessionStorage.getItem('adminId');
    if (!adminId) return null;

    currentAdminData = await fetchAdminData(adminId);
    
    if (currentAdminData) {
        sessionStorage.setItem('adminPosition', currentAdminData.position);
        sessionStorage.setItem('adminName', buildFullName(currentAdminData));
        updateSidebarProfile(currentAdminData);
    }
    
    return currentAdminData;
}

function updateSidebarProfile(admin) {
    if (!admin) return;

    const profileName = document.querySelector('.profile h3');
    
    if (profileName) {
        const fullName = buildFullName(admin);
        profileName.textContent = fullName;
        
        //Center the text
        profileName.style.textAlign = 'center';
        profileName.style.wordWrap = 'break-word';
        profileName.style.hyphens = 'auto';
    }
}

function buildFullName(admin) {
    const parts = [];
    
    if (admin.firstName) parts.push(admin.firstName);
    if (admin.middleName) parts.push(admin.middleName);
    if (admin.lastName) parts.push(admin.lastName);
    if (admin.suffix) parts.push(admin.suffix);
    
    return parts.length > 0 ? parts.join(' ') : (admin.position || 'Admin');
}

function hasPermission(requiredPositions) {
    const adminPosition = sessionStorage.getItem('adminPosition');
    
    if (!adminPosition) {
        console.warn('No admin position found in session');
        return false;
    }
    
    if (Array.isArray(requiredPositions)) {
        return requiredPositions.includes(adminPosition);
    }
    
    return adminPosition === requiredPositions;
}

function getAdminPosition() {
    return sessionStorage.getItem('adminPosition');
}

function getAdminName() {
    return sessionStorage.getItem('adminName');
}

function setupLogout() {
    const logoutLink = document.getElementById('logoutLink');
    const logoutModal = document.getElementById('logoutModal');
    const cancelLogoutBtn = document.getElementById('cancelLogout');
    const confirmLogoutBtn = document.getElementById('confirmLogout');
    
    if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            if (logoutModal) {
                logoutModal.classList.add('show');
            }
        });
    }

    if (cancelLogoutBtn) {
        cancelLogoutBtn.addEventListener('click', () => {
            logoutModal.classList.remove('show');
        });
    }

    if (logoutModal) {
        logoutModal.addEventListener('click', (e) => {
            if (e.target === logoutModal) {
                logoutModal.classList.remove('show');
            }
        });
    }

    if (confirmLogoutBtn) {
        confirmLogoutBtn.addEventListener('click', async () => {
            await handleLogout();
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && logoutModal && logoutModal.classList.contains('show')) {
            logoutModal.classList.remove('show');
        }
    });
}

async function handleLogout() {
    try {
        //Update logout tracking
        const adminId = sessionStorage.getItem('adminId');
        if (adminId) {
            await supabaseClient
                .from('vito_admin')
                .update({
                    updated_at: new Date().toISOString()
                })
                .eq('va_id', adminId);
        }

        await supabaseClient.auth.signOut();
        clearAdminSession();
        window.location.href = '/admin/admin-landing.html';
    } catch (error) {
        console.error('Logout error:', error);
        alert('Error logging out. Please try again.');
    }
}

function clearAdminSession() {
    sessionStorage.removeItem('adminId');
    sessionStorage.removeItem('authUserId');
    sessionStorage.removeItem('isAdminLoggedIn');
    sessionStorage.removeItem('adminPosition');
    sessionStorage.removeItem('adminName');
    sessionStorage.removeItem('adminSession');
    sessionStorage.removeItem('userType');
    currentAdminData = null;
}

function redirectToLogin() {
    if (window.location.pathname !== '/admin/admin-landing.html' && 
        !window.location.pathname.endsWith('/admin/admin-landing.html')) {
        window.location.href = '/admin/admin-landing.html';
    }
}

console.log('Admin session manager loaded');
