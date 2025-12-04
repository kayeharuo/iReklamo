//Admin Login Functionality
document.addEventListener('DOMContentLoaded', () => {
    console.log('Admin login script loaded')
    
    cleanupOldSessionData();

    // Password visibility toggle
    const passwordToggles = document.querySelectorAll('.toggle-password');
    passwordToggles.forEach(toggle => {
        toggle.addEventListener('click', function() {
            const passwordInput = this.previousElementSibling;
            
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                this.classList.remove('fa-eye-slash');
                this.classList.add('fa-eye');
            } else {
                passwordInput.type = 'password';
                this.classList.remove('fa-eye');
                this.classList.add('fa-eye-slash');
            }
        });
    });

    //helper function to show login error modal
    function showLoginError(message) {
        const modal = document.getElementById('loginErrorModal');
        const messageElement = document.getElementById('loginErrorMessage');
        
        if (modal && messageElement) {
            messageElement.textContent = message;
            modal.classList.add('show');
        }
    }

    function showLoginSuccess() {
        const modal = document.getElementById('loginSuccessModal');
        if (modal) {
            modal.classList.add('show');
        }
    }

    //modal close handlers
    const loginErrorModal = document.getElementById('loginErrorModal');
    const closeLoginErrorBtn = document.getElementById('closeLoginError');

    if (closeLoginErrorBtn) {
        closeLoginErrorBtn.addEventListener('click', () => {
            loginErrorModal.classList.remove('show');
        });
    }

    if (loginErrorModal) {
        loginErrorModal.addEventListener('click', (e) => {
            if (e.target === loginErrorModal) {
                loginErrorModal.classList.remove('show');
            }
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && loginErrorModal.classList.contains('show')) {
            loginErrorModal.classList.remove('show');
        }
    });
    
    const loginForm = document.getElementById('adminLoginForm')
    const usernameInput = document.getElementById('username')
    const passwordInput = document.getElementById('password')
    const loginButton = document.getElementById('login')

    const originalButtonText = 'LOGIN'

    if (!loginForm) {
        console.error('Login form not found!')
        return
    }

    checkIfAlreadyLoggedIn()

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault()
        await handleAdminLogin()
    })

    async function handleAdminLogin() {
        const email = usernameInput.value.trim()
        const password = passwordInput.value.trim()

        if (!email || !password) {
            alert('Please enter both email and password')
            return
        }

        if (typeof supabaseClient === 'undefined') {
            alert('Error: Supabase connection not available. Please refresh the page.')
            return
        }

        showLoading(true)

        try {
            console.log('Attempting login for:', email);

            //Authenticate with Supabase Auth
            const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password
            })

            if (authError) {
                console.error('Auth error:', authError);
                showLoginError('Invalid email or password');
                showLoading(false);
                return;
            }

            const authUserId = authData.user.id
            console.log('Auth successful, user ID:', authUserId)

            //Check if user exists in vito_admin table
            const { data: adminData, error: adminError } = await supabaseClient
                .from('vito_admin')
                .select(`
                    va_id, 
                    va_status,
                    va_email_add,
                    auth_user_id,
                    vito_admin_info (
                        vai_barangay_position,
                        vai_fname,
                        vai_lname,
                        vai_mname
                    )
                `)
                .eq('auth_user_id', authUserId)
                .single()

            console.log('Admin lookup result:', adminData);

            if (adminError || !adminData) {
                console.error('Admin lookup error:', adminError);
                await supabaseClient.auth.signOut()
                throw new Error('Access denied. This account is not registered as an admin.')
            }

            //Check if account is active
            if (adminData.va_status !== 'active') {
                console.error('Admin status is not active:', adminData.va_status);
                await supabaseClient.auth.signOut()
                throw new Error('Your account is not active. Please contact the administrator.')
            }

            console.log('Admin found:', {
                va_id: adminData.va_id,
                email: adminData.va_email_add,
                status: adminData.va_status
            });

            //Get admin info
            const adminInfo = adminData.vito_admin_info?.[0]
            
            if (!adminInfo) {
                console.error('Admin info not found!');
                await supabaseClient.auth.signOut()
                throw new Error('Admin profile is incomplete. Please contact the administrator.')
            }

            const position = adminInfo.vai_barangay_position || 'N/A'
            const fullName = `${adminInfo.vai_fname || ''} ${adminInfo.vai_mname || ''} ${adminInfo.vai_lname || ''}`.trim() || 'Admin'

            console.log('Admin details:', {
                name: fullName,
                position: position
            });

            //Update login tracking
            await supabaseClient
                .from('vito_admin')
                .update({
                    va_logged_in_attempt_time: new Date().toISOString(),
                    va_logged_in_successful: true,
                    updated_at: new Date().toISOString()
                })
                .eq('va_id', adminData.va_id)

            //Store admin session with position
            sessionStorage.setItem('adminId', adminData.va_id)
            sessionStorage.setItem('authUserId', authUserId)
            sessionStorage.setItem('isAdminLoggedIn', 'true')
            sessionStorage.setItem('adminPosition', position)
            sessionStorage.setItem('adminName', fullName)

            console.log('Session stored successfully:', { 
            adminId: adminData.va_id, 
            position: position,
            name: fullName,
            authUserId: authUserId
        })

        showLoginSuccess();

        setTimeout(() => {
            console.log('Redirecting to dashboard...');
            window.location.href = '/admin/admin-dashboard.html'
        }, 1500)

        } catch (error) {
            console.error('Login error:', error)
            showLoginError(error.message || 'Login failed. Please try again.')
            showLoading(false)
        }
    }

    async function checkIfAlreadyLoggedIn() {
        const isLoggedIn = sessionStorage.getItem('isAdminLoggedIn')
        const adminId = sessionStorage.getItem('adminId')

        console.log('Checking login status:', { isLoggedIn, adminId });

        if (isLoggedIn === 'true' && adminId) {
            console.log('Found existing session, verifying with Supabase...');
            
            const { data: { user }, error } = await supabaseClient.auth.getUser()
            
            if (user) {
                console.log('Valid session found, redirecting to dashboard...')
                window.location.href = '/admin/admin-dashboard.html'
            } else {
                console.log('Invalid session, clearing...')
                clearAdminSession()
            }
        } else {
            console.log('No existing session found')
        }
    }

    function showLoading(isLoading) {
        if (loginButton) {
            if (isLoading) {
                loginButton.textContent = 'LOGIN'
                loginButton.disabled = true
                loginButton.style.opacity = '0.7'
                loginButton.style.cursor = 'not-allowed'
            } else {
                loginButton.textContent = originalButtonText
                loginButton.disabled = false
                loginButton.style.opacity = '1'
                loginButton.style.cursor = 'pointer'
            }
        }
    }
})

function cleanupOldSessionData() {
    const oldSessionData = sessionStorage.getItem('adminSession');
    const oldUserType = sessionStorage.getItem('userType');
    
    if (oldSessionData || oldUserType) {
        console.log('Cleaning up old session data format...');
        sessionStorage.removeItem('adminSession');
        sessionStorage.removeItem('userType');
    }
}

function clearAdminSession() {
    sessionStorage.removeItem('adminId')
    sessionStorage.removeItem('authUserId')
    sessionStorage.removeItem('isAdminLoggedIn')
    sessionStorage.removeItem('adminPosition')
    sessionStorage.removeItem('adminName')
    sessionStorage.removeItem('adminSession')  
    sessionStorage.removeItem('userType')
    
    console.log('Admin session cleared');
}

console.log('Admin landing script loaded successfully');