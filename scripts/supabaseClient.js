const SUPABASE_URL = 'https://ausdrfxukmzzultwhdag.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1c2RyZnh1a216enVsdHdoZGFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1MDgxODksImV4cCI6MjA3ODA4NDE4OX0.PE3EKf_09zVOFP5cuolX2tGRKs5jOnCgH8qzdOViaHg'

//create Supabase client
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

console.log('Supabase connected!')

//function to check if user is logged in
async function checkAuth() {
  const { data: { user } } = await supabaseClient.auth.getUser()
  return user
}

//helper function to redirect if not logged in
async function requireAuth() {
  const user = await checkAuth()
  if (!user) {
    window.location.href = '/user/user-landing.html'
  }
  return user
}