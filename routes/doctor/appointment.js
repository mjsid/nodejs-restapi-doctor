var express = require("express");
var db = require("../../database");

var path = require("path");
var fs = require("fs");
const sendNotification = require("../fcm");
const { sendOTP } = require("../utils");

var router = express.Router();

function getCurrentTime() {
  var current_date_time = new Date()
    .toISOString()
    .replace("T", " ")
    .substr(0, 19);
  return current_date_time;
}

router.get("/pending", function (req, res, next) {
  var doctor_id = req.query.doctor_id;

  db.query(
    `SELECT a.id as appointment_id, a.patient_id, a.opd_date, a.voice, 
            a.video, a.text, a.problem, a.created_at, u.first_name, u.last_name 
            FROM appointments as a, patients as p, users as u 
            WHERE a.patient_id=p.id && p.user_id=u.id && a.status=0 
            && a.doctor_id=? order by a.opd_date desc`,
    [doctor_id],
    function (err, results, fields) {
      if (err) {
        console.log("ERROR fetching query : ");
        console.log(err);
        res.status(500);
        res.json({
          code: 100,
          message: "Unable to fetch appointment",
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

router.get("/confirm", function (req, res, next) {
  var doctor_id = req.query.doctor_id;

  db.query(
    `SELECT a.id as appointment_id,  a.patient_id, a.opd_date, a.voice,
            a.video, a.text, a.problem, a.created_at, u.first_name, u.last_name, u.phone FROM appointments as a, patients as p, users as u 
            WHERE a.patient_id=p.id && p.user_id=u.id && a.status=4 
            && a.doctor_id=? order by a.opd_date desc;`,
    [doctor_id],
    function (err, results, fields) {
      if (err) {
        console.log("ERROR fetching query : ");
        console.log(err);
        res.status(500);
        res.json({
          code: 100,
          message: "Unable to confirm appointment",
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

router.post("/accept", function (req, res, next) {
  var appointment_id = req.query.appointment_id;
  var current_date = getCurrentTime();
  db.query(
    `UPDATE appointments SET status=2, updated_at=? WHERE id=?`,
    [current_date, appointment_id],
    async function (err, results, fields) {
      if (err) {
        console.log("ERROR fetching query : ");
        console.log(err);
        res.status(500);
        res.json({
          code: 100,
          message: "Unable to accept appointment",
        });
      } else {
        console.log(results);
        if (results.affectedRows == 0) {
          res.status(200).json({
            code: 100,
            message: "Unable to accept the appointment",
          });
        } else {
          try {
            var response = await db.query(
              `SELECT p.user_id, a.opd_date, a.doctor_id, p.id
              FROM appointments as a, patients as p
              WHERE a.id = ? && p.id = a.patient_id`,
              [appointment_id]
            );
            console.log(response);

            var doctor_details = await db.query(
              `SELECT u.first_name, u.last_name FROM doctors as d, users as u WHERE d.id = ? && d.user_id = u.id`,
              [response[0].doctor_id]
            );
            console.log(doctor_details);

            var patient_details = await db.query(
              `SELECT u.id, u.device_id FROM patients as p, users as u WHERE p.id = ? && p.user_id = u.id`,
              [response[0].id]
            );
            console.log(patient_details);
            const device_id = patient_details[0].device_id;
            const notification_description =
              "Your booking has been confirmed for " +
              response[0].opd_date +
              " by " +
              doctor_details[0].first_name +
              " " +
              doctor_details[0].last_name;
            var notificationData = await db.query(
              `INSERT INTO notifications (user_id, notification_type,	notification_description, created_at, updated_at) 
              VALUES (?, ?, ?, ?, ?)`,
              [
                patient_details[0].id,
                "doctor_booking",
                notification_description,
                getCurrentTime(),
                getCurrentTime(),
              ]
            );
            if (device_id) {
              sendNotification(
                "Consultation confirmed",
                notification_description,
                device_id
              );
            }
            console.log(notificationData);
            res.status(200).json({
              code: 200,
              data: {
                status:
                  "Appointment booking done, waiting from customer's Payment",
              },
            });
          } catch (err) {
            console.log(
              "Error while inserting into notifications table ${err} :",
              err
            );
            res.status(200).json({
              code: 100,
              data: {
                status: "Appointment accepted but sending notification failed",
              },
            });
          }
        }
      }
    }
  );
});

router.post("/reject", function (req, res, next) {
  var appointment_id = req.query.appointment_id;
  var current_date = getCurrentTime();
  db.query(
    `UPDATE appointments SET status=3, updated_at=? WHERE id=?`,
    [current_date, appointment_id],
    function (err, results, fields) {
      if (err) {
        console.log("ERROR fetching query : ");
        console.log(err);
        res.status(500);
        res.json({
          code: 100,
          message: "Unable to reject appointment",
        });
      } else {
        console.log(results);
        if (results.affectedRows == 0) {
          res.status(200).json({
            code: 100,
            message: "Unable to reject the appointment",
          });
        } else {
          db.query(
            `SELECT u.phone 
            FROM users as u, `,
            [current_date, appointment_id],
            function (err, results, fields) {
              if (err) {
                console.log("ERROR fetching query : ", err);
                res.status(500).json({
                  code: 100,
                  message: "Unable to fetch data",
                });
              } else {
              }
            }
          );
          res.status(200).json({
            code: 200,
            data: { status: "Appointed rejected" },
          });
        }
      }
    }
  );
});

router.post("/complete", function (req, res, next) {
  var appointment_id = req.body.appointment_id;
  var patient_id = req.body.patient_id;
  var doctor_id = req.body.doctor_id;
  var prescription = req.body.prescription || null;

  console.log("Prescription :", prescription);
  if (!prescription) {
    res.status(200);
    res.json({
      code: 100,
      message: "Prescription is missing",
    });
  }
  var img_directory = path.resolve(
    __dirname,
    "../../../../public_html/public/images/prescription"
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

  console.log(getCurrentTime());
  console.log(img_name);

  var image_path = path.join(img_directory, img_name);
  console.log(image_path);
  var buff_img = Buffer.from(prescription, "base64");
  fs.writeFile(image_path, buff_img, (err) => {
    if (err) {
      res.status(500);
      res.json({
        code: 100,
        message: "Unable to update prescription",
      });
    }
    var current_date = getCurrentTime();
    //update prescription in prescription table
    db.query(
      "INSERT INTO prescriptions (`appointment_id`, `patient_id`, `doctor_id`, `pres_image`, `created_at`, `updated_at`) VALUES(?,?,?,?,?,?)",
      [
        appointment_id,
        patient_id,
        doctor_id,
        img_name,
        current_date,
        current_date,
      ],
      function (err, results, fields) {
        if (err) {
          console.log(err);
          res.status(500);
          res.json({
            code: 100,
            message: "Unable to update prescription",
          });
        } else {
          console.log("Prescription updated");
          db.query(
            `UPDATE appointments SET status=1, updated_at=? WHERE id=?`,
            [current_date, appointment_id],
            async function (err, results, fields) {
              if (err) {
                console.log("ERROR fetching query : ");
                console.log(err);
                res.status(500);
                res.json({
                  code: 100,
                  message: "Unable to complete appointment",
                });
              } else {
                console.log(results);
                if (results.affectedRows == 0) {
                  res.status(200).json({
                    code: 100,
                    message: "Unable to update the appointment completion",
                  });
                } else {
                  try {
                    var doctor_details = await db.query(
                      `SELECT u.first_name, u.last_name FROM doctors as d, users as u WHERE d.id = ? && d.user_id = u.id`,
                      [doctor_id]
                    );
                    console.log(doctor_details);

                    var patient_details = await db.query(
                      `SELECT u.id, u.device_id FROM patients as p, users as u WHERE p.id = ? && p.user_id = u.id`,
                      [patient_id]
                    );
                    const device_id = patient_details[0].device_id;
                    const notification_description = `Your prescription from ${doctor_details[0].first_name} ${doctor_details[0].last_name} is ready.`;
                    var notificationData = await db.query(
                      `INSERT INTO notifications (user_id, notification_type,	notification_description, created_at, updated_at) 
                      VALUES (?, ?, ?, ?, ?)`,
                      [
                        patient_details[0].id,
                        "doctor_booking_ done",
                        notification_description,
                        getCurrentTime(),
                        getCurrentTime(),
                      ]
                    );
                    console.log(notificationData);
                    if (device_id) {
                      sendNotification(
                        "Prescription Uploaded",
                        notification_description,
                        device_id
                      );
                    }
                    var pres_amount = await db.query(
                      `SELECT amount FROM appointments WHERE id = ? `,
                      [appointment_id]
                    );
                    pres_amount = pres_amount[0].amount;
                    console.log(pres_amount);

                    var doctor_commission = await db.query(
                      `SELECT doctor_commission 
                      FROM users_commission 
                      LIMIT 1`
                    );
                    doctor_commission = doctor_commission[0].doctor_commission;
                    console.log(doctor_commission);

                    var payable_amount =
                      pres_amount - (pres_amount * doctor_commission) / 100;

                    var commissionData = await db.query(
                      `INSERT INTO commission_history (model_id, department_id,	patient_id,
                        relevant_table_id, total_amount, commission_percentage, payable_amount, 
                        created_at) 
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                      [
                        doctor_id,
                        2,
                        patient_id,
                        appointment_id,
                        pres_amount,
                        doctor_commission,
                        payable_amount,
                        getCurrentTime(),
                      ]
                    );
                    console.log(commissionData);

                    res.status(200).json({
                      code: 200,
                      data: { status: "Appointment completed" },
                    });
                  } catch (err) {
                    console.log(
                      "Error while inserting into notifications table ${err} :",
                      err
                    );
                    res.status(200).json({
                      code: 100,
                      data: {
                        status: "Appointment completed with errors",
                      },
                    });
                  }
                }
              }
            }
          );
        }
      }
    );
  });
});

router.get("/awaiting_payment", function (req, res, next) {
  var doctor_id = req.query.doctor_id;

  db.query(
    `SELECT a.id as appointment_id, a.patient_id, a.opd_date, a.voice, 
            a.video, a.text, a.problem, a.created_at, u.first_name, u.last_name 
            FROM appointments as a, patients as p, users as u 
            WHERE a.patient_id=p.id && p.user_id=u.id && a.status=2 
            && a.doctor_id=? order by a.opd_date desc`,
    [doctor_id],
    function (err, results, fields) {
      if (err) {
        console.log("ERROR fetching query : ");
        console.log(err);
        res.status(500);
        res.json({
          code: 100,
          message: "Unable to fetch appointment",
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
module.exports = router;
