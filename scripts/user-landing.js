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

    //password visibility toggle
    const passwordToggles = document.querySelectorAll('.toggle-password');
    passwordToggles.forEach(toggle => {
        toggle.addEventListener('click', function() {
            const input = this.previousElementSibling;
            if (input.type === 'password') {
                input.type = 'text';
                this.classList.remove('fa-eye-slash');
                this.classList.add('fa-eye');
            } else {
                input.type = 'password';
                this.classList.remove('fa-eye');
                this.classList.add('fa-eye-slash');
            }
        });
    });
});

//check for email confirmation or password reset on page load
window.addEventListener('DOMContentLoaded', async () => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = hashParams.get('type');
    const accessToken = hashParams.get('access_token');
    const error = hashParams.get('error');
    const errorCode = hashParams.get('error_code');
    const errorDescription = hashParams.get('error_description');

    if (error === 'access_denied' || errorCode === 'otp_expired') {
        window.history.replaceState(null, null, window.location.pathname);
        
        if (type === 'signup') {
            showExpiredConfirmationModal(); //Shows email input with resend option
        } else if (type === 'recovery') {
            showExpiredLinkModal('Your password reset link has expired. Please request a new one using the "Forgot Password" button.', 'Password Reset Link Expired');
        } else {
            showExpiredLinkModal(errorDescription || 'The link has expired or is invalid.');
        }
        return;
    }

    //Handle email confirmation callback
    if (type === 'signup' && accessToken) {
        console.log('Email confirmed! Showing success modal...');
        window.history.replaceState(null, null, window.location.pathname);
        showAccountCreatedModal();
        return;
    }

    //Handle password reset callback
    if (type === 'recovery' && accessToken) {
        console.log('Password recovery detected');
        
        try {
            const { data: { user }, error } = await supabaseClient.auth.getUser();
            
            if (error || !user) {
                console.error('Session error:', error);
                window.history.replaceState(null, null, window.location.pathname);
                showExpiredLinkModal('The password reset link has expired or is invalid.', 'Password Reset Link Expired');
                return;
            }
            
            window.history.replaceState(null, null, window.location.pathname);
            showPasswordResetModal();
            
        } catch (err) {
            console.error('Auth error:', err);
            window.history.replaceState(null, null, window.location.pathname);
            showExpiredLinkModal('Unable to verify your session. Please request a new password reset link.', 'Session Error');
        }
    }
});


//MODALS//
//account created successfully modal
function showAccountCreatedModal() {
    const modalHTML = `
        <div id="accountCreatedModal" class="modal" style="display: block;">
            <div class="modal-content" style="text-align: center; padding: 40px; max-width: 450px; margin: 100px auto; background: white; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
                <div style="font-size: 70px; color: #10b981; margin-bottom: 20px;">✓</div>
                <h2 style="color: #10b981; margin-bottom: 15px;">Account Created Successfully!</h2>
                <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                    Your email has been verified and your account is now active.<br>
                    You can now login to access the system.
                </p>
                <button id="proceedLoginBtn" style="background: #10b981; color: white; border: none; padding: 14px 50px; font-size: 16px; font-weight: bold; border-radius: 6px; cursor: pointer; transition: background 0.3s;">
                    PROCEED TO LOGIN
                </button>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modalStyle = document.createElement('style');
    modalStyle.textContent = `
        #accountCreatedModal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            z-index: 9999;
        }
        #proceedLoginBtn:hover {
            background: #059669 !important;
        }
    `;
    document.head.appendChild(modalStyle);

    document.getElementById('proceedLoginBtn').addEventListener('click', () => {
        document.getElementById('accountCreatedModal').remove();
        document.getElementById('email').focus();
    });
}

//Add this function after your other modal functions in user-landing.js

//Modal for expired email confirmation with resend option
function showExpiredConfirmationModal() {
    const modalHTML = `
        <div id="expiredConfirmModal" class="modal" style="display: block;">
            <div class="modal-content" style="text-align: center; padding: 40px; max-width: 500px; margin: 100px auto; background: white; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
                <div style="font-size: 70px; margin-bottom: 20px;">⏰</div>
                <h2 style="color: #f59e0b; margin-bottom: 15px;">Email Confirmation Link Expired</h2>
                <p style="color: #666; font-size: 16px; margin-bottom: 25px; line-height: 1.6;">
                    Your email confirmation link has expired for security reasons.
                </p>
                <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 25px; text-align: left;">
                    <p style="color: #92400e; font-size: 14px; margin: 0; line-height: 1.6;">
                        <strong>📌 Don't worry!</strong><br>
                        Enter your email below and we'll send you a new confirmation link.
                    </p>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <input 
                        type="email" 
                        id="resendConfirmEmail" 
                        placeholder="Enter your email address"
                        style="width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; box-sizing: border-box;"
                    >
                </div>
                
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button id="resendConfirmBtn" style="background: #3b82f6; color: white; border: none; padding: 14px 30px; font-size: 16px; font-weight: bold; border-radius: 6px; cursor: pointer; transition: background 0.3s;">
                        RESEND CONFIRMATION
                    </button>
                    <button id="closeExpiredConfirmBtn" style="background: #6b7280; color: white; border: none; padding: 14px 30px; font-size: 16px; font-weight: bold; border-radius: 6px; cursor: pointer;">
                        CLOSE
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modalStyle = document.createElement('style');
    modalStyle.textContent = `
        #expiredConfirmModal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            z-index: 9999;
        }
        #resendConfirmBtn:hover {
            background: #2563eb !important;
        }
    `;
    document.head.appendChild(modalStyle);

    //Resend confirmation email
    document.getElementById('resendConfirmBtn').addEventListener('click', async () => {
        const email = document.getElementById('resendConfirmEmail').value.trim();
        const btn = document.getElementById('resendConfirmBtn');
        
        if (!email) {
            alert('Please enter your email address');
            return;
        }
        
        if (!isValidEmail(email)) {
            alert('Please enter a valid email address');
            return;
        }

        btn.disabled = true;
        btn.textContent = 'SENDING...';

        try {
            const { error } = await supabaseClient.auth.resend({
                type: 'signup',
                email: email,
                options: {
                    emailRedirectTo: `${window.location.origin}/user/user-landing.html`
                }
            });

            if (error) throw error;

            document.getElementById('expiredConfirmModal').remove();
            showEmailSentModal(email);

        } catch (error) {
            console.error('Resend error:', error);
            
            let errorMsg = 'Error: ';
            if (error.message.includes('rate limit')) {
                errorMsg = '⏱️ Too many requests. Please wait a few minutes and try again.';
            } else if (error.message.includes('User not found')) {
                errorMsg = '📧 No account found with this email. Please register first.';
            } else {
                errorMsg += error.message;
            }
            
            alert(errorMsg);
            btn.disabled = false;
            btn.textContent = 'RESEND CONFIRMATION';
        }
    });

    document.getElementById('closeExpiredConfirmBtn').addEventListener('click', () => {
        document.getElementById('expiredConfirmModal').remove();
    });
}

//expired/invalid link modal
function showExpiredLinkModal(message = 'The link has expired or is invalid.', title = 'Link Expired or Invalid') {
    const modalHTML = `
        <div id="expiredLinkModal" class="modal" style="display: block;">
            <div class="modal-content" style="text-align: center; padding: 40px; max-width: 500px; margin: 100px auto; background: white; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
                <div style="font-size: 70px; margin-bottom: 20px;">⏰</div>
                <h2 style="color: #ef4444; margin-bottom: 15px;">${title}</h2>
                <p style="color: #666; font-size: 16px; margin-bottom: 25px; line-height: 1.6;">
                    ${message}
                </p>
                <button id="closeExpiredBtn" style="background: #3b82f6; color: white; border: none; padding: 14px 50px; font-size: 16px; font-weight: bold; border-radius: 6px; cursor: pointer;">
                    OK
                </button>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modalStyle = document.createElement('style');
    modalStyle.textContent = `
        #expiredLinkModal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            z-index: 9999;
        }
    `;
    document.head.appendChild(modalStyle);

    document.getElementById('closeExpiredBtn').addEventListener('click', () => {
        document.getElementById('expiredLinkModal').remove();
    });
}

//password reset modal (shows automatically when clicking email link)
function showPasswordResetModal() {
    const modalHTML = `
        <div id="resetPasswordModal" class="modal" style="display: block;">
            <div class="modal-content" style="max-width: 450px; margin: 100px auto; background: white; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); padding: 30px;">
                <h2 style="color: #1f2937; margin-bottom: 20px; text-align: center;">Reset Your Password</h2>
                
                <div class="form-group" style="margin-bottom: 15px;">
                    <label for="newPassword" style="display: block; margin-bottom: 5px; color: #374151; font-weight: 500;">New Password *</label>
                    <input type="password" id="newPassword" name="newPassword" placeholder="Enter new password" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; box-sizing: border-box;">
                </div>
                
                <div class="form-group" style="margin-bottom: 20px;">
                    <label for="confirmNewPassword" style="display: block; margin-bottom: 5px; color: #374151; font-weight: 500;">Confirm Password *</label>
                    <input type="password" id="confirmNewPassword" name="confirmNewPassword" placeholder="Confirm new password" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; box-sizing: border-box;">
                </div>

                <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 20px;">
                    <p style="color: #92400e; font-size: 13px; margin: 0; line-height: 1.6;">
                        <strong>Password must contain:</strong><br>
                        • At least 8 characters<br>
                        • One uppercase letter (A-Z)<br>
                        • One lowercase letter (a-z)<br>
                        • One number (0-9)<br>
                        • One special character (!@#$%^&*)
                    </p>
                </div>
                
                <button id="updatePassword" style="width: 100%; background: #10b981; color: white; border: none; padding: 12px; font-size: 16px; font-weight: bold; border-radius: 6px; cursor: pointer; transition: background 0.3s;">
                    UPDATE PASSWORD
                </button>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modalStyle = document.createElement('style');
    modalStyle.textContent = `
        #resetPasswordModal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            z-index: 9999;
        }
        #updatePassword:hover {
            background: #059669 !important;
        }
    `;
    document.head.appendChild(modalStyle);

    document.getElementById('updatePassword').addEventListener('click', async () => {
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmNewPassword').value;

        if (!newPassword || !confirmPassword) {
            alert('Please fill in both password fields');
            return;
        }

        if (newPassword !== confirmPassword) {
            alert('Passwords do not match');
            return;
        }

        const passwordValidation = validatePasswordStrength(newPassword);
        if (!passwordValidation.isValid) {
            alert('Password does not meet requirements:\n' + passwordValidation.errors.join('\n'));
            return;
        }

        try {
            const updateBtn = document.getElementById('updatePassword');
            updateBtn.disabled = true;
            updateBtn.textContent = 'UPDATING...';

            const { error } = await supabaseClient.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            document.getElementById('resetPasswordModal').remove();
            showPasswordResetSuccessModal();

        } catch (error) {
            console.error('Password update error:', error);
            
            //Handle session missing error properly
            if (error.message.includes('Auth session missing') || 
                error.message.includes('session_not_found') ||
                error.message.includes('JWT expired')) {
                document.getElementById('resetPasswordModal').remove();
                showExpiredLinkModal('Your session has expired. Please request a new password reset link.');
            } else {
                alert('Error updating password: ' + error.message);
                
                const updateBtn = document.getElementById('updatePassword');
                if (updateBtn) {
                    updateBtn.disabled = false;
                    updateBtn.textContent = 'UPDATE PASSWORD';
                }
            }
        }
    });
}

//email sent confirmation modal
function showEmailSentModal(email) {
    const modalHTML = `
        <div id="emailSentModal" class="modal" style="display: block;">
            <div class="modal-content" style="text-align: center; padding: 40px; max-width: 500px; margin: 100px auto; background: white; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
                <div style="font-size: 70px; margin-bottom: 20px;">📧</div>
                <h2 style="color: #3b82f6; margin-bottom: 15px;">Check Your Email</h2>
                <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 10px;">
                    We've sent a password reset link to:
                </p>
                <p style="color: #1e40af; font-weight: bold; font-size: 18px; margin-bottom: 25px;">
                    ${email}
                </p>
                <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 25px 0; text-align: left;">
                    <p style="color: #1e40af; font-size: 14px; margin: 0; line-height: 1.6;">
                        <strong>📌 Note:</strong> Please check your email inbox and spam folder. The link will expire in 60 minutes.
                    </p>
                </div>
                <button id="closeEmailSentBtn" style="background: #3b82f6; color: white; border: none; padding: 14px 50px; font-size: 16px; font-weight: bold; border-radius: 6px; cursor: pointer;">
                    OK
                </button>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modalStyle = document.createElement('style');
    modalStyle.textContent = `
        #emailSentModal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            z-index: 9999;
        }
        #closeEmailSentBtn:hover {
            background: #2563eb !important;
        }
    `;
    document.head.appendChild(modalStyle);

    document.getElementById('closeEmailSentBtn').addEventListener('click', () => {
        document.getElementById('emailSentModal').remove();
    });
}

//Password reset success modal
function showPasswordResetSuccessModal() {
    const modalHTML = `
        <div id="resetSuccessModal" class="modal" style="display: block;">
            <div class="modal-content" style="text-align: center; padding: 40px; max-width: 450px; margin: 100px auto; background: white; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
                <div style="font-size: 70px; color: #10b981; margin-bottom: 20px;">✓</div>
                <h2 style="color: #10b981; margin-bottom: 15px;">Password Reset Successful!</h2>
                <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                    Your password has been successfully updated.<br>
                    You can now login with your new password.
                </p>
                <button id="proceedToLoginBtn" style="background: #10b981; color: white; border: none; padding: 14px 50px; font-size: 16px; font-weight: bold; border-radius: 6px; cursor: pointer; transition: background 0.3s;">
                    PROCEED TO LOGIN
                </button>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modalStyle = document.createElement('style');
    modalStyle.textContent = `
        #resetSuccessModal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            z-index: 9999;
        }
        #proceedToLoginBtn:hover {
            background: #059669 !important;
        }
    `;
    document.head.appendChild(modalStyle);

    document.getElementById('proceedToLoginBtn').addEventListener('click', () => {
        document.getElementById('resetSuccessModal').remove();
        document.getElementById('email').focus();
    });
}

//helper function for login sucess modal
function showLoginSuccess() {
    const modal = document.getElementById('loginSuccessModal');
    if (modal) {
        modal.classList.add('show');
    }
}

//helper function for login error modal
function showLoginError(message) {
    const modal = document.getElementById('loginErrorModal');
    const messageElement = document.getElementById('loginErrorMessage');
    
    if (modal && messageElement) {
        messageElement.textContent = message;
        modal.classList.add('show');
    }
}

//MODAL CLOSE HANDLERS (login error)
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
    if (e.key === 'Escape' && loginErrorModal && loginErrorModal.classList.contains('show')) {
        loginErrorModal.classList.remove('show');
    }
});

//LOGIN HANDLER
const loginBtn = document.getElementById('login');
if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        if (!email || !password) {
            alert('Please enter both email and password');
            return;
        }

        try {
            loginBtn.disabled = true;
            loginBtn.textContent = 'LOADING';

            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) throw error;

            //get full user data with info
            const { data: userData, error: userError } = await supabaseClient
                .from('vito_user')
                .select(`
                    *,
                    vito_user_info (*)
                `)
                .eq('auth_user_id', data.user.id)
                .single();

            if (userError) throw userError;

            if (userData) {
                //store user data in sessionStorage
                sessionStorage.setItem('loggedInUser', JSON.stringify(userData));
                
                //update login tracking
                await supabaseClient
                    .from('vito_user')
                    .update({
                        vu_logged_in_attempt_time: new Date().toISOString(),
                        vu_logged_in_successful: true
                    })
                    .eq('vu_id', userData.vu_id);
            }

            showLoginSuccess();

            setTimeout(() => {
            // Only redirect if not already on dashboard
            if (window.location.pathname !== '/user/user-dashboard.html' && 
                !window.location.pathname.endsWith('/user/user-dashboard.html')) {
                window.location.replace('/user/user-dashboard.html');
            }
        }, 1500);

        } catch (error) {
            console.error('Login error:', error);
            
            if (error.message.includes('Email not confirmed')) {
                showLoginError('Please confirm your email before logging in. Check your inbox for the confirmation link.');
            } else if (error.message.includes('Invalid login credentials')) {
                showLoginError('Invalid email or password. Please try again.');
            } else {
                showLoginError('Login failed: ' + error.message);
            }
            
            loginBtn.disabled = false;
            loginBtn.textContent = 'LOGIN';
        }
    });
}


//FORGOT PASSWORD MODAL
const modal = document.getElementById('forgotPasswordModal');
const forgotPasswordLink = document.querySelector('.loginbutton a');
const closeBtn = document.querySelector('.close');
const cancelBtn = document.getElementById('cancelReset');
const sendResetBtn = document.getElementById('sendReset');
const resetEmailInput = document.getElementById('resetEmail');

forgotPasswordLink.addEventListener('click', (e) => {
    e.preventDefault();
    modal.style.display = 'block';
    resetEmailInput.focus();
});

function closeModal() {
    modal.style.display = 'none';
    resetEmailInput.value = '';
}

closeBtn.addEventListener('click', closeModal);
cancelBtn.addEventListener('click', closeModal);

window.addEventListener('click', (e) => {
    if (e.target === modal) {
        closeModal();
    }
});

sendResetBtn.addEventListener('click', async () => {
    const email = resetEmailInput.value.trim();
    
    if (!email) {
        alert('Please enter your email address');
        return;
    }
    
    if (!isValidEmail(email)) {
        alert('Please enter a valid email address');
        return;
    }

    try {
        sendResetBtn.disabled = true;
        sendResetBtn.textContent = 'Sending...';

        //check if email exists first
        const { data: users, error: checkError } = await supabaseClient
            .from('vito_user')
            .select('vu_email_add')
            .eq('vu_email_add', email);

        if (checkError) throw checkError;

        if (!users || users.length === 0) {
            await new Promise(resolve => setTimeout(resolve, 2500));
            
            //show success modal (even though email doesn't exist - security)
            closeModal();
            showEmailSentModal(email);
            return;
        }

        //send password reset email
        const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/user/user-landing.html`
        });

        if (error) throw error;

        //show success modal
        closeModal();
        showEmailSentModal(email);

    } catch (error) {
        console.error('Password reset error:', error);
        
        let errorMsg = 'Error: ';
        if (error.message.includes('email rate limit exceeded')) {
            errorMsg = '⏱️ Too many requests. Please wait 60 minutes before trying again.';
        } else {
            errorMsg += error.message;
        }
        
        alert(errorMsg);
    } finally {
        sendResetBtn.disabled = false;
        sendResetBtn.textContent = 'Send Reset Link';
    }
});

//HELPER FUNCTIONS
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePasswordStrength(password) {
    const errors = [];
    
    if (password.length < 8) {
        errors.push('• Must be at least 8 characters long');
    }
    if (!/[a-z]/.test(password)) {
        errors.push('• Must contain at least one lowercase letter');
    }
    if (!/[A-Z]/.test(password)) {
        errors.push('• Must contain at least one uppercase letter');
    }
    if (!/[0-9]/.test(password)) {
        errors.push('• Must contain at least one number');
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        errors.push('• Must contain at least one special character');
    }

    return {
        isValid: errors.length === 0,
        errors: errors
    };
}