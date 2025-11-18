const sequelize = require('../util/database');
const Sequelize = require('sequelize');

const ArchievedMessage = sequelize.define('archievedmessage',{

    id:{
        type:Sequelize.INTEGER,
        allowNull:false,
        autoIncrement:true,
        primaryKey:true
    },
    message:{
        type:Sequelize.STRING,
        allowNull:false
    }
})

module.exports = ArchievedMessage;