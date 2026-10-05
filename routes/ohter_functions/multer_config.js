const multer = require("multer");
const moment = require("moment");

function multerConf(type) {
  try {
    const storage = multer.diskStorage({
      destination: function (req, file, cb) {
        cb(null, "public/uploads/");
      },
      filename: function (req, file, cb) {
        console.log(req.file);

        var date = new Date();
        const formattedDate = moment(date).format("DD-MM-YYYY");

        var extention = file.originalname.split(".")[1];
        cb(null, `${formattedDate}_${type}_invoice.${extention}`);
      },
    });

    const upload = multer({
      storage: storage,
      limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB limit
    });
    return upload;
  } catch (error) {
    console.log(error);
  }
}

module.exports = multerConf;
