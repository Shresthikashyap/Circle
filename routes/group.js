const express = require('express');

const router = express.Router();

const userauthentication = require('../middleware/auth');
const controller = require('../controller/group');

router.post('/new-group/:id',userauthentication.authenticate,controller.createGroup);

router.get('/group-list/:id',userauthentication.authenticate,controller.getUsersGroupList);

router.get('/memberlist/:groupId',userauthentication.authenticate,controller.getMembers);

router.get('/exitgroup/:userId/:groupId',userauthentication.authenticate,controller.exitGroup);



module.exports = router;