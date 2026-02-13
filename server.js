const express = require('express');
const path = require('path');
const { pool } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// --- Todo CRUD ---
app.get('/api/todos', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM todos ORDER BY created_at DESC');
  res.json(rows);
});

app.post('/api/todos', async (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });
  const { rows } = await pool.query('INSERT INTO todos (title) VALUES ($1) RETURNING *', [title]);
  res.status(201).json(rows[0]);
});

app.patch('/api/todos/:id', async (req, res) => {
  const { id } = req.params;
  const { title, completed } = req.body;
  const sets = [];
  const vals = [];
  let idx = 1;
  if (title !== undefined) { sets.push(`title = $${idx++}`); vals.push(title); }
  if (completed !== undefined) { sets.push(`completed = $${idx++}`); vals.push(completed); }
  sets.push(`updated_at = NOW()`);
  vals.push(parseInt(id));
  try {
    const { rows } = await pool.query(
      `UPDATE todos SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      vals
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Todo not found' });
    res.json(rows[0]);
  } catch {
    res.status(404).json({ error: 'Todo not found' });
  }
});

app.delete('/api/todos/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM todos WHERE id = $1', [parseInt(req.params.id)]);
    if (rowCount === 0) return res.status(404).json({ error: 'Todo not found' });
    res.status(204).send();
  } catch {
    res.status(404).json({ error: 'Todo not found' });
  }
});

// --- User + Post endpoints ---
app.get('/api/users', async (req, res) => {
  const { rows: allUsers } = await pool.query('SELECT * FROM users ORDER BY id');
  const { rows: allPosts } = await pool.query('SELECT * FROM posts ORDER BY id');
  const result = allUsers.map(u => ({
    ...u,
    posts: allPosts.filter(p => p.author_id === u.id),
  }));
  res.json(result);
});

app.get('/api/posts', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT p.*, u.name as author_name, u.email as author_email
     FROM posts p JOIN users u ON p.author_id = u.id
     ORDER BY p.created_at DESC`
  );
  const result = rows.map(r => ({
    id: r.id,
    title: r.title,
    content: r.content,
    published: r.published,
    authorId: r.author_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    author: { name: r.author_name, email: r.author_email },
  }));
  res.json(result);
});

// --- DB info endpoint ---
app.get('/api/db/info', async (req, res) => {
  try {
    const { rows: [{ count: todoCount }] } = await pool.query('SELECT COUNT(*) as count FROM todos');
    const { rows: [{ count: userCount }] } = await pool.query('SELECT COUNT(*) as count FROM users');
    const { rows: [{ count: postCount }] } = await pool.query('SELECT COUNT(*) as count FROM posts');
    res.json({
      tables: {
        todos: parseInt(todoCount),
        users: parseInt(userCount),
        posts: parseInt(postCount),
      },
      databaseUrl: process.env.DATABASE_URL ? '(set)' : '(not set)',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Embr Test App (Raw SQL) running on http://0.0.0.0:${PORT}`);
  console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? '(configured)' : '(not set)'}`);
});
