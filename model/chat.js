const sequelize = require('../util/database');
const Sequelize = require('sequelize');

const Message = sequelize.define('message',{

    id:{
        type:Sequelize.INTEGER,
        allowNull:false,
        autoIncrement:true,
        primaryKey:true
    },
    message:{
        type:Sequelize.TEXT,
        allowNull:false
    },
    memberName: {
        type: Sequelize.STRING,
        allowNull: false
    }
})

module.exports = Message;