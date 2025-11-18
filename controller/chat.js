const Message = require('../model/chat');
const sequelize = require('../util/database');
const callGeminiAPI = require('../services/GeminiService');

const postGroupMessage = async(req,res) =>{
   
    try{      
     const { groupid } = req.params;
     const { id,name, message} = req.body; 

     console.log('message',message);
     console.log('group id',req.params);
     
     const messageDetails = await Message.create({message:message, memberName:name, userId:id, groupId: groupid});
     
     res.status(200).send({messageDetails});

      // Check if message starts with @gemini
      if (message.startsWith("@gemini")) {
          // Process AI response asynchronously
          processAIResponse(message, name, id, groupid, req.io);
      }
    }
    catch(error){

      console.log(error);
     res.status(500).json({error:'!!! Something went wrong'});
    }
 }
 
 const getGroupMessage = async (req, res) => {
   
     try {  
 console.log('req params',req.params);
       //  const messages = await Message.findAll({ where: { id: { [Op.gte]: id }} });  
       const messages = await sequelize.query(`SELECT * FROM Messages WHERE id > ${req.params.lastmsgid} AND groupid = ${req.params.groupid}`,{ type: sequelize.QueryTypes.SELECT });  
       
     console.log('messages',messages);
       
       if (messages.length === 0) {
         res.status(200).json({ message: `No messages found` });
       } else {
        res.status(200).json({ message: messages });
       }
     } catch (error) {
      console.log(error)
       res.status(500).json({ error: '!!! Something went wrong' });
     }
}

const processAIResponse = async (message, name, id, groupId, io) => {
    try {
        const query = message.replace("@gemini", "").trim();
        
        if (!query) {
            return; // Don't respond to empty queries
        }

        // Call Gemini API
        const aiResponse = await callGeminiAPI(query);

        // Create AI message in database
        const aiMessageDetails = await Message.create({
            message: aiResponse,
            memberName: name + ' (AI)', // Fixed: use string instead of undefined variable
            userId: id, // Use 0 or a special AI user ID
            groupId: groupId
        });

        // Emit AI response to all users in the room via socket
        if (io) {
            io.to(groupId).emit('receivedMsg', aiMessageDetails );
        }

    } catch (error) {
        console.error('AI Response Error:', error);
        
        // Send error message to group
        if (io) {
            io.to(groupId).emit('receivedMsg', {
                message: "Sorry, I encountered an error processing your request.",           
            });
        }
    }
}



module.exports = {
     postGroupMessage, getGroupMessage
}
