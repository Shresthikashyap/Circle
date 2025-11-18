const express = require("express");

const router = express.Router();

const controller = require('../controller/admin')
const userauthentication = require('../middleware/auth');


router.get('/checkadmin/:userId/:groupId',userauthentication.authenticate,controller.checkAdmin);

router.get('/removeuser/:userId/:groupId',userauthentication.authenticate,controller.removeMember);

router.get('/makeadmin/:userId/:groupId',userauthentication.authenticate,controller.makeAdmin);

router.get('/removeadmin/:userId/:groupId',userauthentication.authenticate,controller.removeAdmin);

router.get('/deletegroup/:groupId',userauthentication.authenticate,controller.deleteGroup);

module.exports = router;