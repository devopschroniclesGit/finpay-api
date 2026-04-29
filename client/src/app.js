const path = require('path');

// Serve React app in production
if (process.env.NODE_ENV === 'production') {
  // Serve static files from the React build
  app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));

  // React routing — return the app for any non-API route
  app.use((req, res) => {
    res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
  });
}
