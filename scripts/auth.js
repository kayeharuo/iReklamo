//this js file is intended for authentication with e-mail integration
//user Registration
async function handleSignUp(email, password, userData) {
  try {
    //create auth user
    const { data: authData, error: authError } = await supabaseClient.auth.signUp({
      email: email,
      password: password
    })
    
    if (authError) throw authError
    
    //create user record in vito_user table
    const { data: user, error: userError } = await supabaseClient
      .from('vito_user')
      .insert([{
        vu_email_add: email,
        vu_phone_no: userData.phone,
        auth_user_id: authData.user.id,
        vu_acc_status: 'ACTIVE'
      }])
      .select()
      .single()
    
    if (userError) throw userError
    
    //create user info
    const { error: infoError } = await supabaseClient
      .from('vito_user_info')
      .insert([{
        vui_fname: userData.firstName,
        vui_lname: userData.lastName,
        vui_gender: userData.gender,
        vui_address: userData.address,
        vu_id: user.vu_id
      }])
    
    if (infoError) throw infoError
    
    alert('Account created! Please check your email to confirm.')
    window.location.href = 'login.html'
    
  } catch (error) {
    console.error('Error:', error)
    alert('Error creating account: ' + error.message)
  }
}

//connect to your HTML form
document.getElementById('signupForm').addEventListener('submit', function(e) {
  e.preventDefault()
  
  const email = document.getElementById('email').value
  const password = document.getElementById('password').value
  const userData = {
    phone: document.getElementById('phone').value,
    firstName: document.getElementById('firstName').value,
    lastName: document.getElementById('lastName').value,
    gender: document.getElementById('gender').value,
    address: document.getElementById('address').value
  }
  
  handleSignUp(email, password, userData)
})