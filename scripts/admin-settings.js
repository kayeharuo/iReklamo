document.addEventListener('DOMContentLoaded', async () => {
    setupDropdowns();
    await loadAdminData();

    const accountModal = document.getElementById('editAccountModal');
    const accountEditBtn = document.getElementById('editacc');
    const accountCloseBtn = accountModal.querySelector('.close');
    const accountCancelBtn = accountModal.querySelector('.cancel-btn');
    const accountForm = document.getElementById('editAccountForm');

    accountEditBtn.addEventListener('click', async () => {
        await loadAccountModalData();
        accountModal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', accountModalEscHandler);
    });

    function closeAccountModal() {
        accountModal.style.display = 'none';
        document.body.style.overflow = 'auto';
        accountForm.reset();
        document.removeEventListener('keydown', accountModalEscHandler);
    }

    function accountModalEscHandler(e) {
        if (e.key === 'Escape') {
            closeAccountModal();
        }
    }

    accountCloseBtn.addEventListener('click', closeAccountModal);
    accountCancelBtn.addEventListener('click', closeAccountModal);

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

    accountForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveAccountChanges();
        closeAccountModal();
    });

    const personalModal = document.getElementById('editPersonalModal');
    const personalEditBtn = document.getElementById('editpersonal');
    const personalCloseBtn = personalModal.querySelector('.close');
    const personalCancelBtn = personalModal.querySelector('.cancel-btn');
    const personalForm = document.getElementById('editPersonalForm');

    personalEditBtn.addEventListener('click', async () => {
        await loadPersonalModalData();
        personalModal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', personalModalEscHandler);
    });

    function closePersonalModal() {
        personalModal.style.display = 'none';
        document.body.style.overflow = 'auto';
        personalForm.reset();
        document.removeEventListener('keydown', personalModalEscHandler);
    }

    function personalModalEscHandler(e) {
        if (e.key === 'Escape') {
            closePersonalModal();
        }
    }

    personalCloseBtn.addEventListener('click', closePersonalModal);
    personalCancelBtn.addEventListener('click', closePersonalModal);

    personalForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await savePersonalChanges();
        closePersonalModal();
    });

    window.addEventListener('click', (e) => {
        if (e.target === accountModal) {
            closeAccountModal();
        }
        if (e.target === personalModal) {
            closePersonalModal();
        }
    });
});

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

//Load admin data into main form fields
async function loadAdminData() {
    try {
        const admin = await getCurrentAdmin();
        
        if (!admin) {
            console.error('No admin data found!');
            return;
        }

        console.log('Loading admin data into fields:', admin);

        //Account Information
        const usernameField = document.getElementById('username');
        const contactField = document.getElementById('contact');
        const passwordField = document.getElementById('password');
        const positionField = document.getElementById('position');

        if (usernameField) usernameField.value = admin.email || '';
        if (contactField) contactField.value = admin.phone || '';
        if (passwordField) passwordField.value = '••••••••';
        if (positionField) positionField.value = admin.position || '';

        //Personal Information
        const fnameField = document.getElementById('fname');
        const lnameField = document.getElementById('lname');
        const mnameField = document.getElementById('mname');
        const suffixField = document.getElementById('suffix');
        const genderField = document.getElementById('gender');
        const dobField = document.getElementById('dob');
        const addressField = document.getElementById('address');

        if (fnameField) fnameField.value = admin.firstName || '';
        if (lnameField) lnameField.value = admin.lastName || '';
        if (mnameField) mnameField.value = admin.middleName || '';
        if (suffixField) suffixField.value = admin.suffix || '';
        if (genderField) genderField.value = admin.gender || '';
        if (dobField) dobField.value = admin.dob || '';
        if (addressField) addressField.value = admin.address || '';

        console.log('All fields populated!');

    } catch (error) {
        console.error('Error loading admin data:', error);
    }
}

//Load data into Account Edit Modal
async function loadAccountModalData() {
    const admin = await getCurrentAdmin();
    if (!admin) return;

    console.log('Loading modal with admin data:', admin);

    document.getElementById('editUsername').value = admin.email || '';
    document.getElementById('editContact').value = admin.phone || '';
    
    //Set the dropdown value
    const positionSelect = document.getElementById('editPosition');
    if (positionSelect && admin.position) {
        positionSelect.value = admin.position;
    }
    
    //Clear password field
    document.getElementById('editPassword').value = '';
}

//Load data into Personal Info Edit Modal
async function loadPersonalModalData() {
    const admin = await getCurrentAdmin();
    if (!admin) return;

    document.getElementById('editFirstName').value = admin.firstName || '';
    document.getElementById('editLastName').value = admin.lastName || '';
    document.getElementById('editMiddleName').value = admin.middleName || '';
    document.getElementById('editSuffix').value = admin.suffix || '';
    document.getElementById('editGender').value = admin.gender || '';
    document.getElementById('editDob').value = admin.dob || '';
    document.getElementById('editAddress').value = admin.address || '';
}

//Save Account Changes
async function saveAccountChanges() {
    const admin = await getCurrentAdmin();
    if (!admin) {
        alert('Error: Unable to get current admin data');
        return;
    }

    const newEmail = document.getElementById('editUsername').value.trim();
    const newPassword = document.getElementById('editPassword').value.trim();
    const newPhone = document.getElementById('editContact').value.trim();
    const newPosition = document.getElementById('editPosition').value;

    console.log('Saving account changes:', { newEmail, newPhone, newPosition, hasNewPassword: !!newPassword });

    try {
        //Update email in Supabase Auth if changed
        if (newEmail && newEmail !== admin.email) {
            console.log('Updating email in auth...');
            const { error: emailError } = await supabaseClient.auth.updateUser({
                email: newEmail
            });
            if (emailError) throw new Error('Failed to update email: ' + emailError.message);
        }

        //Update password in Supabase Auth if provided
        if (newPassword) {
            console.log('Updating password in auth...');
            const { error: passwordError } = await supabaseClient.auth.updateUser({
                password: newPassword
            });
            if (passwordError) throw new Error('Failed to update password: ' + passwordError.message);
        }

        //Update phone in vito_admin table
        console.log('Updating phone in vito_admin...');
        const { error: updateError } = await supabaseClient
            .from('vito_admin')
            .update({
                va_phone_no: newPhone,
                updated_at: new Date().toISOString()
            })
            .eq('va_id', admin.va_id);

        if (updateError) throw new Error('Failed to update phone: ' + updateError.message);

        //Update position in vito_admin_info table
        console.log('Updating position in vito_admin_info...');
        const { error: infoError } = await supabaseClient
            .from('vito_admin_info')
            .update({
                vai_barangay_position: newPosition,
                updated_at: new Date().toISOString()
            })
            .eq('va_id', admin.va_id);

        if (infoError) throw new Error('Failed to update position: ' + infoError.message);

        console.log('All updates successful!');

        //Refresh admin data from database and reload fields
        await refreshAdminData();
        await loadAdminData();

        alert('Account information updated successfully!');

    } catch (error) {
        console.error('Error updating account:', error);
        alert('Failed to update account information: ' + error.message);
        throw error; 
    }
}

//Save Personal Information Changes
async function savePersonalChanges() {
    const admin = await getCurrentAdmin();
    if (!admin) {
        alert('Error: Unable to get current admin data');
        return;
    }

    const firstName = document.getElementById('editFirstName').value.trim();
    const lastName = document.getElementById('editLastName').value.trim();
    const middleName = document.getElementById('editMiddleName').value.trim();
    const suffix = document.getElementById('editSuffix').value.trim();
    const gender = document.getElementById('editGender').value;
    const dob = document.getElementById('editDob').value;
    const address = document.getElementById('editAddress').value.trim();

    console.log('Saving personal changes:', { firstName, lastName, middleName, gender, dob, address });

    try {
        //Update in vito_admin_info table
        console.log('Updating vito_admin_info...');
        const { error } = await supabaseClient
            .from('vito_admin_info')
            .update({
                vai_fname: firstName,
                vai_lname: lastName,
                vai_mname: middleName,
                vai_suffix: suffix || null,
                vai_gender: gender,
                vai_dob: dob,
                vai_address: address,
                updated_at: new Date().toISOString()
            })
            .eq('va_id', admin.va_id);

        if (error) throw new Error('Failed to update personal info: ' + error.message);

        console.log('Personal info updated successfully!');

        //Refresh admin data from database and reload fields
        await refreshAdminData();
        await loadAdminData();

        alert('Personal information updated successfully!');

    } catch (error) {
        console.error('Error updating personal info:', error);
        alert('Failed to update personal information: ' + error.message);
        throw error; 
    }
}