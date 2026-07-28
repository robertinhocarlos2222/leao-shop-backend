const express = require('express');
const router = express.Router();
const products = require('../data/products');

// GET /api/products - Listar todos os produtos
router.get('/', (req, res) => {
  const { category, brand, search, featured } = req.query;
  let filtered = [...products];

  if (category) {
    filtered = filtered.filter(p => p.category === category);
  }
  if (brand) {
    filtered = filtered.filter(p => p.brand.toLowerCase() === brand.toLowerCase());
  }
  if (search) {
    const term = search.toLowerCase();
    filtered = filtered.filter(p => 
      p.name.toLowerCase().includes(term) || 
      p.flavors.some(f => f.toLowerCase().includes(term))
    );
  }
  if (featured === 'true') {
    filtered = filtered.filter(p => p.featured);
  }

  res.json({ 
    total: filtered.length,
    data: filtered 
  });
});

// GET /api/products/categories - Listar categorias
router.get('/categories', (req, res) => {
  const categories = [...new Set(products.map(p => p.category))];
  res.json({ data: categories });
});

// GET /api/products/brands - Listar marcas
router.get('/brands', (req, res) => {
  const brands = [...new Set(products.map(p => p.brand))];
  res.json({ data: brands });
});

// GET /api/products/:id - Produto individual
router.get('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const product = products.find(p => p.id === id);
  
  if (!product) {
    return res.status(404).json({ error: 'Produto não encontrado' });
  }
  
  res.json(product);
});

module.exports = router;