const UserGroup = require('../model/UserGroup');
const Group = require('../model/group')
const User = require('../model/user');

const createGroup = async(req,res) =>{

   try{      
    console.log('new group ',req.body);
    console.log('user ki id',req.params)
    const userid = req.params.id;
    const { groupName } = req.body;

    const newGroup= await Group.build({groupName: groupName, userId: userid});
    const newGroupDetails = await newGroup.save();

    await UserGroup.create({isAdmin:true, userId:req.params.id, groupId:newGroup.dataValues.id})

    res.status(200).send({newGroupDetails});
   }
   catch(error){
    console.log(error);
    res.status(500).json({error:'!!! Something went wrong'});
   }
}

const getMembers = async(req,res) =>  {
    try{
        console.log(req.body)
        const {groupId} = req.params;
        console.log('admin groupId ', groupId);

        const userIdList = await UserGroup.findAll({where:{groupId: groupId}});
     
        let memberList = [];
        for (let i = 0; i < userIdList.length; i++) {
            const item = userIdList[i];
            console.log('User ID:', item.dataValues.userId);
            let userId = item.dataValues.userId;
        
            if(userId !== null){  
                const user = await User.findByPk(userId); 
                //console.log(user);    
                memberList.push(user);
                //console.log('member list ***** ',memberList)
            } 
        }
       // console.log('groupList',memberList);
        res.status(200).json({list:memberList});
    }
    catch(err){
        res.status(500).json({error:'Something went wrong'})
    }
}

const getUsersGroupList = async(req,res) => {
    try{
        const {id} = req.params;
        console.log('User id for group list ',req.params)

        const groupIdList = await UserGroup.findAll({where:{userId :id}});
        //console.log('groupList',groupIdList);
    
        let groupList = [];
        for (let i = 0; i < groupIdList.length; i++) {
            const item = groupIdList[i];
           
            let groupId = item.dataValues.groupId;
        
            if(groupId !== null){  
                const group = await Group.findByPk(groupId); 
                //console.log(group) ;    
                groupList.push(group);
                //console.log('group list ***** ',groupList)
            } 
        }

        console.log('groupList',groupList);
        res.status(200).json({list:groupList});
    }
    catch(error){
        console.log(error);
        res.status(500).json({error:'Something went Wrong'});
    }
}


const exitGroup = async(req,res) => {
 
    try{
        const {userId} = req.params;
        const {groupId} = req.params;
        console.log(userId, groupId);

        await UserGroup.destroy({where:{groupId:groupId, userId: userId}});

        res.status(200).json({message:`You are removed successfully`});
    }
    catch(err){
        console.log(err);
        res.status(500).json({error:`Something went wrong`}) ;     
    }
}

module.exports = {
    createGroup, getUsersGroupList, getMembers, exitGroup
}
