const GroupFiles = require('../model/GroupFiles');
const Message = require('../model/chat');
const { uploadToCloudinary } = require('../services/CloudinaryService');

const downloadFiles = async (req, res) => {
  try {
    console.log('file********', req.file);
    const file = req.file.buffer;
    const id = req.user.dataValues.id;
    const name = req.user.dataValues.name;
    const groupId = req.params.groupId;
    const fileName = `${req.file.originalname}`;
    const mimetype = req.file.mimetype;
    console.log("File Name:", req.file.mimetype);

    // Upload to Cloudinary
    const fileUrl = await uploadToCloudinary(file, fileName, mimetype);

    console.log("Cloudinary File URL:", fileUrl);

    await GroupFiles.create({ url: fileUrl, groupId: groupId });
    const msg = await Message.create({
      message: fileUrl,
      memberName: name,
      userId: id,
      groupId: groupId,
    });

    res.status(200).json({ msg, fileName, success: true });
  } catch (err) {
    console.log(err);
    res.status(500).json({ fileUrl: '', success: false, err: err });
  }
};


const getAllFiles = async (req, res) => {
    try {
        console.log(req.params.groupId)

        const allFiles = await GroupFiles.findAll({where:{groupId:req.params.groupId}});
        //const urls = allDownloads.map(download => download.url);
        //console.log("all downloads====>>>",urls);

        res.status(200).json(allFiles);   
    }
    catch (err) {
        console.log(err);
        res.status(500).json({error:'Something went wrong'});
    }
}

module.exports = {
    downloadFiles, getAllFiles
}
