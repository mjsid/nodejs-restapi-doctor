var express = require("express");
var db = require("../../database");
var router = express.Router();
var { getCurrentTime } = require("../utils");

var fs = require("fs");
var path = require("path");
const env = process.env.NODE_ENV || "development";
var config = require("../../config/config.json")[env];

function getCurrentTime() {
  var current_date_time = new Date()
    .toISOString()
    .replace("T", " ")
    .substr(0, 19);
  return current_date_time;
}

router.get("/confirmed", function (req, res, next) {
  var user_id = req.query.user_id;

  db.query(
    `SELECT a.id as appointment_id, a.doctor_id, a.opd_date, a.voice, a.video, a.text, a.problem, a.created_at, 
    CONCAT(u.first_name, " ", u.last_name) as doctor_name, s.price, u.phone
    FROM appointments as a, doctors as d, users as u, schedules as s 
    WHERE a.patient_id= ? && a.doctor_id=d.id && d.user_id=u.id 
    && s.doctor_id=d.id && a.status=4 order by a.opd_date`,
    [user_id],
    function (err, results, fields) {
      if (err) {
        console.log("ERROR fetching query : ");
        console.log(err);
        res.status(500).json({
          code: 100,
          message: "Unable to fetch data",
        });
      } else if (results.length > 0) {
        console.log(results);

        res.status(200).json({
          code: 200,
          data: results,
        });
      } else {
        console.log(results);
        res.status(200).json({
          code: 200,
          message: "No Data Available",
          data: [],
        });
      }
    }
  );
});

router.get("/booked", async function (req, res, next) {
  var user_id = req.query.user_id;
  try {
    var bookedData = await db.query(
      `SELECT a.id as appointment_id, DATE_FORMAT(a.opd_date, "%Y-%m-%dT%T.000Z") as opd_date, a.voice, a.video, a.text, a.amount, a.problem, a.created_at, a.status, 
    CONCAT(u.first_name, " ", u.last_name) as doctor_name 
    FROM appointments as a, doctors as d, users as u 
    WHERE a.patient_id = ? && a.doctor_id=d.id && d.user_id=u.id && a.status IN (?) order by a.opd_date`,
      [user_id, [0, 2, 3]]
    );
    console.log(bookedData);
    if (bookedData.length > 0) {
      for (var i = 0; i < bookedData.length; i++) {
        if (bookedData[i].amount == null) {
          bookedData[i].amount = 0;
        }
      }
      console.log(bookedData);
      res.status(200).json({
        code: 200,
        data: bookedData,
      });
    } else {
      res.status(200).json({
        code: 100,
        message: "No Data Available",
        data: [],
      });
    }
  } catch (error) {
    res.status(500).json({
      code: 100,
      message: "Error Occurred ",
    });
    console.log(error);
    throw new Error(error);
  }
});

router.get("/history", function (req, res, next) {
  var user_id = req.query.user_id;

  db.query(
    `SELECT a.id as appointment_id, a.doctor_id, a.opd_date, a.problem, a.created_at, 
    CONCAT(u.first_name, " ", u.last_name) as doctor_name, p.pres_image 
    FROM appointments as a, doctors as d, users as u, prescriptions as p 
    WHERE a.patient_id = ? && a.doctor_id=d.id && d.user_id=u.id 
    && p.appointment_id=a.id && a.status=1 order by a.opd_date desc;`,
    [user_id],
    function (err, results, fields) {
      if (err) {
        console.log("ERROR fetching query : ");
        console.log(err);
        res.status(500).json({
          code: 100,
          message: "Unable to fetch data",
        });
      } else if (results.length > 0) {
        console.log(results);
        var data = results;
        for (var i = 0; i < data.length; i++) {
          var img = data[i].pres_image;
          if (img) {
            data[i].pres_image = config.prescription + img;
          } else {
            data[i].image = "http://dotrx.in/images/no-image.png";
          }
        }
        res.status(200).json({
          code: 200,
          data: data,
        });
      } else {
        console.log(results);
        res.status(200).json({
          code: 200,
          message: "No Data Available",
          data: [],
        });
      }
    }
  );
});

router.post("/uploadfile", function (req, res, next) {
  var appointment_id = req.body.appointment_id;
  var patient_id = req.body.patient_id;
  var doctor_id = req.body.doctor_id;
  var pres_image = req.body.pres_image || null;
  var created_at = getCurrentTime();
  var updated_at = getCurrentTime();

  if (!pres_image) {
    console.log("Prescription is missing");
    res.status(200).json({
      code: 100,
      message: "Prescription is missing",
    });
  } else {
    var img_directory = path.resolve(
      __dirname,
      "../../../../public_html/public/images/patient_files_doctors"
    );

    var img_name =
      getCurrentTime().replace(/ /g, "_").replace(/:/g, "_") +
      "_" +
      appointment_id +
      "_" +
      patient_id +
      "_" +
      doctor_id +
      ".jpg";

    var image_path = path.join(img_directory, img_name);
    console.log(image_path);

    var buff_img = Buffer.from(pres_image, "base64");

    fs.writeFile(image_path, buff_img, (err) => {
      if (err) {
        res.status(500);
        res.json({
          code: 100,
          message: "Unable to update prescription",
        });
      } else {
        console.log("Prescription saved successfully ");
        db.query(
          `INSERT INTO patient_files_doctors 
                (appointment_id, patient_id, doctor_id, pres_image, created_at, updated_at) 
                VALUES (?, ?, ?, ?, ?, ?)`,
          [
            appointment_id,
            patient_id,
            doctor_id,
            img_name,
            created_at,
            updated_at,
          ],
          function (err, results, fields) {
            if (err) {
              console.log("ERROR in inserting query : ");
              console.log(err);
              res.status(500).json({
                code: 100,
                message: "Unable to insert data",
              });
            } else {
              console.log(results);
              res.status(200).json({
                code: 200,
                message: "Data updated successfully",
              });
            }
          }
        );
      }
    });
  }
});

module.exports = router;
