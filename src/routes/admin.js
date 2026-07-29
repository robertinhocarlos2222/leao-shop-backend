const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const products = require('../data/products');

const JWT_SECRET = process.env.JWT_SECRET || 'leao-shop-secret-key-2026';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || '230981274';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '14823Ksda';

// Rate limiting para login (proteção contra brute force)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 3, // apenas 3 tentativas a cada 15 minutos
  message: { error: '⚠️ Conta temporariamente bloqueada por segurança. Tente novamente em 15 minutos.', code: 'RATE_LIMIT' }
});

// Rate limit mais restritivo por IP
const ipLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10, // máximo 10 tentativas por hora
  message: { error: '⚠️ Muitas tentativas deste IP. Bloqueado por 1 hora.', code: 'IP_BLOCKED' }
});

// Delay progressivo entre tentativas (armazena tentativas por IP)
const loginAttempts = new Map();

function checkLoginAttempts(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const attempts = loginAttempts.get(ip) || [];
  
  // Remove tentativas com mais de 15 minutos
  const recentAttempts = attempts.filter(time => now - time < 15 * 60 * 1000);
  
  if (recentAttempts.length >= 3) {
    return res.status(429).json({ 
      error: '⚠️ Conta temporariamente bloqueada por segurança. Tente novamente em 15 minutos.', 
      code: 'TOO_MANY_ATTEMPTS' 
    });
  }
  
  // Adiciona delay baseado no número de tentativas (50ms por tentativa)
  const delay = Math.min(recentAttempts.length * 500, 3000);
  if (delay > 0) {
    return new Promise(resolve => {
      setTimeout(() => {
        recentAttempts.push(now);
        loginAttempts.set(ip, recentAttempts);
        next();
        resolve();
      }, delay);
    });
  }
  
  recentAttempts.push(now);
  loginAttempts.set(ip, recentAttempts);
  next();
}

// Middleware de autenticação
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido', code: 'UNAUTHORIZED' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido ou expirado', code: 'INVALID_TOKEN' });
  }
}

// POST /api/admin/login - Login do admin
router.post('/login', [ipLimiter, loginLimiter, checkLoginAttempts], async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Usuário e senha são obrigatórios', code: 'INVALID_CREDENTIALS' });
    }
    
    if (username !== ADMIN_USERNAME) {
      return res.status(401).json({ error: 'Usuário ou senha incorretos', code: 'INVALID_CREDENTIALS' });
    }
    
    // Verifica senha (hash)
    const passwordMatch = password === ADMIN_PASSWORD;
    
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Usuário ou senha incorretos', code: 'INVALID_CREDENTIALS' });
    }
    
    // Gera token JWT
    const token = jwt.sign(
      { username, role: 'admin' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      success: true,
      token,
      user: { username, role: 'admin' }
    });
    
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
  }
});

// GET /api/admin/products - Listar todos os produtos
router.get('/products', authMiddleware, (req, res) => {
  try {
    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    console.error('Erro ao listar produtos:', error);
    res.status(500).json({ error: 'Erro ao listar produtos', code: 'INTERNAL_ERROR' });
  }
});

// GET /api/admin/products/:id - Buscar produto por ID
router.get('/products/:id', authMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const product = products.find(p => p.id === id);
    
    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado', code: 'NOT_FOUND' });
    }
    
    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Erro ao buscar produto:', error);
    res.status(500).json({ error: 'Erro ao buscar produto', code: 'INTERNAL_ERROR' });
  }
});

// PUT /api/admin/products/:id - Atualizar produto
router.put('/products/:id', authMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const productIndex = products.findIndex(p => p.id === id);
    
    if (productIndex === -1) {
      return res.status(404).json({ error: 'Produto não encontrado', code: 'NOT_FOUND' });
    }
    
    // Atualiza produto
    products[productIndex] = {
      ...products[productIndex],
      ...updates,
      id: id // Não permite alterar o ID
    };
    
    console.log(`✅ Produto atualizado: ${id}`);
    console.log('Dados atualizados:', JSON.stringify(updates, null, 2));
    
    res.json({
      success: true,
      data: products[productIndex]
    });
    
  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    res.status(500).json({ error: 'Erro ao atualizar produto', code: 'INTERNAL_ERROR' });
  }
});

// DELETE /api/admin/products/:id - Deletar produto
router.delete('/products/:id', authMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    
    const productIndex = products.findIndex(p => p.id === id);
    
    if (productIndex === -1) {
      return res.status(404).json({ error: 'Produto não encontrado', code: 'NOT_FOUND' });
    }
    
    products.splice(productIndex, 1);
    
    console.log(`✅ Produto deletado: ${id}`);
    
    res.json({
      success: true,
      message: 'Produto deletado com sucesso'
    });
    
  } catch (error) {
    console.error('Erro ao deletar produto:', error);
    res.status(500).json({ error: 'Erro ao deletar produto', code: 'INTERNAL_ERROR' });
  }
});

// POST /api/admin/products - Criar produto
router.post('/products', authMiddleware, (req, res) => {
  try {
    const newProduct = req.body;
    
    // Gera ID único
    const id = newProduct.id || `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const product = {
      id,
      name: newProduct.name || 'Produto sem nome',
      price: newProduct.price || 0,
      image: newProduct.image || '',
      category: newProduct.category || 'Geral',
      active: newProduct.active !== undefined ? newProduct.active : true,
      ...newProduct
    };
    
    products.push(product);
    
    console.log(`✅ Produto criado: ${id}`);
    console.log('Dados:', JSON.stringify(product, null, 2));
    
    res.status(201).json({
      success: true,
      data: product
    });
    
  } catch (error) {
    console.error('Erro ao criar produto:', error);
    res.status(500).json({ error: 'Erro ao criar produto', code: 'INTERNAL_ERROR' });
  }
});

// GET /api/admin/stats - Estatísticas
router.get('/stats', authMiddleware, (req, res) => {
  try {
    const totalProducts = products.length;
    const activeProducts = products.filter(p => p.active).length;
    const totalValue = products.reduce((sum, p) => sum + (p.price || 0), 0);
    
    res.json({
      success: true,
      data: {
        totalProducts,
        activeProducts,
        inactiveProducts: totalProducts - activeProducts,
        totalValue
      }
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas', code: 'INTERNAL_ERROR' });
  }
});

module.exports = router;