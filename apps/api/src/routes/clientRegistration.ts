app.post('/register/client', async (req, res) => {
    const clientShortCode = generateUniqueShortCode();
    // ... rest of the registration logic
});
