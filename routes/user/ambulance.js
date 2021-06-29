var express = require("express");
var router = express.Router();
var db = require("../../database");
var { getCurrentTime } = require("../utils");
var sendNotification = require("../fcm");

const AMBULANCE_IMAGE = "http://dotrx.in/public/images/ambulance/";
const NO_IMAGE = "http://dotrx.in/images/no-image.png";

router.get("/list", (req, res, next) => {
  console.log("**********************Ambulance list api*************");
  console.log(req.query);
  var lat = req.query.lat || null;
  var long = req.query.long || null;
  db.query(
    `SELECT a.id as ambulance_id, a.vehicle_number, a.vehicle_model as ambulance_title, a.image, a.amenities,
    a.price, at.title as type FROM ambulances as a, ambulance_type as at WHERE a.is_available=? && a.vehicle_type=at.title order by a.updated_at DESC `,
    [1],
    async (err, results, fields) => {
      if (err) {
        console.log("Unable to get ambulance list ", err);
        res.status(500).json({
          code: 100,
          message: "Unable to get ambulance",
        });
      } else {
        console.log(results);

        for (var i = 0; i < results.length; i++) {
          if (results[i].image) {
            results[i].image = AMBULANCE_IMAGE + "/" + results[i].image;
          } else {
            results[i].image = NO_IMAGE;
          }
          if (results[i].amenities) {
            var amenities_name = results[i].amenities.split(",");
            results[i].amenities_name = amenities_name;
          }
          //   var data = results[i];
          //   if (data.amenities) {
          //     var amenities_id = data.amenities.split(",");
          //     console.log(amenities_id);
          //     for (var j = 0; j < amenities_id.length; j++) {
          //       //   console.log(id);
          //       var qRes = await db.query(
          //         `SELECT title FROM ambulance_amenities WHERE id=?`,
          //         [amenities_id[j]]
          //       );
          //       console.log(qRes);
          //       amenities_name.push(qRes[0].title);
          //     }

          //     console.log(amenities_name);
          //     results[i].amenities_name = amenities_name;
          //   }
        }

        res.status(200).json({
          code: 200,
          data: results,
        });
      }
    }
  );
});

router.post("/book", (req, res, next) => {
  console.log("*********************Book Ambulance API********************");
  var patient_id = req.body.patient_id;
  var ambulance_id = req.body.ambulance_id;
  var date = req.body.date;
  var from_loc = req.body.from_loc;
  var to_loc = req.body.to_loc;
  var current_date_time = getCurrentTime();

  db.query(
    "INSERT INTO `ambulance_calls`(`patient_id`, `ambulance_id`, `date`, `from_loc`, `to_loc`, `created_at`, `updated_at`) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [
      patient_id,
      ambulance_id,
      date,
      from_loc,
      to_loc,
      current_date_time,
      current_date_time,
    ],
    (err, results, fields) => {
      if (err) {
        console.log("Unable to insert into ambulance_calls : ", err);
        res.status(500).json({
          code: 100,
          message: "Unable to book ambulance. Unknown error",
        });
      } else if (results.insertId > 0) {
        var ambulance_booking_id = results.insertId;
        console.log("booking Done!");
        db.query(
          `SELECT a.vehicle_number, a.vehicle_model, u.device_id as ambulance_device_id
          FROM ambulances as a, users as u
          WHERE a.id = ? && a.user_id = u.id`,
          [ambulance_id],
          (err, results, fields) => {
            if (err) {
              console.log(
                "Ambulance booked, failed to get ambulance id : ",
                err
              );
              res.status(500).json({
                code: 100,
                message: "Ambulance booked, failed to get ambulance id",
              });
            } else if (results.length > 0) {
              console.log(results);
              var ambulance_name = results[0].vehicle_model;
              var ambulance_number = results[0].vehicle_number;
              var ambulance_device_id = results[0].ambulance_device_id;
              var ambulance_message = `${ambulance_name} - ${ambulance_number} has been booked for ${date}`;
              console.log(`Ambulance booked. ${ambulance_message} `);

              db.query(
                `SELECT u.id, u.device_id FROM users as u, patients as p
                WHERE p.id = ? && p.user_id = u.id`,
                [patient_id],
                (err, results, fields) => {
                  if (err) {
                    console.log(
                      "Ambulance booked, error in getting patient details : ",
                      err
                    );
                    res.status(500).json({
                      code: 100,
                      message:
                        "Ambulance booked, error in getting patient details",
                    });
                  } else if (results.length > 0) {
                    console.log(results);
                    const device_id = results[0].device_id;
                    db.query(
                      `INSERT INTO notifications (user_id, notification_type,	notification_description, created_at, updated_at) 
                      VALUES (?, ?, ?, ?, ?)`,
                      [
                        results[0].id,
                        "ambulance_booking",
                        ambulance_message,
                        current_date_time,
                        current_date_time,
                      ],
                      (err, results, fields) => {
                        if (err) {
                          console.log(
                            "Ambulance booked, error in notification : ",
                            err
                          );
                          res.status(500).json({
                            code: 100,
                            message: "Ambulance booked, error in notification",
                          });
                        } else if (results.insertId > 0) {
                            if (device_id){
                            sendNotification("Ambulance Booked", ambulance_message, device_id);
                            }
                            if (ambulance_device_id){
                            sendNotification("Ambulance Booked", ambulance_message, ambulance_device_id);
                            }
                          console.log(
                            "Ambulance booked, notification sent successfully"
                          );
                          res.status(200).json({
                            code: 200,
                            data: {
                              booking_id: ambulance_booking_id,
                            },
                            message: ambulance_message,
                          });
                        } else {
                          console.log(results);
                          console.log(
                            "Ambulance booked, unable to add notification"
                          );
                          res.status(200).json({
                            code: 100,
                            message:
                              "Ambulance booked, unable to add notification",
                          });
                        }
                      }
                    );
                  } else {
                    console.log(results);
                    console.log("Ambulance booked, unable to add notification");
                    res.status(200).json({
                      code: 100,
                      message: "Ambulance booked, unable to add notification",
                    });
                  }
                }
              );
            } else {
              console.log(results);
              console.log("Ambulance booked, unable to get ambulance details");
              res.status(200).json({
                code: 100,
                message: "Ambulance booked, unable to get ambulance details",
              });
            }
          }
        );
      } else {
        console.log(results);
        console.log("Unable to book");
        res.status(404).json({
          code: 100,
          message: "Unable to find patient id or ambulance_id",
        });
      }
    }
  );
});

router.get("/history", (req, res, next) => {
  console.log(
    "*******************Ambulance booking history**********************"
  );
  var patient_id = req.query.patient_id;

  db.query(
    `SELECT ac.id as booking_id, ac.date as date, ac.amount as amount, ac.from_loc as from_loc, 
    ac.to_loc as to_loc, ac.status as status, a.vehicle_model as vehicle_title, 
    a.vehicle_number, at.title as type 
    FROM ambulance_calls as ac, ambulances as a, ambulance_type as at 
    WHERE ac.patient_id=? && ac.ambulance_id=a.id && a.vehicle_type=at.title`,
    [patient_id],
    (err, results, fields) => {
      if (err) {
        console.log("Unable to get history : ", err);
        res.status(500).json({
          code: 100,
          message: "Unable to get ambulance booking history. Unknown err",
        });
      } else {
        console.log(results);
        // for (var i = 0; i < results.length; i++) {
        //   var status = results[i].status;
        //   var status_str = "";
        //   switch (status) {
        //     case 0:
        //       status_str = "Pending";
        //       break;
        //     case 1:
        //       status_str = "Success";
        //       break;
        //     case 2:
        //       status_str = "Accepted";
        //       break;
        //     case 3:
        //       status_str = "Rejected";
        //       break;

        //     case 4:
        //       status_str = "Paid";
        //       break;
        //   }
        //   results[i].status = status_str;
        // }
        res.status(200).json({
          code: 200,
          data: results,
        });
      }
    }
  );
});
module.exports = router;
