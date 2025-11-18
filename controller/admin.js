const UserGroup = require('../model/UserGroup');
const User = require('../model/user');
const Group = require('../model/group');
const sequelize = require('../util/database');

const checkAdmin = async(req,res) => {
    try{
        const {userId, groupId} = req.params;
        console.log(userId, groupId);   
        
        const admin = await UserGroup.findOne({where:{userId:userId, groupId:groupId}});
        console.log('check admin',admin);

        //const adminId = await Group.findOne({where:{id:groupId}});
        
        res.status(200).json({admin});

    }
    catch(err){
        console.log(err);
        res.status(500).json({error:`Something went wrong`})
    }
}

const removeMember = async(req,res) => {
    try{
        const { userId , groupId} = req.params;
        console.log(userId, groupId);

        await UserGroup.destroy({where:{userId: userId, groupId: groupId}});

        res.status(200).json({message: `removed successfully`});
    }
    catch(err){
        console.log(err);
        res.status(500).json({error:`Something went wrong`})
    }
}

const makeAdmin = async(req,res) => {
    try{
        const { userId, groupId } = req.params;
        console.log('change admin',userId,groupId); 
    
       const usergroup = await UserGroup.findOne({where:{userId:userId,groupId:groupId}});

        const admin = await usergroup.update({isAdmin:true});
         
        res.status(200).json({admin, message: `successful`});
    }
    catch(err){
        console.log(err);
        res.status(500).json({error:`Something went wrong`})
    }
}

const removeAdmin = async(req,res) => {
    try{
        const { userId, groupId } = req.params;
        console.log('change admin',userId,groupId); 

        const usergroup = await UserGroup.findOne({where:{userId:userId,groupId:groupId}});

        const admin = await usergroup.update({isAdmin:false});
         
        res.status(200).json({admin, message: `successful`});
    }
    catch(err){
        console.log(err);
        res.status(500).json({error:`Something went wrong`})
    }
}

const deleteGroup = async(req,res) => {
    const t = await sequelize.transaction();
    try{
        const {groupId} = req.params;
        console.log(groupId);

        await UserGroup.destroy({where:{groupId:groupId}},{trensaction:t});
        await Group.destroy({where:{id:groupId}},{transaction:t});

        t.commit();
        res.status(200).json({message:`deleted successfully`});
    }
    catch(err){
        console.log(err);
        t.rollback();
        res.status(500).json({error:`Something went wrong`}) ;     
    }
}

module.exports = {
    checkAdmin, removeMember, makeAdmin, removeAdmin, deleteGroup
}
