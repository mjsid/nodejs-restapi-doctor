var express = require("express");
var router = express.Router();
var db = require("../../database");
var sendNotification = require("../fcm");
var { getCurrentTime } = require("../utils");

router.post("/book", (req, res, next) => {
  console.log("***************Appointment book API");

  var patient_id = req.body.patient_id;
  var doctor_id = req.body.doctor_id;
  var department_id = req.body.department_id;
  var opd_date = req.body.opd_date;
  var voice = req.body.voice;
  var video = req.body.video;
  var text = req.body.text;
  var problem = req.body.problem;
  var medical_history = req.body.medical_history;
  var current_date_time = getCurrentTime();

  db.query(
    `SELECT price FROM schedules WHERE doctor_id = ?`,
    [doctor_id],
    function (err, results, fields) {
      if (err) {
        console.log("Unable to get price from schedules : ", err);
        res.status(500).json({
          code: 100,
          message: "Unable to get price from schedules",
        });
      } else if (results.length > 0) {
        console.log(results);
        var price = results[0].price;

        db.query(
          "INSERT INTO `appointments` (`patient_id`, `doctor_id`, `department_id`, `amount`, `opd_date`, `voice`, `video`, `text`, `status`, `problem`, `medical_history`, `created_at`, `updated_at`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [
            patient_id,
            doctor_id,
            department_id,
            price,
            opd_date,
            voice,
            video,
            text,
            0,
            problem,
            medical_history,
            current_date_time,
            current_date_time,
          ],
          function (err, results, fields) {
            if (err) {
              console.log("Unable to book appointment : ", err);
              res.status(500).json({
                code: 100,
                message: "Unable to book appointment",
              });
            } else if (results.insertId > 0) {
              console.log(results);
              db.query(
                `SELECT u.first_name, u.last_name, u.device_id as doctor_device_id
                FROM users as u, doctors as d
                WHERE d.id = ? && u.id = d.user_id`,
                [doctor_id],
                (err, results, fields) => {
                  if (err) {
                    console.log(
                      "Doctor booked, failed to get doctor name : ",
                      err
                    );
                    res.status(500).json({
                      code: 100,
                      message: "Doctor booked, failed to get doctor name",
                    });
                  } else if (results.length > 0) {
                    console.log(results);
                    var doctor_name = `${results[0].first_name} ${results[0].last_name}`;
                    var doctor_message = `You have booked ${doctor_name} for consultation on ${opd_date}`;
                    var doctor_device_id = results[0].doctor_device_id;
                    console.log(`Doctor booked. ${doctor_message} `);

                    db.query(
                      `SELECT u.id, u.first_name, u.last_name, u.device_id FROM users as u, patients as p
                      WHERE p.id = ? && p.user_id = u.id`,
                      [patient_id],
                      (err, results, fields) => {
                        if (err) {
                          console.log(
                            "Doctor booked, error in notification : ",
                            err
                          );
                          res.status(500).json({
                            code: 100,
                            message: "Doctor booked, error in notification",
                          });
                        } else if (results.length > 0) {
                          console.log(results);
                          const device_id = results[0].device_id;
                          const patient_name = `${results[0].first_name} ${results[0].last_name}`;
                          const patient_message = `Patient ${patient_name} has booked an appointment with you on ${opd_date}`;
                          db.query(
                            `INSERT INTO notifications (user_id, notification_type,	notification_description, created_at, updated_at) 
                            VALUES (?, ?, ?, ?, ?)`,
                            [
                              results[0].id,
                              "doctor_booking",
                              doctor_message,
                              current_date_time,
                              current_date_time,
                            ],
                            (err, results, fields) => {
                              if (err) {
                                console.log(
                                  "Doctor booked, error in notification : ",
                                  err
                                );
                                res.status(500).json({
                                  code: 100,
                                  message:
                                    "Doctor booked, error in notification",
                                });
                              } else if (results.insertId > 0) {
                                if (device_id) {
                                  sendNotification(
                                    "Doctor Consultation Book",
                                    doctor_message,
                                    device_id
                                  );
                                }
                                if (doctor_device_id) {
                                  sendNotification(
                                    "Consultation Booking",
                                    patient_message,
                                    doctor_device_id
                                  );
                                }
                                console.log(
                                  "Doctor booked, notification sent successfully"
                                );
                                res.status(200).json({
                                  code: 200,
                                  message: doctor_message,
                                });
                              } else {
                                console.log(results);
                                console.log(
                                  "Doctor booked, unable to add notification"
                                );
                                res.status(200).json({
                                  code: 100,
                                  message:
                                    "Doctor booked, unable to add notification",
                                });
                              }
                            }
                          );
                        } else {
                          console.log(results);
                          console.log(
                            "Doctor booked, unable to get user details"
                          );
                          res.status(200).json({
                            code: 100,
                            message:
                              "Doctor booked, unable to get user details",
                          });
                        }
                      }
                    );
                  } else {
                    console.log(results);
                    console.log("Doctor booked, unable to get doctor details");
                    res.status(200).json({
                      code: 100,
                      message: "Doctor booked, unable to get doctor details",
                    });
                  }
                }
              );
            } else {
              console.log(results);
              res.status(200).json({
                code: 100,
                message: "Appointment was not booked",
              });
            }
          }
        );
      } else {
        res.status(200).json({
          code: 100,
          message: "Doctor price not available in schedule",
        });
      }
    }
  );
});

module.exports = router;
