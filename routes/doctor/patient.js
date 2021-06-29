var express = require("express");
var db = require("../../database");
var fs = require("fs");
var path = require("path");
const env = process.env.NODE_ENV || "development";
var router = express.Router();

var config = require("../../config/config.json")[env];

const PATIENT_FILE_PATH =
  "http://dotrx.in/public/images/patient_files_doctors/";

router.get("/", function (req, res, next) {
  var doctor_id = req.query.doctor_id;

  db.query(
    `SELECT p.id as patient_id, u.first_name, u.last_name, u.email,
            u.phone FROM appointments as a, patients as p, users as u 
            WHERE a.patient_id=p.id && p.user_id=u.id && a.status=1 
            && a.doctor_id=? order by p.created_at desc`,
    [doctor_id],
    function (err, results, fields) {
      if (err) {
        console.log("ERROR fetching query : ");
        console.log(err);
        res.status(400);
        res.json({
          code: 100,
          message: "Unable to fetch patient",
        });
      } else {
        console.log(results);
        res.status(200).json({
          code: 200,
          data: results,
        });
      }
    }
  );
});

router.get("/history", function (req, res, next) {
  var patient_id = req.query.patient_id;
  var user_details;
  db.query(
    `SELECT u.first_name, u.last_name, u.email, u.phone FROM patients as p, users as u WHERE p.id=? && p.user_id=u.id`,
    [patient_id],
    function (err, results, fields) {
      if (err) {
        console.log(err);
        res.status(400);
        res.json({
          code: 100,
          message: "Unable to fetch patient's history",
        });
      } else {
        user_details = results[0];
        var appointments = getPatientAppointmentsHistory(patient_id, function (
          err,
          appointments
        ) {
          user_details.appointments = appointments;
          res.status(200);
          res.json({
            code: 200,
            data: user_details,
          });
        });
      }
    }
  );
});

function getPatientAppointmentsHistory(patient_id, cb) {
  db.query(
    `SELECT a.*, p.pres_image FROM appointments as a, prescriptions as p WHERE a.patient_id=? && a.id=p.appointment_id`,
    [patient_id],
    async function (err, results, fields) {
      if (err) {
        cb(err, null);
      } else {
        var appointments = [];
        for (const result of results) {
          var obj = result;
          var img = result.pres_image;
          if (img) {
            var img_url = config.prescription + img;
            obj.pres_image = img_url;
          }

          obj.patient_files = await getPatientFiles(
            patient_id,
            obj.doctor_id,
            obj.id
          );
          console.log(obj);
          //     , function (
          //     patient_files
          //   ) {
          //     console.log(patient_files);
          //     obj.patient_files = patient_files;
          //     appointments.push(obj);
          //   });
          appointments.push(obj);
        }
        cb(null, appointments);
      }
    }
  );
}

function getPatientFiles(patient_id, doctor_id, appointment_id) {
  return new Promise(function (resolve, reject) {
    db.query(
      `SELECT pres_image FROM patient_files_doctors WHERE patient_id=? &&
             doctor_id=? && appointment_id=?`,
      [patient_id, doctor_id, appointment_id],
      function (err, results, fields) {
        if (err) {
          console.log("Error getting patient_files ", err);
          resolve([]);
        } else {
          var patient_files = [];
          for (var i = 0; i < results.length; i++) {
            var data = results[i];
            var pres_image = PATIENT_FILE_PATH + data.pres_image;
            patient_files.push(pres_image);
          }
          resolve(patient_files);
        }
      }
    );
  });
}

module.exports = router;
