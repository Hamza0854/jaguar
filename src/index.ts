// src/index.ts

// --- Imports ---
import { auth, db } from './firebaseConfig'; // Your Firebase app instance and initialized services
import {
  GoogleAuthProvider,
  OAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  User, // Import User type for type safety
} from "firebase/auth";
import { 
  doc, 
  setDoc, 
  getDoc, 
  serverTimestamp, 
  Timestamp 
} from "firebase/firestore";

// --- Optional: Import styles if your build tool handles it ---
import './styles.css';

// --- Type Definitions ---
interface UserData {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  phone?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  country?: string;
  photoURL?: string;
  provider: string;
  status: string;
  role: string;
  createdAt: Timestamp | ReturnType<typeof serverTimestamp>;
  updatedAt: Timestamp | ReturnType<typeof serverTimestamp>;
}

// --- UI Element References ---
// Registration Form Elements
const authSection = document.getElementById('auth-section') as HTMLElement | null;
const successSection = document.getElementById('success-section') as HTMLElement | null;
const authMessage = document.getElementById('auth-message') as HTMLElement | null;
const registrationForm = document.getElementById('registration-form') as HTMLFormElement | null;

// Form Input Elements
const firstNameInput = document.getElementById('firstName') as HTMLInputElement | null;
const lastNameInput = document.getElementById('lastName') as HTMLInputElement | null;
const emailInput = document.getElementById('email') as HTMLInputElement | null;
const phoneInput = document.getElementById('phone') as HTMLInputElement | null;
const passwordInput = document.getElementById('password') as HTMLInputElement | null;
const confirmPasswordInput = document.getElementById('confirmPassword') as HTMLInputElement | null;
const cityInput = document.getElementById('city') as HTMLInputElement | null;
const stateInput = document.getElementById('state') as HTMLInputElement | null;
const zipcodeInput = document.getElementById('zipcode') as HTMLInputElement | null;
const countryInput = document.getElementById('country') as HTMLInputElement | null;
const termsCheckbox = document.getElementById('terms') as HTMLInputElement | null;

// Button Elements
const signupBtn = document.getElementById('signup-btn') as HTMLButtonElement | null;
const googleSignInBtn = document.getElementById('google-signin') as HTMLButtonElement | null;
const appleSignInBtn = document.getElementById('apple-signin') as HTMLButtonElement | null;

// Loading State Elements
const buttonText = document.getElementById('button-text') as HTMLSpanElement | null;
const loadingSpinner = document.getElementById('loading-spinner') as HTMLSpanElement | null;

// --- Helper Functions ---

// Show message to user
function showMessage(message: string, isError: boolean = false): void {
  if (!authMessage) return;
  
  authMessage.textContent = message;
  authMessage.className = isError ? 'alert alert-danger' : 'alert alert-success';
  authMessage.style.display = 'block';
  
  setTimeout(() => {
    authMessage.style.display = 'none';
  }, 5000);
}

// Set loading state
function setLoading(isLoading: boolean): void {
  if (!signupBtn || !buttonText || !loadingSpinner) return;
  
  signupBtn.disabled = isLoading;
  buttonText.style.display = isLoading ? 'none' : 'inline';
  loadingSpinner.style.display = isLoading ? 'inline' : 'none';
}

// Show success screen
function showSuccessScreen(): void {
  if (authSection) authSection.style.display = 'none';
  if (successSection) successSection.style.display = 'block';
  startAutoRedirect(3);
}

// Auto-redirect functionality
let redirectTimer: number | null = null;
let countdownInterval: number | null = null;

function startAutoRedirect(seconds: number = 3): void {
  const redirectNotice = document.getElementById('redirect-notice');
  const countdownSpan = document.getElementById('countdown');
  
  if (!redirectNotice || !countdownSpan) return;
  
  let timeLeft = seconds;
  countdownSpan.textContent = timeLeft.toString();
  
  countdownInterval = window.setInterval(() => {
    timeLeft--;
    countdownSpan.textContent = timeLeft.toString();
    
    if (timeLeft <= 0) {
      if (countdownInterval) clearInterval(countdownInterval);
      window.location.href = '/profile.html';
    }
  }, 1000);
  
  redirectTimer = window.setTimeout(() => {
    window.location.href = '/profile.html';
  }, seconds * 1000);
}

function cancelRedirect(): void {
  if (redirectTimer) clearTimeout(redirectTimer);
  if (countdownInterval) clearInterval(countdownInterval);
}

// --- Firestore Functions ---

// Save user data to Firestore
async function saveUserToFirestore(userId: string, userData: Partial<UserData>): Promise<void> {
  const userDocRef = doc(db, "users", userId);
  
  try {
    const docSnap = await getDoc(userDocRef);
    
    if (!docSnap.exists()) {
      // Create new user document
      await setDoc(userDocRef, {
        uid: userId,
        ...userData,
        role: userData.role || 'user',
        status: userData.status || 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log('User data saved to Firestore for:', userId);
    } else {
      // Update existing user document
      await setDoc(userDocRef, {
        ...userData,
        updatedAt: serverTimestamp()
      }, { merge: true });
      console.log('User data updated in Firestore for:', userId);
    }
  } catch (error) {
    console.error('Error saving user data to Firestore:', error);
    throw error;
  }
}

// --- Firebase Authentication Functions ---

// Handle redirect result when user returns from OAuth provider
async function handleRedirectResult(): Promise<void> {
  try {
    const result = await getRedirectResult(auth);
    
    if (result && result.user) {
      const user = result.user;
      console.log('Redirect sign-in successful:', user);
      
      // Determine provider
      let providerName = 'unknown';
      if (result.providerId === 'google.com') {
        providerName = 'google';
      } else if (result.providerId === 'apple.com') {
        providerName = 'apple';
      }
      
      // Extract name from user profile
      let firstName = '';
      let lastName = '';
      
      if (result.user.displayName) {
        const nameParts = result.user.displayName.split(' ');
        firstName = nameParts[0] || '';
        lastName = nameParts.slice(1).join(' ') || '';
      }
      
      const userData: Partial<UserData> = {
        uid: user.uid,
        email: user.email || '',
        firstName: firstName,
        lastName: lastName,
        displayName: user.displayName || `${firstName} ${lastName}`,
        photoURL: user.photoURL || '',
        provider: providerName,
        status: 'active',
        role: 'user'
      };
      
      // Save to Firestore
      await saveUserToFirestore(user.uid, userData);
      
      showMessage('Sign-in successful! Redirecting to your profile...');
      
      // Redirect to profile page
      setTimeout(() => {
        window.location.href = '/profile.html';
      }, 1000);
    }
  } catch (error: any) {
    if (error.code !== 'auth/no-redirect-result') {
      let errorMessage = 'Sign-in error: ';
      
      switch (error.code) {
        case 'auth/account-exists-with-different-credential':
          errorMessage += 'An account already exists with this email using a different sign-in method.';
          break;
        case 'auth/cancelled-popup-request':
        case 'auth/popup-closed-by-user':
          errorMessage += 'Sign-in cancelled.';
          break;
        default:
          errorMessage += error.message;
      }
      
      showMessage(errorMessage, true);
      console.error('Redirect result error:', error);
    }
  }
}

// Email/Password Registration
async function handleEmailRegister(event: Event): Promise<void> {
  event.preventDefault();
  
  const email = emailInput?.value.trim() || '';
  const password = passwordInput?.value || '';
  const confirmPassword = confirmPasswordInput?.value || '';
  const firstName = firstNameInput?.value.trim() || '';
  const lastName = lastNameInput?.value.trim() || '';
  const phone = phoneInput?.value.trim() || '';
  const city = cityInput?.value.trim() || '';
  const state = stateInput?.value.trim() || '';
  const zipcode = zipcodeInput?.value.trim() || '';
  const country = countryInput?.value.trim() || '';
  const terms = termsCheckbox?.checked || false;
  
  // Validation
  if (!email || !password || !firstName || !lastName || !phone || !city || !state || !zipcode || !country) {
    showMessage('Please fill in all required fields.', true);
    return;
  }
  
  if (password.length < 6) {
    showMessage('Password must be at least 6 characters long.', true);
    return;
  }
  
  if (password !== confirmPassword) {
    showMessage('Passwords do not match.', true);
    return;
  }
  
  if (!terms) {
    showMessage('Please agree to the terms and conditions.', true);
    return;
  }
  
  setLoading(true);
  
  try {
    // Create user with email and password
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    console.log('User registered successfully:', user.uid);
    
    // Prepare user data
    const userData: Partial<UserData> = {
      uid: user.uid,
      email: email,
      firstName: firstName,
      lastName: lastName,
      displayName: `${firstName} ${lastName}`,
      phone: phone,
      city: city,
      state: state,
      zipcode: zipcode,
      country: country,
      provider: 'email',
      status: 'active',
      role: 'user'
    };
    
    // Save to Firestore
    await saveUserToFirestore(user.uid, userData);
    
    showMessage('Registration successful! Redirecting...');
    showSuccessScreen();
    
  } catch (error: any) {
    let errorMessage = 'Registration failed: ';
    
    switch (error.code) {
      case 'auth/email-already-in-use':
        errorMessage += 'This email is already registered.';
        break;
      case 'auth/invalid-email':
        errorMessage += 'Invalid email address.';
        break;
      case 'auth/weak-password':
        errorMessage += 'Password is too weak.';
        break;
      default:
        errorMessage += error.message;
    }
    
    showMessage(errorMessage, true);
    console.error('Registration error:', error);
  } finally {
    setLoading(false);
  }
}

// Google Sign-In with Redirect
const googleProvider = new GoogleAuthProvider();

async function initiateGoogleSignIn(): Promise<void> {
  try {
    googleProvider.addScope('profile');
    googleProvider.addScope('email');
    googleProvider.setCustomParameters({
      prompt: 'select_account'
    });
    
    await signInWithRedirect(auth, googleProvider);
  } catch (error: any) {
    let errorMessage = 'Google Sign-In failed: ';
    
    switch (error.code) {
      case 'auth/operation-not-allowed':
        errorMessage += 'Google Sign-In is not enabled.';
        break;
      case 'auth/unauthorized-domain':
        errorMessage += 'This domain is not authorized for sign-in.';
        break;
      default:
        errorMessage += error.message;
    }
    
    showMessage(errorMessage, true);
    console.error('Google sign-in redirect error:', error);
  }
}

// Apple Sign-In with Redirect
const appleProvider = new OAuthProvider('apple.com');

async function initiateAppleSignIn(): Promise<void> {
  try {
    appleProvider.addScope('email');
    appleProvider.addScope('name');
    
    await signInWithRedirect(auth, appleProvider);
  } catch (error: any) {
    let errorMessage = 'Apple Sign-In failed: ';
    
    switch (error.code) {
      case 'auth/operation-not-allowed':
        errorMessage += 'Apple Sign-In is not enabled.';
        break;
      case 'auth/unauthorized-domain':
        errorMessage += 'This domain is not authorized for sign-in.';
        break;
      default:
        errorMessage += error.message;
    }
    
    showMessage(errorMessage, true);
    console.error('Apple sign-in redirect error:', error);
  }
}

// Password Toggle Functionality
function setupPasswordToggles(): void {
  document.querySelectorAll('.password-toggle').forEach(btn => {
    btn.addEventListener('click', function(this: HTMLButtonElement) {
      const targetId = this.getAttribute('data-target');
      if (!targetId) return;
      
      const input = document.getElementById(targetId) as HTMLInputElement;
      const icon = this.querySelector('i');
      
      if (!input || !icon) return;
      
      if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
      } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
      }
    });
  });
}

// Enter Key Submission
function setupEnterKeySubmission(): void {
  document.addEventListener('keypress', (e: KeyboardEvent) => {
    if (e.key === 'Enter' && e.target instanceof HTMLInputElement && e.target.classList.contains('form-control')) {
      e.preventDefault();
      signupBtn?.click();
    }
  });
}

// --- Main Application Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  console.log('JaguarWebSolutions Registration: DOM Content Loaded.');
  
  // 1. IMPORTANT: Handle any pending redirect results FIRST on every page load
  handleRedirectResult();
  
  // 2. Set up event listeners
  if (signupBtn) {
    signupBtn.addEventListener('click', handleEmailRegister);
  }
  
  if (googleSignInBtn) {
    googleSignInBtn.addEventListener('click', (e) => {
      e.preventDefault();
      initiateGoogleSignIn();
    });
  }
  
  if (appleSignInBtn) {
    appleSignInBtn.addEventListener('click', (e) => {
      e.preventDefault();
      initiateAppleSignIn();
    });
  }
  
  const cancelRedirectBtn = document.getElementById('cancel-redirect');
  if (cancelRedirectBtn) {
    cancelRedirectBtn.addEventListener('click', cancelRedirect);
  }
  
  // 3. Setup password toggles
  setupPasswordToggles();
  
  // 4. Setup enter key submission
  setupEnterKeySubmission();
  
  // 5. Auto-focus on first input
  firstNameInput?.focus();
  
  // 6. Listen for authentication state changes
  onAuthStateChanged(auth, (user: User | null) => {
    console.log('Auth state changed. User:', user ? user.uid : 'None');
    
    if (user && window.location.pathname === '/profile.html') {
      // User is already authenticated and on profile page
      console.log('User already authenticated on profile page');
    }
  });
  
  console.log('JaguarWebSolutions Registration Initialization Complete!');
});
