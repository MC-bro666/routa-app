require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const preferencesRoutes = require('./routes/preferences');
delete require.cache[require.resolve('./routes/recommend')];
const recommendRoutes = require('./routes/recommend');
console.log('recommendRoutes 内容:', recommendRoutes);
const recipesRoutes = require('./routes/recipes');
const feedbackRoutes = require('./routes/feedback');
const historyRoutes = require('./routes/history');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.use('/api', authRoutes);
app.use('/api', preferencesRoutes);
app.use('/api', recommendRoutes);
app.get('/api/test3', (req, res) => {
    res.json({ message: '直接从 index.js 挂载的测试路由' });
});
app.use('/api', recipesRoutes);
app.use('/api', feedbackRoutes);
app.use('/api', historyRoutes);

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
