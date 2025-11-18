const express = require('express');

const router = express.Router();

const userController = require('../controller/user');

router.post('/signup?:id',userController.addUser);

router.post('/login?:id',userController.getLogin);

module.exports = router;