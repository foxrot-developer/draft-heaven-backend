const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const db = require("../helpers/db-config");
const HttpError = require("../helpers/http-errors");

const registerUser = (req, res, next) => {
    const error = validationResult(req);
    if (!error.isEmpty()) {
        console.log(error);
        return next(new HttpError("Incomplete data received", 422));
    }
    const { name, password, email } = req.body;

    const existingUserQuery = "SELECT * FROM user WHERE email=?;"
    db.query(existingUserQuery, email, async (err, response) => {
        if (err) {
            console.log({ err });
            return next(new HttpError("Error fetching data", 500));
        }

        if (response.length) {
            return next(new HttpError('Email already registered', 402));
        }

        let hashpass;
        try {
            hashpass = await bcrypt.hash(password, 10);
        } catch (err) {
            return next(new HttpError("Password hashing error", 422));
        }

        const saveUserQuery = "INSERT INTO user (name, email, password) VALUES(?, ?, ?);"
        db.query(saveUserQuery, [name, email, hashpass], (err, result) => {
            if (err) {
                console.log({ err });
                return next(new HttpError("Error saving data", 500));
            }

            res.status(201).json({ message: 'User registered successfully' });
        });
    });
};

const userLogin = (req, res, next) => {
    const error = validationResult(req);
    if (!error.isEmpty()) {
        return next(new HttpError("Incomplete data received", 422));
    }
    const { email, password } = req.body;

    const existingUserQuery = "SELECT * FROM user WHERE email=?;"
    db.query(existingUserQuery, email, async (err, response) => {
        if (err) {
            console.log({ err });
            return next(new HttpError("Error fetching data", 500));
        }

        if (!response.length) {
            return next(new HttpError('Email is not registered', 404));
        }

        let validPassword;
        try {
            validPassword = await bcrypt.compare(password, response[0].password);
        } catch (error) {
            console.log(error);
            return next(new HttpError("Password hashing error", 500));
        }

        if (!validPassword) {
            return next(new HttpError("Incorrect password", 401));
        }

        res.json({ message: 'User login successful', user: { name: response[0].name, email: response[0].email } });
    });
};

const getAllPlayers = (req, res, next) => {
    const getPlayersQuery = "SELECT * FROM players WHERE Deleted=? AND Position1 IN (?, ?);"
    db.query(getPlayersQuery, [0, 'RP', 'SP'], (err, response) => {
        if (err) {
            console.log({ err });
            return next(new HttpError("Error fetching data", 500));
        }

        res.json({ players: response });
    });
};

exports.registerUser = registerUser;
exports.userLogin = userLogin;
exports.getAllPlayers = getAllPlayers;