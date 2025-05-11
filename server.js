const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const app = express();
const PORT = 3000;
const JWT_SECRET = "martxpress-secret-key";

app.use(express.static('public'));
  

app.use(cors());
app.use(bodyParser.json());

let users = [];
let products = [
  {id: '1', name: 'Fresh Apples', price: 120},
  {id: '2', name: 'Organic Milk', price: 60},
  {id: '3', name: 'Brown Bread', price: 45},
  {id: '4', name: 'Bananas', price: 40},
  {id: '5', name: 'Eggs - Dozen', price: 70},
];

let orders = [];

function generateToken(user) {
  return jwt.sign({id: user.id}, JWT_SECRET, {expiresIn: '4h'});
}

function authenticateToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

app.post('/api/signup', async (req, res) => {
  const {email, password} = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser  = {id: Date.now().toString(), email, password: hashedPassword};
  users.push(newUser );
  const token = generateToken(newUser );
  res.json({token});
});

app.post('/api/login', async (req, res) => {
  const {email, password} = req.body;
  const user = users.find(u => u.email === email);
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({error: 'Invalid credentials'});
  }
  const token = generateToken(user);
  res.json({token});
});

app.get('/api/products', (req, res) => {
  res.json(products);
});

app.post('/api/orders', authenticateToken, (req, res) => {
  const {items, name, contact, address} = req.body;
  const newOrder = {id: Date.now().toString(), userId: req.user.id, items, name, contact, address};
  orders.push(newOrder);
  res.json({message: 'Order placed successfully', order: newOrder});
});

app.listen(PORT, () => {
  console.log(`MartXpress backend running on http://localhost:${PORT}`);
});
