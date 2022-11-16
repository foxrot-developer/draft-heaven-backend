const express = require('express');

const HttpError = require('./helpers/http-errors');

const app = express();

app.use(express.json());

app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE')
    next();
});

// app.use('/api/admin', adminRoutes);


app.use((req, res, next) => {
    throw new HttpError('Route is not valid', 404);
});

app.use((error, req, res, next) => {
    if (res.headerSent) {
        return next(error)
    }
    res.status(error.code || 500);
    res.json({ message: error.message || 'An unknown error occured' });
});

app.listen(process.env.PORT || 5000, () => {
    console.log('Connected');
});