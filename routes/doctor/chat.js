var express = require("express");
var router = express.Router();
var db = require("../../database");

function getCurrentTime() {
  var current_date_time = new Date()
    .toISOString()
    .replace("T", " ")
    .substr(0, 19);
  return current_date_time;
}

router.get("/history", function (req, res, next) {
  console.log("*********CHAT HISTORY**********");
  var patient_id = req.query.patient_id;
  var doctor_id = req.query.doctor_id;

  db.query(
    `SELECT type, message, created_at FROM doctor_chat WHERE patient_id=? 
    && doctor_id=?`,
    [patient_id, doctor_id],
    function (err, results, fields) {
      if (err) {
        console.log("Error in fetch chat data : ", err);
        res.status(500).json({
          code: 100,
          message: "Unable to get chat",
        });
      } else {
        console.log(JSON.stringify(results));
        if (results.length > 0) {
          db.query(
            `UPDATE doctor_chat SET read_message=? WHERE patient_id = ? && 
            doctor_id = ? && type=? && read_message=?`,
            [1, patient_id, doctor_id, 0, 0],
            function (err, results, fields) {
              if (err) {
                console.log("Unable to update doctor_chat table : ", err);
              } else if (results.affectedRows == 0) {
                console.log(
                  "Now matching rows found to update doctor_chat table"
                );
              } else {
                console.log(results);
                console.log("Doctor chat table updated successfully");
              }
            }
          );
        }

        res.status(200).json({
          code: 200,
          data: results,
        });
      }
    }
  );
});

router.post("/send", function (req, res, next) {
  console.log("***************Send Message API****************");

  var patient_id = req.body.patient_id;
  var doctor_id = req.body.doctor_id;
  var message = req.body.message;
  var current_time = getCurrentTime();

  db.query(
    "INSERT INTO `doctor_chat` (`patient_id`, `doctor_id`, `type`, `message`, `created_at`) VALUES (?, ?, ?, ?, ?)",
    [patient_id, doctor_id, 1, message, current_time],
    function (err, results, fields) {
      if (err) {
        console.log("Unable to insert into doctor_chat table : ", err);
        res.status(500).json({
          code: 100,
          message: "Unable to send message",
        });
      } else {
        res.status(200).json({
          code: 200,
          message: "Message send successfully",
        });
      }
    }
  );
});

router.get("/receive", function (req, res, next) {
  console.log("*********CHAT Receive**********");
  var patient_id = req.query.patient_id;
  var doctor_id = req.query.doctor_id;

  db.query(
    `SELECT type, message, created_at FROM doctor_chat WHERE patient_id=? 
      && doctor_id=? && type=? && read_message=?`,
    [patient_id, doctor_id, 0, 0],
    function (err, results, fields) {
      if (err) {
        console.log("Error in fetch chat data : ", err);
        res.status(500).json({
          code: 100,
          message: "Unable to get chat",
        });
      } else {
        console.log(JSON.stringify(results));
        if (results.length > 0) {
          db.query(
            `UPDATE doctor_chat SET read_message=? WHERE patient_id = ? && 
              doctor_id = ? && type=? && read_message=?`,
            [1, patient_id, doctor_id, 0, 0],
            function (err, results, fields) {
              if (err) {
                console.log("Unable to update doctor_chat table : ", err);
              } else if (results.affectedRows == 0) {
                console.log(
                  "Now matching rows found to update doctor_chat table"
                );
              } else {
                console.log(results);
                console.log("Doctor chat table updated successfully");
              }
            }
          );
        }

        res.status(200).json({
          code: 200,
          data: results,
        });
      }
    }
  );
});

module.exports = router;
