var express = require("express");
var router = express.Router();
var db = require("../../database");
var { getCurrentTime } = require("../utils");

router.post("/", function (req, res, next) {
  console.log("*************Rate Doctor API*****************");
  var patient_id = req.body.patient_id;
  var doctor_id = req.body.doctor_id;
  var rating = req.body.rating;
  var description = req.body.description;

  db.query(
    "INSERT INTO `reviews` (`patient_id`, `doctor_id`, `rating`, `description`, `created_at`, `updated_at`) VALUES (?, ?, ?, ?, ?, ?)",
    [
      patient_id,
      doctor_id,
      parseInt(rating),
      description,
      getCurrentTime(),
      getCurrentTime(),
    ],
    function (err, results, fields) {
      if (err) {
        console.log("Unable to update ratings :", err);
        res.status(500).json({
          code: 100,
          message: "Unable to update rating",
        });
      } else {
        res.status(200).json({
          code: 200,
          message: "Rating updated successfully",
        });
      }
    }
  );
});

router.post("/medicine", function (req, res, next) {
  console.log("*************Rate Doctor API*****************");
  var patient_id = req.body.patient_id;
  var medicine_id = req.body.medicine_id;
  var rating = req.body.rating;
  var description = req.body.description;

  db.query(
    "INSERT INTO `medicine_ratings` (`patient_id`, `medicine_id`, `rating`, `description`, `status`, `created_at`, `updated_at`) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [
      patient_id,
      medicine_id,
      parseInt(rating),
      description,
      1,
      getCurrentTime(),
      getCurrentTime(),
    ],
    function (err, results, fields) {
      if (err) {
        console.log("Unable to update ratings :", err);
        res.status(500).json({
          code: 100,
          message: "Unable to update rating",
        });
      } else {
        res.status(200).json({
          code: 200,
          message: "Rating updated successfully",
        });
      }
    }
  );
});

module.exports = router;
