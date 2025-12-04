
window.onload = function() {
    window.scrollTo(0, 0);
};
document.addEventListener("DOMContentLoaded", () => {
    const toggleButton = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');

    toggleButton.addEventListener('click', () => {
        navLinks.classList.toggle('active');
    });
});


const cards = document.querySelectorAll('.bottompart');
const nextBtns = document.querySelectorAll('#next');
const backBtns = document.querySelectorAll('#back');
const passwordToggles = document.querySelectorAll('.toggle-password');
let current = 0;

//temporary storage for form data
let formData = {
    credentials: {},
    personal: {}
};

//password visibility toggle
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

function showCard(index) {
    cards.forEach((bottompart, i) => {
        bottompart.classList.toggle('active', i === index);
    });
}

//remove error styling when user starts typing
document.querySelectorAll('input, select').forEach(input => {
    input.addEventListener('input', function() {
        this.classList.remove('error');
    });
});

//real-time email validation
const emailInput = document.getElementById('email');
const emailValidation = document.getElementById('email-validation');

if (emailInput && emailValidation) {
    emailInput.addEventListener('input', function() {
        const email = this.value.trim();
        
        if (email === '') {
            this.classList.remove('valid', 'invalid');
            emailValidation.textContent = '';
            emailValidation.className = 'validation-message';
            return;
        }
        
        if (validateEmail(email)) {
            this.classList.remove('invalid');
            this.classList.add('valid');
            emailValidation.textContent = '';
            emailValidation.className = 'validation-message success';
        } else {
            this.classList.remove('valid');
            this.classList.add('invalid');
            emailValidation.textContent = '';
            emailValidation.className = 'validation-message error';
        }
    });
}

//real-time password validation
const passwordInput = document.getElementById('password');
const reqLowercase = document.getElementById('req-lowercase');
const reqUppercase = document.getElementById('req-uppercase');
const reqNumber = document.getElementById('req-number');
const reqSpecial = document.getElementById('req-special');
const reqLength = document.getElementById('req-length');

if (passwordInput) {
    passwordInput.addEventListener('input', function() {
        const password = this.value;
        
        if (password === '') {
            this.classList.remove('valid', 'invalid');
            [reqLowercase, reqUppercase, reqNumber, reqSpecial, reqLength].forEach(req => {
                if (req) req.classList.remove('met', 'unmet');
            });
            return;
        }
        
        const requirements = {
            lowercase: /[a-z]/.test(password),
            uppercase: /[A-Z]/.test(password),
            number: /[0-9]/.test(password),
            special: /[~`!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
            length: password.length >= 8
        };
        
        //update requirement indicators
        if (reqLowercase) {
            reqLowercase.classList.toggle('met', requirements.lowercase);
            reqLowercase.classList.toggle('unmet', !requirements.lowercase);
        }
        if (reqUppercase) {
            reqUppercase.classList.toggle('met', requirements.uppercase);
            reqUppercase.classList.toggle('unmet', !requirements.uppercase);
        }
        if (reqNumber) {
            reqNumber.classList.toggle('met', requirements.number);
            reqNumber.classList.toggle('unmet', !requirements.number);
        }
        if (reqSpecial) {
            reqSpecial.classList.toggle('met', requirements.special);
            reqSpecial.classList.toggle('unmet', !requirements.special);
        }
        if (reqLength) {
            reqLength.classList.toggle('met', requirements.length);
            reqLength.classList.toggle('unmet', !requirements.length);
        }
        
        //update input border
        const allMet = Object.values(requirements).every(Boolean);
        if (allMet) {
            this.classList.remove('invalid');
            this.classList.add('valid');
        } else {
            this.classList.remove('valid');
            this.classList.add('invalid');
        }
        
        //trigger confirm password validation if it has a value
        const confirmpwInput = document.getElementById('confirmpw');
        if (confirmpwInput && confirmpwInput.value) {
            confirmpwInput.dispatchEvent(new Event('input'));
        }
    });
}

//real-time confirm password validation
const confirmpwInput = document.getElementById('confirmpw');
const confirmpwValidation = document.getElementById('confirmpw-validation');

if (confirmpwInput && confirmpwValidation) {
    confirmpwInput.addEventListener('input', function() {
        const confirmPassword = this.value;
        const password = document.getElementById('password').value;
        
        if (confirmPassword === '') {
            this.classList.remove('valid', 'invalid');
            confirmpwValidation.textContent = '';
            confirmpwValidation.className = 'validation-message';
            return;
        }
        
        if (confirmPassword === password) {
            this.classList.remove('invalid');
            this.classList.add('valid');
            confirmpwValidation.textContent = '✓ Passwords match';
            confirmpwValidation.className = 'validation-message success';
        } else {
            this.classList.remove('valid');
            this.classList.add('invalid');
            confirmpwValidation.textContent = '✗ Passwords do not match';
            confirmpwValidation.className = 'validation-message error';
        }
    });
}

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password) {
    const requirements = {
        minLength: password.length >= 8,
        hasLower: /[a-z]/.test(password),
        hasUpper: /[A-Z]/.test(password),
        hasNumber: /[0-9]/.test(password),
        hasSpecial: /[~`!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    };

    const failedRequirements = [];
    
    if (!requirements.minLength) failedRequirements.push("at least 8 characters");
    if (!requirements.hasLower) failedRequirements.push("one lowercase letter (a-z)");
    if (!requirements.hasUpper) failedRequirements.push("one uppercase letter (A-Z)");
    if (!requirements.hasNumber) failedRequirements.push("one number (0-9)");
    if (!requirements.hasSpecial) failedRequirements.push("one special character (~`!@#$%^&*()_+-=[]{}\\|;:'\",.<>/?)")

    return {
        isValid: Object.values(requirements).every(Boolean),
        failedRequirements
    };
}

function validatePhoneNumber(phone) {
    return /^09\d{9}$/.test(phone);
}

function showError(input) {
    input.classList.add('error');
    input.classList.add('shake');
    
    setTimeout(() => {
        input.classList.remove('shake');
    }, 500);
}

function validateInputs(card) {
    const inputs = card.querySelectorAll('input[required], select[required]');
    let isValid = true;

    inputs.forEach(input => {
        input.classList.remove('error');

        if (!input.value.trim()) {
            showError(input);
            isValid = false;
            return;
        }

        switch(input.id) {
            case 'email':
                if (!validateEmail(input.value)) {
                    showError(input);
                    isValid = false;
                }
                break;
            
            case 'password':
                const passwordValidation = validatePassword(input.value);
                if (!passwordValidation.isValid) {
                    showError(input);
                    isValid = false;
                }
                break;
            
            case 'confirmpw':
                const password = document.getElementById('password').value;
                if (input.value !== password) {
                    showError(input);
                    isValid = false;
                }
                break;
            
            case 'phonenum':
                if (!validatePhoneNumber(input.value)) {
                    showError(input);
                    isValid = false;
                }
                break;
        }
    });

    if (!isValid) {
        const firstError = card.querySelector('.error');
        if (firstError) {
            firstError.focus();
        }
    }

    return isValid;
}

//save credentials temporarily
function saveCredentials() {
    formData.credentials = {
        email: document.getElementById('email').value,
        password: document.getElementById('password').value,
        phoneNum: document.getElementById('phonenum').value
    };
    console.log('Credentials saved temporarily:', formData.credentials);
}

//save personal details temporarily
function savePersonalDetails() {
    formData.personal = {
        firstName: document.getElementById('fname').value,
        lastName: document.getElementById('lname').value,
        middleName: document.getElementById('mname').value,
        suffix: document.getElementById('suffix').value,
        dateOfBirth: document.getElementById('dob').value,
        gender: document.getElementById('gender').value,
        address: document.getElementById('address').value
    };
    console.log('Personal details saved temporarily:', formData.personal);
}

async function registerUser() {
    try {
        const doneBtn = document.querySelector('#done');
        doneBtn.disabled = true;
        doneBtn.textContent = 'CREATING';

        //create auth user with email confirmation
        const { data: authData, error: authError } = await supabaseClient.auth.signUp({
            email: formData.credentials.email,
            password: formData.credentials.password,
            options: {
                emailRedirectTo: `${window.location.origin}/user/user-landing.html`,
                data: {
                    firstName: formData.personal.firstName,
                    lastName: formData.personal.lastName,
                    middleName: formData.personal.middleName,
                    suffix: formData.personal.suffix || '',
                    dateOfBirth: formData.personal.dateOfBirth,
                    gender: formData.personal.gender,
                    address: formData.personal.address,
                    phoneNum: formData.credentials.phoneNum
                }
            }
        });

        if (authError) throw authError;

        //check if user already exists (Supabase returns success but with empty identities)
        if (authData.user && authData.user.identities && authData.user.identities.length === 0) {
            throw new Error('This email is already registered. Please login or use a different email.');
        }

        console.log('Auth user created:', authData);

        //show email confirmation modal
        showEmailConfirmationModal();

    } catch (error) {
        console.error('Registration error:', error);
        
        let errorMessage = 'Error creating account: ';
        
        if (error.message.includes('you can only request this after')) {
            errorMessage = '⏱️ Too many registration attempts.\n\nPlease wait 60 seconds and try again.';
        } else if (error.message.includes('already registered') || 
                   error.message.includes('User already registered')) {
            errorMessage = '📧 This email is already registered.\n\nPlease login or use a different email address.';
        } else if (error.message.includes('Invalid email')) {
            errorMessage = 'Invalid email address.\n\nPlease check and try again.';
        } else {
            errorMessage += error.message;
        }
        
        alert(errorMessage);
        
        const doneBtn = document.querySelector('#done');
        doneBtn.disabled = false;
        doneBtn.textContent = 'DONE';
    }
}
//show email confirmation modal
function showEmailConfirmationModal() {
    const modalHTML = `
        <div id="emailConfirmModal" class="modal" style="display: block;">
            <div class="modal-content" style="text-align: center; padding: 40px; max-width: 500px; margin: 100px auto; background: white; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
                <div style="font-size: 70px; margin-bottom: 20px;">📧</div>
                <h2 style="color: #3b82f6; margin-bottom: 15px;">Confirmation Email Sent!</h2>
                <p style="color: #666; font-size: 16px; margin-bottom: 10px;">
                    We've sent a confirmation email to:
                </p>
                <p style="color: #1e40af; font-weight: bold; font-size: 18px; margin-bottom: 25px;">
                    ${formData.credentials.email}
                </p>
                <p style="color: #666; font-size: 15px; line-height: 1.6; margin-bottom: 30px;">
                    Please check your inbox and click the confirmation link to successfully create your account.
                </p>
                <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 25px; text-align: left;">
                    <p style="color: #92400e; font-size: 13px; margin: 0;">
                        <strong>📌 Note:</strong> Check your spam/junk folder if you don't see the email within a few minutes.
                    </p>
                </div>
                <button id="okayBtn" style="background: #3b82f6; color: white; border: none; padding: 14px 50px; font-size: 16px; font-weight: bold; border-radius: 6px; cursor: pointer; transition: background 0.3s;">
                    OKAY
                </button>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    //Style for modal overlay
    const modalStyle = document.createElement('style');
    modalStyle.textContent = `
        #emailConfirmModal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            z-index: 9999;
        }
        #okayBtn:hover {
            background: #2563eb !important;
        }
    `;
    document.head.appendChild(modalStyle);

    document.getElementById('okayBtn').addEventListener('click', () => {
        window.location.href = '/user/user-landing.html';
    });
}

//show success modal
function showSuccessModal() {
    const modalHTML = `
        <div id="successModal" class="modal" style="display: block;">
            <div class="modal-content" style="text-align: center; padding: 30px; max-width: 400px; margin: 100px auto; background: white; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
                <div style="font-size: 60px; color: #10b981; margin-bottom: 20px;">✓</div>
                <h2 style="color: #10b981; margin-bottom: 10px;">Account Created Successfully!</h2>
                <p style="color: #666; margin-bottom: 30px;">Please check your email to verify your account before logging in.</p>
                <button id="okayBtn" style="background: #10b981; color: white; border: none; padding: 12px 40px; font-size: 16px; font-weight: bold; border-radius: 6px; cursor: pointer;">OKAY</button>
            </div>
        </div>
    `;

    //add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    //add click handler
    document.getElementById('okayBtn').addEventListener('click', () => {
        window.location.href = '/user/user-landing.html';
    });
}

//next button handler
nextBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
        const currentCard = cards[current];
        const isValid = validateInputs(currentCard);

        if (!isValid) return;

        if (current === 0) {
            const emailInput = document.getElementById('email');
            const email = emailInput.value.trim();

            btn.disabled = true;
            btn.textContent = 'CHECKING';

            try {
                const { data, error } = await supabaseClient.rpc('check_email_availability', {
                    email_to_check: email
                });

                if (error) {
                    console.error('Error:', error);
                    alert('Error checking email. Please try again.');
                    btn.disabled = false;
                    btn.textContent = 'NEXT';
                    return;
                }

                if (!data.available) {
                    emailInput.style.borderColor = '#ef4444';

                    if (data.reason === 'pending_confirmation') {
                        const hoursLeft = Math.ceil(data.hours_remaining);
                        showPendingConfirmationModal(email, hoursLeft);
                    } else {
                        alert('This email is already registered.\n\nPlease login or use a different email.');
                    }

                    document.getElementById('email').value = '';
                    document.getElementById('password').value = '';
                    document.getElementById('confirmpw').value = '';
                    document.getElementById('phonenum').value = '';
                    
                    document.getElementById('email').style.borderColor = '';
                    document.getElementById('password').style.borderColor = '';
                    document.getElementById('confirmpw').style.borderColor = '';
                    document.getElementById('phonenum').style.borderColor = '';

                    emailInput.focus();
                    btn.disabled = false;
                    btn.textContent = 'NEXT';
                    return;
                }

                if (data.was_expired) {
                    console.log('🗑️ Expired account deleted');
                }

                emailInput.style.borderColor = '#10b981';
                saveCredentials();
                current++;
                showCard(current);
                window.scrollTo(0, 0);

            } catch (error) {
                console.error('Error:', error);
                alert('Unexpected error.');
            } finally {
                btn.disabled = false;
                btn.textContent = 'NEXT';
            }

        } else {
            if (current === 1) {
                savePersonalDetails();
            }

            if (current < cards.length - 1) {
                current++;
                showCard(current);
                window.scrollTo(0, 0);
            }
        }
    });
});

// Show modal for pending confirmation with resend that invalidates old link
function showPendingConfirmationModal(email, hoursRemaining) {
    const modalHTML = `
        <div id="pendingConfirmModal" class="modal" style="display: block;">
            <div class="modal-content" style="text-align: center; padding: 40px; max-width: 500px; margin: 50px auto; background: white; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
                <div style="font-size: 70px; margin-bottom: 20px;">⏳</div>
                <h2 style="color: #f59e0b; margin-bottom: 15px;">Account Pending Activation</h2>
                <p style="color: #666; font-size: 16px; margin-bottom: 10px;">
                    An account with this email exists but hasn't been activated.
                </p>
                <p style="color: #1e40af; font-weight: bold; font-size: 18px; margin-bottom: 25px;">
                    ${email}
                </p>
                <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 25px; text-align: left;">
                    <p style="color: #92400e; font-size: 14px; margin: 0; line-height: 1.6;">
                        <strong>📌 Please check your email</strong> (and spam folder) for the confirmation link.<br>
                        <span style="font-size: 13px; margin-top: 8px; display: block;">The link will expire for security. Click "Resend" to get a new one.</span>
                    </p>
                </div>
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button id="resendEmailBtn" style="background: #3b82f6; color: white; border: none; padding: 14px 30px; font-size: 16px; font-weight: bold; border-radius: 6px; cursor: pointer; transition: background 0.3s;">
                        RESEND EMAIL
                    </button>
                    <button id="closeModalBtn" style="background: #6b7280; color: white; border: none; padding: 14px 30px; font-size: 16px; font-weight: bold; border-radius: 6px; cursor: pointer;">
                        CLOSE
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modalStyle = document.createElement('style');
    modalStyle.textContent = `
        #pendingConfirmModal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            z-index: 9999;
            overflow-y: auto;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        #pendingConfirmModal .modal-content {
            margin: 20px auto !important;
        }
        #resendEmailBtn:hover {
            background: #2563eb !important;
        }
    `;
    document.head.appendChild(modalStyle);

    document.getElementById('resendEmailBtn').addEventListener('click', async () => {
        const btn = document.getElementById('resendEmailBtn');
        btn.disabled = true;
        btn.textContent = 'SENDING';

        try {
            // Resend with proper redirect URL - this invalidates the old token
            const { error } = await supabaseClient.auth.resend({
                type: 'signup',
                email: email,
                options: {
                    emailRedirectTo: `${window.location.origin}/user/user-landing.html`
                }
            });

            if (error) throw error;

            document.getElementById('pendingConfirmModal').remove();
            
            // Show success message
            showResendSuccessModal(email);

        } catch (error) {
            console.error('Resend error:', error);
            
            let errorMsg = 'Error: ';
            if (error.message.includes('email rate limit') || error.message.includes('rate limit')) {
                errorMsg = '⏱️ Too many requests. Please wait 60 seconds and try again.';
            } else if (error.message.includes('User not found')) {
                errorMsg = '📧 No account found. Please try registering again.';
            } else {
                errorMsg += error.message;
            }
            
            alert(errorMsg);
            btn.disabled = false;
            btn.textContent = 'RESEND EMAIL';
        }
    });

    document.getElementById('closeModalBtn').addEventListener('click', () => {
        document.getElementById('pendingConfirmModal').remove();
    });
}

// NEW: Show success modal after resend
function showResendSuccessModal(email) {
    const modalHTML = `
        <div id="resendSuccessModal" class="modal" style="display: block;">
            <div class="modal-content" style="text-align: center; padding: 40px; max-width: 500px; margin: 100px auto; background: white; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
                <div style="font-size: 70px; color: #10b981; margin-bottom: 20px;">✅</div>
                <h2 style="color: #10b981; margin-bottom: 15px;">New Confirmation Email Sent!</h2>
                <p style="color: #666; font-size: 16px; margin-bottom: 10px;">
                    We've sent a fresh confirmation link to:
                </p>
                <p style="color: #1e40af; font-weight: bold; font-size: 18px; margin-bottom: 25px;">
                    ${email}
                </p>
                <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin-bottom: 25px; text-align: left;">
                    <p style="color: #1e40af; font-size: 14px; margin: 0; line-height: 1.6;">
                        <strong>🔒 Important:</strong> The previous confirmation link has been invalidated for security.<br>
                        <span style="font-size: 13px; margin-top: 8px; display: block;">Please use only the new link from your latest email.</span>
                    </p>
                </div>
                <button id="okayResendBtn" style="background: #3b82f6; color: white; border: none; padding: 14px 50px; font-size: 16px; font-weight: bold; border-radius: 6px; cursor: pointer; transition: background 0.3s;">
                    OKAY
                </button>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modalStyle = document.createElement('style');
    modalStyle.textContent = `
        #resendSuccessModal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            z-index: 9999;
        }
        #okayResendBtn:hover {
            background: #2563eb !important;
        }
    `;
    document.head.appendChild(modalStyle);

    document.getElementById('okayResendBtn').addEventListener('click', () => {
        document.getElementById('resendSuccessModal').remove();
    });
}

//Back button handler
backBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        if (current > 0) {
            current--;
            showCard(current);
            window.scrollTo(0, 0);
        }
    });
});

//done button handler
const doneBtn = document.querySelector('#done');
if (doneBtn) {
    doneBtn.addEventListener('click', () => {
        const currentCard = cards[current];
        const oathCheckbox = document.getElementById('oath');

        //validate checkbox
        if (!oathCheckbox.checked) {
            alert('Please agree to the Consent Form to continue.');
            oathCheckbox.focus();
            return;
        }

        //register user
        registerUser();
    });
}

//consent form modal handler
const viewConsentFormLink = document.getElementById('viewConsentForm');
if (viewConsentFormLink) {
    viewConsentFormLink.addEventListener('click', () => {
        showConsentFormModal();
    });
}

//show consent form modal
function showConsentFormModal() {
    const modalHTML = `
        <div id="consentFormModal" class="modal" style="display: block;">
            <div class="modal-content" style="padding: 40px; max-width: 700px; margin: 50px auto; background: white; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); max-height: 80vh; overflow-y: auto;">
                <h2 style="color: #1e15b6; margin-bottom: 20px; text-align: center;">DATA PRIVACY CONSENT FORM</h2>
                <h3 style="color: #3f761f; margin-bottom: 15px; text-align: center;">Barangay Vito Complaint and Incident Reporting System</h3>
                
                <div style="color: #545454; font-size: 13pt; line-height: 1.8; text-align: justify;">
                    <p style="margin-bottom: 15px;">
                        In compliance with Republic Act No. 10173, otherwise known as the Data Privacy Act of 2012, 
                        and its implementing rules and regulations, this Consent Form is being provided to inform you 
                        how your personal information will be collected, used, stored, and protected by the 
                        <strong>Barangay Vito Complaint and Incident Reporting System</strong>.
                    </p>

                    <h4 style="color: #1e15b6; margin-top: 25px; margin-bottom: 10px;">Purpose of Data Collection</h4>
                    <p style="margin-bottom: 15px;">
                        The personal information you provide will be used solely for the following purposes:
                    </p>
                    <ul style="margin-left: 25px; margin-bottom: 15px;">
                        <li>Registration and account creation in the system</li>
                        <li>Processing and managing complaints and incident reports</li>
                        <li>Communication regarding your filed complaints or incidents</li>
                        <li>Statistical analysis and improvement of barangay services</li>
                        <li>Compliance with legal and regulatory requirements</li>
                    </ul>

                    <h4 style="color: #1e15b6; margin-top: 25px; margin-bottom: 10px;">Information to be Collected</h4>
                    <p style="margin-bottom: 15px;">
                        The system will collect the following personal information:
                    </p>
                    <ul style="margin-left: 25px; margin-bottom: 15px;">
                        <li>Email address and contact number</li>
                        <li>Full name (first name, middle name, last name, suffix)</li>
                        <li>Date of birth and gender</li>
                        <li>Complete current address</li>
                        <li>Details of complaints or incidents you report</li>
                    </ul>

                    <h4 style="color: #1e15b6; margin-top: 25px; margin-bottom: 10px;">Data Protection and Security</h4>
                    <p style="margin-bottom: 15px;">
                        Barangay Vito is committed to protecting your personal information. We implement appropriate 
                        technical and organizational measures to ensure the security of your data against unauthorized 
                        access, alteration, disclosure, or destruction.
                    </p>

                    <h4 style="color: #1e15b6; margin-top: 25px; margin-bottom: 10px;">Your Rights as a Data Subject</h4>
                    <p style="margin-bottom: 15px;">
                        Under the Data Privacy Act, you have the right to:
                    </p>
                    <ul style="margin-left: 25px; margin-bottom: 15px;">
                        <li>Be informed about the collection and processing of your personal data</li>
                        <li>Access your personal information held by the system</li>
                        <li>Correct inaccurate or outdated personal information</li>
                        <li>Object to the processing of your personal data</li>
                        <li>Request deletion of your personal information, subject to legal requirements</li>
                        <li>File a complaint with the National Privacy Commission</li>
                    </ul>

                    <h4 style="color: #1e15b6; margin-top: 25px; margin-bottom: 10px;">Consent</h4>
                    <p style="margin-bottom: 15px;">
                        By registering and using this system, you hereby consent to the collection, use, storage, 
                        and processing of your personal information as described in this form. You acknowledge that 
                        you have read and understood the terms stated herein.
                    </p>

                    <p style="margin-top: 25px; margin-bottom: 15px;">
                        For questions or concerns regarding data privacy, you may contact:
                    </p>
                    <p style="margin-left: 25px; margin-bottom: 5px;"><strong>Barangay Vito</strong></p>
                    <p style="margin-left: 25px; margin-bottom: 5px;">Contact No.: 0942-744-2287 / 402-0139</p>
                </div>

                <div style="text-align: center; margin-top: 30px;">
                    <button id="closeConsentBtn" style="background: #1e15b6; color: white; border: none; padding: 14px 50px; font-size: 16px; font-weight: bold; border-radius: 6px; cursor: pointer; transition: background 0.3s;">
                        I UNDERSTAND
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modalStyle = document.createElement('style');
    modalStyle.textContent = `
        #consentFormModal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            z-index: 9999;
            overflow-y: auto;
        }
        #closeConsentBtn:hover {
            background: #161175 !important;
        }
    `;
    document.head.appendChild(modalStyle);

    document.getElementById('closeConsentBtn').addEventListener('click', () => {
        document.getElementById('consentFormModal').remove();
    });
}