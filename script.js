// Firebase Configuration - using compat SDK loaded in HTML (firebase-app-compat, auth-compat, database-compat)
// Make sure your HTML pages include the compat scripts before this script, e.g.:
// <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"></script>
// <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js"></script>
// <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-database-compat.js"></script>

const firebaseConfig = {
  apiKey: "AIzaSyB4dao5sUw36zh3ZuA30x5OhUvoRqXxv1A",
  authDomain: "busbooking-1b1f2.firebaseapp.com",
  databaseURL: "https://busbooking-1b1f2-default-rtdb.firebaseio.com",
  projectId: "busbooking-1b1f2",
  storageBucket: "busbooking-1b1f2.firebasestorage.app",
  messagingSenderId: "775450638927",
  appId: "1:775450638927:web:dfbf85f2a7f07cbcfb883a",
  measurementId: "G-G2S313X8R7",
};

// Initialize Firebase and declare global variables
let auth;
let database;

// Initialize Firebase using the compat global
try {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  auth = firebase.auth();
  database = firebase.database();
  console.log("Firebase initialized (compat). auth ready? ->", !!auth);
  window.fbInitialized = true;

  // Enable persistent login
  auth
    .setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .then(() => {
      // Add auth state debug logging
      auth.onAuthStateChanged((user) => {
        console.log(
          "Auth state changed:",
          user ? `User ${user.email} logged in` : "No user"
        );
        console.log("Current page:", window.location.pathname);
        currentUser = user;
        updateUIForAuth();
      });
    })
    .catch((error) => {
      console.error("Error setting auth persistence:", error);
      alert("Error setting login persistence. Please try again.");
    });
} catch (error) {
  console.error("Firebase initialization error:", error);
  alert("Error initializing the application. Please try refreshing the page.");
}

// Global Variables
let currentUser = null;
let selectedSeats = [];
let currentBus = null;
let bookingData = null;

// ==================== AUTH FUNCTIONS ====================

function showLogin() {
  document.getElementById("loginForm").classList.remove("hidden");
  document.getElementById("registerForm").classList.add("hidden");
  document.querySelectorAll(".tab-btn")[0].classList.add("active");
  document.querySelectorAll(".tab-btn")[1].classList.remove("active");
}

function showRegister() {
  document.getElementById("loginForm").classList.add("hidden");
  document.getElementById("registerForm").classList.remove("hidden");
  document.querySelectorAll(".tab-btn")[0].classList.remove("active");
  document.querySelectorAll(".tab-btn")[1].classList.add("active");
}

// Login Form Handler
if (document.getElementById("loginForm")) {
  document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    console.log("Login submit:", email);
    try {
      const res = await auth.signInWithEmailAndPassword(email, password);
      console.log("Sign-in success:", res && res.user && res.user.email);
      currentUser = res.user;
      // Force redirect to booking page after successful login
      console.log("Redirecting to booking page...");
      window.location.href = "booking.html";
    } catch (error) {
      console.error("Sign-in error:", error);
      showAuthError(error);
    }
  });
}

// Register Form Handler
if (document.getElementById("registerForm")) {
  document
    .getElementById("registerForm")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("registerName").value;
      const email = document.getElementById("registerEmail").value;
      const password = document.getElementById("registerPassword").value;

      try {
        const userCredential = await auth.createUserWithEmailAndPassword(
          email,
          password
        );
        await userCredential.user.updateProfile({ displayName: name });

        // Save user data to database
        await database.ref("users/" + userCredential.user.uid).set({
          name: name,
          email: email,
          createdAt: new Date().toISOString(),
        });

        // User is automatically signed in after createUserWithEmailAndPassword
        // Redirect to booking page
        console.log(
          "Registration success:",
          userCredential && userCredential.user && userCredential.user.email
        );
        window.location.href = "booking.html";
      } catch (error) {
        console.error("Registration error:", error);
        showAuthError(error);
      }
    });
}

function showAuthError(error) {
  const errorDiv = document.getElementById("authError");
  if (!errorDiv) return;
  console.error("Auth error:", error);
  let message = "Authentication error";
  if (error && error.code) {
    switch (error.code) {
      case "auth/user-not-found":
        message = "No user found with this email.";
        break;
      case "auth/wrong-password":
        message = "Incorrect password. Please try again.";
        break;
      case "auth/email-already-in-use":
        message = "This email is already registered.";
        break;
      case "auth/invalid-email":
        message = "Invalid email address.";
        break;
      default:
        message = error.message || String(error);
    }
  } else if (typeof error === "string") {
    message = error;
  }

  errorDiv.textContent = message;
  errorDiv.classList.add("show");
  setTimeout(() => errorDiv.classList.remove("show"), 6000);
}

function logout() {
  auth.signOut().then(() => {
    window.location.href = "index.html";
  });
}

// Check Authentication State
auth.onAuthStateChanged((user) => {
  currentUser = user;
  console.log("onAuthStateChanged user=", user && (user.email || user.uid));
  if (user) {
    // hide auth forms if present
    // If we're on the login page, redirect to booking page
    if (window.location.pathname.toLowerCase().includes("login")) {
      window.location.href = "booking.html";
      return;
    }

    const authSection = document.getElementById("authSection");
    if (authSection) authSection.classList.add("hidden");
    const homeSection = document.getElementById("homeSection");
    if (homeSection) homeSection.classList.remove("hidden");
    updateUserInfo(user);
    try {
      loadUserBookings();
    } catch (e) {
      console.warn("loadUserBookings not defined or failed", e);
    }
  } else {
    console.log("User signed out or not logged in");
    // if trying to access booking/payment without login, redirect to index
    if (
      window.location.pathname.includes("booking") ||
      window.location.pathname.includes("payment")
    ) {
      window.location.href = "index.html";
      return;
    }
    const authSection = document.getElementById("authSection");
    if (authSection) authSection.classList.remove("hidden");
    const homeSection = document.getElementById("homeSection");
    if (homeSection) homeSection.classList.add("hidden");
  }
});

function updateUserInfo(user) {
  const userInfoElements = document.querySelectorAll("#userInfo");
  userInfoElements.forEach((element) => {
    element.innerHTML = `
            <span>👤 ${user.displayName || user.email}</span>
        `;
  });
}

function updateUIForAuth() {
  console.log("Updating UI for auth state");
  const userInfo = document.getElementById("userInfo");
  const authSection = document.getElementById("authSection");
  const homeSection = document.getElementById("homeSection");

  if (userInfo) {
    if (currentUser) {
      userInfo.textContent = `Logged in as: ${currentUser.email}`;
    } else {
      userInfo.textContent = "";
    }
  }

  // Update visibility of sections if they exist
  if (authSection && homeSection) {
    if (currentUser) {
      authSection.classList.add("hidden");
      homeSection.classList.remove("hidden");
    } else {
      authSection.classList.remove("hidden");
      homeSection.classList.add("hidden");
    }
  }
}

function checkAuth() {
  console.log("Checking auth state:", currentUser);

  if (!window.fbInitialized) {
    console.error("Firebase not initialized");
    alert("Application not initialized properly. Please refresh the page.");
    return false;
  }

  if (!currentUser) {
    console.log("No user found, redirecting to login");
    alert("Please log in first");
    window.location.href = "index.html";
    return false;
  }

  return true;
} // ==================== SEARCH & BUS FUNCTIONS ====================

function searchBuses() {
  const from = document.getElementById("fromCity").value;
  const to = document.getElementById("toCity").value;
  const date = document.getElementById("travelDate").value;
  const passengers = document.getElementById("passengers").value;

  if (!from || !to || !date) {
    alert("Please fill all search fields");
    return;
  }

  if (from === to) {
    alert("Source and destination cannot be same");
    return;
  }

  // Mock bus data
  const buses = [
    {
      id: "BUS001",
      name: "Express Luxury",
      from: from,
      to: to,
      date: date,
      departure: "08:00 AM",
      arrival: "02:00 PM",
      duration: "6h",
      price: 45,
      seatsAvailable: 25,
      type: "AC Sleeper",
      rating: 4.5,
    },
    {
      id: "BUS002",
      name: "Super Fast",
      from: from,
      to: to,
      date: date,
      departure: "10:30 AM",
      arrival: "04:30 PM",
      duration: "6h",
      price: 38,
      seatsAvailable: 30,
      type: "AC Seater",
      rating: 4.2,
    },
    {
      id: "BUS003",
      name: "Night Rider",
      from: from,
      to: to,
      date: date,
      departure: "11:00 PM",
      arrival: "05:00 AM",
      duration: "6h",
      price: 52,
      seatsAvailable: 20,
      type: "AC Sleeper Premium",
      rating: 4.8,
    },
  ];

  displayBuses(buses, passengers);
}

function displayBuses(buses, passengers) {
  const busList = document.getElementById("busList");
  const busResults = document.getElementById("busResults");

  busList.innerHTML = "";
  buses.forEach((bus) => {
    const busCard = document.createElement("div");
    busCard.className = "bus-card";
    busCard.innerHTML = `
            <div class="bus-info">
                <h4>${bus.name}</h4>
                <p>${bus.type}</p>
                <div class="bus-details">
                    <span>⏰ ${bus.departure} - ${bus.arrival}</span>
                    <span>🕐 ${bus.duration}</span>
                    <span>⭐ ${bus.rating}</span>
                </div>
                <p class="seats-available">${
                  bus.seatsAvailable
                } seats available</p>
            </div>
            <div class="bus-price">
                <div class="price">$${bus.price}</div>
                <p>per person</p>
                <button onclick='selectBus(${JSON.stringify(
                  bus
                )}, ${passengers})' class="btn-primary" style="margin-top: 15px;">Select</button>
            </div>
        `;
    busList.appendChild(busCard);
  });

  busResults.classList.remove("hidden");
}

function selectBus(bus, passengers) {
  if (!passengers || passengers < 1) {
    alert("Please select number of passengers");
    return;
  }

  // Save bus and passenger data
  sessionStorage.setItem("selectedBus", JSON.stringify(bus));
  sessionStorage.setItem("passengers", passengers);

  // Clear any previous booking data
  selectedSeats = [];
  sessionStorage.removeItem("bookingData");

  // Navigate to booking page
  window.location.href = "booking.html";
}

// ==================== BOOKING PAGE FUNCTIONS ====================

function loadBusDetails() {
  console.log("Loading bus details");

  // First check authentication
  if (!checkAuth()) {
    return;
  }

  let bus;
  let passengers;

  try {
    const busData = sessionStorage.getItem("selectedBus");
    const passengersData = sessionStorage.getItem("passengers");
    console.log("Bus data from session:", busData);
    console.log("Passengers from session:", passengersData);

    if (!busData || !passengersData) {
      throw new Error("Missing bus or passenger data");
    }

    bus = JSON.parse(busData);
    passengers = parseInt(passengersData);

    if (isNaN(passengers) || passengers < 1) {
      throw new Error("Invalid passenger count");
    }
  } catch (error) {
    console.error("Error loading booking data:", error);
    alert("Please select a bus and number of passengers first");
    window.location.href = "index.html";
    return;
  }

  currentBus = bus;
  const busDetails = document.getElementById("busDetails");
  if (busDetails) {
    busDetails.innerHTML = `
            <h3>${bus.name}</h3>
            <p><strong>Route:</strong> ${bus.from} → ${bus.to}</p>
            <p><strong>Date:</strong> ${bus.date}</p>
            <p><strong>Time:</strong> ${bus.departure} - ${bus.arrival}</p>
            <p><strong>Type:</strong> ${bus.type}</p>
            <p><strong>Price:</strong> $${bus.price} per seat</p>
            <p><strong>Passengers:</strong> ${passengers}</p>
        `;
  }

  generatePassengerInputs(passengers);
}

function generateSeats() {
  console.log("Generating seat map");
  const seatMap = document.getElementById("seatMap");

  if (!seatMap) {
    console.error("Seat map container not found");
    return;
  }

  // Clear existing seats if any
  seatMap.innerHTML = "";

  // Create a grid container for the seats
  const gridContainer = document.createElement("div");
  gridContainer.style.display = "grid";
  gridContainer.style.gridTemplateColumns = "repeat(4, 1fr)";
  gridContainer.style.gap = "10px";
  gridContainer.style.padding = "20px";

  // Use currentBus.seatsAvailable to determine which seats are available
  // If missing, default to 30 available seats
  const totalSeats = 40;
  let availableSeats = 30;
  if (
    currentBus &&
    typeof currentBus.seatsAvailable === "number" &&
    currentBus.seatsAvailable > 0
  ) {
    availableSeats = currentBus.seatsAvailable;
  }
  let availableSeatNumbers = [];
  for (let i = 1; i <= availableSeats; i++) {
    availableSeatNumbers.push(i);
  }

  if (availableSeats === 0) {
    seatMap.innerHTML =
      '<div style="color:#c00; font-weight:bold; text-align:center;">No seats available for this bus.</div>';
    return;
  }

  for (let i = 1; i <= totalSeats; i++) {
    const seat = document.createElement("div");
    seat.className = "seat";
    seat.textContent = i;
    seat.setAttribute("data-seat", i);

    // Style each seat
    seat.style.width = "40px";
    seat.style.height = "40px";
    seat.style.display = "flex";
    seat.style.alignItems = "center";
    seat.style.justifyContent = "center";
    seat.style.border = "2px solid #ccc";
    seat.style.borderRadius = "5px";
    seat.style.cursor = "pointer";
    seat.style.userSelect = "none";
    seat.style.transition = "all 0.3s ease";

    if (i % 4 === 3) {
      seat.style.marginRight = "20px";
    }

    if (availableSeatNumbers.includes(i)) {
      seat.classList.add("available");
      seat.style.backgroundColor = "#e8f5e9";
      seat.onclick = () => toggleSeat(i);
    } else {
      seat.classList.add("booked");
      seat.style.backgroundColor = "#ffcccb";
      seat.style.cursor = "not-allowed";
    }

    gridContainer.appendChild(seat);
  }

  seatMap.appendChild(gridContainer);
}

function toggleSeat(seatNumber) {
  console.log("Toggling seat:", seatNumber);

  const passengers = parseInt(sessionStorage.getItem("passengers"));
  const seatElement = document.querySelector(`[data-seat="${seatNumber}"]`);

  if (!seatElement) {
    console.error("Seat element not found:", seatNumber);
    return;
  }

  if (seatElement.classList.contains("selected")) {
    // Unselect the seat
    seatElement.classList.remove("selected");
    seatElement.classList.add("available");
    seatElement.style.backgroundColor = "#e8f5e9";
    selectedSeats = selectedSeats.filter((s) => s !== seatNumber);
    console.log("Seat unselected, remaining seats:", selectedSeats);
  } else if (selectedSeats.length < passengers) {
    // Select the seat
    seatElement.classList.remove("available");
    seatElement.classList.add("selected");
    seatElement.style.backgroundColor = "#b2dfdb";
    selectedSeats.push(seatNumber);
    selectedSeats.sort((a, b) => a - b); // Keep seats in order
    console.log("Seat selected, all selected seats:", selectedSeats);
  } else {
    alert(`You can only select ${passengers} seat(s)`);
    return;
  }

  updateBookingSummary();
}

function generatePassengerInputs(count) {
  const container = document.getElementById("passengerInputs");
  if (!container) return;

  container.innerHTML = "";
  for (let i = 1; i <= count; i++) {
    const passengerDiv = document.createElement("div");
    passengerDiv.className = "passenger-input";
    passengerDiv.innerHTML = `
            <h4>Passenger ${i}</h4>
            <div class="form-group">
                <label>Full Name</label>
                <input type="text" id="passenger${i}Name" required>
            </div>
            <div class="form-group">
                <label>Age</label>
                <input type="number" id="passenger${i}Age" min="1" max="120" required>
            </div>
            <div class="form-group">
                <label>Gender</label>
                <select id="passenger${i}Gender" required>
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                </select>
            </div>
        `;
    container.appendChild(passengerDiv);
  }
}

function updateBookingSummary() {
  const summary = document.getElementById("bookingSummary");
  const totalAmount = document.getElementById("totalAmount");
  const proceedBtn = document.getElementById("proceedBtn");

  if (!summary) return;

  const passengers = parseInt(sessionStorage.getItem("passengers"));
  const total = selectedSeats.length * currentBus.price;

  summary.innerHTML = `
        <p><strong>Selected Seats:</strong> ${
          selectedSeats.join(", ") || "None"
        }</p>
        <p><strong>Number of Seats:</strong> ${selectedSeats.length}</p>
        <p><strong>Price per Seat:</strong> $${currentBus.price}</p>
    `;

  totalAmount.textContent = total;

  if (selectedSeats.length === passengers) {
    proceedBtn.disabled = false;
  } else {
    proceedBtn.disabled = true;
  }
}

function proceedToPayment() {
  const passengers = parseInt(sessionStorage.getItem("passengers"));

  if (selectedSeats.length !== passengers) {
    alert("Please select all seats");
    return;
  }

  // Validate passenger details
  let passengersData = [];
  for (let i = 1; i <= passengers; i++) {
    const name = document.getElementById(`passenger${i}Name`).value;
    const age = document.getElementById(`passenger${i}Age`).value;
    const gender = document.getElementById(`passenger${i}Gender`).value;

    if (!name || !age || !gender) {
      alert(`Please fill all details for Passenger ${i}`);
      return;
    }

    passengersData.push({ name, age, gender, seat: selectedSeats[i - 1] });
  }

  // Validate contact information
  const phone = document.getElementById("contactNumber").value;
  const emergency = document.getElementById("emergencyContact").value;

  if (!phone || !emergency) {
    alert("Please provide contact information");
    return;
  }

  // Save booking data to session storage
  const bookingData = {
    bus: currentBus,
    passengers: passengersData,
    seats: selectedSeats,
    totalAmount: selectedSeats.length * currentBus.price,
    contactNumber: phone,
    emergencyContact: emergency,
  };

  sessionStorage.setItem("bookingData", JSON.stringify(bookingData));

  // Redirect to payment page
  window.location.href = "payment.html";

  const contactNumber = document.getElementById("contactNumber").value;
  const emergencyContact = document.getElementById("emergencyContact").value;

  if (!contactNumber || !emergencyContact) {
    alert("Please fill contact details");
    return;
  }

  // Save booking data
  bookingData = {
    bus: currentBus,
    passengers: passengersData,
    seats: selectedSeats,
    contactNumber,
    emergencyContact,
    totalAmount: selectedSeats.length * currentBus.price,
  };

  sessionStorage.setItem("bookingData", JSON.stringify(bookingData));
  window.location.href = "payment.html";
}

function goBack() {
  window.location.href = "index.html";
}

// ==================== PAYMENT PAGE FUNCTIONS ====================

function loadPaymentDetails() {
  const bookingData = JSON.parse(sessionStorage.getItem("bookingData"));

  if (!bookingData) {
    window.location.href = "index.html";
    return;
  }

  const summary = document.getElementById("paymentSummary");
  if (summary) {
    summary.innerHTML = `
            <div style="background: white; padding: 20px; border-radius: 8px;">
                <h3>${bookingData.bus.name}</h3>
                <p><strong>Route:</strong> ${bookingData.bus.from} → ${
      bookingData.bus.to
    }</p>
                <p><strong>Date:</strong> ${bookingData.bus.date}</p>
                <p><strong>Time:</strong> ${bookingData.bus.departure}</p>
                <p><strong>Seats:</strong> ${bookingData.seats.join(", ")}</p>
                <p><strong>Passengers:</strong> ${
                  bookingData.passengers.length
                }</p>
                <hr style="margin: 15px 0;">
                <h2 style="color: #667eea;">Total Amount: $${
                  bookingData.totalAmount
                }</h2>
            </div>
        `;
  }
}

function selectPaymentMethod(method) {
  // Hide all forms
  document.getElementById("cardForm").classList.add("hidden");
  document.getElementById("upiForm").classList.add("hidden");
  document.getElementById("netbankingForm").classList.add("hidden");
  document.getElementById("walletForm").classList.add("hidden");

  // Show selected form
  document.getElementById(method + "Form").classList.remove("hidden");

  // Update radio selection
  document.getElementById(method).checked = true;
}

async function processPayment() {
  const bookingData = JSON.parse(sessionStorage.getItem("bookingData"));
  const paymentMethod = document.querySelector(
    'input[name="payment"]:checked'
  ).id;

  // Validate payment details based on method
  let paymentValid = false;
  let paymentDetails = {};

  switch (paymentMethod) {
    case "card":
      const cardNumber = document.getElementById("cardNumber").value;
      const cardName = document.getElementById("cardName").value;
      const expiryDate = document.getElementById("expiryDate").value;
      const cvv = document.getElementById("cvv").value;

      if (cardNumber && cardName && expiryDate && cvv) {
        paymentValid = true;
        paymentDetails = {
          method: "Credit/Debit Card",
          last4: cardNumber.slice(-4),
        };
      }
      break;
    case "upi":
      const upiId = document.getElementById("upiId").value;
      if (upiId) {
        paymentValid = true;
        paymentDetails = { method: "UPI", upiId };
      }
      break;
    case "netbanking":
      const bankName = document.getElementById("bankName").value;
      if (bankName) {
        paymentValid = true;
        paymentDetails = { method: "Net Banking", bank: bankName };
      }
      break;
    case "wallet":
      const walletName = document.getElementById("walletName").value;
      if (walletName) {
        paymentValid = true;
        paymentDetails = { method: "Wallet", wallet: walletName };
      }
      break;
  }

  if (!paymentValid) {
    alert("Please fill all payment details");
    return;
  }

  // Process payment
  showPaymentStatus("processing");

  try {
    // Save booking to Firebase (global and user-specific)
    const bookingRef = database.ref("bookings").push();
    const bookingObj = {
      userId: currentUser.uid,
      userEmail: currentUser.email,
      userName: currentUser.displayName,
      ...bookingData,
      paymentDetails,
      bookingId: bookingRef.key,
      status: "confirmed",
      bookedAt: new Date().toISOString(),
    };
    await bookingRef.set(bookingObj);
    // Also save under user profile
    await database
      .ref(`bookings/${currentUser.uid}/${bookingRef.key}`)
      .set(bookingObj);

    // Also save to Firestore for SMS/Email demo
    if (firebase.firestore) {
      firebase
        .firestore()
        .collection("Bookings")
        .add({
          userId: currentUser.uid,
          phoneNumber: bookingObj.phoneNumber,
          email: currentUser.email,
          busNumber:
            bookingObj.bus && bookingObj.bus.name ? bookingObj.bus.name : "",
          date:
            bookingObj.bus && bookingObj.bus.date ? bookingObj.bus.date : "",
          ticketNumber: bookingObj.ticketNumber,
        });
    }

    // Send SMS and Email confirmation
    sendSMS(bookingObj.phoneNumber, bookingObj.ticketNumber);
    sendEmail(
      bookingObj.userEmail,
      bookingObj.ticketNumber,
      bookingObj.bus && bookingObj.bus.name ? bookingObj.bus.name : "",
      bookingObj.bus && bookingObj.bus.date ? bookingObj.bus.date : ""
    );

    // Send confirmation (email/SMS placeholder)
    sendBookingConfirmation(bookingObj);

    // Clear session storage
    sessionStorage.removeItem("selectedBus");
    sessionStorage.removeItem("passengers");
    sessionStorage.removeItem("bookingData");

    showPaymentStatus("success", bookingRef.key);
    // Dummy SMS and Email functions (replace with real integration)
    function sendSMS(phoneNumber, ticketNumber) {
      console.log(
        `[SMS] Sent to ${phoneNumber}: Your ticket ${ticketNumber} is confirmed.`
      );
    }

    function sendEmail(email, ticketNumber, busNumber, date) {
      console.log(
        `[EMAIL] Sent to ${email}: Your ticket ${ticketNumber} for bus ${busNumber} on ${date} is confirmed.`
      );
    }
    // Send booking confirmation (email/SMS placeholder)
    function sendBookingConfirmation(booking) {
      // Email confirmation (Firebase does not support custom emails directly)
      // You can use EmailJS, SendGrid, or similar service here
      // Example placeholder:
      console.log(
        `[CONFIRMATION] Email sent to ${booking.userEmail} for booking ${booking.bookingId}`
      );

      // SMS confirmation (requires service like Twilio)
      // Example placeholder:
      console.log(
        `[CONFIRMATION] SMS sent to ${booking.contactNumber} for booking ${booking.bookingId}`
      );

      // You can integrate EmailJS or Twilio here for real delivery
    }
  } catch (error) {
    console.error("Payment error:", error);
    showPaymentStatus("error");
  }
}

function showPaymentStatus(status, bookingId) {
  const statusDiv = document.getElementById("paymentStatus");
  statusDiv.classList.remove("hidden");

  if (status === "processing") {
    statusDiv.className = "payment-status";
    statusDiv.innerHTML = `
            <div class="icon">⏳</div>
            <h2>Processing Payment...</h2>
            <p>Please wait while we process your payment</p>
        `;
  } else if (status === "success") {
    statusDiv.className = "payment-status success";
    statusDiv.innerHTML = `
            <div class="icon">✅</div>
            <h2>Payment Successful!</h2>
            <p>Your booking has been confirmed</p>
            <p><strong>Booking ID:</strong> ${bookingId}</p>
            <button onclick="window.location.href='index.html'" class="btn-primary" style="margin-top: 20px;">
                Go to Home
            </button>
        `;
  } else if (status === "error") {
    statusDiv.className = "payment-status error";
    statusDiv.innerHTML = `
            <div class="icon">❌</div>
            <h2>Payment Failed</h2>
            <p>Something went wrong. Please try again.</p>
            <button onclick="location.reload()" class="btn-primary" style="margin-top: 20px;">
                Try Again
            </button>
        `;
  }
}

function goBackToBooking() {
  window.location.href = "booking.html";
}

// ==================== USER BOOKINGS ====================

async function loadUserBookings() {
  if (!currentUser) return;

  const bookingsList = document.getElementById("bookingsList");
  if (!bookingsList) return;

  try {
    const snapshot = await database
      .ref("bookings")
      .orderByChild("userId")
      .equalTo(currentUser.uid)
      .once("value");

    const bookings = snapshot.val();

    if (!bookings) {
      bookingsList.innerHTML = '<p style="color: #666;">No bookings yet</p>';
      return;
    }

    bookingsList.innerHTML = "";
    Object.values(bookings)
      .reverse()
      .forEach((booking) => {
        const bookingCard = document.createElement("div");
        bookingCard.className = "booking-card";
        bookingCard.innerHTML = `
                <h4>${booking.bus.name}</h4>
                <p><strong>Route:</strong> ${booking.bus.from} → ${
          booking.bus.to
        }</p>
                <p><strong>Date:</strong> ${booking.bus.date} at ${
          booking.bus.departure
        }</p>
                <p><strong>Seats:</strong> ${booking.seats.join(", ")}</p>
                <p><strong>Booking ID:</strong> ${booking.bookingId}</p>
                <p><strong>Total Paid:</strong> $${booking.totalAmount}</p>
                <span class="booking-status confirmed">Confirmed</span>
            `;
        bookingsList.appendChild(bookingCard);
      });
  } catch (error) {
    console.error("Error loading bookings:", error);
    bookingsList.innerHTML =
      '<p style="color: #e74c3c;">Error loading bookings</p>';
  }
}

function showMessage(message, type) {
  const messageDiv = document.createElement("div");
  messageDiv.className =
    type === "success" ? "success-message" : "error-message show";
  messageDiv.textContent = message;
  document.body.appendChild(messageDiv);
  setTimeout(() => messageDiv.remove(), 3000);
}

// Set minimum date to today for date inputs
document.addEventListener("DOMContentLoaded", () => {
  const dateInput = document.getElementById("travelDate");
  if (dateInput) {
    const today = new Date().toISOString().split("T")[0];
    dateInput.setAttribute("min", today);
    dateInput.value = today;
  }
});
