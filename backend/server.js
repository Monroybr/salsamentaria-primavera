require('dotenv').config();

const express = require('express');
const cors = require('cors');
const pool = require('./db');

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

app.get('/api/test-db', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT DATABASE() AS base_datos, NOW() AS fecha_servidor'
    );

    res.json({
      mensaje: 'Conexion exitosa con MySQL',
      resultado: rows[0]
    });
  } catch (error) {
    console.error('Error de conexion:', error.message);

    res.status(500).json({
      mensaje: 'No se pudo conectar con MySQL'
    });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor activo en http://localhost:${PORT}`);
});
