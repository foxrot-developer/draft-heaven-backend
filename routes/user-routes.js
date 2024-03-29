const express = require('express');
const { check } = require('express-validator');

const userController = require('../controllers/user-controller');
const router = express.Router();

router.get('/all-players/:playerType', userController.getAllPlayers);

router.get('/extended-search', userController.extendedSearch);

router.get('/player-yearly-stats-batting/:playerRef', userController.playerYearlyStatsBatting);

router.post('/register', [
    check('name').not().isEmpty(),
    check('password').not().isEmpty(),
    check('email').not().isEmpty(),
], userController.registerUser);

router.post('/login', [
    check('password').not().isEmpty(),
    check('email').not().isEmpty(),
], userController.userLogin);

module.exports = router;