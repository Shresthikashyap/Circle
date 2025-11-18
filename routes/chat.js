const express = require("express");

const router = express.Router();

const controller = require('../controller/chat')
const userauthentication = require('../middleware/auth');


router.get('/get-message/:lastmsgid/:groupid',userauthentication.authenticate,controller.getGroupMessage);

router.post('/post-message/:groupid',userauthentication.authenticate,controller.postGroupMessage);

module.exports = router;