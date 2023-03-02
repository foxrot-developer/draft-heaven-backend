const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const db = require("../helpers/db-config");
const HttpError = require("../helpers/http-errors");

/**
 * It checks if the user is already registered, if not, it hashes the password and saves the user in
 * the database
 * @param req - The request object.
 * @param res - The response object.
 * @param next - This is a function that we can call to pass control to the next middleware function.
 * @returns a function that takes in 3 parameters.
 */
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

/**
 * It checks if the user exists in the database, if it does, it checks if the password is correct, if
 * it is, it returns a success message
 * @param req - The request object.
 * @param res - The response object.
 * @param next - This is a function that we can call to pass control to the next middleware function in
 * the stack.
 * @returns The user's name and email are being returned.
 */
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

/**
 * It gets all players from the database where the Deleted column is equal to 0 and the Position1
 * column is not equal to RP or SP
 * @param req - The request object. This contains information about the HTTP request that raised the
 * event.
 * @param res - the response object
 * @param next - This is a function that we can call to pass control to the next middleware function in
 * the stack.
 */
const getAllPlayers = (req, res, next) => {

    const playerType = req.params.playerType;

    if (playerType === 'all') {
        const getPlayersQuery = "SELECT * FROM players WHERE Deleted=? AND Position1 != ? AND Position1 != ?;"
        db.query(getPlayersQuery, [0, 'RP', 'SP'], (err, response) => {
            if (err) {
                console.log({ err });
                return next(new HttpError("Error fetching data", 500));
            }

            res.json({ players: response });
        });
    }
    else {
        const getPlayersQuery = "SELECT * FROM players WHERE Deleted=? AND Position1 != ? AND Position1 != ? AND Position1 = ?;"
        db.query(getPlayersQuery, [0, 'RP', 'SP', playerType], (err, response) => {
            if (err) {
                console.log({ err });
                return next(new HttpError("Error fetching data", 500));
            }

            res.json({ players: response });
        });
    }
};

const extendedSearch = (req, res, next) => {

    const getPlayersQuery = "SELECT * FROM yearlystatsbatting WHERE PlayerRefID IN (SELECT PlayerRefID FROM players WHERE Deleted=? AND Position1 != ? AND Position1 != ?);"
    db.query(getPlayersQuery, [0, 'RP', 'SP'], (err, response) => {
        if (err) {
            console.log({ err });
            return next(new HttpError("Error fetching data", 500));
        }

        res.json({ players: response });
    });
};

const playerYearlyStatsBatting = (req, res, next) => {

    const playerRef = req.params.playerRef;

    const playerDateQuery = "SELECT FieldNameX, dictionarydata.Order FROM dictionarydata WHERE TableName='YearlyStatsBatting' AND Verify=1 ORDER BY dictionarydata.Order ASC;"
    db.query(playerDateQuery, (err, response) => {
        if (err) {
            console.log({ err });
            return next(new HttpError('Error fetching player record', 500));
        }

        const selectedColumns = response.map(column => column.FieldNameX);
        const fieldColumns = selectedColumns.join(', ');

        const playerBattingStatsQuery = `SELECT ${fieldColumns} FROM yearlystatsbatting WHERE PlayerRefID=?;`
        db.query(playerBattingStatsQuery, playerRef, (err, resp) => {
            if (err) {
                console.log({ err });
                return next(new HttpError('Error fetching player record', 500));
            }

            const injuredPlayerQuery = "SELECT * FROM injuries WHERE PlayerRefID=?;"
            db.query(injuredPlayerQuery, playerRef, (err, injuryResp) => {
                if (err) {
                    console.log({ err });
                    return next(new HttpError('Error fetching player record', 500));
                }

                if (injuryResp.length > 0) {
                    return res.json({ playerRecords: resp[0], status: 'Injured' });
                }

                const startingPlayerQuery = "SELECT * FROM todaysstarters WHERE PlayerRefID1=?;"
                db.query(startingPlayerQuery, playerRef, (err, startingResp) => {
                    if (err) {
                        console.log({ err });
                        return next(new HttpError('Error fetching player record', 500));
                    }

                    if (startingResp.length > 0) {
                        return res.json({ playerRecords: resp[0], status: 'Player is starting' });
                    }

                    const playerTeamQuery = "SELECT TeamID from players WHERE PlayerRefID=?;"
                    db.query(playerTeamQuery, playerRef, (err, teamResp) => {
                        if (err) {
                            console.log({ err });
                            return next(new HttpError('Error fetching player record', 500));
                        }

                        const notStartingQuery = "SELECT * FROM todaysgames WHERE TeamID=?;"
                        db.query(notStartingQuery, teamResp[0].TeamID, (err, notStartingResp) => {
                            if (err) {
                                console.log({ err });
                                return next(new HttpError('Error fetching player record', 500));
                            }

                            if (notStartingResp.length === 0) {
                                return res.json({ playerRecords: resp[0], status: 'Team is not playing' });
                            }

                            else {
                                return res.json({ playerRecords: resp[0], status: '' });
                            }
                        });
                    });
                });
            });

        });
    });
};

exports.registerUser = registerUser;
exports.userLogin = userLogin;
exports.getAllPlayers = getAllPlayers;
exports.playerYearlyStatsBatting = playerYearlyStatsBatting;
exports.extendedSearch = extendedSearch;