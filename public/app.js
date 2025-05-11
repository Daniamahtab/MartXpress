// Basic MartXpress frontend script: sign in/up, product listing, cart, order with location and payment

const API_BASE = 'http://localhost:3000/api';

let token = null;
let cart = {};
const app = document.getElementById('app');
const navProductsBtn = document.getElementById('navProducts');
const navCartBtn = document.getElementById('navCart');
const navUserBtn = document.getElementById('navUser');

// Save/load token to localStorage for persistence
function saveToken(t) {
  token = t;
  localStorage.setItem('martxpress_token', t);
}

function loadToken() {
  token = localStorage.getItem('martxpress_token');
}

function logout() {
  token = null;
  localStorage.removeItem('martxpress_token');
  cart = {};
  showLoginView();
}

function updateCartBtn() {
  const count = Object.values(cart).reduce((a,b) => a + b, 0);
  navCartBtn.textContent = `Cart (${count})`;
}

async function fetchProducts() {
  const res = await fetch(`${API_BASE}/products`);
  return await res.json();
}

// Show login/signup form
function showLoginView() {
  let html = `
    <h2>Login / Signup</h2>
    <form id="authForm">
      <input type="email" id="email" placeholder="Email" required /><br/>
      <input type="password" id="password" placeholder="Password" required /><br/>
      <button type="submit" id="loginBtn">Login</button>
      <button type="button" id="toggleBtn">Switch to Signup</button>
    </form>
    <div id="authMsg" style="color:red;"></div>
  `;
  app.innerHTML = html;

  let isLogin = true;
  const authForm = document.getElementById('authForm');
  const toggleBtn = document.getElementById('toggleBtn');
  const authMsg = document.getElementById('authMsg');

  toggleBtn.onclick = () => {
    isLogin = !isLogin;
    authMsg.textContent = '';
    authForm.reset();
    if (isLogin) {
      toggleBtn.textContent = 'Switch to Signup';
      document.getElementById('loginBtn').textContent = 'Login';
      if(document.getElementById('nameInput')) {
        document.getElementById('nameInput').remove();
      }
    } else {
      toggleBtn.textContent = 'Switch to Login';
      document.getElementById('loginBtn').textContent = 'Signup';
      if(!document.getElementById('nameInput')) {
        const input = document.createElement('input');
        input.id = 'nameInput';
        input.placeholder = 'Name';
        input.required = true;
        input.style.marginBottom = '8px';
        authForm.insertBefore(input, authForm.firstChild);
      }
    }
  };

  authForm.onsubmit = async (e) => {
    e.preventDefault();
    authMsg.textContent = '';
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const nameInput = document.getElementById('nameInput');
    const name = nameInput ? nameInput.value.trim() : null;
    if (!email || !password || (!isLogin && !name)) {
      authMsg.textContent = 'Please fill all fields.';
      return;
    }
    try {
      const url = isLogin ? `${API_BASE}/login` : `${API_BASE}/signup`;
      const body = isLogin ? {email, password} : {email, password, name};
      const res = await fetch(url, {
        method:'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        saveToken(data.token);
        cart = {};
        updateCartBtn();
        showProductsView();
      } else {
        authMsg.textContent = data.error || 'Authentication failed.';
      }
    } catch (err) {
      authMsg.textContent = 'Network error.';
    }
  };
}

// Show products list with Add to Cart
async function showProductsView() {
  updateCartBtn();
  let products;
  try {
    products = await fetchProducts();
  } catch {
    app.innerHTML = '<p>Failed to load products.</p>';
    return;
  }
  let html = '<h2>Products</h2><div class="product-list">';
  for (const p of products) {
    html += `
      <div class="product">
        <strong>${p.name}</strong><br/>
        Price: ₹${p.price}<br/>
        <button data-id="${p.id}">Add to Cart</button>
      </div>
    `;
  }
  html += '</div>';
  app.innerHTML = html;
  for (const btn of app.querySelectorAll('button[data-id]')) {
    btn.onclick = () => {
      const id = btn.getAttribute('data-id');
      cart[id] = (cart[id] || 0) + 1;
      updateCartBtn();
    };
  }
}

// Show cart and checkout form
async function showCartView() {
  updateCartBtn();
  if (Object.keys(cart).length === 0) {
    app.innerHTML = '<h2>Cart</h2><p>Your cart is empty.</p>';
    return;
  }
  let products = await fetchProducts();
  let html = '<h2>Cart</h2><ul>';
  let total = 0;
  for (const [id, qty] of Object.entries(cart)) {
    const product = products.find(p => p.id === id);
    if (product) {
      html += `<li>${product.name} - ₹${product.price} × ${qty} = ₹${product.price * qty}</li>`;
      total += product.price * qty;
    }
  }
  html += `</ul><p><strong>Total: ₹${total}</strong></p>`;

  if (!token) {
    html += '<p>Please login to proceed to checkout.</p>';
    html += '<button id="btnLogin">Login / Signup</button>';
    app.innerHTML = html;
    document.getElementById('btnLogin').onclick = showLoginView;
    return;
  }

  // Checkout form
  html += `
    <h3>Checkout</h3>
    <form id="checkoutForm">
      <input type="text" id="name" placeholder="Name" required /><br/>
      <input type="tel" id="contact" placeholder="Contact No" required /><br/>
      <textarea id="address" placeholder="Address" required></textarea><br/>
      <button type="button" id="detectLocBtn">Detect Current Location</button><br/><br/>
      <label>Payment Method:</label><br/>
      <select id="paymentMethod">
        <option value="COD">Cash on Delivery</option>
        <option value="GPay">Google Pay</option>
        <option value="PhonePe">PhonePe</option>
      </select><br/><br/>
      <button type="submit">Place Order</button>
    </form>
    <div id="orderMsg"></div>
  `;
  app.innerHTML = html;

  document.getElementById('detectLocBtn').onclick = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`)
          .then(res => res.json())
          .then(data => {
            if(data.address) {
              const addr = [
                data.address.road || '',
                data.address.city || data.address.town || '',
                data.address.state || '',
                data.address.postcode || '',
                data.address.country || ''
              ].filter(Boolean).join(', ');
              document.getElementById('address').value = addr;
            } else {
              alert('Could not detect address');
            }
          });
      }, () => alert('Location permission denied'));
    } else {
      alert('Geolocation not supported');
    }
  };

  document.getElementById('checkoutForm').onsubmit = async (e) => {
    e.preventDefault();
    const name = document.getElementById('name').value.trim();
    const contact = document.getElementById('contact').value.trim();
    const address = document.getElementById('address').value.trim();
    const paymentMethod = document.getElementById('paymentMethod').value;

    if(!name || !contact || !address) {
      alert('Please fill all fields.');
      return;
    }

    const responseMsg = document.getElementById('orderMsg');
    responseMsg.textContent = 'Placing order...';

    try {
      const res = await fetch(`${API_BASE}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          items: Object.entries(cart).map(([id, qty]) => ({id, quantity: qty})),
          name,
          contact,
          address,
          paymentMethod,
        }),
      });
      const data = await res.json();
      if(res.ok) {
        cart = {};
        updateCartBtn();
        responseMsg.style.color = 'green';
        responseMsg.textContent = 'Order placed successfully!';
      } else {
        responseMsg.style.color = 'red';
        responseMsg.textContent = data.error || 'Failed to place order.';
      }
    } catch (err) {
      responseMsg.style.color = 'red';
      responseMsg.textContent = 'Network error.';
    }
  };
}

// Navigation button event handlers
navProductsBtn.onclick = () => showProductsView();
navCartBtn.onclick = () => showCartView();
navUserBtn.onclick = () => {
  if(token) {
    if(confirm('Logout?')) logout();
    else showProductsView();
  } else showLoginView();
};

// Initialize
loadToken();
updateCartBtn();

if(token) showProductsView();
else showLoginView();

