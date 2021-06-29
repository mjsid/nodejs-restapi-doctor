var express = require("express");
var router = express.Router();
var db = require("../../database");
var path = require("path");
var fs = require("fs");
var { getCurrentTime } = require("../utils");
var sendNotification = require("../fcm");

router.post("/upload", function (req, res, next) {
  console.log("*************Upload prescription API**************");
  var user_id = req.body.user_id;
  var image = req.body.image;
  var buff_img = Buffer.from(image, "base64");
  var image_name =
    getCurrentTime().replace(/ /g, "_").replace(/:/g, "_") + ".jpg";
  db.query(
    "INSERT INTO media (`model_id`, `collection_name`, `file_name`, `created_at`, `updated_at`) VALUES (?, ?, ?, ?, ?)",
    [
      user_id,
      "patient_prescription",
      image_name,
      getCurrentTime(),
      getCurrentTime(),
    ],
    function (err, results, fields) {
      if (err) {
        console.log("Unable to upload prescription : ", err);
        res.status(500).json({
          code: 100,
          message: "Unable to upload prescription",
        });
      } else {
        console.log(results);
        var media_id = results.insertId;
        var image_directory = path.join(
          path.resolve(
            __dirname,
            "../../../../public_html/public/uploads/prescriptions"
          ),
          media_id.toString()
        );
        console.log("Image Directory : ", image_directory);
        if (!fs.existsSync(image_directory)) {
          fs.mkdirSync(image_directory);
        }
        var image_path = path.join(image_directory, image_name);
        console.log("Prescription path : ", image_path);
        fs.writeFile(image_path, buff_img, async function (err) {
          if (err) {
            res.status(500);
            res.json({
              code: 100,
              message: "Unable to save prescription",
            });
          } else {
            try {
              var patient_details = await db.query(
                `SELECT u.id, u.device_id FROM patients as p, users as u WHERE p.id = ? && p.user_id = u.id`,
                [user_id]
              );
              console.log(patient_details);
              const device_id = patient_details[0].device_id;
              sendNotification(
                "Prescription uploaded",
                "Your Prescription has been uploaded successfully, our pharmacists will process the order and you will be notified soon",
                device_id
              );
              var notificationData = await db.query(
                `INSERT INTO notifications (user_id, notification_type,	notification_description, created_at, updated_at) 
                VALUES (?, ?, ?, ?, ?)`,
                [
                  patient_details[0].id,
                  "prescription_uploaded_by_doctor",
                  "Prescription uploaded successfully.",
                  getCurrentTime(),
                  getCurrentTime(),
                ]
              );
              console.log(notificationData);
              res.status(200).json({
                code: 200,
                message: "Prescription uploaded successfully",
              });
            } catch (err) {
              console.log(
                "Error while inserting into notifications table ${err} :",
                err
              );
              res.status(200).json({
                code: 100,
                message:
                  "Prescription uploaded successfully but sending notification failed.",
              });
            }
          }
        });
      }
    }
  );
});

module.exports = router;
