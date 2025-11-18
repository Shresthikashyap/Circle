const UserGroup = require('../model/UserGroup');
const Group = require('../model/group');
const User = require('../model/user');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken'); 
const sequelize = require('../util/database');

exports.addUser = async(req, res) => {
  const t = await sequelize.transaction();
  try{
      const { groupId } = req.query;
      console.log('signing in group id from query', groupId)

      const {name, email, password }= req.body;

      if(name === 'undefined' || email === 'undefined' || password=== 'undefined'){
        res.status(500).json({error:"Something went wrong"});
      }

      if(password.length < 6){
        return res.status(400).json({ error: 'Password should be at least 6 characters long' });
      }

      const user = await User.findOne({ where: { email } },{transaction: t});

      if (user) {
        return res.status(400).json({ error: 'User already exists' });
      } 

     console.log(req.body)
      const hashedPassword = await bcrypt.hash(password, 10); 
      
      const newUser = await User.create({name: name, email: email, password: hashedPassword},{transaction: t});
      
      console.log('*******new user',newUser.dataValues.id)
      
      let groupDetails=null;
      if(groupId !== undefined){
         await UserGroup.create({isAdmin:false, userId: newUser.dataValues.id, groupId: groupId},{transaction: t})
         groupDetails = await Group.findByPk(groupId);
         console.log('Group details',groupDetails);
      }

      console.log(newUser.dataValues);
      const payload = newUser.dataValues;
      const token = jwt.sign(payload,process.env.SECRET_KEY)
      
      await t.commit();
      res.status(201).json({ name, groupDetails, token });
      
  }
  catch(err){
      await t.rollback();   
          console.log(err);
          res.status(500).json({ error: 'Something went wrong' });     
    }
}

exports.getLogin = async(req,res) => {
  const t = await sequelize.transaction();

  try{
    console.log('req ***********',req.query);
    const { groupId } = req.query;

    const {email, password} = req.body;

    if (email==='undefined' || password === 'undefined') {
      return res.status(500).json({ error: 'User not found' });
    }

    const user  = await User.findOne({where:{email},transaction:t})
    if (!user) {
    await t.rollback();
    return res.status(404).json({error:'User not found'});
}
    const name = user.dataValues.name;
    //console.log('user id', user)
    //if(!user) { return res.status(404).json({error:'User not found'})}

    let groupDetails = null;
    if(groupId !== undefined){
      
      console.log(user.dataValues.id, groupId);
      await UserGroup.create({isAdmin:false, userId: user.dataValues.id, groupId: groupId});
      groupDetails = await Group.findByPk(groupId);
      console.log('Group details',groupDetails);
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
        await t.rollback();
        return res.status(401).json({error:'User not authorized'});
    }

    const payload = user.dataValues;
    const token = jwt.sign(payload,process.env.SECRET_KEY);
    
    await t.commit();
    res.status(200).json({name,groupDetails,token:token})
  }
  catch(err){
       console.log(err);
       await t.rollback();
       res.status(500).json({error:'Something went wrong'});
  }
}
